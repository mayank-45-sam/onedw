from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user, RequireCustomer, RequireWorker
from app.models.user import User
from app.schemas.marketplace import (
    BookingCreateRequest,
    BookingStatusUpdateRequest,
    ReviewCreateRequest,
)
from app.services.booking_service import BookingService
from app.services.review_service import ReviewService
from app.core.exceptions import BadRequestException, ForbiddenException

router = APIRouter(prefix="", tags=["Bookings", "Reviews"])


def _get_customer_id(db: Session, user_id: str) -> str:
    from app.models.customer import Customer
    cust = db.query(Customer).filter(Customer.user_id == user_id).first()
    if cust is None:
        raise BadRequestException(message="Customer profile not found")
    return cust.id


def _get_worker_id(db: Session, user_id: str) -> str:
    from app.models.worker import Worker
    w = db.query(Worker).filter(Worker.user_id == user_id).first()
    if w is None:
        raise BadRequestException(message="Worker profile not found")
    return w.id


def _serialize_booking(b) -> dict:
    svc = b.service
    wrk = b.worker
    cust = b.customer
    return {
        "id": b.id,
        "customer_id": b.customer_id,
        "worker_id": b.worker_id,
        "service_id": b.service_id,
        "status": b.status.value if b.status else "pending",
        "payment_status": b.payment_status.value if b.payment_status else "unpaid",
        "payment_method": b.payment_method.value if b.payment_method else None,
        "problem_description": b.problem_description,
        "problem_images": b.problem_images or [],
        "scheduled_date": b.scheduled_date,
        "scheduled_time": b.scheduled_time,
        "address": b.address,
        "price": b.price,
        "final_price": b.final_price,
        "eta_minutes": b.eta_minutes,
        "distance_km": b.distance_km,
        "service": {"id": svc.id, "name": svc.name, "image": svc.image} if svc else None,
        "worker": {"id": wrk.id, "name": wrk.name, "profession": wrk.profession, "avatar": wrk.avatar} if wrk else None,
        "customer": {"id": cust.id, "name": cust.name, "avatar": cust.avatar} if cust else None,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


# ============================================================
# BOOKINGS
# ============================================================

@router.post(
    "/bookings",
    status_code=201,
    summary="Create a new booking",
)
def create_booking(
    body: BookingCreateRequest,
    current_user: User = Depends(RequireCustomer),
    db: Session = Depends(get_db),
):
    """Create a new service booking. Only customers can create bookings."""
    customer_id = _get_customer_id(db, current_user.id)
    service = BookingService(db)
    result = service.create_booking(
        customer_id=customer_id,
        service_id=body.service_id,
        problem_description=body.problem_description,
        scheduled_date=body.scheduled_date,
        scheduled_time=body.scheduled_time,
        address=body.address,
        worker_id=body.worker_id,
        coupon_code=body.coupon_code,
        problem_images=body.problem_images,
    )
    return {
        "success": True,
        "message": "Booking created successfully",
        "data": result,
    }


@router.get(
    "/bookings/my-bookings",
    summary="Get current user's bookings",
)
def get_my_bookings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all bookings for the authenticated customer or worker."""
    booking_service = BookingService(db)

    if current_user.role.value == "customer":
        customer_id = _get_customer_id(db, current_user.id)
        result = booking_service.get_my_bookings(customer_id=customer_id, page=page, limit=limit)
    elif current_user.role.value == "worker":
        worker_id = _get_worker_id(db, current_user.id)
        result = booking_service.get_worker_bookings(worker_id=worker_id, page=page, limit=limit)
    else:
        result = {"data": [], "total": 0, "page": page, "limit": limit, "pages": 0}

    return {
        "success": True,
        "message": "Bookings retrieved successfully",
        "data": result["data"],
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "pages": result["pages"],
    }


@router.get(
    "/bookings/upcoming",
    summary="Get upcoming bookings",
)
def get_upcoming_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get upcoming (pending/accepted/in-progress) bookings for the current user."""
    from app.models.booking import Booking, BookingStatus

    active_statuses = [
        BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.WORKER_ASSIGNED,
        BookingStatus.WORKER_ON_THE_WAY, BookingStatus.ARRIVED, BookingStatus.STARTED_WORK,
    ]

    if current_user.role.value == "customer":
        from app.models.customer import Customer
        cust = db.query(Customer).filter(Customer.user_id == current_user.id).first()
        if not cust:
            return {"success": True, "message": "OK", "data": []}
        bookings = db.query(Booking).filter(
            Booking.customer_id == cust.id,
            Booking.status.in_(active_statuses),
        ).order_by(Booking.scheduled_date.asc()).limit(10).all()
    elif current_user.role.value == "worker":
        from app.models.worker import Worker
        wrk = db.query(Worker).filter(Worker.user_id == current_user.id).first()
        if not wrk:
            return {"success": True, "message": "OK", "data": []}
        bookings = db.query(Booking).filter(
            Booking.worker_id == wrk.id,
            Booking.status.in_(active_statuses),
        ).order_by(Booking.scheduled_date.asc()).limit(10).all()
    else:
        bookings = []

    return {"success": True, "message": "OK", "data": [_serialize_booking(b) for b in bookings]}


@router.get(
    "/bookings/recent",
    summary="Get recent bookings",
)
def get_recent_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get recently completed/cancelled bookings for the current user."""
    from app.models.booking import Booking, BookingStatus

    past_statuses = [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REFUNDED]

    if current_user.role.value == "customer":
        from app.models.customer import Customer
        cust = db.query(Customer).filter(Customer.user_id == current_user.id).first()
        if not cust:
            return {"success": True, "message": "OK", "data": []}
        bookings = db.query(Booking).filter(
            Booking.customer_id == cust.id,
            Booking.status.in_(past_statuses),
        ).order_by(Booking.created_at.desc()).limit(10).all()
    elif current_user.role.value == "worker":
        from app.models.worker import Worker
        wrk = db.query(Worker).filter(Worker.user_id == current_user.id).first()
        if not wrk:
            return {"success": True, "message": "OK", "data": []}
        bookings = db.query(Booking).filter(
            Booking.worker_id == wrk.id,
            Booking.status.in_(past_statuses),
        ).order_by(Booking.created_at.desc()).limit(10).all()
    else:
        bookings = []

    return {"success": True, "message": "OK", "data": [_serialize_booking(b) for b in bookings]}


@router.get(
    "/bookings/{booking_id}",
    summary="Get booking by ID",
)
def get_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single booking with full details."""
    service = BookingService(db)
    result = service.get_booking(booking_id)
    return {
        "success": True,
        "message": "Booking retrieved successfully",
        "data": result,
    }


@router.patch(
    "/bookings/{booking_id}/status",
    summary="Update booking status",
)
def update_booking_status(
    booking_id: str,
    body: BookingStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update booking status. Only assigned worker or admin can update."""
    service = BookingService(db)
    result = service.update_booking_status(
        booking_id=booking_id,
        new_status=body.status,
        user_id=current_user.id,
        user_role=current_user.role.value,
        note=body.note,
    )
    return {
        "success": True,
        "message": "Booking status updated successfully",
        "data": result,
    }


# ============================================================
# REVIEWS
# ============================================================

@router.get(
    "/reviews",
    summary="Get recent reviews",
)
def get_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get recent reviews across all workers (public)."""
    from app.models.review import Review
    from app.models.customer import Customer

    query = db.query(Review).order_by(Review.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    data = []
    for r in items:
        cust = db.query(Customer).filter(Customer.id == r.customer_id).first()
        data.append({
            "id": r.id,
            "booking_id": r.booking_id,
            "customer_id": r.customer_id,
            "worker_id": r.worker_id,
            "rating": r.rating,
            "behaviour": r.behaviour,
            "quality": r.quality,
            "price": r.price,
            "comment": r.comment,
            "work_images": r.work_images or [],
            "recommends": r.recommends,
            "customer": {"name": cust.name, "avatar": cust.avatar} if cust else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {
        "success": True,
        "message": "Reviews retrieved successfully",
        "data": data,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.post(
    "/reviews",
    status_code=201,
    summary="Create a review",
)
def create_review(
    body: ReviewCreateRequest,
    current_user: User = Depends(RequireCustomer),
    db: Session = Depends(get_db),
):
    """Create a review for a completed booking. One review per booking."""
    customer_id = _get_customer_id(db, current_user.id)
    service = ReviewService(db)
    result = service.create_review(
        customer_id=customer_id,
        booking_id=body.booking_id,
        rating=body.rating,
        behaviour=body.behaviour,
        quality=body.quality,
        price=body.price,
        time_rating=body.time_rating,
        comment=body.comment,
        work_images=body.work_images,
        recommends=body.recommends,
    )
    return {
        "success": True,
        "message": "Review created successfully",
        "data": result,
    }


@router.get(
    "/reviews/worker/{worker_id}",
    summary="Get worker reviews",
)
def get_worker_reviews(
    worker_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get all reviews for a specific worker with average rating."""
    service = ReviewService(db)
    result = service.get_worker_reviews(worker_id=worker_id, page=page, limit=limit)
    return {
        "success": True,
        "message": "Reviews retrieved successfully",
        "data": result["data"],
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "pages": result["pages"],
        "average_rating": result["average_rating"],
        "review_count": result["review_count"],
    }
