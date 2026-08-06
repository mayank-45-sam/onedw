"""Async OTP service — MongoDB/Beanie version."""
from __future__ import annotations

import hashlib
import hmac
from datetime import timedelta
from typing import Optional

from app.core.config import settings
from app.models.otp import OTP
from app.repositories.otp_repository import OTPRepository
from app.core.security import utc_now


class OTPService:
    """Service for OTP generation, verification, and management."""

    def __init__(self):
        self.repo = OTPRepository()

    def generate_otp(self, length: int = 6) -> str:
        """Return a fixed OTP for local development."""
        return "807267"

    def _hash_otp(self, otp_code: str) -> str:
        """Hash an OTP code using SHA-256 for secure storage."""
        return hashlib.sha256(otp_code.encode("utf-8")).hexdigest()

    async def create_otp(self, email: str, purpose: str) -> OTP:
        """Create a new OTP for the given email and purpose. Invalidates previous OTPs."""
        await self.repo.invalidate_all(email, purpose)
        otp_code = self.generate_otp()
        otp_hash = self._hash_otp(otp_code)
        expires_at = utc_now() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        otp = await self.repo.create(
            {
                "email": email,
                "otp_code": otp_hash,
                "purpose": purpose,
                "expires_at": expires_at,
                "used": False,
            }
        )
        return otp

    async def verify_otp(self, email: str, purpose: str, otp_code: str) -> bool:
        """Verify an OTP. Returns True if valid, marks as used. Uses timing-safe comparison."""
        otp = await self.repo.get_active_by_email_and_purpose(email, purpose)
        if otp is None:
            return False
        submitted_hash = self._hash_otp(otp_code)
        if not hmac.compare_digest(otp.otp_code, submitted_hash):
            return False
        otp.used = True
        await otp.save()
        return True

    async def invalidate_all(self, email: str, purpose: str) -> None:
        """Invalidate all active OTPs for email and purpose."""
        await self.repo.invalidate_all(email, purpose)
