"""Create label-preserving high-resolution crops for aerial vehicles."""

import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps


VARIANTS = {
    "base": lambda image: image,
    "bright": lambda image: ImageEnhance.Brightness(image).enhance(1.14),
    "muted": lambda image: ImageEnhance.Color(image).enhance(0.76),
    "contrast": lambda image: ImageEnhance.Contrast(image).enhance(1.18),
    "flip": ImageOps.mirror,
}


def load_labels(label_path: Path) -> list[tuple[int, float, float, float, float]]:
    labels = []
    for line in label_path.read_text(encoding="utf-8").splitlines():
        class_id, center_x, center_y, width, height = line.split()
        labels.append((int(class_id), float(center_x), float(center_y), float(width), float(height)))
    return labels


def crop_labels(labels, image_width, image_height, crop):
    left, top, right, bottom = crop
    crop_width, crop_height = right - left, bottom - top
    output = []
    for class_id, center_x, center_y, width, height in labels:
        x1 = center_x * image_width - width * image_width / 2
        y1 = center_y * image_height - height * image_height / 2
        x2 = center_x * image_width + width * image_width / 2
        y2 = center_y * image_height + height * image_height / 2
        clipped_x1, clipped_y1 = max(x1, left), max(y1, top)
        clipped_x2, clipped_y2 = min(x2, right), min(y2, bottom)
        if clipped_x2 <= clipped_x1 or clipped_y2 <= clipped_y1:
            continue
        normalized_width = (clipped_x2 - clipped_x1) / crop_width
        normalized_height = (clipped_y2 - clipped_y1) / crop_height
        normalized_x = ((clipped_x1 + clipped_x2) / 2 - left) / crop_width
        normalized_y = ((clipped_y1 + clipped_y2) / 2 - top) / crop_height
        output.append((class_id, normalized_x, normalized_y, normalized_width, normalized_height))
    return output


def serialize_labels(labels, mirrored=False) -> str:
    rows = []
    for class_id, center_x, center_y, width, height in labels:
        if mirrored:
            center_x = 1 - center_x
        rows.append(f"{class_id} {center_x:.8f} {center_y:.8f} {width:.8f} {height:.8f}")
    return "\n".join(rows) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--label", type=Path, required=True)
    parser.add_argument("--output-images", type=Path, required=True)
    parser.add_argument("--output-labels", type=Path, required=True)
    parser.add_argument("--crop", type=int, nargs=4, metavar=("LEFT", "TOP", "RIGHT", "BOTTOM"), required=True)
    parser.add_argument("--prefix", default="vehicle-focus")
    args = parser.parse_args()

    args.output_images.mkdir(parents=True, exist_ok=True)
    args.output_labels.mkdir(parents=True, exist_ok=True)
    with Image.open(args.image) as source:
        image = source.convert("RGB")
    labels = crop_labels(load_labels(args.label), image.width, image.height, args.crop)
    if not labels:
        raise ValueError("El recorte no contiene vehiculos etiquetados.")
    crop = image.crop(args.crop)
    for suffix, transform in VARIANTS.items():
        output_image = args.output_images / f"{args.prefix}-{suffix}.jpg"
        output_label = args.output_labels / f"{args.prefix}-{suffix}.txt"
        if output_image.exists() or output_label.exists():
            raise FileExistsError(f"Ya existe la variante {suffix}.")
        transform(crop).save(output_image, quality=94)
        output_label.write_text(
            serialize_labels(labels, mirrored=suffix == "flip"), encoding="utf-8"
        )
    print(f"creadas {len(VARIANTS)} variantes con {len(labels)} objetos por variante")


if __name__ == "__main__":
    main()
