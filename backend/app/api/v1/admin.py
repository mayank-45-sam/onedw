"""Admin API — async Beanie version."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, Body

from app.dependencies.auth import RequireAdmin
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.worker import Worker
from app.models.customer import Customer
from app.models.service import Service
from app.models.category import Category
from app.models.coupon import Coupon
from app.models.complaint import Complaint
from app.services.booking_service import BookingService
from app.core.exceptions import NotFoundException, BadRequestException

router = APIRouter(prefix="/admin", tags=["Admin"])


# ============================================================
# DASHBOARD
# ============================================================

@router.get("/stats", summary="Dashboard stats")
async def get_stats(current_user: User = Depends(RequireAdmin)):
    total_bookings = await Booking.count()
    total_workers = await Worker.count()
    total_customers = await Customer.count()
    total_services = await Service.count()
    all_bookings = await Booking.find_all().to_list()
    terminal = {BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REFUNDED}
    active_bookings = sum(1 for b in all_bookings if b.status not in terminal)
    return {
        "success": True, "message": "OK",
        "data": {
            "total_revenue": 0, "total_bookings": total_bookings,
            "total_workers": total_workers, "total_customers": total_customers,
            "total_services": total_services, "active_bookings": active_bookings,
            "completion_rate": 0, "growth_percent": 0,
        },
    }


@router.get("/revenue", summary="Revenue data")
async def get_revenue(current_user: User = Depends(RequireAdmin)):
    return {"success": True, "message": "OK", "data": []}


# ============================================================
# BOOKINGS
# ============================================================

@router.get("/bookings", summary="All bookings")
async def list_bookings(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None), search: Optional[str] = Query(None),
    current_user: User = Depends(RequireAdmin),
):
    all_items = await Booking.find_all().to_list()
    if status:
        all_items = [b for b in all_items if (b.status.value if b.status else "") == status]
    all_items.sort(key=lambda b: b.created_at or datetime.min, reverse=True)
    total = len(all_items)
    items = all_items[(page - 1) * limit: page * limit]
    return {
        "success": True, "message": "OK",
        "data": [{"id": b.id, "status": b.status.value if b.status else "pending",
                  "final_price": b.final_price, "scheduled_date": b.scheduled_date,
                  "created_at": b.created_at.isoformat() if b.created_at else None} for b in items],
        "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/bookings/{booking_id}", summary="Get booking detail")
async def get_booking(booking_id: str, current_user: User = Depends(RequireAdmin)):
    b = await Booking.find_one(Booking.id == booking_id)
    if b is None:
        raise NotFoundException(message="Booking not found")
    return {"success": True, "message": "OK", "data": {"id": b.id, "status": b.status.value if b.status else "pending"}}


@router.put("/bookings/{booking_id}", summary="Update booking")
async def update_booking(
    booking_id: str, body: dict = Body(...), current_user: User = Depends(RequireAdmin),
):
    """Update booking. Status changes go through the same validated transition flow."""
    service = BookingService()
    result = await service.update_booking_status(
        booking_id=booking_id,
        new_status=body.get("status"),
        user_id=current_user.id,
        user_role=current_user.role.value,
        note=body.get("note"),
    )
    return {"success": True, "message": "Booking updated", "data": {"id": result["id"], "status": result["status"]}}


@router.delete("/bookings/{booking_id}", summary="Delete booking")
async def delete_booking(booking_id: str, current_user: User = Depends(RequireAdmin)):
    b = await Booking.find_one(Booking.id == booking_id)
    if b is None:
        raise NotFoundException(message="Booking not found")
    await b.delete()
    return {"success": True, "message": "Booking deleted"}


# ============================================================
# WORKERS
# ============================================================

@router.get("/workers/approvals", summary="Worker approval queue")
async def get_worker_approvals(current_user: User = Depends(RequireAdmin)):
    return {"success": True, "message": "OK", "data": []}


@router.get("/workers", summary="All workers")
async def list_workers(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None), current_user: User = Depends(RequireAdmin),
):
    all_items = await Worker.find_all().to_list()
    if search:
        t = search.lower()
        all_items = [w for w in all_items if t in (w.name or "").lower() or t in (w.profession or "").lower()]
    total = len(all_items)
    items = all_items[(page - 1) * limit: page * limit]
    return {
        "success": True, "message": "OK",
        "data": [{"id": w.id, "name": w.name, "profession": w.profession, "rating": w.rating,
                  "is_online": w.is_online, "aadhaar_verified": getattr(w, "aadhaar_verified", False)} for w in items],
        "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/workers/{worker_id}/aadhaar/status", summary="Get worker Aadhaar status")
async def get_worker_aadhaar_status(worker_id: str, current_user: User = Depends(RequireAdmin)):
    w = await Worker.find_one(Worker.id == worker_id)
    if w is None:
        raise NotFoundException(message="Worker not found")
    return {
        "success": True, "message": "OK",
        "data": {
            "aadhaar_verified": getattr(w, "aadhaar_verified", False),
            "aadhaar_verified_at": w.aadhaar_verified_at.isoformat() if getattr(w, "aadhaar_verified_at", None) else None,
        },
    }


@router.post("/workers/{worker_id}/aadhaar/verify", summary="Verify worker Aadhaar")
async def verify_worker_aadhaar(worker_id: str, current_user: User = Depends(RequireAdmin)):
    w = await Worker.find_one(Worker.id == worker_id)
    if w is None:
        raise NotFoundException(message="Worker not found")
    w.aadhaar_verified = True
    w.aadhaar_verified_at = datetime.now(timezone.utc)
    await w.save()
    return {"success": True, "message": "Worker Aadhaar verified"}


@router.post("/workers/{worker_id}/aadhaar/reject", summary="Reject worker Aadhaar")
async def reject_worker_aadhaar(worker_id: str, current_user: User = Depends(RequireAdmin)):
    w = await Worker.find_one(Worker.id == worker_id)
    if w is None:
        raise NotFoundException(message="Worker not found")
    w.aadhaar_number_hash = None
    w.aadhaar_verified = False
    w.aadhaar_verified_at = None
    await w.save()
    return {"success": True, "message": "Worker Aadhaar verification rejected"}


@router.get("/workers/{worker_id}", summary="Get worker detail")
async def get_worker(worker_id: str, current_user: User = Depends(RequireAdmin)):
    w = await Worker.find_one(Worker.id == worker_id)
    if w is None:
        raise NotFoundException(message="Worker not found")
    return {"success": True, "message": "OK", "data": {"id": w.id, "name": w.name, "profession": w.profession, "aadhaar_verified": getattr(w, "aadhaar_verified", False)}}


@router.put("/workers/{worker_id}", summary="Update worker")
async def update_worker(
    worker_id: str, body: dict = Body(...), current_user: User = Depends(RequireAdmin),
):
    w = await Worker.find_one(Worker.id == worker_id)
    if w is None:
        raise NotFoundException(message="Worker not found")
    if "isOnline" in body:
        w.is_online = body["isOnline"]
    if "is_online" in body:
        w.is_online = body["is_online"]
    await w.save()
    return {"success": True, "message": "Worker updated", "data": {"id": w.id, "name": w.name, "is_online": w.is_online}}


@router.delete("/workers/{worker_id}", summary="Delete worker")
async def delete_worker(worker_id: str, current_user: User = Depends(RequireAdmin)):
    w = await Worker.find_one(Worker.id == worker_id)
    if w is None:
        raise NotFoundException(message="Worker not found")
    await w.delete()
    return {"success": True, "message": "Worker deleted"}


@router.post("/workers/{worker_id}/approve", summary="Approve worker")
async def approve_worker(worker_id: str, current_user: User = Depends(RequireAdmin)):
    w = await Worker.find_one(Worker.id == worker_id)
    if w is None:
        raise NotFoundException(message="Worker not found")
    user = await User.find_one(User.id == w.user_id)
    if user:
        user.is_verified = True
        await user.save()
    return {"success": True, "message": "Worker approved"}


@router.post("/workers/{worker_id}/reject", summary="Reject worker")
async def reject_worker(worker_id: str, current_user: User = Depends(RequireAdmin)):
    w = await Worker.find_one(Worker.id == worker_id)
    if w is None:
        raise NotFoundException(message="Worker not found")
    await w.delete()
    return {"success": True, "message": "Worker rejected and removed"}


# ============================================================
# CUSTOMERS
# ============================================================

@router.get("/customers", summary="All customers")
async def list_customers(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None), current_user: User = Depends(RequireAdmin),
):
    all_items = await Customer.find_all().to_list()
    if search:
        t = search.lower()
        all_items = [c for c in all_items if t in (c.name or "").lower()]
    total = len(all_items)
    items = all_items[(page - 1) * limit: page * limit]
    return {
        "success": True, "message": "OK",
        "data": [{"id": c.id, "name": c.name} for c in items],
        "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/customers/{customer_id}", summary="Get customer detail")
async def get_customer(customer_id: str, current_user: User = Depends(RequireAdmin)):
    c = await Customer.find_one(Customer.id == customer_id)
    if c is None:
        raise NotFoundException(message="Customer not found")
    return {"success": True, "message": "OK", "data": {"id": c.id, "name": c.name}}


@router.delete("/customers/{customer_id}", summary="Delete customer")
async def delete_customer(customer_id: str, current_user: User = Depends(RequireAdmin)):
    c = await Customer.find_one(Customer.id == customer_id)
    if c is None:
        raise NotFoundException(message="Customer not found")
    await c.delete()
    return {"success": True, "message": "Customer deleted"}


# ============================================================
# CATEGORIES
# ============================================================

@router.get("/categories", summary="All categories")
async def list_categories(current_user: User = Depends(RequireAdmin)):
    cats = await Category.find_all().to_list()
    return {"success": True, "message": "OK", "data": [{"id": c.id, "name": c.name, "slug": getattr(c, "slug", None), "service_count": getattr(c, "service_count", 0)} for c in cats]}


@router.get("/categories/{category_id}", summary="Get category detail")
async def get_category(category_id: str, current_user: User = Depends(RequireAdmin)):
    c = await Category.find_one(Category.id == category_id)
    if c is None:
        raise NotFoundException(message="Category not found")
    return {"success": True, "message": "OK", "data": {"id": c.id, "name": c.name}}


@router.post("/categories", status_code=201, summary="Create category")
async def create_category(body: dict = Body(...), current_user: User = Depends(RequireAdmin)):
    name = body.get("name", "").strip()
    if not name:
        raise BadRequestException(message="Category name is required")
    slug = body.get("slug") or re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    existing = await Category.find_one(Category.slug == slug)
    if existing:
        raise BadRequestException(message="Category with this slug already exists")
    cat = Category(
        name=name, slug=slug, description=body.get("description"),
        icon=body.get("icon"), image=body.get("image"),
        color=body.get("color"), service_count=0,
    )
    await cat.insert()
    return {"success": True, "message": "Category created", "data": {"id": cat.id, "name": cat.name, "slug": cat.slug}}


@router.put("/categories/{category_id}", summary="Update category")
async def update_category(
    category_id: str, body: dict = Body(...), current_user: User = Depends(RequireAdmin),
):
    c = await Category.find_one(Category.id == category_id)
    if c is None:
        raise NotFoundException(message="Category not found")
    for field in ["name", "slug", "description", "icon", "image", "color"]:
        if field in body:
            setattr(c, field, body[field])
    await c.save()
    return {"success": True, "message": "Category updated", "data": {"id": c.id, "name": c.name, "slug": getattr(c, "slug", None)}}


@router.delete("/categories/{category_id}", summary="Delete category")
async def delete_category(category_id: str, current_user: User = Depends(RequireAdmin)):
    c = await Category.find_one(Category.id == category_id)
    if c is None:
        raise NotFoundException(message="Category not found")
    await c.delete()
    return {"success": True, "message": "Category deleted"}


# ============================================================
# SERVICES
# ============================================================

@router.get("/services", summary="All services")
async def list_services(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None), current_user: User = Depends(RequireAdmin),
):
    all_items = await Service.find_all().to_list()
    if search:
        t = search.lower()
        all_items = [s for s in all_items if t in (s.name or "").lower()]
    total = len(all_items)
    items = all_items[(page - 1) * limit: page * limit]
    return {
        "success": True, "message": "OK",
        "data": [{"id": s.id, "name": s.name, "base_price": s.base_price} for s in items],
        "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/services/{service_id}", summary="Get service detail")
async def get_service(service_id: str, current_user: User = Depends(RequireAdmin)):
    s = await Service.find_one(Service.id == service_id)
    if s is None:
        raise NotFoundException(message="Service not found")
    return {"success": True, "message": "OK", "data": {"id": s.id, "name": s.name}}


@router.post("/services", status_code=201, summary="Create service")
async def create_service(body: dict = Body(...), current_user: User = Depends(RequireAdmin)):
    name = body.get("name", "").strip()
    if not name:
        raise BadRequestException(message="Service name is required")
    slug = body.get("slug") or re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    svc = Service(
        name=name, slug=slug, description=body.get("description", ""),
        category_id=body.get("category_id"), image=body.get("image"),
        base_price=body.get("base_price", 0), duration=body.get("duration", 60),
        popular=body.get("popular", False), trending=body.get("trending", False),
        tags=body.get("tags", []),
    )
    await svc.insert()
    return {"success": True, "message": "Service created", "data": {"id": svc.id, "name": svc.name}}


@router.put("/services/{service_id}", summary="Update service")
async def update_service(
    service_id: str, body: dict = Body(...), current_user: User = Depends(RequireAdmin),
):
    s = await Service.find_one(Service.id == service_id)
    if s is None:
        raise NotFoundException(message="Service not found")
    for field in ["name", "slug", "description", "category_id", "image", "base_price", "duration", "popular", "trending", "tags"]:
        if field in body:
            setattr(s, field, body[field])
    await s.save()
    return {"success": True, "message": "Service updated", "data": {"id": s.id, "name": s.name}}


@router.delete("/services/{service_id}", summary="Delete service")
async def delete_service(service_id: str, current_user: User = Depends(RequireAdmin)):
    s = await Service.find_one(Service.id == service_id)
    if s is None:
        raise NotFoundException(message="Service not found")
    await s.delete()
    return {"success": True, "message": "Service deleted"}


# ============================================================
# COUPONS
# ============================================================

@router.get("/coupons", summary="All coupons")
async def list_coupons(current_user: User = Depends(RequireAdmin)):
    coupons = await Coupon.find_all().to_list()
    return {"success": True, "message": "OK", "data": [{"id": c.id, "code": c.code, "title": getattr(c, "title", ""), "is_active": getattr(c, "is_active", True)} for c in coupons]}


@router.get("/coupons/{coupon_id}", summary="Get coupon detail")
async def get_coupon(coupon_id: str, current_user: User = Depends(RequireAdmin)):
    c = await Coupon.find_one(Coupon.id == coupon_id)
    if c is None:
        raise NotFoundException(message="Coupon not found")
    return {"success": True, "message": "OK", "data": {"id": c.id, "code": c.code, "title": getattr(c, "title", "")}}


@router.post("/coupons", status_code=201, summary="Create coupon")
async def create_coupon(body: dict = Body(...), current_user: User = Depends(RequireAdmin)):
    code = body.get("code", "").strip().upper()
    if not code:
        raise BadRequestException(message="Coupon code is required")
    existing = await Coupon.find_one(Coupon.code == code)
    if existing:
        raise BadRequestException(message="Coupon code already exists")
    coupon = Coupon(
        code=code, title=body.get("title", ""), description=body.get("description"),
        type=body.get("type", "percentage"), value=body.get("value", 0),
        max_discount=body.get("max_discount"), min_order=body.get("min_order"),
        valid_from=body.get("valid_from"), valid_until=body.get("valid_until"),
        usage_limit=body.get("usage_limit"), is_active=body.get("is_active", True),
    )
    await coupon.insert()
    return {"success": True, "message": "Coupon created", "data": {"id": coupon.id, "code": coupon.code}}


@router.put("/coupons/{coupon_id}", summary="Update coupon")
async def update_coupon(
    coupon_id: str, body: dict = Body(...), current_user: User = Depends(RequireAdmin),
):
    c = await Coupon.find_one(Coupon.id == coupon_id)
    if c is None:
        raise NotFoundException(message="Coupon not found")
    for field in ["code", "title", "description", "type", "value", "max_discount", "min_order", "valid_from", "valid_until", "usage_limit", "is_active"]:
        if field in body:
            setattr(c, field, body[field])
    await c.save()
    return {"success": True, "message": "Coupon updated", "data": {"id": c.id, "code": c.code}}


@router.delete("/coupons/{coupon_id}", summary="Delete coupon")
async def delete_coupon(coupon_id: str, current_user: User = Depends(RequireAdmin)):
    c = await Coupon.find_one(Coupon.id == coupon_id)
    if c is None:
        raise NotFoundException(message="Coupon not found")
    await c.delete()
    return {"success": True, "message": "Coupon deleted"}


# ============================================================
# COMPLAINTS
# ============================================================

@router.get("/complaints", summary="All complaints")
async def list_complaints(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None), current_user: User = Depends(RequireAdmin),
):
    all_items = await Complaint.find_all().to_list()
    if status:
        all_items = [c for c in all_items if c.status == status]
    all_items.sort(key=lambda c: c.created_at or datetime.min, reverse=True)
    total = len(all_items)
    items = all_items[(page - 1) * limit: page * limit]
    return {
        "success": True, "message": "OK",
        "data": [{"id": c.id, "subject": c.subject, "status": c.status,
                  "customer_id": c.customer_id,
                  "created_at": c.created_at.isoformat() if c.created_at else None} for c in items],
        "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/complaints/{complaint_id}", summary="Get complaint detail")
async def get_complaint(complaint_id: str, current_user: User = Depends(RequireAdmin)):
    c = await Complaint.find_one(Complaint.id == complaint_id)
    if c is None:
        raise NotFoundException(message="Complaint not found")
    return {"success": True, "message": "OK", "data": {"id": c.id, "subject": c.subject, "status": c.status}}


@router.put("/complaints/{complaint_id}", summary="Update complaint")
async def update_complaint(
    complaint_id: str, body: dict = Body(...), current_user: User = Depends(RequireAdmin),
):
    c = await Complaint.find_one(Complaint.id == complaint_id)
    if c is None:
        raise NotFoundException(message="Complaint not found")
    if "status" in body:
        c.status = body["status"]
    await c.save()
    return {"success": True, "message": "Complaint updated", "data": {"id": c.id, "status": c.status}}


# ============================================================
# REPORTS & REFUNDS
# ============================================================

@router.get("/reports", summary="Reports")
async def get_reports(current_user: User = Depends(RequireAdmin)):
    return {"success": True, "message": "OK", "data": []}


@router.get("/refunds", summary="All refund requests")
async def list_refunds(current_user: User = Depends(RequireAdmin)):
    return {"success": True, "message": "OK", "data": []}


@router.get("/refunds/{refund_id}", summary="Get refund detail")
async def get_refund(refund_id: str, current_user: User = Depends(RequireAdmin)):
    raise NotFoundException(message="Not found")


@router.put("/refunds/{refund_id}", summary="Update refund")
async def update_refund(
    refund_id: str, body: dict = Body(...), current_user: User = Depends(RequireAdmin),
):
    return {"success": True, "message": "Refund updated", "data": {"id": refund_id, "status": body.get("status", "pending")}}


# ============================================================
# WORKER VERIFICATION
# ============================================================

@router.get("/verification/stats", summary="Verification dashboard stats")
async def get_verification_stats(current_user: User = Depends(RequireAdmin)):
    from app.models.verification import WorkerVerification
    all_v = await WorkerVerification.find_all().to_list()
    total = len(all_v)
    pending = sum(1 for v in all_v if getattr(v, "admin_status", "") == "pending")
    approved = sum(1 for v in all_v if getattr(v, "admin_status", "") == "approved")
    rejected_admin = sum(1 for v in all_v if getattr(v, "admin_status", "") == "rejected")
    completed = sum(1 for v in all_v if v.status == "completed")
    in_progress = sum(1 for v in all_v if v.status == "in_progress")
    badge_counts = {b: sum(1 for v in all_v if v.badge == b) for b in ["gold", "pro", "beginner", "rejected"]}
    return {
        "success": True, "message": "OK",
        "data": {"total": total, "pending": pending, "approved": approved,
                 "rejected": rejected_admin, "completed": completed,
                 "in_progress": in_progress, "badge_counts": badge_counts},
    }


@router.get("/verification", summary="List verification requests")
async def list_verifications(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None), badge: Optional[str] = Query(None),
    profession: Optional[str] = Query(None), admin_status: Optional[str] = Query(None),
    status: Optional[str] = Query(None), current_user: User = Depends(RequireAdmin),
):
    from app.models.verification import WorkerVerification
    from app.services.verification_service import serialize_verification
    all_v = await WorkerVerification.find_all().to_list()
    if badge:
        all_v = [v for v in all_v if v.badge == badge]
    if profession:
        t = profession.lower()
        all_v = [v for v in all_v if t in (v.profession or "").lower()]
    if admin_status:
        all_v = [v for v in all_v if getattr(v, "admin_status", "") == admin_status]
    if status:
        all_v = [v for v in all_v if v.status == status]
    all_v.sort(key=lambda v: v.created_at or datetime.min, reverse=True)
    total = len(all_v)
    items = all_v[(page - 1) * limit: page * limit]
    serialized = []
    for v in items:
        serialized.append(await serialize_verification(v))
    return {
        "success": True, "message": "OK",
        "data": serialized,
        "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/verification/{verification_id}", summary="Verification full detail")
async def get_verification_detail(verification_id: str, current_user: User = Depends(RequireAdmin)):
    from app.models.verification import WorkerVerification
    from app.services.verification_service import serialize_verification
    v = await WorkerVerification.find_one(WorkerVerification.id == verification_id)
    if v is None:
        raise NotFoundException(message="Verification not found")
    return {"success": True, "message": "OK", "data": await serialize_verification(v)}


@router.post("/verification/{verification_id}/approve", summary="Approve a worker verification")
async def approve_verification(verification_id: str, current_user: User = Depends(RequireAdmin)):
    from app.models.verification import WorkerVerification
    v = await WorkerVerification.find_one(WorkerVerification.id == verification_id)
    if v is None:
        raise NotFoundException(message="Verification not found")
    if v.status != "completed":
        raise BadRequestException(message="Only completed verifications can be approved")
    v.admin_status = "approved"
    v.reviewed_by = current_user.email
    v.reviewed_at = datetime.now(timezone.utc)
    if v.badge == "rejected":
        v.badge = "beginner"
        v.trust_score = max(60.0, v.trust_score or 0.0)
    await v.save()
    w = await Worker.find_one(Worker.id == v.worker_id)
    if w:
        w.verification_status = "completed"
        w.verification_badge = v.badge
        w.trust_score = v.trust_score
        await w.save()
        user = await User.find_one(User.id == w.user_id)
        if user:
            user.is_verified = True
            await user.save()
    return {"success": True, "message": "Verification approved",
            "data": {"id": v.id, "admin_status": v.admin_status, "badge": v.badge}}


@router.post("/verification/{verification_id}/reject", summary="Reject a worker verification")
async def reject_verification(verification_id: str, current_user: User = Depends(RequireAdmin)):
    from app.models.verification import WorkerVerification
    v = await WorkerVerification.find_one(WorkerVerification.id == verification_id)
    if v is None:
        raise NotFoundException(message="Verification not found")
    v.admin_status = "rejected"
    v.badge = "rejected"
    v.reviewed_by = current_user.email
    v.reviewed_at = datetime.now(timezone.utc)
    v.retry_available_at = datetime.now(timezone.utc) + timedelta(days=7)
    await v.save()
    w = await Worker.find_one(Worker.id == v.worker_id)
    if w:
        w.verification_status = "rejected"
        w.verification_badge = "rejected"
        await w.save()
        user = await User.find_one(User.id == w.user_id)
        if user:
            user.is_verified = False
            await user.save()
    return {"success": True, "message": "Verification rejected",
            "data": {"id": v.id, "admin_status": v.admin_status, "badge": v.badge}}


@router.post("/verification/{verification_id}/notes", summary="Add an admin note")
async def add_verification_note(
    verification_id: str, body: dict = Body(...), current_user: User = Depends(RequireAdmin),
):
    from app.models.verification import WorkerVerification
    v = await WorkerVerification.find_one(WorkerVerification.id == verification_id)
    if v is None:
        raise NotFoundException(message="Verification not found")
    note = body.get("note")
    if not note:
        raise BadRequestException(message="Note is required")
    existing = getattr(v, "admin_notes", "") or ""
    v.admin_notes = f"{existing}\n{note}".strip()
    await v.save()
    return {"success": True, "message": "Note added", "data": {"id": v.id, "admin_notes": v.admin_notes}}


@router.post("/verification/{verification_id}/retake", summary="Allow an immediate retake")
async def allow_retake(verification_id: str, current_user: User = Depends(RequireAdmin)):
    from app.models.verification import WorkerVerification
    v = await WorkerVerification.find_one(WorkerVerification.id == verification_id)
    if v is None:
        raise NotFoundException(message="Verification not found")
    v.retry_available_at = None
    v.badge = None
    v.status = "in_progress"
    v.step = "documents"
    v.admin_status = "pending"
    await v.save()
    return {"success": True, "message": "Retake allowed", "data": {"id": v.id}}


@router.post("/verification/demo/load", summary="Demo Mode: load sample verification data")
async def load_demo_verifications(current_user: User = Depends(RequireAdmin)):
    from app.seeds.verification_seed import seed_demo_verifications
    result = await seed_demo_verifications()
    return {"success": True, "message": "Demo verification data loaded", "data": result}
