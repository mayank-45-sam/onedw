import uuid
from sqlalchemy import Column, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Customer(BaseModel):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)
    address = Column(JSON, nullable=True)
    favorite_services = Column(JSON, default=list, nullable=True)
    favorite_workers = Column(JSON, default=list, nullable=True)

    user = relationship("User", back_populates="customer_profile")
    bookings = relationship("Booking", back_populates="customer", foreign_keys="Booking.customer_id")
    reviews = relationship("Review", back_populates="customer")
    complaints = relationship("Complaint", back_populates="customer")
