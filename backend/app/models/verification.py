"""Worker verification pipeline Beanie documents."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import Field

from app.models.base import BaseDocument


class WorkerVerification(BaseDocument):
    """One verification attempt per worker."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    worker_id: str
    attempt_number: int = 1
    profession: str
    status: str = "in_progress"  # not_started | in_progress | completed | failed
    step: str = "documents"  # documents | skill_test | practical | interview | completed
    technical_score: Optional[float] = None
    practical_score: Optional[float] = None
    interview_score: Optional[float] = None
    documents_score: Optional[float] = None
    experience_score: Optional[float] = None
    trust_score: Optional[float] = None
    badge: Optional[str] = None  # gold | pro | beginner | rejected
    document_media: Optional[Dict[str, Any]] = Field(default_factory=dict)
    skill_test_anti_cheat: Optional[Dict[str, Any]] = Field(default_factory=dict)
    training_recommendations: List[Any] = Field(default_factory=list)
    admin_status: str = "pending"  # pending | approved | rejected
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    retry_available_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    is_demo: bool = False

    class Settings:
        name = "worker_verifications"


class SkillTestSession(BaseDocument):
    """AI-generated technical test attempt."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    verification_id: str
    worker_id: str
    profession: str
    status: str = "started"  # started | submitted | failed
    questions: List[Any] = Field(default_factory=list)
    answers: List[Any] = Field(default_factory=list)
    score: Optional[float] = None
    tab_switch_count: int = 0
    warnings_issued: int = 0
    time_per_question: List[Any] = Field(default_factory=list)
    skipped_count: int = 0
    suspicious_fast_answers: List[Any] = Field(default_factory=list)
    failed: bool = False
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None

    class Settings:
        name = "skill_test_sessions"


class PracticalAssessment(BaseDocument):
    """Worker-uploaded work photos/videos evaluated by Gemini Vision."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    verification_id: str
    worker_id: str
    media_urls: List[Any] = Field(default_factory=list)
    evaluation: Optional[Dict[str, Any]] = Field(default_factory=dict)
    score: Optional[float] = None
    status: str = "submitted"
    submitted_at: Optional[datetime] = None

    class Settings:
        name = "practical_assessments"


class VoiceInterview(BaseDocument):
    """AI interviewer session."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    verification_id: str
    worker_id: str
    profession: str
    exchanges: List[Any] = Field(default_factory=list)
    evaluation: Optional[Dict[str, Any]] = Field(default_factory=dict)
    score: Optional[float] = None
    status: str = "in_progress"  # in_progress | completed
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None

    class Settings:
        name = "voice_interviews"


class VerificationCertificate(BaseDocument):
    """OneDW Verified Professional certificate with QR + PDF."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    verification_id: str
    worker_id: str
    certificate_no: str
    worker_name: str
    profession: str
    trust_score: float
    badge: str
    issued_at: Optional[datetime] = None
    qr_code_url: Optional[str] = None
    pdf_url: Optional[str] = None
    is_active: bool = True

    class Settings:
        name = "verification_certificates"
