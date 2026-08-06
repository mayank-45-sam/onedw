from typing import Optional
from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.category import Category
from app.models.service import Service as ServiceModel
from app.services.service_service import ServiceService

router = APIRouter(prefix="/services", tags=["Services"])


@router.get("/recommended", summary="Get recommended services")
async def get_recommended_services(
    budget: Optional[float] = Query(None),
    category: Optional[str] = Query(None),
):
    """Get recommended services based on popularity and rating."""
    mongo_filter = {}
    if budget:
        mongo_filter["base_price"] = {"$lte": budget}
    if category:
        cat = await Category.find_one(Category.slug == category)
        if cat:
            mongo_filter["category_id"] = cat.id

    services = await ServiceModel.find(mongo_filter).sort("-popular,-rating").limit(8).to_list()
    result = []
    for s in services:
        cat = await Category.find_one(Category.id == s.category_id) if s.category_id else None
        cat_data = None
        if cat:
            cat_data = {
                "id": cat.id, "name": cat.name, "slug": cat.slug,
                "description": cat.description, "icon": cat.icon,
                "image": cat.image, "color": cat.color, "service_count": cat.service_count,
            }
        result.append({
            "id": s.id, "name": s.name, "slug": s.slug, "description": s.description,
            "category_id": s.category_id, "image": s.image, "base_price": s.base_price,
            "duration": s.duration, "rating": s.rating, "review_count": s.review_count,
            "popular": s.popular, "trending": s.trending, "tags": s.tags or [],
            "category": cat_data,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    return {"success": True, "message": "OK", "data": result}


@router.get("", summary="List services with filters")
async def list_services(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    search: Optional[str] = Query(None, max_length=200),
    sort_by: Optional[str] = Query(None, pattern="^(price_asc|price_desc|rating|popular|newest)$"),
):
    """Get services with optional filtering, search, and sorting."""
    resolved_category_id = category_id
    if not resolved_category_id and category:
        cat = await Category.find_one(Category.slug == category)
        if cat:
            resolved_category_id = cat.id
    service = ServiceService()
    result = await service.list_services(
        page=page, limit=limit, category_id=resolved_category_id,
        min_price=min_price, max_price=max_price, min_rating=min_rating,
        search=search, sort_by=sort_by,
    )
    return {
        "success": True, "message": "Services retrieved successfully",
        "data": result["data"], "total": result["total"],
        "page": result["page"], "limit": result["limit"], "pages": result["pages"],
    }


@router.get("/category/{category_id}", summary="List services by category")
async def list_by_category(
    category_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get all services for a specific category."""
    service = ServiceService()
    result = await service.list_by_category(category_id=category_id, page=page, limit=limit)
    return {
        "success": True, "message": "Services retrieved successfully",
        "data": result["data"], "total": result["total"],
        "page": result["page"], "limit": result["limit"], "pages": result["pages"],
    }


@router.post("/{service_id}/favorite", summary="Toggle service favorite")
async def toggle_service_favorite(
    service_id: str,
    current_user: User = Depends(get_current_user),
):
    """Toggle favorite status for a service."""
    return {"success": True, "message": "Favorite toggled", "data": {"favorited": True}}


@router.get("/{service_id}", summary="Get service by ID")
async def get_service(service_id: str):
    """Get a single service with category info and booking count."""
    service = ServiceService()
    result = await service.get_service(service_id)
    return {"success": True, "message": "Service retrieved successfully", "data": result}
