import math
from typing import Optional, List
from pydantic import Field
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.database import get_db
from app.dependencies.auth import get_current_user, RequireWorker
from app.models.user import User
from app.models.worker import Worker
from app.schemas.common import SchemaBase
from app.services.worker_service import WorkerService
from app.core.exceptions import BadRequestException

router = APIRouter(prefix="/workers", tags=["Workers"])


# ----------------------------------------------------------
# SCHEMAS
# ----------------------------------------------------------

class WorkerLocationRequest(SchemaBase):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class NearbyWorkerResponse(SchemaBase):
    id: str
    name: str
    profession: str
    avatar: Optional[str] = None
    rating: float
    hourly_rate: float
    is_online: bool
    distance: float


# ----------------------------------------------------------
# HELPERS
# ----------------------------------------------------------

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two lat/lng points using Haversine formula."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ----------------------------------------------------------
# ROUTES
# ----------------------------------------------------------

@router.get(
    "/nearby",
    summary="Find workers near a location",
)
def get_nearby_workers(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: float = Query(10.0, gt=0, le=100),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Return workers within `radius` km of the given coordinates."""
    from app.models.worker_location import WorkerLocation
    from app.models.worker import Worker

    locations = (
        db.query(WorkerLocation)
        .all()
    )

    results = []
    for loc in locations:
        dist = _haversine_km(lat, lng, loc.latitude, loc.longitude)
        if dist <= radius:
            worker = db.query(Worker).filter(Worker.id == loc.worker_id).first()
            if worker:
                results.append({
                    "id": worker.id,
                    "name": worker.name,
                    "profession": worker.profession,
                    "avatar": worker.avatar,
                    "rating": worker.rating,
                    "hourly_rate": worker.hourly_rate,
                    "is_online": worker.is_online,
                    "distance": round(dist, 2),
                })

    results.sort(key=lambda w: w["distance"])
    results = results[:limit]

    return {
        "success": True,
        "message": "Nearby workers retrieved",
        "data": results,
    }


@router.put(
    "/location",
    summary="Update worker location",
)
def update_worker_location(
    body: WorkerLocationRequest,
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    """Update the worker's current GPS coordinates."""
    from app.models.worker_location import WorkerLocation
    from app.repositories.worker_repository import WorkerRepository

    repo = WorkerRepository(db)
    worker = repo.get_by_user_id(current_user.id)
    if worker is None:
        raise BadRequestException(message="Worker profile not found")

    existing = (
        db.query(WorkerLocation)
        .filter(WorkerLocation.worker_id == worker.id)
        .first()
    )

    if existing:
        existing.latitude = body.latitude
        existing.longitude = body.longitude
    else:
        loc = WorkerLocation(
            worker_id=worker.id,
            latitude=body.latitude,
            longitude=body.longitude,
        )
        db.add(loc)

    db.commit()

    return {
        "success": True,
        "message": "Location updated",
        "data": {
            "latitude": body.latitude,
            "longitude": body.longitude,
        },
    }


@router.get(
    "/recommended",
    summary="Get recommended workers",
)
def get_recommended_workers(
    service_id: Optional[str] = Query(None),
    budget: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    """Get recommended workers based on rating and completion count."""
    query = db.query(Worker)
    if budget:
        query = query.filter(Worker.hourly_rate <= budget)
    workers = query.order_by(Worker.rating.desc(), Worker.completed_jobs.desc()).limit(8).all()
    result = []
    for w in workers:
        u = w.user
        result.append({
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
            "is_verified": u.is_verified if u else False,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        })
    return {"success": True, "message": "OK", "data": result}


@router.get(
    "/trending",
    summary="Get trending workers",
)
def get_trending_workers(
    db: Session = Depends(get_db),
):
    """Get trending workers with highest recent activity."""
    workers = db.query(Worker).filter(Worker.is_online == True).order_by(
        Worker.rating.desc(), Worker.completed_jobs.desc()
    ).limit(8).all()
    result = []
    for w in workers:
        u = w.user
        result.append({
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
            "is_verified": u.is_verified if u else False,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        })
    return {"success": True, "message": "OK", "data": result}


@router.get(
    "",
    summary="List workers with filters",
)
def list_workers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    min_experience: Optional[int] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_price: Optional[float] = Query(None, ge=0),
    is_online: Optional[bool] = Query(None),
    sort_by: Optional[str] = Query(None, pattern="^(rating|price_asc|price_desc|experience|jobs)$"),
    db: Session = Depends(get_db),
):
    """Get workers with optional filtering and sorting."""
    service = WorkerService(db)
    result = service.list_workers(
        page=page,
        limit=limit,
        category_id=category_id,
        min_rating=min_rating,
        min_experience=min_experience,
        max_price=max_price,
        min_price=min_price,
        is_online=is_online,
        sort_by=sort_by,
    )
    return {
        "success": True,
        "message": "Workers retrieved successfully",
        "data": result["data"],
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "pages": result["pages"],
    }


@router.get(
    "/{worker_id}",
    summary="Get worker by ID",
)
def get_worker(worker_id: str, db: Session = Depends(get_db)):
    """Get a single worker with skills, languages, and availability."""
    service = WorkerService(db)
    result = service.get_worker(worker_id)
    return {
        "success": True,
        "message": "Worker retrieved successfully",
        "data": result,
    }
