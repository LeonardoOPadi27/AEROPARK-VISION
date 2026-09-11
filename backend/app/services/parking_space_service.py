import os

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.analisis import AnalisisImagen
from app.models.espacio import Espacio
from app.models.imagen import ImagenCapturada
from app.services.parking_map_service import get_parking_map_path
from app.services.image_zone_service import get_image_zone
from app.services.parking_zone_config import get_zone_capacity
from app.services.analysis_service import serialize_analysis


def _configured_space_count(db: Session, analysis: AnalisisImagen) -> int:
    query = db.query(Espacio).filter(Espacio.estado.is_(True))

    if analysis.imagen and analysis.imagen.id_estacionamiento:
        query = query.filter(
            Espacio.id_estacionamiento == analysis.imagen.id_estacionamiento
        )

    total = query.count()
    if total:
        return total

    return int(os.getenv("TOTAL_PARKING_SPACES", "35"))


def _build_estimated_spaces(total_spaces: int, occupied_spaces: int) -> list[dict]:
    return [
        {
            "id": index,
            "code": f"E-{index:03d}",
            "occupied": None,
            "source": "aggregate_only",
        }
        for index in range(1, total_spaces + 1)
    ]


def _build_zone_spaces(zone_code: str, total_spaces: int, occupied_spaces: int) -> list[dict]:
    return [
        {
            "id": index,
            "code": f"{zone_code}-{index:03d}",
            "occupied": None,
            "source": "aggregate_only",
        }
        for index in range(1, total_spaces + 1)
    ]


def get_latest_parking_spaces(db: Session) -> dict:
    latest_analysis = (
        db.query(AnalisisImagen)
        .join(ImagenCapturada)
        .filter(AnalisisImagen.estado == "completado_yolo")
        .order_by(ImagenCapturada.id_imagen.desc())
        .first()
    )

    if not latest_analysis:
        raise HTTPException(status_code=404, detail="No hay análisis registrados.")

    serialized = serialize_analysis(latest_analysis)
    mapping = serialized.get("slot_mapping")
    if mapping and mapping["location_assignment_available"]:
        capacity = get_zone_capacity(serialized["zone_code"])
        by_code = {space["code"]: space for space in mapping["spaces"]}
        spaces = []
        for index in range(1, capacity + 1):
            code = f"{serialized['zone_code']}-{index:03d}"
            space = by_code.get(code, {"code": code, "status": "unknown", "source": "uncalibrated"})
            spaces.append({**space, "id": index, "occupied": True if space["status"] == "occupied"
                           else False if space["status"] == "free" else None})
        return {
            **mapping,
            "id_analisis": latest_analysis.id_analisis,
            "id_imagen": latest_analysis.id_imagen,
            "image_name": serialized["image_name"],
            "zone_code": serialized["zone_code"],
            "analysis_mode": "yolo",
            "map_configured": True,
            "source": "polygon_map",
            "occupancy_is_estimate": False,
            "total_spaces": capacity,
            "occupancy_percentage": round(mapping["occupied_spaces"] / capacity * 100, 1) if mapping["coverage_complete"] else None,
            "spaces": spaces,
        }

    zone_metadata = get_image_zone(latest_analysis.imagen)
    zone_code = zone_metadata.get("zone_code") if zone_metadata else None
    zone_capacity = get_zone_capacity(zone_code)

    if zone_code and zone_capacity:
        occupied_spaces = min(latest_analysis.espacios_ocupados or 0, zone_capacity)
        free_spaces = max(zone_capacity - occupied_spaces, 0)
        occupancy_percentage = (
            round((occupied_spaces / zone_capacity) * 100, 1)
            if zone_capacity
            else 0
        )

        return {
            "id_analisis": latest_analysis.id_analisis,
            "id_imagen": latest_analysis.id_imagen,
            "image_name": (
                latest_analysis.imagen.nombre_original
                if latest_analysis.imagen
                else None
            ),
            "analysis_mode": (
                "yolo" if latest_analysis.estado == "completado_yolo" else "mock"
            ),
            "map_configured": False,
            "map_path": str(get_parking_map_path()),
            "source": "aggregate_vehicle_detection",
            "occupancy_is_estimate": True,
            "location_assignment_available": False,
            "zone_code": zone_code,
            "zone_title": zone_metadata.get("zone_title"),
            "total_spaces": zone_capacity,
            "occupied_spaces": occupied_spaces,
            "free_spaces": free_spaces,
            "occupancy_percentage": occupancy_percentage,
            "spaces": _build_zone_spaces(zone_code, zone_capacity, occupied_spaces),
        }

    total_spaces = _configured_space_count(db, latest_analysis)
    occupied_spaces = min(latest_analysis.espacios_ocupados or 0, total_spaces)
    free_spaces = max(total_spaces - occupied_spaces, 0)
    occupancy_percentage = (
        round((occupied_spaces / total_spaces) * 100, 1) if total_spaces else 0
    )

    return {
        "id_analisis": latest_analysis.id_analisis,
        "id_imagen": latest_analysis.id_imagen,
        "image_name": (
            latest_analysis.imagen.nombre_original if latest_analysis.imagen else None
        ),
        "analysis_mode": (
            "yolo" if latest_analysis.estado == "completado_yolo" else "mock"
        ),
        "map_configured": False,
        "map_path": str(get_parking_map_path()),
        "source": "aggregate_vehicle_detection",
        "occupancy_is_estimate": True,
        "location_assignment_available": False,
        "total_spaces": total_spaces,
        "occupied_spaces": occupied_spaces,
        "free_spaces": free_spaces,
        "occupancy_percentage": occupancy_percentage,
        "spaces": _build_estimated_spaces(total_spaces, occupied_spaces),
    }
