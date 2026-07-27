"""Pydantic request/response schemas for API layers."""

from app.core.response import APIResponse, HealthResponse, PaginatedResponse
from app.core.exceptions import APIError
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    UserProfileResponse,
    UserResponse,
    ProfileUpdateRequest,
    PasswordChangeRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    OTPVerifyRequest,
    OTPResendRequest,
    MessageResponse,
)

__all__ = [
    "APIError",
    "APIResponse",
    "HealthResponse",
    "PaginatedResponse",
    "RegisterRequest",
    "LoginRequest",
    "TokenResponse",
    "RefreshRequest",
    "UserProfileResponse",
    "UserResponse",
    "ProfileUpdateRequest",
    "PasswordChangeRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "OTPVerifyRequest",
    "OTPResendRequest",
    "MessageResponse",
]
