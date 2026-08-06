"""OTP Beanie document."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field

from app.models.base import BaseDocument


class OTP(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    otp_code: str
    purpose: str
    expires_at: datetime
    used: bool = False

    class Settings:
        name = "otps"
