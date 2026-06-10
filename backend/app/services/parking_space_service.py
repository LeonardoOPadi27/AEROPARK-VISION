import os

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.models.analisis import AnalisisImagen
from app.models.espacio import Espacio
from app.models.imagen import ImagenCapturada
from app.services.parking_map_service import (
    build_polygon_space_status,
    get_parking_map_path,
    load_parking_map,
)


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
    bounded_occupied = min(max(occupied_spaces, 0), total_spaces)

    return [
        {
            "id": index,
            "code": f"E-{index:03d}",
            "occupied": index <= bounded_occupied,
            "source": "estimated_yolo",
        }
        for index in range(1, total_spaces + 1)
    ]


def get_latest_parking_spaces(db: Session) -> dict:
    latest_analysis = (
        db.query(AnalisisImagen)
        .join(ImagenCapturada)
        .order_by(ImagenCapturada.id_imagen.desc())
        .first()
    )

    if not latest_analysis:
        raise HTTPException(status_code=404, detail="No hay análisis registrados.")

    parking_map = load_parking_map()
    if parking_map:
        try:
            polygon_status = build_polygon_space_status(latest_analysis, parking_map)
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
                "map_configured": True,
                "map_path": str(get_parking_map_path()),
                **polygon_status,
            }
        except OperationalError as exc:
            if "no such table: vehiculo_detectado" not in str(exc).lower():
                raise

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
        "source": "estimated_yolo",
        "total_spaces": total_spaces,
        "occupied_spaces": occupied_spaces,
        "free_spaces": free_spaces,
        "occupancy_percentage": occupancy_percentage,
        "spaces": _build_estimated_spaces(total_spaces, occupied_spaces),
    }
