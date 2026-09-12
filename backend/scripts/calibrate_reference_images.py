"""Bootstrap the two reviewed local references; never match by filename alone.

Run from backend: .venv/bin/python -m scripts.calibrate_reference_images
Add --apply to persist. Existing calibrations are retained.
"""

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

from app.config.database import SessionLocal
from app.models import ConfiguracionSistema, ImagenCapturada
from app.services.analysis_service import serialize_analysis
from app.services.detection_service import resolve_stored_image_path
from app.services.space_calibration_service import (
    assign_detections,
    get_default_calibration,
    load_calibration,
    save_calibration,
    validate_spaces,
)

ROOT = Path(__file__).resolve().parents[2]
REFERENCES = {
    "cf9fadf8bfed4466698d9166dbc56b1c621bb9a000afafa18a869050dbbb9a92": "A",
    "601766d93caa29bf2f5072d7e459418650794b2d3afe365c88ef2f58b974fa61": "B",
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--preview-dir", type=Path)
    args = parser.parse_args()
    with SessionLocal() as db:
        for image in db.query(ImagenCapturada).order_by(ImagenCapturada.id_imagen):
            if image.ruta_archivo.startswith("http"):
                continue
            path = resolve_stored_image_path(image.ruta_archivo)
            if not path.is_file():
                continue
            zone = REFERENCES.get(hashlib.sha256(path.read_bytes()).hexdigest())
            if zone is None:
                continue
            with Image.open(path) as photo:
                width, height = photo.size
            payload = get_default_calibration(zone, width, height)
            validate_spaces(zone, payload["spaces"])
            analysis = serialize_analysis(image.analisis) if image.analisis else {"detections": []}
            result = assign_detections(payload, analysis["detections"])
            print(json.dumps({"image_id": image.id_imagen, "zone": zone, "previous_zone": image.codigo_zona,
                              **{key: value for key, value in result.items() if key != "spaces"}}))
            if args.preview_dir:
                args.preview_dir.mkdir(parents=True, exist_ok=True)
                with Image.open(path) as photo:
                    photo = photo.convert("RGB")
                    photo.thumbnail((1500, 1500))
                    draw = ImageDraw.Draw(photo)
                    states = {s["code"]: s["status"] for s in result["spaces"]}
                    colors = {"occupied": "red", "free": "lime", "unknown": "yellow"}
                    for space in payload["spaces"]:
                        points = [(x * photo.width, y * photo.height) for x, y in space["polygon"]]
                        draw.polygon(points, outline=colors[states[space["code"]]], width=2)
                        draw.text(points[0], space["code"], fill="white", stroke_width=1, stroke_fill="black")
                    photo.save(args.preview_dir / f"calibration-{zone}-{image.id_imagen}.png")
            if args.apply and load_calibration(db, image.id_imagen) is None:
                backup_key = f"parking_calibration_original_zone:{image.id_imagen}"
                if db.get(ConfiguracionSistema, backup_key) is None:
                    db.add(ConfiguracionSistema(clave=backup_key, valor_json=json.dumps({
                        "zone_code": image.codigo_zona, "zone_title": image.titulo_zona,
                    })))
                save_calibration(db, image.id_imagen, payload)


if __name__ == "__main__":
    main()
