from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.services.mobile_parking_service import (
    get_mobile_parking_overview,
    occupy_space_manually,
    release_space_manually,
)

router = APIRouter(prefix="/mobile", tags=["Mobile"])


class OccupySpaceRequest(BaseModel):
    estimated_hours: int = Field(default=2, ge=1, le=12)


@router.get("/parking-overview")
def mobile_parking_overview(db: Session = Depends(get_db)):
    return get_mobile_parking_overview(db)


@router.post("/spaces/{space_code}/occupy")
def occupy_space(
    space_code: str,
    payload: OccupySpaceRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return occupy_space_manually(
        db,
        space_code,
        payload.estimated_hours,
        current_user.id_usuario,
        f"{current_user.nombres} {current_user.apellidos}".strip(),
    )


@router.post("/spaces/{space_code}/release")
def release_space(
    space_code: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return release_space_manually(db, space_code)
