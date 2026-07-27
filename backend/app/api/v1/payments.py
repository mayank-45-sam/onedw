from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import RequireCustomer
from app.models.user import User
from app.schemas.payment import (
    PaymentProcessRequest,
    PaymentRefundRequest,
    PaymentRefundResponse,
    PaymentReceiptResponse,
)
from app.services.payment_service import PaymentService
from app.core.exceptions import BadRequestException

router = APIRouter(prefix="/payments", tags=["Payments"])


def _get_customer_id(db: Session, user_id: str) -> str:
    from app.models.customer import Customer

    cust = db.query(Customer).filter(Customer.user_id == user_id).first()
    if cust is None:
        raise BadRequestException(message="Customer profile not found")
    return cust.id


@router.post(
    "/process",
    summary="Process payment for a booking",
)
def process_payment(
    body: PaymentProcessRequest,
    current_user: User = Depends(RequireCustomer),
    db: Session = Depends(get_db),
):
    """Process a simulated payment for a pending booking."""
    customer_id = _get_customer_id(db, current_user.id)
    service = PaymentService(db)
    result = service.process_payment(
        booking_id=body.booking_id,
        customer_id=customer_id,
        payment_method=body.payment_method,
        card_number=body.card_number,
        upi_id=body.upi_id,
    )

    if result["payment_status"] == "failed":
        return {"success": False, "message": result["message"], "data": result}

    return {"success": True, "message": result["message"], "data": result}


@router.get(
    "/{booking_id}/status",
    summary="Check payment status for a booking",
)
def get_payment_status(
    booking_id: str,
    current_user: User = Depends(RequireCustomer),
    db: Session = Depends(get_db),
):
    """Check the current payment status of a booking."""
    customer_id = _get_customer_id(db, current_user.id)
    service = PaymentService(db)
    result = service.get_payment_status(
        booking_id=booking_id,
        customer_id=customer_id,
    )
    return {"success": True, "message": "Payment status retrieved", "data": result}


@router.post(
    "/{booking_id}/refund",
    summary="Refund a paid booking",
)
def refund_payment(
    booking_id: str,
    body: PaymentRefundRequest = PaymentRefundRequest(),
    current_user: User = Depends(RequireCustomer),
    db: Session = Depends(get_db),
):
    """Refund a previously paid booking. Sets payment and booking status to refunded."""
    customer_id = _get_customer_id(db, current_user.id)
    service = PaymentService(db)
    result = service.process_refund(
        booking_id=booking_id,
        customer_id=customer_id,
        reason=body.reason,
    )
    return {"success": True, "message": result["message"], "data": result}


@router.get(
    "/{booking_id}/receipt",
    summary="Get payment receipt for a booking",
)
def get_receipt(
    booking_id: str,
    current_user: User = Depends(RequireCustomer),
    db: Session = Depends(get_db),
):
    """Generate a payment receipt for a completed (paid) booking."""
    customer_id = _get_customer_id(db, current_user.id)
    service = PaymentService(db)
    result = service.get_receipt(
        booking_id=booking_id,
        customer_id=customer_id,
    )
    return {"success": True, "message": "Receipt generated", "data": result}
