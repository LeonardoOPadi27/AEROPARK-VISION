import json
import os
from pathlib import Path

from sqlalchemy.orm import Session

from app.config.database import DATABASE_URL
from app.models.analisis import AnalisisImagen
from app.models.imagen import ImagenCapturada
from app.services.detection_service import (
    TRAINED_CLASS_NAMES,
    DEFAULT_TOTAL_SPACES,
    get_weights_path,
    get_yolo_status,
)
from app.services.parking_map_service import get_parking_map_path, load_parking_map

PROJECT_ROOT = Path(__file__).resolve().parents[3]
SETTINGS_PATH = PROJECT_ROOT / "backend" / "data" / "system_settings.json"

DEFAULT_SETTINGS = {
    "mobile": {
        "manual_occupy_enabled": True,
        "manual_release_enabled": True,
        "reminders_enabled": True,
        "max_estimated_hours": 12,
        "pending_confirmation_after_hours": 2,
        "default_zone": "A",
    }
}


def _ensure_settings_file() -> None:
    SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not SETTINGS_PATH.exists():
        SETTINGS_PATH.write_text(json.dumps(DEFAULT_SETTINGS, indent=2), encoding="utf-8")


def _load_settings() -> dict:
    _ensure_settings_file()
    try:
        payload = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        payload = {}

    mobile_settings = {**DEFAULT_SETTINGS["mobile"], **payload.get("mobile", {})}
    return {"mobile": mobile_settings}


def _save_settings(payload: dict) -> dict:
    SETTINGS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def _coerce_bool(value, fallback: bool) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "si", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off"}:
            return False
    return fallback


def _coerce_int(value, fallback: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback
    return max(minimum, min(maximum, parsed))


def _get_latest_analysis_row(db: Session) -> AnalisisImagen | None:
    return (
        db.query(AnalisisImagen)
        .join(ImagenCapturada)
        .order_by(ImagenCapturada.id_imagen.desc())
        .first()
    )


def get_settings_overview(db: Session) -> dict:
    yolo_status = get_yolo_status()
    map_payload = load_parking_map()
    settings = _load_settings()
    latest_analysis = _get_latest_analysis_row(db)
    latest_analysis_mode = None
    latest_analysis_at = None
    latest_precision = None

    if latest_analysis:
        latest_analysis_mode = (
            "yolo" if latest_analysis.estado == "completado_yolo" else "mock"
        )
        latest_analysis_at = (
            latest_analysis.fecha_analisis.isoformat()
            if latest_analysis.fecha_analisis
            else None
        )
        latest_precision = latest_analysis.precision_modelo

    return {
        "system": {
            "backend_status": "online",
            "database_engine": "postgresql" if DATABASE_URL.startswith("postgresql") else "sqlite",
            "database_url_masked": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL,
            "yolo_ready": yolo_status["ready"],
            "yolo_mode": yolo_status["mode"],
            "weights_path": str(get_weights_path()),
            "yolo_reason": yolo_status["reason"],
        },
        "analysis": {
            "default_total_spaces": DEFAULT_TOTAL_SPACES,
            "detected_classes": sorted(TRAINED_CLASS_NAMES),
            "latest_analysis_mode": latest_analysis_mode,
            "latest_analysis_at": latest_analysis_at,
            "latest_precision": latest_precision,
        },
        "parking_map": {
            "configured": bool(map_payload),
            "path": str(get_parking_map_path()),
            "map_name": map_payload.get("name") if map_payload else None,
            "map_image": map_payload.get("image") if map_payload else None,
            "configured_spaces": len(map_payload.get("spaces", [])) if map_payload else 0,
        },
        "mobile": settings["mobile"],
    }


def update_mobile_settings(payload: dict) -> dict:
    settings = _load_settings()
    current = settings["mobile"]
    zone_value = str(payload.get("default_zone", current["default_zone"])).strip().upper()
    if zone_value not in {"A", "B", "C"}:
        zone_value = current["default_zone"]

    settings["mobile"] = {
        "manual_occupy_enabled": _coerce_bool(
            payload.get("manual_occupy_enabled"), current["manual_occupy_enabled"]
        ),
        "manual_release_enabled": _coerce_bool(
            payload.get("manual_release_enabled"), current["manual_release_enabled"]
        ),
        "reminders_enabled": _coerce_bool(
            payload.get("reminders_enabled"), current["reminders_enabled"]
        ),
        "max_estimated_hours": _coerce_int(
            payload.get("max_estimated_hours"),
            current["max_estimated_hours"],
            1,
            24,
        ),
        "pending_confirmation_after_hours": _coerce_int(
            payload.get("pending_confirmation_after_hours"),
            current["pending_confirmation_after_hours"],
            1,
            12,
        ),
        "default_zone": zone_value,
    }
    saved = _save_settings(settings)
    return saved["mobile"]
