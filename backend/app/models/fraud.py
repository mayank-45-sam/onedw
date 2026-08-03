import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class WorkerFraudData(BaseModel):
    __tablename__ = "worker_fraud_data"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    fraud_score = Column(Float, default=0.0, nullable=False)
    is_disabled = Column(Boolean, default=False, nullable=False)
    risk_level = Column(String(20), default="low", nullable=False)
    last_analysis_at = Column(String(30), nullable=True)

    worker = relationship("Worker", backref="fraud_data", uselist=False)


class FraudReport(BaseModel):
    __tablename__ = "fraud_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    fraud_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)
    reason = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    recommendation = Column(String(500), nullable=True)
    analysis_details = Column(JSON, default=dict, nullable=True)
    triggered_by = Column(String(50), nullable=True)
    analyzed_at = Column(String(30), nullable=False)

    worker = relationship("Worker", backref="fraud_reports")


class SuspiciousActivity(BaseModel):
    __tablename__ = "suspicious_activities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False)
    description = Column(String(1000), nullable=True)
    severity = Column(String(20), default="low", nullable=False)
    metadata_json = Column(JSON, default=dict, nullable=True)
    detected_at = Column(String(30), nullable=False)

    worker = relationship("Worker", backref="suspicious_activities")
