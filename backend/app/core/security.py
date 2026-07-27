import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, Union
import uuid
import bcrypt
from jose import JWTError, jwt
from app.core.config import settings


def utc_now() -> datetime:
    """Return current UTC time as naive datetime for SQLite compatibility.

    PostgreSQL with DateTime(timezone=True) will handle timezone conversion
    on storage/retrieval. Using naive UTC here ensures cross-DB compatibility.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def hash_token(token: str) -> str:
    """Hash a token using SHA-256 for secure storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(
    subject: Union[str, int],
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[dict] = None
) -> str:
    """Create a JWT access token."""
    now = utc_now()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": str(subject), "type": "access", "jti": str(uuid.uuid4())}
    if additional_claims:
        to_encode.update(additional_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(
    subject: Union[str, int],
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[dict] = None
) -> str:
    """Create a JWT refresh token."""
    now = utc_now()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh", "jti": str(uuid.uuid4())}
    if additional_claims:
        to_encode.update(additional_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def get_token_payload(token: str) -> Optional[dict]:
    """Get the payload from a token without verifying expiration."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False}
        )
        return payload
    except JWTError:
        return None
