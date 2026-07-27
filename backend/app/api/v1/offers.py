from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.coupon import Coupon
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/offers", tags=["Offers"])


@router.get("", summary="List offers and promotions")
def list_offers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    coupons = db.query(Coupon).filter(Coupon.is_active == True).order_by(Coupon.created_at.desc()).limit(limit).all()
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
