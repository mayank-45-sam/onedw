from typing import Optional, List
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func

from app.models.booking import Booking, BookingStatus
from app.models.booking_status_history import BookingStatusHistory
from app.repositories.base import BaseRepository


class BookingRepository(BaseRepository[Booking]):
    """Repository for Booking model operations."""

    def __init__(self, db: Session):
        super().__init__(Booking, db)

    def get_by_customer(self, customer_id: str, skip: int = 0, limit: int = 20) -> tuple[List[Booking], int]:
        query = self.db.query(Booking).filter(Booking.customer_id == customer_id)
        total = query.count()
        items = (
            query
            .options(selectinload(Booking.service), selectinload(Booking.worker))
            .order_by(Booking.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def get_by_worker(self, worker_id: str, skip: int = 0, limit: int = 20) -> tuple[List[Booking], int]:
        query = self.db.query(Booking).filter(Booking.worker_id == worker_id)
        total = query.count()
        items = (
            query
            .options(selectinload(Booking.service), selectinload(Booking.customer))
            .order_by(Booking.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def get_with_details(self, booking_id: str) -> Optional[Booking]:
        return (
            self.db.query(Booking)
            .options(
                selectinload(Booking.service),
                selectinload(Booking.worker),
                selectinload(Booking.customer),
                selectinload(Booking.status_history),
            )
            .filter(Booking.id == booking_id)
            .first()
        )

    def add_status_history(
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
        self.db.add(history)
        return history

    def count_by_worker(self, worker_id: str, status: Optional[str] = None) -> int:
        query = self.db.query(func.count(Booking.id)).filter(Booking.worker_id == worker_id)
        if status:
            query = query.filter(Booking.status == status)
        return query.scalar() or 0

    def count_completed_by_worker(self, worker_id: str) -> int:
        return self.count_by_worker(worker_id, BookingStatus.COMPLETED.value)
