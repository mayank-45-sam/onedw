from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken
from app.repositories.base import BaseRepository
from app.core.security import utc_now


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    """Repository for RefreshToken model operations."""

    def __init__(self, db: Session):
        super().__init__(RefreshToken, db)

    def get_by_token_hash(self, token_hash: str) -> Optional[RefreshToken]:
        return self.db.query(RefreshToken).filter(RefreshToken.token == token_hash).first()

    def get_by_user_id(self, user_id: str) -> List[RefreshToken]:
        return self.db.query(RefreshToken).filter(RefreshToken.user_id == user_id).all()

    def get_active_by_user_id(self, user_id: str) -> List[RefreshToken]:
        return (
            self.db.query(RefreshToken)
            .filter(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked == False,
                RefreshToken.expires_at > utc_now(),
            )
            .all()
        )

    def get_by_family(self, family: str) -> Optional[RefreshToken]:
        return self.db.query(RefreshToken).filter(RefreshToken.family == family).first()

    def revoke(self, token_obj: RefreshToken) -> RefreshToken:
        token_obj.revoked = True
        self.db.commit()
        self.db.refresh(token_obj)
        return token_obj

    def revoke_all_for_user(self, user_id: str) -> None:
        self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,
        ).update({RefreshToken.revoked: True})
        self.db.commit()

    def delete_expired(self) -> int:
        count = (
            self.db.query(RefreshToken)
            .filter(RefreshToken.expires_at < utc_now())
            .delete()
        )
        self.db.commit()
        return count
