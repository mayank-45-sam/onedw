from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import RequireWorker, get_current_user
from app.models.user import User
from app.models.worker import Worker
from app.schemas.common import SchemaBase
from app.schemas.verification import (
    SkillTestSubmitRequest,
    PracticalSubmitRequest,
    InterviewRespondRequest,
    DocumentsSubmitRequest,
)
from app.core.exceptions import BadRequestException, NotFoundException
from app.repositories.worker_repository import WorkerRepository
from app.services import verification_service as vs

router = APIRouter(prefix="/verification", tags=["Worker Verification"])


# ----------------------------------------------------------
# SCHEMAS
# ----------------------------------------------------------

class StartVerificationRequest(SchemaBase):
    profession: Optional[str] = Field(None, max_length=255)


class SkillTestGenerateRequest(SchemaBase):
    language: Optional[str] = Field(None, max_length=20)


# ----------------------------------------------------------
# HELPERS
# ----------------------------------------------------------

def _get_worker(db: Session, user: User) -> Worker:
    repo = WorkerRepository(db)
    worker = repo.get_by_user_id(user.id)
    if worker is None:
        raise BadRequestException(message="Worker profile not found")
    return worker


def _get_in_progress_verification(db: Session, worker: Worker):
    verification = vs.get_active_verification(db, worker.id)
    if verification is None:
        raise BadRequestException(
            message="No verification in progress. Start verification first."
        )
    return verification


def _get_skill_test(db: Session, verification):
    session = (
        db.query(vs.SkillTestSession)
        .filter(vs.SkillTestSession.verification_id == verification.id)
        .first()
    )
    return session


# ----------------------------------------------------------
# ROUTES
# ----------------------------------------------------------

@router.get("/status", summary="Get current verification status")
def get_verification_status(
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    worker = _get_worker(db, current_user)
    latest = vs.get_latest_verification(db, worker.id)
    active = vs.get_active_verification(db, worker.id)

    profile = {
        "name": worker.name,
        "profession": worker.profession,
        "experience_years": worker.experience_years,
        "aadhaar_verified": worker.aadhaar_verified,
        "certificates_count": len(worker.certificates or []),
        "portfolio_count": len(worker.portfolio_images or []),
    }

    return {
        "success": True,
        "message": "OK",
        "data": {
            "worker": profile,
            "has_active": active is not None,
            "active": vs.serialize_verification(active) if active else None,
            "latest": vs.serialize_verification(latest) if latest else None,
            "retry_available_at": (
                latest.retry_available_at.isoformat()
                if latest and latest.retry_available_at and latest.badge == vs.BADGE_REJECTED
                else None
            ),
        },
    }


@router.post("/start", summary="Start a new verification attempt")
def start_verification(
    body: StartVerificationRequest,
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    worker = _get_worker(db, current_user)
    active = vs.get_active_verification(db, worker.id)
    if active:
        return {
            "success": True,
            "message": "Verification already in progress",
            "data": vs.serialize_verification(active),
        }

    if body.profession:
        worker.profession = body.profession
        db.commit()

    verification = vs.create_verification(db, worker)
    worker.verification_status = "in_progress"
    db.commit()

    return {
        "success": True,
        "message": "Verification started",
        "data": vs.serialize_verification(verification),
    }


@router.post("/documents", summary="Submit profile details and identity documents")
def submit_documents(
    body: DocumentsSubmitRequest,
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    worker = _get_worker(db, current_user)
    verification = _get_in_progress_verification(db, worker)

    from app.core.security import hash_token
    from app.models.certificate import Certificate
    from app.models.portfolio_image import PortfolioImage

    if body.profession and body.profession.strip():
        worker.profession = body.profession.strip()
        verification.profession = worker.profession
    if body.experience_years is not None:
        worker.experience_years = body.experience_years
    if body.aadhaar_number:
        worker.aadhaar_number_hash = hash_token(body.aadhaar_number)
        worker.aadhaar_verified = False

    existing_images = {c.url for c in worker.portfolio_images or []}
    for url in body.work_photos:
        if url and url not in existing_images:
            db.add(PortfolioImage(worker_id=worker.id, url=url))
            existing_images.add(url)

    if body.certificate_images:
        existing_titles = {c.title for c in worker.certificates or []}
        for i, url in enumerate(body.certificate_images):
            if url and url not in [c.image for c in worker.certificates or []]:
                title = f"Verification Certificate {i + 1}"
                db.add(Certificate(
                    worker_id=worker.id,
                    title=title,
                    image=url,
                    issued_at=datetime.now(),
                ))

    document_media = {
        "certificate_images": list(dict.fromkeys(body.certificate_images or [])),
        "work_photos": list(dict.fromkeys(body.work_photos or [])),
        "work_videos": list(dict.fromkeys(body.work_videos or [])),
    }
    verification.document_media = document_media
    verification.step = "skill_test"

    db.commit()
    db.refresh(worker)
    db.refresh(verification)

    return {
        "success": True,
        "message": "Profile and documents saved",
        "data": {
            "verification": vs.serialize_verification(verification),
            "documents_score": vs.compute_documents_score(worker),
            "experience_score": vs.compute_experience_score(worker),
            "aadhaar_verified": worker.aadhaar_verified,
        },
    }


@router.post("/skill-test/generate", summary="Generate AI technical test questions")
def generate_skill_test(
    body: SkillTestGenerateRequest,
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    worker = _get_worker(db, current_user)
    verification = _get_in_progress_verification(db, worker)

    language = body.language if body.language in vs.SUPPORTED_TEST_LANGUAGES else "en"

    session = _get_skill_test(db, verification)
    if session is None:
        session = vs.SkillTestSession(
            verification_id=verification.id,
            worker_id=worker.id,
            profession=verification.profession,
            status="started",
            started_at=datetime.now(),
        )
        db.add(session)
        db.flush()

    stored_language = None
    if session.questions:
        stored_language = (session.questions[0] or {}).get("language", "en")

    if not session.questions or stored_language != language:
        questions = vs.generate_skill_test_questions(verification.profession, language)
        session.questions = questions
        verification.step = "skill_test"
        db.commit()
        db.refresh(session)

    return {
        "success": True,
        "message": "Skill test generated",
        "data": {
            "session_id": session.id,
            "profession": session.profession,
            "language": language,
            "questions": vs.public_questions(session.questions or []),
            "tab_switch_count": session.tab_switch_count,
            "status": session.status,
        },
    }


@router.post("/skill-test/submit", summary="Submit skill test answers with anti-cheat analytics")
def submit_skill_test(
    body: SkillTestSubmitRequest,
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    worker = _get_worker(db, current_user)
    verification = _get_in_progress_verification(db, worker)
    session = _get_skill_test(db, verification)
    if session is None:
        raise BadRequestException(message="No skill test found. Generate the test first.")
    if session.status in ("submitted", "failed"):
        raise BadRequestException(message="Skill test already submitted.")

    answers = [a.model_dump() for a in body.answers]
    anti_cheat = body.anti_cheat.model_dump()

    result = vs.evaluate_skill_test(session, answers, anti_cheat)
    verification.technical_score = result["score"]
    verification.skill_test_anti_cheat = result["analytics"]

    if session.failed:
        verification.status = "failed"
        verification.retry_available_at = datetime.now()
        worker.verification_status = "rejected"
        db.commit()
        return {
            "success": True,
            "message": "Skill test failed due to anti-cheating rules",
            "data": {
                "failed": True,
                "reason": "tab_switch_limit",
                "score": 0.0,
                "analytics": result["analytics"],
            },
        }

    verification.step = "practical"
    db.commit()

    return {
        "success": True,
        "message": "Skill test submitted",
        "data": {
            "score": result["score"],
            "correct_count": result["correct_count"],
            "total": result["total"],
            "analytics": result["analytics"],
            "next_step": "practical",
        },
    }


@router.post("/practical/submit", summary="Submit work media for AI practical assessment")
def submit_practical(
    body: PracticalSubmitRequest,
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    worker = _get_worker(db, current_user)
    verification = _get_in_progress_verification(db, worker)
    if verification.technical_score is None:
        raise BadRequestException(message="Complete the technical test before the practical assessment.")

    media_urls = [m.model_dump() for m in body.media_urls]
    result = vs.evaluate_practical(db, verification, media_urls)
    db.refresh(verification)

    return {
        "success": True,
        "message": "Practical assessment submitted",
        "data": {
            "score": result["score"],
            "evaluation": result["evaluation"],
            "next_step": "interview",
        },
    }


@router.post("/interview/start", summary="Start the AI voice interview")
def start_interview(
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    worker = _get_worker(db, current_user)
    verification = _get_in_progress_verification(db, worker)
    if verification.practical_score is None:
        raise BadRequestException(message="Complete the practical assessment before the interview.")

    result = vs.start_interview(db, verification)
    db.refresh(verification)
    return {
        "success": True,
        "message": "Interview started",
        "data": result,
    }


@router.post("/interview/respond", summary="Answer the interviewer; get the next question")
def respond_interview(
    body: InterviewRespondRequest,
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    worker = _get_worker(db, current_user)
    verification = _get_in_progress_verification(db, worker)
    result = vs.respond_interview(db, verification, body.answer, body.mode)
    db.refresh(verification)
    return {
        "success": True,
        "message": "Interview progress saved",
        "data": result,
    }


@router.post("/interview/transcribe", summary="Transcribe interview voice audio (fallback speech-to-text)")
async def transcribe_interview_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    """Transcribe a voice answer recorded with MediaRecorder (used when the Web Speech API is unavailable)."""
    _get_worker(db, current_user)
    data = await file.read()
    if not data:
        raise BadRequestException(message="Empty audio file")
    mime = file.content_type or "audio/webm"
    text = vs.transcribe_audio(data, mime)
    if not text:
        raise HTTPException(
            status_code=502,
            detail="Speech-to-text is temporarily unavailable. Please type your answer.",
        )
    return {"success": True, "message": "Transcribed", "data": {"text": text}}


@router.post("/complete", summary="Finalise verification: trust score, badge, certificate")
def complete_verification(
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    worker = _get_worker(db, current_user)
    verification = _get_in_progress_verification(db, worker)

    if verification.technical_score is None:
        raise BadRequestException(message="Complete the technical test first.")
    if verification.practical_score is None:
        raise BadRequestException(message="Complete the practical assessment first.")
    if verification.interview_score is None:
        raise BadRequestException(message="Complete the interview first.")

    result = vs.complete_verification(db, verification, worker)
    db.refresh(worker)
    db.refresh(verification)

    return {
        "success": True,
        "message": "Verification complete",
        "data": {
            **result,
            "worker": {
                "verification_status": worker.verification_status,
                "trust_score": worker.trust_score,
                "verification_badge": worker.verification_badge,
                "is_verified": worker.user.is_verified if worker.user else False,
            },
        },
    }


@router.get("/certificate", summary="Get the current worker's verification certificate")
def get_my_certificate(
    current_user: User = Depends(RequireWorker),
    db: Session = Depends(get_db),
):
    worker = _get_worker(db, current_user)
    latest = vs.get_latest_verification(db, worker.id)
    if latest is None or latest.badge in (None, vs.BADGE_REJECTED):
        raise NotFoundException(message="No certificate issued yet")

    certificate = latest.certificate
    if certificate is None:
        raise NotFoundException(message="No certificate issued yet")

    return {
        "success": True,
        "message": "OK",
        "data": {
            "certificate_no": certificate.certificate_no,
            "worker_name": certificate.worker_name,
            "profession": certificate.profession,
            "trust_score": certificate.trust_score,
            "badge": certificate.badge,
            "issued_at": certificate.issued_at.isoformat() if certificate.issued_at else None,
            "qr_code_url": certificate.qr_code_url,
            "pdf_url": certificate.pdf_url,
            "is_active": certificate.is_active,
        },
    }


@router.get("/verify/{certificate_no}", summary="Public certificate verification")
def verify_certificate(certificate_no: str, db: Session = Depends(get_db)):
    cert = (
        db.query(vs.VerificationCertificate)
        .filter(vs.VerificationCertificate.certificate_no == certificate_no)
        .first()
    )
    if cert is None:
        raise NotFoundException(message="Certificate not found")

    return {
        "success": True,
        "message": "OK",
        "data": {
            "valid": cert.is_active,
            "certificate_no": cert.certificate_no,
            "worker_name": cert.worker_name,
            "profession": cert.profession,
            "trust_score": cert.trust_score,
            "badge": cert.badge,
            "issued_at": cert.issued_at.isoformat() if cert.issued_at else None,
        },
    }
