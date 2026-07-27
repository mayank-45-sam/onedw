import uuid
from sqlalchemy import Column, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class WorkerAvailability(BaseModel):
    __tablename__ = "worker_availability"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    day = Column(String(10), nullable=False)
    slots = Column(JSON, nullable=False)

    worker = relationship("Worker", back_populates="availability")
