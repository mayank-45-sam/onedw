import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Text, Boolean
from app.db.database import Base


class ImageAnalysis(Base):
    __tablename__ = "image_analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)
    image_url = Column(String(500), nullable=False)
    detected_object = Column(String(255), nullable=True)
    problem = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    severity = Column(String(20), nullable=True)
    repair_difficulty = Column(String(20), nullable=True)
    estimated_time_minutes = Column(Integer, nullable=True)
    estimated_price_min = Column(Float, nullable=True)
    estimated_price_max = Column(Float, nullable=True)
    required_profession = Column(String(100), nullable=True)
    ai_suggestions = Column(JSON, default=list)
    recommended_workers = Column(JSON, default=list)
    raw_response = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=True)
