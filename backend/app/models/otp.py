import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from app.models.base import BaseModel


class OTP(BaseModel):
    __tablename__ = "otps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False, index=True)
    otp_code = Column(String(6), nullable=False)
    purpose = Column(String(50), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
