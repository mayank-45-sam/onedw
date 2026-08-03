import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, JSON, Text, DateTime
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class WorkerVerification(BaseModel):
    """One verification attempt per worker. Aggregates AI skill test,
    practical assessment, voice interview, documents and experience."""

    __tablename__ = "worker_verifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number = Column(Integer, default=1, nullable=False)
    profession = Column(String(255), nullable=False)
    status = Column(String(30), default="in_progress", nullable=False)  # not_started | in_progress | completed | failed
    step = Column(String(30), default="documents", nullable=False)      # documents | skill_test | practical | interview | completed
    technical_score = Column(Float, nullable=True)
    practical_score = Column(Float, nullable=True)
    interview_score = Column(Float, nullable=True)
    documents_score = Column(Float, nullable=True)
    experience_score = Column(Float, nullable=True)
    trust_score = Column(Float, nullable=True)
    badge = Column(String(20), nullable=True)  # gold | pro | beginner | rejected
    document_media = Column(JSON, default=dict, nullable=True)  # photos/videos uploaded during documents step
    skill_test_anti_cheat = Column(JSON, default=dict, nullable=True)
    training_recommendations = Column(JSON, default=list, nullable=True)
    admin_status = Column(String(20), default="pending", nullable=False)  # pending | approved | rejected
    admin_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(255), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    retry_available_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)

    worker = relationship("Worker", back_populates="verifications")
    skill_test = relationship("SkillTestSession", back_populates="verification", uselist=False, cascade="all, delete-orphan")
    practical = relationship("PracticalAssessment", back_populates="verification", uselist=False, cascade="all, delete-orphan")
    interview = relationship("VoiceInterview", back_populates="verification", uselist=False, cascade="all, delete-orphan")
    certificate = relationship("VerificationCertificate", back_populates="verification", uselist=False, cascade="all, delete-orphan")


class SkillTestSession(BaseModel):
    """A single AI-generated technical test attempt with full anti-cheating analytics."""

    __tablename__ = "skill_test_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    verification_id = Column(String(36), ForeignKey("worker_verifications.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    profession = Column(String(255), nullable=False)
    status = Column(String(20), default="started", nullable=False)  # started | submitted | failed
    questions = Column(JSON, default=list, nullable=True)
    answers = Column(JSON, default=list, nullable=True)
    score = Column(Float, nullable=True)
    tab_switch_count = Column(Integer, default=0, nullable=False)
    warnings_issued = Column(Integer, default=0, nullable=False)
    time_per_question = Column(JSON, default=list, nullable=True)
    skipped_count = Column(Integer, default=0, nullable=False)
    suspicious_fast_answers = Column(JSON, default=list, nullable=True)
    failed = Column(Boolean, default=False, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    verification = relationship("WorkerVerification", back_populates="skill_test")


class PracticalAssessment(BaseModel):
    """Worker-uploaded work photos/videos evaluated by Gemini Vision."""

    __tablename__ = "practical_assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    verification_id = Column(String(36), ForeignKey("worker_verifications.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    media_urls = Column(JSON, default=list, nullable=True)
    evaluation = Column(JSON, default=dict, nullable=True)
    score = Column(Float, nullable=True)
    status = Column(String(20), default="submitted", nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    verification = relationship("WorkerVerification", back_populates="practical")


class VoiceInterview(BaseModel):
    """AI interviewer session. Gemini generates follow-up questions dynamically."""

    __tablename__ = "voice_interviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    verification_id = Column(String(36), ForeignKey("worker_verifications.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    profession = Column(String(255), nullable=False)
    exchanges = Column(JSON, default=list, nullable=True)
    evaluation = Column(JSON, default=dict, nullable=True)
    score = Column(Float, nullable=True)
    status = Column(String(20), default="in_progress", nullable=False)  # in_progress | completed
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    verification = relationship("WorkerVerification", back_populates="interview")


class VerificationCertificate(BaseModel):
    """OneDW Verified Professional certificate with QR + PDF."""

    __tablename__ = "verification_certificates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    verification_id = Column(String(36), ForeignKey("worker_verifications.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    certificate_no = Column(String(50), unique=True, nullable=False, index=True)
    worker_name = Column(String(255), nullable=False)
    profession = Column(String(255), nullable=False)
    trust_score = Column(Float, nullable=False)
    badge = Column(String(20), nullable=False)
    issued_at = Column(DateTime(timezone=True), nullable=True)
    qr_code_url = Column(String(500), nullable=True)
    pdf_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    verification = relationship("WorkerVerification", back_populates="certificate")
