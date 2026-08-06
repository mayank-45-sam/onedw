"""Conversation Beanie document."""
from __future__ import annotations

import uuid
from typing import List, Optional

from pydantic import Field

from app.models.base import BaseDocument


class Conversation(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participants: List[str]
    last_message_id: Optional[str] = None
    unread_count: int = 0

    class Settings:
        name = "conversations"
