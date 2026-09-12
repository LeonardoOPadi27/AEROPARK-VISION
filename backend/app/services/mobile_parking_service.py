from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.analisis import AnalisisImagen
from app.models.evento_espacio_movil import EventoEspacioMovil
from app.models.imagen import ImagenCapturada
from app.models.reporte_espacio_movil import ReporteEspacioMovil
from app.services.analysis_service import serialize_analysis
from app.services.image_zone_service import get_image_zone
from app.services.parking_zone_config import ZONE_DEFINITIONS
from app.services.settings_service import get_mobile_settings


def _serialize_report(report: ReporteEspacioMovil) -> dict:
    return {
        "status": "user_occupied",
        "user_id": report.id_usuario,
        "user_name": report.nombre_usuario,
        "zone_id": report.codigo_zona,
        "zone_title": report.titulo_zona,
        "display_code": report.codigo_espacio,
        "estimated_hours": report.horas_estimadas,
        "started_at": report.fecha_inicio.isoformat(),
        "expires_at": report.fecha_expiracion.isoformat(),
        "confirmation_due_at": report.fecha_confirmacion_requerida.isoformat(),
    }


def _load_reports(db: Session) -> dict:
    return {
        report.codigo_espacio: _serialize_report(report)
        for report in db.query(ReporteEspacioMovil).all()
    }


def _serialize_event(event: EventoEspacioMovil) -> dict:
    return {
        "event_type": event.tipo_evento,
        "space_code": event.codigo_espacio,
        "display_code": event.codigo_espacio,
        "zone_id": event.codigo_zona,
        "zone_title": event.titulo_zona,
        "user_id": event.id_usuario,
        "user_name": event.nombre_usuario,
        "estimated_hours": event.horas_estimadas,
        "started_at": event.fecha_inicio.isoformat() if event.fecha_inicio else None,
        "expires_at": event.fecha_expiracion.isoformat() if event.fecha_expiracion else None,
        "confirmation_due_at": (
            event.fecha_confirmacion_requerida.isoformat()
            if event.fecha_confirmacion_requerida
            else None
        ),
        "occurred_at": event.fecha_evento.isoformat() if event.fecha_evento else None,
    }


def get_mobile_space_events(db: Session) -> list[dict]:
    events = db.query(EventoEspacioMovil).order_by(EventoEspacioMovil.id_evento).all()
    return [_serialize_event(event) for event in events]


def get_active_mobile_reports(db: Session) -> dict:
    return _load_reports(db)


def _get_latest_analysis(db: Session) -> AnalisisImagen | None:
    return (
        db.query(AnalisisImagen)
        .join(ImagenCapturada)
        .filter(AnalisisImagen.estado == "completado_yolo")
        .order_by(ImagenCapturada.id_imagen.desc())
        .first()
    )


def _get_latest_analysis_by_zone(db: Session) -> dict[str, dict]:
    analyses = (
        db.query(AnalisisImagen)
        .join(ImagenCapturada)
        .order_by(ImagenCapturada.id_imagen.desc())
        .all()
    )
    latest_by_zone = {}

    for analysis in analyses:
        if analysis.estado != "completado_yolo":
            continue
        zone = get_image_zone(analysis.imagen)
        zone_code = zone.get("zone_code") if zone else None
        if zone_code and zone_code not in latest_by_zone:
            latest_by_zone[zone_code] = serialize_analysis(analysis)

    return latest_by_zone


def _build_zone_payload(
    reports: dict,
    latest_by_zone: dict[str, dict],
    *,
    viewer_id: int | None = None,
    include_all_user_details: bool = True,
) -> list[dict]:
    zones = []

    for zone_definition in ZONE_DEFINITIONS:
        zone_id = zone_definition["id"]
        capacity = int(zone_definition["capacity"])
        latest_analysis = latest_by_zone.get(zone_id, {})
        analysis_available = latest_analysis.get("analysis_mode") == "yolo"
        mapping = latest_analysis.get("slot_mapping") or {}
        mapped_by_code = {space["code"]: space for space in mapping.get("spaces", [])}
        detected_occupied = min(
            max(int(latest_analysis.get("espacios_ocupados") or 0), 0),
            capacity,
        ) if analysis_available else 0
        zone_reports = {
            code: report
            for code, report in reports.items()
            if code.startswith(f"{zone_id}-")
        }
        confirmed_manual_count = len(zone_reports)
        estimated_occupied = (
            min(max(detected_occupied, confirmed_manual_count), capacity)
            if analysis_available
            else None
        )
        mapped_spaces = []

        for local_index in range(1, capacity + 1):
            space_code = f"{zone_id}-{local_index:03d}"
            manual_report = zone_reports.get(space_code)
            detected_space = mapped_by_code.get(space_code, {})
            status = detected_space.get("status", "unknown")
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
                owns_report = manual_report.get("user_id") == viewer_id
                if include_all_user_details or owns_report:
                    reported_user_id = manual_report.get("user_id")
                    reported_user_name = manual_report.get("user_name")
                expires_at = manual_report.get("expires_at")
                confirmation_due_at = manual_report.get("confirmation_due_at") or expires_at
                if confirmation_due_at:
                    try:
                        confirmation_required = (
                            datetime.fromisoformat(confirmation_due_at) <= datetime.utcnow()
                        )
                    except ValueError:
                        confirmation_required = False

            mapped_spaces.append(
                {
                    "code": space_code,
                    "display_code": space_code,
                    "status": status,
                    "source": "user_report" if manual_report else detected_space.get("source", "aggregate_only"),
                    "detected_status": detected_space.get("status", "unknown"),
                    "estimated_hours": estimated_hours,
                    "user_confirmed_at": user_confirmed_at,
                    "reported_user_id": reported_user_id,
                    "reported_user_name": reported_user_name,
                    "expires_at": expires_at,
                    "confirmation_required": confirmation_required,
                }
            )

        unknown_spaces = sum(space["status"] == "unknown" for space in mapped_spaces)
        if mapped_by_code:
            estimated_occupied = sum(space["status"] in {"occupied", "user_occupied"} for space in mapped_spaces)
            detected_occupied = mapping["occupied_spaces"]
        free_spaces = (
            sum(space["status"] == "free" for space in mapped_spaces)
            if mapped_by_code else capacity - estimated_occupied
            if estimated_occupied is not None else None
        )
        zones.append(
            {
                **zone_definition,
                "spaces": mapped_spaces,
                "free_spaces": free_spaces,
                "occupied_spaces": estimated_occupied,
                "detected_occupied_spaces": (
                    detected_occupied if analysis_available else None
                ),
                "manual_occupied_spaces": confirmed_manual_count,
                "total_spaces": len(mapped_spaces),
                "analysis_available": analysis_available,
                "occupancy_is_estimate": analysis_available and not bool(mapped_by_code),
                "location_assignment_available": bool(mapped_by_code),
                "location_coverage_complete": unknown_spaces == 0,
                "unknown_spaces": unknown_spaces,
                "calibrated_spaces": mapping.get("calibrated_spaces", 0),
                "mapping_source": mapping.get("source"),
                "unmatched_detections": mapping.get("unmatched_detections", 0),
                "image_id": latest_analysis.get("id_imagen"),
                "updated_at": latest_analysis.get("fecha_analisis"),
                "occupancy_basis": (
                    "polygon_map" if mapped_by_code else "aggregate_vehicle_detection"
                    if analysis_available
                    else "no_operational_analysis"
                ),
            }
        )

    return zones


def _build_zone_lookup() -> dict[str, dict]:
    lookup = {}
    for zone in _build_zone_payload({}, {}):
        for space in zone["spaces"]:
            lookup[space["code"]] = {
                "zone_id": zone["id"],
                "zone_title": zone["title"],
                "display_code": space["display_code"],
            }
    return lookup


def _build_event(payload: dict) -> EventoEspacioMovil:
    return EventoEspacioMovil(
        tipo_evento=payload["event_type"],
        codigo_espacio=payload["space_code"],
        codigo_zona=payload["zone_id"],
        titulo_zona=payload["zone_title"],
        id_usuario=payload.get("user_id"),
        nombre_usuario=payload.get("user_name"),
        horas_estimadas=payload.get("estimated_hours"),
        fecha_inicio=payload.get("started_at"),
        fecha_expiracion=payload.get("expires_at"),
        fecha_confirmacion_requerida=payload.get("confirmation_due_at"),
        fecha_evento=payload.get("occurred_at"),
    )


def get_mobile_parking_overview(
    db: Session,
    *,
    viewer_id: int | None = None,
    include_all_user_details: bool = True,
) -> dict:
    latest_analysis = _get_latest_analysis(db)
    reports = _load_reports(db)
    zones = _build_zone_payload(
        reports,
        _get_latest_analysis_by_zone(db),
        viewer_id=viewer_id,
        include_all_user_details=include_all_user_details,
    )

    total_spaces = sum(zone["total_spaces"] for zone in zones)
    coverage_complete = all(
        zone["analysis_available"] and (
            not zone["location_assignment_available"] or zone["location_coverage_complete"]
        ) for zone in zones
    )
    free_spaces = (
        sum(zone["free_spaces"] for zone in zones)
        if coverage_complete
        else None
    )
    occupied_spaces = (
        sum(zone["occupied_spaces"] for zone in zones)
        if coverage_complete
        else None
    )

    return {
        "updated_at": (
            latest_analysis.fecha_analisis.isoformat()
            if latest_analysis and latest_analysis.fecha_analisis
            else None
        ),
        "source": (
            "polygon_map" if all(zone["location_assignment_available"] for zone in zones)
            else "mixed" if any(zone["location_assignment_available"] for zone in zones)
            else "aggregate_vehicle_detection"
        ),
        "unknown_spaces": sum(zone["unknown_spaces"] for zone in zones),
        "located_free_spaces": sum(s["status"] == "free" for zone in zones for s in zone["spaces"]),
        "located_occupied_spaces": sum(s["status"] in {"occupied", "user_occupied"} for zone in zones for s in zone["spaces"]),
        "location_coverage_complete": all(zone["location_coverage_complete"] for zone in zones),
        "analysis_mode": "yolo" if coverage_complete else "partial",
        "coverage_complete": coverage_complete,
        "analyzed_zones": [zone["id"] for zone in zones if zone["analysis_available"]],
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
    settings = get_mobile_settings(db)
    if not settings["manual_occupy_enabled"]:
        raise HTTPException(status_code=403, detail="La ocupación manual está deshabilitada.")
    if estimated_hours > settings["max_estimated_hours"]:
        raise HTTPException(
            status_code=422,
            detail=(
                "El tiempo estimado supera el máximo configurado de "
                f"{settings['max_estimated_hours']} horas."
            ),
        )

    space_code = space_code.strip().upper()
    reports = _load_reports(db)
    zone_lookup = _build_zone_lookup()
    zone_context = zone_lookup.get(space_code, {})
    if not zone_context:
        raise HTTPException(status_code=404, detail="Espacio no encontrado.")
    if space_code in reports:
        raise HTTPException(status_code=409, detail="El espacio ya está marcado como ocupado.")
    if any(report.get("user_id") == user_id for report in reports.values()):
        raise HTTPException(status_code=409, detail="El usuario ya tiene un espacio activo.")
    started_at = datetime.utcnow()
    expires_at = started_at + timedelta(hours=estimated_hours)
    confirmation_due_at = started_at + timedelta(
        hours=settings["pending_confirmation_after_hours"]
    )
    report = ReporteEspacioMovil(
        codigo_espacio=space_code,
        id_usuario=user_id,
        nombre_usuario=user_name,
        codigo_zona=zone_context["zone_id"],
        titulo_zona=zone_context["zone_title"],
        horas_estimadas=estimated_hours,
        fecha_inicio=started_at,
        fecha_expiracion=expires_at,
        fecha_confirmacion_requerida=confirmation_due_at,
    )
    event = _build_event(
        {
            "event_type": "occupy",
            "space_code": space_code,
            "zone_id": zone_context["zone_id"],
            "zone_title": zone_context["zone_title"],
            "user_id": user_id,
            "user_name": user_name,
            "estimated_hours": estimated_hours,
            "started_at": started_at,
            "expires_at": expires_at,
            "confirmation_due_at": confirmation_due_at,
            "occurred_at": started_at,
        }
    )
    db.add_all([report, event])
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="El espacio fue ocupado por otro usuario.",
        ) from exc
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
        "confirmation_due_at": confirmation_due_at.isoformat(),
    }


def release_space_manually(
    db: Session,
    space_code: str,
    requesting_user_id: int,
    requesting_user_is_admin: bool = False,
) -> dict:
    settings = get_mobile_settings(db)
    if not settings["manual_release_enabled"]:
        raise HTTPException(status_code=403, detail="La liberación manual está deshabilitada.")

    space_code = space_code.strip().upper()
    zone_lookup = _build_zone_lookup()
    zone_context = zone_lookup.get(space_code, {})
    if not zone_context:
        raise HTTPException(status_code=404, detail="Espacio no encontrado.")

    existing_row = db.query(ReporteEspacioMovil).filter_by(
        codigo_espacio=space_code
    ).first()
    existing_report = _serialize_report(existing_row) if existing_row else None
    if not existing_report:
        raise HTTPException(status_code=409, detail="El espacio no tiene una ocupación manual activa.")
    if (
        existing_report.get("user_id") != requesting_user_id
        and not requesting_user_is_admin
    ):
        raise HTTPException(
            status_code=403,
            detail="Solo el usuario que ocupó el espacio o un administrador puede liberarlo.",
        )

    occurred_at = datetime.utcnow()
    db.add(
        _build_event(
            {
                "event_type": "release",
                "space_code": space_code,
                "zone_id": existing_row.codigo_zona,
                "zone_title": existing_row.titulo_zona,
                "user_id": existing_row.id_usuario,
                "user_name": existing_row.nombre_usuario,
                "estimated_hours": existing_row.horas_estimadas,
                "started_at": existing_row.fecha_inicio,
                "expires_at": existing_row.fecha_expiracion,
                "confirmation_due_at": existing_row.fecha_confirmacion_requerida,
                "occurred_at": occurred_at,
            }
        )
    )
    db.delete(existing_row)
    db.commit()
    return {"code": space_code, "status": "free"}
