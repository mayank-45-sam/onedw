"""Async Auth service — MongoDB/Beanie version."""
from __future__ import annotations

from typing import Optional

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.worker import Worker
from app.models.admin import Admin
from app.models.wallet import Wallet
from app.repositories.user_repository import UserRepository
from app.services.token_service import TokenService
from app.services.otp_service import OTPService
from app.core.exceptions import (
    BadRequestException,
    UnauthorizedException,
    ConflictException,
    NotFoundException,
    ForbiddenException,
)


class AuthService:
    """Service for authentication operations."""

    def __init__(self):
        self.user_repo = UserRepository()
        self.token_service = TokenService()
        self.otp_service = OTPService()

    async def register(
        self,
        name: str,
        email: str,
        password: str,
        role: UserRole = UserRole.CUSTOMER,
        phone: Optional[str] = None,
    ) -> dict:
        """Register a new user. Returns dict with user and tokens."""
        if role == UserRole.ADMIN:
            raise ForbiddenException(
                message="Self-registration is only available for customers and workers",
                code="FORBIDDEN",
            )

        if await self.user_repo.email_exists(email):
            raise ConflictException(message="Email already registered")

        if phone and await self.user_repo.phone_exists(phone):
            raise ConflictException(message="Phone number already registered")

        password_hash = get_password_hash(password)

        user = User(
            email=email.lower().strip(),
            phone=phone,
            password_hash=password_hash,
            role=role,
            is_active=True,
            is_verified=False,
        )
        await user.insert()

        if role == UserRole.CUSTOMER:
            await Customer(user_id=user.id, name=name).insert()
        elif role == UserRole.ADMIN:
            await Admin(user_id=user.id, name=name).insert()
        elif role == UserRole.WORKER:
            await Worker(user_id=user.id, name=name, profession="", hourly_rate=0.0).insert()

        await Wallet(user_id=user.id).insert()

        access_token, refresh_token, expires_in = await self.token_service.create_token_pair(
            user.id, user.role.value
        )

        profile = await self._get_profile(user)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_in,
            "user": {
                "id": user.id,
                "email": user.email,
                "phone": user.phone,
                "role": user.role.value,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "name": profile.get("name") if profile else None,
                "avatar": profile.get("avatar") if profile else None,
            },
        }

    async def login(self, email: str, password: str) -> dict:
        """Login with email and password. Returns dict with user and tokens."""
        user = await self.user_repo.get_by_email(email)
        if user is None:
            raise UnauthorizedException(message="Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException(message="Account is deactivated")

        if not verify_password(password, user.password_hash):
            raise UnauthorizedException(message="Invalid email or password")

        access_token, refresh_token, expires_in = await self.token_service.create_token_pair(
            user.id, user.role.value
        )

        profile = await self._get_profile(user)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_in,
            "user": {
                "id": user.id,
                "email": user.email,
                "phone": user.phone,
                "role": user.role.value,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "name": profile.get("name") if profile else None,
                "avatar": profile.get("avatar") if profile else None,
            },
        }

    async def refresh_token(self, refresh_token: str) -> dict:
        """Refresh access token using refresh token rotation."""
        result = await self.token_service.rotate_refresh_token(refresh_token)
        if result is None:
            raise UnauthorizedException(message="Invalid or expired refresh token")

        new_access, new_refresh, expires_in, user_id = result
        user = await self.user_repo.get(user_id)
        if user is None or not user.is_active:
            raise UnauthorizedException(message="User not found or deactivated")

        profile = await self._get_profile(user)

        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "expires_in": expires_in,
            "user": {
                "id": user.id,
                "email": user.email,
                "phone": user.phone,
                "role": user.role.value,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "name": profile.get("name") if profile else None,
                "avatar": profile.get("avatar") if profile else None,
            },
        }

    async def logout(self, refresh_token: str) -> None:
        """Logout by revoking refresh token."""
        await self.token_service.revoke_refresh_token(refresh_token)

    async def logout_all(self, user_id: str) -> None:
        """Logout from all devices."""
        await self.token_service.revoke_all_user_tokens(user_id)

    async def forgot_password(self, email: str) -> None:
        """Generate password reset OTP."""
        user = await self.user_repo.get_by_email(email)
        if user is None:
            return
        await self.otp_service.create_otp(email, "password_reset")

    async def reset_password(self, email: str, otp_code: str, new_password: str) -> None:
        """Reset password using OTP."""
        verified = await self.otp_service.verify_otp(email, "password_reset", otp_code)
        if not verified:
            raise BadRequestException(message="Invalid or expired OTP")

        user = await self.user_repo.get_by_email(email)
        if user is None:
            raise NotFoundException(message="User not found")

        user.password_hash = get_password_hash(new_password)
        await user.save()
        await self.token_service.revoke_all_user_tokens(user.id)

    async def request_email_verification(self, email: str) -> None:
        """Request email verification OTP."""
        await self.otp_service.create_otp(email, "email_verification")

    async def verify_email(self, email: str, otp_code: str) -> bool:
        """Verify email using OTP."""
        verified = await self.otp_service.verify_otp(email, "email_verification", otp_code)
        if not verified:
            return False

        user = await self.user_repo.get_by_email(email)
        if user is None:
            return False

        await self.user_repo.verify_user(user)
        return True

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        return await self.user_repo.get(user_id)

    async def _get_profile(self, user: User) -> Optional[dict]:
        """Get profile data from user's role-specific profile collection."""
        if user.role == UserRole.CUSTOMER:
            profile = await Customer.find_one(Customer.user_id == user.id)
            if profile:
                return {"name": profile.name, "avatar": profile.avatar}
        elif user.role == UserRole.WORKER:
            profile = await Worker.find_one(Worker.user_id == user.id)
            if profile:
                return {"name": profile.name, "avatar": profile.avatar}
        elif user.role == UserRole.ADMIN:
            profile = await Admin.find_one(Admin.user_id == user.id)
            if profile:
                return {"name": profile.name, "avatar": profile.avatar}
        return None
