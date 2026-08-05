from typing import Optional, List
from datetime import datetime
from pydantic import Field
from app.schemas.common import SchemaBase


class CustomJobCreateRequest(SchemaBase):
    category_id: Optional[str] = None
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10, max_length=2000)
    budget_min: float = Field(..., gt=0)
    budget_max: float = Field(..., gt=0)
    urgency: Optional[str] = None
    preferred_time: Optional[str] = None
    images: Optional[List[str]] = None


class CustomJobResponse(SchemaBase):
    model_config = {"from_attributes": True}

    id: str
    user_id: str
    category_id: Optional[str] = None
    title: str
    description: str
    budget_min: float
    budget_max: float
    urgency: Optional[str] = None
    preferred_time: Optional[str] = None
    images: Optional[List[str]] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class JobBidCreateRequest(SchemaBase):
    bid_amount: float = Field(..., gt=0)
    message: Optional[str] = Field(None, max_length=1000)
    estimated_time: Optional[str] = None


class JobBidResponse(SchemaBase):
    model_config = {"from_attributes": True}

    id: str
    job_id: str
    worker_id: str
    worker_name: Optional[str] = None
    worker_profession: Optional[str] = None
    worker_avatar: Optional[str] = None
    worker_rating: Optional[float] = None
    worker_review_count: Optional[int] = None
    worker_trust_score: Optional[float] = None
    bid_amount: float
    message: Optional[str] = None
    estimated_time: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class NegotiationMessageCreateRequest(SchemaBase):
    message: Optional[str] = Field(None, max_length=2000)
    proposed_price: Optional[float] = Field(None, gt=0)


class NegotiationMessageResponse(SchemaBase):
    model_config = {"from_attributes": True}

    id: str
    job_id: str
    sender_id: str
    receiver_id: Optional[str] = None
    message: Optional[str] = None
    proposed_price: Optional[float] = None
    created_at: Optional[datetime] = None
