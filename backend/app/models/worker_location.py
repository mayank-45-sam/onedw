import uuid
from sqlalchemy import Column, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class WorkerLocation(BaseModel):
    __tablename__ = "worker_locations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    worker = relationship("Worker", back_populates="location")
