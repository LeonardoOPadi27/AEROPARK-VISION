import argparse
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def parse_label_line(line: str, num_classes: int) -> tuple[bool, str]:
    parts = line.strip().split()
    if len(parts) != 5:
        return False, "formato invalido (se esperan 5 columnas)"

    try:
        class_id = int(float(parts[0]))
        x_center = float(parts[1])
        y_center = float(parts[2])
        width = float(parts[3])
        height = float(parts[4])
    except ValueError:
        return False, "valores no numericos"

    if class_id < 0 or class_id >= num_classes:
        return False, f"class_id fuera de rango: {class_id}"

    numeric_values = [x_center, y_center, width, height]
    if any(value < 0 or value > 1 for value in numeric_values):
        return False, "coordenadas fuera de [0,1]"

    if width <= 0 or height <= 0:
        return False, "ancho/alto deben ser mayores a 0"

    return True, ""


def validate_split(dataset_dir: Path, split: str, num_classes: int) -> dict:
    images_dir = dataset_dir / "images" / split
    labels_dir = dataset_dir / "labels" / split

    image_paths = sorted(
        path for path in images_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )

    errors = []
    empty_labels = []
    total_boxes = 0

    for image_path in image_paths:
        label_path = labels_dir / f"{image_path.stem}.txt"
        if not label_path.exists():
            errors.append(f"[{split}] falta label para {image_path.name}")
            continue

        content = label_path.read_text(encoding="utf-8").strip()
        if not content:
            empty_labels.append(label_path.name)
            continue

        line_count = 0
        for line_number, line in enumerate(content.splitlines(), start=1):
            is_ok, message = parse_label_line(line, num_classes)
            if not is_ok:
                errors.append(
                    f"[{split}] {label_path.name}:{line_number} -> {message}"
                )
                continue

            line_count += 1

        total_boxes += line_count

    return {
        "split": split,
        "images": len(image_paths),
        "boxes": total_boxes,
        "errors": errors,
        "empty_labels": empty_labels,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Valida consistencia de labels YOLO en un dataset local."
    )
    parser.add_argument("--dataset", default="datasets/parking")
    parser.add_argument("--num-classes", type=int, default=4)
    args = parser.parse_args()

    dataset_dir = Path(args.dataset)
    summaries = [
        validate_split(dataset_dir, "train", args.num_classes),
        validate_split(dataset_dir, "val", args.num_classes),
    ]

    has_errors = False
    for summary in summaries:
        print(f"\n[{summary['split']}]")
        print(f"imagenes: {summary['images']}")
        print(f"boxes validas: {summary['boxes']}")
        print(f"labels vacios: {len(summary['empty_labels'])}")

        if summary["empty_labels"]:
            print("archivos vacios:")
            for label_name in summary["empty_labels"]:
                print(f"- {label_name}")

        if summary["errors"]:
            has_errors = True
            print("errores:")
            for error in summary["errors"]:
                print(f"- {error}")

    if has_errors:
        raise SystemExit("\nValidacion finalizo con errores.")

    print("\nValidacion completada sin errores de formato.")


if __name__ == "__main__":
    main()
