from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    OTPVerifyRequest,
    OTPResendRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    status_code=201,
    summary="Register a new user",
)
async def register(body: RegisterRequest):
    """Register a new user account with name, email, password, and role."""
    service = AuthService()
    result = await service.register(
        name=body.name,
        email=body.email,
        password=body.password,
        role=body.role,
        phone=body.phone,
    )
    return {
        "success": True,
        "message": "Registration successful",
        "data": result,
    }


@router.post(
    "/login",
    summary="Login with email and password",
)
async def login(body: LoginRequest):
    """Authenticate user with email and password. Returns access and refresh tokens."""
    service = AuthService()
    result = await service.login(email=body.email, password=body.password)
    return {
        "success": True,
        "message": "Login successful",
        "data": result,
    }


@router.post(
    "/refresh",
    summary="Refresh access token",
)
async def refresh_token(body: RefreshRequest):
    """Refresh access token using refresh token rotation. Issues new access and refresh tokens."""
    service = AuthService()
    result = await service.refresh_token(refresh_token=body.refresh_token)
    return {
        "success": True,
        "message": "Token refreshed successfully",
        "data": result,
    }


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout current device",
)
async def logout(body: RefreshRequest):
    """Logout from current device by revoking the refresh token."""
    service = AuthService()
    await service.logout(refresh_token=body.refresh_token)
    return MessageResponse(message="Logged out successfully")


@router.post(
    "/logout-all",
    response_model=MessageResponse,
    summary="Logout from all devices",
)
async def logout_all(current_user: User = Depends(get_current_user)):
    """Logout from all devices by revoking all refresh tokens."""
    service = AuthService()
    await service.logout_all(user_id=current_user.id)
    return MessageResponse(message="Logged out from all devices")


@router.post(
    "/verify-otp",
    response_model=MessageResponse,
    summary="Verify OTP for email verification",
)
async def verify_otp(body: OTPVerifyRequest):
    """Verify OTP code sent to email for email verification."""
    service = AuthService()
    success = await service.verify_email(email=body.email, otp_code=body.otp)
    if not success:
        return MessageResponse(message="Invalid or expired OTP")
    return MessageResponse(message="Email verified successfully")


@router.post(
    "/resend-otp",
    response_model=MessageResponse,
    summary="Resend OTP for email verification",
)
async def resend_otp(body: OTPResendRequest):
    """Resend OTP for email verification."""
    service = AuthService()
    await service.request_email_verification(email=body.email)
    return MessageResponse(message="OTP sent successfully")


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset",
)
async def forgot_password(body: ForgotPasswordRequest):
    """Request a password reset OTP. Always returns success for security."""
    service = AuthService()
    await service.forgot_password(email=body.email)
    return MessageResponse(message="If the email exists, a reset OTP has been sent")


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password with OTP",
)
async def reset_password(body: ResetPasswordRequest):
    """Reset password using the OTP received via email."""
    service = AuthService()
    await service.reset_password(
        email=body.email,
        otp_code=body.otp,
        new_password=body.new_password,
    )
    return MessageResponse(message="Password reset successfully. Please login with your new password.")
