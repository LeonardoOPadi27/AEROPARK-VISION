#!/usr/bin/env python3
"""Small dependency-free stress test for AeroPark Vision API.

The default scenario only uses read endpoints, so it can be executed against a
development database without changing parking state.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import random
import statistics
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, wait
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


DEFAULT_ENDPOINTS = (
    ("/mobile/parking-overview", 8, False),
    ("/analysis", 5, False),
    ("/analysis/latest", 5, False),
    ("/reports/overview", 4, False),
    ("/vehicle-colors/summary", 3, False),
    ("/vehicle-colors/latest", 3, False),
    ("/parking-spaces/latest", 4, False),
    ("/images/latest", 2, False),
    ("/settings/overview", 1, True),
    ("/auth/me", 1, True),
)


@dataclass(frozen=True)
class Result:
    method: str
    endpoint: str
    status: int
    elapsed_ms: float
    ok: bool
    error: str = ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a lightweight stress test against the AeroPark Vision API.",
    )
    parser.add_argument("--host", default=os.getenv("API_HOST", "http://127.0.0.1:8000"))
    parser.add_argument("--users", type=int, default=20)
    parser.add_argument("--duration", type=int, default=30)
    parser.add_argument("--spawn-rate", type=float, default=5.0)
    parser.add_argument("--email", default=os.getenv("STRESS_EMAIL", "alexis@test.com"))
    parser.add_argument("--password", default=os.getenv("STRESS_PASSWORD", "123456"))
    parser.add_argument(
        "--csv",
        default="",
        help="Optional path to export raw request timings as CSV.",
    )
    parser.add_argument(
        "--no-auth",
        action="store_true",
        help="Skip login and do not call authenticated endpoints.",
    )
    return parser.parse_args()


def build_url(host: str, endpoint: str) -> str:
    return f"{host.rstrip('/')}{endpoint}"


def request_json(
    method: str,
    url: str,
    payload: dict | None = None,
    token: str | None = None,
    timeout: float = 10.0,
) -> tuple[int, str]:
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return exc.code, body


def login(host: str, email: str, password: str) -> str | None:
    status, body = request_json(
        "POST",
        build_url(host, "/auth/login"),
        {"correo": email, "contrasena": password},
    )
    if status != 200:
        print(f"No se pudo iniciar sesion para endpoints protegidos ({status}).")
        print(body[:240])
        return None

    try:
        return json.loads(body).get("access_token")
    except json.JSONDecodeError:
        return None


def weighted_endpoint_pool(include_auth: bool) -> list[tuple[str, bool]]:
    pool: list[tuple[str, bool]] = []
    for endpoint, weight, requires_auth in DEFAULT_ENDPOINTS:
        if requires_auth and not include_auth:
            continue
        pool.extend([(endpoint, requires_auth)] * weight)
    return pool


def run_single_request(host: str, endpoint: str, requires_auth: bool, token: str | None) -> Result:
    started = time.perf_counter()
    try:
        status, body = request_json(
            "GET",
            build_url(host, endpoint),
            token=token if requires_auth else None,
        )
        elapsed_ms = (time.perf_counter() - started) * 1000
        ok = 200 <= status < 400
        error = "" if ok else body[:180].replace("\n", " ")
        return Result("GET", endpoint, status, elapsed_ms, ok, error)
    except Exception as exc:  # noqa: BLE001 - report any transport failure in summary.
        elapsed_ms = (time.perf_counter() - started) * 1000
        return Result("GET", endpoint, 0, elapsed_ms, False, str(exc))


def worker(
    user_id: int,
    host: str,
    token: str | None,
    endpoints: list[tuple[str, bool]],
    stop_at: float,
    results: list[Result],
    lock: threading.Lock,
) -> None:
    random.seed(user_id + int(time.time()))
    while time.perf_counter() < stop_at:
        endpoint, requires_auth = random.choice(endpoints)
        result = run_single_request(host, endpoint, requires_auth, token)
        with lock:
            results.append(result)
        time.sleep(random.uniform(0.05, 0.25))


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round((pct / 100) * (len(ordered) - 1))))
    return ordered[index]


def summarize(results: Iterable[Result], duration: int) -> None:
    rows = list(results)
    ok_rows = [row for row in rows if row.ok]
    timings = [row.elapsed_ms for row in rows]
    ok_timings = [row.elapsed_ms for row in ok_rows]
    failures = [row for row in rows if not row.ok]

    print("\n=== Resumen general ===")
    print(f"Requests totales: {len(rows)}")
    print(f"Requests exitosos: {len(ok_rows)}")
    print(f"Errores: {len(failures)}")
    print(f"Requests/seg aprox.: {len(rows) / max(duration, 1):.2f}")

    if timings:
        print(f"Promedio general: {statistics.mean(timings):.1f} ms")
        print(f"p50: {percentile(timings, 50):.1f} ms")
        print(f"p95: {percentile(timings, 95):.1f} ms")
        print(f"p99: {percentile(timings, 99):.1f} ms")
    if ok_timings:
        print(f"Promedio exitosos: {statistics.mean(ok_timings):.1f} ms")

    print("\n=== Por endpoint ===")
    endpoints = sorted({row.endpoint for row in rows})
    for endpoint in endpoints:
        endpoint_rows = [row for row in rows if row.endpoint == endpoint]
        endpoint_failures = [row for row in endpoint_rows if not row.ok]
        endpoint_timings = [row.elapsed_ms for row in endpoint_rows]
        print(
            f"{endpoint:28} total={len(endpoint_rows):4} "
            f"errores={len(endpoint_failures):3} "
            f"avg={statistics.mean(endpoint_timings):7.1f}ms "
            f"p95={percentile(endpoint_timings, 95):7.1f}ms"
        )

    if failures:
        print("\n=== Primeros errores ===")
        for row in failures[:10]:
            print(f"{row.method} {row.endpoint} -> {row.status}: {row.error}")


def export_csv(path: str, results: Iterable[Result]) -> None:
    if not path:
        return

    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["method", "endpoint", "status", "elapsed_ms", "ok", "error"])
        for row in results:
            writer.writerow(
                [
                    row.method,
                    row.endpoint,
                    row.status,
                    f"{row.elapsed_ms:.3f}",
                    row.ok,
                    row.error,
                ],
            )
    print(f"\nCSV exportado en: {output_path}")


def main() -> None:
    args = parse_args()
    token = None if args.no_auth else login(args.host, args.email, args.password)
    include_auth = bool(token) and not args.no_auth
    endpoints = weighted_endpoint_pool(include_auth=include_auth)

    print("=== Prueba de estres AeroPark Vision ===")
    print(f"Host: {args.host}")
    print(f"Usuarios virtuales: {args.users}")
    print(f"Duracion: {args.duration}s")
    print(f"Spawn rate: {args.spawn_rate} usuarios/s")
    print(f"Endpoints protegidos: {'si' if include_auth else 'no'}")

    results: list[Result] = []
    lock = threading.Lock()
    stop_at = time.perf_counter() + args.duration

    with ThreadPoolExecutor(max_workers=args.users) as executor:
        futures = []
        for user_id in range(args.users):
            futures.append(
                executor.submit(
                    worker,
                    user_id,
                    args.host,
                    token,
                    endpoints,
                    stop_at,
                    results,
                    lock,
                ),
            )
            if args.spawn_rate > 0:
                time.sleep(1 / args.spawn_rate)
        wait(futures)

    summarize(results, args.duration)
    export_csv(args.csv, results)


if __name__ == "__main__":
    main()
