from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class SuspiciousActivityResponse(BaseModel):
    id: str
    worker_id: str
    activity_type: str
    description: Optional[str] = None
    severity: str
    metadata_json: Optional[dict] = None
    detected_at: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FraudReportResponse(BaseModel):
    id: str
    worker_id: str
    fraud_score: float
    risk_level: str
    reason: Optional[str] = None
    confidence: Optional[float] = None
    recommendation: Optional[str] = None
    analysis_details: Optional[dict] = None
    triggered_by: Optional[str] = None
    analyzed_at: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FraudScoreBreakdown(BaseModel):
    fake_reviews_score: float = 0.0
    cancellation_score: float = 0.0
    price_change_score: float = 0.0
    complaint_score: float = 0.0
    suspicious_login_score: float = 0.0
    duplicate_phone_score: float = 0.0
    duplicate_device_score: float = 0.0
    fake_profile_score: float = 0.0


class FraudAnalysisResponse(BaseModel):
    worker_id: str
    worker_name: str
    fraud_score: float
    risk_level: str
    reason: Optional[str] = None
    confidence: Optional[float] = None
    recommendation: Optional[str] = None
    score_breakdown: Optional[FraudScoreBreakdown] = None
    suspicious_activities: list[SuspiciousActivityResponse] = []
    report: Optional[FraudReportResponse] = None
    is_disabled: bool = False


class WorkerFraudSummary(BaseModel):
    worker_id: str
    worker_name: str
    worker_avatar: Optional[str] = None
    worker_profession: Optional[str] = None
    fraud_score: float
    risk_level: str
    is_disabled: bool
    complaint_count: int = 0
    suspicious_activity_count: int = 0
    last_analysis: Optional[str] = None
    recommendation: Optional[str] = None


class HighRiskWorkerResponse(BaseModel):
    workers: list[WorkerFraudSummary]
    total: int
    page: int = 1
    limit: int = 20


class FraudAnalyzeRequest(BaseModel):
    worker_id: str
    trigger_reason: Optional[str] = None


class PublicFraudStatus(BaseModel):
    worker_id: str
    fraud_score: float
    risk_level: str
    is_disabled: bool
    recommendation: Optional[str] = None
