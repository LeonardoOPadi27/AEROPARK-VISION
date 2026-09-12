"""Convert YOLO segmentation labels into bounding boxes for vehicle detection.

The source dataset may contain regular detection rows (five values) or polygon
rows (class followed by normalized x/y points). The generated dataset preserves
the image split and writes only standard YOLO detection labels.
"""

import argparse
import shutil
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def to_detection_row(raw_line: str) -> str | None:
    values = raw_line.split()
    if len(values) == 5:
        return " ".join(values)
    if len(values) < 7 or len(values[1:]) % 2:
        return None

    class_id = values[0]
    coordinates = [float(value) for value in values[1:]]
    x_values = coordinates[::2]
    y_values = coordinates[1::2]
    x_min, x_max = max(0.0, min(x_values)), min(1.0, max(x_values))
    y_min, y_max = max(0.0, min(y_values)), min(1.0, max(y_values))
    width, height = x_max - x_min, y_max - y_min
    if width <= 0 or height <= 0:
        return None
    return f"{class_id} {(x_min + x_max) / 2:.8f} {(y_min + y_max) / 2:.8f} {width:.8f} {height:.8f}"


def convert_split(
    source: Path,
    destination: Path,
    source_split: str,
    destination_split: str,
) -> tuple[int, int]:
    image_dir = source / source_split / "images"
    label_dir = source / source_split / "labels"
    output_images = destination / "images" / destination_split
    output_labels = destination / "labels" / destination_split
    output_images.mkdir(parents=True, exist_ok=True)
    output_labels.mkdir(parents=True, exist_ok=True)

    images, boxes = 0, 0
    for image_path in sorted(image_dir.iterdir()):
        if not image_path.is_file() or image_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        label_path = label_dir / f"{image_path.stem}.txt"
        if not label_path.exists():
            raise FileNotFoundError(f"Falta etiqueta para {image_path.name}")
        converted = [
            row
            for line in label_path.read_text(encoding="utf-8").splitlines()
            if (row := to_detection_row(line))
        ]
        shutil.copy2(image_path, output_images / image_path.name)
        (output_labels / f"{image_path.stem}.txt").write_text(
            "\n".join(converted) + ("\n" if converted else ""),
            encoding="utf-8",
        )
        images += 1
        boxes += len(converted)
    return images, boxes


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    args = parser.parse_args()

    if args.destination.exists():
        raise FileExistsError(f"El destino ya existe: {args.destination}")
    train_images, train_boxes = convert_split(
        args.source, args.destination, "train", "train"
    )
    val_images, val_boxes = convert_split(
        args.source, args.destination, "test", "val"
    )
    (args.destination / "data.yaml").write_text(
        "path: " + str(args.destination.resolve()) + "\n"
        "train: images/train\n"
        "val: images/val\n\n"
        "names:\n  0: car\n  1: motorcycle\n",
        encoding="utf-8",
    )
    print(f"train: {train_images} images, {train_boxes} boxes")
    print(f"val: {val_images} images, {val_boxes} boxes")


if __name__ == "__main__":
    main()
