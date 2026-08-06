"""WorkerLanguage Beanie document."""
from __future__ import annotations

import uuid

from pydantic import Field

from app.models.base import BaseDocument


class WorkerLanguage(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    worker_id: str
    language: str

    class Settings:
        name = "worker_languages"
