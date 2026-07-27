import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Conversation(BaseModel):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    participants = Column(JSON, nullable=False)
    last_message_id = Column(String(36), nullable=True)
    unread_count = Column(Integer, default=0, nullable=False)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
