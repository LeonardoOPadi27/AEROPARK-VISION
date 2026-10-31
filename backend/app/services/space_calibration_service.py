"""Image-specific parking geometry, shared by the web and mobile summaries."""

import json
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from fastapi import HTTPException
from PIL import Image
from sqlalchemy.orm import Session

from app.models.configuracion_sistema import ConfiguracionSistema
from app.models.imagen import ImagenCapturada
from app.services.detection_service import resolve_stored_image_path
from app.services.image_zone_service import save_image_zone
from app.services.parking_zone_config import get_zone_capacity


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _build_row(
    spaces: list[dict],
    zone_code: str,
    start: int,
    count: int,
    side1_start: tuple[float, float],
    side1_end: tuple[float, float],
    side2_start: tuple[float, float],
    side2_end: tuple[float, float],
    reference_width: int,
    reference_height: int,
) -> None:
    """Append inset quadrilaterals for a reviewed row of parking spaces."""
    def point(first, last, ratio):
        return [
            first[0] + (last[0] - first[0]) * ratio,
            first[1] + (last[1] - first[1]) * ratio,
        ]

    for index in range(count):
        start_ratio, end_ratio = (index + 0.01) / count, (index + 0.99) / count
        polygon = [
            point(side1_start, side1_end, start_ratio),
            point(side2_start, side2_end, start_ratio),
            point(side2_start, side2_end, end_ratio),
            point(side1_start, side1_end, end_ratio),
        ]
        spaces.append(
            {
                "code": f"{zone_code}-{start + index:03d}",
                "polygon": [
                    [x / reference_width, y / reference_height]
                    for x, y in polygon
                ],
            }
        )


def _default_zone_a_spaces() -> list[dict]:
    """Reviewed A template, shared automatically by drone images of zone A."""
    spaces: list[dict] = []
    width, height = 5280, 3956
    _build_row(spaces, "A", 1, 9, (1750, 2710), (1935, 2150), (1940, 2710), (2135, 2150), width, height)
    _build_row(spaces, "A", 10, 5, (1980, 2080), (1995, 1738), (2160, 2080), (2185, 1738), width, height)
    _build_row(spaces, "A", 15, 9, (2180, 2750), (2350, 2110), (2470, 2750), (2610, 2110), width, height)
    _build_row(spaces, "A", 24, 6, (2180, 2070), (2240, 1690), (2480, 2070), (2540, 1690), width, height)
    _build_row(spaces, "A", 30, 9, (2580, 1490), (3900, 1770), (2580, 1870), (3900, 2150), width, height)
    _build_row(spaces, "A", 39, 8, (2260, 3267), (3970, 2891), (2300, 3527), (4010, 3151), width, height)
    return spaces


def _default_zone_b_spaces() -> list[dict]:
    """Return the reviewed portion of B represented in the project parking map."""
    map_path = PROJECT_ROOT / "ai-model" / "config" / "parking_spaces.json"
    source = json.loads(map_path.read_text())
    spaces = []
    for item in source["spaces"]:
        number = int(item["code"].split("-")[1])
        code_number = number + 13 if number <= 25 else number + 21 if number <= 47 else number - 46
        polygon = item["polygon"]
        center_x = sum(point[0] for point in polygon) / 4
        center_y = sum(point[1] for point in polygon) / 4
        spaces.append(
            {
                "code": f"B-{code_number:03d}",
                "polygon": [
                    [
                        (center_x + (x - center_x) * 0.97) / 5280,
                        (center_y + (y - center_y) * 0.97) / 3956,
                    ]
                    for x, y in polygon
                ],
            }
        )
    return spaces


def _stitched_zone_b_spaces(image_width: int, image_height: int) -> list[dict] | None:
    source = json.loads(
        (PROJECT_ROOT / "ai-model/config/zone_b_stitched_spaces.json").read_text()
    )
    reference_ratio = source["image_width"] / source["image_height"]
    if abs(image_width / image_height - reference_ratio) > 0.005:
        return None
    return [
        {
            "code": item["code"],
            "polygon": [
                [x / source["image_width"], y / source["image_height"]]
                for x, y in item["polygon"]
            ],
        }
        for item in source["spaces"]
    ]


def get_zone_b_upper_calibration(image_width: int, image_height: int) -> dict:
    """Reviewed upper-camera slots; the remaining B slots use the lower photo."""
    source = json.loads(
        (PROJECT_ROOT / "ai-model" / "config" / "zone_b_upper_spaces.json").read_text()
    )
    spaces = []
    for item in source["spaces"]:
        x, y = item["center"]
        half_width, half_height = item["half_size"]
        polygon = [
            [x - half_width, y - half_height],
            [x + half_width, y - half_height],
            [x + half_width, y + half_height],
            [x - half_width, y + half_height],
        ]
        spaces.append({
            "code": item["code"],
            "polygon": [[px / source["image_width"], py / source["image_height"]]
                        for px, py in polygon],
        })
    return {
        "zone_code": "B",
        "image_width": image_width,
        "image_height": image_height,
        "spaces": spaces,
        "source": "zone_b_upper_template",
    }


def get_default_calibration(
    zone_code: str | None,
    image_width: int,
    image_height: int,
) -> dict | None:
    """Provide the reviewed fixed-camera template without requiring manual input.

    The coordinates are normalized, so the template scales to the uploaded drone
    frame. A saved image calibration always takes precedence over this baseline.
    """
    normalized_zone = (zone_code or "").strip().upper()
    if normalized_zone == "A":
        spaces = _default_zone_a_spaces()
    elif normalized_zone == "B":
        stitched = _stitched_zone_b_spaces(image_width, image_height)
        spaces = stitched if stitched is not None else _default_zone_b_spaces()
    else:
        return None

    return {
        "zone_code": normalized_zone,
        "image_width": image_width,
        "image_height": image_height,
        "spaces": spaces,
        "source": "zone_b_stitched_template" if normalized_zone == "B" and stitched is not None else "zone_template",
    }


def merge_calibrations(default: dict, saved: dict) -> dict:
    """Use saved polygons as precise overrides without losing template coverage."""
    zone_code = default["zone_code"]
    capacity = get_zone_capacity(zone_code) or 0
    allowed_codes = {f"{zone_code}-{index:03d}" for index in range(1, capacity + 1)}
    saved_by_code = {
        space["code"]: space
        for space in saved.get("spaces", [])
        if space.get("code") in allowed_codes
    }
    template_codes = {space["code"] for space in default["spaces"]}
    spaces = [
        saved_by_code.get(space["code"], space)
        for space in default["spaces"]
    ]
    spaces.extend(
        space
        for code, space in saved_by_code.items()
        if code not in template_codes
    )
    return {
        **default,
        "spaces": spaces,
        "source": "zone_template_adjusted",
    }


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
            # The detector uses the original pixel coordinate system, so opening
            # the header is sufficient and avoids decoding a large drone image.
            width, height = source.size
    except (OSError, ValueError) as exc:
        raise HTTPException(422, "No se puede leer la imagen de referencia.") from exc
    detections = [
        {"bbox": [v.x1, v.y1, v.x2, v.y2], "label": v.clase,
         "confidence": v.confianza or 0}
        for v in image.analisis.vehiculos
    ] if image.analisis else []
    default = get_default_calibration(image.codigo_zona, width, height)
    if default and default["source"] == "zone_b_stitched_template":
        saved = load_calibration(db, image_id)
        calibration = merge_calibrations(default, saved) if saved else default
        contours = {
            item["code"]: np.asarray(item["polygon"], dtype=np.float32)
            for item in calibration["spaces"]
        }
        by_space = {}
        for detection in detections:
            if detection["label"] != "car":
                continue
            x1, y1, x2, y2 = detection["bbox"]
            center = ((x1 + x2) / (2 * width), (y1 + y2) / (2 * height))
            matches = [code for code, contour in contours.items()
                       if cv2.pointPolygonTest(contour, center, False) > 0]
            if len(matches) == 1 and (
                matches[0] not in by_space
                or detection["confidence"] > by_space[matches[0]]["confidence"]
            ):
                by_space[matches[0]] = detection
        detections = list(by_space.values())
    return {
        "image_id": image_id,
        "image_url": image.ruta_archivo,
        "image_name": image.nombre_original,
        "zone_code": image.codigo_zona,
        "image_width": width,
        "image_height": height,
        "calibration": load_calibration(db, image_id),
        "detections": [
            {"bbox": item["bbox"], "label": item["label"]}
            for item in detections
        ],
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
