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
from app.services.space_calibration_service import assign_detections, load_calibration, save_calibration, validate_spaces

ROOT = Path(__file__).resolve().parents[2]
REFERENCES = {
    "cf9fadf8bfed4466698d9166dbc56b1c621bb9a000afafa18a869050dbbb9a92": "A",
    "601766d93caa29bf2f5072d7e459418650794b2d3afe365c88ef2f58b974fa61": "B",
}


def zone_a_spaces():
    spaces = []

    def row(start, count, side1_start, side1_end, side2_start, side2_end):
        def point(first, last, t):
            return [first[0] + (last[0] - first[0]) * t, first[1] + (last[1] - first[1]) * t]
        for index in range(count):
            # A small inset keeps painted separators out of adjacent polygons.
            t0, t1 = (index + .025) / count, (index + .975) / count
            polygon = [point(side1_start, side1_end, t0), point(side2_start, side2_end, t0),
                       point(side2_start, side2_end, t1), point(side1_start, side1_end, t1)]
            spaces.append({"code": f"A-{start + index:03d}", "polygon": [[x / 1303, y / 1207] for x, y in polygon]})

    # Same code order as the physical plan: two motorcycle columns, then cars.
    row(1, 9, (112, 735), (175, 481), (174, 752), (235, 498))
    row(10, 5, (191, 400), (221, 277), (256, 418), (285, 295))
    row(15, 9, (324, 757), (386, 510), (388, 775), (450, 528))
    row(24, 6, (337, 477), (377, 309), (402, 495), (441, 327))
    row(30, 9, (468, 193), (1089, 350), (436, 315), (1057, 473))
    row(39, 8, (310, 963), (1135, 772), (397, 1077), (1177, 889))
    return spaces


def zone_b_spaces():
    original = json.loads((ROOT / "ai-model/config/parking_spaces.json").read_text())
    spaces = []
    for item in original["spaces"]:
        number = int(item["code"].split("-")[1])
        # The reference shows the southern portion, ending at the curved curb.
        # Visible tails of the 28-space middle and 30-space outer rows, plus
        # nine of the ten longitudinal spaces; the east end is out of frame.
        code_number = number + 13 if number <= 25 else number + 21 if number <= 47 else number - 46
        polygon = item["polygon"]
        cx = sum(p[0] for p in polygon) / 4
        cy = sum(p[1] for p in polygon) / 4
        spaces.append({"code": f"B-{code_number:03d}", "polygon": [
            [(cx + (x - cx) * .97) / 5280, (cy + (y - cy) * .97) / 3956] for x, y in polygon
        ]})
    return spaces


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
            payload = {"zone_code": zone, "image_width": width, "image_height": height,
                       "spaces": zone_a_spaces() if zone == "A" else zone_b_spaces()}
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
