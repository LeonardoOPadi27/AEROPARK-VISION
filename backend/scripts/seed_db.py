from pathlib import Path
import os
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.config.database import SessionLocal
from app.core.security import hash_password
from app.models.dron import Dron
from app.models.espacio import Espacio
from app.models.estacionamiento import Estacionamiento
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.services.parking_zone_config import ZONE_DEFINITIONS


def get_or_create(db, model, defaults=None, **filters):
    instance = db.query(model).filter_by(**filters).first()
    if instance:
        return instance

    data = {**filters, **(defaults or {})}
    instance = model(**data)
    db.add(instance)
    db.flush()
    return instance


def seed() -> None:
    admin_email = os.getenv("SEED_ADMIN_EMAIL", "alexis@test.com").strip()
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "").strip()
    if not admin_password:
        if os.getenv("ENVIRONMENT", "development").lower() == "production":
            raise RuntimeError("SEED_ADMIN_PASSWORD debe configurarse en producción.")
        admin_password = "123456"

    db = SessionLocal()
    try:
        admin_role = get_or_create(
            db,
            Rol,
            nombre="administrador",
            defaults={"descripcion": "Gestiona usuarios y análisis del sistema."},
        )
        get_or_create(
            db,
            Rol,
            nombre="operador",
            defaults={"descripcion": "Carga imágenes y ejecuta análisis."},
        )

        user = get_or_create(
            db,
            Usuario,
            correo=admin_email,
            defaults={
                "nombres": "Alexis",
                "apellidos": "Test",
                "contrasena": hash_password(admin_password),
                "id_rol": admin_role.id_rol,
            },
        )

        parking = get_or_create(
            db,
            Estacionamiento,
            nombre="Estacionamiento Tecsup",
            defaults={
                "ubicacion": "Tecsup",
                "descripcion": "Zonas de estacionamiento analizadas mediante imágenes aéreas cargadas al sistema.",
            },
        )

        get_or_create(
            db,
            Dron,
            nombre="Dron institucional",
            defaults={
                "modelo": "No especificado",
                "numero_serie": "TECSUP-DRON-001",
                "id_usuario": user.id_usuario,
            },
        )

        active_codes = []
        for zone in ZONE_DEFINITIONS:
            for index in range(1, int(zone["capacity"]) + 1):
                code = f"{zone['id']}-{index:03d}"
                active_codes.append(code)
                space = get_or_create(
                    db,
                    Espacio,
                    id_estacionamiento=parking.id_estacionamiento,
                    codigo=code,
                    defaults={
                        "fila": zone["id"],
                        "columna": index,
                        "estado_ocupado": False,
                    },
                )
                space.fila = zone["id"]
                space.columna = index
                space.estado = True

        db.query(Espacio).filter(
            Espacio.id_estacionamiento == parking.id_estacionamiento,
            ~Espacio.codigo.in_(active_codes),
        ).update({"estado": False}, synchronize_session=False)

        db.commit()
        print(f"Seed completado. Usuario administrador: {admin_email}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
