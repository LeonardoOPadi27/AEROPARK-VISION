import os
from datetime import datetime, timedelta

import cv2
import numpy as np

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, object_session

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
from app.services.parking_zone_config import get_zone_capacity
from app.services.space_calibration_service import (
    assign_detections,
    get_default_calibration,
    load_calibration,
    merge_calibrations,
    get_zone_b_upper_calibration,
)
from app.services.zone_b_pair_service import is_pair_member, load_pair
from PIL import Image


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


def mock_analysis_enabled() -> bool:
    return os.getenv("ALLOW_MOCK_ANALYSIS", "false").strip().lower() == "true"


def _mark_stale_pending_analyses(db: Session) -> None:
    """Expose jobs abandoned by a container restart instead of showing forever pending."""
    try:
        timeout_seconds = int(os.getenv("ANALYSIS_TIMEOUT_SECONDS", "300"))
    except ValueError:
        timeout_seconds = 300

    cutoff = datetime.utcnow() - timedelta(seconds=max(timeout_seconds, 60))
    stale_analyses = (
        db.query(AnalisisImagen)
        .filter(
            AnalisisImagen.estado == "pendiente",
            AnalisisImagen.fecha_analisis < cutoff,
        )
        .all()
    )
    if not stale_analyses:
        return

    for analysis in stale_analyses:
        analysis.estado = "fallido"
    db.commit()


def serialize_analysis(analysis: AnalisisImagen) -> dict:
    image = analysis.imagen
    zone_metadata = get_image_zone(image)
    zone_capacity = get_zone_capacity(
        zone_metadata.get("zone_code") if zone_metadata else None
    )
    analysis_mode = (
        "yolo"
        if analysis.estado == "completado_yolo"
        else "mock"
        if analysis.estado == "completado_mock"
        else "failed"
        if analysis.estado == "fallido"
        else "pending"
    )
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
    espacios_ocupados = analysis.espacios_ocupados
    espacios_libres = analysis.espacios_libres
    porcentaje_ocupacion = analysis.porcentaje_ocupacion

    if zone_capacity:
        espacios_ocupados = min(analysis.espacios_ocupados or 0, zone_capacity)
        espacios_libres = max(zone_capacity - espacios_ocupados, 0)
        porcentaje_ocupacion = (
            round((espacios_ocupados / zone_capacity) * 100, 1)
            if zone_capacity
            else 0
        )

    result = {
        "id_analisis": analysis.id_analisis,
        "id_imagen": analysis.id_imagen,
        "vehiculos_detectados": analysis.vehiculos_detectados,
        "autos_detectados": autos_detectados,
        "motocicletas_detectadas": motocicletas_detectadas,
        "total_vehiculos": total_vehiculos,
        "espacios_libres": espacios_libres,
        "espacios_ocupados": espacios_ocupados,
        "porcentaje_ocupacion": porcentaje_ocupacion,
        "precision_modelo": analysis.precision_modelo,
        "confidence_mean": analysis.precision_modelo,
        "quality_metric": (
            "mean_detection_confidence"
            if analysis_mode == "yolo"
            else "simulated_value"
        ),
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
    db = object_session(analysis)
    pair = load_pair(db, analysis.id_imagen) if db is not None and result["zone_code"] == "B" else None
    saved_calibration = load_calibration(db, analysis.id_imagen) if db is not None else None
    calibration = saved_calibration
    mapping_source = "manual_calibration" if saved_calibration else None
    if analysis_mode == "yolo" and image and result["zone_code"]:
        try:
            with Image.open(resolve_stored_image_path(image.ruta_archivo)) as source:
                default_calibration = (
                    get_zone_b_upper_calibration(*source.size)
                    if pair else get_default_calibration(result["zone_code"], *source.size)
                )
            if default_calibration:
                calibration = (
                    merge_calibrations(default_calibration, saved_calibration)
                    if saved_calibration
                    and saved_calibration["zone_code"] == result["zone_code"]
                    else default_calibration
                )
                mapping_source = calibration["source"]
        except (OSError, ValueError):
            # A missing/corrupt original must not make analysis endpoints fail.
            calibration = saved_calibration
    if calibration and analysis_mode == "yolo" and calibration["zone_code"] == result["zone_code"]:
        # Old aggregate-only records cannot establish empty individual spaces.
        if len(vehicles) == (analysis.vehiculos_detectados or 0):
            result["slot_mapping"] = assign_detections(calibration, result["detections"])
            result["slot_mapping"]["source"] = mapping_source
    if pair:
        result["image_count"] = 2
        result["paired_image_id"] = pair["lower_image_id"]
        lower = db.get(ImagenCapturada, pair["lower_image_id"])
        if analysis_mode == "yolo" and lower and lower.analisis and lower.analisis.estado == "completado_yolo":
            _apply_zone_b_pair(result, serialize_analysis(lower.analisis), lower, db)
    return result


def _detections_in_spaces(calibration: dict, detections: list[dict]) -> dict[str, dict]:
    """Only vehicles centered in exactly one slot contribute to pair totals."""
    width, height = calibration["image_width"], calibration["image_height"]
    contours = {
        item["code"]: np.asarray(item["polygon"], dtype=np.float32)
        for item in calibration["spaces"]
    }
    selected = {}
    for detection in detections:
        x1, y1, x2, y2 = detection["bbox"]
        center = ((x1 + x2) / (2 * width), (y1 + y2) / (2 * height))
        matches = [code for code, polygon in contours.items()
                   if cv2.pointPolygonTest(polygon, center, False) > 0]
        if len(matches) == 1:
            code = matches[0]
            if code not in selected or detection["confidence"] > selected[code]["confidence"]:
                selected[code] = detection
    return selected


def _apply_zone_b_pair(result: dict, lower_result: dict, lower_image: ImagenCapturada, db: Session) -> None:
    if lower_result.get("slot_mapping") is None:
        return
    image = result["image_url"]
    try:
        with Image.open(resolve_stored_image_path(image)) as source:
            upper_calibration = get_zone_b_upper_calibration(*source.size)
        saved_upper = load_calibration(db, result["id_imagen"]) if db is not None else None
        if saved_upper and saved_upper.get("zone_code") == "B":
            upper_calibration = merge_calibrations(upper_calibration, saved_upper)
        with Image.open(resolve_stored_image_path(lower_image.ruta_archivo)) as source:
            lower_calibration = get_default_calibration("B", *source.size)
        saved_lower = load_calibration(db, lower_image.id_imagen) if db is not None else None
        if saved_lower and saved_lower.get("zone_code") == "B":
            lower_calibration = merge_calibrations(lower_calibration, saved_lower)
    except (OSError, ValueError):
        return
    lower_mapping = lower_result["slot_mapping"]
    upper_mapping = assign_detections(upper_calibration, result["detections"])
    by_code = {item["code"]: item for item in lower_mapping["spaces"]}
    by_code.update({item["code"]: item for item in upper_mapping["spaces"]})
    spaces = list(by_code.values())
    capacity = get_zone_capacity("B") or 73
    if len({item["code"] for item in spaces}) != capacity:
        return
    selected = {
        **_detections_in_spaces(lower_calibration, lower_result["detections"]),
        **_detections_in_spaces(upper_calibration, result["detections"]),
    }
    selected = {code: detection for code, detection in selected.items()
                if by_code[code]["status"] == "occupied"}
    occupied = sum(item["status"] == "occupied" for item in spaces)
    free = sum(item["status"] == "free" for item in spaces)
    unknown = capacity - occupied - free
    result["slot_mapping"] = {
        "spaces": spaces,
        "calibrated_spaces": capacity,
        "location_assignment_available": True,
        "coverage_complete": unknown == 0,
        "unmatched_detections": lower_mapping["unmatched_detections"],
        "unknown_spaces": unknown,
        "free_spaces": free,
        "occupied_spaces": occupied,
        "source": "zone_b_photo_pair",
    }
    result["detections"] = list(selected.values())
    result["vehiculos_detectados"] = occupied
    result["autos_detectados"] = sum(d["label"] == "car" for d in selected.values())
    result["motocicletas_detectadas"] = sum(d["label"] == "motorcycle" for d in selected.values())
    result["total_vehiculos"] = occupied
    result["espacios_ocupados"] = occupied
    result["espacios_libres"] = free
    result["porcentaje_ocupacion"] = round(occupied / capacity * 100, 1)
    result["precision_modelo"] = (
        round(sum(d["confidence"] for d in selected.values()) / len(selected) * 100, 1)
        if selected else 0
    )
    result["confidence_mean"] = result["precision_modelo"]
    colors = {}
    for detection in selected.values():
        color = detection.get("color") or "Otro"
        colors[color] = colors.get(color, 0) + 1
    result["color_distribution"] = [
        {"color": color, "cantidad": count}
        for color, count in sorted(colors.items(), key=lambda item: item[1], reverse=True)
    ]
    result["vehicle_type_distribution"] = [
        {"tipo": label, "cantidad": count}
        for label, count in (("car", result["autos_detectados"]),
                             ("motorcycle", result["motocicletas_detectadas"])) if count
    ]


def _get_analysis_vehicles(analysis: AnalisisImagen) -> list[VehiculoDetectado]:
    try:
        return list(analysis.vehiculos)
    except OperationalError as exc:
        if "no such table: vehiculo_detectado" not in str(exc).lower():
            raise
        return []


def _build_analysis_values(
    image: ImagenCapturada,
    force_mock: bool = False,
    source_path=None,
) -> dict:
    if not force_mock:
        try:
            zone_metadata = get_image_zone(image)
            detection_result = detect_vehicles_with_yolo(
                source_path or resolve_stored_image_path(image.ruta_archivo),
                zone_metadata.get("zone_code") if zone_metadata else None,
            )
            zone_capacity = get_zone_capacity(
                zone_metadata.get("zone_code") if zone_metadata else None
            )
            if zone_capacity:
                occupied_spaces = min(
                    detection_result["vehiculos_detectados"],
                    zone_capacity,
                )
                detection_result["espacios_ocupados"] = occupied_spaces
                detection_result["espacios_libres"] = max(
                    zone_capacity - occupied_spaces,
                    0,
                )
                detection_result["porcentaje_ocupacion"] = round(
                    (occupied_spaces / zone_capacity) * 100,
                    1,
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
        except DetectionUnavailableError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"El modelo YOLO no está disponible: {exc}",
            ) from exc

    if not mock_analysis_enabled():
        raise HTTPException(
            status_code=403,
            detail="El análisis simulado está deshabilitado.",
        )
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

def ensure_analysis_for_image(
    db: Session,
    image: ImagenCapturada,
    *,
    force_mock: bool = False,
    source_path=None,
) -> AnalisisImagen:
    values = _build_analysis_values(
        image,
        force_mock=force_mock,
        source_path=source_path,
    )
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
    _mark_stale_pending_analyses(db)
    images = db.query(ImagenCapturada).order_by(ImagenCapturada.id_imagen.desc()).all()
    return [serialize_analysis(image.analisis) for image in images
            if image.analisis and not is_pair_member(db, image.id_imagen)]


def get_latest_analysis(db: Session) -> dict:
    _mark_stale_pending_analyses(db)
    analysis = (
        db.query(AnalisisImagen)
        .join(ImagenCapturada)
        .order_by(ImagenCapturada.id_imagen.desc())
        .first()
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="No hay análisis registrados.")

    return serialize_analysis(analysis)


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
