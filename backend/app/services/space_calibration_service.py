"""Image-specific parking geometry, shared by the web and mobile summaries."""

import json
from datetime import datetime

import cv2
import numpy as np
from fastapi import HTTPException
from PIL import Image, ImageOps
from sqlalchemy.orm import Session

from app.models.configuracion_sistema import ConfiguracionSistema
from app.models.imagen import ImagenCapturada
from app.services.detection_service import resolve_stored_image_path
from app.services.image_zone_service import save_image_zone
from app.services.parking_zone_config import get_zone_capacity


def calibration_key(image_id: int) -> str:
    return f"parking_calibration:{image_id}"


def load_calibration(db: Session, image_id: int) -> dict | None:
    row = db.get(ConfiguracionSistema, calibration_key(image_id))
    return json.loads(row.valor_json) if row else None


def get_calibration_editor(db: Session, image_id: int) -> dict:
    image = db.get(ImagenCapturada, image_id)
    if image is None:
        raise HTTPException(404, "Imagen no encontrada.")
    try:
        with Image.open(resolve_stored_image_path(image.ruta_archivo)) as source:
            width, height = ImageOps.exif_transpose(source).size
    except (OSError, ValueError) as exc:
        raise HTTPException(422, "No se puede leer la imagen de referencia.") from exc
    return {
        "image_id": image_id,
        "image_url": image.ruta_archivo,
        "image_name": image.nombre_original,
        "zone_code": image.codigo_zona,
        "image_width": width,
        "image_height": height,
        "calibration": load_calibration(db, image_id),
        "detections": [
            {"bbox": [v.x1, v.y1, v.x2, v.y2], "label": v.clase}
            for v in image.analisis.vehiculos
        ] if image.analisis else [],
    }


def validate_spaces(zone_code: str, spaces: list[dict]) -> None:
    capacity = get_zone_capacity(zone_code)
    if capacity is None:
        raise HTTPException(422, "Zona invalida.")
    codes = set()
    contours = []
    for space in spaces:
        code = space["code"]
        if code not in {f"{zone_code}-{i:03d}" for i in range(1, capacity + 1)}:
            raise HTTPException(422, f"Codigo fuera de la zona: {code}.")
        if code in codes:
            raise HTTPException(422, f"Codigo duplicado: {code}.")
        codes.add(code)
        polygon = np.asarray(space["polygon"], dtype=np.float32)
        if (
            polygon.shape != (4, 2)
            or not np.isfinite(polygon).all()
            or (polygon < 0).any()
            or (polygon > 1).any()
            or not cv2.isContourConvex(polygon)
            or cv2.contourArea(polygon) < 0.000001
        ):
            raise HTTPException(422, f"{code}: se requieren cuatro esquinas ordenadas, sin cruces, dentro de la foto.")
        for other_code, other in contours:
            overlap, _ = cv2.intersectConvexConvex(polygon, other)
            if overlap > 0.01 * min(cv2.contourArea(polygon), cv2.contourArea(other)):
                raise HTTPException(422, f"Los espacios {code} y {other_code} se superponen.")
        contours.append((code, polygon))


def save_calibration(db: Session, image_id: int, payload: dict) -> dict:
    editor = get_calibration_editor(db, image_id)
    validate_spaces(payload["zone_code"], payload["spaces"])
    if (payload["image_width"], payload["image_height"]) != (
        editor["image_width"], editor["image_height"]
    ):
        raise HTTPException(422, "Las dimensiones no coinciden con la imagen.")
    calibration = {
        **payload,
        "image_id": image_id,
        "coordinate_system": "normalized",
        "updated_at": datetime.utcnow().isoformat(),
    }
    row = db.get(ConfiguracionSistema, calibration_key(image_id))
    if row is None:
        row = ConfiguracionSistema(clave=calibration_key(image_id))
        db.add(row)
    row.valor_json = json.dumps(calibration)
    save_image_zone(db.get(ImagenCapturada, image_id), payload["zone_code"])
    db.commit()
    return calibration


def assign_detections(calibration: dict, detections: list[dict]) -> dict:
    """Ambiguous border/overlap detections leave affected spaces unknown."""
    width, height = calibration["image_width"], calibration["image_height"]
    contours = {
        space["code"]: np.asarray(space["polygon"], dtype=np.float32)
        for space in calibration["spaces"]
    }
    occupied, uncertain = set(), set()
    unmatched = 0
    for detection in detections:
        x1, y1, x2, y2 = detection["bbox"]
        if x2 <= x1 or y2 <= y1:
            continue
        center = ((x1 + x2) / (2 * width), (y1 + y2) / (2 * height))
        box = np.asarray(
            [[x1 / width, y1 / height], [x2 / width, y1 / height],
             [x2 / width, y2 / height], [x1 / width, y2 / height]],
            dtype=np.float32,
        )
        inside = [code for code, contour in contours.items()
                  if cv2.pointPolygonTest(contour, center, False) > 0]
        touched = []
        for code, contour in contours.items():
            intersection, _ = cv2.intersectConvexConvex(contour, box)
            if intersection / min(cv2.contourArea(contour), cv2.contourArea(box)) >= 0.25:
                touched.append(code)
        if len(inside) == 1:
            occupied.add(inside[0])
            uncertain.update(code for code in touched if code != inside[0])
        else:
            uncertain.update(inside + touched)
            unmatched += 1
    spaces = [
        {"code": code, "status": "occupied" if code in occupied else
         "unknown" if code in uncertain else "free", "source": "polygon_map"}
        for code in contours
    ]
    capacity = get_zone_capacity(calibration["zone_code"])
    return {
        "spaces": spaces,
        "calibrated_spaces": len(contours),
        "location_assignment_available": bool(contours),
        "coverage_complete": len(contours) == capacity and not (uncertain - occupied),
        "unmatched_detections": unmatched,
        "unknown_spaces": capacity - sum(s["status"] != "unknown" for s in spaces),
        "free_spaces": sum(s["status"] == "free" for s in spaces),
        "occupied_spaces": len(occupied),
    }
