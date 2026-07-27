import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Notification(BaseModel):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(String(1000), nullable=False)
    type = Column(String(50), nullable=False)
    read = Column(Boolean, default=False, nullable=False)
    data = Column(JSON, nullable=True)

    user = relationship("User", back_populates="notifications")
