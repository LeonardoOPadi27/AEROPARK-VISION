from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.services.analysis_service import (
    get_analysis_list,
    get_detection_runtime_status,
    get_latest_analysis,
    run_analysis_for_image,
    run_mock_analysis_for_image,
)

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.get("")
def list_analysis(db: Session = Depends(get_db)):
    return get_analysis_list(db)


@router.get("/latest")
def latest_analysis(db: Session = Depends(get_db)):
    return get_latest_analysis(db)


@router.get("/yolo-status")
def yolo_status():
    return get_detection_runtime_status()


@router.post("/images/{image_id}/run")
def run_analysis(image_id: int, db: Session = Depends(get_db)):
    return run_analysis_for_image(db, image_id)


@router.post("/images/{image_id}/run-mock")
def run_mock_analysis(image_id: int, db: Session = Depends(get_db)):
    return run_mock_analysis_for_image(db, image_id)
