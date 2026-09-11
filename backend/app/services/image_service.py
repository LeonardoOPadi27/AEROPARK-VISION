import os
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.models.imagen import ImagenCapturada
from app.services.analysis_service import ensure_analysis_for_image, serialize_analysis
from app.services.image_zone_service import get_image_zone, save_image_zone
from app.services.storage_service import delete_file, object_storage_enabled, upload_file

BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_ROOT / "uploads"
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _serialize_image(image: ImagenCapturada) -> dict:
    zone_metadata = get_image_zone(image)
    return {
        "id_imagen": image.id_imagen,
        "filename": image.nombre_archivo,
        "original_filename": image.nombre_original,
        "content_type": image.tipo_contenido,
        "url": image.ruta_archivo,
        "status": image.estado,
        "fecha_subida": image.fecha_subida.isoformat() if image.fecha_subida else None,
        "zone_code": zone_metadata.get("zone_code") if zone_metadata else None,
        "zone_title": zone_metadata.get("zone_title") if zone_metadata else None,
    }


def save_uploaded_image(db: Session, file: UploadFile, zone_code: str | None = None) -> dict:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Formato no permitido. Usa JPG, PNG o WEBP.",
        )

    if not file.filename:
        raise HTTPException(status_code=400, detail="El archivo no tiene nombre.")

    original_name = Path(file.filename).name
    extension = Path(original_name).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="La extensión de la imagen no es válida.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / stored_name
    object_key = f"images/{stored_name}"
    stored_url = f"/uploads/{stored_name}"

    try:
        with destination.open("wb") as buffer:
            bytes_written = 0
            while chunk := file.file.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "La imagen supera el límite de "
                            f"{MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
                        ),
                    )
                buffer.write(chunk)

        try:
            with Image.open(destination) as image:
                image.verify()
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(
                status_code=400,
                detail="El archivo no es una imagen válida.",
            ) from exc

        if object_storage_enabled():
            stored_url = upload_file(destination, object_key, file.content_type)

        image = ImagenCapturada(
            nombre_archivo=stored_name,
            nombre_original=original_name,
            ruta_archivo=f"/uploads/{stored_name}",
            tipo_contenido=file.content_type,
            estado="subida",
        )
        db.add(image)
        db.flush()
        save_image_zone(image, zone_code)

        analysis = ensure_analysis_for_image(db, image)
        image.ruta_archivo = stored_url

        db.commit()
        db.refresh(image)
        if object_storage_enabled() and destination.exists():
            try:
                destination.unlink()
            except OSError:
                pass
    except Exception as exc:
        db.rollback()
        if destination.exists():
            destination.unlink()
        if object_storage_enabled() and stored_url.startswith("http"):
            try:
                delete_file(object_key)
            except Exception:
                pass
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar la imagen.",
        ) from exc

    payload = _serialize_image(image)
    payload["analysis"] = serialize_analysis(analysis)
    return payload


def get_uploaded_images(db: Session) -> list[dict]:
    images = (
        db.query(ImagenCapturada)
        .order_by(ImagenCapturada.id_imagen.desc())
        .all()
    )
    return [_serialize_image(image) for image in images]


def get_latest_uploaded_image(db: Session) -> dict:
    image = (
        db.query(ImagenCapturada)
        .order_by(ImagenCapturada.id_imagen.desc())
        .first()
    )

    if not image:
        raise HTTPException(status_code=404, detail="No hay imágenes registradas.")

    return _serialize_image(image)
