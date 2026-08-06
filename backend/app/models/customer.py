"""Customer profile Beanie document."""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from pydantic import Field

from app.models.base import BaseDocument


class Customer(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    avatar: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    favorite_services: List[str] = Field(default_factory=list)
    favorite_workers: List[str] = Field(default_factory=list)

    class Settings:
        name = "customers"
