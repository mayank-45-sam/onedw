"""Async Payment service — Beanie version."""
from __future__ import annotations

import time
import random
import string
from typing import Optional

from loguru import logger

from app.models.booking import Booking, PaymentStatus, PaymentMethod
from app.core.exceptions import BadRequestException, NotFoundException, ForbiddenException
from app.core.security import utc_now


FAILURE_CARD_NUMBERS = {"4000000000000002", "4000000000000069", "4000000000000127"}
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
    """Async payment processor using Beanie/Motor."""

    async def _get_booking(self, booking_id: str, customer_id: str) -> Booking:
        booking = await Booking.find_one(Booking.id == booking_id)
        if booking is None:
            raise NotFoundException(message="Booking not found")
        if booking.customer_id != customer_id:
            raise ForbiddenException(message="Not your booking")
        return booking

    async def process_payment(
        self,
        booking_id: str,
        customer_id: str,
        payment_method: str,
        card_number: Optional[str] = None,
        upi_id: Optional[str] = None,
    ) -> dict:
        booking = await self._get_booking(booking_id, customer_id)

        if payment_method not in ["card", "upi", "wallet", "cash"]:
            raise BadRequestException(message=f"Invalid payment method: {payment_method}")

        if _val(booking.payment_status) == PaymentStatus.PAID.value:
            raise BadRequestException(message="Payment already completed for this booking")

        logger.info(f"Payment processing started booking={booking.id} method={payment_method}")

        # Check failure conditions
        if payment_method == "card" and card_number:
            cleaned = card_number.replace(" ", "").replace("-", "")
            if cleaned in FAILURE_CARD_NUMBERS:
                logger.warning(f"Payment failed booking={booking.id} reason=card_declined")
                booking.payment_status = PaymentStatus.FAILED
                await booking.save()
                return {
                    "transaction_id": None, "booking_id": booking.id,
                    "amount": booking.final_price, "currency": getattr(booking, "currency", "INR"),
                    "payment_method": None, "payment_status": "failed",
                    "paid_at": None, "message": "Card declined by issuer. Try another card.",
                }

        if (booking.final_price or 0) > MAX_PAYMENT_AMOUNT:
            logger.warning(f"Payment failed booking={booking.id} reason=limit_exceeded")
            booking.payment_status = PaymentStatus.FAILED
            await booking.save()
            return {
                "transaction_id": None, "booking_id": booking.id,
                "amount": booking.final_price, "currency": getattr(booking, "currency", "INR"),
                "payment_method": None, "payment_status": "failed",
                "paid_at": None, "message": "Transaction limit exceeded. Try UPI or wallet.",
            }

        # Success
        txn_id = _generate_transaction_id()
        now = utc_now().isoformat()
        amount = booking.final_price

        booking.payment_status = PaymentStatus.PAID
        booking.payment_method = PaymentMethod(payment_method)
        booking.transaction_id = txn_id
        booking.paid_at = now
        await booking.save()

        logger.info(f"Payment completed booking={booking.id} txn={txn_id} amount={amount}")
        return {
            "transaction_id": txn_id, "booking_id": booking.id,
            "amount": amount, "currency": getattr(booking, "currency", "INR"),
            "payment_method": payment_method, "payment_status": "paid",
            "paid_at": now, "message": "Payment successful",
        }

    async def process_refund(
        self,
        booking_id: str,
        customer_id: str,
        reason: Optional[str] = None,
    ) -> dict:
        booking = await self._get_booking(booking_id, customer_id)

        if _val(booking.payment_status) == PaymentStatus.REFUNDED.value:
            raise BadRequestException(message="Booking already refunded")
        if _val(booking.payment_status) != PaymentStatus.PAID.value:
            raise BadRequestException(message="Only paid bookings can be refunded")

        logger.info(f"Refund started booking={booking.id}")

        txn_id = booking.transaction_id or ""
        refund_id = _generate_refund_id(txn_id)
        now = utc_now().isoformat()

        booking.payment_status = PaymentStatus.REFUNDED
        booking.status = "refunded"
        booking.refunded_at = now
        booking.refund_reason = reason
        await booking.save()

        logger.info(f"Refund completed booking={booking.id} txn={txn_id} refund_id={refund_id}")
        return {
            "booking_id": booking.id, "transaction_id": txn_id,
            "refund_id": refund_id, "amount": booking.final_price,
            "currency": getattr(booking, "currency", "INR"),
            "payment_status": "refunded", "status": "refunded",
            "refunded_at": now, "message": "Refund successful",
        }

    async def get_payment_status(self, booking_id: str, customer_id: str) -> dict:
        booking = await self._get_booking(booking_id, customer_id)
        return {
            "booking_id": booking.id,
            "payment_status": _val(booking.payment_status),
            "payment_method": _val(booking.payment_method) if booking.payment_method else None,
            "transaction_id": booking.transaction_id,
            "paid_at": booking.paid_at,
            "amount": booking.final_price,
            "currency": getattr(booking, "currency", "INR"),
        }

    async def get_receipt(self, booking_id: str, customer_id: str) -> dict:
        booking = await Booking.find_one(Booking.id == booking_id)
        if booking is None:
            raise NotFoundException(message="Booking not found")
        if booking.customer_id != customer_id:
            raise ForbiddenException(message="Not your booking")
        if _val(booking.payment_status) != PaymentStatus.PAID.value:
            raise BadRequestException(message="Receipt available only for paid bookings")

        from app.models.customer import Customer
        from app.models.worker import Worker
        from app.models.service import Service

        service = await Service.find_one(Service.id == booking.service_id) if booking.service_id else None
        customer = await Customer.find_one(Customer.id == booking.customer_id) if booking.customer_id else None
        worker = await Worker.find_one(Worker.id == booking.worker_id) if booking.worker_id else None

        txn_id = booking.transaction_id or ""
        receipt_id = _generate_receipt_id(txn_id)

        return {
            "receipt_id": receipt_id, "booking_id": booking.id,
            "service": service.name if service else "Unknown Service",
            "customer": customer.name if customer else "Customer",
            "worker": worker.name if worker else "Unassigned",
            "amount": booking.price, "discount": getattr(booking, "discount", 0.0) or 0.0,
            "total_paid": booking.final_price, "currency": getattr(booking, "currency", "INR"),
            "method": _val(booking.payment_method) if booking.payment_method else None,
            "transaction_id": txn_id, "date": booking.paid_at or "",
        }
