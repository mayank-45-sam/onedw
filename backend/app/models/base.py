"""Base Beanie Document with common timestamp fields."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from beanie import Document
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BaseDocument(Document):
    """Base class for all Beanie documents — adds created_at / updated_at."""

    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert document instance to a plain dict (uses model_dump)."""
        return self.model_dump(mode="python")

    async def save(self, *args, **kwargs):  # type: ignore[override]
        """Auto-update updated_at on every save."""
        self.updated_at = _utcnow()
        return await super().save(*args, **kwargs)

    class Settings:
        # Sub-classes override this
        name: Optional[str] = None
