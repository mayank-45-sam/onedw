import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class PortfolioImage(BaseModel):
    __tablename__ = "portfolio_images"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String(36), ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    caption = Column(String(255), nullable=True)

    worker = relationship("Worker", back_populates="portfolio_images")
