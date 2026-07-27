import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class WorkerSkill(BaseModel):
    __tablename__ = "worker_skills"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    skill = Column(String(255), nullable=False)

    worker = relationship("Worker", back_populates="skills")
