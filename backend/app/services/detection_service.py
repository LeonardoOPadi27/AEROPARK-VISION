import hashlib
import os
import gc
import shutil
from pathlib import Path
from tempfile import TemporaryDirectory
import urllib.request
from urllib.parse import urlparse

from PIL import Image


class DetectionUnavailableError(RuntimeError):
    pass


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = PROJECT_ROOT / "backend"
DEFAULT_WEIGHTS_PATH = PROJECT_ROOT / "ai-model" / "weights" / "best.pt"
ZONE_A_WEIGHTS_PATH = PROJECT_ROOT / "ai-model" / "weights" / "zone_a_best.pt"
DEFAULT_TOTAL_SPACES = int(os.getenv("TOTAL_PARKING_SPACES", "35"))
TRAINED_CLASS_NAMES = {"car", "motorcycle"}
DEFAULT_MAX_SOURCE_DIMENSION = 1600


def _get_inference_size() -> int:
    """Keep CPU inference within the response window used by the web service."""
    try:
        size = int(os.getenv("YOLO_INFERENCE_SIZE", "416"))
    except ValueError:
        return 416
    return min(max(size, 320), 1280)


def _get_max_source_dimension() -> int:
    try:
        dimension = int(
            os.getenv("YOLO_MAX_SOURCE_DIMENSION", str(DEFAULT_MAX_SOURCE_DIMENSION))
        )
    except ValueError:
        return DEFAULT_MAX_SOURCE_DIMENSION
    return min(max(dimension, 640), 2400)


def _prepare_image_for_inference(
    image_path: Path,
    destination_dir: Path,
) -> tuple[Path, float, float]:
    """Create a bounded JPEG copy so large drone frames do not exhaust RAM."""
    with Image.open(image_path) as source:
        original_width, original_height = source.size
        max_dimension = _get_max_source_dimension()
        source.draft("RGB", (max_dimension, max_dimension))
        prepared = source.convert("RGB")
        prepared.thumbnail(
            (max_dimension, max_dimension),
            Image.Resampling.LANCZOS,
        )
        prepared_path = destination_dir / "inference.jpg"
        prepared.save(prepared_path, format="JPEG", quality=90, optimize=True)

    scale_x = original_width / prepared.width
    scale_y = original_height / prepared.height
    return prepared_path, scale_x, scale_y


def _restore_detection_coordinates(
    detections: list[dict],
    scale_x: float,
    scale_y: float,
) -> list[dict]:
    restored = []
    for detection in detections:
        x1, y1, x2, y2 = detection["bbox"]
        item = detection.copy()
        item["bbox"] = [
            round(x1 * scale_x),
            round(y1 * scale_y),
            round(x2 * scale_x),
            round(y2 * scale_y),
        ]
        restored.append(item)
    return restored


def get_weights_path() -> Path:
    configured_path = os.getenv("YOLO_WEIGHTS_PATH")
    if configured_path:
        return Path(configured_path).expanduser()
    return DEFAULT_WEIGHTS_PATH


def ensure_weights_path() -> Path:
    weights_path = get_weights_path()
    if weights_path.exists():
        return weights_path

    weights_url = os.getenv("YOLO_WEIGHTS_URL", "").strip()
    if not weights_url:
        return weights_path

    weights_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = weights_path.with_suffix(weights_path.suffix + ".download")
    urllib.request.urlretrieve(weights_url, temporary_path)
    temporary_path.replace(weights_path)
    return weights_path


def resolve_stored_image_path(stored_url: str) -> Path:
    if stored_url.startswith(("http://", "https://")):
        cache_dir = BACKEND_ROOT / "uploads" / "cache"
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_name = hashlib.sha256(stored_url.encode("utf-8")).hexdigest()
        extension = Path(stored_url.split("?", 1)[0]).suffix.lower() or ".jpg"
        cached_path = cache_dir / f"{cache_name}{extension}"
        temporary_path = cached_path.with_suffix(f"{cached_path.suffix}.download")

        def cached_file_is_valid() -> bool:
            if not cached_path.exists() or cached_path.stat().st_size == 0:
                return False
            try:
                with Image.open(cached_path) as image:
                    image.verify()
                return True
            except (OSError, ValueError):
                return False

        if not cached_file_is_valid():
            cached_path.unlink(missing_ok=True)
            temporary_path.unlink(missing_ok=True)
            try:
                request = urllib.request.Request(
                    stored_url,
                    headers={"User-Agent": "Mozilla/5.0 AeroParkVision/1.0"},
                )
                with urllib.request.urlopen(request, timeout=45) as response:
                    with temporary_path.open("wb") as file_handle:
                        shutil.copyfileobj(response, file_handle, length=1024 * 1024)
            except Exception:
                from app.services.storage_service import download_file, object_storage_enabled

                object_key = urlparse(stored_url).path.lstrip("/")
                if not object_storage_enabled() or not object_key:
                    raise
                download_file(object_key, temporary_path)
            temporary_path.replace(cached_path)
        return cached_path

    normalized = stored_url.lstrip("/")
    if normalized.startswith("uploads/"):
        return BACKEND_ROOT / normalized
    return BACKEND_ROOT / "uploads" / Path(normalized).name


def get_yolo_status() -> dict:
    try:
        weights_path = ensure_weights_path()
    except Exception as exc:
        return {
            "ready": False,
            "mode": "unavailable",
            "weights_path": str(get_weights_path()),
            "reason": f"No se pudo descargar el modelo YOLO: {exc}",
        }

    if not weights_path.exists():
        return {
            "ready": False,
            "mode": "unavailable",
            "weights_path": str(weights_path),
            "reason": "No se encontró el archivo de pesos YOLO.",
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


def detect_vehicles_with_yolo(image_path: Path, zone_code: str | None = None) -> dict:
    status = get_yolo_status()
    if not status["ready"]:
        raise DetectionUnavailableError(status["reason"])

    from ultralytics import YOLO

    model = None
    results = None
    try:
        with TemporaryDirectory(prefix="aeropark-yolo-") as temporary_directory:
            prepared_path, scale_x, scale_y = _prepare_image_for_inference(
                image_path,
                Path(temporary_directory),
            )
            detections: list[dict] = []
            confidences: list[float] = []
            normalized_zone = (zone_code or "").strip().upper()
            use_zone_a_model = normalized_zone == "A" and ZONE_A_WEIGHTS_PATH.exists()
            model = YOLO(str(ZONE_A_WEIGHTS_PATH if use_zone_a_model else get_weights_path()))

            if use_zone_a_model:
                # Fixed camera regions keep small motorcycles large without raising
                # the global inference size beyond the Render memory budget.
                with Image.open(prepared_path) as prepared:
                    width, height = prepared.size
                    regions = (
                        ("motorcycle", (0.065, 0.224, 0.230, 0.630), 0.45),
                        ("car", (0.322, 0.137, 0.860, 0.414), 0.25),
                        ("car", (0.223, 0.588, 0.921, 0.928), 0.25),
                    )
                    raw_detections = []
                    for index, (expected_label, box, minimum_confidence) in enumerate(regions):
                        left, top, right, bottom = (
                            round(box[0] * width), round(box[1] * height),
                            round(box[2] * width), round(box[3] * height),
                        )
                        crop_path = Path(temporary_directory) / f"zone-a-{index}.jpg"
                        prepared.crop((left, top, right, bottom)).save(crop_path, quality=90)
                        result = model.predict(source=str(crop_path), verbose=False, conf=0.01, imgsz=416)[0]
                        for detected in result.boxes:
                            label = str(result.names[int(detected.cls.item())]).lower()
                            confidence = float(detected.conf.item())
                            if label != expected_label or confidence < minimum_confidence:
                                continue
                            x1, y1, x2, y2 = [int(value) for value in detected.xyxy[0].tolist()]
                            raw_detections.append((label, confidence, [x1 + left, y1 + top, x2 + left, y2 + top]))
            else:
                result = model.predict(source=str(prepared_path), verbose=False, conf=0.25, imgsz=_get_inference_size())[0]
                raw_detections = [
                    (str(result.names[int(box.cls.item())]).lower(), float(box.conf.item()), [int(value) for value in box.xyxy[0].tolist()])
                    for box in result.boxes
                ]

            for label, confidence, bbox in raw_detections:
                if label not in TRAINED_CLASS_NAMES:
                    continue
                confidences.append(confidence)
                detections.append({"label": label, "confidence": round(confidence, 4), "bbox": bbox})

            detections = enrich_detections_with_colors(prepared_path, detections)
            detections = _restore_detection_coordinates(detections, scale_x, scale_y)
    finally:
        results = None
        model = None
        gc.collect()

    vehiculos_detectados = len(detections)
    total_spaces = max(DEFAULT_TOTAL_SPACES, vehiculos_detectados)
    espacios_ocupados = vehiculos_detectados
    espacios_libres = max(total_spaces - espacios_ocupados, 0)
    porcentaje_ocupacion = round((espacios_ocupados / total_spaces) * 100, 1) if total_spaces else 0
    precision_modelo = round((sum(confidences) / len(confidences)) * 100, 1) if confidences else 0
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
