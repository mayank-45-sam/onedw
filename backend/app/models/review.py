"""Review Beanie document."""
from __future__ import annotations

import uuid
from typing import List, Optional

from pydantic import Field

from app.models.base import BaseDocument


class Review(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    customer_id: str
    worker_id: str
    service_id: Optional[str] = None
    rating: float
    behaviour: int
    quality: int
    price: int
    time_rating: int
    comment: Optional[str] = None
    work_images: List[str] = Field(default_factory=list)
    recommends: bool = True

    class Settings:
        name = "reviews"
