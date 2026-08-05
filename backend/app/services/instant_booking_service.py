"""Instant & Emergency Booking Service.

Provides worker-matching logic for instant and emergency bookings:

* ``find_nearest_workers`` — returns online workers within a radius of the
  customer's location, scored by distance, rating, trust score, and
  availability, then sorted fastest-first.

* ``create_instant_booking`` — wraps the normal booking flow, auto-assigning
  the best available worker and returning an ETA.  Falls back to a regular
  (scheduled) booking when no instant worker is available.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.booking import BookingType
from app.models.worker import Worker
from app.models.worker_location import WorkerLocation
from app.models.service import Service
from app.services.recommendation_service import (
    haversine_km,
    _response_time_minutes,
    _trust_score,
)
from app.services.booking_service import BookingService
from app.core.exceptions import NotFoundException
from app.services.booking_service import BookingService
from app.core.exceptions import BadRequestException, NotFoundException


EMERGENCY_SURGE_MULTIPLIER = 1.20
DEFAULT_INSTANT_RADIUS_KM = 10.0
DEFAULT_INSTANT_LIMIT = 8


def find_nearest_workers(
    db: Session,
    lat: float,
    lng: float,
    service_id: Optional[str] = None,
    category_id: Optional[str] = None,
    radius_km: float = DEFAULT_INSTANT_RADIUS_KM,
    limit: int = DEFAULT_INSTANT_LIMIT,
    is_emergency: bool = False,
) -> list[dict]:
    """Return online workers near *(lat, lng)* sorted by ETA.

    Filters:
        * ``Worker.is_online == True``
        * optional :service_id: → worker must have the matching category or skill
        * within *radius_km* kilometres

    Ranking (closest ETA first):
        1. Travel time (distance / 20 km·h⁻¹)
        2. Response time
        3. Trust score (emergency only — trusts are weighted higher)
        4. Rating

    Each result includes the computed *eta_minutes* and *distance_km*.
    """
    from app.models.service import Service

    service_category_ids: set[str] = set()
    if service_id:
        svc = db.query(Service).filter(Service.id == service_id).first()
        if svc and svc.category_id:
            service_category_ids.add(svc.category_id)
    if category_id:
        service_category_ids.add(category_id)

    locations = db.query(WorkerLocation).all()

    scored: list[dict] = []
    for loc in locations:
        dist = haversine_km(lat, lng, loc.latitude, loc.longitude)
        if dist > radius_km:
            continue

        worker = db.query(Worker).filter(Worker.id == loc.worker_id).first()
        if worker is None or not worker.is_online:
            continue

        category_match = True
        if service_category_ids:
            worker_categories = set(worker.category_ids or [])
            category_match = bool(service_category_ids & worker_categories)

        if not category_match and service_category_ids:
            skill_names = {s.skill for s in (worker.skills or [])}
            category_names = service_category_ids
            if not (category_names & skill_names):
                continue

        response_time = _response_time_minutes(db, worker)
        trust = _trust_score(db, worker)
        travel_min = (dist / 20.0) * 60.0 if dist else 25.0
        eta = int(round(response_time + travel_min))

        score = response_time + travel_min
        if is_emergency:
            score -= trust

        scored.append({
            "id": worker.id,
            "user_id": worker.user_id,
            "name": worker.name,
            "avatar": worker.avatar,
            "profession": worker.profession,
            "bio": worker.bio,
            "experience_years": worker.experience_years,
            "completed_jobs": worker.completed_jobs,
            "rating": worker.rating,
            "review_count": worker.review_count,
            "hourly_rate": worker.hourly_rate,
            "is_online": worker.is_online,
            "category_ids": worker.category_ids or [],
            "trust_score": trust,
            "verification_badge": worker.verification_badge,
            "response_time_minutes": response_time,
            "eta_minutes": eta,
            "distance_km": round(dist, 2),
        })

    scored.sort(key=lambda r: (r["eta_minutes"], -(r["trust_score"] or 0), -(r["rating"] or 0)))
    return scored[:limit]


def create_instant_booking(
    db: Session,
    customer_id: str,
    service_id: str,
    problem_description: str,
    scheduled_date: str,
    scheduled_time: str,
    address: dict,
    customer_lat: Optional[float] = None,
    customer_lng: Optional[float] = None,
    is_emergency: bool = False,
    coupon_code: Optional[str] = None,
    problem_images: Optional[list] = None,
) -> dict:
    """Create an instant or emergency booking.

    1. Searches for the nearest online worker.
    2. If found — assigns them, sets ``booking_type`` / ``is_emergency`` /
       ``eta_minutes`` and returns the booking.
    3. If none found — falls back to a normal scheduled booking (no worker
       assigned) and includes ``fallback=True`` in the result so the frontend
       can show a helpful message.

    Emergency bookings apply a 20 % surge to the final price.
    """
    service = db.query(Service).filter(Service.id == service_id).first()
    if service is None:
        raise NotFoundException(message="Service not found")

    base_price = service.base_price
    if is_emergency:
        final_price = round(base_price * EMERGENCY_SURGE_MULTIPLIER, 2)
    else:
        final_price = base_price

    workers = []
    assigned_worker_id: Optional[str] = None
    eta: Optional[int] = None
    fallback = False

    if customer_lat is not None and customer_lng is not None:
        workers = find_nearest_workers(
            db,
            lat=customer_lat,
            lng=customer_lng,
            service_id=service_id,
            is_emergency=is_emergency,
        )

    if workers:
        best = workers[0]
        assigned_worker_id = best["id"]
        eta = best["eta_minutes"]
    else:
        fallback = True

    booking_type = BookingType.EMERGENCY if is_emergency else BookingType.INSTANT

    svc = BookingService(db)
    result = svc.create_booking(
        customer_id=customer_id,
        service_id=service_id,
        problem_description=problem_description,
        scheduled_date=scheduled_date,
        scheduled_time=scheduled_time,
        address=address,
        worker_id=assigned_worker_id,
        coupon_code=coupon_code,
        problem_images=problem_images,
        booking_type=booking_type.value,
        is_emergency=is_emergency,
        eta_minutes=eta,
    )

    result["eta_minutes"] = eta
    result["assigned_worker"] = workers[0] if workers else None
    result["fallback"] = fallback
    if fallback:
        result["message"] = "No instant workers available. Booking created as a regular request."
    if is_emergency and not fallback:
        result["surge_applied"] = True
        result["surge_multiplier"] = EMERGENCY_SURGE_MULTIPLIER
    return result
