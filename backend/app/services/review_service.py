"""Async Review service — Beanie version."""
from __future__ import annotations

from typing import Optional

from app.models.booking import Booking, BookingStatus
from app.models.review import Review
from app.models.worker import Worker
from app.models.service import Service
from app.repositories.review_repository import ReviewRepository
from app.repositories.booking_repository import BookingRepository
from app.core.exceptions import BadRequestException, NotFoundException


class ReviewService:
    """Service for review operations."""

    def __init__(self):
        self.repo = ReviewRepository()
        self.booking_repo = BookingRepository()

    async def create_review(
        self,
        customer_id: str,
        booking_id: str,
        rating: float,
        behaviour: int,
        quality: int,
        price: int,
        time_rating: int,
        comment: Optional[str] = None,
        work_images: Optional[list] = None,
        recommends: bool = True,
    ) -> dict:
        booking = await self.booking_repo.get(booking_id)
        if booking is None:
            raise NotFoundException(message="Booking not found")

        if booking.customer_id != customer_id:
            raise BadRequestException(message="You can only review your own bookings")

        status = booking.status.value if hasattr(booking.status, "value") else booking.status
        if status != BookingStatus.COMPLETED.value:
            raise BadRequestException(message="Can only review completed bookings")

        existing = await self.repo.get_by_booking(booking_id)
        if existing is not None:
            raise BadRequestException(message="You have already reviewed this booking")

        review = Review(
            booking_id=booking_id,
            customer_id=customer_id,
            worker_id=booking.worker_id,
            service_id=booking.service_id,
            rating=rating,
            behaviour=behaviour,
            quality=quality,
            price=price,
            time_rating=time_rating,
            comment=comment,
            work_images=work_images,
            recommends=recommends,
        )
        await review.insert()

        if booking.worker_id:
            await self._update_worker_rating(booking.worker_id)
        if booking.service_id:
            await self._update_service_rating(booking.service_id)

        return self._serialize(review)

    async def get_worker_reviews(self, worker_id: str, page: int = 1, limit: int = 20) -> dict:
        skip = (page - 1) * limit
        items, total = await self.repo.get_by_worker(worker_id=worker_id, skip=skip, limit=limit)
        pages = (total + limit - 1) // limit if limit > 0 else 0
        avg_rating = await self.repo.get_worker_average_rating(worker_id)
        review_count = await self.repo.get_worker_review_count(worker_id)
        return {
            "data": [self._serialize(r) for r in items],
            "total": total, "page": page, "limit": limit, "pages": pages,
            "average_rating": avg_rating, "review_count": review_count,
        }

    async def _update_worker_rating(self, worker_id: str) -> None:
        avg = await self.repo.get_worker_average_rating(worker_id)
        count = await self.repo.get_worker_review_count(worker_id)
        worker = await Worker.find_one(Worker.id == worker_id)
        if worker:
            worker.rating = avg
            worker.review_count = count
            await worker.save()

    async def _update_service_rating(self, service_id: str) -> None:
        reviews = await Review.find(Review.service_id == service_id).to_list()
        if reviews:
            avg = round(sum(r.rating for r in reviews) / len(reviews), 2)
            count = len(reviews)
        else:
            avg = 0.0
            count = 0
        service = await Service.find_one(Service.id == service_id)
        if service:
            service.rating = avg
            service.review_count = count
            await service.save()

    def _serialize(self, review) -> dict:
        return {
            "id": review.id,
            "booking_id": review.booking_id,
            "customer_id": review.customer_id,
            "worker_id": review.worker_id,
            "service_id": review.service_id,
            "rating": review.rating,
            "behaviour": review.behaviour,
            "quality": review.quality,
            "price": review.price,
            "comment": review.comment,
            "work_images": review.work_images,
            "recommends": review.recommends,
        }
