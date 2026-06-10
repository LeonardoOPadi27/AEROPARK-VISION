from datetime import datetime

from sqlalchemy.orm import Session

from app.services.analysis_service import get_analysis_list
from app.services.mobile_parking_service import (
    get_active_mobile_reports,
    get_mobile_parking_overview,
    get_mobile_space_events,
)


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _format_range_label(analyses: list[dict]) -> str:
    dates = sorted(
        [_parse_iso(item.get("fecha_analisis")) for item in analyses if item.get("fecha_analisis")]
    )
    dates = [item for item in dates if item]
    if not dates:
        return "Sin datos"
    if len(dates) == 1:
        return dates[0].strftime("%d/%m/%Y")
    return f"{dates[0].strftime('%d/%m/%Y')} - {dates[-1].strftime('%d/%m/%Y')}"


def _average(values: list[float | int]) -> float:
    if not values:
        return 0
    return round(sum(values) / len(values), 1)


def _build_zone_metrics(analyses: list[dict], overview: dict) -> list[dict]:
    analysis_by_zone: dict[str, list[dict]] = {}
    for analysis in analyses:
        zone_title = analysis.get("zone_title") or "Zona no definida"
        analysis_by_zone.setdefault(zone_title, []).append(analysis)

    result = []
    for zone in overview.get("zones", []):
        zone_analyses = analysis_by_zone.get(zone["title"], [])
        occupancy_values = [
            float(item.get("porcentaje_ocupacion") or 0) for item in zone_analyses
        ]
        result.append(
            {
                "id": zone["id"],
                "title": zone["title"],
                "free_spaces": zone["free_spaces"],
                "occupied_spaces": zone["occupied_spaces"],
                "total_spaces": zone["total_spaces"],
                "occupancy_percentage": round(
                    (zone["occupied_spaces"] / zone["total_spaces"]) * 100, 1
                )
                if zone["total_spaces"]
                else 0,
                "average_occupancy_percentage": _average(occupancy_values),
                "last_review": overview.get("updated_at"),
            }
        )
    return result


def _build_usage_metrics(events: list[dict], active_reports: dict) -> dict:
    occupy_events = [event for event in events if event.get("event_type") == "occupy"]
    release_events = [event for event in events if event.get("event_type") == "release"]
    estimated_hours = [
        int(event["estimated_hours"])
        for event in occupy_events
        if event.get("estimated_hours") is not None
    ]
    overdue_count = 0
    now = datetime.utcnow()
    for report in active_reports.values():
        expires_at = _parse_iso(report.get("expires_at"))
        if expires_at and expires_at <= now:
            overdue_count += 1

    return {
        "manual_occupations": len(occupy_events),
        "manual_releases": len(release_events),
        "active_user_spaces": len(active_reports),
        "expired_without_confirmation": overdue_count,
        "average_estimated_hours": _average(estimated_hours),
    }


def _build_consistency_metrics(analyses: list[dict], active_reports: dict) -> dict:
    latest = analyses[0] if analyses else None
    detected_occupied = int(latest.get("espacios_ocupados") or 0) if latest else 0
    active_user_spaces = len(active_reports)
    difference = abs(detected_occupied - active_user_spaces)
    agreement = 100.0
    if detected_occupied:
        agreement = round(max(0, 100 - (difference / detected_occupied) * 100), 1)

    now = datetime.utcnow()
    pending_confirmation = 0
    for report in active_reports.values():
        expires_at = _parse_iso(report.get("expires_at"))
        if expires_at and expires_at <= now:
            pending_confirmation += 1

    return {
        "analysis_detected_occupied": detected_occupied,
        "manual_active_reports": active_user_spaces,
        "difference_count": difference,
        "agreement_percentage": agreement,
        "pending_confirmation": pending_confirmation,
    }


def _build_chart_points(analyses: list[dict]) -> list[dict]:
    points = []
    for analysis in reversed(analyses[-8:]):
        zone = analysis.get("zone_code") or analysis.get("zone_title") or "Zona"
        points.append(
            {
                "id": analysis.get("id_analisis"),
                "label": f"AN-{int(analysis.get('id_analisis', 0)):03d}",
                "zone": zone,
                "occupancy_percentage": float(analysis.get("porcentaje_ocupacion") or 0),
                "occupied_spaces": int(analysis.get("espacios_ocupados") or 0),
                "free_spaces": int(analysis.get("espacios_libres") or 0),
                "timestamp": analysis.get("fecha_analisis"),
            }
        )
    return points


def _build_records(analyses: list[dict], events: list[dict], active_reports: dict) -> list[dict]:
    records = []
    for analysis in analyses:
        records.append(
            {
                "id": f"analysis-{analysis['id_analisis']}",
                "timestamp": analysis.get("fecha_analisis"),
                "zone": analysis.get("zone_title") or "Zona no definida",
                "space_code": "-",
                "status": "ocupacion detectada",
                "source": "analisis",
                "user_name": "-",
                "estimated_hours": "-",
                "confirmation": "-",
                "detail": (
                    f"{analysis.get('espacios_libres', 0)} libres · "
                    f"{analysis.get('espacios_ocupados', 0)} ocupados · "
                    f"{analysis.get('porcentaje_ocupacion', 0)}%"
                ),
            }
        )

    now = datetime.utcnow()
    for index, event in enumerate(events):
        expires_at = _parse_iso(event.get("expires_at"))
        confirmation = "sin vencimiento"
        if expires_at:
            confirmation = "pendiente" if expires_at <= now else "al dia"

        records.append(
            {
                "id": f"event-{index}",
                "timestamp": event.get("occurred_at"),
                "zone": event.get("zone_title") or "Zona no definida",
                "space_code": event.get("display_code") or event.get("space_code") or "-",
                "status": (
                    "ocupado manual"
                    if event.get("event_type") == "occupy"
                    else "liberado manual"
                ),
                "source": "usuario",
                "user_name": event.get("user_name") or "-",
                "estimated_hours": (
                    f"{event.get('estimated_hours')} h"
                    if event.get("estimated_hours") is not None
                    else "-"
                ),
                "confirmation": confirmation,
                "detail": (
                    "Registro manual desde la app mobile"
                    if event.get("event_type") == "occupy"
                    else "Liberacion manual desde la app mobile"
                ),
            }
        )

    now = datetime.utcnow()
    for space_code, report in active_reports.items():
        expires_at = _parse_iso(report.get("expires_at"))
        confirmation = "al dia"
        if expires_at and expires_at <= now:
            confirmation = "pendiente"

        records.append(
            {
                "id": f"active-{space_code}",
                "timestamp": report.get("started_at"),
                "zone": report.get("zone_title") or "Zona no definida",
                "space_code": report.get("display_code") or space_code,
                "status": "ocupado por usuario",
                "source": "usuario",
                "user_name": report.get("user_name") or "-",
                "estimated_hours": (
                    f"{report.get('estimated_hours')} h"
                    if report.get("estimated_hours") is not None
                    else "-"
                ),
                "confirmation": confirmation,
                "detail": "Espacio actualmente marcado desde la app mobile",
            }
        )

    return sorted(
        records,
        key=lambda item: _parse_iso(item.get("timestamp")) or datetime.min,
        reverse=True,
    )


def get_reports_overview(db: Session) -> dict:
    analyses = get_analysis_list(db)
    overview = get_mobile_parking_overview(db)
    active_reports = get_active_mobile_reports()
    events = get_mobile_space_events()

    total_analyses = len(analyses)
    occupancy_values = [float(item.get("porcentaje_ocupacion") or 0) for item in analyses]
    free_values = [int(item.get("espacios_libres") or 0) for item in analyses]
    occupied_values = [int(item.get("espacios_ocupados") or 0) for item in analyses]

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "range_label": _format_range_label(analyses),
        "summary": {
            "total_analyses": total_analyses,
            "average_occupancy_percentage": _average(occupancy_values),
            "average_free_spaces": _average(free_values),
            "average_occupied_spaces": _average(occupied_values),
            "last_updated": overview.get("updated_at"),
        },
        "zones": _build_zone_metrics(analyses, overview),
        "mobile_usage": _build_usage_metrics(events, active_reports),
        "consistency": _build_consistency_metrics(analyses, active_reports),
        "chart_points": _build_chart_points(analyses),
        "records": _build_records(analyses, events, active_reports),
    }
