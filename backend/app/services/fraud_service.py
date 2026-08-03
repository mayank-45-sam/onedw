import json as json_module
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Float
import httpx
from loguru import logger

from app.core.config import settings
from app.models.worker import Worker
from app.models.booking import Booking, BookingStatus
from app.models.review import Review
from app.models.complaint import Complaint
from app.models.fraud import WorkerFraudData, FraudReport, SuspiciousActivity
from app.schemas.fraud import (
    FraudScoreBreakdown,
    FraudAnalysisResponse,
    WorkerFraudSummary,
    SuspiciousActivityResponse,
    FraudReportResponse,
    HighRiskWorkerResponse,
    PublicFraudStatus,
)

FRAUD_ANALYSIS_PROMPT = """You are an AI fraud detection analyst for a home services platform. Analyze the following worker data and return a JSON response with exactly these fields:

{
  "risk_level": "low" | "medium" | "high" | "critical",
  "reason": "Brief explanation of why this risk level was assigned",
  "confidence": 0-100 (integer),
  "recommendation": "One of: no_action | monitor | warn | temporary_suspend | permanent_ban"
}

Worker Data:
- Name: {worker_name}
- Profession: {profession}
- Experience: {experience_years} years
- Rating: {rating}/5 from {review_count} reviews
- Completed Jobs: {completed_jobs}
- Hourly Rate: ${hourly_rate}
- Cancellation Rate: {cancel_rate}%
- Complaint Count: {complaint_count}
- Price Change % (last 7 days): {price_change_pct}
- Suspicious Activities: {suspicious_count}

Rules:
- If rating > 4.5 but review_count < 5 and completed_jobs < 10 -> suspicious (possible fake reviews)
- If cancellation rate > 30% -> high risk
- If price changed by more than 100% in 7 days -> high risk
- If complaint_count > 3 -> high risk
- If suspicious_activities > 2 -> high risk
- Combine factors appropriately for the final score
- Return ONLY valid JSON, no markdown, no explanation outside the JSON object."""


def _now_str() -> str:
    return datetime.now(timezone.utc).isoformat()


def _calculate_fraud_score(worker: Worker, db: Session) -> FraudScoreBreakdown:
    breakdown = FraudScoreBreakdown()

    # 1. Fake reviews score
    if worker.review_count > 0 and worker.completed_jobs > 0:
        review_to_job_ratio = worker.review_count / max(worker.completed_jobs, 1)
        if review_to_job_ratio > 0.8 and worker.rating > 4.5 and worker.completed_jobs < 20:
            breakdown.fake_reviews_score = min(100, (review_to_job_ratio - 0.5) * 100)
        reviews = db.query(Review).filter(Review.worker_id == worker.id).all()
        if reviews:
            high_rating_count = sum(1 for r in reviews if r.rating >= 4.5)
            if len(reviews) >= 3 and high_rating_count == len(reviews):
                breakdown.fake_reviews_score = max(breakdown.fake_reviews_score, 60)

    # 2. Cancellation score
    total_bookings = db.query(Booking).filter(Booking.worker_id == worker.id).count()
    if total_bookings > 0:
        cancelled = db.query(Booking).filter(
            Booking.worker_id == worker.id,
            Booking.status == BookingStatus.CANCELLED
        ).count()
        cancel_rate = (cancelled / total_bookings) * 100
        if cancel_rate > 10:
            breakdown.cancellation_score = min(100, cancel_rate * 2)
        if cancel_rate > 50:
            breakdown.cancellation_score = 100

    # 3. Price change score (check last 7 days changes)
    price_bookings = db.query(Booking).filter(
        Booking.worker_id == worker.id
    ).order_by(Booking.created_at.desc()).limit(20).all()
    if len(price_bookings) >= 2:
        prices = [b.price for b in price_bookings if b.price and b.price > 0]
        if len(prices) >= 2:
            min_p, max_p = min(prices), max(prices)
            if min_p > 0:
                change_pct = ((max_p - min_p) / min_p) * 100
                if change_pct > 50:
                    breakdown.price_change_score = min(100, change_pct)
                if change_pct > 200:
                    breakdown.price_change_score = 100

    # 4. Complaint score
    complaint_count = db.query(Complaint).filter(
        Complaint.worker_id == worker.id
    ).count()
    if complaint_count > 0:
        breakdown.complaint_score = min(100, complaint_count * 25)
    if complaint_count >= 4:
        breakdown.complaint_score = 100

    # 5. Suspicious login score (from suspicious activities)
    suspicious_count = db.query(SuspiciousActivity).filter(
        SuspiciousActivity.worker_id == worker.id,
        SuspiciousActivity.activity_type == "suspicious_login"
    ).count()
    if suspicious_count > 0:
        breakdown.suspicious_login_score = min(100, suspicious_count * 30)

    # 6. Duplicate phone score
    dup_phone_count = db.query(SuspiciousActivity).filter(
        SuspiciousActivity.worker_id == worker.id,
        SuspiciousActivity.activity_type == "duplicate_phone"
    ).count()
    if dup_phone_count > 0:
        breakdown.duplicate_phone_score = min(100, dup_phone_count * 40)

    # 7. Duplicate device score
    dup_device_count = db.query(SuspiciousActivity).filter(
        SuspiciousActivity.worker_id == worker.id,
        SuspiciousActivity.activity_type == "duplicate_device"
    ).count()
    if dup_device_count > 0:
        breakdown.duplicate_device_score = min(100, dup_device_count * 40)

    # 8. Fake profile score
    fake_profile_count = db.query(SuspiciousActivity).filter(
        SuspiciousActivity.worker_id == worker.id,
        SuspiciousActivity.activity_type == "fake_profile"
    ).count()
    if fake_profile_count > 0:
        breakdown.fake_profile_score = min(100, fake_profile_count * 50)

    return breakdown


def _calculate_total_score(breakdown: FraudScoreBreakdown) -> float:
    weights = {
        "fake_reviews_score": 0.15,
        "cancellation_score": 0.20,
        "price_change_score": 0.10,
        "complaint_score": 0.20,
        "suspicious_login_score": 0.10,
        "duplicate_phone_score": 0.10,
        "duplicate_device_score": 0.10,
        "fake_profile_score": 0.05,
    }
    total = 0.0
    for field, weight in weights.items():
        total += getattr(breakdown, field, 0.0) * weight
    return round(min(100, total), 1)


def _get_risk_level(score: float) -> str:
    if score >= 80:
        return "critical" if score >= 95 else "high"
    if score >= 50:
        return "medium"
    return "low"


async def _analyze_with_ai(worker: Worker, db: Session) -> dict:
    if not settings.AI_API_KEY:
        return {
            "risk_level": _get_risk_level(
                _calculate_total_score(_calculate_fraud_score(worker, db))
            ),
            "reason": "AI service not configured. Using heuristic analysis.",
            "confidence": 0,
            "recommendation": "monitor",
        }

    total_bookings = db.query(Booking).filter(Booking.worker_id == worker.id).count()
    cancelled = db.query(Booking).filter(
        Booking.worker_id == worker.id,
        Booking.status == BookingStatus.CANCELLED
    ).count()
    cancel_rate = round((cancelled / max(total_bookings, 1)) * 100, 1)
    complaint_count = db.query(Complaint).filter(
        Complaint.worker_id == worker.id
    ).count()
    suspicious_count = db.query(SuspiciousActivity).filter(
        SuspiciousActivity.worker_id == worker.id
    ).count()

    price_bookings = db.query(Booking).filter(
        Booking.worker_id == worker.id
    ).order_by(Booking.created_at.desc()).limit(20).all()
    price_change_pct = 0
    if len(price_bookings) >= 2:
        prices = [b.price for b in price_bookings if b.price and b.price > 0]
        if len(prices) >= 2:
            min_p, max_p = min(prices), max(prices)
            if min_p > 0:
                price_change_pct = round(((max_p - min_p) / min_p) * 100, 1)

    prompt = FRAUD_ANALYSIS_PROMPT.format(
        worker_name=worker.name,
        profession=worker.profession,
        experience_years=worker.experience_years,
        rating=worker.rating,
        review_count=worker.review_count,
        completed_jobs=worker.completed_jobs,
        hourly_rate=worker.hourly_rate,
        cancel_rate=cancel_rate,
        complaint_count=complaint_count,
        price_change_pct=price_change_pct,
        suspicious_count=suspicious_count,
    )

    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Analyze worker {worker.name} ({worker.id}) for fraud risk."},
        ],
        "max_tokens": 512,
        "temperature": 0.3,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_API_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )

            if response.status_code != 200:
                body = await response.aread()
                logger.error(f"Fraud AI API error {response.status_code}: {body[:500]}")
                heuristic_score = _calculate_total_score(_calculate_fraud_score(worker, db))
                return {
                    "risk_level": _get_risk_level(heuristic_score),
                    "reason": "AI analysis unavailable. Used heuristic scoring.",
                    "confidence": 0,
                    "recommendation": "monitor",
                }

            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            stripped = content.strip()
            if stripped.startswith("```json"):
                stripped = stripped[len("```json"):]
            elif stripped.startswith("```"):
                stripped = stripped[len("```"):]
            if stripped.endswith("```"):
                stripped = stripped[:-len("```")]
            stripped = stripped.strip()

            try:
                parsed = json_module.loads(stripped)
                required = {"risk_level", "reason", "confidence", "recommendation"}
                if not required.issubset(parsed.keys()):
                    raise ValueError("Missing required keys")
                return parsed
            except (json_module.JSONDecodeError, ValueError):
                logger.warning(f"Fraud AI returned invalid JSON: {content[:200]}")
                heuristic_score = _calculate_total_score(_calculate_fraud_score(worker, db))
                return {
                    "risk_level": _get_risk_level(heuristic_score),
                    "reason": "AI returned invalid response. Used heuristic scoring.",
                    "confidence": 0,
                    "recommendation": "monitor",
                }

    except Exception as e:
        logger.error(f"Fraud AI analysis error: {e}")
        heuristic_score = _calculate_total_score(_calculate_fraud_score(worker, db))
        return {
            "risk_level": _get_risk_level(heuristic_score),
            "reason": "AI analysis failed. Used heuristic scoring.",
            "confidence": 0,
            "recommendation": "monitor",
        }


def _get_or_create_fraud_data(worker_id: str, db: Session) -> WorkerFraudData:
    data = db.query(WorkerFraudData).filter(WorkerFraudData.worker_id == worker_id).first()
    if not data:
        data = WorkerFraudData(
            id=str(uuid.uuid4()),
            worker_id=worker_id,
            fraud_score=0.0,
            is_disabled=False,
            risk_level="low",
        )
        db.add(data)
        db.commit()
        db.refresh(data)
    return data


async def analyze_worker(worker_id: str, trigger_reason: Optional[str] = None, db: Optional[Session] = None) -> FraudAnalysisResponse:
    from app.db.database import SessionLocal
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        worker = db.query(Worker).filter(Worker.id == worker_id).first()
        if not worker:
            raise ValueError(f"Worker {worker_id} not found")

        breakdown = _calculate_fraud_score(worker, db)
        heuristic_score = _calculate_total_score(breakdown)
        ai_result = await _analyze_with_ai(worker, db)

        risk_level = ai_result.get("risk_level", _get_risk_level(heuristic_score))
        reason = ai_result.get("reason", "Standard heuristic analysis")
        confidence = ai_result.get("confidence", 0)
        recommendation = ai_result.get("recommendation", "monitor")

        final_score = heuristic_score
        if confidence and confidence > 50:
            final_score = round(heuristic_score * 0.4 + (101 - heuristic_score) * 0.6, 1)
            if risk_level in ("high", "critical"):
                final_score = max(final_score, 70)
            elif risk_level == "medium":
                final_score = max(final_score, 40)

        final_score = max(0, min(100, final_score))
        risk_level = _get_risk_level(final_score)

        is_disabled = final_score >= 95
        now = _now_str()

        fraud_report = FraudReport(
            id=str(uuid.uuid4()),
            worker_id=worker_id,
            fraud_score=final_score,
            risk_level=risk_level,
            reason=reason,
            confidence=confidence,
            recommendation=recommendation,
            analysis_details={
                "score_breakdown": breakdown.model_dump(),
                "ai_raw": ai_result,
                "heuristic_score": heuristic_score,
            },
            triggered_by=trigger_reason or "manual",
            analyzed_at=now,
        )
        db.add(fraud_report)

        fraud_data = _get_or_create_fraud_data(worker_id, db)
        fraud_data.fraud_score = final_score
        fraud_data.risk_level = risk_level
        fraud_data.is_disabled = is_disabled
        fraud_data.last_analysis_at = now

        if final_score >= 95:
            worker.is_online = False

        db.commit()
        db.refresh(fraud_report)

        suspicious = db.query(SuspiciousActivity).filter(
            SuspiciousActivity.worker_id == worker_id
        ).order_by(SuspiciousActivity.detected_at.desc()).all()

        return FraudAnalysisResponse(
            worker_id=worker_id,
            worker_name=worker.name,
            fraud_score=final_score,
            risk_level=risk_level,
            reason=reason,
            confidence=confidence,
            recommendation=recommendation,
            score_breakdown=breakdown,
            suspicious_activities=[
                SuspiciousActivityResponse(
                    id=a.id,
                    worker_id=a.worker_id,
                    activity_type=a.activity_type,
                    description=a.description,
                    severity=a.severity,
                    metadata_json=a.metadata_json,
                    detected_at=a.detected_at,
                    created_at=a.created_at,
                ) for a in suspicious
            ],
            report=FraudReportResponse(
                id=fraud_report.id,
                worker_id=fraud_report.worker_id,
                fraud_score=fraud_report.fraud_score,
                risk_level=fraud_report.risk_level,
                reason=fraud_report.reason,
                confidence=fraud_report.confidence,
                recommendation=fraud_report.recommendation,
                analysis_details=fraud_report.analysis_details,
                triggered_by=fraud_report.triggered_by,
                analyzed_at=fraud_report.analyzed_at,
                created_at=fraud_report.created_at,
            ),
            is_disabled=is_disabled,
        )
    finally:
        if close_db:
            db.close()


def get_fraud_report(worker_id: str, db: Session) -> Optional[FraudAnalysisResponse]:
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        return None

    fraud_data = db.query(WorkerFraudData).filter(
        WorkerFraudData.worker_id == worker_id
    ).first()

    latest_report = db.query(FraudReport).filter(
        FraudReport.worker_id == worker_id
    ).order_by(FraudReport.created_at.desc()).first()

    suspicious = db.query(SuspiciousActivity).filter(
        SuspiciousActivity.worker_id == worker_id
    ).order_by(SuspiciousActivity.detected_at.desc()).all()

    breakdown = _calculate_fraud_score(worker, db)

    return FraudAnalysisResponse(
        worker_id=worker_id,
        worker_name=worker.name,
        fraud_score=fraud_data.fraud_score if fraud_data else 0.0,
        risk_level=fraud_data.risk_level if fraud_data else "low",
        reason=latest_report.reason if latest_report else None,
        confidence=latest_report.confidence if latest_report else None,
        recommendation=latest_report.recommendation if latest_report else None,
        score_breakdown=breakdown,
        suspicious_activities=[
            SuspiciousActivityResponse(
                id=a.id,
                worker_id=a.worker_id,
                activity_type=a.activity_type,
                description=a.description,
                severity=a.severity,
                metadata_json=a.metadata_json,
                detected_at=a.detected_at,
                created_at=a.created_at,
            ) for a in suspicious
        ],
        report=FraudReportResponse(
            id=latest_report.id,
            worker_id=latest_report.worker_id,
            fraud_score=latest_report.fraud_score,
            risk_level=latest_report.risk_level,
            reason=latest_report.reason,
            confidence=latest_report.confidence,
            recommendation=latest_report.recommendation,
            analysis_details=latest_report.analysis_details,
            triggered_by=latest_report.triggered_by,
            analyzed_at=latest_report.analyzed_at,
            created_at=latest_report.created_at,
        ) if latest_report else None,
        is_disabled=fraud_data.is_disabled if fraud_data else False,
    )


def get_high_risk_workers(
    db: Session,
    min_score: float = 70,
    page: int = 1,
    limit: int = 20,
) -> HighRiskWorkerResponse:
    query = db.query(
        WorkerFraudData, Worker,
        func.count(Complaint.id).label("complaint_count"),
        func.count(SuspiciousActivity.id).label("suspicious_count"),
    ).join(
        Worker, WorkerFraudData.worker_id == Worker.id
    ).outerjoin(
        Complaint, Complaint.worker_id == Worker.id
    ).outerjoin(
        SuspiciousActivity, SuspiciousActivity.worker_id == Worker.id
    ).filter(
        WorkerFraudData.fraud_score >= min_score
    ).group_by(
        WorkerFraudData.id, Worker.id
    ).order_by(
        WorkerFraudData.fraud_score.desc()
    )

    total = query.count()
    offsets = (page - 1) * limit
    rows = query.offset(offsets).limit(limit).all()

    workers = []
    for fraud_data, worker, complaint_count, suspicious_count in rows:
        latest_report = db.query(FraudReport).filter(
            FraudReport.worker_id == worker.id
        ).order_by(FraudReport.created_at.desc()).first()

        workers.append(WorkerFraudSummary(
            worker_id=worker.id,
            worker_name=worker.name,
            worker_avatar=worker.avatar,
            worker_profession=worker.profession,
            fraud_score=fraud_data.fraud_score,
            risk_level=fraud_data.risk_level,
            is_disabled=fraud_data.is_disabled,
            complaint_count=complaint_count,
            suspicious_activity_count=suspicious_count,
            last_analysis=fraud_data.last_analysis_at,
            recommendation=latest_report.recommendation if latest_report else None,
        ))

    return HighRiskWorkerResponse(
        workers=workers,
        total=total,
        page=page,
        limit=limit,
    )


def get_public_fraud_status(worker_id: str, db: Session) -> PublicFraudStatus:
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        return PublicFraudStatus(
            worker_id=worker_id,
            fraud_score=0,
            risk_level="low",
            is_disabled=False,
            recommendation=None,
        )

    _get_or_create_fraud_data(worker_id, db)

    fraud_data = db.query(WorkerFraudData).filter(
        WorkerFraudData.worker_id == worker_id
    ).first()

    latest_report = db.query(FraudReport).filter(
        FraudReport.worker_id == worker_id
    ).order_by(FraudReport.created_at.desc()).first()

    return PublicFraudStatus(
        worker_id=worker_id,
        fraud_score=fraud_data.fraud_score if fraud_data else 0,
        risk_level=fraud_data.risk_level if fraud_data else "low",
        is_disabled=fraud_data.is_disabled if fraud_data else False,
        recommendation=latest_report.recommendation if latest_report else None,
    )


def add_suspicious_activity(
    worker_id: str,
    activity_type: str,
    description: str,
    severity: str = "medium",
    metadata_json: Optional[dict] = None,
    db: Optional[Session] = None,
) -> SuspiciousActivity:
    from app.db.database import SessionLocal
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        activity = SuspiciousActivity(
            id=str(uuid.uuid4()),
            worker_id=worker_id,
            activity_type=activity_type,
            description=description,
            severity=severity,
            metadata_json=metadata_json or {},
            detected_at=_now_str(),
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return activity
    finally:
        if close_db:
            db.close()
