"""Coupon Beanie document."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from beanie import Indexed
from pydantic import Field

from app.models.base import BaseDocument


class Coupon(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: Indexed(str, unique=True)  # type: ignore[valid-type]
    title: str
    description: Optional[str] = None
    type: str
    value: float
    max_discount: Optional[float] = None
    min_order: Optional[float] = None
    valid_from: datetime
    valid_until: datetime
    usage_limit: Optional[int] = None
    used_count: int = 0
    is_active: bool = True
    image: Optional[str] = None

    class Settings:
        name = "coupons"
