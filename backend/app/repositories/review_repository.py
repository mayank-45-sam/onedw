"""Async Review repository."""
from __future__ import annotations

from typing import List, Optional, Tuple

from app.models.review import Review
from app.repositories.base import BaseRepository


class ReviewRepository(BaseRepository[Review]):
    def __init__(self):
        super().__init__(Review)

    async def get_by_worker(self, worker_id: str, skip: int = 0, limit: int = 20) -> Tuple[List[Review], int]:
        total = await Review.find(Review.worker_id == worker_id).count()
        items = await Review.find(Review.worker_id == worker_id).sort("-created_at").skip(skip).limit(limit).to_list()
        return items, total

    async def get_by_booking(self, booking_id: str) -> Optional[Review]:
        return await Review.find_one(Review.booking_id == booking_id)

    async def get_by_customer(self, customer_id: str) -> List[Review]:
        return await Review.find(Review.customer_id == customer_id).to_list()

    async def get_worker_average_rating(self, worker_id: str) -> float:
        reviews = await Review.find(Review.worker_id == worker_id).to_list()
        if not reviews:
            return 0.0
        return round(sum(r.rating for r in reviews) / len(reviews), 2)

    async def get_worker_review_count(self, worker_id: str) -> int:
        return await Review.find(Review.worker_id == worker_id).count()
