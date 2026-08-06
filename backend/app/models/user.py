"""User Beanie document."""
from __future__ import annotations

import enum
import uuid
from typing import Optional

from beanie import Indexed
from pydantic import Field

from app.models.base import BaseDocument


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    WORKER = "worker"
    ADMIN = "admin"


class User(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: Indexed(str, unique=True)  # type: ignore[valid-type]
    phone: Optional[Indexed(str, unique=True)] = None  # type: ignore[valid-type]
    password_hash: str
    role: UserRole = UserRole.CUSTOMER
    is_active: bool = True
    is_verified: bool = False

    class Settings:
        name = "users"
