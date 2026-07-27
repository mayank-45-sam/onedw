from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.review import Review
from app.repositories.base import BaseRepository


class ReviewRepository(BaseRepository[Review]):
    """Repository for Review model operations."""

    def __init__(self, db: Session):
        super().__init__(Review, db)

    def get_by_worker(
        self, worker_id: str, skip: int = 0, limit: int = 20
    ) -> tuple[List[Review], int]:
        query = self.db.query(Review).filter(Review.worker_id == worker_id)
        total = query.count()
        items = (
            query.order_by(Review.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def get_by_booking(self, booking_id: str) -> Optional[Review]:
        return self.db.query(Review).filter(Review.booking_id == booking_id).first()

    def get_by_customer(self, customer_id: str) -> List[Review]:
        return self.db.query(Review).filter(Review.customer_id == customer_id).all()

    def get_worker_average_rating(self, worker_id: str) -> float:
        result = (
            self.db.query(func.avg(Review.rating))
            .filter(Review.worker_id == worker_id)
            .scalar()
        )
        return round(float(result), 2) if result else 0.0

    def get_worker_review_count(self, worker_id: str) -> int:
        return (
            self.db.query(func.count(Review.id))
            .filter(Review.worker_id == worker_id)
            .scalar()
            or 0
        )
