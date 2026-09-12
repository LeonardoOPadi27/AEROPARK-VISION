import unittest
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.database import Base, get_db
from app.core.security import get_current_user
from app.main import app
from app.models import Rol, Usuario
from app.models.imagen import ImagenCapturada
from app.models.analisis import AnalisisImagen
from app.models.vehiculo_detectado import VehiculoDetectado
from app.services.analysis_service import serialize_analysis
from app.services.mobile_parking_service import _build_zone_payload
from app.services.mobile_parking_service import get_mobile_parking_overview
from app.services.parking_space_service import get_latest_parking_spaces
from app.services.space_calibration_service import (
    assign_detections,
    get_default_calibration,
    load_calibration,
    merge_calibrations,
    save_calibration,
    validate_spaces,
)


def rectangle(code, left, right):
    return {"code": code, "polygon": [[left, .1], [right, .1], [right, .9], [left, .9]]}


def calibration(spaces=None):
    return {"zone_code": "B", "image_width": 100, "image_height": 100,
            "spaces": spaces if spaces is not None else [rectangle("B-001", .1, .4), rectangle("B-002", .4, .7)]}


class AssignmentTests(unittest.TestCase):
    def test_zone_a_template_covers_all_45_spaces_without_manual_calibration(self):
        template = get_default_calibration("A", 5280, 3956)
        validate_spaces("A", template["spaces"])

        result = assign_detections(template, [])

        self.assertEqual(len(result["spaces"]), 45)
        self.assertEqual(result["spaces"][-1]["code"], "A-045")
        self.assertTrue(result["coverage_complete"])
        self.assertEqual(result["free_spaces"], 45)

    def test_partial_manual_calibration_overrides_template_without_hiding_slots(self):
        template = get_default_calibration("A", 5280, 3956)
        manual_space = rectangle("A-001", .1, .4)
        merged = merge_calibrations(template, {"zone_code": "A", "spaces": [manual_space]})

        self.assertEqual(len(merged["spaces"]), 45)
        self.assertEqual(merged["spaces"][0], manual_space)
        self.assertEqual(merged["spaces"][-1]["code"], "A-045")

    def test_detection_and_empty_slot(self):
        result = assign_detections(calibration(), [{"bbox": [15, 20, 35, 80]}])
        self.assertEqual([s["status"] for s in result["spaces"]], ["occupied", "free"])
        self.assertEqual(result["unknown_spaces"], 71)
        self.assertFalse(result["coverage_complete"])

    def test_two_detections_in_one_slot_count_once(self):
        result = assign_detections(calibration(), [{"bbox": [15, 20, 35, 80]}] * 2)
        self.assertEqual(result["occupied_spaces"], 1)

    def test_border_is_not_arbitrarily_assigned(self):
        result = assign_detections(calibration(), [{"bbox": [30, 20, 50, 80]}])
        self.assertTrue(all(s["status"] == "unknown" for s in result["spaces"]))

    def test_vehicle_overlapping_neighbor_does_not_mark_neighbor_free(self):
        result = assign_detections(calibration(), [{"bbox": [20, 20, 55, 80]}])
        self.assertEqual([s["status"] for s in result["spaces"]], ["occupied", "unknown"])

    def test_vehicle_outside_parking_is_not_an_occupied_slot(self):
        result = assign_detections(calibration(), [{"bbox": [80, 20, 90, 80]}])
        self.assertEqual(result["occupied_spaces"], 0)
        self.assertEqual(result["unmatched_detections"], 1)

    def test_invalid_calibration_is_rejected(self):
        bad_cases = [
            [rectangle("A-001", .1, .4)],
            [rectangle("B-001", .1, .4)] * 2,
            [rectangle("B-001", -.1, .4)],
            [rectangle("B-001", .1, float("nan"))],
            [rectangle("B-001", .1, .5), rectangle("B-002", .4, .7)],
            [{"code": "B-001", "polygon": [[.1, .1], [.5, .5], [.1, .5], [.5, .1]]}],
        ]
        for spaces in bad_cases:
            with self.subTest(spaces=spaces), self.assertRaises(HTTPException):
                validate_spaces("B", spaces)

    def test_manual_reports_use_union_not_max_of_counts(self):
        mapped = assign_detections(calibration(), [{"bbox": [15, 20, 35, 80]}])
        data = {"B": {"analysis_mode": "yolo", "espacios_ocupados": 1, "slot_mapping": mapped}}
        zones = _build_zone_payload({"B-002": {"user_id": 1}}, data)
        zone = next(z for z in zones if z["id"] == "B")
        self.assertEqual(zone["occupied_spaces"], 2)
        self.assertEqual(zone["free_spaces"], 0)
        self.assertEqual(zone["unknown_spaces"], 71)
        zones = _build_zone_payload({"B-001": {"user_id": 1}}, data)
        self.assertEqual(next(z for z in zones if z["id"] == "B")["occupied_spaces"], 1)


class CalibrationPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.image = ImagenCapturada(nombre_archivo="reference.png", nombre_original="reference.png", ruta_archivo="/uploads/reference.png", codigo_zona="B")
        self.db.add(self.image)
        self.db.commit()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def save(self, payload=None):
        with patch("app.services.space_calibration_service.get_calibration_editor", return_value={"image_width": 100, "image_height": 100}):
            return save_calibration(self.db, self.image.id_imagen, payload or calibration())

    def test_persistence_and_new_image_is_not_silently_calibrated(self):
        self.save()
        self.db.expire_all()
        self.assertEqual(load_calibration(self.db, self.image.id_imagen)["zone_code"], "B")
        self.assertIsNone(load_calibration(self.db, self.image.id_imagen + 1))

    def test_dimensions_must_match_reference(self):
        with self.assertRaises(HTTPException):
            self.save({**calibration(), "image_width": 200})

    def test_serialized_yolo_result_contains_mapping_but_legacy_missing_details_does_not(self):
        self.save()
        analysis = AnalisisImagen(id_imagen=self.image.id_imagen, estado="completado_yolo", vehiculos_detectados=1)
        self.db.add(analysis)
        self.db.flush()
        self.assertNotIn("slot_mapping", serialize_analysis(analysis))
        self.db.add(VehiculoDetectado(id_analisis=analysis.id_analisis, clase="car", confianza=.9, x1=15, y1=20, x2=35, y2=80))
        self.db.commit()
        self.db.expire_all()
        self.assertEqual(serialize_analysis(analysis)["slot_mapping"]["occupied_spaces"], 1)

    def test_regular_user_cannot_change_calibration(self):
        role = Rol(nombre="usuario", estado=True)
        user = Usuario(nombres="User", correo="test@example.test", contrasena="unused", estado=True, rol=role)
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_db] = lambda: self.db
        response = TestClient(app).put(f"/parking-spaces/calibration/{self.image.id_imagen}", json=calibration())
        self.assertEqual(response.status_code, 403)

    def test_admin_can_save_through_http_and_invalid_polygon_is_rejected(self):
        role = Rol(nombre="administrador", estado=True)
        user = Usuario(nombres="Admin", correo="admin@example.test", contrasena="unused", estado=True, rol=role)
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_db] = lambda: self.db
        with patch("app.services.space_calibration_service.get_calibration_editor", return_value={"image_width": 100, "image_height": 100}):
            client = TestClient(app)
            url = f"/parking-spaces/calibration/{self.image.id_imagen}"
            self.assertEqual(client.put(url, json=calibration()).status_code, 200)
            response = client.put(url, json=calibration([rectangle("B-074", .1, .4)]))
            self.assertEqual(response.status_code, 422)
        self.assertEqual(len(load_calibration(self.db, self.image.id_imagen)["spaces"]), 2)

    def test_partial_map_totals_and_all_slot_codes_are_consistent(self):
        self.save()
        analysis = AnalisisImagen(id_imagen=self.image.id_imagen, estado="completado_yolo", vehiculos_detectados=0)
        self.db.add(analysis)
        self.db.commit()
        summary = get_mobile_parking_overview(self.db)
        self.assertFalse(summary["coverage_complete"])
        self.assertIsNone(summary["free_spaces"])
        self.assertEqual(summary["located_free_spaces"], 2)
        self.assertEqual(summary["unknown_spaces"], 116)
        latest = get_latest_parking_spaces(self.db)
        self.assertEqual(len(latest["spaces"]), 73)
        self.assertEqual(sum(s["occupied"] is None for s in latest["spaces"]), 71)

    def test_calibration_is_not_used_after_image_changes_zone(self):
        self.save()
        self.image.codigo_zona = "A"
        analysis = AnalisisImagen(id_imagen=self.image.id_imagen, estado="completado_yolo", vehiculos_detectados=0)
        self.db.add(analysis)
        self.db.commit()
        self.assertNotIn("slot_mapping", serialize_analysis(analysis))


if __name__ == "__main__":
    unittest.main()
