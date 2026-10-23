import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.database import Base, get_db
from app.core.security import create_access_token, get_current_user
from app.main import app
from app.models import Rol, Usuario
from app.models.reporte_espacio_movil import ReporteEspacioMovil
from app.routes import auth_routes
from app.services import analysis_service
from app.services.mobile_parking_service import (
    _build_zone_payload,
    confirm_space_manually,
    get_mobile_space_events,
    occupy_space_manually,
    release_space_manually,
)
from app.services.settings_service import update_mobile_settings


class SecurityAndParkingTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

        admin_role = Rol(nombre="administrador", estado=True)
        user_role = Rol(nombre="usuario", estado=True)
        self.db.add_all([admin_role, user_role])
        self.db.flush()
        self.owner = Usuario(
            nombres="Owner",
            apellidos="Test",
            correo="owner@example.test",
            contrasena="not-used",
            estado=True,
            id_rol=user_role.id_rol,
        )
        self.other = Usuario(
            nombres="Other",
            apellidos="Test",
            correo="other@example.test",
            contrasena="not-used",
            estado=True,
            id_rol=user_role.id_rol,
        )
        self.db.add_all([self.owner, self.other])
        self.db.commit()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()

    def test_public_registration_creates_non_admin_and_cannot_use_admin_routes(self):
        app.dependency_overrides[get_db] = lambda: self.db
        client = TestClient(app)
        with patch.object(auth_routes, "allow_public_registration", True):
            response = client.post("/auth/register", json={
                "nombres": "Estudiante", "apellidos": "Prueba",
                "correo": "Student@Example.test", "contrasena": "password123",
            })
        self.assertEqual(response.status_code, 200)
        student = self.db.query(Usuario).filter_by(correo="student@example.test").one()
        self.assertEqual(student.rol.nombre, "usuario")
        token = client.post("/auth/login", json={
            "correo": "student@example.test", "contrasena": "password123",
        }).json()
        self.assertFalse(token["user"]["is_admin"])
        auth = {"Authorization": f"Bearer {token['access_token']}"}
        self.assertEqual(client.get("/auth/me", headers=auth).json()["is_admin"], False)
        self.assertEqual(client.get("/images", headers=auth).status_code, 403)
        self.assertEqual(client.get("/analysis", headers=auth).status_code, 403)
        self.assertEqual(client.get("/mobile/reviews", headers=auth).status_code, 200)
        self.assertEqual(client.get("/mobile/parking-overview", headers=auth).status_code, 200)

    def test_confirmation_requires_owner_and_resets_due_time(self):
        occupy_space_manually(self.db, "A-001", 2, self.owner.id_usuario, "Owner Test")
        report = self.db.get(ReporteEspacioMovil, "A-001")
        from datetime import datetime, timedelta
        report.fecha_confirmacion_requerida = datetime.utcnow() - timedelta(minutes=1)
        self.db.commit()
        with self.assertRaises(HTTPException) as context:
            confirm_space_manually(self.db, "A-001", self.other.id_usuario)
        self.assertEqual(context.exception.status_code, 403)
        result = confirm_space_manually(self.db, "A-001", self.owner.id_usuario)
        self.assertEqual(result["status"], "user_occupied")
        self.assertTrue(result["confirmation_due_at"].endswith("Z"))
        self.assertFalse(_build_zone_payload({"A-001": {
            "user_id": self.owner.id_usuario,
            "confirmation_due_at": result["confirmation_due_at"],
        }}, {}, viewer_id=self.owner.id_usuario)[0]["spaces"][0]["confirmation_required"])
        self.assertEqual([e["event_type"] for e in get_mobile_space_events(self.db)], ["occupy", "confirm"])

    def test_cannot_claim_space_detected_as_occupied(self):
        mapping = {"spaces": [{"code": "A-001", "status": "occupied"}]}
        with patch(
            "app.services.mobile_parking_service._get_latest_analysis_by_zone",
            return_value={"A": {"slot_mapping": mapping}},
        ):
            with self.assertRaises(HTTPException) as context:
                occupy_space_manually(
                    self.db, "A-001", 2, self.owner.id_usuario, "Owner Test"
                )
        self.assertEqual(context.exception.status_code, 409)

    def test_inactive_user_token_is_rejected(self):
        self.owner.estado = False
        self.db.commit()
        token = create_access_token({"sub": self.owner.correo})

        with self.assertRaises(HTTPException) as context:
            get_current_user(
                HTTPAuthorizationCredentials(scheme="Bearer", credentials=token),
                self.db,
            )

        self.assertEqual(context.exception.status_code, 401)

    def test_only_owner_or_admin_can_release_manual_space(self):
        occupy_space_manually(
            self.db,
            "b-001",
            2,
            self.owner.id_usuario,
            "Owner Test",
        )

        with self.assertRaises(HTTPException) as context:
            release_space_manually(
                self.db,
                "B-001",
                self.other.id_usuario,
                False,
            )
        self.assertEqual(context.exception.status_code, 403)

        release_space_manually(
            self.db,
            "B-001",
            self.owner.id_usuario,
            False,
        )
        self.assertEqual(len(get_mobile_space_events(self.db)), 2)

    def test_mobile_settings_are_enforced(self):
        update_mobile_settings(
            self.db,
            {"manual_occupy_enabled": False, "max_estimated_hours": 1},
        )
        with self.assertRaises(HTTPException) as context:
            occupy_space_manually(
                self.db,
                "A-001",
                2,
                self.owner.id_usuario,
                "Owner Test",
            )
        self.assertEqual(context.exception.status_code, 403)

    def test_aggregate_detection_does_not_invent_slot_positions(self):
        zones = _build_zone_payload(
            {},
            {"B": {"analysis_mode": "yolo", "espacios_ocupados": 3}},
        )
        zone_b = next(zone for zone in zones if zone["id"] == "B")

        self.assertEqual(zone_b["occupied_spaces"], 3)
        self.assertTrue(all(space["status"] == "unknown" for space in zone_b["spaces"]))

    def test_other_users_private_report_fields_are_hidden(self):
        report = {
            "B-001": {
                "user_id": self.owner.id_usuario,
                "user_name": "Owner Test",
                "estimated_hours": 2,
            }
        }
        zones = _build_zone_payload(
            report,
            {},
            viewer_id=self.other.id_usuario,
            include_all_user_details=False,
        )
        space = next(zone for zone in zones if zone["id"] == "B")["spaces"][0]

        self.assertIsNone(space["reported_user_id"])
        self.assertIsNone(space["reported_user_name"])

    def test_mock_results_require_explicit_opt_in(self):
        image = SimpleNamespace(id_imagen=10, ruta_archivo="missing.jpg")
        with patch.dict(os.environ, {"ALLOW_MOCK_ANALYSIS": "false"}):
            with self.assertRaises(HTTPException) as context:
                analysis_service._build_analysis_values(image, force_mock=True)
        self.assertEqual(context.exception.status_code, 403)

    def test_unavailable_yolo_does_not_create_mock_result(self):
        image = SimpleNamespace(id_imagen=10, ruta_archivo="missing.jpg")
        with patch.object(
            analysis_service,
            "detect_vehicles_with_yolo",
            side_effect=analysis_service.DetectionUnavailableError("not ready"),
        ):
            with self.assertRaises(HTTPException) as context:
                analysis_service._build_analysis_values(image)
        self.assertEqual(context.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
