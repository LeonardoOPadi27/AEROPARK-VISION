from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.analisis import AnalisisImagen
from app.models.vehiculo_detectado import VehiculoDetectado


COLOR_SWATCHES = {
    "Negro": "#111827",
    "Blanco": "#f8fafc",
    "Gris": "#9ca3af",
    "Plateado": "#cbd5e1",
    "Rojo": "#ef4444",
    "Naranja": "#f97316",
    "Amarillo": "#eab308",
    "Verde claro": "#84cc16",
    "Verde": "#22c55e",
    "Cian": "#06b6d4",
    "Azul": "#2563eb",
    "Morado": "#9333ea",
    "Rosado": "#ec4899",
    "Marrón": "#92400e",
    "Beige": "#d6b98c",
    "Otro": "#64748b",
}


def _serialize_color_row(color_name: str | None, amount: int) -> dict:
    name = color_name or "Otro"

    return {
        "name": name,
        "count": amount,
        "swatch": COLOR_SWATCHES.get(name, COLOR_SWATCHES["Otro"]),
    }


def get_color_summary(db: Session) -> dict:
    rows = (
        db.query(
            VehiculoDetectado.color_detectado,
            func.count(VehiculoDetectado.id_vehiculo),
        )
        .group_by(VehiculoDetectado.color_detectado)
        .order_by(func.count(VehiculoDetectado.id_vehiculo).desc())
        .all()
    )
    colors = [_serialize_color_row(color, amount) for color, amount in rows]

    return {
        "scope": "global",
        "total_vehicles": sum(item["count"] for item in colors),
        "colors": colors,
    }


def get_latest_color_summary(db: Session) -> dict:
    latest_analysis = (
        db.query(AnalisisImagen)
        .order_by(AnalisisImagen.fecha_analisis.desc(), AnalisisImagen.id_analisis.desc())
        .first()
    )

    if not latest_analysis:
        return {
            "scope": "latest",
            "id_analisis": None,
            "id_imagen": None,
            "total_vehicles": 0,
            "colors": [],
        }

    rows = (
        db.query(
            VehiculoDetectado.color_detectado,
            func.count(VehiculoDetectado.id_vehiculo),
        )
        .filter(VehiculoDetectado.id_analisis == latest_analysis.id_analisis)
        .group_by(VehiculoDetectado.color_detectado)
        .order_by(func.count(VehiculoDetectado.id_vehiculo).desc())
        .all()
    )
    colors = [_serialize_color_row(color, amount) for color, amount in rows]

    return {
        "scope": "latest",
        "id_analisis": latest_analysis.id_analisis,
        "id_imagen": latest_analysis.id_imagen,
        "total_vehicles": sum(item["count"] for item in colors),
        "colors": colors,
    }
