from typing import Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, ConfigDict


class APIError(BaseModel):
    """Standard error response model."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message": "An error occurred",
                "code": "ERROR_CODE",
                "errors": [],
            }
        }
    )

    message: str
    code: Optional[str] = None
    errors: Optional[list[dict]] = None


class AppException(HTTPException):
    """Base application exception."""

    def __init__(
        self,
        status_code: int,
        message: str,
        code: Optional[str] = None,
        errors: Optional[list[dict]] = None
    ):
        super().__init__(
            status_code=status_code,
            detail=APIError(message=message, code=code, errors=errors).model_dump()
        )
        self.message = message
        self.code = code
        self.errors = errors


class BadRequestException(AppException):
    """400 Bad Request exception."""

    def __init__(
        self,
        message: str = "Bad request",
        code: str = "BAD_REQUEST",
        errors: Optional[list[dict]] = None
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            code=code,
            errors=errors
        )


class UnauthorizedException(AppException):
    """401 Unauthorized exception."""

    def __init__(
        self,
        message: str = "Unauthorized",
        code: str = "UNAUTHORIZED",
        errors: Optional[list[dict]] = None
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            code=code,
            errors=errors
        )


class ForbiddenException(AppException):
    """403 Forbidden exception."""

    def __init__(
        self,
        message: str = "Forbidden",
        code: str = "FORBIDDEN",
        errors: Optional[list[dict]] = None
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            code=code,
            errors=errors
        )


class NotFoundException(AppException):
    """404 Not Found exception."""

    def __init__(
        self,
        message: str = "Resource not found",
        code: str = "NOT_FOUND",
        errors: Optional[list[dict]] = None
    ):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=message,
            code=code,
            errors=errors
        )


class ConflictException(AppException):
    """409 Conflict exception."""

    def __init__(
        self,
        message: str = "Resource conflict",
        code: str = "CONFLICT",
        errors: Optional[list[dict]] = None
    ):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            message=message,
            code=code,
            errors=errors
        )


class ValidationException(AppException):
    """422 Validation exception."""

    def __init__(
        self,
        message: str = "Validation error",
        code: str = "VALIDATION_ERROR",
        errors: Optional[list[dict]] = None
    ):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=message,
            code=code,
            errors=errors
        )


class InternalServerException(AppException):
    """500 Internal Server Error exception."""

    def __init__(
        self,
        message: str = "Internal server error",
        code: str = "INTERNAL_SERVER_ERROR",
        errors: Optional[list[dict]] = None
    ):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            code=code,
            errors=errors
        )
