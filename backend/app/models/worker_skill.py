"""WorkerSkill Beanie document."""
from __future__ import annotations

import uuid

from pydantic import Field

from app.models.base import BaseDocument


class WorkerSkill(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    worker_id: str
    skill: str

    class Settings:
        name = "worker_skills"
