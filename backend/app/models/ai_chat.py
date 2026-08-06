"""AI Chat Beanie documents."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import Field

from app.models.base import BaseDocument


class ChatSession(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str = "New Conversation"
    language: str = "en"

    class Settings:
        name = "ai_chat_sessions"


class ChatMessage(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # "user" | "assistant" | "system"
    content: str
    tokens_used: int = 0

    class Settings:
        name = "ai_chat_messages"
