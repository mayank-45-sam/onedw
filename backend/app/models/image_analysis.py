"""ImageAnalysis Beanie document."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import Field

from app.models.base import BaseDocument


class ImageAnalysis(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    image_url: str
    detected_object: Optional[str] = None
    problem: Optional[str] = None
    confidence: float = 0.0
    severity: Optional[str] = None
    repair_difficulty: Optional[str] = None
    estimated_time_minutes: Optional[int] = None
    estimated_price_min: Optional[float] = None
    estimated_price_max: Optional[float] = None
    required_profession: Optional[str] = None
    ai_suggestions: List[Any] = Field(default_factory=list)
    recommended_workers: List[Any] = Field(default_factory=list)
    raw_response: Optional[Dict[str, Any]] = None

    class Settings:
        name = "image_analyses"
