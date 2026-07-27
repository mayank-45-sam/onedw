import uuid
from sqlalchemy import Column, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Complaint(BaseModel):
    __tablename__ = "complaints"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="SET NULL"), nullable=True)
    subject = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=False)
    status = Column(String(50), default="open", nullable=False)
    images = Column(JSON, default=list, nullable=True)
    resolved_at = Column(String(30), nullable=True)

    customer = relationship("Customer", back_populates="complaints")
