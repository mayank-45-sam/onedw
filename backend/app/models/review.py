import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Review(BaseModel):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(String(36), ForeignKey("services.id", ondelete="SET NULL"), nullable=True)
    rating = Column(Float, nullable=False)
    behaviour = Column(Integer, nullable=False)
    quality = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False)
    time_rating = Column("time", Integer, nullable=False)
    comment = Column(String(2000), nullable=True)
    work_images = Column(JSON, default=list, nullable=True)
    recommends = Column(Boolean, default=True, nullable=False)

    booking = relationship("Booking", back_populates="review")
    customer = relationship("Customer", back_populates="reviews")
    worker = relationship("Worker", back_populates="reviews")
    service = relationship("Service", back_populates="reviews")
