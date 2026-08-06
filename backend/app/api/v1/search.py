"""Search API — async Beanie version."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.worker import Worker
from app.models.service import Service
from app.models.category import Category
from app.schemas.common import SchemaBase

router = APIRouter(prefix="/search", tags=["Search"])


class PriceEstimateRequest(SchemaBase):
    service_id: Optional[str] = None
    service_name: Optional[str] = None
    problem_description: Optional[str] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    urgency: str = "normal"


def _serialize_worker(w: Worker) -> dict:
    return {
        "id": w.id, "user_id": w.user_id, "name": w.name, "avatar": w.avatar,
        "cover_image": getattr(w, "cover_image", None), "profession": w.profession,
        "bio": getattr(w, "bio", None), "experience_years": w.experience_years,
        "completed_jobs": w.completed_jobs, "rating": w.rating,
        "review_count": w.review_count, "hourly_rate": w.hourly_rate,
        "is_online": w.is_online, "category_ids": w.category_ids or [],
        "is_verified": False,
        "created_at": w.created_at.isoformat() if w.created_at else None,
    }


def _serialize_service(s: Service) -> dict:
    return {
        "id": s.id, "name": s.name, "slug": getattr(s, "slug", None),
        "description": getattr(s, "description", None),
        "category_id": s.category_id,
        "image": getattr(s, "image", None), "base_price": s.base_price,
        "duration": getattr(s, "duration", None), "rating": getattr(s, "rating", None),
        "review_count": getattr(s, "review_count", None),
        "popular": getattr(s, "popular", False), "trending": getattr(s, "trending", False),
        "tags": getattr(s, "tags", []) or [],
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _serialize_category(c: Category) -> dict:
    return {
        "id": c.id, "name": c.name, "slug": getattr(c, "slug", None),
        "description": getattr(c, "description", None), "icon": getattr(c, "icon", None),
        "image": getattr(c, "image", None), "color": getattr(c, "color", None),
        "service_count": getattr(c, "service_count", 0),
    }


def _pick_workers(workers: list, lat=None, lng=None) -> tuple:
    """Return (budget, fastest, highest_rated) from a pool."""
    if not workers:
        return None, None, None
    budget = min(workers, key=lambda w: (w.hourly_rate or 0, -(w.rating or 0)))
    fastest = min(workers, key=lambda w: w.completed_jobs or 0)
    highest = max(workers, key=lambda w: (w.rating or 0, w.review_count or 0))
    return _serialize_worker(budget), _serialize_worker(fastest), _serialize_worker(highest)


@router.get("", summary="Search services and workers")
async def search(
    q: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    limit: int = Query(10, ge=1, le=50),
):
    services = []
    workers = []
    suggestions = []
    wrk_results = []

    if q:
        term = q.strip().lower()
        # Search services
        all_svcs = await Service.find_all().to_list()
        svc_results = [
            s for s in all_svcs
            if term in (s.name or "").lower() or term in (getattr(s, "description", "") or "").lower()
        ][:limit]
        services = [_serialize_service(s) for s in svc_results]

        # Search workers
        all_wrks = await Worker.find_all().to_list()
        wrk_results = [
            w for w in all_wrks
            if term in (w.name or "").lower() or term in (w.profession or "").lower()
        ][:limit]
        workers = [_serialize_worker(w) for w in wrk_results]

        # Suggestions from categories
        all_cats = await Category.find_all().to_list()
        cats = [c for c in all_cats if term in (c.name or "").lower()][:5]
        suggestions = [{"id": c.id, "text": c.name, "type": "category"} for c in cats]

    recommended_filters = [
        {"label": "Popular", "value": "popular"},
        {"label": "Top Rated", "value": "rating"},
        {"label": "Budget Friendly", "value": "budget"},
    ]

    budget_worker, fastest_worker, highest_rated_worker = _pick_workers(wrk_results, lat, lng)

    return {
        "success": True,
        "message": "Search completed",
        "data": {
            "services": {"data": services, "total": len(services), "page": 1, "limit": limit, "pages": 1},
            "workers": {"data": workers, "total": len(workers), "page": 1, "limit": limit, "pages": 1},
            "suggestions": suggestions,
            "recommended_filters": recommended_filters,
            "budgetWorker": budget_worker,
            "fastestWorker": fastest_worker,
            "highestRatedWorker": highest_rated_worker,
        },
    }


@router.get("/autocomplete", summary="Search autocomplete")
async def autocomplete(q: str = Query("", max_length=100)):
    results = []
    if q:
        term = q.strip().lower()
        all_cats = await Category.find_all().to_list()
        cats = [c for c in all_cats if term in (c.name or "").lower()][:3]
        results.extend([{"id": c.id, "text": c.name, "type": "category"} for c in cats])

        all_svcs = await Service.find_all().to_list()
        svcs = [s for s in all_svcs if term in (s.name or "").lower()][:3]
        results.extend([{"id": s.id, "text": s.name, "type": "service"} for s in svcs])

        all_wrks = await Worker.find_all().to_list()
        wrks = [w for w in all_wrks if term in (w.name or "").lower()][:3]
        results.extend([{"id": w.id, "text": w.name, "type": "worker", "meta": w.profession} for w in wrks])

    return {"success": True, "message": "OK", "data": results}


@router.get("/popular", summary="Popular search terms")
async def popular():
    all_cats = await Category.find_all().to_list()
    all_cats.sort(key=lambda c: getattr(c, "service_count", 0) or 0, reverse=True)
    results = [{"term": c.name, "count": getattr(c, "service_count", 0) or 0, "trend": "stable"} for c in all_cats[:5]]
    return {"success": True, "message": "OK", "data": results}


@router.post("/estimate-price", summary="Estimate service price")
async def estimate_price(body: PriceEstimateRequest):
    svc = None
    if body.service_id:
        svc = await Service.find_one(Service.id == body.service_id)
    elif body.service_name:
        all_svcs = await Service.find_all().to_list()
        term = (body.service_name or "").lower()
        matches = [s for s in all_svcs if term in (s.name or "").lower()]
        svc = matches[0] if matches else None

    base = svc.base_price if svc else 1500.0
    urgency_mult = {"low": 0.85, "normal": 1.0, "high": 1.25, "emergency": 1.5}.get(body.urgency, 1.0)
    estimated = round((base or 1500.0) * urgency_mult, 2)

    return {
        "success": True, "message": "Price estimated",
        "data": {
            "estimated": estimated, "average": base,
            "minimum": round((base or 1500.0) * 0.7, 2),
            "maximum": round((base or 1500.0) * 1.8, 2),
            "time_estimate_minutes": getattr(svc, "duration", 60) or 60,
            "confidence": 0.75, "monthly_trend": [],
        },
    }


@router.get("/workers/{worker_id}/similar", summary="Find similar workers")
async def similar_workers(
    worker_id: str,
    limit: int = Query(5, ge=1, le=20),
    kind: str = Query("similar"),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
):
    worker = await Worker.find_one(Worker.id == worker_id)
    target = set(worker.category_ids or []) if worker else set()

    all_workers = await Worker.find_all().to_list()
    candidates = [w for w in all_workers if w.id != worker_id]

    if target:
        matched = [w for w in candidates if target & set(w.category_ids or [])]
        pool = matched if matched else candidates
    else:
        pool = candidates

    if kind == "budget":
        pool.sort(key=lambda w: (w.hourly_rate or 0, -(w.rating or 0)))
    elif kind == "premium":
        pool.sort(key=lambda w: (-(w.hourly_rate or 0), -(w.rating or 0)))
    elif kind == "nearby":
        pool.sort(key=lambda w: (0 if w.is_online else 1, -(w.rating or 0)))
    else:
        pool.sort(key=lambda w: (-(w.rating or 0), -(w.completed_jobs or 0)))

    items = [_serialize_worker(w) for w in pool[:limit]]
    return {"success": True, "message": "OK", "data": {"items": items}}


@router.get("/services/{service_id}/similar", summary="Find similar services")
async def similar_services(
    service_id: str,
    limit: int = Query(5, ge=1, le=20),
    kind: str = Query("similar"),
):
    svc = await Service.find_one(Service.id == service_id)
    all_svcs = await Service.find_all().to_list()
    if svc and svc.category_id:
        results = [s for s in all_svcs if s.category_id == svc.category_id and s.id != service_id][:limit]
    else:
        results = [s for s in all_svcs if s.id != service_id][:limit]
    return {"success": True, "message": "OK", "data": {"items": [_serialize_service(s) for s in results]}}


@router.get("/recently-viewed", summary="Get recently viewed")
async def recently_viewed(current_user: User = Depends(get_current_user)):
    return {"success": True, "message": "OK", "data": {"workers": [], "services": []}}
