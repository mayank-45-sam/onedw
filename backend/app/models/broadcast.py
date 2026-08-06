"""Broadcast Beanie document."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import Field

from app.models.base import BaseDocument


class Broadcast(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message: str
    audience: str  # all | customers | workers | verified_workers | pending_workers
    category: str = "announcement"  # announcement | maintenance | emergency | promotion | policy
    priority: str = "medium"  # low | medium | high
    status: str = "scheduled"  # scheduled | sent
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    sent_by: Optional[str] = None
    total_recipients: int = 0
    delivered_count: int = 0
    failed_count: int = 0

    class Settings:
        name = "broadcasts"
