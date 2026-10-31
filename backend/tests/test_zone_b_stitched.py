import unittest
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.database import Base
from app.models.analisis import AnalisisImagen
from app.models.imagen import ImagenCapturada
from app.models.vehiculo_detectado import VehiculoDetectado
from app.services.analysis_service import (
    _apply_zone_b_stitched,
    _build_analysis_values,
    serialize_analysis,
)
from app.services.detection_service import _suppress_duplicate_detections
from app.services.space_calibration_service import (
    assign_detections,
    get_calibration_editor,
    get_default_calibration,
    validate_spaces,
)


class ZoneBStitchedTests(unittest.TestCase):
    def test_partial_overlap_removes_duplicate_not_neighbor(self):
        first = {"label": "car", "confidence": .9,
                 "bbox": [2318, 3100, 2568, 3171]}
        duplicate = {"label": "car", "confidence": .8,
                     "bbox": [2314, 3021, 2553, 3148]}
        neighbor = {"label": "car", "confidence": .7,
                    "bbox": [2600, 3021, 2830, 3148]}
        self.assertEqual(
            _suppress_duplicate_detections(
                [duplicate, neighbor, first], include_partial_overlap=True
            ),
            [first, neighbor],
        )

    def test_stitched_template_covers_73_unique_spaces(self):
        calibration = get_default_calibration("B", 3100, 5990)
        self.assertEqual(calibration["source"], "zone_b_stitched_template")
        self.assertEqual(len(calibration["spaces"]), 73)
        self.assertEqual(
            {item["code"] for item in calibration["spaces"]},
            {f"B-{number:03d}" for number in range(1, 74)},
        )
        validate_spaces("B", calibration["spaces"])

    def test_original_camera_image_keeps_its_existing_template(self):
        calibration = get_default_calibration("B", 5280, 3956)
        self.assertEqual(calibration["source"], "zone_template")
        self.assertEqual(len(calibration["spaces"]), 56)

    def test_off_lot_vehicle_does_not_inflate_stitched_counts(self):
        calibration = get_default_calibration("B", 3100, 5990)
        detections = []
        for code in ("B-001", "B-073"):
            polygon = next(
                item["polygon"] for item in calibration["spaces"]
                if item["code"] == code
            )
            x = sum(point[0] for point in polygon) / 4 * 3100
            y = sum(point[1] for point in polygon) / 4 * 5990
            detections.append({"label": "car", "confidence": 0.9,
                               "color": "Blanco", "bbox": [x - 10, y - 10, x + 10, y + 10]})
        detections.append({"label": "car", "confidence": 0.8,
                           "color": "Rojo", "bbox": [50, 20, 120, 90]})
        result = {
            "detections": detections,
            "slot_mapping": assign_detections(calibration, detections),
        }
        _apply_zone_b_stitched(result, calibration)
        self.assertEqual(result["slot_mapping"]["calibrated_spaces"], 73)
        self.assertEqual(result["vehiculos_detectados"], 2)
        self.assertEqual(result["autos_detectados"], 2)
        self.assertEqual(result["espacios_ocupados"], 2)
        self.assertEqual(result["espacios_libres"], 71)
        self.assertEqual(result["color_distribution"], [{"color": "Blanco", "cantidad": 2}])

    def test_single_image_serialization_uses_stitched_template(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                               poolclass=StaticPool)
        Base.metadata.create_all(engine)
        db = sessionmaker(bind=engine)()
        try:
            calibration = get_default_calibration("B", 3100, 5990)
            polygon = next(item["polygon"] for item in calibration["spaces"]
                           if item["code"] == "B-073")
            x = sum(point[0] for point in polygon) / 4 * 3100
            y = sum(point[1] for point in polygon) / 4 * 5990
            image = ImagenCapturada(nombre_archivo="stitched.jpg",
                                    nombre_original="stitched.jpg",
                                    ruta_archivo="/uploads/stitched.jpg", codigo_zona="B")
            db.add(image)
            db.flush()
            analysis = AnalisisImagen(id_imagen=image.id_imagen, estado="completado_yolo",
                                      vehiculos_detectados=2, espacios_ocupados=2)
            db.add(analysis)
            db.flush()
            db.add_all([
                VehiculoDetectado(id_analisis=analysis.id_analisis, clase="car", confianza=.9,
                                  x1=x - 10, y1=y - 10, x2=x + 10, y2=y + 10),
                VehiculoDetectado(id_analisis=analysis.id_analisis, clase="car", confianza=.8,
                                  x1=50, y1=20, x2=120, y2=90),
            ])
            db.commit()
            opened = MagicMock()
            opened.__enter__.return_value.size = (3100, 5990)
            with patch("app.services.analysis_service.Image.open", return_value=opened):
                result = serialize_analysis(analysis)
            self.assertEqual(result["slot_mapping"]["calibrated_spaces"], 73)
            self.assertEqual(result["slot_mapping"]["source"], "zone_b_stitched_template")
            self.assertEqual(result["autos_detectados"], 1)
            self.assertEqual(result["espacios_ocupados"], 1)
            self.assertEqual(result["espacios_libres"], 72)
        finally:
            db.close()
            engine.dispose()

    def test_editor_shows_one_box_per_stitched_space(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                               poolclass=StaticPool)
        Base.metadata.create_all(engine)
        db = sessionmaker(bind=engine)()
        try:
            polygon = next(item["polygon"] for item in
                           get_default_calibration("B", 3100, 5990)["spaces"]
                           if item["code"] == "B-073")
            x = sum(point[0] for point in polygon) / 4 * 3100
            y = sum(point[1] for point in polygon) / 4 * 5990
            image = ImagenCapturada(nombre_archivo="stitched.jpg",
                                    nombre_original="stitched.jpg",
                                    ruta_archivo="/uploads/stitched.jpg", codigo_zona="B")
            db.add(image)
            db.flush()
            analysis = AnalisisImagen(id_imagen=image.id_imagen, estado="completado_yolo")
            db.add(analysis)
            db.flush()
            db.add_all([
                VehiculoDetectado(id_analisis=analysis.id_analisis, clase="car", confianza=.9,
                                  x1=x - 30, y1=y - 30, x2=x + 30, y2=y + 30),
                VehiculoDetectado(id_analisis=analysis.id_analisis, clase="car", confianza=.6,
                                  x1=x - 20, y1=y - 20, x2=x + 20, y2=y + 20),
                VehiculoDetectado(id_analisis=analysis.id_analisis, clase="car", confianza=.8,
                                  x1=50, y1=20, x2=120, y2=90),
            ])
            db.commit()
            opened = MagicMock()
            opened.__enter__.return_value.size = (3100, 5990)
            with patch("app.services.space_calibration_service.Image.open",
                       return_value=opened):
                editor = get_calibration_editor(db, image.id_imagen)
            self.assertEqual(len(editor["detections"]), 1)
            self.assertEqual(editor["detections"][0]["bbox"],
                             [x - 30, y - 30, x + 30, y + 30])
        finally:
            db.close()
            engine.dispose()

    def test_new_stitched_analysis_persists_only_parked_cars(self):
        polygon = next(item["polygon"] for item in
                       get_default_calibration("B", 3100, 5990)["spaces"]
                       if item["code"] == "B-073")
        x = sum(point[0] for point in polygon) / 4 * 3100
        y = sum(point[1] for point in polygon) / 4 * 5990
        detections = [
            {"label": "car", "confidence": .9, "color": "Blanco",
             "bbox": [x - 30, y - 30, x + 30, y + 30]},
            {"label": "car", "confidence": .6, "color": "Blanco",
             "bbox": [x - 20, y - 20, x + 20, y + 20]},
            {"label": "car", "confidence": .8, "color": "Rojo",
             "bbox": [50, 20, 120, 90]},
        ]
        image = ImagenCapturada(id_imagen=1, nombre_archivo="stitched.jpg",
                                nombre_original="stitched.jpg",
                                ruta_archivo="/uploads/stitched.jpg", codigo_zona="B")
        opened = MagicMock()
        opened.__enter__.return_value.size = (3100, 5990)
        with patch("app.services.analysis_service.detect_vehicles_with_yolo",
                   return_value={"vehiculos_detectados": 3,
                                 "espacios_ocupados": 3, "espacios_libres": 70,
                                 "porcentaje_ocupacion": 4.1,
                                 "precision_modelo": 76.7,
                                 "detections": detections}), \
             patch("app.services.analysis_service.Image.open", return_value=opened):
            values = _build_analysis_values(image, source_path="stitched.jpg")
        self.assertEqual(values["vehiculos_detectados"], 1)
        self.assertEqual(values["espacios_ocupados"], 1)
        self.assertEqual(values["espacios_libres"], 72)
        self.assertEqual(len(values["detections"]), 1)


if __name__ == "__main__":
    unittest.main()
