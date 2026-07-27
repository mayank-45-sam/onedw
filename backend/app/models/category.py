import uuid
from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Category(BaseModel):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), unique=True, nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(String(1000), nullable=True)
    icon = Column(String(100), nullable=True)
    image = Column(String(500), nullable=True)
    color = Column(String(20), nullable=True)
    service_count = Column(Integer, default=0, nullable=False)

    services = relationship("Service", back_populates="category", cascade="all, delete-orphan")
