"""Bidding / custom job Beanie documents."""
from __future__ import annotations

import enum
import uuid
from typing import Optional

from pydantic import Field

from app.models.base import BaseDocument


class CustomJobStatus(str, enum.Enum):
    OPEN = "open"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class BidStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COUNTERED = "countered"


class CustomJob(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category_id: Optional[str] = None
    title: str
    description: str
    budget_min: float
    budget_max: float
    urgency: Optional[str] = None
    preferred_time: Optional[str] = None
    images: Optional[str] = None
    status: CustomJobStatus = CustomJobStatus.OPEN

    class Settings:
        name = "custom_jobs"


class JobBid(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    worker_id: str
    bid_amount: float
    message: Optional[str] = None
    estimated_time: Optional[str] = None
    status: BidStatus = BidStatus.PENDING

    class Settings:
        name = "job_bids"


class NegotiationMessage(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    sender_id: str
    receiver_id: Optional[str] = None
    message: Optional[str] = None
    proposed_price: Optional[float] = None

    class Settings:
        name = "negotiation_messages"
