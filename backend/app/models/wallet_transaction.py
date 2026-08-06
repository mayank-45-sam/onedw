"""WalletTransaction Beanie document."""
from __future__ import annotations

import enum
import uuid
from typing import Optional

from pydantic import Field

from app.models.base import BaseDocument


class TransactionType(str, enum.Enum):
    CREDIT = "credit"
    DEBIT = "debit"


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class WalletTransaction(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_id: str
    user_id: str
    type: TransactionType
    amount: float
    currency: str = "INR"
    status: TransactionStatus = TransactionStatus.PENDING
    description: str
    booking_id: Optional[str] = None
    reference: Optional[str] = None

    class Settings:
        name = "wallet_transactions"
