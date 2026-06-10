import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
ZONE_METADATA_PATH = PROJECT_ROOT / "backend" / "data" / "image_zone_metadata.json"

ZONE_LABELS = {
    "A": "Estacionamiento A",
    "B": "Estacionamiento B",
    "C": "Estacionamiento C",
}


def _ensure_metadata_file() -> None:
    ZONE_METADATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not ZONE_METADATA_PATH.exists():
        ZONE_METADATA_PATH.write_text("{}", encoding="utf-8")


def _load_metadata() -> dict:
    _ensure_metadata_file()
    try:
        return json.loads(ZONE_METADATA_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_metadata(payload: dict) -> None:
    _ensure_metadata_file()
    ZONE_METADATA_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def normalize_zone_code(zone_code: str | None) -> str | None:
    if not zone_code:
        return None

    normalized = zone_code.strip().upper()
    return normalized if normalized in ZONE_LABELS else None


def save_image_zone(image_id: int, zone_code: str | None) -> None:
    normalized = normalize_zone_code(zone_code)
    if not normalized:
        return

    metadata = _load_metadata()
    metadata[str(image_id)] = {
        "zone_code": normalized,
        "zone_title": ZONE_LABELS[normalized],
    }
    _save_metadata(metadata)


def get_image_zone(image_id: int | None) -> dict | None:
    if image_id is None:
        return None

    metadata = _load_metadata()
    return metadata.get(str(image_id))
