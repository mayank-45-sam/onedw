from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.response import HealthResponse
from app.db.database import get_db

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    """
    Health check endpoint to verify API and database connectivity.
    """
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "unhealthy",
        app_name=settings.APP_NAME,
        app_version="1.0.0",
        environment=settings.APP_ENV,
        database=db_status,
    )
