"""BookingStatusHistory Beanie document."""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from pydantic import Field

from app.models.base import BaseDocument


class BookingStatusHistory(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    status: str
    note: Optional[str] = None
    changed_by: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = Field(default=None, alias="metadata")

    class Settings:
        name = "booking_status_history"
