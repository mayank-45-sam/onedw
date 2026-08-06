"""Async Coupon repository."""
from __future__ import annotations

from typing import Optional

from app.models.coupon import Coupon
from app.repositories.base import BaseRepository


class CouponRepository(BaseRepository[Coupon]):
    def __init__(self):
        super().__init__(Coupon)

    async def get_by_code(self, code: str) -> Optional[Coupon]:
        return await Coupon.find_one(Coupon.code == code.upper())

    async def increment_used_count(self, coupon: Coupon) -> Coupon:
        coupon.used_count += 1
        await coupon.save()
        return coupon
