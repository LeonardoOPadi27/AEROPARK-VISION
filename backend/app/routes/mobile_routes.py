from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.core.security import get_current_user, is_admin
from app.models.usuario import Usuario
from app.models.analisis import AnalisisImagen
from app.models.imagen import ImagenCapturada
from app.services.analysis_service import serialize_analysis
from app.services.mobile_parking_service import (
    get_mobile_parking_overview,
    occupy_space_manually,
    release_space_manually,
    confirm_space_manually,
    _client_utc,
)

router = APIRouter(prefix="/mobile", tags=["Mobile"])


@router.get("/reviews")
def recent_reviews(
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    analyses = (
        db.query(AnalisisImagen)
        .join(ImagenCapturada)
        .filter(AnalisisImagen.estado == "completado_yolo")
        .order_by(ImagenCapturada.id_imagen.desc())
        .limit(3)
        .all()
    )
    fields = (
        "id_analisis", "zone_title", "fecha_analisis", "espacios_libres",
        "espacios_ocupados", "total_vehiculos",
    )
    reviews = []
    for analysis in analyses:
        payload = serialize_analysis(analysis)
        review = {field: payload.get(field) for field in fields}
        review["fecha_analisis"] = _client_utc(review["fecha_analisis"])
        reviews.append(review)
    return reviews


class OccupySpaceRequest(BaseModel):
    estimated_hours: int = Field(default=2, ge=1, le=24)


@router.get("/parking-overview")
def mobile_parking_overview(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return get_mobile_parking_overview(
        db,
        viewer_id=current_user.id_usuario,
        include_all_user_details=is_admin(current_user),
    )


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
    return release_space_manually(
        db,
        space_code,
        current_user.id_usuario,
        is_admin(current_user),
    )


@router.post("/spaces/{space_code}/confirm")
def confirm_space(
    space_code: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return confirm_space_manually(db, space_code, current_user.id_usuario)
