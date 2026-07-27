import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime
from app.models.base import BaseModel


class Coupon(BaseModel):
    __tablename__ = "coupons"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    type = Column(String(10), nullable=False)
    value = Column(Float, nullable=False)
    max_discount = Column(Float, nullable=True)
    min_order = Column(Float, nullable=True)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=False)
    usage_limit = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    image = Column(String(500), nullable=True)
