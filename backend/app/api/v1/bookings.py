"""Bookings & Reviews API — async Beanie version."""
from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from pydantic import Field

from app.dependencies.auth import get_current_user, RequireCustomer, RequireWorker
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.customer import Customer
from app.models.worker import Worker
from app.models.review import Review
from app.schemas.marketplace import (
    BookingCreateRequest,
    BookingStatusUpdateRequest,
    ReviewCreateRequest,
)
from app.services.booking_service import BookingService
from app.services.instant_booking_service import create_instant_booking, find_nearest_workers
from app.services.review_service import ReviewService
from app.core.exceptions import BadRequestException, ForbiddenException
from app.schemas.common import SchemaBase

router = APIRouter(prefix="", tags=["Bookings", "Reviews"])


async def _get_customer_id(user_id: str) -> str:
    cust = await Customer.find_one(Customer.user_id == user_id)
    if cust is None:
        raise BadRequestException(message="Customer profile not found")
    return cust.id


async def _get_worker_id(user_id: str) -> str:
    w = await Worker.find_one(Worker.user_id == user_id)
    if w is None:
        raise BadRequestException(message="Worker profile not found")
    return w.id


# ============================================================
# BOOKINGS
# ============================================================

@router.post("/bookings", status_code=201, summary="Create a new booking")
async def create_booking(
    body: BookingCreateRequest,
    current_user: User = Depends(RequireCustomer),
):
    """Create a new service booking. Only customers can create bookings."""
    customer_id = await _get_customer_id(current_user.id)
    service = BookingService()
    result = await service.create_booking(
        customer_id=customer_id,
        user_id=current_user.id,
        service_id=body.service_id,
        problem_description=body.problem_description,
        scheduled_date=body.scheduled_date,
        scheduled_time=body.scheduled_time,
        address=body.address,
        worker_id=body.worker_id,
        coupon_code=body.coupon_code,
        problem_images=body.problem_images,
        booking_type=body.booking_type,
        is_emergency=body.is_emergency,
    )
    return {"success": True, "message": "Booking created successfully", "data": result}


@router.get("/bookings/my-bookings", summary="Get current user's bookings")
async def get_my_bookings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """Get all bookings for the authenticated customer or worker."""
    booking_service = BookingService()

    if current_user.role.value == "customer":
        customer_id = await _get_customer_id(current_user.id)
        result = await booking_service.get_my_bookings(customer_id=customer_id, page=page, limit=limit)
    elif current_user.role.value == "worker":
        worker_id = await _get_worker_id(current_user.id)
        result = await booking_service.get_worker_bookings(worker_id=worker_id, page=page, limit=limit)
    else:
        result = {"data": [], "total": 0, "page": page, "limit": limit, "pages": 0}

    return {
        "success": True, "message": "Bookings retrieved successfully",
        "data": result["data"], "total": result["total"],
        "page": result["page"], "limit": result["limit"], "pages": result["pages"],
    }


@router.get("/bookings/upcoming", summary="Get upcoming bookings")
async def get_upcoming_bookings(current_user: User = Depends(get_current_user)):
    """Get upcoming (pending/accepted/in-progress) bookings for the current user."""
    active_statuses = [
        BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.WORKER_ASSIGNED,
        BookingStatus.WORKER_ON_THE_WAY, BookingStatus.ARRIVED, BookingStatus.STARTED_WORK,
    ]
    active_values = [s.value for s in active_statuses]

    if current_user.role.value == "customer":
        cust = await Customer.find_one(Customer.user_id == current_user.id)
        if not cust:
            return {"success": True, "message": "OK", "data": []}
        bookings = await Booking.find(Booking.customer_id == cust.id).to_list()
        bookings = [b for b in bookings if (b.status.value if hasattr(b.status, 'value') else b.status) in active_values]
    elif current_user.role.value == "worker":
        wrk = await Worker.find_one(Worker.user_id == current_user.id)
        if not wrk:
            return {"success": True, "message": "OK", "data": []}
        bookings = await Booking.find(Booking.worker_id == wrk.id).to_list()
        bookings = [b for b in bookings if (b.status.value if hasattr(b.status, 'value') else b.status) in active_values]
    else:
        bookings = []

    return {"success": True, "message": "OK", "data": [_serialize_booking_simple(b) for b in bookings[:10]]}


@router.get("/bookings/recent", summary="Get recent bookings")
async def get_recent_bookings(current_user: User = Depends(get_current_user)):
    """Get recently completed/cancelled bookings for the current user."""
    past_statuses = [BookingStatus.COMPLETED.value, BookingStatus.CANCELLED.value, BookingStatus.REFUNDED.value]

    if current_user.role.value == "customer":
        cust = await Customer.find_one(Customer.user_id == current_user.id)
        if not cust:
            return {"success": True, "message": "OK", "data": []}
        bookings = await Booking.find(Booking.customer_id == cust.id).to_list()
        bookings = [b for b in bookings if (b.status.value if hasattr(b.status, 'value') else b.status) in past_statuses]
    elif current_user.role.value == "worker":
        wrk = await Worker.find_one(Worker.user_id == current_user.id)
        if not wrk:
            return {"success": True, "message": "OK", "data": []}
        bookings = await Booking.find(Booking.worker_id == wrk.id).to_list()
        bookings = [b for b in bookings if (b.status.value if hasattr(b.status, 'value') else b.status) in past_statuses]
    else:
        bookings = []

    bookings.sort(key=lambda b: b.created_at or "", reverse=True)
    return {"success": True, "message": "OK", "data": [_serialize_booking_simple(b) for b in bookings[:10]]}


def _serialize_booking_simple(b) -> dict:
    return {
        "id": b.id, "customer_id": b.customer_id, "worker_id": b.worker_id, "service_id": b.service_id,
        "status": b.status.value if hasattr(b.status, "value") else b.status,
        "payment_status": b.payment_status.value if hasattr(b.payment_status, "value") else b.payment_status,
        "payment_method": b.payment_method.value if b.payment_method and hasattr(b.payment_method, "value") else b.payment_method,
        "problem_description": b.problem_description, "problem_images": b.problem_images or [],
        "scheduled_date": b.scheduled_date, "scheduled_time": b.scheduled_time,
        "address": b.address, "price": b.price, "final_price": b.final_price,
        "eta_minutes": b.eta_minutes, "distance_km": b.distance_km,
        "booking_type": b.booking_type.value if hasattr(b.booking_type, "value") else b.booking_type,
        "is_emergency": b.is_emergency,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


# ============================================================
# INSTANT & EMERGENCY BOOKING
# ============================================================

class InstantBookingRequest(SchemaBase):
    service_id: str
    problem_description: str = Field(..., min_length=5, max_length=2000)
    scheduled_date: str = Field(..., max_length=20)
    scheduled_time: str = Field(..., max_length=20)
    address: dict
    customer_lat: Optional[float] = Field(None, ge=-90, le=90)
    customer_lng: Optional[float] = Field(None, ge=-180, le=180)
    is_emergency: bool = False
    coupon_code: Optional[str] = None
    problem_images: Optional[List[str]] = None


@router.get("/bookings/nearby-workers", summary="Find nearest available workers for instant booking")
async def get_nearby_workers_for_booking(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    service_id: Optional[str] = Query(None),
    radius_km: float = Query(10.0, gt=0, le=100),
    limit: int = Query(8, ge=1, le=50),
):
    """Return online workers near the given location, ranked by ETA."""
    workers = await find_nearest_workers(lat=lat, lng=lng, service_id=service_id, radius_km=radius_km, limit=limit)
    return {"success": True, "message": "Nearby workers retrieved", "data": workers}


@router.post("/bookings/instant", status_code=201, summary="Create an instant or emergency booking")
async def create_instant_booking_endpoint(
    body: InstantBookingRequest,
    current_user: User = Depends(RequireCustomer),
):
    """Create an instant or emergency booking with auto worker assignment."""
    cust = await Customer.find_one(Customer.user_id == current_user.id)
    if cust is None:
        raise BadRequestException(message="Customer profile not found")

    result = await create_instant_booking(
        customer_id=cust.id, user_id=current_user.id, service_id=body.service_id,
        problem_description=body.problem_description, scheduled_date=body.scheduled_date,
        scheduled_time=body.scheduled_time, address=body.address,
        customer_lat=body.customer_lat, customer_lng=body.customer_lng,
        is_emergency=body.is_emergency, coupon_code=body.coupon_code,
        problem_images=body.problem_images,
    )
    return {
        "success": True,
        "message": "Instant booking created successfully" if not result.get("fallback") else result.get("message", "Booking created with fallback"),
        "data": result,
    }


# ============================================================
# BOOKING DETAIL
# ============================================================

@router.get("/bookings/{booking_id}", summary="Get booking by ID")
async def get_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get a single booking with full details."""
    service = BookingService()
    result = await service.get_booking(booking_id)
    return {"success": True, "message": "Booking retrieved successfully", "data": result}


@router.patch("/bookings/{booking_id}/status", summary="Update booking status")
async def update_booking_status(
    booking_id: str,
    body: BookingStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    """Update booking status. Only assigned worker or admin can update."""
    service = BookingService()
    result = await service.update_booking_status(
        booking_id=booking_id, new_status=body.status,
        user_id=current_user.id, user_role=current_user.role.value, note=body.note,
    )
    return {"success": True, "message": "Booking status updated successfully", "data": result}


# ============================================================
# REVIEWS
# ============================================================

@router.get("/reviews", summary="Get recent reviews")
async def get_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get recent reviews across all workers (public)."""
    all_reviews = await Review.find_all().to_list()
    all_reviews.sort(key=lambda r: r.created_at or "", reverse=True)
    total = len(all_reviews)
    items = all_reviews[(page - 1) * limit: page * limit]

    data = []
    for r in items:
        cust = await Customer.find_one(Customer.id == r.customer_id) if r.customer_id else None
        data.append({
            "id": r.id, "booking_id": r.booking_id,
            "customer_id": r.customer_id, "worker_id": r.worker_id,
            "rating": r.rating, "behaviour": r.behaviour, "quality": r.quality,
            "price": r.price, "comment": r.comment,
            "work_images": r.work_images or [], "recommends": r.recommends,
            "customer": {"name": cust.name, "avatar": cust.avatar} if cust else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {
        "success": True, "message": "Reviews retrieved successfully",
        "data": data, "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.post("/reviews", status_code=201, summary="Create a review")
async def create_review(
    body: ReviewCreateRequest,
    current_user: User = Depends(RequireCustomer),
):
    """Create a review for a completed booking. One review per booking."""
    customer_id = await _get_customer_id(current_user.id)
    service = ReviewService()
    result = await service.create_review(
        customer_id=customer_id, booking_id=body.booking_id,
        rating=body.rating, behaviour=body.behaviour, quality=body.quality,
        price=body.price, time_rating=body.time_rating, comment=body.comment,
        work_images=body.work_images, recommends=body.recommends,
    )
    return {"success": True, "message": "Review created successfully", "data": result}


@router.get("/reviews/worker/{worker_id}", summary="Get worker reviews")
async def get_worker_reviews(
    worker_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get all reviews for a specific worker with average rating."""
    service = ReviewService()
    result = await service.get_worker_reviews(worker_id=worker_id, page=page, limit=limit)
    return {
        "success": True, "message": "Reviews retrieved successfully",
        "data": result["data"], "total": result["total"],
        "page": result["page"], "limit": result["limit"], "pages": result["pages"],
        "average_rating": result["average_rating"], "review_count": result["review_count"],
    }
