import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import models  # noqa: F401
from app.routes import (
    analysis_routes,
    auth_routes,
    color_routes,
    image_routes,
    mobile_routes,
    parking_space_routes,
    report_routes,
    settings_routes,
)

app = FastAPI()


def get_cors_origins() -> list[str]:
    configured_origins = os.getenv("CORS_ORIGINS", "")
    if configured_origins:
        return [
            origin.strip()
            for origin in configured_origins.split(",")
            if origin.strip()
        ]

    return [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_routes.router)
app.include_router(image_routes.router)
app.include_router(analysis_routes.router)
app.include_router(color_routes.router)
app.include_router(parking_space_routes.router)
app.include_router(mobile_routes.router)
app.include_router(report_routes.router)
app.include_router(settings_routes.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
