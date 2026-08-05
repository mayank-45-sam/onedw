from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.common import SchemaBase


# ============================================================
# CATEGORY
# ============================================================

class CategoryResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    image: Optional[str] = None
    color: Optional[str] = None
    service_count: int


# ============================================================
# SERVICE
# ============================================================

class ServiceResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    description: str
    category_id: Optional[str] = None
    image: Optional[str] = None
    gallery: Optional[list] = None
    base_price: float
    duration: int
    rating: float
    review_count: int
    popular: bool
    trending: bool
    tags: Optional[list] = None


class ServiceDetailResponse(ServiceResponse):
    category: Optional[CategoryResponse] = None


# ============================================================
# WORKER
# ============================================================

class WorkerSkillResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    skill: str


class WorkerLanguageResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    language: str


class WorkerAvailabilityResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    day: str
    slots: list


class WorkerResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    avatar: Optional[str] = None
    cover_image: Optional[str] = None
    profession: str
    bio: Optional[str] = None
    experience_years: int
    completed_jobs: int
    rating: float
    review_count: int
    hourly_rate: float
    is_online: bool
    category_ids: Optional[list] = None


class WorkerDetailResponse(WorkerResponse):
    skills: List[WorkerSkillResponse] = Field(default_factory=list)
    languages: List[WorkerLanguageResponse] = Field(default_factory=list)
    availability: List[WorkerAvailabilityResponse] = Field(default_factory=list)


# ============================================================
# BOOKING
# ============================================================

class BookingCreateRequest(SchemaBase):
    service_id: str
    worker_id: Optional[str] = None
    problem_description: str = Field(..., min_length=5, max_length=2000)
    scheduled_date: str = Field(..., max_length=20)
    scheduled_time: str = Field(..., max_length=20)
    address: dict
    coupon_code: Optional[str] = None
    problem_images: Optional[List[str]] = None
    booking_type: Optional[str] = "scheduled"
    is_emergency: bool = False


class BookingStatusUpdateRequest(SchemaBase):
    status: str
    note: Optional[str] = Field(None, max_length=500)


class BookingResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    customer_id: str
    worker_id: Optional[str] = None
    service_id: Optional[str] = None
    status: str
    payment_status: str
    payment_method: Optional[str] = None
    problem_description: str
    problem_images: Optional[list] = None
    scheduled_date: str
    scheduled_time: str
    address: dict
    price: float
    currency: str
    coupon_code: Optional[str] = None
    discount: Optional[float] = None
    final_price: float
    eta_minutes: Optional[int] = None
    distance_km: Optional[float] = None
    booking_type: str = "scheduled"
    is_emergency: bool = False


class BookingDetailResponse(BookingResponse):
    service: Optional[ServiceResponse] = None
    worker: Optional[WorkerResponse] = None


# ============================================================
# REVIEW
# ============================================================

class ReviewCreateRequest(SchemaBase):
    booking_id: str
    rating: float = Field(..., ge=1.0, le=5.0)
    behaviour: int = Field(..., ge=1, le=5)
    quality: int = Field(..., ge=1, le=5)
    price: int = Field(..., ge=1, le=5)
    time_rating: int = Field(..., ge=1, le=5, alias="time")
    comment: Optional[str] = Field(None, max_length=2000)
    work_images: Optional[list] = None
    recommends: bool = True


class ReviewResponse(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    booking_id: str
    customer_id: str
    worker_id: str
    service_id: Optional[str] = None
    rating: float
    behaviour: int
    quality: int
    price: int
    comment: Optional[str] = None
    work_images: Optional[list] = None
    recommends: bool


# ============================================================
# PAGINATION
# ============================================================

class PaginatedResponse(SchemaBase):
    data: list
    total: int
    page: int
    limit: int
    pages: int
