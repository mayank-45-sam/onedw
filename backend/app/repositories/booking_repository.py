"""Async Booking repository."""
from __future__ import annotations

from typing import List, Optional, Tuple

from app.models.booking import Booking, BookingStatus
from app.models.booking_status_history import BookingStatusHistory
from app.repositories.base import BaseRepository


class BookingRepository(BaseRepository[Booking]):
    def __init__(self):
        super().__init__(Booking)

    async def get_by_customer(self, customer_id: str, skip: int = 0, limit: int = 20) -> Tuple[List[Booking], int]:
        total = await Booking.find(Booking.customer_id == customer_id).count()
        items = await Booking.find(Booking.customer_id == customer_id).sort("-created_at").skip(skip).limit(limit).to_list()
        return items, total

    async def get_by_worker(self, worker_id: str, skip: int = 0, limit: int = 20) -> Tuple[List[Booking], int]:
        total = await Booking.find(Booking.worker_id == worker_id).count()
        items = await Booking.find(Booking.worker_id == worker_id).sort("-created_at").skip(skip).limit(limit).to_list()
        return items, total

    async def get_with_details(self, booking_id: str) -> Optional[Booking]:
        return await Booking.find_one(Booking.id == booking_id)

    async def add_status_history(
        self,
        booking_id: str,
        status: str,
        note: Optional[str] = None,
        changed_by: Optional[str] = None,
    ) -> BookingStatusHistory:
        history = BookingStatusHistory(
            booking_id=booking_id,
            status=status,
            note=note,
            changed_by=changed_by,
        )
        await history.insert()
        return history

    async def count_by_worker(self, worker_id: str, status: Optional[str] = None) -> int:
        if status:
            return await Booking.find(Booking.worker_id == worker_id, Booking.status == status).count()
        return await Booking.find(Booking.worker_id == worker_id).count()

    async def count_completed_by_worker(self, worker_id: str) -> int:
        return await self.count_by_worker(worker_id, BookingStatus.COMPLETED.value)
