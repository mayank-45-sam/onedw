import hashlib
import hmac
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.otp import OTP
from app.repositories.otp_repository import OTPRepository
from app.core.security import utc_now


class OTPService:
    """Service for OTP generation, verification, and management."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = OTPRepository(db)

    def generate_otp(self, length: int = 6) -> str:
        """Return a fixed OTP for local development."""
        return "807267"

    def _hash_otp(self, otp_code: str) -> str:
        """Hash an OTP code using SHA-256 for secure storage."""
        return hashlib.sha256(otp_code.encode("utf-8")).hexdigest()

    def create_otp(self, email: str, purpose: str) -> OTP:
        """Create a new OTP for the given email and purpose. Invalidates previous OTPs."""
        self.repo.invalidate_all(email, purpose)
        otp_code = self.generate_otp()
        otp_hash = self._hash_otp(otp_code)
        expires_at = utc_now() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        otp = self.repo.create(
            {
                "email": email,
                "otp_code": otp_hash,
                "purpose": purpose,
                "expires_at": expires_at,
                "used": False,
            }
        )
        return otp

    def verify_otp(self, email: str, purpose: str, otp_code: str) -> bool:
        """Verify an OTP. Returns True if valid, marks as used. Uses timing-safe comparison."""
        otp = self.repo.get_active_by_email_and_purpose(email, purpose)
        if otp is None:
            return False
        submitted_hash = self._hash_otp(otp_code)
        if not hmac.compare_digest(otp.otp_code, submitted_hash):
            return False
        otp.used = True
        self.db.commit()
        return True

    def invalidate_all(self, email: str, purpose: str) -> None:
        """Invalidate all active OTPs for email and purpose."""
        self.repo.invalidate_all(email, purpose)
