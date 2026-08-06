"""Notification Beanie document."""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from pydantic import Field

from app.models.base import BaseDocument


class Notification(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    body: str
    type: str
    read: bool = False
    data: Optional[Dict[str, Any]] = None

    class Settings:
        name = "notifications"
