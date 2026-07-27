from typing import Optional

from sqlalchemy.orm import Session

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

    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.token_service = TokenService(db)
        self.otp_service = OTPService(db)

    def register(
        self,
        name: str,
        email: str,
        password: str,
        role: UserRole = UserRole.CUSTOMER,
        phone: Optional[str] = None,
    ) -> dict:
        """Register a new user. Returns dict with user and tokens."""
        if role in (UserRole.ADMIN, UserRole.WORKER):
            raise ForbiddenException(
                message="Self-registration is only available for customers",
                code="FORBIDDEN",
            )

        if self.user_repo.email_exists(email):
            raise ConflictException(message="Email already registered")

        if phone and self.user_repo.phone_exists(phone):
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
        self.db.add(user)
        self.db.flush()

        if role == UserRole.CUSTOMER:
            self.db.add(Customer(user_id=user.id, name=name))
        elif role == UserRole.ADMIN:
            self.db.add(Admin(user_id=user.id, name=name))

        self.db.add(Wallet(user_id=user.id))
        self.db.commit()
        self.db.refresh(user)

        access_token, refresh_token, expires_in = self.token_service.create_token_pair(
            user.id, user.role.value
        )

        profile = self._get_profile(user)

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

    def login(self, email: str, password: str) -> dict:
        """Login with email and password. Returns dict with user and tokens."""
        user = self.user_repo.get_by_email(email)
        if user is None:
            raise UnauthorizedException(message="Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException(message="Account is deactivated")

        if not verify_password(password, user.password_hash):
            raise UnauthorizedException(message="Invalid email or password")

        access_token, refresh_token, expires_in = self.token_service.create_token_pair(
            user.id, user.role.value
        )

        profile = self._get_profile(user)

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

    def refresh_token(self, refresh_token: str) -> dict:
        """Refresh access token using refresh token rotation."""
        result = self.token_service.rotate_refresh_token(refresh_token)
        if result is None:
            raise UnauthorizedException(message="Invalid or expired refresh token")

        new_access, new_refresh, expires_in, user_id = result
        user = self.user_repo.get(user_id)
        if user is None or not user.is_active:
            raise UnauthorizedException(message="User not found or deactivated")

        profile = self._get_profile(user)

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

    def logout(self, refresh_token: str) -> None:
        """Logout by revoking refresh token."""
        self.token_service.revoke_refresh_token(refresh_token)

    def logout_all(self, user_id: str) -> None:
        """Logout from all devices."""
        self.token_service.revoke_all_user_tokens(user_id)

    def forgot_password(self, email: str) -> None:
        """Generate password reset OTP."""
        user = self.user_repo.get_by_email(email)
        if user is None:
            return
        self.otp_service.create_otp(email, "password_reset")

    def reset_password(self, email: str, otp_code: str, new_password: str) -> None:
        """Reset password using OTP."""
        verified = self.otp_service.verify_otp(email, "password_reset", otp_code)
        if not verified:
            raise BadRequestException(message="Invalid or expired OTP")

        user = self.user_repo.get_by_email(email)
        if user is None:
            raise NotFoundException(message="User not found")

        user.password_hash = get_password_hash(new_password)
        self.db.commit()
        self.token_service.revoke_all_user_tokens(user.id)

    def request_email_verification(self, email: str) -> None:
        """Request email verification OTP."""
        self.otp_service.create_otp(email, "email_verification")

    def verify_email(self, email: str, otp_code: str) -> bool:
        """Verify email using OTP."""
        verified = self.otp_service.verify_otp(email, "email_verification", otp_code)
        if not verified:
            return False

        user = self.user_repo.get_by_email(email)
        if user is None:
            return False

        self.user_repo.verify_user(user)
        return True

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        return self.user_repo.get(user_id)

    def _get_profile(self, user: User) -> Optional[dict]:
        """Get profile data from user's role-specific profile."""
        if user.role == UserRole.CUSTOMER and user.customer_profile:
            return {"name": user.customer_profile.name, "avatar": user.customer_profile.avatar}
        elif user.role == UserRole.WORKER and user.worker_profile:
            return {"name": user.worker_profile.name, "avatar": user.worker_profile.avatar}
        elif user.role == UserRole.ADMIN and user.admin_profile:
            return {"name": user.admin_profile.name, "avatar": user.admin_profile.avatar}
        return None
