"""Admin profile Beanie document."""
from __future__ import annotations

import uuid
from typing import List, Optional

from pydantic import Field

from app.models.base import BaseDocument


class Admin(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    avatar: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)

    class Settings:
        name = "admins"
