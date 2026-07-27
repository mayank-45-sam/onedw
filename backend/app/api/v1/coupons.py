from typing import Optional
from pydantic import Field
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.coupon import Coupon
from app.schemas.common import SchemaBase
from app.core.exceptions import BadRequestException, NotFoundException

router = APIRouter(prefix="/coupons", tags=["Coupons"])


class ValidateCouponRequest(SchemaBase):
    code: str
    order_amount: float = Field(..., gt=0)


def _serialize(c: Coupon) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "title": c.title,
        "description": c.description,
        "type": c.type,
        "value": c.value,
        "max_discount": c.max_discount,
        "min_order": c.min_order,
        "valid_from": c.valid_from.isoformat() if c.valid_from else None,
        "valid_until": c.valid_until.isoformat() if c.valid_until else None,
        "usage_limit": c.usage_limit,
        "used_count": c.used_count,
        "is_active": c.is_active,
        "image": c.image,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.get("", summary="List available coupons")
def list_coupons(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    query = db.query(Coupon).filter(Coupon.is_active == True)
    total = query.count()
    items = query.order_by(Coupon.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "success": True,
        "message": "Coupons retrieved",
        "data": [_serialize(c) for c in items],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.post("/validate", summary="Validate a coupon code")
def validate_coupon(
    body: ValidateCouponRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    coupon = db.query(Coupon).filter(Coupon.code == body.code.upper()).first()
    if coupon is None:
        raise NotFoundException(message="Coupon not found")
    if not coupon.is_active:
        raise BadRequestException(message="Coupon is no longer active")
    now = datetime.now(timezone.utc)
    if coupon.valid_from and coupon.valid_from.replace(tzinfo=timezone.utc) > now:
        raise BadRequestException(message="Coupon is not yet valid")
    if coupon.valid_until and coupon.valid_until.replace(tzinfo=timezone.utc) < now:
        raise BadRequestException(message="Coupon has expired")
    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        raise BadRequestException(message="Coupon usage limit reached")
    if coupon.min_order and body.order_amount < coupon.min_order:
        raise BadRequestException(message=f"Minimum order amount is {coupon.min_order}")

    discount = 0.0
    if coupon.type == "percentage":
        discount = min(body.order_amount * coupon.value / 100, coupon.max_discount or float("inf"))
    else:
        discount = coupon.value

    return {
        "success": True,
        "message": "Coupon is valid",
        "data": {
            "discount": round(discount, 2),
            "coupon_code": coupon.code,
            "type": coupon.type,
            "value": coupon.value,
            "max_discount": coupon.max_discount,
        },
    }
