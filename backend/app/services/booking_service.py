from typing import Optional
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingStatus
from app.models.customer import Customer
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

    def __init__(self, db: Session):
        self.db = db
        self.repo = BookingRepository(db)
        self.worker_repo = WorkerRepository(db)
        self.service_repo = ServiceRepository(db)
        self.coupon_service = CouponService(db)

    def create_booking(
        self,
        customer_id: str,
        service_id: str,
        problem_description: str,
        scheduled_date: str,
        scheduled_time: str,
        address: dict,
        worker_id: Optional[str] = None,
        coupon_code: Optional[str] = None,
        problem_images: Optional[list] = None,
    ) -> dict:
        service = self.service_repo.get(service_id)
        if service is None:
            raise NotFoundException(message="Service not found")

        if worker_id:
            worker = self.worker_repo.get(worker_id)
            if worker is None:
                raise NotFoundException(message="Worker not found")

        price = service.base_price
        discount = 0.0
        coupon_code_used = None

        if coupon_code:
            discount, coupon = self.coupon_service.validate_and_apply(
                coupon_code, price
            )
            coupon_code_used = coupon.code
            self.coupon_service.increment_usage(coupon)

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
        )
        self.db.add(booking)
        self.db.flush()

        self.repo.add_status_history(
            booking_id=booking.id,
            status=BookingStatus.PENDING.value,
            note="Booking created",
            changed_by=customer_id,
        )
        self.db.commit()
        self.db.refresh(booking)

        return self._serialize_booking(booking)

    def get_booking(self, booking_id: str) -> dict:
        booking = self.repo.get_with_details(booking_id)
        if booking is None:
            raise NotFoundException(message="Booking not found")
        return self._serialize_booking_detail(booking)

    def get_my_bookings(
        self, customer_id: str, page: int = 1, limit: int = 20
    ) -> dict:
        skip = (page - 1) * limit
        items, total = self.repo.get_by_customer(
            customer_id=customer_id, skip=skip, limit=limit
        )
        pages = (total + limit - 1) // limit if limit > 0 else 0

        return {
            "data": [self._serialize_booking(b) for b in items],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    def get_worker_bookings(
        self, worker_id: str, page: int = 1, limit: int = 20
    ) -> dict:
        skip = (page - 1) * limit
        items, total = self.repo.get_by_worker(
            worker_id=worker_id, skip=skip, limit=limit
        )
        pages = (total + limit - 1) // limit if limit > 0 else 0

        return {
            "data": [self._serialize_booking(b) for b in items],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    def update_booking_status(
        self,
        booking_id: str,
        new_status: str,
        user_id: str,
        user_role: str,
        note: Optional[str] = None,
    ) -> dict:
        booking = self.repo.get_with_details(booking_id)
        if booking is None:
            raise NotFoundException(message="Booking not found")

        if new_status not in [s.value for s in BookingStatus]:
            raise BadRequestException(message=f"Invalid status: {new_status}")

        current = booking.status.value
        allowed = VALID_STATUS_TRANSITIONS.get(current, [])
        if new_status not in allowed:
            raise BadRequestException(
                message=f"Cannot transition from '{current}' to '{new_status}'"
            )

        if user_role == "worker":
            worker = self.worker_repo.get_by_user_id(user_id)
            if worker is None or booking.worker_id != worker.id:
                raise ForbiddenException(message="Not assigned to this booking")

        booking.status = BookingStatus(new_status)
        self.repo.add_status_history(
            booking_id=booking.id,
            status=new_status,
            note=note,
            changed_by=user_id,
        )
        self.db.commit()
        self.db.refresh(booking)

        return self._serialize_booking_detail(booking)

    def _serialize_booking(self, b) -> dict:
        payment_status = b.payment_status.value if hasattr(b.payment_status, "value") else b.payment_status
        payment_method = b.payment_method.value if b.payment_method and hasattr(b.payment_method, "value") else b.payment_method

        return {
            "id": b.id,
            "customer_id": b.customer_id,
            "worker_id": b.worker_id,
            "service_id": b.service_id,
            "status": b.status.value if hasattr(b.status, "value") else b.status,
            "payment_status": payment_status,
            "payment_method": payment_method,
            "payment": {
                "status": payment_status,
                "method": payment_method,
                "transaction_id": b.transaction_id,
                "amount": b.final_price,
                "paid_at": b.paid_at,
                "refunded_at": getattr(b, "refunded_at", None),
                "refund_reason": getattr(b, "refund_reason", None),
            },
            "problem_description": b.problem_description,
            "problem_images": b.problem_images,
            "scheduled_date": b.scheduled_date,
            "scheduled_time": b.scheduled_time,
            "address": b.address,
            "price": b.price,
            "currency": b.currency,
            "coupon_code": b.coupon_code,
            "discount": b.discount,
            "final_price": b.final_price,
            "transaction_id": b.transaction_id,
            "paid_at": b.paid_at,
            "eta_minutes": b.eta_minutes,
            "distance_km": b.distance_km,
        }

    def _serialize_booking_detail(self, b) -> dict:
        data = self._serialize_booking(b)

        if b.service:
            data["service"] = {
                "id": b.service.id,
                "name": b.service.name,
                "slug": b.service.slug,
                "description": b.service.description,
                "category_id": b.service.category_id,
                "image": b.service.image,
                "gallery": b.service.gallery,
                "base_price": b.service.base_price,
                "duration": b.service.duration,
                "rating": b.service.rating,
                "review_count": b.service.review_count,
                "popular": b.service.popular,
                "trending": b.service.trending,
                "tags": b.service.tags,
            }

        if b.worker:
            data["worker"] = {
                "id": b.worker.id,
                "user_id": b.worker.user_id,
                "name": b.worker.name,
                "avatar": b.worker.avatar,
                "cover_image": b.worker.cover_image,
                "profession": b.worker.profession,
                "bio": b.worker.bio,
                "experience_years": b.worker.experience_years,
                "completed_jobs": b.worker.completed_jobs,
                "rating": b.worker.rating,
                "review_count": b.worker.review_count,
                "hourly_rate": b.worker.hourly_rate,
                "is_online": b.worker.is_online,
                "category_ids": b.worker.category_ids,
            }

        if b.status_history:
            data["status_history"] = [
                {
                    "id": h.id,
                    "status": h.status,
                    "note": h.note,
                    "changed_by": h.changed_by,
                    "created_at": h.created_at.isoformat() if h.created_at else None,
                }
                for h in sorted(b.status_history, key=lambda x: x.created_at or x.id)
            ]

        return data
