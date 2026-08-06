from fastapi import APIRouter

from app.core.config import settings
from app.core.response import HealthResponse
from app.db.database import check_database_connection

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """
    Health check endpoint to verify API and database connectivity.
    """
    db_ok = await check_database_connection()
    db_status = "connected" if db_ok else "disconnected"

    return HealthResponse(
        status="healthy" if db_ok else "unhealthy",
        app_name=settings.APP_NAME,
        app_version="1.0.0",
        environment=settings.APP_ENV,
        database=db_status,
    )
