from pathlib import Path
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
            correo="alexis@test.com",
            defaults={
                "nombres": "Alexis",
                "apellidos": "Test",
                "contrasena": hash_password("123456"),
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

        for index in range(1, 36):
            get_or_create(
                db,
                Espacio,
                id_estacionamiento=parking.id_estacionamiento,
                codigo=f"E-{index:03d}",
                defaults={"fila": "A", "columna": index},
            )

        db.commit()
        print("Seed completado. Usuario: alexis@test.com / 123456")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
