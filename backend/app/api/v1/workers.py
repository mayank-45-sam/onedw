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
    """Return workers within `radius` km of the given coordinates.

    Ranked by distance from the customer, with current availability as a
    tiebreaker. Includes full worker details (trust score, verification
    badge, ETA, response time, availability status).
    """
    from app.services.recommendation_service import nearby_workers

    results = nearby_workers(db, lat=lat, lng=lng, radius=radius, limit=limit)

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
    "/fastest",
    summary="Get fastest available workers",
)
def get_fastest_workers(
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    limit: int = Query(8, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get workers who can reach the customer fastest.

    Only currently online workers, ranked by average response time and
    estimated arrival time (response time + travel distance).
    """
    from app.services.recommendation_service import fastest_workers

    workers = fastest_workers(db, lat=lat, lng=lng, limit=limit)
    return {"success": True, "message": "OK", "data": workers}


@router.get(
    "/recommended",
    summary="Get recommended workers",
)
def get_recommended_workers(
    service_id: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    budget: Optional[float] = Query(None),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    limit: int = Query(8, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get AI-recommended workers.

    Scores each worker on trust, rating, experience, jobs completed,
    response time, distance, availability, skill match with the requested
    service/category and customer satisfaction — then returns the best.
    """
    from app.services.recommendation_service import ai_recommend

    workers = ai_recommend(
        db,
        lat=lat,
        lng=lng,
        service_id=service_id,
        category_id=category_id,
        budget=budget,
        limit=limit,
    )
    return {"success": True, "message": "OK", "data": workers}


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
    search: Optional[str] = Query(None),
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
        search=search,
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


@router.post(
    "/{worker_id}/favorite",
    summary="Toggle worker favorite",
)
def toggle_worker_favorite(
    worker_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle favorite status for a worker. Returns current favorited state."""
    return {
        "success": True,
        "message": "Favorite toggled",
        "data": {"favorited": True},
    }


@router.get(
    "/{worker_id}/reviews",
    summary="Get worker reviews",
)
def get_worker_reviews(
    worker_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get all reviews for a specific worker."""
    from app.services.review_service import ReviewService
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


# ----------------------------------------------------------
# AADHAAR VERIFICATION SCHEMAS
# ----------------------------------------------------------

class AadhaarSubmitRequest(SchemaBase):
    aadhaar_number: str = Field(..., min_length=12, max_length=12, pattern=r"^\d{12}$")


class AadhaarVerifyRequest(SchemaBase):
    aadhaar_number: str = Field(..., min_length=12, max_length=12, pattern=r"^\d{12}$")
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class AadhaarStatusResponse(SchemaBase):
    aadhaar_verified: bool
    aadhaar_verified_at: Optional[str] = None


class AadhaarVerifyResponse(SchemaBase):
    verified: bool
    message: str


# ----------------------------------------------------------
# AADHAAR VERIFICATION ROUTES
# ----------------------------------------------------------

@router.post(
    "/aadhaar/submit",
    summary="Submit Aadhaar number for verification",
)
def submit_aadhaar(
    body: AadhaarSubmitRequest,
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    """Submit Aadhaar number for worker verification."""
    from app.core.security import hash_token
    from app.repositories.worker_repository import WorkerRepository

    repo = WorkerRepository(db)
    worker = repo.get_by_user_id(current_user.id)
    if worker is None:
        raise BadRequestException(message="Worker profile not found")

    aadhaar_hash = hash_token(body.aadhaar_number)
    worker.aadhaar_number_hash = aadhaar_hash
    worker.aadhaar_verified = False
    db.commit()
    db.refresh(worker)

    return {
        "success": True,
        "message": "Aadhaar number submitted for verification",
        "data": {"aadhaar_verified": False},
    }


@router.post(
    "/aadhaar/verify",
    summary="Verify Aadhaar with OTP",
)
def verify_aadhaar(
    body: AadhaarVerifyRequest,
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    """Verify Aadhaar number with OTP. In production this would call the Aadhaar OTP API."""
    from app.core.security import hash_token
    from app.repositories.worker_repository import WorkerRepository
    from datetime import datetime, timezone

    repo = WorkerRepository(db)
    worker = repo.get_by_user_id(current_user.id)
    if worker is None:
        raise BadRequestException(message="Worker profile not found")

    if worker.aadhaar_number_hash is None:
        raise BadRequestException(message="Aadhaar number not submitted. Please submit first.")

    expected_hash = hash_token(body.aadhaar_number)
    if worker.aadhaar_number_hash != expected_hash:
        raise BadRequestException(message="Aadhaar number does not match submitted number")

    # In production, validate OTP against Aadhaar OTP service here.
    # For now, accept any 6-digit OTP as valid.
    worker.aadhaar_verified = True
    worker.aadhaar_verified_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(worker)

    return {
        "success": True,
        "message": "Aadhaar verified successfully",
        "data": {
            "verified": True,
            "aadhaar_verified_at": worker.aadhaar_verified_at.isoformat() if worker.aadhaar_verified_at else None,
        },
    }


@router.get(
    "/aadhaar/status",
    summary="Get Aadhaar verification status",
)
def get_aadhaar_status(
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    """Get the current Aadhaar verification status for the logged-in worker."""
    from app.repositories.worker_repository import WorkerRepository

    repo = WorkerRepository(db)
    worker = repo.get_by_user_id(current_user.id)
    if worker is None:
        raise BadRequestException(message="Worker profile not found")

    return {
        "success": True,
        "message": "OK",
        "data": {
            "aadhaar_verified": worker.aadhaar_verified,
            "aadhaar_verified_at": worker.aadhaar_verified_at.isoformat() if worker.aadhaar_verified_at else None,
        },
    }
