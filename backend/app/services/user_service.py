"""Async User service — Beanie version."""
from __future__ import annotations

import os
import uuid
from typing import Optional

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.worker import Worker
from app.models.admin import Admin
from app.repositories.user_repository import UserRepository
from app.utils.paths import ensure_directory
from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
    ValidationException,
)


class UserService:
    """Service for user profile management operations."""

    def __init__(self):
        self.user_repo = UserRepository()

    async def get_user_with_profile(self, user_id: str) -> dict:
        """Get user with their role-specific profile data."""
        user = await self.user_repo.get(user_id)
        if user is None:
            raise NotFoundException(message="User not found")
        return await self._serialize_profile(user)

    async def update_profile(self, user_id: str, update_data: dict) -> dict:
        """Update user profile. Handles customer, worker, and admin profiles."""
        user = await self.user_repo.get(user_id)
        if user is None:
            raise NotFoundException(message="User not found")

        phone = update_data.pop("phone", None)
        if phone is not None:
            existing = await self.user_repo.get_by_phone(phone)
            if existing and existing.id != user_id:
                raise ValidationException(
                    message="Phone number already in use",
                    errors=[{"field": "phone", "message": "Phone number already in use"}],
                )
            user.phone = phone
            await user.save()

        profile_fields = {k: v for k, v in update_data.items() if v is not None}

        if profile_fields:
            profile = await self._get_profile_obj(user)
            if profile is not None:
                for key, value in profile_fields.items():
                    if hasattr(profile, key):
                        setattr(profile, key, value)
                await profile.save()
            else:
                await self._create_profile(user, profile_fields)

        user = await self.user_repo.get(user_id)
        return await self._serialize_profile(user)

    async def change_password(self, user_id: str, current_password: str, new_password: str) -> None:
        """Change user password."""
        user = await self.user_repo.get(user_id)
        if user is None:
            raise NotFoundException(message="User not found")

        if not verify_password(current_password, user.password_hash):
            raise BadRequestException(message="Current password is incorrect")

        user.password_hash = get_password_hash(new_password)
        await user.save()

    async def upload_avatar(self, user_id: str, file_content: bytes, filename: str) -> str:
        """Upload and set user avatar. Returns the avatar URL."""
        user = await self.user_repo.get(user_id)
        if user is None:
            raise NotFoundException(message="User not found")

        ext = os.path.splitext(filename)[1].lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            raise BadRequestException(message="Invalid file type. Allowed: jpg, jpeg, png, webp")

        avatar_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
        ensure_directory(avatar_dir)

        unique_name = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(avatar_dir, unique_name)

        with open(file_path, "wb") as f:
            f.write(file_content)

        avatar_url = f"/uploads/avatars/{unique_name}"

        profile = await self._get_profile_obj(user)
        if profile is not None:
            old_avatar = profile.avatar
            profile.avatar = avatar_url
            await profile.save()
            if old_avatar and old_avatar.startswith("/uploads/avatars/"):
                old_path = os.path.join(".", old_avatar.lstrip("/"))
                if os.path.exists(old_path):
                    os.remove(old_path)

        return avatar_url

    async def delete_avatar(self, user_id: str) -> None:
        """Delete user avatar."""
        user = await self.user_repo.get(user_id)
        if user is None:
            raise NotFoundException(message="User not found")

        profile = await self._get_profile_obj(user)
        if profile is not None and profile.avatar:
            old_path = os.path.join(".", profile.avatar.lstrip("/"))
            if os.path.exists(old_path):
                os.remove(old_path)
            profile.avatar = None
            await profile.save()

    async def _get_profile_obj(self, user: User):
        """Get the role-specific profile document."""
        if user.role == UserRole.CUSTOMER:
            return await Customer.find_one(Customer.user_id == user.id)
        elif user.role == UserRole.WORKER:
            return await Worker.find_one(Worker.user_id == user.id)
        elif user.role == UserRole.ADMIN:
            return await Admin.find_one(Admin.user_id == user.id)
        return None

    async def _create_profile(self, user: User, data: dict) -> None:
        """Create a new profile if one doesn't exist."""
        name = data.pop("name", user.email.split("@")[0])

        if user.role == UserRole.CUSTOMER:
            await Customer(user_id=user.id, name=name, **data).insert()
        elif user.role == UserRole.WORKER:
            await Worker(user_id=user.id, name=name, profession="", hourly_rate=0.0, **data).insert()
        elif user.role == UserRole.ADMIN:
            await Admin(user_id=user.id, name=name, **data).insert()

    async def _serialize_profile(self, user: User) -> dict:
        """Serialize user with profile data."""
        result = {
            "id": user.id,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "name": None,
            "avatar": None,
        }

        profile = await self._get_profile_obj(user)
        if profile is not None:
            result["name"] = profile.name
            result["avatar"] = profile.avatar

            if user.role == UserRole.CUSTOMER:
                result["address"] = profile.address
                result["favorite_services"] = profile.favorite_services
                result["favorite_workers"] = profile.favorite_workers
            elif user.role == UserRole.WORKER:
                result["cover_image"] = profile.cover_image
                result["profession"] = profile.profession
                result["bio"] = profile.bio
                result["experience_years"] = profile.experience_years
                result["completed_jobs"] = profile.completed_jobs
                result["rating"] = profile.rating
                result["review_count"] = profile.review_count
                result["hourly_rate"] = profile.hourly_rate
                result["is_online"] = profile.is_online
                result["category_ids"] = profile.category_ids
            elif user.role == UserRole.ADMIN:
                result["permissions"] = profile.permissions

        return result
