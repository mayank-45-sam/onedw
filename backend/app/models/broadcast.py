import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text
from app.models.base import BaseModel


class Broadcast(BaseModel):
    __tablename__ = "broadcasts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    # all | customers | workers | verified_workers | pending_workers
    audience = Column(String(50), nullable=False)
    # announcement | maintenance | emergency | promotion | policy
    category = Column(String(50), nullable=False, default="announcement")
    # low | medium | high
    priority = Column(String(20), nullable=False, default="medium")
    # scheduled | sent
    status = Column(String(20), nullable=False, default="scheduled")
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    sent_by = Column(String(36), nullable=True)
    total_recipients = Column(Integer, default=0, nullable=False)
    delivered_count = Column(Integer, default=0, nullable=False)
    failed_count = Column(Integer, default=0, nullable=False)
