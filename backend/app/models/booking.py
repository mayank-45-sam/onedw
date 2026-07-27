import uuid
import enum
from sqlalchemy import Column, String, Float, Integer, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    WORKER_ASSIGNED = "worker-assigned"
    WORKER_ON_THE_WAY = "worker-on-the-way"
    ARRIVED = "arrived"
    STARTED_WORK = "started-work"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(str, enum.Enum):
    UNPAID = "unpaid"
    PAID = "paid"
    REFUNDED = "refunded"
    FAILED = "failed"


class PaymentMethod(str, enum.Enum):
    WALLET = "wallet"
    CARD = "card"
    CASH = "cash"
    UPI = "upi"


class Booking(BaseModel):
    __tablename__ = "bookings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="SET NULL"), nullable=True, index=True)
    service_id = Column(String(36), ForeignKey("services.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(SAEnum(BookingStatus, name="booking_status", create_constraint=True), nullable=False, default=BookingStatus.PENDING)
    payment_status = Column(SAEnum(PaymentStatus, name="payment_status", create_constraint=True), nullable=False, default=PaymentStatus.UNPAID)
    payment_method = Column(SAEnum(PaymentMethod, name="payment_method", create_constraint=True), nullable=True)
    problem_description = Column(String(2000), nullable=False)
    problem_images = Column(JSON, default=list, nullable=True)
    scheduled_date = Column(String(20), nullable=False)
    scheduled_time = Column(String(20), nullable=False)
    address = Column(JSON, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    coupon_code = Column(String(50), nullable=True)
    discount = Column(Float, default=0.0, nullable=True)
    final_price = Column(Float, nullable=False)
    transaction_id = Column(String(100), nullable=True)
    paid_at = Column(String(30), nullable=True)
    refunded_at = Column(String(30), nullable=True)
    refund_reason = Column(String(500), nullable=True)
    eta_minutes = Column(Integer, nullable=True)
    distance_km = Column(Float, nullable=True)

    customer = relationship("Customer", back_populates="bookings")
    worker = relationship("Worker", back_populates="bookings")
    service = relationship("Service", back_populates="bookings")
    status_history = relationship("BookingStatusHistory", back_populates="booking", cascade="all, delete-orphan")
    review = relationship("Review", back_populates="booking", uselist=False)
