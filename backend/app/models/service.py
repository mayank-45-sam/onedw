"""Service Beanie document."""
from __future__ import annotations

import uuid
from typing import List, Optional

from beanie import Indexed
from pydantic import Field

from app.models.base import BaseDocument


class Service(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: Indexed(str, unique=True)  # type: ignore[valid-type]
    description: str
    category_id: Optional[str] = None
    image: Optional[str] = None
    gallery: List[str] = Field(default_factory=list)
    base_price: float
    duration: int
    rating: float = 0.0
    review_count: int = 0
    popular: bool = False
    trending: bool = False
    tags: List[str] = Field(default_factory=list)

    class Settings:
        name = "services"
