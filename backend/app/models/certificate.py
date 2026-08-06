"""Certificate Beanie document."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import Field

from app.models.base import BaseDocument


class Certificate(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    worker_id: str
    title: str
    image: str
    issued_at: Optional[datetime] = None

    class Settings:
        name = "certificates"
