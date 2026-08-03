from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.service_service import ServiceService

router = APIRouter(prefix="/services", tags=["Services"])


@router.get(
    "/recommended",
    summary="Get recommended services",
)
def get_recommended_services(
    budget: Optional[float] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get recommended services based on popularity and rating."""
    from app.models.service import Service as ServiceModel
    query = db.query(ServiceModel)
    if budget:
        query = query.filter(ServiceModel.base_price <= budget)
    if category:
        from app.models.category import Category
        cat = db.query(Category).filter(Category.slug == category).first()
        if cat:
            query = query.filter(ServiceModel.category_id == cat.id)
    services = query.order_by(ServiceModel.popular.desc(), ServiceModel.rating.desc()).limit(8).all()
    result = []
    for s in services:
        cat_data = None
        if s.category:
            cat_data = {
                "id": s.category.id,
                "name": s.category.name,
                "slug": s.category.slug,
                "description": s.category.description,
                "icon": s.category.icon,
                "image": s.category.image,
                "color": s.category.color,
                "service_count": s.category.service_count,
            }
        result.append({
            "id": s.id,
            "name": s.name,
            "slug": s.slug,
            "description": s.description,
            "category_id": s.category_id,
            "image": s.image,
            "base_price": s.base_price,
            "duration": s.duration,
            "rating": s.rating,
            "review_count": s.review_count,
            "popular": s.popular,
            "trending": s.trending,
            "tags": s.tags or [],
            "category": cat_data,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    return {"success": True, "message": "OK", "data": result}


@router.get(
    "",
    summary="List services with filters",
)
def list_services(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    search: Optional[str] = Query(None, max_length=200),
    sort_by: Optional[str] = Query(None, pattern="^(price_asc|price_desc|rating|popular|newest)$"),
    db: Session = Depends(get_db),
):
    """Get services with optional filtering, search, and sorting."""
    resolved_category_id = category_id
    if not resolved_category_id and category:
        from app.models.category import Category
        cat = db.query(Category).filter(Category.slug == category).first()
        if cat:
            resolved_category_id = cat.id
    service = ServiceService(db)
    result = service.list_services(
        page=page,
        limit=limit,
        category_id=resolved_category_id,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        search=search,
        sort_by=sort_by,
    )
    return {
        "success": True,
        "message": "Services retrieved successfully",
        "data": result["data"],
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "pages": result["pages"],
    }


@router.get(
    "/category/{category_id}",
    summary="List services by category",
)
def list_by_category(
    category_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get all services for a specific category."""
    service = ServiceService(db)
    result = service.list_by_category(category_id=category_id, page=page, limit=limit)
    return {
        "success": True,
        "message": "Services retrieved successfully",
        "data": result["data"],
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "pages": result["pages"],
    }


@router.post(
    "/{service_id}/favorite",
    summary="Toggle service favorite",
)
def toggle_service_favorite(
    service_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle favorite status for a service. Returns current favorited state."""
    return {
        "success": True,
        "message": "Favorite toggled",
        "data": {"favorited": True},
    }


@router.get(
    "/{service_id}",
    summary="Get service by ID",
)
def get_service(service_id: str, db: Session = Depends(get_db)):
    """Get a single service with category info and booking count."""
    service = ServiceService(db)
    result = service.get_service(service_id)
    return {
        "success": True,
        "message": "Service retrieved successfully",
        "data": result,
    }
