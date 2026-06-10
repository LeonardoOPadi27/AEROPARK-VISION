import json
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.analisis import AnalisisImagen
from app.models.imagen import ImagenCapturada
from app.services.parking_space_service import get_latest_parking_spaces

PROJECT_ROOT = Path(__file__).resolve().parents[3]
REPORTS_PATH = PROJECT_ROOT / "backend" / "data" / "mobile_space_reports.json"
EVENTS_PATH = PROJECT_ROOT / "backend" / "data" / "mobile_space_events.json"

ZONE_DEFINITIONS = [
    {
        "id": "A",
        "title": "Estacionamiento A",
        "subtitle": "Ingreso principal",
    },
    {
        "id": "B",
        "title": "Estacionamiento B",
        "subtitle": "Zona pabellones",
    },
    {
        "id": "C",
        "title": "Estacionamiento C",
        "subtitle": "Zona posterior",
    },
]


def _ensure_json_file(path: Path, empty_payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(empty_payload, encoding="utf-8")


def _load_reports() -> dict:
    _ensure_json_file(REPORTS_PATH, "{}")
    try:
        return json.loads(REPORTS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_reports(payload: dict) -> None:
    _ensure_json_file(REPORTS_PATH, "{}")
    REPORTS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _load_events() -> list[dict]:
    _ensure_json_file(EVENTS_PATH, "[]")
    try:
        payload = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))
        return payload if isinstance(payload, list) else []
    except json.JSONDecodeError:
        return []


def _save_events(payload: list[dict]) -> None:
    _ensure_json_file(EVENTS_PATH, "[]")
    EVENTS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def get_mobile_space_events() -> list[dict]:
    return _load_events()


def get_active_mobile_reports() -> dict:
    return _load_reports()


def _get_latest_analysis(db: Session) -> AnalisisImagen:
    latest_analysis = (
        db.query(AnalisisImagen)
        .join(ImagenCapturada)
        .order_by(ImagenCapturada.id_imagen.desc())
        .first()
    )
    if not latest_analysis:
        raise HTTPException(status_code=404, detail="No hay análisis registrados.")
    return latest_analysis


def _build_zone_payload(spaces: list[dict], reports: dict) -> list[dict]:
    total_spaces = len(spaces)
    zone_count = len(ZONE_DEFINITIONS)
    base_size = total_spaces // zone_count
    extra = total_spaces % zone_count
    cursor = 0
    zones = []

    for zone_index, zone_definition in enumerate(ZONE_DEFINITIONS):
        size = base_size + (1 if zone_index < extra else 0)
        zone_spaces = spaces[cursor : cursor + size]
        cursor += size

        mapped_spaces = []
        free_count = 0
        occupied_count = 0

        for local_index, space in enumerate(zone_spaces, start=1):
            manual_report = reports.get(space["code"])
            status = "occupied" if space.get("occupied") else "free"
            confirmation_required = False
            estimated_hours = None
            user_confirmed_at = None
            reported_user_id = None
            reported_user_name = None
            expires_at = None

            if manual_report:
                status = "user_occupied"
                estimated_hours = manual_report.get("estimated_hours")
                user_confirmed_at = manual_report.get("started_at")
                reported_user_id = manual_report.get("user_id")
                reported_user_name = manual_report.get("user_name")
                expires_at = manual_report.get("expires_at")
                if expires_at:
                    try:
                        confirmation_required = (
                            datetime.fromisoformat(expires_at) <= datetime.utcnow()
                        )
                    except ValueError:
                        confirmation_required = False

            if status == "free":
                free_count += 1
            else:
                occupied_count += 1

            mapped_spaces.append(
                {
                    "code": space["code"],
                    "display_code": f'{zone_definition["id"]}-{local_index:03d}',
                    "status": status,
                    "source": "user_report" if manual_report else space.get("source"),
                    "estimated_hours": estimated_hours,
                    "user_confirmed_at": user_confirmed_at,
                    "reported_user_id": reported_user_id,
                    "reported_user_name": reported_user_name,
                    "expires_at": expires_at,
                    "confirmation_required": confirmation_required,
                }
            )

        zones.append(
            {
                **zone_definition,
                "spaces": mapped_spaces,
                "free_spaces": free_count,
                "occupied_spaces": occupied_count,
                "total_spaces": len(mapped_spaces),
            }
        )

    return zones


def _build_zone_lookup(spaces: list[dict]) -> dict[str, dict]:
    lookup = {}
    for zone in _build_zone_payload(spaces, {}):
        for space in zone["spaces"]:
            lookup[space["code"]] = {
                "zone_id": zone["id"],
                "zone_title": zone["title"],
                "display_code": space["display_code"],
            }
    return lookup


def _append_event(payload: dict) -> None:
    events = _load_events()
    events.append(payload)
    _save_events(events)


def get_mobile_parking_overview(db: Session) -> dict:
    latest_analysis = _get_latest_analysis(db)
    parking_spaces = get_latest_parking_spaces(db)
    reports = _load_reports()
    zones = _build_zone_payload(parking_spaces.get("spaces", []), reports)

    total_spaces = sum(zone["total_spaces"] for zone in zones)
    free_spaces = sum(zone["free_spaces"] for zone in zones)
    occupied_spaces = sum(zone["occupied_spaces"] for zone in zones)

    return {
        "updated_at": (
            latest_analysis.fecha_analisis.isoformat()
            if latest_analysis.fecha_analisis
            else None
        ),
        "source": parking_spaces.get("source"),
        "analysis_mode": parking_spaces.get("analysis_mode"),
        "total_spaces": total_spaces,
        "free_spaces": free_spaces,
        "occupied_spaces": occupied_spaces,
        "zones": zones,
    }


def occupy_space_manually(
    db: Session,
    space_code: str,
    estimated_hours: int,
    user_id: int,
    user_name: str,
) -> dict:
    reports = _load_reports()
    parking_spaces = get_latest_parking_spaces(db)
    zone_lookup = _build_zone_lookup(parking_spaces.get("spaces", []))
    zone_context = zone_lookup.get(space_code, {})
    started_at = datetime.utcnow()
    expires_at = started_at + timedelta(hours=estimated_hours)
    reports[space_code] = {
        "status": "user_occupied",
        "user_id": user_id,
        "user_name": user_name,
        "zone_id": zone_context.get("zone_id"),
        "zone_title": zone_context.get("zone_title"),
        "display_code": zone_context.get("display_code"),
        "estimated_hours": estimated_hours,
        "started_at": started_at.isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    _save_reports(reports)
    _append_event(
        {
            "event_type": "occupy",
            "space_code": space_code,
            "display_code": zone_context.get("display_code"),
            "zone_id": zone_context.get("zone_id"),
            "zone_title": zone_context.get("zone_title"),
            "user_id": user_id,
            "user_name": user_name,
            "estimated_hours": estimated_hours,
            "started_at": started_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "occurred_at": started_at.isoformat(),
        }
    )
    return {
        "code": space_code,
        "status": "user_occupied",
        "display_code": zone_context.get("display_code"),
        "zone_id": zone_context.get("zone_id"),
        "zone_title": zone_context.get("zone_title"),
        "estimated_hours": estimated_hours,
        "user_id": user_id,
        "user_name": user_name,
        "started_at": started_at.isoformat(),
        "expires_at": expires_at.isoformat(),
    }


def release_space_manually(db: Session, space_code: str) -> dict:
    reports = _load_reports()
    existing_report = reports.pop(space_code, None)
    _save_reports(reports)
    parking_spaces = get_latest_parking_spaces(db)
    zone_lookup = _build_zone_lookup(parking_spaces.get("spaces", []))
    zone_context = zone_lookup.get(space_code, {})
    occurred_at = datetime.utcnow().isoformat()
    _append_event(
        {
            "event_type": "release",
            "space_code": space_code,
            "display_code": (
                existing_report.get("display_code")
                if existing_report
                else zone_context.get("display_code")
            ),
            "zone_id": (
                existing_report.get("zone_id")
                if existing_report
                else zone_context.get("zone_id")
            ),
            "zone_title": (
                existing_report.get("zone_title")
                if existing_report
                else zone_context.get("zone_title")
            ),
            "user_id": existing_report.get("user_id") if existing_report else None,
            "user_name": existing_report.get("user_name") if existing_report else None,
            "estimated_hours": (
                existing_report.get("estimated_hours") if existing_report else None
            ),
            "started_at": existing_report.get("started_at") if existing_report else None,
            "expires_at": existing_report.get("expires_at") if existing_report else None,
            "occurred_at": occurred_at,
        }
    )
    return {"code": space_code, "status": "free"}
