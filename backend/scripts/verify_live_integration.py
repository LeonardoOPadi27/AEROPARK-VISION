"""Smoke test against a running backend and its configured PostgreSQL database.

The script creates a uniquely named temporary user, exercises manual occupancy
through HTTP, verifies the committed rows from a fresh database session, and
removes only the records created for the test.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.config.database import SessionLocal
from app.core.security import hash_password
from app.models.evento_espacio_movil import EventoEspacioMovil
from app.models.reporte_espacio_movil import ReporteEspacioMovil
from app.models.usuario import Usuario


def request_json(url: str, *, method: str = "GET", payload=None, token: str | None = None):
    headers = {"Accept": "application/json"}
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode("utf-8")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(url, data=body, headers=headers, method=method)
    with urlopen(request, timeout=20) as response:
        return response.status, json.loads(response.read().decode("utf-8")), response.headers


def login(base_url: str, email: str, password: str) -> str:
    status, payload, _ = request_json(
        f"{base_url}/auth/login",
        method="POST",
        payload={"correo": email, "contrasena": password},
    )
    assert status == 200 and payload.get("access_token"), "No fue posible iniciar sesión."
    return payload["access_token"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Verifica la API en vivo y PostgreSQL.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--admin-email", default=os.getenv("SEED_ADMIN_EMAIL", "alexis@test.com"))
    parser.add_argument("--admin-password", default=os.getenv("SEED_ADMIN_PASSWORD", "123456"))
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")

    status, health, _ = request_json(f"{base_url}/health")
    assert status == 200 and health == {"status": "ok", "database": "online"}

    try:
        request_json(f"{base_url}/settings/overview")
    except HTTPError as error:
        assert error.code == 401, "Ajustes debe exigir autenticación."
    else:
        raise AssertionError("Ajustes respondió a una solicitud anónima.")

    admin_token = login(base_url, args.admin_email, args.admin_password)
    for path in ("/auth/me", "/settings/overview", "/reports/overview", "/mobile/parking-overview"):
        status, _, _ = request_json(f"{base_url}{path}", token=admin_token)
        assert status == 200, f"La ruta {path} no respondió correctamente."

    email = f"deployment-check-{uuid.uuid4().hex}@example.test"
    password = uuid.uuid4().hex
    db = SessionLocal()
    test_user = Usuario(
        nombres="Deployment",
        apellidos="Check",
        correo=email,
        contrasena=hash_password(password),
        estado=True,
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    user_id = test_user.id_usuario
    space_code = None

    try:
        token = login(base_url, email, password)
        reports = {row.codigo_espacio for row in db.query(ReporteEspacioMovil).all()}
        space_code = next(
            code
            for code in (f"B-{index:03d}" for index in range(73, 0, -1))
            if code not in reports
        )

        status, occupied, _ = request_json(
            f"{base_url}/mobile/spaces/{space_code}/occupy",
            method="POST",
            payload={"estimated_hours": 1},
            token=token,
        )
        assert status == 200 and occupied["status"] == "user_occupied"

        db.expire_all()
        persisted_report = db.query(ReporteEspacioMovil).filter_by(codigo_espacio=space_code).one_or_none()
        assert persisted_report and persisted_report.id_usuario == user_id

        status, released, _ = request_json(
            f"{base_url}/mobile/spaces/{space_code}/release",
            method="POST",
            token=token,
        )
        assert status == 200 and released["status"] == "free"

        db.expire_all()
        assert db.query(ReporteEspacioMovil).filter_by(codigo_espacio=space_code).count() == 0
        assert db.query(EventoEspacioMovil).filter_by(id_usuario=user_id).count() == 2
    finally:
        db.query(EventoEspacioMovil).filter_by(id_usuario=user_id).delete()
        db.query(ReporteEspacioMovil).filter_by(id_usuario=user_id).delete()
        db.query(Usuario).filter_by(id_usuario=user_id).delete()
        db.commit()
        db.close()

    print(f"Verificación integral aprobada: {space_code} persistió y fue liberado correctamente.")


if __name__ == "__main__":
    main()
