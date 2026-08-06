"""Worker profile Beanie document."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import Field

from app.models.base import BaseDocument


class Worker(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    avatar: Optional[str] = None
    cover_image: Optional[str] = None
    profession: str
    bio: Optional[str] = None
    experience_years: int = 0
    completed_jobs: int = 0
    rating: float = 0.0
    review_count: int = 0
    hourly_rate: float
    is_online: bool = False
    category_ids: List[str] = Field(default_factory=list)
    aadhaar_number_hash: Optional[str] = None
    aadhaar_verified: bool = False
    aadhaar_verified_at: Optional[datetime] = None
    verification_status: Optional[str] = None  # not_started | in_progress | completed | rejected
    trust_score: Optional[float] = None
    verification_badge: Optional[str] = None  # gold | pro | beginner | rejected

    class Settings:
        name = "workers"
