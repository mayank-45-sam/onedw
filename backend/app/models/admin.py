import uuid
from sqlalchemy import Column, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Admin(BaseModel):
    __tablename__ = "admins"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)
    permissions = Column(JSON, default=list, nullable=True)

    user = relationship("User", back_populates="admin_profile")
