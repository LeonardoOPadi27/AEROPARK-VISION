from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.services.report_service import get_reports_overview

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/overview")
def reports_overview(db: Session = Depends(get_db)):
    return get_reports_overview(db)
