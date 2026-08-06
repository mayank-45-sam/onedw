"""Async Instant & Emergency Booking Service — Beanie version."""
from __future__ import annotations

from typing import Optional

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
from app.core.exceptions import NotFoundException, BadRequestException


EMERGENCY_SURGE_MULTIPLIER = 1.20
DEFAULT_INSTANT_RADIUS_KM = 10.0
DEFAULT_INSTANT_LIMIT = 8


async def find_nearest_workers(
    lat: float,
    lng: float,
    service_id: Optional[str] = None,
    category_id: Optional[str] = None,
    radius_km: float = DEFAULT_INSTANT_RADIUS_KM,
    limit: int = DEFAULT_INSTANT_LIMIT,
    is_emergency: bool = False,
) -> list[dict]:
    """Return online workers near (lat, lng) sorted by ETA."""
    service_category_ids: set[str] = set()
    if service_id:
        svc = await Service.find_one(Service.id == service_id)
        if svc and svc.category_id:
            service_category_ids.add(svc.category_id)
    if category_id:
        service_category_ids.add(category_id)

    locations = await WorkerLocation.find_all().to_list()

    scored: list[dict] = []
    for loc in locations:
        dist = haversine_km(lat, lng, loc.latitude, loc.longitude)
        if dist > radius_km:
            continue

        worker = await Worker.find_one(Worker.id == loc.worker_id)
        if worker is None or not worker.is_online:
            continue

        if service_category_ids:
            worker_categories = set(worker.category_ids or [])
            if not (service_category_ids & worker_categories):
                continue

        trust = await _trust_score(worker)
        response_time = _response_time_minutes(worker)
        travel_min = (dist / 20.0) * 60.0 if dist else 25.0
        eta = int(round(response_time + travel_min))

        score = response_time + travel_min
        if is_emergency:
            score -= trust

        scored.append({
            "id": worker.id, "user_id": worker.user_id, "name": worker.name,
            "avatar": worker.avatar, "profession": worker.profession, "bio": worker.bio,
            "experience_years": worker.experience_years, "completed_jobs": worker.completed_jobs,
            "rating": worker.rating, "review_count": worker.review_count,
            "hourly_rate": worker.hourly_rate, "is_online": worker.is_online,
            "category_ids": worker.category_ids or [],
            "trust_score": trust, "verification_badge": worker.verification_badge,
            "response_time_minutes": response_time, "eta_minutes": eta,
            "distance_km": round(dist, 2),
        })

    scored.sort(key=lambda r: (r["eta_minutes"], -(r["trust_score"] or 0), -(r["rating"] or 0)))
    return scored[:limit]


async def create_instant_booking(
    customer_id: str,
    user_id: str,
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
    """Create an instant or emergency booking."""
    service = await Service.find_one(Service.id == service_id)
    if service is None:
        raise NotFoundException(message="Service not found")

    workers = []
    assigned_worker_id: Optional[str] = None
    eta: Optional[int] = None
    fallback = False

    if customer_lat is not None and customer_lng is not None:
        workers = await find_nearest_workers(
            lat=customer_lat, lng=customer_lng,
            service_id=service_id, is_emergency=is_emergency,
        )

    if workers:
        best = workers[0]
        assigned_worker_id = best["id"]
        eta = best["eta_minutes"]
    else:
        fallback = True

    booking_type = BookingType.EMERGENCY if is_emergency else BookingType.INSTANT

    svc = BookingService()
    result = await svc.create_booking(
        customer_id=customer_id, user_id=user_id, service_id=service_id,
        problem_description=problem_description, scheduled_date=scheduled_date,
        scheduled_time=scheduled_time, address=address, worker_id=assigned_worker_id,
        coupon_code=coupon_code, problem_images=problem_images,
        booking_type=booking_type.value, is_emergency=is_emergency, eta_minutes=eta,
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
