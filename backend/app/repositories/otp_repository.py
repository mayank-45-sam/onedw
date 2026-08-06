"""Async OTP repository."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.models.otp import OTP
from app.repositories.base import BaseRepository


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class OTPRepository(BaseRepository[OTP]):
    def __init__(self):
        super().__init__(OTP)

    async def get_active_by_email_and_purpose(self, email: str, purpose: str) -> Optional[OTP]:
        now = utc_now()
        return await OTP.find_one(
            OTP.email == email,
            OTP.purpose == purpose,
            OTP.used == False,
            OTP.expires_at > now,
        )

    async def invalidate_all(self, email: str, purpose: str) -> None:
        otps = await OTP.find(OTP.email == email, OTP.purpose == purpose, OTP.used == False).to_list()
        for otp in otps:
            otp.used = True
            await otp.save()

    async def delete_expired(self) -> int:
        now = utc_now()
        expired = await OTP.find(OTP.expires_at < now).to_list()
        count = len(expired)
        for otp in expired:
            await otp.delete()
        return count
