import uuid
import enum
from sqlalchemy import Column, String, Float, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class TransactionType(str, enum.Enum):
    CREDIT = "credit"
    DEBIT = "debit"


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class WalletTransaction(BaseModel):
    __tablename__ = "wallet_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_id = Column(String(36), ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(SAEnum(TransactionType, name="transaction_type", create_constraint=True), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    status = Column(SAEnum(TransactionStatus, name="transaction_status", create_constraint=True), nullable=False, default=TransactionStatus.PENDING)
    description = Column(String(500), nullable=False)
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    reference = Column(String(255), nullable=True)

    wallet = relationship("Wallet", back_populates="transactions")
