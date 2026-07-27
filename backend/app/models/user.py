import uuid
from sqlalchemy import Column, String, Boolean, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    WORKER = "worker"
    ADMIN = "admin"


class User(BaseModel):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole, name="user_role", create_constraint=True), nullable=False, default=UserRole.CUSTOMER)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    customer_profile = relationship("Customer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    worker_profile = relationship("Worker", back_populates="user", uselist=False, cascade="all, delete-orphan")
    admin_profile = relationship("Admin", back_populates="user", uselist=False, cascade="all, delete-orphan")
    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
