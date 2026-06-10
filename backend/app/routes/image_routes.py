from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.services.image_service import (
    get_latest_uploaded_image,
    get_uploaded_images,
    save_uploaded_image,
)

router = APIRouter(prefix="/images", tags=["Images"])


@router.post("/upload")
def upload_image(
    file: UploadFile = File(...),
    zone_code: str | None = Form(default=None),
    db: Session = Depends(get_db),
):
    return save_uploaded_image(db, file, zone_code=zone_code)


@router.get("")
def list_images(db: Session = Depends(get_db)):
    return get_uploaded_images(db)


@router.get("/latest")
def latest_image(db: Session = Depends(get_db)):
    return get_latest_uploaded_image(db)
