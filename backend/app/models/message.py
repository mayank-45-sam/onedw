"""Message Beanie document."""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from pydantic import Field

from app.models.base import BaseDocument


class Message(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    receiver_id: str
    text: Optional[str] = None
    image: Optional[str] = None
    voice_note: Optional[Dict[str, Any]] = None
    attachments: List[str] = Field(default_factory=list)
    status: str = "sent"

    class Settings:
        name = "messages"
