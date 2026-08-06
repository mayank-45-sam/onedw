"""Fraud-related Beanie documents."""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from pydantic import Field

from app.models.base import BaseDocument


class WorkerFraudData(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    worker_id: str
    fraud_score: float = 0.0
    is_disabled: bool = False
    risk_level: str = "low"
    last_analysis_at: Optional[str] = None

    class Settings:
        name = "worker_fraud_data"


class FraudReport(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    worker_id: str
    fraud_score: float
    risk_level: str
    reason: Optional[str] = None
    confidence: Optional[float] = None
    recommendation: Optional[str] = None
    analysis_details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    triggered_by: Optional[str] = None
    analyzed_at: str

    class Settings:
        name = "fraud_reports"


class SuspiciousActivity(BaseDocument):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    worker_id: str
    activity_type: str
    description: Optional[str] = None
    severity: str = "low"
    metadata_json: Optional[Dict[str, Any]] = Field(default_factory=dict)
    detected_at: str

    class Settings:
        name = "suspicious_activities"
