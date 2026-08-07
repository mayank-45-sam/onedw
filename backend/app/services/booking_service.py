"""Async Booking service — Beanie version."""
from __future__ import annotations

from typing import Optional

from app.models.booking import Booking, BookingStatus, BookingType
from app.models.customer import Customer
from app.models.service import Service
from app.models.worker import Worker
from app.repositories.booking_repository import BookingRepository
from app.repositories.worker_repository import WorkerRepository
from app.repositories.service_repository import ServiceRepository
from app.services.coupon_service import CouponService
from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
    ForbiddenException,
)
from app.core.security import utc_now
from app.core.socketio import emit_to_user


VALID_STATUS_TRANSITIONS = {
    BookingStatus.PENDING.value: [BookingStatus.ACCEPTED.value, BookingStatus.CANCELLED.value],
    BookingStatus.ACCEPTED.value: [BookingStatus.WORKER_ASSIGNED.value, BookingStatus.CANCELLED.value],
    BookingStatus.WORKER_ASSIGNED.value: [BookingStatus.WORKER_ON_THE_WAY.value, BookingStatus.CANCELLED.value],
    BookingStatus.WORKER_ON_THE_WAY.value: [BookingStatus.ARRIVED.value, BookingStatus.CANCELLED.value],
    BookingStatus.ARRIVED.value: [BookingStatus.STARTED_WORK.value, BookingStatus.CANCELLED.value],
    BookingStatus.STARTED_WORK.value: [BookingStatus.COMPLETED.value, BookingStatus.CANCELLED.value],
    BookingStatus.COMPLETED.value: [],
    BookingStatus.CANCELLED.value: [],
    BookingStatus.REFUNDED.value: [],
}


class BookingService:
    """Service for booking operations."""

    def __init__(self):
        self.repo = BookingRepository()
        self.worker_repo = WorkerRepository()
        self.service_repo = ServiceRepository()
        self.coupon_service = CouponService()

    async def create_booking(
        self,
        customer_id: str,
        user_id: str,
        service_id: str,
        problem_description: str,
        scheduled_date: str,
        scheduled_time: str,
        address: dict,
        worker_id: Optional[str] = None,
        coupon_code: Optional[str] = None,
        problem_images: Optional[list] = None,
        booking_type: Optional[str] = "scheduled",
        is_emergency: bool = False,
        eta_minutes: Optional[int] = None,
    ) -> dict:
        service = await self.service_repo.get(service_id)
        if service is None:
            raise NotFoundException(message="Service not found")

        worker = None
        if worker_id:
            worker = await self.worker_repo.get(worker_id)
            if worker is None:
                raise NotFoundException(message="Worker not found")

        price = service.base_price
        discount = 0.0
        coupon_code_used = None

        if coupon_code:
            discount, coupon = await self.coupon_service.validate_and_apply(coupon_code, price)
            coupon_code_used = coupon.code
            await self.coupon_service.increment_usage(coupon)

        final_price = round(price - discount, 2)

        booking = Booking(
            customer_id=customer_id,
            worker_id=worker_id,
            service_id=service_id,
            status=BookingStatus.PENDING,
            payment_status="unpaid",
            problem_description=problem_description,
            problem_images=problem_images or [],
            scheduled_date=scheduled_date,
            scheduled_time=scheduled_time,
            address=address,
            price=price,
            currency="INR",
            coupon_code=coupon_code_used,
            discount=discount,
            final_price=final_price,
            eta_minutes=eta_minutes,
            booking_type=BookingType(booking_type) if booking_type else BookingType.SCHEDULED,
            is_emergency=is_emergency,
        )
        await booking.insert()

        await self.repo.add_status_history(
            booking_id=booking.id,
            status=BookingStatus.PENDING.value,
            note="Booking created",
            changed_by=user_id,
        )

        # Real-time: notify the assigned worker (and the customer) instantly.
        if worker_id and worker is not None:
            emit_to_user(
                worker.user_id,
                "booking:new",
                {"booking": self._serialize_booking(booking), "message": "You have a new booking request"},
            )
        customer = await Customer.find_one(Customer.id == customer_id)
        if customer:
            emit_to_user(
                customer.user_id,
                "booking:created",
                {"booking": self._serialize_booking(booking), "message": "Booking created — waiting for the worker to accept"},
            )

        return self._serialize_booking(booking)

    async def get_booking(self, booking_id: str) -> dict:
        booking = await self.repo.get(booking_id)
        if booking is None:
            raise NotFoundException(message="Booking not found")
        return await self._serialize_booking_detail(booking)

    async def get_my_bookings(self, customer_id: str, page: int = 1, limit: int = 20) -> dict:
        skip = (page - 1) * limit
        items, total = await self.repo.get_by_customer(customer_id=customer_id, skip=skip, limit=limit)
        pages = (total + limit - 1) // limit if limit > 0 else 0
        return {
            "data": [self._serialize_booking(b) for b in items],
            "total": total, "page": page, "limit": limit, "pages": pages,
        }

    async def get_worker_bookings(self, worker_id: str, page: int = 1, limit: int = 20) -> dict:
        skip = (page - 1) * limit
        items, total = await self.repo.get_by_worker(worker_id=worker_id, skip=skip, limit=limit)
        pages = (total + limit - 1) // limit if limit > 0 else 0
        return {
            "data": [self._serialize_booking(b) for b in items],
            "total": total, "page": page, "limit": limit, "pages": pages,
        }

    async def update_booking_status(
        self,
        booking_id: str,
        new_status: str,
        user_id: str,
        user_role: str,
        note: Optional[str] = None,
    ) -> dict:
        booking = await self.repo.get(booking_id)
        if booking is None:
            raise NotFoundException(message="Booking not found")

        if new_status not in [s.value for s in BookingStatus]:
            raise BadRequestException(message=f"Invalid status: {new_status}")

        current = booking.status.value if hasattr(booking.status, "value") else booking.status
        allowed = VALID_STATUS_TRANSITIONS.get(current, [])

        # Role-based guards: customers may only cancel; workers must be assigned.
        if user_role == "customer" and new_status != BookingStatus.CANCELLED.value:
            raise ForbiddenException(message="Customers can only cancel a booking")
        if user_role == "admin" and new_status == BookingStatus.REFUNDED.value:
            if current in (BookingStatus.COMPLETED.value, BookingStatus.CANCELLED.value):
                allowed = allowed + [BookingStatus.REFUNDED.value]

        if new_status not in allowed:
            raise BadRequestException(message=f"Cannot transition from '{current}' to '{new_status}'")

        if user_role == "worker":
            worker = await self.worker_repo.get_by_user_id(user_id)
            if worker is None or booking.worker_id != worker.id:
                raise ForbiddenException(message="Not assigned to this booking")

        booking.status = BookingStatus(new_status)
        await booking.save()

        await self.repo.add_status_history(
            booking_id=booking.id, status=new_status, note=note, changed_by=user_id,
        )

        # Real-time push status updates
        detail = await self._serialize_booking_detail(booking)
        for uid in await self._booking_user_ids(booking):
            emit_to_user(
                uid, "booking:updated",
                {"booking": detail, "prev_status": current, "changed_by": user_role,
                 "message": self._status_message(current, new_status, user_role, note)},
            )

        return detail

    async def _booking_user_ids(self, booking: Booking) -> list:
        uids = []
        if booking.customer_id:
            c = await Customer.find_one(Customer.id == booking.customer_id)
            if c:
                uids.append(c.user_id)
        if booking.worker_id:
            w = await Worker.find_one(Worker.id == booking.worker_id)
            if w:
                uids.append(w.user_id)
        return uids

    def _status_message(self, prev_status: str, new_status: str, changed_by: str, note: Optional[str]) -> str:
        labels = {
            BookingStatus.ACCEPTED.value: "Your booking was accepted by the worker",
            BookingStatus.WORKER_ASSIGNED.value: "A worker has been assigned to your booking",
            BookingStatus.WORKER_ON_THE_WAY.value: "The worker is on the way",
            BookingStatus.ARRIVED.value: "The worker has arrived",
            BookingStatus.STARTED_WORK.value: "The worker has started the work",
            BookingStatus.COMPLETED.value: "Your booking was completed",
            BookingStatus.CANCELLED.value: (
                "The worker rejected this request" if changed_by == "worker" else "This booking was cancelled"
            ),
        }
        return labels.get(new_status, f"Booking status updated to '{new_status}'")

    def _serialize_booking(self, b) -> dict:
        payment_status = b.payment_status.value if hasattr(b.payment_status, "value") else b.payment_status
        payment_method = b.payment_method.value if b.payment_method and hasattr(b.payment_method, "value") else b.payment_method
        return {
            "id": b.id,
            "customer_id": b.customer_id, "worker_id": b.worker_id, "service_id": b.service_id,
            "status": b.status.value if hasattr(b.status, "value") else b.status,
            "payment_status": payment_status, "payment_method": payment_method,
            "payment": {
                "status": payment_status, "method": payment_method,
                "transaction_id": b.transaction_id, "amount": b.final_price,
                "paid_at": b.paid_at, "refunded_at": getattr(b, "refunded_at", None),
                "refund_reason": getattr(b, "refund_reason", None),
            },
            "problem_description": b.problem_description, "problem_images": b.problem_images,
            "scheduled_date": b.scheduled_date, "scheduled_time": b.scheduled_time,
            "address": b.address, "price": b.price, "currency": b.currency,
            "coupon_code": b.coupon_code, "discount": b.discount, "final_price": b.final_price,
            "transaction_id": b.transaction_id, "paid_at": b.paid_at,
            "eta_minutes": b.eta_minutes, "distance_km": b.distance_km,
            "booking_type": b.booking_type.value if hasattr(b.booking_type, "value") else b.booking_type,
            "is_emergency": b.is_emergency,
        }

    async def _serialize_booking_detail(self, b) -> dict:
        data = self._serialize_booking(b)

        if b.service_id:
            svc = await Service.find_one(Service.id == b.service_id)
            if svc:
                data["service"] = {
                    "id": svc.id, "name": svc.name, "slug": svc.slug,
                    "description": svc.description, "category_id": svc.category_id,
                    "image": svc.image, "gallery": svc.gallery, "base_price": svc.base_price,
                    "duration": svc.duration, "rating": svc.rating, "review_count": svc.review_count,
                    "popular": svc.popular, "trending": svc.trending, "tags": svc.tags,
                }

        if b.worker_id:
            wrk = await Worker.find_one(Worker.id == b.worker_id)
            if wrk:
                data["worker"] = {
                    "id": wrk.id, "user_id": wrk.user_id, "name": wrk.name, "avatar": wrk.avatar,
                    "cover_image": wrk.cover_image, "profession": wrk.profession, "bio": wrk.bio,
                    "experience_years": wrk.experience_years, "completed_jobs": wrk.completed_jobs,
                    "rating": wrk.rating, "review_count": wrk.review_count,
                    "hourly_rate": wrk.hourly_rate, "is_online": wrk.is_online,
                    "category_ids": wrk.category_ids,
                }

        if b.customer_id:
            cust = await Customer.find_one(Customer.id == b.customer_id)
            if cust:
                data["customer"] = {"id": cust.id, "name": cust.name, "avatar": cust.avatar, "user_id": cust.user_id}

        return data
