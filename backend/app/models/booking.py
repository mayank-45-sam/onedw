"""Booking Beanie document."""
from __future__ import annotations

import enum
import uuid
from typing import Any, Dict, List, Optional

from pydantic import Field

from app.models.base import BaseDocument


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    WORKER_ASSIGNED = "worker-assigned"
    WORKER_ON_THE_WAY = "worker-on-the-way"
    ARRIVED = "arrived"
    STARTED_WORK = "started-work"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(str, enum.Enum):
    UNPAID = "unpaid"
    PAID = "paid"
    REFUNDED = "refunded"
    FAILED = "failed"


class PaymentMethod(str, enum.Enum):
    WALLET = "wallet"
    CARD = "card"
    CASH = "cash"
    UPI = "upi"


class BookingType(str, enum.Enum):
    SCHEDULED = "scheduled"
    INSTANT = "instant"
    EMERGENCY = "emergency"


class Booking(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    worker_id: Optional[str] = None
    service_id: Optional[str] = None
    status: BookingStatus = BookingStatus.PENDING
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    payment_method: Optional[PaymentMethod] = None
    problem_description: str
    problem_images: List[str] = Field(default_factory=list)
    scheduled_date: str
    scheduled_time: str
    address: Dict[str, Any]
    price: float
    currency: str = "INR"
    coupon_code: Optional[str] = None
    discount: float = 0.0
    final_price: float
    transaction_id: Optional[str] = None
    paid_at: Optional[str] = None
    refunded_at: Optional[str] = None
    refund_reason: Optional[str] = None
    eta_minutes: Optional[int] = None
    distance_km: Optional[float] = None
    booking_type: BookingType = BookingType.SCHEDULED
    is_emergency: bool = False

    class Settings:
        name = "bookings"
