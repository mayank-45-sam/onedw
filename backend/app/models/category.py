"""Category Beanie document."""
from __future__ import annotations

import uuid
from typing import Optional

from beanie import Indexed
from pydantic import Field

from app.models.base import BaseDocument


class Category(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: Indexed(str, unique=True)  # type: ignore[valid-type]
    description: Optional[str] = None
    icon: Optional[str] = None
    image: Optional[str] = None
    color: Optional[str] = None
    service_count: int = 0

    class Settings:
        name = "categories"
