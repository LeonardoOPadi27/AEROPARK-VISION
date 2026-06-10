from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models.imagen import ImagenCapturada
from app.services.analysis_service import ensure_analysis_for_image, serialize_analysis
from app.services.image_zone_service import get_image_zone, save_image_zone

UPLOAD_DIR = Path("uploads")
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _serialize_image(image: ImagenCapturada) -> dict:
    zone_metadata = get_image_zone(image.id_imagen)
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

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    original_name = Path(file.filename or "imagen").name
    extension = Path(original_name).suffix.lower()
    stored_name = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / stored_name

    try:
        with destination.open("wb") as buffer:
            while chunk := file.file.read(1024 * 1024):
                buffer.write(chunk)

        image = ImagenCapturada(
            nombre_archivo=stored_name,
            nombre_original=original_name,
            ruta_archivo=f"/uploads/{stored_name}",
            tipo_contenido=file.content_type,
            estado="subida",
        )
        db.add(image)
        db.flush()
        save_image_zone(image.id_imagen, zone_code)

        analysis = ensure_analysis_for_image(db, image)

        db.commit()
        db.refresh(image)
    except Exception as exc:
        db.rollback()
        if destination.exists():
            destination.unlink()
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
