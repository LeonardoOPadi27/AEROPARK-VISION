import argparse
from pathlib import Path

import cv2


CLASS_NAMES = {
    0: "car",
    1: "motorcycle",
    2: "bus",
    3: "truck",
}

COLORS = {
    0: (80, 255, 80),
    1: (255, 180, 80),
    2: (80, 180, 255),
    3: (255, 80, 80),
}


def draw_label_file(image_path, label_path, output_path):
    image = cv2.imread(str(image_path))
    if image is None:
        return False

    height, width = image.shape[:2]

    if label_path.exists():
        for line in label_path.read_text(encoding="utf-8").splitlines():
            parts = line.strip().split()
            if len(parts) != 5:
                continue

            class_id = int(float(parts[0]))
            x_center, y_center, box_width, box_height = map(float, parts[1:])

            x1 = int((x_center - box_width / 2) * width)
            y1 = int((y_center - box_height / 2) * height)
            x2 = int((x_center + box_width / 2) * width)
            y2 = int((y_center + box_height / 2) * height)

            color = COLORS.get(class_id, (255, 255, 255))
            label = CLASS_NAMES.get(class_id, str(class_id))
            cv2.rectangle(image, (x1, y1), (x2, y2), color, 3)
            cv2.putText(
                image,
                label,
                (x1, max(24, y1 - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                color,
                2,
                cv2.LINE_AA,
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), image)
    return True


def main():
    parser = argparse.ArgumentParser(description="Genera previews con cajas YOLO dibujadas.")
    parser.add_argument("--dataset", default="datasets/parking")
    parser.add_argument("--output", default="datasets/parking/previews")
    args = parser.parse_args()

    dataset_dir = Path(args.dataset)
    output_dir = Path(args.output)

    for split in ("train", "val"):
        image_dir = dataset_dir / "images" / split
        label_dir = dataset_dir / "labels" / split

        for image_path in sorted(image_dir.glob("*")):
            if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue

            label_path = label_dir / f"{image_path.stem}.txt"
            output_path = output_dir / split / image_path.name
            draw_label_file(image_path, label_path, output_path)
            print(f"{split}: {image_path.name} -> {output_path}")


if __name__ == "__main__":
    main()
