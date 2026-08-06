"""Async Fraud service — Beanie version."""
from __future__ import annotations

import json as json_module
import uuid
from datetime import datetime, timezone
from typing import Optional

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


async def _calculate_fraud_score(worker: Worker) -> FraudScoreBreakdown:
    breakdown = FraudScoreBreakdown()

    # 1. Fake reviews score
    if worker.review_count > 0 and worker.completed_jobs > 0:
        review_to_job_ratio = worker.review_count / max(worker.completed_jobs, 1)
        if review_to_job_ratio > 0.8 and worker.rating > 4.5 and worker.completed_jobs < 20:
            breakdown.fake_reviews_score = min(100, (review_to_job_ratio - 0.5) * 100)
        reviews = await Review.find(Review.worker_id == worker.id).to_list()
        if reviews:
            high_rating_count = sum(1 for r in reviews if r.rating >= 4.5)
            if len(reviews) >= 3 and high_rating_count == len(reviews):
                breakdown.fake_reviews_score = max(breakdown.fake_reviews_score, 60)

    # 2. Cancellation score
    all_bookings = await Booking.find(Booking.worker_id == worker.id).to_list()
    total_bookings = len(all_bookings)
    if total_bookings > 0:
        cancelled = sum(1 for b in all_bookings if b.status == BookingStatus.CANCELLED or
                        (hasattr(b.status, 'value') and b.status.value == BookingStatus.CANCELLED.value))
        cancel_rate = (cancelled / total_bookings) * 100
        if cancel_rate > 10:
            breakdown.cancellation_score = min(100, cancel_rate * 2)
        if cancel_rate > 50:
            breakdown.cancellation_score = 100

    # 3. Price change score
    prices = [b.price for b in all_bookings if b.price and b.price > 0]
    if len(prices) >= 2:
        min_p, max_p = min(prices), max(prices)
        if min_p > 0:
            change_pct = ((max_p - min_p) / min_p) * 100
            if change_pct > 50:
                breakdown.price_change_score = min(100, change_pct)
            if change_pct > 200:
                breakdown.price_change_score = 100

    # 4. Complaint score
    complaints = await Complaint.find(Complaint.worker_id == worker.id).to_list()
    complaint_count = len(complaints)
    if complaint_count > 0:
        breakdown.complaint_score = min(100, complaint_count * 25)
    if complaint_count >= 4:
        breakdown.complaint_score = 100

    # 5. Suspicious login
    suspicious_logins = await SuspiciousActivity.find(
        SuspiciousActivity.worker_id == worker.id,
        SuspiciousActivity.activity_type == "suspicious_login",
    ).to_list()
    if suspicious_logins:
        breakdown.suspicious_login_score = min(100, len(suspicious_logins) * 30)

    # 6. Duplicate phone
    dup_phones = await SuspiciousActivity.find(
        SuspiciousActivity.worker_id == worker.id,
        SuspiciousActivity.activity_type == "duplicate_phone",
    ).to_list()
    if dup_phones:
        breakdown.duplicate_phone_score = min(100, len(dup_phones) * 40)

    # 7. Duplicate device
    dup_devices = await SuspiciousActivity.find(
        SuspiciousActivity.worker_id == worker.id,
        SuspiciousActivity.activity_type == "duplicate_device",
    ).to_list()
    if dup_devices:
        breakdown.duplicate_device_score = min(100, len(dup_devices) * 40)

    # 8. Fake profile
    fake_profiles = await SuspiciousActivity.find(
        SuspiciousActivity.worker_id == worker.id,
        SuspiciousActivity.activity_type == "fake_profile",
    ).to_list()
    if fake_profiles:
        breakdown.fake_profile_score = min(100, len(fake_profiles) * 50)

    return breakdown


def _calculate_total_score(breakdown: FraudScoreBreakdown) -> float:
    weights = {
        "fake_reviews_score": 0.15, "cancellation_score": 0.20,
        "price_change_score": 0.10, "complaint_score": 0.20,
        "suspicious_login_score": 0.10, "duplicate_phone_score": 0.10,
        "duplicate_device_score": 0.10, "fake_profile_score": 0.05,
    }
    total = sum(getattr(breakdown, f, 0.0) * w for f, w in weights.items())
    return round(min(100, total), 1)


def _get_risk_level(score: float) -> str:
    if score >= 80:
        return "critical" if score >= 95 else "high"
    if score >= 50:
        return "medium"
    return "low"


async def _analyze_with_ai(worker: Worker, heuristic_score: float) -> dict:
    if not settings.AI_API_KEY:
        return {
            "risk_level": _get_risk_level(heuristic_score),
            "reason": "AI service not configured. Using heuristic analysis.",
            "confidence": 0, "recommendation": "monitor",
        }

    all_bookings = await Booking.find(Booking.worker_id == worker.id).to_list()
    total_bookings = len(all_bookings)
    cancelled = sum(1 for b in all_bookings if b.status == BookingStatus.CANCELLED or
                    (hasattr(b.status, 'value') and b.status.value == BookingStatus.CANCELLED.value))
    cancel_rate = round((cancelled / max(total_bookings, 1)) * 100, 1)
    complaints = await Complaint.find(Complaint.worker_id == worker.id).to_list()
    suspicious = await SuspiciousActivity.find(SuspiciousActivity.worker_id == worker.id).to_list()

    prices = [b.price for b in all_bookings if b.price and b.price > 0]
    price_change_pct = 0
    if len(prices) >= 2:
        min_p, max_p = min(prices), max(prices)
        if min_p > 0:
            price_change_pct = round(((max_p - min_p) / min_p) * 100, 1)

    prompt = FRAUD_ANALYSIS_PROMPT.format(
        worker_name=worker.name, profession=worker.profession,
        experience_years=worker.experience_years, rating=worker.rating,
        review_count=worker.review_count, completed_jobs=worker.completed_jobs,
        hourly_rate=worker.hourly_rate, cancel_rate=cancel_rate,
        complaint_count=len(complaints), price_change_pct=price_change_pct,
        suspicious_count=len(suspicious),
    )

    headers = {"Authorization": f"Bearer {settings.AI_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Analyze worker {worker.name} ({worker.id}) for fraud risk."},
        ],
        "max_tokens": 512, "temperature": 0.3,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_API_BASE_URL}/chat/completions", json=payload, headers=headers,
            )
            if response.status_code != 200:
                logger.error(f"Fraud AI API error {response.status_code}")
                return {"risk_level": _get_risk_level(heuristic_score), "reason": "AI unavailable.", "confidence": 0, "recommendation": "monitor"}

            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            stripped = content.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            try:
                parsed = json_module.loads(stripped)
                if {"risk_level", "reason", "confidence", "recommendation"}.issubset(parsed.keys()):
                    return parsed
            except (json_module.JSONDecodeError, ValueError):
                pass
            return {"risk_level": _get_risk_level(heuristic_score), "reason": "AI invalid response.", "confidence": 0, "recommendation": "monitor"}
    except Exception as e:
        logger.error(f"Fraud AI analysis error: {e}")
        return {"risk_level": _get_risk_level(heuristic_score), "reason": "AI failed.", "confidence": 0, "recommendation": "monitor"}


async def _get_or_create_fraud_data(worker_id: str) -> WorkerFraudData:
    data = await WorkerFraudData.find_one(WorkerFraudData.worker_id == worker_id)
    if not data:
        data = WorkerFraudData(worker_id=worker_id, fraud_score=0.0, is_disabled=False, risk_level="low")
        await data.insert()
    return data


async def analyze_worker(worker_id: str, trigger_reason: Optional[str] = None) -> FraudAnalysisResponse:
    worker = await Worker.find_one(Worker.id == worker_id)
    if not worker:
        raise ValueError(f"Worker {worker_id} not found")

    breakdown = await _calculate_fraud_score(worker)
    heuristic_score = _calculate_total_score(breakdown)
    ai_result = await _analyze_with_ai(worker, heuristic_score)

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
        worker_id=worker_id, fraud_score=final_score, risk_level=risk_level,
        reason=reason, confidence=confidence, recommendation=recommendation,
        analysis_details={"score_breakdown": breakdown.model_dump(), "ai_raw": ai_result, "heuristic_score": heuristic_score},
        triggered_by=trigger_reason or "manual", analyzed_at=now,
    )
    await fraud_report.insert()

    fraud_data = await _get_or_create_fraud_data(worker_id)
    fraud_data.fraud_score = final_score
    fraud_data.risk_level = risk_level
    fraud_data.is_disabled = is_disabled
    fraud_data.last_analysis_at = now
    await fraud_data.save()

    if final_score >= 95:
        worker.is_online = False
        await worker.save()

    suspicious = await SuspiciousActivity.find(SuspiciousActivity.worker_id == worker_id).to_list()

    return FraudAnalysisResponse(
        worker_id=worker_id, worker_name=worker.name,
        fraud_score=final_score, risk_level=risk_level, reason=reason,
        confidence=confidence, recommendation=recommendation, score_breakdown=breakdown,
        suspicious_activities=[
            SuspiciousActivityResponse(
                id=a.id, worker_id=a.worker_id, activity_type=a.activity_type,
                description=a.description, severity=a.severity,
                metadata_json=a.metadata_json, detected_at=a.detected_at, created_at=a.created_at,
            ) for a in suspicious
        ],
        report=FraudReportResponse(
            id=fraud_report.id, worker_id=fraud_report.worker_id, fraud_score=fraud_report.fraud_score,
            risk_level=fraud_report.risk_level, reason=fraud_report.reason, confidence=fraud_report.confidence,
            recommendation=fraud_report.recommendation, analysis_details=fraud_report.analysis_details,
            triggered_by=fraud_report.triggered_by, analyzed_at=fraud_report.analyzed_at, created_at=fraud_report.created_at,
        ),
        is_disabled=is_disabled,
    )


async def get_fraud_report(worker_id: str) -> Optional[FraudAnalysisResponse]:
    worker = await Worker.find_one(Worker.id == worker_id)
    if not worker:
        return None

    fraud_data = await WorkerFraudData.find_one(WorkerFraudData.worker_id == worker_id)
    all_reports = await FraudReport.find(FraudReport.worker_id == worker_id).to_list()
    latest_report = max(all_reports, key=lambda r: r.created_at or datetime.min) if all_reports else None
    suspicious = await SuspiciousActivity.find(SuspiciousActivity.worker_id == worker_id).to_list()
    breakdown = await _calculate_fraud_score(worker)

    return FraudAnalysisResponse(
        worker_id=worker_id, worker_name=worker.name,
        fraud_score=fraud_data.fraud_score if fraud_data else 0.0,
        risk_level=fraud_data.risk_level if fraud_data else "low",
        reason=latest_report.reason if latest_report else None,
        confidence=latest_report.confidence if latest_report else None,
        recommendation=latest_report.recommendation if latest_report else None,
        score_breakdown=breakdown,
        suspicious_activities=[
            SuspiciousActivityResponse(
                id=a.id, worker_id=a.worker_id, activity_type=a.activity_type,
                description=a.description, severity=a.severity,
                metadata_json=a.metadata_json, detected_at=a.detected_at, created_at=a.created_at,
            ) for a in suspicious
        ],
        report=FraudReportResponse(
            id=latest_report.id, worker_id=latest_report.worker_id, fraud_score=latest_report.fraud_score,
            risk_level=latest_report.risk_level, reason=latest_report.reason, confidence=latest_report.confidence,
            recommendation=latest_report.recommendation, analysis_details=latest_report.analysis_details,
            triggered_by=latest_report.triggered_by, analyzed_at=latest_report.analyzed_at, created_at=latest_report.created_at,
        ) if latest_report else None,
        is_disabled=fraud_data.is_disabled if fraud_data else False,
    )


async def get_high_risk_workers(min_score: float = 70, page: int = 1, limit: int = 20) -> HighRiskWorkerResponse:
    all_fd = await WorkerFraudData.find(WorkerFraudData.fraud_score >= min_score).to_list()
    all_fd.sort(key=lambda x: x.fraud_score, reverse=True)
    total = len(all_fd)
    paged = all_fd[(page - 1) * limit: page * limit]

    workers_out = []
    for fd in paged:
        worker = await Worker.find_one(Worker.id == fd.worker_id)
        if not worker:
            continue
        complaints = await Complaint.find(Complaint.worker_id == worker.id).to_list()
        suspicious = await SuspiciousActivity.find(SuspiciousActivity.worker_id == worker.id).to_list()
        all_reports = await FraudReport.find(FraudReport.worker_id == worker.id).to_list()
        latest_report = max(all_reports, key=lambda r: r.created_at or datetime.min) if all_reports else None
        workers_out.append(WorkerFraudSummary(
            worker_id=worker.id, worker_name=worker.name, worker_avatar=worker.avatar,
            worker_profession=worker.profession, fraud_score=fd.fraud_score,
            risk_level=fd.risk_level, is_disabled=fd.is_disabled,
            complaint_count=len(complaints), suspicious_activity_count=len(suspicious),
            last_analysis=fd.last_analysis_at,
            recommendation=latest_report.recommendation if latest_report else None,
        ))

    return HighRiskWorkerResponse(workers=workers_out, total=total, page=page, limit=limit)


async def get_public_fraud_status(worker_id: str) -> PublicFraudStatus:
    worker = await Worker.find_one(Worker.id == worker_id)
    if not worker:
        return PublicFraudStatus(worker_id=worker_id, fraud_score=0, risk_level="low", is_disabled=False, recommendation=None)

    await _get_or_create_fraud_data(worker_id)
    fraud_data = await WorkerFraudData.find_one(WorkerFraudData.worker_id == worker_id)
    all_reports = await FraudReport.find(FraudReport.worker_id == worker_id).to_list()
    latest_report = max(all_reports, key=lambda r: r.created_at or datetime.min) if all_reports else None

    return PublicFraudStatus(
        worker_id=worker_id,
        fraud_score=fraud_data.fraud_score if fraud_data else 0,
        risk_level=fraud_data.risk_level if fraud_data else "low",
        is_disabled=fraud_data.is_disabled if fraud_data else False,
        recommendation=latest_report.recommendation if latest_report else None,
    )


async def add_suspicious_activity(
    worker_id: str,
    activity_type: str,
    description: str,
    severity: str = "medium",
    metadata_json: Optional[dict] = None,
) -> SuspiciousActivity:
    activity = SuspiciousActivity(
        worker_id=worker_id, activity_type=activity_type,
        description=description, severity=severity,
        metadata_json=metadata_json or {}, detected_at=_now_str(),
    )
    await activity.insert()
    return activity
