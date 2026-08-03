"""Recommendation engine for workers.

Each recommendation category uses its own ranking criteria:

1. AI Recommended  -> weighted score of trust, rating, experience, jobs,
                      response time, distance, availability, skill match,
                      and customer satisfaction.
2. Nearby          -> sorted by distance + current availability.
3. Fastest         -> online workers sorted by response time + ETA.

The serializers intentionally expose a superset of the fields used by the
worker cards so the frontend can show trust score, verification badge,
distance, ETA, response time, experience, jobs completed and availability.
"""
import hashlib
import math
from datetime import datetime
from typing import Optional, Set

from sqlalchemy.orm import Session

from app.models.worker import Worker


# ============================================================
# GEOMETRY / TIME HELPERS
# ============================================================

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in kilometres between two lat/lng points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _time_to_minutes(value) -> Optional[int]:
    try:
        h, m = str(value).split(":")
        return int(h) * 60 + int(m)
    except Exception:
        return None


# ============================================================
# PER-WORKER SIGNALS
# ============================================================

def _response_time_minutes(db: Session, worker: Worker) -> int:
    """Average response time (minutes) for a worker.

    Uses real booking/acceptance data when available, otherwise derives a
    deterministic estimate from online status, completed jobs, reviews and a
    per-worker hash so results stay stable between requests.
    """
    times = []
    for booking in worker.bookings or []:
        created = booking.created_at
        if not created:
            continue
        for entry in booking.status_history or []:
            if entry.status in ("accepted", "worker-assigned", "worker-on-the-way") and entry.created_at:
                delta = (entry.created_at - created).total_seconds() / 60.0
                if delta >= 0:
                    times.append(delta)
    if times:
        return round(min(90, max(5, sum(times) / len(times))))

    base = 45.0
    if worker.is_online:
        base *= 0.6
    base /= 1.0 + min(1.0, (worker.completed_jobs or 0) / 200.0)
    base /= 1.0 + min(1.0, (worker.review_count or 0) / 200.0) * 0.3
    digest = hashlib.md5(str(worker.id).encode("utf-8")).hexdigest()
    variance = 0.8 + (int(digest[:4], 16) % 1000) / 5000.0
    return round(min(90, max(5, base * variance)))


def _availability_info(worker: Worker) -> dict:
    """Return availability status + numeric rank (lower = more available)."""
    if not worker.is_online:
        return {"availability_status": "offline", "availability_rank": 2}
    now = datetime.now()
    day_name = now.strftime("%a").lower()[:3]
    current_minutes = now.hour * 60 + now.minute
    for slot in worker.availability or []:
        if (slot.day or "").lower()[:3] != day_name:
            continue
        for entry in slot.slots or []:
            start = _time_to_minutes(entry.get("start"))
            end = _time_to_minutes(entry.get("end"))
            if start is not None and end is not None and start <= current_minutes <= end:
                return {"availability_status": "available_now", "availability_rank": 0}
    return {"availability_status": "online", "availability_rank": 1}


def _eta_minutes(response_time: int, distance_km: Optional[float]) -> int:
    """Estimated arrival = response time + travel time (assume ~20 km/h)."""
    travel = (distance_km / 20.0) * 60.0 if distance_km is not None else 25.0
    return int(round(response_time + travel))


def _trust_score(db: Session, worker: Worker) -> int:
    """0..100 trust score: fraud data first, then verification signals."""
    from app.models.fraud import WorkerFraudData
    fd = db.query(WorkerFraudData).filter(WorkerFraudData.worker_id == worker.id).first()
    if fd and fd.fraud_score is not None:
        return round(max(0, 100 - fd.fraud_score))
    if worker.trust_score is not None:
        return round(min(100, max(0, worker.trust_score)))
    base = 60
    if worker.aadhaar_verified:
        base += 15
    if worker.user and worker.user.is_verified:
        base += 10
    if worker.verification_badge in ("gold", "pro"):
        base += 10
    if worker.review_count:
        base += min(5, worker.review_count / 20)
    return min(100, base)


def _skill_match_score(
    worker: Worker,
    requested: Optional[str],
    category_ids: Optional[Set[str]],
) -> float:
    """0..1 match between a worker and the requested service/category."""
    if not requested and not category_ids:
        return 0.6
    score = 0.0
    if category_ids and worker.category_ids:
        if len(category_ids & set(worker.category_ids)) > 0:
            score = max(score, 0.5)
    if requested:
        prof = (worker.profession or "").lower()
        text = " ".join(
            [prof, worker.bio or ""]
            + [getattr(s, "skill", "") or "" for s in (worker.skills or [])]
        ).lower()
        term = requested.lower()
        if term in prof or prof in term:
            score = max(score, 1.0)
        else:
            tokens = [t for t in term.split() if len(t) > 2]
            if tokens:
                hits = sum(1 for t in tokens if t in text)
                score = max(score, min(1.0, 0.5 + hits * 0.2))
    return round(min(1.0, max(0.0, score)), 2)


def _ai_score(
    worker: Worker,
    trust: int,
    response_time: int,
    distance_km: Optional[float],
    availability: dict,
    skill_match: float,
) -> float:
    """Weighted AI recommendation score (0..100)."""

    def norm(value, lo, hi):
        return max(0.0, min(1.0, (value - lo) / (hi - lo)))

    trust_n = trust / 100.0
    rating_n = norm(worker.rating or 0, 0, 5)
    exp_n = norm(worker.experience_years or 0, 0, 10)
    jobs_n = norm(worker.completed_jobs or 0, 0, 500)
    response_n = 1 - norm(response_time, 5, 90)
    distance_n = 1 - norm(distance_km, 0, 50) if distance_km is not None else 0.6
    availability_n = {0: 1.0, 1: 0.8, 2: 0.4}[availability["availability_rank"]]
    satisfaction_n = (worker.rating or 0) / 5.0 * (0.5 + 0.5 * min(1.0, (worker.review_count or 0) / 100.0))

    return round(
        100.0
        * (
            0.20 * trust_n
            + 0.15 * rating_n
            + 0.10 * exp_n
            + 0.10 * jobs_n
            + 0.10 * response_n
            + 0.10 * distance_n
            + 0.10 * availability_n
            + 0.10 * skill_match
            + 0.05 * satisfaction_n
        ),
        1,
    )


# ============================================================
# SERIALIZATION
# ============================================================

def serialize_worker(
    db: Session,
    worker: Worker,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    distance_km: Optional[float] = None,
    extra: Optional[dict] = None,
) -> dict:
    """Full worker payload used across all recommendation categories."""
    user = worker.user
    response_time = _response_time_minutes(db, worker)
    availability = _availability_info(worker)
    trust = _trust_score(db, worker)
    finite_distance = distance_km if distance_km is not None and math.isfinite(distance_km) else None
    eta = _eta_minutes(response_time, finite_distance)

    data = {
        "id": worker.id,
        "user_id": worker.user_id,
        "name": worker.name,
        "avatar": worker.avatar,
        "cover_image": worker.cover_image,
        "profession": worker.profession,
        "bio": worker.bio,
        "experience_years": worker.experience_years,
        "completed_jobs": worker.completed_jobs,
        "rating": worker.rating,
        "review_count": worker.review_count,
        "hourly_rate": worker.hourly_rate,
        "is_online": worker.is_online,
        "category_ids": worker.category_ids or [],
        "is_verified": user.is_verified if user else False,
        "aadhaar_verified": worker.aadhaar_verified,
        "trust_score": trust,
        "verification_badge": worker.verification_badge,
        "skills": [getattr(s, "skill", "") for s in (worker.skills or []) if getattr(s, "skill", None)],
        "languages": [getattr(l, "language", "") for l in (worker.languages or []) if getattr(l, "language", None)],
        "response_time_minutes": response_time,
        "availability_status": availability["availability_status"],
        "availability_rank": availability["availability_rank"],
        "eta_minutes": eta,
        "created_at": worker.created_at.isoformat() if worker.created_at else None,
    }
    if finite_distance is not None:
        data["distance_km"] = round(finite_distance, 2)
        data["distance"] = round(finite_distance, 2)
    if extra:
        data.update(extra)
    return data


def _distance_to(db: Session, worker: Worker, lat: float, lng: float) -> Optional[float]:
    loc = worker.location
    if loc is None:
        return None
    return haversine_km(lat, lng, loc.latitude, loc.longitude)


# ============================================================
# CATEGORY RANKINGS
# ============================================================

def ai_recommend(
    db: Session,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    service_id: Optional[str] = None,
    category_id: Optional[str] = None,
    budget: Optional[float] = None,
    limit: int = 8,
    exclude_ids: Optional[set] = None,
) -> list[dict]:
    """AI Recommended Workers — best overall score across all signals."""
    from app.models.service import Service

    requested = None
    category_ids: Set[str] = set()
    if service_id:
        svc = db.query(Service).filter(Service.id == service_id).first()
        if svc:
            requested = svc.name
            if svc.category_id:
                category_ids.add(svc.category_id)
    if category_id:
        category_ids.add(category_id)

    workers = db.query(Worker).all()
    scored = []
    for w in workers:
        if exclude_ids and w.id in exclude_ids:
            continue
        dist = _distance_to(db, w, lat, lng) if lat is not None and lng is not None else None
        response_time = _response_time_minutes(db, w)
        availability = _availability_info(w)
        trust = _trust_score(db, w)
        skill = _skill_match_score(w, requested, category_ids)
        ai = _ai_score(w, trust, response_time, dist, availability, skill)
        scored.append(
            serialize_worker(
                db, w, lat, lng, distance_km=dist,
                extra={"ai_score": ai, "skill_match_score": skill},
            )
        )

    scored.sort(key=lambda r: r["ai_score"], reverse=True)
    if budget is not None:
        scored = [s for s in scored if s["hourly_rate"] <= budget]
    return scored[:limit]


def nearby_workers(
    db: Session,
    lat: float,
    lng: float,
    radius: float = 10.0,
    limit: int = 20,
) -> list[dict]:
    """Nearby Workers — nearest first, current availability as tiebreaker."""
    from app.models.worker_location import WorkerLocation

    locations = db.query(WorkerLocation).all()
    results = []
    for loc in locations:
        dist = haversine_km(lat, lng, loc.latitude, loc.longitude)
        if dist > radius:
            continue
        worker = db.query(Worker).filter(Worker.id == loc.worker_id).first()
        if worker is None:
            continue
        results.append(serialize_worker(db, worker, lat, lng, distance_km=dist))

    results.sort(key=lambda r: (r["availability_rank"], r["distance_km"]))
    return results[:limit]


def fastest_workers(
    db: Session,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    limit: int = 8,
) -> list[dict]:
    """Fastest Available Workers — online only, quickest response + ETA first."""
    workers = db.query(Worker).filter(Worker.is_online == True).all()
    results = []
    for w in workers:
        dist = _distance_to(db, w, lat, lng) if lat is not None and lng is not None else None
        results.append(serialize_worker(db, w, lat, lng, distance_km=dist))

    results.sort(key=lambda r: (r["response_time_minutes"], r["eta_minutes"]))
    return results[:limit]
