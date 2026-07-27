import uuid
from sqlalchemy import Column, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Message(BaseModel):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = Column(String(5000), nullable=True)
    image = Column(String(500), nullable=True)
    voice_note = Column(JSON, nullable=True)
    attachments = Column(JSON, default=list, nullable=True)
    status = Column(String(20), default="sent", nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
