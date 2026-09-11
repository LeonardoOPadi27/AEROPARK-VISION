ZONE_LABELS = {
    "A": "Estacionamiento A",
    "B": "Estacionamiento B",
}


def normalize_zone_code(zone_code: str | None) -> str | None:
    if not zone_code:
        return None

    normalized = zone_code.strip().upper()
    return normalized if normalized in ZONE_LABELS else None


def save_image_zone(image, zone_code: str | None) -> None:
    normalized = normalize_zone_code(zone_code)
    if not normalized:
        return

    image.codigo_zona = normalized
    image.titulo_zona = ZONE_LABELS[normalized]


def get_image_zone(image) -> dict | None:
    image_id = getattr(image, "id_imagen", image)
    if image_id is None:
        return None

    zone_code = getattr(image, "codigo_zona", None)
    if zone_code:
        return {
            "zone_code": zone_code,
            "zone_title": getattr(image, "titulo_zona", None) or ZONE_LABELS.get(zone_code),
        }

    return None
