"""Async Coupon service — Beanie version."""
from __future__ import annotations

from app.models.coupon import Coupon
from app.repositories.coupon_repository import CouponRepository
from app.core.exceptions import BadRequestException
from app.core.security import utc_now


class CouponService:
    """Service for coupon validation and application."""

    def __init__(self):
        self.repo = CouponRepository()

    async def validate_and_apply(self, code: str, order_amount: float) -> tuple[float, Coupon]:
        """Validate coupon and return (discount_amount, coupon_obj)."""
        coupon = await self.repo.get_by_code(code)
        if coupon is None:
            raise BadRequestException(message="Invalid coupon code")

        if not coupon.is_active:
            raise BadRequestException(message="Coupon is no longer active")

        now = utc_now()
        if coupon.valid_from and now < coupon.valid_from:
            raise BadRequestException(message="Coupon is not yet valid")
        if coupon.valid_until and now > coupon.valid_until:
            raise BadRequestException(message="Coupon has expired")

        if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
            raise BadRequestException(message="Coupon usage limit reached")

        if coupon.min_order is not None and order_amount < coupon.min_order:
            raise BadRequestException(message=f"Minimum order amount is {coupon.min_order}")

        discount = self._calculate_discount(coupon, order_amount)
        return discount, coupon

    def _calculate_discount(self, coupon: Coupon, order_amount: float) -> float:
        if coupon.type == "percentage":
            discount = order_amount * (coupon.value / 100)
            if coupon.max_discount is not None:
                discount = min(discount, coupon.max_discount)
        else:
            discount = min(coupon.value, order_amount)
        return round(discount, 2)

    async def increment_usage(self, coupon: Coupon) -> None:
        await self.repo.increment_used_count(coupon)
