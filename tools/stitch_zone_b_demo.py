"""Create the Zone B overview and its matching 73-space calibration."""

import json
from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "datasets" / "raw" / "zona_b"
OUTPUT = ROOT / "datasets" / "demo" / "zona_b_vista_completa.jpg"
CALIBRATION = ROOT / "ai-model" / "config" / "zone_b_stitched_spaces.json"
SCALE = 0.3


def build_calibration(homography: np.ndarray, width: int, height: int) -> dict:
    lower = json.loads((ROOT / "ai-model/config/parking_spaces.json").read_text())
    upper = json.loads((ROOT / "ai-model/config/zone_b_upper_spaces.json").read_text())
    spaces = {}
    for item in lower["spaces"]:
        number = int(item["code"].split("-")[1])
        number = number + 13 if number <= 25 else number + 21 if number <= 47 else number - 46
        polygon = np.float32(item["polygon"])[None, :, :]
        transformed = cv2.perspectiveTransform(polygon, homography)[0]
        center = transformed.mean(axis=0)
        transformed = center + (transformed - center) * 0.97
        spaces[f"B-{number:03d}"] = transformed.tolist()

    # The upper photo owns B-047 in the overlap, as in the paired-image flow.
    for item in upper["spaces"]:
        x, y = item["center"]
        dx, dy = item["half_size"]
        spaces[item["code"]] = [
            [x - dx, y - dy], [x + dx, y - dy],
            [x + dx, y + dy], [x - dx, y + dy],
        ]

    if set(spaces) != {f"B-{number:03d}" for number in range(1, 74)}:
        raise RuntimeError("Stitched calibration does not cover all 73 spaces")
    return {
        "image_width": width,
        "image_height": height,
        "spaces": [
            {
                "code": code,
                "polygon": [
                    [round(float(x) - 1150, 2), round(float(y), 2)]
                    for x, y in spaces[code]
                ],
            }
            for code in sorted(spaces)
        ],
    }


def main() -> None:
    lower = cv2.imread(str(RAW / "DJI_20260312135933_0012_D.JPG"))
    upper = cv2.imread(str(RAW / "DJI_20260312135940_0014_D.JPG"))
    if lower is None or upper is None:
        raise FileNotFoundError("Missing one or both original Zone B photos")

    lower_small = cv2.resize(lower, None, fx=SCALE, fy=SCALE)
    upper_small = cv2.resize(upper, None, fx=SCALE, fy=SCALE)
    sift = cv2.SIFT_create()
    upper_points, upper_descriptors = sift.detectAndCompute(
        cv2.cvtColor(upper_small, cv2.COLOR_BGR2GRAY), None
    )
    lower_points, lower_descriptors = sift.detectAndCompute(
        cv2.cvtColor(lower_small, cv2.COLOR_BGR2GRAY), None
    )
    matches = cv2.BFMatcher().knnMatch(lower_descriptors, upper_descriptors, k=2)
    good = [first for first, second in matches if first.distance < 0.7 * second.distance]
    source = np.float32([lower_points[match.queryIdx].pt for match in good])
    target = np.float32([upper_points[match.trainIdx].pt for match in good])
    homography, inliers = cv2.findHomography(source, target, cv2.RANSAC, 4)
    if homography is None or int(inliers.sum()) < 50:
        raise RuntimeError("Zone B photos could not be aligned reliably")

    scale_matrix = np.diag([SCALE, SCALE, 1.0])
    homography = np.linalg.inv(scale_matrix) @ homography @ scale_matrix
    canvas_size = (upper.shape[1] + 400, 6200)

    # Determine the seam on a smaller canvas, then apply it at full resolution.
    small_size = tuple(int(round(d * SCALE)) for d in canvas_size)
    warped_small = cv2.warpPerspective(lower_small, scale_matrix @ homography @ np.linalg.inv(scale_matrix), small_size)
    lower_mask = cv2.warpPerspective(
        np.full(lower_small.shape[:2], 255, np.uint8),
        scale_matrix @ homography @ np.linalg.inv(scale_matrix),
        small_size,
        flags=cv2.INTER_NEAREST,
    )
    upper_canvas_small = np.zeros_like(warped_small)
    upper_canvas_small[: upper_small.shape[0], : upper_small.shape[1]] = upper_small
    upper_mask = np.zeros(lower_mask.shape, np.uint8)
    upper_mask[: upper_small.shape[0], : upper_small.shape[1]] = 255

    masks = [upper_mask.copy(), lower_mask.copy()]
    seam_finder = cv2.detail_GraphCutSeamFinder("COST_COLOR_GRAD")
    seam_finder.find(
        [upper_canvas_small.astype(np.float32), warped_small.astype(np.float32)],
        [(0, 0), (0, 0)],
        masks,
    )
    lower_seam = cv2.resize(masks[1], canvas_size, interpolation=cv2.INTER_NEAREST) > 0

    warped = cv2.warpPerspective(lower, homography, canvas_size)
    canvas = np.zeros_like(warped)
    canvas[: upper.shape[0], : upper.shape[1]] = upper
    canvas[lower_seam] = warped[lower_seam]

    # Keep the parking area and all rows while trimming unrelated surroundings.
    canvas = canvas[:, 1150:4250]
    last_content_row = np.flatnonzero(np.any(canvas != 0, axis=(1, 2)))[-1] + 1
    canvas = canvas[:last_content_row]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(OUTPUT), canvas, [cv2.IMWRITE_JPEG_QUALITY, 92]):
        raise RuntimeError(f"Could not save {OUTPUT}")
    calibration = build_calibration(homography, canvas.shape[1], canvas.shape[0])
    CALIBRATION.write_text(json.dumps(calibration, indent=2) + "\n")
    print(f"{OUTPUT} ({canvas.shape[1]}x{canvas.shape[0]}, {OUTPUT.stat().st_size / 1e6:.1f} MB)")
    print(f"{CALIBRATION} ({len(calibration['spaces'])} spaces)")
    print(f"Alignment: {int(inliers.sum())}/{len(good)} inlier matches")


if __name__ == "__main__":
    main()
