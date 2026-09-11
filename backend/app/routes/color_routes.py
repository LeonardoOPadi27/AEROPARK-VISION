from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.services.color_service import get_color_summary, get_latest_color_summary

router = APIRouter(prefix="/vehicle-colors", tags=["Vehicle Colors"])


@router.get("/summary")
def color_summary(db: Session = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return get_color_summary(db)


@router.get("/latest")
def latest_color_summary(db: Session = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return get_latest_color_summary(db)
