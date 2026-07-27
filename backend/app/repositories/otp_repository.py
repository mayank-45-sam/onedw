from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.otp import OTP
from app.repositories.base import BaseRepository
from app.core.security import utc_now


class OTPRepository(BaseRepository[OTP]):
    """Repository for OTP model operations."""

    def __init__(self, db: Session):
        super().__init__(OTP, db)

    def get_active_by_email_and_purpose(
        self, email: str, purpose: str
    ) -> Optional[OTP]:
        return (
            self.db.query(OTP)
            .filter(
                OTP.email == email,
                OTP.purpose == purpose,
                OTP.used == False,
                OTP.expires_at > utc_now(),
            )
            .order_by(OTP.created_at.desc())
            .first()
        )

    def invalidate_all(self, email: str, purpose: str) -> None:
        self.db.query(OTP).filter(
            OTP.email == email,
            OTP.purpose == purpose,
            OTP.used == False,
        ).update({OTP.used: True})
        self.db.commit()

    def delete_expired(self) -> int:
        count = (
            self.db.query(OTP)
            .filter(OTP.expires_at < utc_now())
            .delete()
        )
        self.db.commit()
        return count
