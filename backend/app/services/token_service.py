"""Async Token service — MongoDB/Beanie version."""
from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Optional, Tuple

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_token_payload,
    hash_token,
    utc_now,
)
from app.repositories.refresh_token_repository import RefreshTokenRepository


class TokenService:
    """Service for JWT token creation, validation, and refresh token rotation."""

    def __init__(self):
        self.repo = RefreshTokenRepository()

    async def create_token_pair(self, user_id: str, role: str) -> Tuple[str, str, int]:
        """Create access and refresh token pair. Stores hashed refresh token in DB."""
        access_token = create_access_token(subject=user_id, additional_claims={"role": role})
        family = str(uuid.uuid4())
        refresh_token = create_refresh_token(subject=user_id, additional_claims={"role": role})
        token_hash = hash_token(refresh_token)
        expires_at = utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self.repo.create(
            {
                "user_id": user_id,
                "token": token_hash,
                "expires_at": expires_at,
                "revoked": False,
                "family": family,
            }
        )

        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        return access_token, refresh_token, expires_in

    async def rotate_refresh_token(self, old_refresh_token: str) -> Optional[Tuple[str, str, int, str]]:
        """Rotate refresh token. Returns (new_access, new_refresh, expires_in, user_id) or None."""
        payload = get_token_payload(old_refresh_token)
        if payload is None:
            return None

        if payload.get("type") != "refresh":
            return None

        user_id = payload.get("sub")
        role = payload.get("role")

        old_hash = hash_token(old_refresh_token)
        token_obj = await self.repo.get_by_token_hash(old_hash)
        if token_obj is None or token_obj.revoked:
            if token_obj is not None and token_obj.revoked:
                await self.repo.revoke_all_for_user(user_id)
            return None

        if token_obj.expires_at < utc_now():
            await self.repo.revoke(token_obj)
            return None

        family = token_obj.family
        await self.repo.revoke(token_obj)

        new_access = create_access_token(subject=user_id, additional_claims={"role": role})
        new_refresh = create_refresh_token(subject=user_id, additional_claims={"role": role})
        new_token_hash = hash_token(new_refresh)
        new_expires_at = utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self.repo.create(
            {
                "user_id": user_id,
                "token": new_token_hash,
                "expires_at": new_expires_at,
                "revoked": False,
                "family": family,
            }
        )

        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        return new_access, new_refresh, expires_in, user_id

    async def revoke_refresh_token(self, token: str) -> bool:
        """Revoke a single refresh token."""
        token_hash = hash_token(token)
        token_obj = await self.repo.get_by_token_hash(token_hash)
        if token_obj is None:
            return False
        await self.repo.revoke(token_obj)
        return True

    async def revoke_all_user_tokens(self, user_id: str) -> None:
        """Revoke all refresh tokens for a user (logout from all devices)."""
        await self.repo.revoke_all_for_user(user_id)
