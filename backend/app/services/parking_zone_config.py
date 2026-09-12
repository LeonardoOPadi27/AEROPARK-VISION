ZONE_DEFINITIONS = [
    {
        "id": "A",
        "title": "Estacionamiento A",
        "subtitle": "Ingreso principal",
        "capacity": 45,
        "vehicle_capacity": 16,
        "motorcycle_capacity": 29,
    },
    {
        "id": "B",
        "title": "Estacionamiento B",
        "subtitle": "Zona pabellones",
        "capacity": 73,
        "vehicle_capacity": 73,
        "motorcycle_capacity": 0,
    },
]

ZONE_CAPACITY_BY_ID = {
    zone["id"]: zone["capacity"]
    for zone in ZONE_DEFINITIONS
}


def get_zone_capacity(zone_code: str | None) -> int | None:
    if not zone_code:
        return None

    return ZONE_CAPACITY_BY_ID.get(zone_code.strip().upper())
