import uuid
from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Worker(BaseModel):
    __tablename__ = "workers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)
    cover_image = Column(String(500), nullable=True)
    profession = Column(String(255), nullable=False)
    bio = Column(String(1000), nullable=True)
    experience_years = Column(Integer, default=0, nullable=False)
    completed_jobs = Column(Integer, default=0, nullable=False)
    rating = Column(Float, default=0.0, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)
    hourly_rate = Column(Float, nullable=False)
    is_online = Column(Boolean, default=False, nullable=False)
    category_ids = Column(JSON, default=list, nullable=True)
    aadhaar_number_hash = Column(String(64), nullable=True, index=True)
    aadhaar_verified = Column(Boolean, default=False, nullable=False)
    aadhaar_verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_status = Column(String(30), nullable=True)  # not_started | in_progress | completed | rejected
    trust_score = Column(Float, nullable=True)
    verification_badge = Column(String(20), nullable=True)  # gold | pro | beginner | rejected

    user = relationship("User", back_populates="worker_profile")
    verifications = relationship("WorkerVerification", back_populates="worker", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="worker", foreign_keys="Booking.worker_id")
    reviews = relationship("Review", back_populates="worker")
    portfolio_images = relationship("PortfolioImage", back_populates="worker", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="worker", cascade="all, delete-orphan")
    availability = relationship("WorkerAvailability", back_populates="worker", cascade="all, delete-orphan")
    location = relationship("WorkerLocation", back_populates="worker", uselist=False, cascade="all, delete-orphan")
    skills = relationship("WorkerSkill", back_populates="worker", cascade="all, delete-orphan")
    languages = relationship("WorkerLanguage", back_populates="worker", cascade="all, delete-orphan")
