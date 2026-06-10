import argparse
from pathlib import Path


LOCAL_CLASS_IDS = {
    "car": 0,
    "motorcycle": 1,
    "bus": 2,
    "truck": 3,
}


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def yolo_line(class_id, xywhn):
    x_center, y_center, width, height = xywhn
    return (
        f"{class_id} "
        f"{x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"
    )


def auto_label_split(model, images_dir, labels_dir, conf, imgsz):
    labels_dir.mkdir(parents=True, exist_ok=True)
    image_paths = sorted(
        path for path in images_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )

    split_summary = []

    for image_path in image_paths:
        results = model.predict(
            source=str(image_path),
            conf=conf,
            imgsz=imgsz,
            verbose=False,
        )
        result = results[0]
        lines = []

        for box in result.boxes:
            coco_name = result.names[int(box.cls.item())]
            if coco_name not in LOCAL_CLASS_IDS:
                continue

            class_id = LOCAL_CLASS_IDS[coco_name]
            normalized_bbox = box.xywhn[0].tolist()
            lines.append(yolo_line(class_id, normalized_bbox))

        label_path = labels_dir / f"{image_path.stem}.txt"
        label_path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
        split_summary.append((image_path.name, label_path.name, len(lines)))

    return split_summary


def main():
    parser = argparse.ArgumentParser(
        description="Genera labels YOLO iniciales usando un modelo COCO preentrenado."
    )
    parser.add_argument(
        "--dataset",
        default="datasets/parking",
        help="Ruta al dataset con images/train e images/val.",
    )
    parser.add_argument(
        "--model",
        default="yolov8n.pt",
        help="Modelo preentrenado Ultralytics para auto-etiquetar.",
    )
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--imgsz", type=int, default=1280)
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except Exception as exc:
        raise SystemExit(
            "Ultralytics no está instalado. Ejecuta `pip install -r backend/requirements.txt`."
        ) from exc

    dataset_dir = Path(args.dataset)
    model = YOLO(args.model)
    summary = {}

    for split in ("train", "val"):
        summary[split] = auto_label_split(
            model=model,
            images_dir=dataset_dir / "images" / split,
            labels_dir=dataset_dir / "labels" / split,
            conf=args.conf,
            imgsz=args.imgsz,
        )

    for split, rows in summary.items():
        print(f"\n{split.upper()}")
        for image_name, label_name, count in rows:
            print(f"- {image_name} -> {label_name}: {count} objetos")

    print("\nListo. Revisa/corrige las etiquetas antes de entrenar.")


if __name__ == "__main__":
    main()
