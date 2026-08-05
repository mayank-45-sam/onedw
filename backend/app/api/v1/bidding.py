from typing import List
from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import RequireCustomer, get_current_user
from app.models.user import User, UserRole
from app.models.notification import Notification
from app.models.bidding import JobBid
from app.core.socketio import emit_to_user
from app.schemas.bidding import (
    CustomJobCreateRequest,
    CustomJobResponse,
    JobBidCreateRequest,
    JobBidResponse,
    NegotiationMessageCreateRequest,
    NegotiationMessageResponse,
)
from app.services.bidding_service import BiddingService

router = APIRouter(prefix="/bidding", tags=["Bidding Marketplace"])


def _notify_job_bidders(db: Session, job: dict, msg: dict) -> int:
    """Notify every worker who bid on a job that the customer sent a message.

    Used for counter offers with a proposed price. Creates a notification and
    pushes it to the worker's room in real time.
    """
    bids = db.query(JobBid).filter(JobBid.job_id == job["id"]).all()
    notified = 0

    for bid in bids:
        worker_user_id = bid.worker.user_id if bid.worker else None
        if not worker_user_id:
            continue
        notified += 1

        if msg.get("proposed_price") is not None:
            title = f"Counter offer on \"{job['title']}\""
            body = f"New price: ₹{msg['proposed_price']}"
            if msg.get("message"):
                body += f" — {msg['message']}"
        else:
            title = f"New message on \"{job['title']}\""
            body = msg.get("message") or "Customer sent you a message"

        notification = Notification(
            user_id=worker_user_id,
            title=title,
            body=body,
            type="bidding",
            data={"job": job, "message": msg},
        )
        db.add(notification)
        db.flush()

        emit_to_user(worker_user_id, "bidding:message", {"job": job, "message": msg})
        emit_to_user(
            worker_user_id,
            "notification:new",
            {
                "notification": {
                    "id": notification.id,
                    "title": notification.title,
                    "body": notification.body,
                    "type": notification.type,
                    "read": notification.read,
                    "data": notification.data,
                }
            },
        )

    db.commit()
    return notified


def _notify_workers(db: Session, payload: dict) -> int:
    """Create a notification for every active worker and push it in real time.

    Returns the number of workers notified.
    """
    workers = (
        db.query(User)
        .filter(User.role == UserRole.WORKER, User.is_active == True)
        .all()
    )

    for worker in workers:
        notification = Notification(
            user_id=worker.id,
            title="New custom job posted",
            body=(
                f"{payload['title']} — Budget ₹{payload['budget_min']}–₹{payload['budget_max']} "
                f"({payload.get('urgency') or 'flexible'})"
            ),
            type="bidding",
            data={"job": payload},
        )
        db.add(notification)
        db.flush()

        emit_to_user(worker.id, "bidding:new-job", {"job": payload})
        emit_to_user(
            worker.id,
            "notification:new",
            {
                "notification": {
                    "id": notification.id,
                    "title": notification.title,
                    "body": notification.body,
                    "type": notification.type,
                    "read": notification.read,
                    "data": notification.data,
                }
            },
        )

    db.commit()
    return len(workers)


@router.post("/jobs", response_model=CustomJobResponse, status_code=201)
def post_custom_job(
    body: CustomJobCreateRequest,
    current_user=Depends(RequireCustomer),
    db: Session = Depends(get_db),
):
    """Create a custom bidding request. Customer-only. Notifies all workers."""
    service = BiddingService(db)
    job = service.create_job(
        user_id=current_user.id,
        category_id=body.category_id,
        title=body.title,
        description=body.description,
        budget_min=body.budget_min,
        budget_max=body.budget_max,
        urgency=body.urgency,
        preferred_time=body.preferred_time,
        images=body.images,
    )
    _notify_workers(db, service.notification_payload(job))
    return service.serialize_job(job)


@router.get("/jobs/user/{user_id}", response_model=List[CustomJobResponse])
def get_user_custom_jobs(
    user_id: str = Path(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch all custom job requests for a specific user. Requires authentication."""
    if current_user.id != user_id and current_user.role.value != "admin":
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException(message="You can only view your own custom jobs")
    service = BiddingService(db)
    jobs = service.get_user_jobs(user_id)
    return [service.serialize_job(j) for j in jobs]


@router.get("/jobs/open")
def get_open_jobs(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all custom jobs still open for bidding (workers browse & bid here)."""
    service = BiddingService(db)
    worker_id = (
        current_user.worker_profile.id if current_user.role.value == "worker" else None
    )
    return service.list_open_jobs(worker_id=worker_id)


@router.get("/jobs/{job_id}", response_model=CustomJobResponse)
def get_custom_job(
    job_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single custom job by ID."""
    service = BiddingService(db)
    job = service.get_job(job_id)
    if job.user_id != current_user.id and current_user.role.value != "admin":
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException(message="Access denied to this job")
    return service.serialize_job(job)


@router.post("/jobs/{job_id}/bids", response_model=JobBidResponse, status_code=201)
def submit_bid(
    body: JobBidCreateRequest,
    job_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a price bid for a custom job. Worker-only."""
    if current_user.role.value != "worker":
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException(message="Only workers can submit bids")
    service = BiddingService(db)
    bid = service.create_bid(
        job_id=job_id,
        worker_id=current_user.worker_profile.id,
        bid_amount=body.bid_amount,
        message=body.message,
        estimated_time=body.estimated_time,
    )
    return service.serialize_bid(bid)


@router.get("/jobs/{job_id}/bids", response_model=List[JobBidResponse])
def get_job_bids(
    job_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch all bids for a specific custom job."""
    service = BiddingService(db)
    job = service.get_job(job_id)
    if job.user_id != current_user.id and current_user.role.value != "admin":
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException(message="Access denied to this job's bids")
    bids = service.get_job_bids(job_id)
    return [service.serialize_bid(b) for b in bids]


@router.post("/bids/{bid_id}/accept")
def accept_bid(
    bid_id: str,
    current_user=Depends(RequireCustomer),
    db: Session = Depends(get_db),
):
    """Accept a submitted bid, converting the accepted bid into a confirmed job booking."""
    service = BiddingService(db)
    return service.accept_bid(bid_id, current_user)


@router.get("/jobs/{job_id}/messages", response_model=List[NegotiationMessageResponse])
def get_job_messages(
    job_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch negotiation messages for a specific custom job."""
    service = BiddingService(db)
    job = service.get_job(job_id)
    if job.user_id != current_user.id and current_user.role.value != "admin":
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException(message="Access denied to this job's messages")
    messages = service.get_job_messages(job_id)
    return [m.to_dict() for m in messages]


@router.post("/jobs/{job_id}/messages", response_model=NegotiationMessageResponse, status_code=201)
def send_negotiation_message(
    body: NegotiationMessageCreateRequest,
    job_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a negotiation message with optional proposed price for a specific custom job."""
    service = BiddingService(db)
    job = service.get_job(job_id)
    if job.user_id != current_user.id and current_user.role.value != "admin":
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException(message="Access denied to this job's messages")
    msg = service.add_negotiation_message(
        job_id=job_id,
        sender_id=current_user.id,
        message=body.message,
        proposed_price=body.proposed_price,
    )
    _notify_job_bidders(db, service.notification_payload(job), service.message_payload(msg))
    return msg.to_dict()
