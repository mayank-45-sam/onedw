from typing import Optional
from pydantic import Field, ConfigDict

from app.schemas.common import SchemaBase


class PaymentProcessRequest(SchemaBase):
    booking_id: str
    payment_method: str = Field(..., pattern="^(card|upi|wallet|cash)$")
    card_number: Optional[str] = Field(None, max_length=19)
    upi_id: Optional[str] = Field(None, max_length=100)


class PaymentProcessResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: str
    booking_id: str
    amount: float
    currency: str
    payment_method: str
    payment_status: str
    paid_at: str
    message: str


class PaymentStatusResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    booking_id: str
    payment_status: str
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    paid_at: Optional[str] = None
    amount: float
    currency: str


class PaymentRefundRequest(SchemaBase):
    reason: Optional[str] = Field(None, max_length=500)


class PaymentRefundResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    booking_id: str
    transaction_id: Optional[str] = None
    refund_id: str
    amount: float
    currency: str
    payment_status: str
    status: str
    refunded_at: Optional[str] = None
    message: str


class PaymentReceiptResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    receipt_id: str
    booking_id: str
    service: str
    customer: str
    worker: str
    amount: float
    discount: float
    total_paid: float
    currency: str
    method: Optional[str] = None
    transaction_id: Optional[str] = None
    date: str
