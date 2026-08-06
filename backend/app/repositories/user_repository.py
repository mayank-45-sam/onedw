"""Async User repository."""
from __future__ import annotations

from typing import List, Optional

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, email: str) -> Optional[User]:
        return await User.find_one(User.email == email)

    async def get_by_phone(self, phone: str) -> Optional[User]:
        return await User.find_one(User.phone == phone)

    async def email_exists(self, email: str) -> bool:
        return await User.find_one(User.email == email) is not None

    async def phone_exists(self, phone: str) -> bool:
        if phone is None:
            return False
        return await User.find_one(User.phone == phone) is not None

    async def get_active_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        return await User.find(User.is_active == True).skip(skip).limit(limit).to_list()

    async def deactivate(self, user: User) -> User:
        user.is_active = False
        await user.save()
        return user

    async def verify_user(self, user: User) -> User:
        user.is_verified = True
        await user.save()
        return user
