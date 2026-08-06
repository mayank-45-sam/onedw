"""Payments API — async Beanie version."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies.auth import RequireCustomer
from app.models.user import User
from app.models.customer import Customer
from app.schemas.payment import (
    PaymentProcessRequest,
    PaymentRefundRequest,
)
from app.services.payment_service import PaymentService
from app.core.exceptions import BadRequestException

router = APIRouter(prefix="/payments", tags=["Payments"])


async def _get_customer_id(user_id: str) -> str:
    cust = await Customer.find_one(Customer.user_id == user_id)
    if cust is None:
        raise BadRequestException(message="Customer profile not found")
    return cust.id


@router.post("/process", summary="Process payment for a booking")
async def process_payment(
    body: PaymentProcessRequest,
    current_user: User = Depends(RequireCustomer),
):
    """Process a simulated payment for a pending booking."""
    customer_id = await _get_customer_id(current_user.id)
    service = PaymentService()
    result = await service.process_payment(
        booking_id=body.booking_id,
        customer_id=customer_id,
        payment_method=body.payment_method,
        card_number=body.card_number,
        upi_id=body.upi_id,
    )
    if result["payment_status"] == "failed":
        return {"success": False, "message": result["message"], "data": result}
    return {"success": True, "message": result["message"], "data": result}


@router.get("/{booking_id}/status", summary="Check payment status for a booking")
async def get_payment_status(
    booking_id: str,
    current_user: User = Depends(RequireCustomer),
):
    """Check the current payment status of a booking."""
    customer_id = await _get_customer_id(current_user.id)
    service = PaymentService()
    result = await service.get_payment_status(booking_id=booking_id, customer_id=customer_id)
    return {"success": True, "message": "Payment status retrieved", "data": result}


@router.post("/{booking_id}/refund", summary="Refund a paid booking")
async def refund_payment(
    booking_id: str,
    body: PaymentRefundRequest = PaymentRefundRequest(),
    current_user: User = Depends(RequireCustomer),
):
    """Refund a previously paid booking."""
    customer_id = await _get_customer_id(current_user.id)
    service = PaymentService()
    result = await service.process_refund(
        booking_id=booking_id, customer_id=customer_id, reason=body.reason,
    )
    return {"success": True, "message": result["message"], "data": result}


@router.get("/{booking_id}/receipt", summary="Get payment receipt for a booking")
async def get_receipt(
    booking_id: str,
    current_user: User = Depends(RequireCustomer),
):
    """Generate a payment receipt for a completed (paid) booking."""
    customer_id = await _get_customer_id(current_user.id)
    service = PaymentService()
    result = await service.get_receipt(booking_id=booking_id, customer_id=customer_id)
    return {"success": True, "message": "Receipt generated", "data": result}
