"""Demo Mode seed for the worker verification feature.

Loads sample verified workers with completed assessments, AI reports,
certificates and trust scores for hackathon/demo purposes.

Idempotent: safe to run multiple times (updates existing demo records).
Does not touch production workers — only the @demo.com accounts.
"""

import random
from datetime import datetime, timedelta, timezone
from loguru import logger

from app.services import verification_service as vs
from app.core.exceptions import BadRequestException


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


DEMO_PROFILES = [
    {
        "name": "Ravi Kumar",
        "profession": "Plumber",
        "technical": 94.0,
        "practical": 92.0,
        "interview": 88.0,
        "badge": "gold",
        "trust": 93.0,
        "tab_switches": 0,
        "warnings": 0,
        "skipped": 0,
        "suspicious": [],
    },
    {
        "name": "Suresh Reddy",
        "profession": "Electrician",
        "technical": 86.0,
        "practical": 80.0,
        "interview": 78.0,
        "badge": "pro",
        "trust": 82.0,
        "tab_switches": 0,
        "warnings": 1,
        "skipped": 0,
        "suspicious": [],
    },
    {
        "name": "Priya Sharma",
        "profession": "Cleaner",
        "technical": 74.0,
        "practical": 70.0,
        "interview": 66.0,
        "badge": "beginner",
        "trust": 68.0,
        "tab_switches": 1,
        "warnings": 1,
        "skipped": 1,
        "suspicious": [],
    },
    {
        "name": "Arjun Nair",
        "profession": "AC Tech",
        "technical": 58.0,
        "practical": 50.0,
        "interview": 44.0,
        "badge": "rejected",
        "trust": 45.0,
        "tab_switches": 2,
        "warnings": 2,
        "skipped": 2,
        "suspicious": [{"question_id": "q3", "time_taken": 1.2, "detail": "answered in under 2s"}],
    },
]

DEMO_MEDIA = [
    {"url": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop&q=80", "type": "image"},
    {"url": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop&q=80", "type": "image"},
]


def _build_demo_evaluation(score: float, profession: str, ok: bool) -> dict:
    base = max(0.0, min(100.0, score))
    return {
        "work_quality": base,
        "tool_usage": max(0.0, base - 2),
        "safety_equipment": base - 4 if ok else base - 12,
        "professional_finish": base - 3 if ok else base - 10,
        "fake_image_detection": "No signs of manipulation detected." if ok else "Some images appear inconsistent with real work photos.",
        "fake_video_detection": "No signs of manipulation detected." if ok else "Video appears repurposed from another source.",
        "fraud_risk": "low" if ok else "high",
        "notes": f"Solid {profession} work with good finish and safety awareness." if ok else "Work quality below acceptable standard for the platform.",
        "overall_score": base,
    }


def _build_demo_interview(profession: str, score: float, ok: bool) -> dict:
    exchanges = [
        {"ai_question": f"Tell me about your experience working as a {profession}.", "worker_answer": f"I have been working as a {profession} for over 4 years. I handle residential jobs including installation, repair and maintenance for clients across Bangalore.", "mode": "text"},
        {"ai_question": "What safety precautions do you take on every job?", "worker_answer": "I always switch off the mains, use insulated tools and gloves, and check the area before starting. I also keep the work area tidy and safe for the customer.", "mode": "text"},
        {"ai_question": "How do you handle a difficult repair you have never done before?", "worker_answer": "I assess the problem step by step, refer to my training and manuals, and if I am not confident I honestly tell the customer and suggest an expert. I never compromise on safety.", "mode": "text"},
        {"ai_question": "A customer says your previous job leaked again after 2 days. What do you do?", "worker_answer": "I would visit again, apologise for the inconvenience, re-inspect the joint and fix it free of cost. Customer trust is more important than the cost of one revisit.", "mode": "text"},
    ]
    evaluation = {
        "communication": score,
        "confidence": score - 2,
        "technical_knowledge": score - 1 if ok else score - 10,
        "logical_thinking": score - 3,
        "problem_solving": score - 2,
        "overall_score": score,
        "summary": "Clear communication with good technical knowledge and professional attitude." if ok else "Weak technical depth and hesitant answers.",
        "recommendation": "hire" if ok else "reject",
    }
    return exchanges, evaluation


def _build_demo_skill_test(profession: str, score: float) -> list:
    """Build a plausible answered question set matching the given score."""
    questions = vs._sample_local_questions(profession, count=10)
    answers = []
    correct_fraction = score / 100.0
    for i, q in enumerate(questions):
        qtype = q.get("type")
        base_time = q.get("time_limit", 20)
        time_taken = round(base_time * random.uniform(0.55, 0.9), 1)
        if qtype in ("mcq", "image", "scenario"):
            options_count = len(q.get("options") or [])
            correct = q.get("correct_index")
            if correct is None or correct >= options_count:
                correct = 0
            is_correct = random.random() < correct_fraction
            selected = correct if is_correct else (correct + 1) % options_count
            answers.append({
                "question_id": q["id"],
                "selected_option": selected,
                "answer": None,
                "skipped": False,
                "time_taken": time_taken,
            })
        else:
            answers.append({
                "question_id": q["id"],
                "selected_option": None,
                "answer": "I would first switch off the supply, inspect the components, use the right tools and verify the repair before finishing. Safety is always my first priority on any job.",
                "skipped": False,
                "time_taken": round(time_taken * 1.4, 1),
            })
    return questions, answers


def seed_demo_verifications(db) -> dict:
    """Create/update demo verification data for the @demo.com workers."""
    from app.models.worker import Worker
    from app.models.verification import (
        WorkerVerification,
        SkillTestSession,
        PracticalAssessment,
        VoiceInterview,
    )

    created = 0
    updated = 0
    now = _utcnow()

    for profile in DEMO_PROFILES:
        worker = db.query(Worker).filter(Worker.name == profile["name"]).first()
        if worker is None:
            continue

        existing = (
            db.query(WorkerVerification)
            .filter(WorkerVerification.worker_id == worker.id, WorkerVerification.is_demo == True)
            .order_by(WorkerVerification.created_at.desc())
            .first()
        )
        if existing:
            verification = existing
            updated += 1
            db.query(SkillTestSession).filter(SkillTestSession.verification_id == verification.id).delete()
            db.query(PracticalAssessment).filter(PracticalAssessment.verification_id == verification.id).delete()
            db.query(VoiceInterview).filter(VoiceInterview.verification_id == verification.id).delete()
            db.query(vs.VerificationCertificate).filter(vs.VerificationCertificate.verification_id == verification.id).delete()
        else:
            verification = WorkerVerification(
                worker_id=worker.id,
                attempt_number=1,
                profession=profile["profession"],
                status="completed",
                step="completed",
                admin_status="approved" if profile["badge"] != "rejected" else "rejected",
                is_demo=True,
                started_at=now - timedelta(days=2),
            )
            db.add(verification)
            db.flush()
            created += 1

        verification.profession = profile["profession"]
        verification.technical_score = profile["technical"]
        verification.practical_score = profile["practical"]
        verification.interview_score = profile["interview"]
        verification.documents_score = 85.0
        verification.experience_score = 70.0
        verification.trust_score = profile["trust"]
        verification.badge = profile["badge"]
        verification.status = "completed"
        verification.step = "completed"
        verification.submitted_at = now - timedelta(hours=20)
        verification.admin_status = "approved" if profile["badge"] != "rejected" else "rejected"
        verification.admin_notes = "Demo data for hackathon demonstration. Approved by AI + manual review." if profile["badge"] != "rejected" else "Demo data. Rejected: trust score below 60."
        verification.skill_test_anti_cheat = {
            "tab_switch_count": profile["tab_switches"],
            "warnings_issued": profile["warnings"],
            "skipped_count": profile["skipped"],
            "suspicious_fast_answers": profile["suspicious"],
            "failed": False,
        }
        verification.training_recommendations = (
            vs.generate_training_recommendations(verification)
            if profile["badge"] == "rejected"
            else [
                {"title": "Advanced Trade Certification", "description": "Pursue an advanced certification to move to the Gold tier."},
                {"title": "Customer Communication", "description": "Keep sharpening clear and professional customer communication."},
            ]
        )
        verification.retry_available_at = (
            now + timedelta(days=7) if profile["badge"] == "rejected" else None
        )
        verification.document_media = {
            "certificate_images": [],
            "work_photos": [],
            "work_videos": [],
        }

        # skill test
        questions, answers = _build_demo_skill_test(profile["profession"], profile["technical"])
        db.add(SkillTestSession(
            verification_id=verification.id,
            worker_id=worker.id,
            profession=profile["profession"],
            status="submitted",
            questions=questions,
            answers=answers,
            score=profile["technical"],
            tab_switch_count=profile["tab_switches"],
            warnings_issued=profile["warnings"],
            skipped_count=profile["skipped"],
            suspicious_fast_answers=profile["suspicious"],
            time_per_question=[{"question_id": q["id"], "time_taken": 18.0} for q in questions[:5]],
            failed=False,
            started_at=now - timedelta(days=2),
            submitted_at=now - timedelta(days=1),
        ))

        # practical
        ok = profile["badge"] != "rejected"
        db.add(PracticalAssessment(
            verification_id=verification.id,
            worker_id=worker.id,
            media_urls=DEMO_MEDIA,
            evaluation=_build_demo_evaluation(profile["practical"], profile["profession"], ok),
            score=profile["practical"],
            status="submitted",
            submitted_at=now - timedelta(hours=22),
        ))

        # interview
        exchanges, evaluation = _build_demo_interview(profile["profession"], profile["interview"], ok)
        db.add(VoiceInterview(
            verification_id=verification.id,
            worker_id=worker.id,
            profession=profile["profession"],
            exchanges=exchanges,
            evaluation=evaluation,
            score=profile["interview"],
            status="completed",
            started_at=now - timedelta(days=1),
            submitted_at=now - timedelta(hours=20),
        ))

        worker.verification_status = "completed" if ok else "rejected"
        worker.trust_score = profile["trust"]
        worker.verification_badge = profile["badge"]

        # certificate for non-rejected workers
        if profile["badge"] != "rejected":
            try:
                vs.generate_certificate(db, verification, worker)
            except Exception as e:
                logger.warning(f"Demo certificate generation failed for {worker.name}: {e}")

        db.flush()

    db.commit()
    logger.info(f"Demo verification seed: {created} created, {updated} updated")
    return {"created": created, "updated": updated, "total": len(DEMO_PROFILES)}
