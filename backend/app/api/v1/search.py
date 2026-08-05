from typing import Optional
from pydantic import Field
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db
from app.dependencies.auth import get_current_user, get_optional_user
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
        "id": w.id,
        "user_id": w.user_id,
        "name": w.name,
        "avatar": w.avatar,
        "cover_image": w.cover_image,
        "profession": w.profession,
        "bio": w.bio,
        "experience_years": w.experience_years,
        "completed_jobs": w.completed_jobs,
        "rating": w.rating,
        "review_count": w.review_count,
        "hourly_rate": w.hourly_rate,
        "is_online": w.is_online,
        "category_ids": w.category_ids or [],
        "is_verified": getattr(w.user, "is_verified", False) if w.user else False,
        "created_at": w.created_at.isoformat() if w.created_at else None,
    }


def _serialize_pick(db: Session, w: Worker, lat=None, lng=None) -> dict:
    """Full worker payload (trust, badge, response time, ETA, distance)."""
    from app.services.recommendation_service import serialize_worker, _distance_to

    dist = _distance_to(db, w, lat, lng) if lat is not None and lng is not None else None
    return serialize_worker(db, w, lat, lng, distance_km=dist)


def _compute_picks(db: Session, workers, lat=None, lng=None):
    """Return (budget, fastest, highest_rated) worker picks from a pool."""
    from app.services.recommendation_service import _response_time_minutes

    if not workers:
        return None, None, None
    budget = min(workers, key=lambda w: (w.hourly_rate or 0, -(w.rating or 0)))
    fastest = min(workers, key=lambda w: _response_time_minutes(db, w))
    highest = max(workers, key=lambda w: (w.rating or 0, w.review_count or 0))
    return (
        _serialize_pick(db, budget, lat, lng),
        _serialize_pick(db, fastest, lat, lng),
        _serialize_pick(db, highest, lat, lng),
    )


def _serialize_service(s: Service) -> dict:
    cat_data = None
    if s.category:
        cat_data = {
            "id": s.category.id,
            "name": s.category.name,
            "slug": s.category.slug,
            "description": s.category.description,
            "icon": s.category.icon,
            "image": s.category.image,
            "color": s.category.color,
            "service_count": s.category.service_count,
        }
    return {
        "id": s.id,
        "name": s.name,
        "slug": s.slug,
        "description": s.description,
        "category_id": s.category_id,
        "image": s.image,
        "base_price": s.base_price,
        "duration": s.duration,
        "rating": s.rating,
        "review_count": s.review_count,
        "popular": s.popular,
        "trending": s.trending,
        "tags": s.tags or [],
        "category": cat_data,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _serialize_category(c: Category) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "slug": c.slug,
        "description": c.description,
        "icon": c.icon,
        "image": c.image,
        "color": c.color,
        "service_count": c.service_count,
    }


@router.get("", summary="Search services and workers")
def search(
    q: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    services = []
    workers = []
    suggestions = []

    if q:
        term = f"%{q}%"
        cat_ids = [
            cid for (cid,) in db.query(Category.id).filter(
                or_(Category.name.ilike(term), Category.slug.ilike(term))
            ).all()
        ]
        svc_results = db.query(Service).outerjoin(Category, Service.category_id == Category.id).filter(
            or_(
                Service.name.ilike(term),
                Service.description.ilike(term),
                Category.name.ilike(term),
                Category.slug.ilike(term),
            )
        ).limit(limit).all()
        services = [_serialize_service(s) for s in svc_results]

        worker_filters = [
            Worker.name.ilike(term),
            Worker.profession.ilike(term),
        ]
        if cat_ids:
            worker_filters.append(or_(*[Worker.category_ids.contains(cid) for cid in cat_ids]))
        wrk_results = db.query(Worker).filter(or_(*worker_filters)).limit(limit).all()
        workers = [_serialize_worker(w) for w in wrk_results]

        cats = db.query(Category).filter(Category.name.ilike(term)).limit(5).all()
        suggestions = [{"id": c.id, "text": c.name, "type": "category"} for c in cats]

    recommended_filters = [
        {"label": "Popular", "value": "popular"},
        {"label": "Top Rated", "value": "rating"},
        {"label": "Budget Friendly", "value": "budget"},
    ]

    budget_worker, fastest_worker, highest_rated_worker = _compute_picks(db, wrk_results, lat, lng)

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
def autocomplete(
    q: str = Query("", max_length=100),
    db: Session = Depends(get_db),
):
    results = []
    if q:
        term = f"%{q}%"
        cats = db.query(Category).filter(Category.name.ilike(term)).limit(3).all()
        results.extend([{"id": c.id, "text": c.name, "type": "category"} for c in cats])
        svcs = db.query(Service).filter(Service.name.ilike(term)).limit(3).all()
        results.extend([{"id": s.id, "text": s.name, "type": "service"} for s in svcs])
        wrks = db.query(Worker).filter(Worker.name.ilike(term)).limit(3).all()
        results.extend([{"id": w.id, "text": w.name, "type": "worker", "meta": w.profession} for w in wrks])
    return {"success": True, "message": "OK", "data": results}


@router.get("/popular", summary="Popular search terms")
def popular(db: Session = Depends(get_db)):
    cats = db.query(Category).order_by(Category.service_count.desc()).limit(5).all()
    results = [{"term": c.name, "count": c.service_count or 0, "trend": "stable"} for c in cats]
    return {"success": True, "message": "OK", "data": results}


@router.post("/estimate-price", summary="Estimate service price")
def estimate_price(
    body: PriceEstimateRequest,
    db: Session = Depends(get_db),
):
    svc = None
    if body.service_id:
        svc = db.query(Service).filter(Service.id == body.service_id).first()
    elif body.service_name:
        svc = db.query(Service).filter(Service.name.ilike(f"%{body.service_name}%")).first()

    base = svc.base_price if svc else 1500.0
    urgency_mult = {"low": 0.85, "normal": 1.0, "high": 1.25, "emergency": 1.5}.get(body.urgency, 1.0)
    estimated = round(base * urgency_mult, 2)

    return {
        "success": True,
        "message": "Price estimated",
        "data": {
            "estimated": estimated,
            "average": base,
            "minimum": round(base * 0.7, 2),
            "maximum": round(base * 1.8, 2),
            "time_estimate_minutes": svc.duration if svc else 60,
            "confidence": 0.75,
            "monthly_trend": [],
        },
    }


@router.get("/workers/{worker_id}/similar", summary="Find similar workers")
def similar_workers(
    worker_id: str,
    limit: int = Query(5, ge=1, le=20),
    kind: str = Query("similar"),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    db: Session = Depends(get_db),
):
    """Find workers similar to the given worker.

    `kind` selects the ranking strategy:
    - similar  -> same skills, best rated
    - budget   -> same skills, cheapest first
    - premium  -> same skills, most expensive + best rated first
    - nearby   -> same skills, online/available first, closest first
    """
    from app.services.recommendation_service import serialize_worker, _distance_to

    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if worker is None:
        candidates = list(db.query(Worker).all())
        target = set()
    else:
        target = set(worker.category_ids or [])
        candidates = list(db.query(Worker).filter(Worker.id != worker_id).all())

    if target:
        matched = [w for w in candidates if target & set(w.category_ids or [])]
        pool = matched if matched else candidates
    else:
        pool = candidates

    def distance_of(w):
        if lat is not None and lng is not None:
            d = _distance_to(db, w, lat, lng)
            return d if d is not None else float("inf")
        return None

    ranked = []
    for w in pool:
        ranked.append((w, distance_of(w)))

    if kind == "budget":
        ranked.sort(key=lambda t: (t[0].hourly_rate or 0, -(t[0].rating or 0)))
    elif kind == "premium":
        ranked.sort(key=lambda t: (-(t[0].hourly_rate or 0), -(t[0].rating or 0)))
    elif kind == "nearby":
        ranked.sort(
            key=lambda t: (
                0 if t[0].is_online else 1,
                t[1] if t[1] is not None else float("inf"),
                -(t[0].rating or 0),
            )
        )
    else:
        ranked.sort(key=lambda t: (-(t[0].rating or 0), -(t[0].completed_jobs or 0)))

    items = [
        serialize_worker(db, w, lat, lng, distance_km=d if d != float("inf") else None)
        for w, d in ranked[:limit]
    ]
    return {"success": True, "message": "OK", "data": {"items": items}}


@router.get("/services/{service_id}/similar", summary="Find similar services")
def similar_services(
    service_id: str,
    limit: int = Query(5, ge=1, le=20),
    kind: str = Query("similar"),
    db: Session = Depends(get_db),
):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if svc and svc.category_id:
        results = db.query(Service).filter(
            Service.category_id == svc.category_id,
            Service.id != service_id,
        ).limit(limit).all()
    else:
        results = db.query(Service).limit(limit).all()
    return {"success": True, "message": "OK", "data": {"items": [_serialize_service(s) for s in results]}}


@router.get("/recently-viewed", summary="Get recently viewed")
def recently_viewed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {
        "success": True,
        "message": "OK",
        "data": {
            "workers": [],
            "services": [],
        },
    }
