import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.database import Base
from app.models.analisis import AnalisisImagen
from app.models.imagen import ImagenCapturada
from app.models.vehiculo_detectado import VehiculoDetectado
from app.services.analysis_service import _apply_zone_b_pair, get_analysis_list, serialize_analysis
from app.services.zone_b_pair_service import save_pair
from app.services.space_calibration_service import (
    assign_detections,
    get_default_calibration,
    get_zone_b_upper_calibration,
    validate_spaces,
)


ROOT = Path(__file__).resolve().parents[2]
LOWER = ROOT / "datasets/raw/zona_b/DJI_20260312135933_0012_D.JPG"
UPPER = ROOT / "datasets/raw/zona_b/DJI_20260312135940_0014_D.JPG"


class ZoneBPairTests(unittest.TestCase):
    def test_two_templates_cover_unique_73_slots(self):
        lower = get_default_calibration("B", 5280, 3956)
        upper = get_zone_b_upper_calibration(5280, 3956)
        validate_spaces("B", lower["spaces"])
        validate_spaces("B", upper["spaces"])
        codes = [item["code"] for item in lower["spaces"] + upper["spaces"]]
        self.assertEqual(len(codes), 74)
        self.assertEqual(codes.count("B-047"), 2)
        self.assertEqual(set(codes), {f"B-{index:03d}" for index in range(1, 74)})

    @unittest.skipUnless(LOWER.exists() and UPPER.exists(), "Local drone photos unavailable")
    def test_pair_excludes_street_car_and_counts_each_slot_once(self):
        lower_calibration = get_default_calibration("B", 5280, 3956)
        upper_calibration = get_zone_b_upper_calibration(5280, 3956)
        lower_box = lower_calibration["spaces"][0]["polygon"]
        upper_box = upper_calibration["spaces"][0]["polygon"]

        def detection(polygon, confidence):
            x = sum(point[0] for point in polygon) / 4 * 5280
            y = sum(point[1] for point in polygon) / 4 * 3956
            return {"label": "car", "confidence": confidence,
                    "bbox": [x - 30, y - 30, x + 30, y + 30], "color": "Blanco"}

        lower_detections = [detection(lower_box, .9),
                            {"label": "car", "confidence": .8,
                             "bbox": [850, 300, 1000, 530], "color": "Blanco"}]
        upper_detections = [detection(upper_box, .7)]
        lower_result = {
            "detections": lower_detections,
            "slot_mapping": assign_detections(lower_calibration, lower_detections),
        }
        result = {"image_url": "upper", "detections": upper_detections}
        lower_image = SimpleNamespace(id_imagen=1, ruta_archivo="lower")
        with patch("app.services.analysis_service.resolve_stored_image_path",
                   side_effect=lambda name: UPPER if name == "upper" else LOWER), \
             patch("app.services.analysis_service.load_calibration", return_value=None):
            _apply_zone_b_pair(result, lower_result, lower_image, None)
        self.assertEqual(result["espacios_ocupados"], 2)
        self.assertEqual(result["autos_detectados"], 2)
        self.assertEqual(result["espacios_libres"], 71)
        self.assertEqual(result["slot_mapping"]["calibrated_spaces"], 73)
        self.assertEqual(len(result["detections"]), 2)

    @unittest.skipUnless(LOWER.exists() and UPPER.exists(), "Local drone photos unavailable")
    def test_overlapping_b047_is_counted_once(self):
        lower = get_default_calibration("B", 5280, 3956)
        upper = get_zone_b_upper_calibration(5280, 3956)

        def at_b047(calibration):
            polygon = next(item["polygon"] for item in calibration["spaces"] if item["code"] == "B-047")
            x = sum(point[0] for point in polygon) / 4 * 5280
            y = sum(point[1] for point in polygon) / 4 * 3956
            return {"label": "car", "confidence": .9,
                    "bbox": [x - 30, y - 30, x + 30, y + 30], "color": "Gris"}

        lower_detections = [at_b047(lower)]
        upper_detections = [at_b047(upper)]
        lower_result = {"detections": lower_detections,
                        "slot_mapping": assign_detections(lower, lower_detections)}
        result = {"image_url": "upper", "detections": upper_detections}
        lower_image = SimpleNamespace(id_imagen=1, ruta_archivo="lower")
        with patch("app.services.analysis_service.resolve_stored_image_path",
                   side_effect=lambda name: UPPER if name == "upper" else LOWER):
            _apply_zone_b_pair(result, lower_result, lower_image, None)
        self.assertEqual(result["espacios_ocupados"], 1)
        self.assertEqual(result["autos_detectados"], 1)
        self.assertEqual(len(result["detections"]), 1)

    @unittest.skipUnless(LOWER.exists() and UPPER.exists(), "Local drone photos unavailable")
    def test_history_and_serialized_analysis_treat_pair_as_one_observation(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        db = sessionmaker(bind=engine)()
        try:
            lower_image = ImagenCapturada(nombre_archivo="lower.jpg", nombre_original="lower.jpg",
                                          ruta_archivo="lower", codigo_zona="B")
            upper_image = ImagenCapturada(nombre_archivo="upper.jpg", nombre_original="upper.jpg",
                                          ruta_archivo="upper", codigo_zona="B")
            db.add_all([lower_image, upper_image])
            db.flush()
            for image, calibration in [
                (lower_image, get_default_calibration("B", 5280, 3956)),
                (upper_image, get_zone_b_upper_calibration(5280, 3956)),
            ]:
                polygon = calibration["spaces"][0]["polygon"]
                x = sum(point[0] for point in polygon) / 4 * 5280
                y = sum(point[1] for point in polygon) / 4 * 3956
                analysis = AnalisisImagen(id_imagen=image.id_imagen, estado="completado_yolo",
                                          vehiculos_detectados=1, espacios_ocupados=1)
                db.add(analysis)
                db.flush()
                db.add(VehiculoDetectado(id_analisis=analysis.id_analisis, clase="car", confianza=.9,
                                         x1=x - 30, y1=y - 30, x2=x + 30, y2=y + 30))
            db.commit()
            save_pair(db, lower_image.id_imagen, upper_image.id_imagen)
            with patch("app.services.analysis_service.resolve_stored_image_path",
                       side_effect=lambda name: UPPER if name == "upper" else LOWER):
                result = serialize_analysis(upper_image.analisis)
                history = get_analysis_list(db)
            self.assertEqual(result["image_count"], 2)
            self.assertEqual(result["espacios_ocupados"], 2)
            self.assertEqual(result["espacios_libres"], 71)
            self.assertTrue(result["slot_mapping"]["coverage_complete"])
            self.assertEqual(len(history), 1)
        finally:
            db.close()
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
