from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.services.parking_space_service import get_latest_parking_spaces

router = APIRouter(prefix="/parking-spaces", tags=["Parking Spaces"])


@router.get("/latest")
def latest_parking_spaces(db: Session = Depends(get_db)):
    return get_latest_parking_spaces(db)
