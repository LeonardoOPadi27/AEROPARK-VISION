from fastapi import HTTPException
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.models.analisis import AnalisisImagen
from app.models.imagen import ImagenCapturada
from app.models.ocupacion_espacio import OcupacionEspacio
from app.models.vehiculo_detectado import VehiculoDetectado
from app.services.detection_service import (
    DetectionUnavailableError,
    detect_vehicles_with_yolo,
    get_yolo_status,
    resolve_stored_image_path,
)
from app.services.image_zone_service import get_image_zone


def build_mock_analysis_values(image_id: int) -> dict:
    vehiculos_detectados = 24 + (image_id * 7) % 19
    espacios_libres = 8 + (image_id * 5) % 11
    espacios_ocupados = vehiculos_detectados
    total_espacios = espacios_ocupados + espacios_libres
    porcentaje_ocupacion = round((espacios_ocupados / total_espacios) * 100, 1)
    precision_modelo = round(90 + ((image_id * 13) % 46) / 10, 1)

    return {
        "vehiculos_detectados": vehiculos_detectados,
        "espacios_libres": espacios_libres,
        "espacios_ocupados": espacios_ocupados,
        "porcentaje_ocupacion": porcentaje_ocupacion,
        "precision_modelo": precision_modelo,
        "estado": "completado_mock",
    }


def serialize_analysis(analysis: AnalisisImagen) -> dict:
    image = analysis.imagen
    zone_metadata = get_image_zone(image.id_imagen if image else None)
    analysis_mode = "yolo" if analysis.estado == "completado_yolo" else "mock"
    color_counts: dict[str, int] = {}
    type_counts: dict[str, int] = {}
    vehicles = _get_analysis_vehicles(analysis)

    for vehicle in vehicles:
        color_name = vehicle.color_detectado or "Otro"
        color_counts[color_name] = color_counts.get(color_name, 0) + 1
        class_name = vehicle.clase or "vehicle"
        type_counts[class_name] = type_counts.get(class_name, 0) + 1

    autos_detectados = type_counts.get("car", 0)
    motocicletas_detectadas = type_counts.get("motorcycle", 0)
    total_vehiculos = sum(type_counts.values()) or analysis.vehiculos_detectados
    if not type_counts and analysis.estado == "completado_mock":
        autos_detectados = analysis.vehiculos_detectados

    return {
        "id_analisis": analysis.id_analisis,
        "id_imagen": analysis.id_imagen,
        "vehiculos_detectados": analysis.vehiculos_detectados,
        "autos_detectados": autos_detectados,
        "motocicletas_detectadas": motocicletas_detectadas,
        "total_vehiculos": total_vehiculos,
        "espacios_libres": analysis.espacios_libres,
        "espacios_ocupados": analysis.espacios_ocupados,
        "porcentaje_ocupacion": analysis.porcentaje_ocupacion,
        "precision_modelo": analysis.precision_modelo,
        "estado": analysis.estado,
        "analysis_mode": analysis_mode,
        "fecha_analisis": (
            analysis.fecha_analisis.isoformat() if analysis.fecha_analisis else None
        ),
        "image_url": image.ruta_archivo if image else None,
        "image_name": image.nombre_original if image else None,
        "zone_code": zone_metadata.get("zone_code") if zone_metadata else None,
        "zone_title": zone_metadata.get("zone_title") if zone_metadata else None,
        "detections": [
            {
                "id_vehiculo": vehicle.id_vehiculo,
                "label": vehicle.clase,
                "confidence": vehicle.confianza,
                "color": vehicle.color_detectado,
                "bbox": [vehicle.x1, vehicle.y1, vehicle.x2, vehicle.y2],
            }
            for vehicle in vehicles
        ],
        "color_distribution": [
            {"color": color, "cantidad": amount}
            for color, amount in sorted(
                color_counts.items(), key=lambda item: item[1], reverse=True
            )
        ],
        "vehicle_type_distribution": [
            {"tipo": vehicle_type, "cantidad": amount}
            for vehicle_type, amount in sorted(
                type_counts.items(), key=lambda item: item[1], reverse=True
            )
        ],
    }


def _get_analysis_vehicles(analysis: AnalisisImagen) -> list[VehiculoDetectado]:
    try:
        return list(analysis.vehiculos)
    except OperationalError as exc:
        if "no such table: vehiculo_detectado" not in str(exc).lower():
            raise
        return []


def _build_analysis_values(image: ImagenCapturada, force_mock: bool = False) -> dict:
    if not force_mock:
        try:
            detection_result = detect_vehicles_with_yolo(
                resolve_stored_image_path(image.ruta_archivo)
            )
            return {
                "vehiculos_detectados": detection_result["vehiculos_detectados"],
                "espacios_libres": detection_result["espacios_libres"],
                "espacios_ocupados": detection_result["espacios_ocupados"],
                "porcentaje_ocupacion": detection_result["porcentaje_ocupacion"],
                "precision_modelo": detection_result["precision_modelo"],
                "estado": "completado_yolo",
                "detections": detection_result.get("detections", []),
            }
        except DetectionUnavailableError:
            pass

    return build_mock_analysis_values(image.id_imagen)


def _persist_analysis_details(db: Session, analysis: AnalisisImagen, values: dict) -> None:
    db.query(VehiculoDetectado).filter(
        VehiculoDetectado.id_analisis == analysis.id_analisis
    ).delete(synchronize_session=False)
    db.query(OcupacionEspacio).filter(
        OcupacionEspacio.id_analisis == analysis.id_analisis
    ).delete(synchronize_session=False)

    detections = values.get("detections", [])
    for detection in detections:
        x1, y1, x2, y2 = detection["bbox"]
        db.add(
            VehiculoDetectado(
                id_analisis=analysis.id_analisis,
                clase=detection["label"],
                confianza=detection["confidence"],
                color_detectado=detection.get("color"),
                x1=x1,
                y1=y1,
                x2=x2,
                y2=y2,
            )
        )

    for index in range(values.get("espacios_ocupados", 0)):
        db.add(
            OcupacionEspacio(
                id_analisis=analysis.id_analisis,
                codigo_espacio=f"O-{index + 1:03d}",
                ocupado=True,
                fuente=values.get("estado", "estimado_yolo"),
            )
        )

    for index in range(values.get("espacios_libres", 0)):
        db.add(
            OcupacionEspacio(
                id_analisis=analysis.id_analisis,
                codigo_espacio=f"L-{index + 1:03d}",
                ocupado=False,
                fuente=values.get("estado", "estimado_yolo"),
            )
        )


def ensure_analysis_for_image(
    db: Session,
    image: ImagenCapturada,
    *,
    force_mock: bool = False,
) -> AnalisisImagen:
    values = _build_analysis_values(image, force_mock=force_mock)
    detail_values = values.copy()
    values.pop("detections", None)

    if image.analisis:
        for key, value in values.items():
            setattr(image.analisis, key, value)
        db.flush()
        _persist_analysis_details(db, image.analisis, detail_values)
        db.flush()
        return image.analisis

    analysis = AnalisisImagen(id_imagen=image.id_imagen, **values)
    db.add(analysis)
    db.flush()
    _persist_analysis_details(db, analysis, detail_values)
    db.flush()
    return analysis


def get_analysis_list(db: Session) -> list[dict]:
    images = db.query(ImagenCapturada).order_by(ImagenCapturada.id_imagen.desc()).all()
    created = False

    for image in images:
        if not image.analisis:
            ensure_analysis_for_image(db, image)
            created = True

    if created:
        db.commit()
        for image in images:
            db.refresh(image)

    return [serialize_analysis(image.analisis) for image in images if image.analisis]


def get_latest_analysis(db: Session) -> dict:
    image = (
        db.query(ImagenCapturada).order_by(ImagenCapturada.id_imagen.desc()).first()
    )

    if not image:
        raise HTTPException(status_code=404, detail="No hay análisis registrados.")

    if not image.analisis:
        ensure_analysis_for_image(db, image)
        db.commit()
        db.refresh(image)

    return serialize_analysis(image.analisis)


def run_mock_analysis_for_image(db: Session, image_id: int) -> dict:
    image = db.query(ImagenCapturada).filter(ImagenCapturada.id_imagen == image_id).first()

    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada.")

    ensure_analysis_for_image(db, image, force_mock=True)
    db.commit()
    db.refresh(image)

    return serialize_analysis(image.analisis)


def run_analysis_for_image(db: Session, image_id: int) -> dict:
    image = db.query(ImagenCapturada).filter(ImagenCapturada.id_imagen == image_id).first()

    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada.")

    ensure_analysis_for_image(db, image, force_mock=False)
    db.commit()
    db.refresh(image)

    return serialize_analysis(image.analisis)


def get_detection_runtime_status() -> dict:
    return get_yolo_status()
