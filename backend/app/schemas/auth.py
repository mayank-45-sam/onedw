import re
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict

from app.schemas.common import SchemaBase
from app.models.user import UserRole


def _validate_password_strength(v: str) -> str:
    """Shared password strength validator."""
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
        raise ValueError("Password must contain at least one special character")
    return v


def _validate_phone(v: Optional[str]) -> Optional[str]:
    """Shared phone number validator."""
    if v is not None:
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^\+?[1-9]\d{7,14}$", cleaned):
            raise ValueError("Invalid phone number format")
    return v


class RegisterRequest(SchemaBase):
    name: str = Field(..., min_length=2, max_length=255, examples=["John Doe"])
    email: EmailStr = Field(..., examples=["john@example.com"])
    phone: Optional[str] = Field(None, max_length=20, examples=["+919876543210"])
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = Field(default=UserRole.CUSTOMER)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return _validate_phone(v)


class LoginRequest(SchemaBase):
    email: EmailStr = Field(..., examples=["john@example.com"])
    password: str = Field(..., min_length=1, examples=["SecurePass123!"])


class TokenResponse(SchemaBase):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token expiry in seconds")


class RefreshRequest(SchemaBase):
    refresh_token: str


class UserProfileResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    name: Optional[str] = None
    avatar: Optional[str] = None
    created_at: Optional[str] = None


class UserResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: Optional[str] = None


class ProfileUpdateRequest(SchemaBase):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[dict] = None
    profession: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = Field(None, max_length=1000)
    experience_years: Optional[int] = Field(None, ge=0)
    hourly_rate: Optional[float] = Field(None, gt=0)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return _validate_phone(v)


class PasswordChangeRequest(SchemaBase):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class ForgotPasswordRequest(SchemaBase):
    email: EmailStr


class ResetPasswordRequest(SchemaBase):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class OTPVerifyRequest(SchemaBase):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class OTPResendRequest(SchemaBase):
    email: EmailStr


class MessageResponse(SchemaBase):
    message: str
