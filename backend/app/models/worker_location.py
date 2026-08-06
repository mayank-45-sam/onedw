"""WorkerLocation Beanie document."""
from __future__ import annotations

import uuid

from pydantic import Field

from app.models.base import BaseDocument


class WorkerLocation(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    worker_id: str
    latitude: float
    longitude: float

    class Settings:
        name = "worker_locations"
