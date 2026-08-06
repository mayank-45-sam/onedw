"""WorkerAvailability Beanie document."""
from __future__ import annotations

import uuid
from typing import Any, List

from pydantic import Field

from app.models.base import BaseDocument


class WorkerAvailability(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    worker_id: str
    day: str
    slots: List[Any] = Field(default_factory=list)

    class Settings:
        name = "worker_availability"
