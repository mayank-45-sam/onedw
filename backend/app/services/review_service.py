from typing import Optional
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingStatus
from app.models.review import Review
from app.models.worker import Worker
from app.models.service import Service
from app.repositories.review_repository import ReviewRepository
from app.repositories.booking_repository import BookingRepository
from app.core.exceptions import BadRequestException, NotFoundException


class ReviewService:
    """Service for review operations."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = ReviewRepository(db)
        self.booking_repo = BookingRepository(db)

    def create_review(
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
        booking = self.booking_repo.get(booking_id)
        if booking is None:
            raise NotFoundException(message="Booking not found")

        if booking.customer_id != customer_id:
            raise BadRequestException(message="You can only review your own bookings")

        if booking.status != BookingStatus.COMPLETED:
            raise BadRequestException(message="Can only review completed bookings")

        existing = self.repo.get_by_booking(booking_id)
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
        self.db.add(review)
        self.db.flush()

        if booking.worker_id:
            self._update_worker_rating(booking.worker_id)
        if booking.service_id:
            self._update_service_rating(booking.service_id)

        self.db.commit()
        self.db.refresh(review)

        return self._serialize(review)

    def get_worker_reviews(
        self, worker_id: str, page: int = 1, limit: int = 20
    ) -> dict:
        skip = (page - 1) * limit
        items, total = self.repo.get_by_worker(
            worker_id=worker_id, skip=skip, limit=limit
        )
        pages = (total + limit - 1) // limit if limit > 0 else 0

        avg_rating = self.repo.get_worker_average_rating(worker_id)
        review_count = self.repo.get_worker_review_count(worker_id)

        return {
            "data": [self._serialize(r) for r in items],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
            "average_rating": avg_rating,
            "review_count": review_count,
        }

    def _update_worker_rating(self, worker_id: str) -> None:
        avg = self.repo.get_worker_average_rating(worker_id)
        count = self.repo.get_worker_review_count(worker_id)
        worker = self.db.query(Worker).filter(Worker.id == worker_id).first()
        if worker:
            worker.rating = avg
            worker.review_count = count

    def _update_service_rating(self, service_id: str) -> None:
        from sqlalchemy import func

        result = (
            self.db.query(func.avg(Review.rating))
            .filter(Review.service_id == service_id)
            .scalar()
        )
        count = (
            self.db.query(func.count(Review.id))
            .filter(Review.service_id == service_id)
            .scalar()
            or 0
        )
        service = self.db.query(Service).filter(Service.id == service_id).first()
        if service:
            service.rating = round(float(result), 2) if result else 0.0
            service.review_count = count

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
