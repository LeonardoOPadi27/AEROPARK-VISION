"""Metadata for a two-photo Zone B observation."""

import json

from sqlalchemy.orm import Session

from app.models.configuracion_sistema import ConfiguracionSistema


def pair_key(upper_image_id: int) -> str:
    return f"zone_b_pair:{upper_image_id}"


def member_key(lower_image_id: int) -> str:
    return f"zone_b_pair_member:{lower_image_id}"


def save_pair(db: Session, lower_image_id: int, upper_image_id: int) -> None:
    db.add(ConfiguracionSistema(
        clave=pair_key(upper_image_id),
        valor_json=json.dumps({"lower_image_id": lower_image_id, "upper_image_id": upper_image_id}),
    ))
    db.add(ConfiguracionSistema(
        clave=member_key(lower_image_id),
        valor_json=json.dumps({"upper_image_id": upper_image_id}),
    ))
    db.commit()


def load_pair(db: Session, upper_image_id: int) -> dict | None:
    row = db.get(ConfiguracionSistema, pair_key(upper_image_id))
    return json.loads(row.valor_json) if row else None


def is_pair_member(db: Session, image_id: int) -> bool:
    return db.get(ConfiguracionSistema, member_key(image_id)) is not None
