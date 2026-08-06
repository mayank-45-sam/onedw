from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.coupon import Coupon

router = APIRouter(prefix="/offers", tags=["Offers"])


@router.get("", summary="List offers and promotions")
async def list_offers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    coupons = await Coupon.find(Coupon.is_active == True).sort(-Coupon.created_at).limit(limit).to_list()
    offers = [
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "code": c.code,
            "type": c.type,
            "value": c.value,
            "max_discount": c.max_discount,
            "min_order": c.min_order,
            "valid_until": c.valid_until.isoformat() if c.valid_until else None,
            "image": c.image,
        }
        for c in coupons
    ]
    return {
        "success": True,
        "message": "Offers retrieved",
        "data": offers,
        "total": len(offers),
        "page": page,
        "limit": limit,
        "pages": 1 if offers else 0,
    }
