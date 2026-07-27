from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import RequireAdmin
from app.models.user import User
from app.models.booking import Booking
from app.models.worker import Worker
from app.models.service import Service
from app.models.category import Category
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", summary="Dashboard stats")
def get_stats(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.models.customer import Customer
    total_bookings = db.query(Booking).count()
    total_workers = db.query(Worker).count()
    total_customers = db.query(Customer).count()
    total_services = db.query(Service).count()
    active_bookings = db.query(Booking).filter(Booking.status.notin_(["completed", "cancelled", "refunded"])).count()
    return {
        "success": True,
        "message": "OK",
        "data": {
            "total_revenue": 0,
            "total_bookings": total_bookings,
            "total_workers": total_workers,
            "total_customers": total_customers,
            "total_services": total_services,
            "active_bookings": active_bookings,
            "completion_rate": 0,
            "growth_percent": 0,
        },
    }


@router.get("/revenue", summary="Revenue data")
def get_revenue(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    return {"success": True, "message": "OK", "data": []}


@router.get("/bookings", summary="All bookings")
def list_bookings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    total = db.query(Booking).count()
    items = db.query(Booking).order_by(Booking.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "success": True, "message": "OK",
        "data": [{"id": b.id, "status": b.status.value if b.status else "pending", "final_price": b.final_price, "created_at": b.created_at.isoformat() if b.created_at else None} for b in items],
        "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/bookings/{booking_id}", summary="Get booking detail")
def get_booking(
    booking_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if b is None:
        raise NotFoundException(message="Booking not found")
    return {"success": True, "message": "OK", "data": {"id": b.id, "status": b.status.value if b.status else "pending"}}


@router.get("/workers", summary="All workers")
def list_workers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    total = db.query(Worker).count()
    items = db.query(Worker).offset((page - 1) * limit).limit(limit).all()
    return {
        "success": True, "message": "OK",
        "data": [{"id": w.id, "name": w.name, "profession": w.profession, "rating": w.rating, "is_online": w.is_online} for w in items],
        "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/workers/{worker_id}", summary="Get worker detail")
def get_worker(
    worker_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if w is None:
        raise NotFoundException(message="Worker not found")
    return {"success": True, "message": "OK", "data": {"id": w.id, "name": w.name, "profession": w.profession}}


@router.get("/customers", summary="All customers")
def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.models.customer import Customer
    total = db.query(Customer).count()
    items = db.query(Customer).offset((page - 1) * limit).limit(limit).all()
    return {
        "success": True, "message": "OK",
        "data": [{"id": c.id, "name": c.name} for c in items],
        "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/customers/{customer_id}", summary="Get customer detail")
def get_customer(
    customer_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    raise NotFoundException(message="Not found")


@router.get("/categories", summary="All categories")
def list_categories(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    cats = db.query(Category).all()
    return {"success": True, "message": "OK", "data": [{"id": c.id, "name": c.name, "slug": c.slug, "service_count": c.service_count} for c in cats]}


@router.get("/categories/{category_id}", summary="Get category detail")
def get_category(
    category_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    c = db.query(Category).filter(Category.id == category_id).first()
    if c is None:
        raise NotFoundException(message="Category not found")
    return {"success": True, "message": "OK", "data": {"id": c.id, "name": c.name}}


@router.get("/services", summary="All services")
def list_services(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    total = db.query(Service).count()
    items = db.query(Service).offset((page - 1) * limit).limit(limit).all()
    return {
        "success": True, "message": "OK",
        "data": [{"id": s.id, "name": s.name, "base_price": s.base_price} for s in items],
        "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/services/{service_id}", summary="Get service detail")
def get_service(
    service_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    s = db.query(Service).filter(Service.id == service_id).first()
    if s is None:
        raise NotFoundException(message="Service not found")
    return {"success": True, "message": "OK", "data": {"id": s.id, "name": s.name}}


@router.get("/coupons", summary="All coupons")
def list_coupons(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.models.coupon import Coupon
    coupons = db.query(Coupon).all()
    return {"success": True, "message": "OK", "data": [{"id": c.id, "code": c.code, "title": c.title, "is_active": c.is_active} for c in coupons]}


@router.get("/coupons/{coupon_id}", summary="Get coupon detail")
def get_coupon(
    coupon_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    raise NotFoundException(message="Not found")


@router.get("/reports", summary="Reports")
def get_reports(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    return {"success": True, "message": "OK", "data": []}


@router.get("/workers/approvals", summary="Worker approval queue")
def get_worker_approvals(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    return {"success": True, "message": "OK", "data": []}


@router.get("/complaints", summary="All complaints")
def list_complaints(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.models.complaint import Complaint
    complaints = db.query(Complaint).all()
    return {"success": True, "message": "OK", "data": []}


@router.get("/complaints/{complaint_id}", summary="Get complaint detail")
def get_complaint(
    complaint_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    raise NotFoundException(message="Not found")


@router.get("/refunds", summary="All refund requests")
def list_refunds(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    return {"success": True, "message": "OK", "data": []}


@router.get("/refunds/{refund_id}", summary="Get refund detail")
def get_refund(
    refund_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    raise NotFoundException(message="Not found")
