import time
import random
import string
from typing import Optional
from sqlalchemy.orm import Session
from loguru import logger

from app.models.booking import Booking, PaymentStatus, PaymentMethod
from app.repositories.booking_repository import BookingRepository
from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
    ForbiddenException,
)
from app.core.security import utc_now


FAILURE_CARD_NUMBERS = {"4000000000000002", "4000000000000069", "4000000000000127"}
SIMULATED_DELAY_SECONDS = 2.0
REFUND_DELAY_SECONDS = 1.5
MAX_PAYMENT_AMOUNT = 50000.0


def _generate_transaction_id() -> str:
    ts = int(time.time() * 1000)
    rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"TXN{ts}{rand}"


def _generate_refund_id(transaction_id: str) -> str:
    short = transaction_id[-6:] if transaction_id else "".join(
        random.choices(string.ascii_uppercase + string.digits, k=6)
    )
    return f"REF-{short}"


def _generate_receipt_id(transaction_id: str) -> str:
    short = transaction_id[-8:] if transaction_id else "".join(
        random.choices(string.ascii_uppercase + string.digits, k=8)
    )
    return f"RCP-{short}"


def _val(enumer):
    return enumer.value if hasattr(enumer, "value") else enumer


class PaymentService:
    """Fake payment processor with pluggable validate/process split."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = BookingRepository(db)

    # ----------------------------------------------------------
    # PUBLIC API
    # ----------------------------------------------------------

    def process_payment(
        self,
        booking_id: str,
        customer_id: str,
        payment_method: str,
        card_number: Optional[str] = None,
        upi_id: Optional[str] = None,
    ) -> dict:
        booking = self._validate_booking(booking_id, customer_id)
        self._validate_payment_method(payment_method)
        self._validate_not_already_paid(booking)

        logger.info(f"Payment processing started booking={booking.id} method={payment_method}")

        failure = self._check_failure_conditions(booking, payment_method, card_number)
        if failure is not None:
            return failure

        return self._process_success(booking, customer_id, payment_method)

    def process_refund(
        self,
        booking_id: str,
        customer_id: str,
        reason: Optional[str] = None,
    ) -> dict:
        booking = self._validate_booking(booking_id, customer_id)
        self._validate_refundable(booking)

        logger.info(f"Refund started booking={booking.id}")

        time.sleep(REFUND_DELAY_SECONDS)

        txn_id = booking.transaction_id
        refund_id = _generate_refund_id(txn_id)
        now = utc_now().isoformat()

        booking.payment_status = PaymentStatus.REFUNDED
        booking.status = "refunded"
        booking.refunded_at = now
        booking.refund_reason = reason

        self.repo.add_status_history(
            booking_id=booking.id,
            status="refunded",
            note=f"Refund processed. Ref: {refund_id}. Original txn: {txn_id}"
                 + (f" Reason: {reason}" if reason else ""),
            changed_by=customer_id,
        )
        self.db.commit()
        self.db.refresh(booking)

        logger.info(f"Refund completed booking={booking.id} txn={txn_id} refund_id={refund_id}")

        return {
            "booking_id": booking.id,
            "transaction_id": txn_id,
            "refund_id": refund_id,
            "amount": booking.final_price,
            "currency": booking.currency,
            "payment_status": "refunded",
            "status": "refunded",
            "refunded_at": now,
            "message": "Refund successful",
        }

    def get_payment_status(self, booking_id: str, customer_id: str) -> dict:
        booking = self._validate_booking(booking_id, customer_id)

        logger.info(f"Payment status check booking={booking.id}")

        return {
            "booking_id": booking.id,
            "payment_status": _val(booking.payment_status),
            "payment_method": _val(booking.payment_method) if booking.payment_method else None,
            "transaction_id": booking.transaction_id,
            "paid_at": booking.paid_at,
            "amount": booking.final_price,
            "currency": booking.currency,
        }

    def get_receipt(self, booking_id: str, customer_id: str) -> dict:
        booking = self.repo.get_with_details(booking_id)
        if booking is None:
            raise NotFoundException(message="Booking not found")

        if booking.customer_id != customer_id:
            raise ForbiddenException(message="Not your booking")

        if _val(booking.payment_status) != PaymentStatus.PAID.value:
            raise BadRequestException(message="Receipt available only for paid bookings")

        logger.info(f"Receipt generated booking={booking.id}")

        service_name = booking.service.name if booking.service else "Unknown Service"
        customer_name = "Customer"
        worker_name = "Unassigned"

        if booking.customer:
            customer_name = booking.customer.name or "Customer"

        if booking.worker:
            worker_name = booking.worker.name or "Worker"

        txn_id = booking.transaction_id or ""
        receipt_id = _generate_receipt_id(txn_id)

        return {
            "receipt_id": receipt_id,
            "booking_id": booking.id,
            "service": service_name,
            "customer": customer_name,
            "worker": worker_name,
            "amount": booking.price,
            "discount": booking.discount or 0.0,
            "total_paid": booking.final_price,
            "currency": booking.currency,
            "method": _val(booking.payment_method) if booking.payment_method else None,
            "transaction_id": txn_id,
            "date": booking.paid_at or "",
        }

    # ----------------------------------------------------------
    # VALIDATION (pluggable for future gateway integration)
    # ----------------------------------------------------------

    def _validate_booking(self, booking_id: str, customer_id: str) -> Booking:
        booking = self.repo.get(booking_id)
        if booking is None:
            raise NotFoundException(message="Booking not found")

        if booking.customer_id != customer_id:
            raise ForbiddenException(message="Not your booking")

        return booking

    def _validate_payment_method(self, method: str) -> None:
        if method not in ["card", "upi", "wallet", "cash"]:
            raise BadRequestException(message=f"Invalid payment method: {method}")

    def _validate_not_already_paid(self, booking: Booking) -> None:
        if _val(booking.payment_status) == PaymentStatus.PAID.value:
            raise BadRequestException(message="Payment already completed for this booking")

    def _validate_refundable(self, booking: Booking) -> None:
        if _val(booking.payment_status) == PaymentStatus.REFUNDED.value:
            raise BadRequestException(message="Booking already refunded")

        if _val(booking.payment_status) != PaymentStatus.PAID.value:
            raise BadRequestException(message="Only paid bookings can be refunded")

    # ----------------------------------------------------------
    # FAILURE CONDITIONS
    # ----------------------------------------------------------

    def _check_failure_conditions(
        self,
        booking: Booking,
        payment_method: str,
        card_number: Optional[str],
    ) -> Optional[dict]:
        if payment_method == "card" and card_number:
            cleaned = card_number.replace(" ", "").replace("-", "")
            if cleaned in FAILURE_CARD_NUMBERS:
                logger.warning(f"Payment failed booking={booking.id} reason=card_declined")
                return self._process_failure(
                    booking, "Card declined by issuer. Try another card."
                )

        if booking.final_price > MAX_PAYMENT_AMOUNT:
            logger.warning(f"Payment failed booking={booking.id} reason=limit_exceeded")
            return self._process_failure(
                booking, "Transaction limit exceeded. Try UPI or wallet."
            )

        return None

    # ----------------------------------------------------------
    # PROCESS (success / failure)
    # ----------------------------------------------------------

    def _process_success(
        self,
        booking: Booking,
        customer_id: str,
        payment_method: str,
    ) -> dict:
        time.sleep(SIMULATED_DELAY_SECONDS)

        txn_id = _generate_transaction_id()
        now = utc_now().isoformat()
        amount = booking.final_price

        booking.payment_status = PaymentStatus.PAID
        booking.payment_method = PaymentMethod(payment_method)
        booking.transaction_id = txn_id
        booking.paid_at = now

        self.repo.add_status_history(
            booking_id=booking.id,
            status=booking.status.value,
            note=f"Payment of {booking.currency}{amount} received via {payment_method}. Ref: {txn_id}",
            changed_by=customer_id,
        )
        self.db.commit()
        self.db.refresh(booking)

        logger.info(f"Payment completed booking={booking.id} txn={txn_id} amount={amount}")

        return {
            "transaction_id": txn_id,
            "booking_id": booking.id,
            "amount": amount,
            "currency": booking.currency,
            "payment_method": payment_method,
            "payment_status": "paid",
            "paid_at": now,
            "message": "Payment successful",
        }

    def _process_failure(self, booking: Booking, reason: str) -> dict:
        booking.payment_status = PaymentStatus.FAILED
        self.db.commit()

        return {
            "transaction_id": None,
            "booking_id": booking.id,
            "amount": booking.final_price,
            "currency": booking.currency,
            "payment_method": None,
            "payment_status": "failed",
            "paid_at": None,
            "message": reason,
        }
