"""RefreshToken Beanie document."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import Field

from app.models.base import BaseDocument


class RefreshToken(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    expires_at: datetime
    revoked: bool = False
    family: Optional[str] = None

    class Settings:
        name = "refresh_tokens"
