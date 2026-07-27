import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class WorkerLanguage(BaseModel):
    __tablename__ = "worker_languages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(100), nullable=False)

    worker = relationship("Worker", back_populates="languages")
