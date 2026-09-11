from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Literal

from app.config.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.usuario import Usuario
from app.services.parking_space_service import get_latest_parking_spaces
from app.services.space_calibration_service import get_calibration_editor, save_calibration

router = APIRouter(prefix="/parking-spaces", tags=["Parking Spaces"])


class CalibratedSpace(BaseModel):
    code: str = Field(max_length=5)
    polygon: list[tuple[float, float]] = Field(min_length=4, max_length=4)


class CalibrationRequest(BaseModel):
    zone_code: Literal["A", "B"]
    image_width: int = Field(gt=0, le=30000)
    image_height: int = Field(gt=0, le=30000)
    spaces: list[CalibratedSpace] = Field(max_length=73)


@router.get("/calibration/{image_id}")
def calibration_editor(image_id: int, db: Session = Depends(get_db),
                       _: Usuario = Depends(require_admin)):
    return get_calibration_editor(db, image_id)


@router.put("/calibration/{image_id}")
def update_calibration(image_id: int, payload: CalibrationRequest,
                       db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    return save_calibration(db, image_id, payload.model_dump())


@router.get("/latest")
def latest_parking_spaces(
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    return get_latest_parking_spaces(db)
