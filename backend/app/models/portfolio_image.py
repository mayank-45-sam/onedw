"""PortfolioImage Beanie document."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import Field

from app.models.base import BaseDocument


class PortfolioImage(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    worker_id: str
    url: str
    caption: Optional[str] = None

    class Settings:
        name = "portfolio_images"
