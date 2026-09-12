from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.usuario import Usuario
from app.services.analysis_service import (
    get_analysis_list,
    get_detection_runtime_status,
    get_latest_analysis,
    run_mock_analysis_for_image,
    serialize_analysis,
)
from app.services.image_service import process_uploaded_image
from app.models.imagen import ImagenCapturada

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.get("")
def list_analysis(db: Session = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return get_analysis_list(db)


@router.get("/latest")
def latest_analysis(db: Session = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return get_latest_analysis(db)


@router.get("/yolo-status")
def yolo_status(_: Usuario = Depends(get_current_user)):
    return get_detection_runtime_status()


@router.post("/images/{image_id}/run")
def run_analysis(
    image_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    image = db.query(ImagenCapturada).filter_by(id_imagen=image_id).first()
    if image is None:
        raise HTTPException(status_code=404, detail="Imagen no encontrada.")

    image.analisis.estado = "pendiente"
    db.commit()
    db.refresh(image)
    background_tasks.add_task(process_uploaded_image, image_id, None, False)
    return serialize_analysis(image.analisis)


@router.post("/images/{image_id}/run-mock")
def run_mock_analysis(
    image_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    return run_mock_analysis_for_image(db, image_id)
