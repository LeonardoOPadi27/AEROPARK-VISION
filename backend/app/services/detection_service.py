import os
from pathlib import Path


class DetectionUnavailableError(RuntimeError):
    pass


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = PROJECT_ROOT / "backend"
DEFAULT_WEIGHTS_PATH = PROJECT_ROOT / "ai-model" / "weights" / "best.pt"
DEFAULT_TOTAL_SPACES = int(os.getenv("TOTAL_PARKING_SPACES", "35"))
TRAINED_CLASS_NAMES = {"car", "motorcycle"}


def get_weights_path() -> Path:
    configured_path = os.getenv("YOLO_WEIGHTS_PATH")
    if configured_path:
        return Path(configured_path).expanduser()
    return DEFAULT_WEIGHTS_PATH


def resolve_stored_image_path(stored_url: str) -> Path:
    normalized = stored_url.lstrip("/")
    if normalized.startswith("uploads/"):
        return BACKEND_ROOT / normalized
    return BACKEND_ROOT / "uploads" / Path(normalized).name


def get_yolo_status() -> dict:
    weights_path = get_weights_path()

    if not weights_path.exists():
        return {
            "ready": False,
            "mode": "mock",
            "weights_path": str(weights_path),
            "reason": "No se encontró el archivo de pesos YOLO.",
        }

    try:
        from ultralytics import YOLO  # noqa: F401
        import cv2  # noqa: F401
        import numpy  # noqa: F401
    except Exception as exc:
        return {
            "ready": False,
            "mode": "mock",
            "weights_path": str(weights_path),
            "reason": f"Dependencias YOLO no disponibles: {exc}",
        }

    return {
        "ready": True,
        "mode": "yolo",
        "weights_path": str(weights_path),
        "reason": "YOLO listo para inferencia.",
    }


def _classify_color_from_hsv(hue: float, saturation: float, value: float) -> str:
    if value < 45:
        return "Negro"
    if saturation < 28:
        if value > 205:
            return "Blanco"
        if value > 135:
            return "Plateado"
        return "Gris"
    if saturation < 55 and value > 165:
        return "Plateado"
    if saturation < 85 and 90 <= hue < 135:
        if value > 155:
            return "Plateado"
        return "Gris"

    if hue < 8 or hue >= 172:
        return "Rojo"
    if hue < 18:
        return "Naranja"
    if hue < 32:
        return "Amarillo"
    if hue < 48:
        return "Verde claro"
    if hue < 82:
        return "Verde"
    if hue < 98:
        return "Cian"
    if hue < 128:
        return "Azul"
    if hue < 148:
        return "Morado"
    if hue < 172:
        return "Rosado"

    return "Otro"


def _classify_vehicle_color(crop) -> str:
    import cv2
    import numpy as np

    height, width = crop.shape[:2]
    if height < 4 or width < 4:
        return "Otro"

    y1 = int(height * 0.18)
    y2 = int(height * 0.82)
    x1 = int(width * 0.18)
    x2 = int(width * 0.82)
    central_crop = crop[y1:y2, x1:x2]
    if central_crop.size == 0:
        central_crop = crop

    max_side = 96
    crop_height, crop_width = central_crop.shape[:2]
    scale = min(max_side / max(crop_height, crop_width), 1)
    if scale < 1:
        central_crop = cv2.resize(
            central_crop,
            (max(1, int(crop_width * scale)), max(1, int(crop_height * scale))),
            interpolation=cv2.INTER_AREA,
        )

    hsv = cv2.cvtColor(central_crop, cv2.COLOR_BGR2HSV)
    hue = hsv[:, :, 0]
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]

    usable_mask = (value > 38) & (value < 248)
    if usable_mask.sum() < 20:
        usable_mask = value > 20

    lab = cv2.cvtColor(central_crop, cv2.COLOR_BGR2LAB)
    pixels = lab[usable_mask].reshape(-1, 3).astype("float32")
    if len(pixels) < 20:
        pixels = lab.reshape(-1, 3).astype("float32")

    cluster_count = min(4, max(1, len(pixels) // 18))
    if cluster_count == 1:
        center_lab = pixels.mean(axis=0)
        center_bgr = cv2.cvtColor(
            np.uint8([[center_lab]]), cv2.COLOR_LAB2BGR
        )[0][0]
        center_hsv = cv2.cvtColor(
            np.uint8([[center_bgr]]), cv2.COLOR_BGR2HSV
        )[0][0]
        return _classify_color_from_hsv(
            float(center_hsv[0]), float(center_hsv[1]), float(center_hsv[2])
        )

    criteria = (
        cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER,
        20,
        1.0,
    )
    _, labels, centers = cv2.kmeans(
        pixels,
        cluster_count,
        None,
        criteria,
        3,
        cv2.KMEANS_PP_CENTERS,
    )
    counts = np.bincount(labels.flatten(), minlength=cluster_count)
    centers_bgr = cv2.cvtColor(
        np.uint8([[center] for center in centers]), cv2.COLOR_LAB2BGR
    ).reshape(-1, 3)
    centers_hsv = cv2.cvtColor(
        np.uint8([[center] for center in centers_bgr]), cv2.COLOR_BGR2HSV
    ).reshape(-1, 3)

    candidates = []
    total = max(int(counts.sum()), 1)
    for index, center_hsv in enumerate(centers_hsv):
        h, s, v = [float(channel) for channel in center_hsv]
        coverage = float(counts[index]) / total
        color_name = _classify_color_from_hsv(h, s, v)

        if v < 42:
            score = coverage * 0.25
        elif color_name in {"Blanco", "Plateado", "Gris", "Negro"}:
            score = coverage * (1.25 if coverage >= 0.22 else 0.9)
        else:
            color_boost = min(s / 130, 1.0)
            score = coverage * (0.75 + color_boost)
            if coverage < 0.12:
                score *= 0.45
            if color_name in {"Azul", "Cian"} and s < 105:
                score *= 0.55
            if color_name in {"Morado", "Rosado"} and (coverage < 0.2 or s < 120):
                score *= 0.35

        candidates.append((score, coverage, color_name))

    candidates.sort(reverse=True)
    return candidates[0][2]


def enrich_detections_with_colors(image_path: Path, detections: list[dict]) -> list[dict]:
    try:
        import cv2
    except Exception:
        return detections

    image = cv2.imread(str(image_path))
    if image is None:
        return detections

    enriched = []

    for detection in detections:
        x1, y1, x2, y2 = detection["bbox"]
        crop = image[max(0, y1):max(0, y2), max(0, x1):max(0, x2)]
        item = detection.copy()
        if crop.size == 0:
            item["color"] = "Otro"
            enriched.append(item)
            continue

        item["color"] = _classify_vehicle_color(crop)
        enriched.append(item)

    return enriched


def _build_color_distribution(detections: list[dict]) -> list[dict]:
    counts: dict[str, int] = {}

    for detection in detections:
        color_name = detection.get("color") or "Otro"
        counts[color_name] = counts.get(color_name, 0) + 1

    return [
        {"color": color, "cantidad": amount}
        for color, amount in sorted(counts.items(), key=lambda item: item[1], reverse=True)
    ]


def detect_vehicles_with_yolo(image_path: Path) -> dict:
    status = get_yolo_status()
    if not status["ready"]:
        raise DetectionUnavailableError(status["reason"])

    from ultralytics import YOLO

    model = YOLO(str(get_weights_path()))
    results = model.predict(source=str(image_path), verbose=False, conf=0.25)
    result = results[0]

    detections: list[dict] = []
    confidences: list[float] = []
    names = result.names

    for box in result.boxes:
        class_id = int(box.cls.item())
        label = str(names[class_id]).lower()
        if label not in TRAINED_CLASS_NAMES:
            continue

        x1, y1, x2, y2 = [int(value) for value in box.xyxy[0].tolist()]
        confidence = float(box.conf.item())
        confidences.append(confidence)
        detections.append(
            {
                "label": label,
                "confidence": round(confidence, 4),
                "bbox": [x1, y1, x2, y2],
            }
        )

    vehiculos_detectados = len(detections)
    total_spaces = max(DEFAULT_TOTAL_SPACES, vehiculos_detectados)
    espacios_ocupados = vehiculos_detectados
    espacios_libres = max(total_spaces - espacios_ocupados, 0)
    porcentaje_ocupacion = round((espacios_ocupados / total_spaces) * 100, 1) if total_spaces else 0
    precision_modelo = round((sum(confidences) / len(confidences)) * 100, 1) if confidences else 0
    detections = enrich_detections_with_colors(image_path, detections)
    color_distribution = _build_color_distribution(detections)

    return {
        "mode": "yolo",
        "vehiculos_detectados": vehiculos_detectados,
        "espacios_libres": espacios_libres,
        "espacios_ocupados": espacios_ocupados,
        "porcentaje_ocupacion": porcentaje_ocupacion,
        "precision_modelo": precision_modelo,
        "color_distribution": color_distribution,
        "detections": detections,
    }
