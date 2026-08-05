import uuid
import enum
from sqlalchemy import Column, String, Text, Float, Integer, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class CustomJobStatus(str, enum.Enum):
    OPEN = "open"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class BidStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COUNTERED = "countered"


class CustomJob(BaseModel):
    __tablename__ = "custom_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    budget_min = Column(Float, nullable=False)
    budget_max = Column(Float, nullable=False)
    urgency = Column(String(30), nullable=True)
    preferred_time = Column(String(100), nullable=True)
    images = Column(Text, nullable=True)
    status = Column(
        SAEnum(CustomJobStatus, name="custom_job_status", create_constraint=True),
        nullable=False,
        default=CustomJobStatus.OPEN,
    )

    category = relationship("Category", backref="custom_jobs")
    bids = relationship("JobBid", back_populates="job", cascade="all, delete-orphan")
    negotiation_messages = relationship(
        "NegotiationMessage", back_populates="job", cascade="all, delete-orphan"
    )


class JobBid(BaseModel):
    __tablename__ = "job_bids"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("custom_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    bid_amount = Column(Float, nullable=False)
    message = Column(Text, nullable=True)
    estimated_time = Column(String(100), nullable=True)
    status = Column(
        SAEnum(BidStatus, name="bid_status", create_constraint=True),
        nullable=False,
        default=BidStatus.PENDING,
    )

    job = relationship("CustomJob", back_populates="bids")
    worker = relationship("Worker", backref="job_bids")


class NegotiationMessage(BaseModel):
    __tablename__ = "negotiation_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("custom_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    message = Column(Text, nullable=True)
    proposed_price = Column(Float, nullable=True)

    job = relationship("CustomJob", back_populates="negotiation_messages")
    sender = relationship("User", foreign_keys=[sender_id], backref="sent_negotiation_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], backref="received_negotiation_messages")
