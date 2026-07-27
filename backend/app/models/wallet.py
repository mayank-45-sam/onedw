import uuid
from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Wallet(BaseModel):
    __tablename__ = "wallets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    balance = Column(Float, default=0.0, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    pending_balance = Column(Float, default=0.0, nullable=False)
    total_earnings = Column(Float, default=0.0, nullable=False)
    total_spent = Column(Float, default=0.0, nullable=False)

    user = relationship("User", back_populates="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet", cascade="all, delete-orphan")
