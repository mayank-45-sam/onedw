import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Certificate(BaseModel):
    __tablename__ = "certificates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    image = Column(String(500), nullable=False)
    issued_at = Column(DateTime(timezone=True), nullable=True)

    worker = relationship("Worker", back_populates="certificates")
