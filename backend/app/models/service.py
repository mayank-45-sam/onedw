import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Service(BaseModel):
    __tablename__ = "services"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(String(2000), nullable=False)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    image = Column(String(500), nullable=True)
    gallery = Column(JSON, default=list, nullable=True)
    base_price = Column(Float, nullable=False)
    duration = Column(Integer, nullable=False)
    rating = Column(Float, default=0.0, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)
    popular = Column(Boolean, default=False, nullable=False)
    trending = Column(Boolean, default=False, nullable=False)
    tags = Column(JSON, default=list, nullable=True)

    category = relationship("Category", back_populates="services")
    bookings = relationship("Booking", back_populates="service")
    reviews = relationship("Review", back_populates="service")
