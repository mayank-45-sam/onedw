from typing import Optional, Callable
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.models.user import User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    Returns the full User ORM object from the database.
    """
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise UnauthorizedException(message="Invalid or expired token")

    if payload.get("type") != "access":
        raise UnauthorizedException(message="Invalid token type")

    user_id = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException(message="Invalid token payload")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise UnauthorizedException(message="User not found")

    if not user.is_active:
        raise UnauthorizedException(message="Account is deactivated")

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Optional dependency to get the current user if token is provided.
    Returns None if no token or invalid token.
    """
    if credentials is None:
        return None

    token = credentials.credentials
    payload = decode_token(token)

    if payload is None or payload.get("type") != "access":
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        return None

    return user


def require_role(*roles: str) -> Callable:
    """
    Factory function to create a dependency that requires specific user roles.
    Usage: Depends(require_role("admin", "worker"))
    """

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in roles:
            raise ForbiddenException(
                message="Insufficient permissions",
                code="FORBIDDEN",
            )
        return current_user

    return role_checker


async def RequireCustomer(current_user: User = Depends(get_current_user)) -> User:
    """Dependency requiring customer role."""
    if current_user.role.value != "customer":
        raise ForbiddenException(message="Customer access required")
    return current_user


async def RequireWorker(current_user: User = Depends(get_current_user)) -> User:
    """Dependency requiring worker role."""
    if current_user.role.value != "worker":
        raise ForbiddenException(message="Worker access required")
    return current_user


async def RequireAdmin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency requiring admin role."""
    if current_user.role.value != "admin":
        raise ForbiddenException(message="Admin access required")
    return current_user
