from typing import Optional
from sqlalchemy.orm import Session

from app.models.coupon import Coupon
from app.repositories.base import BaseRepository


class CouponRepository(BaseRepository[Coupon]):
    """Repository for Coupon model operations."""

    def __init__(self, db: Session):
        super().__init__(Coupon, db)

    def get_by_code(self, code: str) -> Optional[Coupon]:
        return self.db.query(Coupon).filter(Coupon.code == code.upper()).first()

    def increment_used_count(self, coupon: Coupon) -> Coupon:
        coupon.used_count += 1
        self.db.commit()
        self.db.refresh(coupon)
        return coupon
