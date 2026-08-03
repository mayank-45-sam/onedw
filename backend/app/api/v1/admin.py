from typing import Optional
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import RequireAdmin
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.worker import Worker
from app.models.customer import Customer
from app.models.service import Service
from app.models.category import Category
from app.models.coupon import Coupon
from app.models.complaint import Complaint
from app.core.exceptions import NotFoundException, BadRequestException

router = APIRouter(prefix="/admin", tags=["Admin"])


# ============================================================
# DASHBOARD
# ============================================================

@router.get("/stats", summary="Dashboard stats")
def get_stats(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    total_bookings = db.query(Booking).count()
    total_workers = db.query(Worker).count()
    total_customers = db.query(Customer).count()
    total_services = db.query(Service).count()
    active_bookings = db.query(Booking).filter(
        Booking.status.notin_([BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REFUNDED])
    ).count()
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


# ============================================================
# BOOKINGS
# ============================================================

@router.get("/bookings", summary="All bookings")
def list_bookings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    query = db.query(Booking)
    if status:
        query = query.filter(Booking.status == status)
    total = query.count()
    items = query.order_by(Booking.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
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


@router.put("/bookings/{booking_id}", summary="Update booking")
def update_booking(
    booking_id: str,
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if b is None:
        raise NotFoundException(message="Booking not found")
    if "status" in body:
        b.status = BookingStatus(body["status"])
    db.commit()
    db.refresh(b)
    return {"success": True, "message": "Booking updated", "data": {"id": b.id, "status": b.status.value}}


@router.delete("/bookings/{booking_id}", summary="Delete booking")
def delete_booking(
    booking_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if b is None:
        raise NotFoundException(message="Booking not found")
    db.delete(b)
    db.commit()
    return {"success": True, "message": "Booking deleted"}


# ============================================================
# WORKERS
# ============================================================

@router.get("/workers", summary="All workers")
def list_workers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    query = db.query(Worker)
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    return {
        "success": True, "message": "OK",
        "data": [{"id": w.id, "name": w.name, "profession": w.profession, "rating": w.rating, "is_online": w.is_online, "aadhaar_verified": w.aadhaar_verified} for w in items],
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
    return {"success": True, "message": "OK", "data": {"id": w.id, "name": w.name, "profession": w.profession, "aadhaar_verified": w.aadhaar_verified}}


@router.put("/workers/{worker_id}", summary="Update worker")
def update_worker(
    worker_id: str,
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if w is None:
        raise NotFoundException(message="Worker not found")
    if "isOnline" in body:
        w.is_online = body["isOnline"]
    if "is_online" in body:
        w.is_online = body["is_online"]
    db.commit()
    db.refresh(w)
    return {"success": True, "message": "Worker updated", "data": {"id": w.id, "name": w.name, "is_online": w.is_online}}


@router.delete("/workers/{worker_id}", summary="Delete worker")
def delete_worker(
    worker_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if w is None:
        raise NotFoundException(message="Worker not found")
    db.delete(w)
    db.commit()
    return {"success": True, "message": "Worker deleted"}


@router.post("/workers/{worker_id}/approve", summary="Approve worker")
def approve_worker(
    worker_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if w is None:
        raise NotFoundException(message="Worker not found")
    user = db.query(User).filter(User.id == w.user_id).first()
    if user:
        user.is_verified = True
    db.commit()
    return {"success": True, "message": "Worker approved"}


@router.post("/workers/{worker_id}/reject", summary="Reject worker")
def reject_worker(
    worker_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if w is None:
        raise NotFoundException(message="Worker not found")
    db.delete(w)
    db.commit()
    return {"success": True, "message": "Worker rejected and removed"}


# ============================================================
# CUSTOMERS
# ============================================================

@router.get("/customers", summary="All customers")
def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
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
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if c is None:
        raise NotFoundException(message="Customer not found")
    return {"success": True, "message": "OK", "data": {"id": c.id, "name": c.name}}


@router.delete("/customers/{customer_id}", summary="Delete customer")
def delete_customer(
    customer_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if c is None:
        raise NotFoundException(message="Customer not found")
    db.delete(c)
    db.commit()
    return {"success": True, "message": "Customer deleted"}


# ============================================================
# CATEGORIES
# ============================================================

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


@router.post("/categories", status_code=201, summary="Create category")
def create_category(
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    import re
    name = body.get("name", "").strip()
    if not name:
        raise BadRequestException(message="Category name is required")
    slug = body.get("slug") or re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    existing = db.query(Category).filter(Category.slug == slug).first()
    if existing:
        raise BadRequestException(message="Category with this slug already exists")
    cat = Category(
        name=name,
        slug=slug,
        description=body.get("description"),
        icon=body.get("icon"),
        image=body.get("image"),
        color=body.get("color"),
        service_count=0,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"success": True, "message": "Category created", "data": {"id": cat.id, "name": cat.name, "slug": cat.slug}}


@router.put("/categories/{category_id}", summary="Update category")
def update_category(
    category_id: str,
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    c = db.query(Category).filter(Category.id == category_id).first()
    if c is None:
        raise NotFoundException(message="Category not found")
    for field in ["name", "slug", "description", "icon", "image", "color"]:
        if field in body:
            setattr(c, field, body[field])
    db.commit()
    db.refresh(c)
    return {"success": True, "message": "Category updated", "data": {"id": c.id, "name": c.name, "slug": c.slug}}


@router.delete("/categories/{category_id}", summary="Delete category")
def delete_category(
    category_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    c = db.query(Category).filter(Category.id == category_id).first()
    if c is None:
        raise NotFoundException(message="Category not found")
    db.delete(c)
    db.commit()
    return {"success": True, "message": "Category deleted"}


# ============================================================
# SERVICES
# ============================================================

@router.get("/services", summary="All services")
def list_services(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
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


@router.post("/services", status_code=201, summary="Create service")
def create_service(
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    import re
    name = body.get("name", "").strip()
    if not name:
        raise BadRequestException(message="Service name is required")
    slug = body.get("slug") or re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    svc = Service(
        name=name,
        slug=slug,
        description=body.get("description", ""),
        category_id=body.get("category_id"),
        image=body.get("image"),
        base_price=body.get("base_price", 0),
        duration=body.get("duration", 60),
        popular=body.get("popular", False),
        trending=body.get("trending", False),
        tags=body.get("tags", []),
    )
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return {"success": True, "message": "Service created", "data": {"id": svc.id, "name": svc.name}}


@router.put("/services/{service_id}", summary="Update service")
def update_service(
    service_id: str,
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    s = db.query(Service).filter(Service.id == service_id).first()
    if s is None:
        raise NotFoundException(message="Service not found")
    for field in ["name", "slug", "description", "category_id", "image", "base_price", "duration", "popular", "trending", "tags"]:
        if field in body:
            setattr(s, field, body[field])
    db.commit()
    db.refresh(s)
    return {"success": True, "message": "Service updated", "data": {"id": s.id, "name": s.name}}


@router.delete("/services/{service_id}", summary="Delete service")
def delete_service(
    service_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    s = db.query(Service).filter(Service.id == service_id).first()
    if s is None:
        raise NotFoundException(message="Service not found")
    db.delete(s)
    db.commit()
    return {"success": True, "message": "Service deleted"}


# ============================================================
# COUPONS
# ============================================================

@router.get("/coupons", summary="All coupons")
def list_coupons(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    coupons = db.query(Coupon).all()
    return {"success": True, "message": "OK", "data": [{"id": c.id, "code": c.code, "title": c.title, "is_active": c.is_active} for c in coupons]}


@router.get("/coupons/{coupon_id}", summary="Get coupon detail")
def get_coupon(
    coupon_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    c = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if c is None:
        raise NotFoundException(message="Coupon not found")
    return {"success": True, "message": "OK", "data": {"id": c.id, "code": c.code, "title": c.title}}


@router.post("/coupons", status_code=201, summary="Create coupon")
def create_coupon(
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    code = body.get("code", "").strip().upper()
    if not code:
        raise BadRequestException(message="Coupon code is required")
    existing = db.query(Coupon).filter(Coupon.code == code).first()
    if existing:
        raise BadRequestException(message="Coupon code already exists")
    coupon = Coupon(
        code=code,
        title=body.get("title", ""),
        description=body.get("description"),
        type=body.get("type", "percentage"),
        value=body.get("value", 0),
        max_discount=body.get("max_discount"),
        min_order=body.get("min_order"),
        valid_from=body.get("valid_from"),
        valid_until=body.get("valid_until"),
        usage_limit=body.get("usage_limit"),
        is_active=body.get("is_active", True),
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return {"success": True, "message": "Coupon created", "data": {"id": coupon.id, "code": coupon.code}}


@router.put("/coupons/{coupon_id}", summary="Update coupon")
def update_coupon(
    coupon_id: str,
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    c = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if c is None:
        raise NotFoundException(message="Coupon not found")
    for field in ["code", "title", "description", "type", "value", "max_discount", "min_order", "valid_from", "valid_until", "usage_limit", "is_active"]:
        if field in body:
            setattr(c, field, body[field])
    db.commit()
    db.refresh(c)
    return {"success": True, "message": "Coupon updated", "data": {"id": c.id, "code": c.code}}


@router.delete("/coupons/{coupon_id}", summary="Delete coupon")
def delete_coupon(
    coupon_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    c = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if c is None:
        raise NotFoundException(message="Coupon not found")
    db.delete(c)
    db.commit()
    return {"success": True, "message": "Coupon deleted"}


# ============================================================
# REPORTS
# ============================================================

@router.get("/reports", summary="Reports")
def get_reports(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    return {"success": True, "message": "OK", "data": []}


# ============================================================
# WORKER APPROVALS
# ============================================================

@router.get("/workers/approvals", summary="Worker approval queue")
def get_worker_approvals(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    return {"success": True, "message": "OK", "data": []}


# ============================================================
# AADHAAR VERIFICATION
# ============================================================

@router.get("/workers/{worker_id}/aadhaar/status", summary="Get worker Aadhaar status")
def get_worker_aadhaar_status(
    worker_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if w is None:
        raise NotFoundException(message="Worker not found")
    return {
        "success": True,
        "message": "OK",
        "data": {
            "aadhaar_verified": w.aadhaar_verified,
            "aadhaar_verified_at": w.aadhaar_verified_at.isoformat() if w.aadhaar_verified_at else None,
        },
    }


@router.post("/workers/{worker_id}/aadhaar/verify", summary="Verify worker Aadhaar")
def verify_worker_aadhaar(
    worker_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if w is None:
        raise NotFoundException(message="Worker not found")
    w.aadhaar_verified = True
    from datetime import datetime, timezone
    w.aadhaar_verified_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(w)
    return {"success": True, "message": "Worker Aadhaar verified"}


@router.post("/workers/{worker_id}/aadhaar/reject", summary="Reject worker Aadhaar")
def reject_worker_aadhaar(
    worker_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if w is None:
        raise NotFoundException(message="Worker not found")
    w.aadhaar_number_hash = None
    w.aadhaar_verified = False
    w.aadhaar_verified_at = None
    db.commit()
    db.refresh(w)
    return {"success": True, "message": "Worker Aadhaar verification rejected"}


# ============================================================
# COMPLAINTS
# ============================================================

@router.get("/complaints", summary="All complaints")
def list_complaints(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    query = db.query(Complaint)
    if status:
        query = query.filter(Complaint.status == status)
    total = query.count()
    items = query.order_by(Complaint.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "success": True, "message": "OK",
        "data": [{"id": c.id, "subject": c.subject, "status": c.status, "customer_id": c.customer_id, "created_at": c.created_at.isoformat() if c.created_at else None} for c in items],
        "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/complaints/{complaint_id}", summary="Get complaint detail")
def get_complaint(
    complaint_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if c is None:
        raise NotFoundException(message="Complaint not found")
    return {"success": True, "message": "OK", "data": {"id": c.id, "subject": c.subject, "status": c.status}}


@router.put("/complaints/{complaint_id}", summary="Update complaint")
def update_complaint(
    complaint_id: str,
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if c is None:
        raise NotFoundException(message="Complaint not found")
    if "status" in body:
        c.status = body["status"]
    db.commit()
    db.refresh(c)
    return {"success": True, "message": "Complaint updated", "data": {"id": c.id, "status": c.status}}


# ============================================================
# REFUNDS
# ============================================================

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


@router.put("/refunds/{refund_id}", summary="Update refund")
def update_refund(
    refund_id: str,
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    return {"success": True, "message": "Refund updated", "data": {"id": refund_id, "status": body.get("status", "pending")}}

# ============================================================
# WORKER VERIFICATION
# ============================================================

@router.get("/verification/stats", summary="Verification dashboard stats")
def get_verification_stats(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.models.verification import WorkerVerification

    total = db.query(WorkerVerification).count()
    pending = db.query(WorkerVerification).filter(WorkerVerification.admin_status == "pending").count()
    approved = db.query(WorkerVerification).filter(WorkerVerification.admin_status == "approved").count()
    rejected = db.query(WorkerVerification).filter(WorkerVerification.admin_status == "rejected").count()
    completed = db.query(WorkerVerification).filter(WorkerVerification.status == "completed").count()
    in_progress = db.query(WorkerVerification).filter(WorkerVerification.status == "in_progress").count()

    badge_counts = {}
    for badge in ["gold", "pro", "beginner", "rejected"]:
        badge_counts[badge] = db.query(WorkerVerification).filter(
            WorkerVerification.badge == badge
        ).count()

    return {
        "success": True,
        "message": "OK",
        "data": {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "completed": completed,
            "in_progress": in_progress,
            "badge_counts": badge_counts,
        },
    }


@router.get("/verification", summary="List verification requests")
def list_verifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    badge: Optional[str] = Query(None),
    profession: Optional[str] = Query(None),
    admin_status: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.models.verification import WorkerVerification

    query = db.query(WorkerVerification)
    if badge:
        query = query.filter(WorkerVerification.badge == badge)
    if profession:
        query = query.filter(WorkerVerification.profession.ilike(f"%{profession}%"))
    if admin_status:
        query = query.filter(WorkerVerification.admin_status == admin_status)
    if status:
        query = query.filter(WorkerVerification.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (WorkerVerification.worker_id.in_(
                db.query(Worker.id).filter(
                    (Worker.name.ilike(like)) | (Worker.user.has(User.email.ilike(like)))
                )
            ))
            | (WorkerVerification.profession.ilike(like))
        )

    total = query.count()
    items = query.order_by(WorkerVerification.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    from app.services.verification_service import serialize_verification
    data = [serialize_verification(v) for v in items]

    return {
        "success": True,
        "message": "OK",
        "data": data,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/verification/{verification_id}", summary="Verification full detail")
def get_verification_detail(
    verification_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.models.verification import WorkerVerification
    from app.services.verification_service import serialize_verification

    verification = db.query(WorkerVerification).filter(WorkerVerification.id == verification_id).first()
    if verification is None:
        raise NotFoundException(message="Verification not found")
    return {
        "success": True,
        "message": "OK",
        "data": serialize_verification(verification, include_stages=True),
    }


@router.post("/verification/{verification_id}/approve", summary="Approve a worker verification")
def approve_verification(
    verification_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.models.verification import WorkerVerification
    from datetime import datetime, timezone

    verification = db.query(WorkerVerification).filter(WorkerVerification.id == verification_id).first()
    if verification is None:
        raise NotFoundException(message="Verification not found")
    if verification.status != "completed":
        raise BadRequestException(message="Only completed verifications can be approved")

    verification.admin_status = "approved"
    verification.reviewed_by = current_user.email
    verification.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    if verification.badge == "rejected":
        verification.badge = "beginner"
        verification.trust_score = max(60.0, verification.trust_score or 0.0)
    worker = db.query(Worker).filter(Worker.id == verification.worker_id).first()
    if worker:
        worker.verification_status = "completed"
        worker.verification_badge = verification.badge
        worker.trust_score = verification.trust_score
        if worker.user:
            worker.user.is_verified = True
    db.commit()
    db.refresh(verification)
    return {
        "success": True,
        "message": "Verification approved",
        "data": {"id": verification.id, "admin_status": verification.admin_status, "badge": verification.badge},
    }


@router.post("/verification/{verification_id}/reject", summary="Reject a worker verification")
def reject_verification(
    verification_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.models.verification import WorkerVerification
    from datetime import datetime, timedelta, timezone

    verification = db.query(WorkerVerification).filter(WorkerVerification.id == verification_id).first()
    if verification is None:
        raise NotFoundException(message="Verification not found")

    verification.admin_status = "rejected"
    verification.badge = "rejected"
    verification.reviewed_by = current_user.email
    verification.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    verification.retry_available_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)
    worker = db.query(Worker).filter(Worker.id == verification.worker_id).first()
    if worker:
        worker.verification_status = "rejected"
        worker.verification_badge = "rejected"
        if worker.user:
            worker.user.is_verified = False
    db.commit()
    db.refresh(verification)
    return {
        "success": True,
        "message": "Verification rejected",
        "data": {"id": verification.id, "admin_status": verification.admin_status, "badge": verification.badge},
    }


@router.post("/verification/{verification_id}/notes", summary="Add an admin note")
def add_verification_note(
    verification_id: str,
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.models.verification import WorkerVerification

    verification = db.query(WorkerVerification).filter(WorkerVerification.id == verification_id).first()
    if verification is None:
        raise NotFoundException(message="Verification not found")
    note = body.get("note")
    if not note:
        raise BadRequestException(message="Note is required")
    existing = verification.admin_notes or ""
    verification.admin_notes = f"{existing}\n{note}".strip()
    db.commit()
    db.refresh(verification)
    return {"success": True, "message": "Note added", "data": {"id": verification.id, "admin_notes": verification.admin_notes}}


@router.post("/verification/{verification_id}/retake", summary="Allow an immediate retake")
def allow_retake(
    verification_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.models.verification import WorkerVerification

    verification = db.query(WorkerVerification).filter(WorkerVerification.id == verification_id).first()
    if verification is None:
        raise NotFoundException(message="Verification not found")
    verification.retry_available_at = None
    verification.badge = None
    verification.status = "in_progress"
    verification.step = "documents"
    verification.admin_status = "pending"
    db.commit()
    db.refresh(verification)
    return {"success": True, "message": "Retake allowed", "data": {"id": verification.id}}


@router.post("/verification/demo/load", summary="Demo Mode: load sample verification data")
def load_demo_verifications(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    from app.seeds.verification_seed import seed_demo_verifications

    result = seed_demo_verifications(db)
    return {
        "success": True,
        "message": "Demo verification data loaded",
        "data": result,
    }
