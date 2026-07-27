from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.marketplace import CategoryResponse, PaginatedResponse
from app.services.category_service import CategoryService
from app.services.service_service import ServiceService

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get(
    "",
    summary="List all categories",
)
def list_categories(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get all categories with pagination and service counts."""
    service = CategoryService(db)
    result = service.list_categories(page=page, limit=limit)
    return {
        "success": True,
        "message": "Categories retrieved successfully",
        "data": result["data"],
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "pages": result["pages"],
    }


@router.get(
    "/{category_id}",
    summary="Get category by ID or slug",
)
def get_category(category_id: str, db: Session = Depends(get_db)):
    """Get a single category by its ID or slug."""
    service = CategoryService(db)
    result = service.get_category(category_id)
    return {
        "success": True,
        "message": "Category retrieved successfully",
        "data": result,
    }


@router.get(
    "/{category_slug}/services",
    summary="List services by category slug",
)
def list_services_by_category_slug(
    category_slug: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get all services for a category identified by slug."""
    cat_service = CategoryService(db)
    cat = cat_service.repo.get_by_slug(category_slug)
    if cat is None:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(message="Category not found")
    svc_service = ServiceService(db)
    result = svc_service.list_by_category(category_id=cat.id, page=page, limit=limit)
    return {
        "success": True,
        "message": "Services retrieved successfully",
        "data": result["data"],
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "pages": result["pages"],
    }
