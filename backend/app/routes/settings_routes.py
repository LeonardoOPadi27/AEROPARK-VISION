from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.core.security import require_admin
from app.models.usuario import Usuario
from app.services.settings_service import get_settings_overview, update_mobile_settings

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/overview")
def settings_overview(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    return get_settings_overview(db)


@router.patch("/mobile")
def update_mobile_settings_route(
    payload: dict,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    return update_mobile_settings(db, payload)
