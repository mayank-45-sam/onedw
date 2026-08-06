"""Wallet Beanie document."""
from __future__ import annotations

import uuid
from pydantic import Field
from app.models.base import BaseDocument


class Wallet(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    balance: float = 0.0
    currency: str = "INR"
    pending_balance: float = 0.0
    total_earnings: float = 0.0
    total_spent: float = 0.0

    class Settings:
        name = "wallets"
