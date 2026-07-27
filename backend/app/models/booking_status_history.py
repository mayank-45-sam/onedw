import uuid
from sqlalchemy import Column, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class BookingStatusHistory(BaseModel):
    __tablename__ = "booking_status_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), nullable=False)
    note = Column(String(500), nullable=True)
    changed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)

    booking = relationship("Booking", back_populates="status_history")
