import json
import os
from pathlib import Path

from app.models.analisis import AnalisisImagen


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MAP_PATH = PROJECT_ROOT / "ai-model" / "config" / "parking_spaces.json"


def get_parking_map_path() -> Path:
    configured_path = os.getenv("PARKING_SPACES_MAP_PATH")
    if configured_path:
        return Path(configured_path).expanduser()
    return DEFAULT_MAP_PATH


def load_parking_map() -> dict | None:
    map_path = get_parking_map_path()
    if not map_path.exists():
        return None

    with map_path.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    spaces = payload.get("spaces", [])
    if not isinstance(spaces, list) or not spaces:
        return None

    return payload


def point_in_polygon(point: tuple[float, float], polygon: list[list[float]]) -> bool:
    x, y = point
    inside = False
    total_points = len(polygon)

    if total_points < 3:
        return False

    previous_x, previous_y = polygon[-1]

    for current_x, current_y in polygon:
        crosses_y = (current_y > y) != (previous_y > y)
        if crosses_y:
            slope_x = (previous_x - current_x) * (y - current_y) / (
                previous_y - current_y
            ) + current_x
            if x < slope_x:
                inside = not inside

        previous_x, previous_y = current_x, current_y

    return inside


def bbox_center(bbox: list[int]) -> tuple[float, float]:
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2, (y1 + y2) / 2)


def build_polygon_space_status(analysis: AnalisisImagen, parking_map: dict) -> dict:
    detections = [
        {
            "id_vehiculo": vehicle.id_vehiculo,
            "center": bbox_center([vehicle.x1, vehicle.y1, vehicle.x2, vehicle.y2]),
        }
        for vehicle in analysis.vehiculos
    ]

    spaces = []
    occupied_count = 0

    for index, space in enumerate(parking_map.get("spaces", []), start=1):
        polygon = space.get("polygon", [])
        matching_vehicle = next(
            (
                detection
                for detection in detections
                if point_in_polygon(detection["center"], polygon)
            ),
            None,
        )
        occupied = matching_vehicle is not None
        if occupied:
            occupied_count += 1

        spaces.append(
            {
                "id": index,
                "code": space.get("code") or f"E-{index:03d}",
                "occupied": occupied,
                "source": "polygon_map",
                "polygon": polygon,
                "id_vehiculo": (
                    matching_vehicle["id_vehiculo"] if matching_vehicle else None
                ),
            }
        )

    total_spaces = len(spaces)
    free_spaces = max(total_spaces - occupied_count, 0)
    occupancy_percentage = (
        round((occupied_count / total_spaces) * 100, 1) if total_spaces else 0
    )

    return {
        "source": "polygon_map",
        "map_name": parking_map.get("name"),
        "map_image": parking_map.get("image"),
        "total_spaces": total_spaces,
        "occupied_spaces": occupied_count,
        "free_spaces": free_spaces,
        "occupancy_percentage": occupancy_percentage,
        "spaces": spaces,
    }
