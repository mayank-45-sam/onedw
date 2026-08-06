"""Complaint Beanie document."""
from __future__ import annotations

import uuid
from typing import List, Optional

from pydantic import Field

from app.models.base import BaseDocument


class Complaint(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    booking_id: Optional[str] = None
    worker_id: Optional[str] = None
    subject: str
    description: str
    status: str = "open"
    images: List[str] = Field(default_factory=list)
    resolved_at: Optional[str] = None

    class Settings:
        name = "complaints"
