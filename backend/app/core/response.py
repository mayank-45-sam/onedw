from typing import Generic, TypeVar, Optional

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard API response model."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "Operation successful",
                "data": {},
                "errors": None,
            }
        }
    )

    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None
    errors: Optional[list] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated API response model."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "data": [],
                "total": 100,
                "page": 1,
                "limit": 10,
                "pages": 10,
            }
        }
    )

    success: bool = True
    data: list[T] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    limit: int = 10
    pages: int = 0


class HealthResponse(BaseModel):
    """Health check response model."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "healthy",
                "app_name": "OneDW API",
                "app_version": "1.0.0",
                "environment": "development",
                "database": "connected",
            }
        }
    )

    status: str = "healthy"
    app_name: str
    app_version: str = "1.0.0"
    environment: str
    database: str = "connected"
