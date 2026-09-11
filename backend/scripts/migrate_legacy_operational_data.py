import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.config.database import SessionLocal
from app.models.configuracion_sistema import ConfiguracionSistema
from app.models.imagen import ImagenCapturada


DATA_DIR = BACKEND_DIR / "data"


def _read_json(filename: str, default):
    path = DATA_DIR / filename
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def migrate() -> None:
    db = SessionLocal()
    migrated_images = 0
    migrated_settings = 0
    try:
        settings = _read_json("system_settings.json", {})
        if isinstance(settings, dict) and settings:
            row = db.query(ConfiguracionSistema).filter_by(clave="mobile").first()
            if not row:
                db.add(
                    ConfiguracionSistema(
                        clave="mobile",
                        valor_json=json.dumps(settings, ensure_ascii=False),
                    )
                )
                migrated_settings = 1

        metadata = _read_json("image_zone_metadata.json", {})
        for image_id, zone in metadata.items():
            if not isinstance(zone, dict) or zone.get("zone_code") not in {"A", "B"}:
                continue
            image = db.query(ImagenCapturada).filter_by(id_imagen=int(image_id)).first()
            if not image or image.codigo_zona:
                continue
            image.codigo_zona = zone["zone_code"]
            image.titulo_zona = zone.get("zone_title") or f"Estacionamiento {zone['zone_code']}"
            migrated_images += 1

        db.commit()
        print(
            "Migración de datos legados completada: "
            f"{migrated_settings} configuración, {migrated_images} imágenes."
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
