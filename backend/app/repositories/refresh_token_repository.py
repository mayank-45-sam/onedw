"""Async RefreshToken repository."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from app.models.refresh_token import RefreshToken
from app.repositories.base import BaseRepository


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    def __init__(self):
        super().__init__(RefreshToken)

    async def get_by_token_hash(self, token_hash: str) -> Optional[RefreshToken]:
        return await RefreshToken.find_one(RefreshToken.token == token_hash)

    async def get_by_user_id(self, user_id: str) -> List[RefreshToken]:
        return await RefreshToken.find(RefreshToken.user_id == user_id).to_list()

    async def get_active_by_user_id(self, user_id: str) -> List[RefreshToken]:
        now = utc_now()
        return await RefreshToken.find(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > now,
        ).to_list()

    async def get_by_family(self, family: str) -> Optional[RefreshToken]:
        return await RefreshToken.find_one(RefreshToken.family == family)

    async def revoke(self, token_obj: RefreshToken) -> RefreshToken:
        token_obj.revoked = True
        await token_obj.save()
        return token_obj

    async def revoke_all_for_user(self, user_id: str) -> None:
        tokens = await RefreshToken.find(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,
        ).to_list()
        for t in tokens:
            t.revoked = True
            await t.save()

    async def delete_expired(self) -> int:
        now = utc_now()
        expired = await RefreshToken.find(RefreshToken.expires_at < now).to_list()
        count = len(expired)
        for t in expired:
            await t.delete()
        return count
