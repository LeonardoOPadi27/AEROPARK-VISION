from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.core.security import require_admin
from app.models.usuario import Usuario
from app.services.image_service import (
    get_latest_uploaded_image,
    get_uploaded_images,
    process_uploaded_image,
    process_zone_b_pair,
    save_uploaded_image,
    save_zone_b_pair,
)

router = APIRouter(prefix="/images", tags=["Images"])


@router.post("/upload")
def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    zone_code: str | None = Form(default=None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    payload, source_path, remove_source_after_processing = save_uploaded_image(
        db,
        file,
        zone_code=zone_code,
    )
    background_tasks.add_task(
        process_uploaded_image,
        payload["id_imagen"],
        str(source_path),
        remove_source_after_processing,
    )
    return payload


@router.post("/upload-zone-b-pair")
def upload_zone_b_pair(
    background_tasks: BackgroundTasks,
    lower_file: UploadFile = File(...),
    upper_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    payload, jobs = save_zone_b_pair(db, lower_file, upper_file)
    background_tasks.add_task(process_zone_b_pair, jobs)
    return payload


@router.get("")
def list_images(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    return get_uploaded_images(db)


@router.get("/latest")
def latest_image(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    return get_latest_uploaded_image(db)
