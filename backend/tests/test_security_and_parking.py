import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.database import Base
from app.core.security import create_access_token, get_current_user
from app.models import Rol, Usuario
from app.services import analysis_service
from app.services.mobile_parking_service import (
    _build_zone_payload,
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
        self.db.close()

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
