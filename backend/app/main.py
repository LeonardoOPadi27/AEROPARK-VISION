import os

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app import models  # noqa: F401
from app.config.database import engine
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

is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
app = FastAPI(
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
)


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
    allow_origin_regex=(
        None
        if is_production
        else r"https?://(localhost|127\.0\.0\.1)(:\d+)?"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = os.getenv(
    "UPLOADS_DIR",
    str((os.path.dirname(__file__))) + "/../uploads",
)
os.makedirs(UPLOADS_DIR, exist_ok=True)
if not is_production or os.getenv("ALLOW_PUBLIC_LOCAL_UPLOADS", "false").lower() == "true":
    app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

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
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "database": "offline"},
        )
    return {"status": "ok", "database": "online"}
