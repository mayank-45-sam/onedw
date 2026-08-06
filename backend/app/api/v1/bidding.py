"""Bidding API — async Beanie version."""
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, Path

from app.dependencies.auth import RequireCustomer, get_current_user
from app.models.user import User, UserRole
from app.models.notification import Notification
from app.models.bidding import JobBid
from app.models.worker import Worker
from app.core.socketio import emit_to_user
from app.core.exceptions import ForbiddenException
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


async def _notify_job_bidders(job: dict, msg: dict) -> int:
    """Notify every worker who bid on a job of a new negotiation message."""
    bids = await JobBid.find(JobBid.job_id == job["id"]).to_list()
    notified = 0
    for bid in bids:
        worker = await Worker.find_one(Worker.id == bid.worker_id) if bid.worker_id else None
        worker_user_id = worker.user_id if worker else None
        if not worker_user_id:
            continue
        notified += 1
        if msg.get("proposed_price") is not None:
            title = f"Counter offer on \"{job['title']}\""
            body_text = f"New price: ₹{msg['proposed_price']}"
            if msg.get("message"):
                body_text += f" — {msg['message']}"
        else:
            title = f"New message on \"{job['title']}\""
            body_text = msg.get("message") or "Customer sent you a message"

        notification = Notification(
            user_id=worker_user_id, title=title, body=body_text,
            type="bidding", data={"job": job, "message": msg},
        )
        await notification.insert()
        emit_to_user(worker_user_id, "bidding:message", {"job": job, "message": msg})
        emit_to_user(worker_user_id, "notification:new", {
            "notification": {"id": notification.id, "title": notification.title,
                             "body": notification.body, "type": notification.type,
                             "read": getattr(notification, "read", False), "data": notification.data}
        })
    return notified


async def _notify_workers(payload: dict) -> int:
    """Create a notification for every active worker about a new job."""
    workers = await User.find(User.role == UserRole.WORKER, User.is_active == True).to_list()
    for worker in workers:
        notification = Notification(
            user_id=worker.id, title="New custom job posted",
            body=(f"{payload['title']} — Budget ₹{payload['budget_min']}–₹{payload['budget_max']} "
                  f"({payload.get('urgency') or 'flexible'})"),
            type="bidding", data={"job": payload},
        )
        await notification.insert()
        emit_to_user(worker.id, "bidding:new-job", {"job": payload})
        emit_to_user(worker.id, "notification:new", {
            "notification": {"id": notification.id, "title": notification.title,
                             "body": notification.body, "type": notification.type,
                             "read": getattr(notification, "read", False), "data": notification.data}
        })
    return len(workers)


@router.post("/jobs", response_model=CustomJobResponse, status_code=201)
async def post_custom_job(
    body: CustomJobCreateRequest,
    current_user: User = Depends(RequireCustomer),
):
    """Create a custom bidding request. Customer-only. Notifies all workers."""
    service = BiddingService()
    job = await service.create_job(
        user_id=current_user.id, category_id=body.category_id, title=body.title,
        description=body.description, budget_min=body.budget_min, budget_max=body.budget_max,
        urgency=body.urgency, preferred_time=body.preferred_time, images=body.images,
    )
    await _notify_workers(service.serialize_job(job))
    return service.serialize_job(job)


@router.get("/jobs/user/{user_id}", response_model=List[CustomJobResponse])
async def get_user_custom_jobs(
    user_id: str = Path(...),
    current_user: User = Depends(get_current_user),
):
    """Fetch all custom job requests for a specific user."""
    if current_user.id != user_id and current_user.role.value != "admin":
        raise ForbiddenException(message="You can only view your own custom jobs")
    service = BiddingService()
    jobs = await service.get_user_jobs(user_id)
    return [service.serialize_job(j) for j in jobs]


@router.get("/jobs/open")
async def get_open_jobs(current_user: User = Depends(get_current_user)):
    """List all custom jobs still open for bidding."""
    service = BiddingService()
    worker_id = None
    if current_user.role.value == "worker":
        w = await Worker.find_one(Worker.user_id == current_user.id)
        worker_id = w.id if w else None
    return await service.list_open_jobs(worker_id=worker_id)


@router.get("/jobs/{job_id}", response_model=CustomJobResponse)
async def get_custom_job(job_id: str, current_user: User = Depends(get_current_user)):
    """Get a single custom job by ID."""
    service = BiddingService()
    job = await service.get_job(job_id)
    if job.user_id != current_user.id and current_user.role.value != "admin":
        raise ForbiddenException(message="Access denied to this job")
    return service.serialize_job(job)


@router.post("/jobs/{job_id}/bids", response_model=JobBidResponse, status_code=201)
async def submit_bid(
    body: JobBidCreateRequest,
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """Submit a price bid for a custom job. Worker-only."""
    if current_user.role.value != "worker":
        raise ForbiddenException(message="Only workers can submit bids")
    w = await Worker.find_one(Worker.user_id == current_user.id)
    if not w:
        raise ForbiddenException(message="Worker profile not found")
    service = BiddingService()
    bid = await service.create_bid(
        job_id=job_id, worker_id=w.id,
        bid_amount=body.bid_amount, message=body.message, estimated_time=body.estimated_time,
    )
    return service.serialize_bid(bid)


@router.get("/jobs/{job_id}/bids", response_model=List[JobBidResponse])
async def get_job_bids(job_id: str, current_user: User = Depends(get_current_user)):
    """Fetch all bids for a specific custom job."""
    service = BiddingService()
    job = await service.get_job(job_id)
    if job.user_id != current_user.id and current_user.role.value != "admin":
        raise ForbiddenException(message="Access denied to this job's bids")
    bids = await service.get_job_bids(job_id)
    return [service.serialize_bid(b) for b in bids]


@router.post("/bids/{bid_id}/accept")
async def accept_bid(bid_id: str, current_user: User = Depends(RequireCustomer)):
    """Accept a submitted bid."""
    service = BiddingService()
    return await service.accept_bid(bid_id, current_user)


@router.get("/jobs/{job_id}/messages", response_model=List[NegotiationMessageResponse])
async def get_job_messages(job_id: str, current_user: User = Depends(get_current_user)):
    """Fetch negotiation messages for a specific custom job."""
    service = BiddingService()
    job = await service.get_job(job_id)
    if job.user_id != current_user.id and current_user.role.value != "admin":
        raise ForbiddenException(message="Access denied to this job's messages")
    messages = await service.get_job_messages(job_id)
    return [service.serialize_bid_msg(m) if hasattr(service, "serialize_bid_msg") else {
        "id": m.id, "job_id": m.job_id, "sender_id": m.sender_id,
        "message": m.message, "proposed_price": m.proposed_price,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    } for m in messages]


@router.post("/jobs/{job_id}/messages", response_model=NegotiationMessageResponse, status_code=201)
async def send_negotiation_message(
    body: NegotiationMessageCreateRequest,
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """Send a negotiation message with optional proposed price."""
    service = BiddingService()
    job = await service.get_job(job_id)
    if job.user_id != current_user.id and current_user.role.value != "admin":
        raise ForbiddenException(message="Access denied to this job's messages")
    msg = await service.add_negotiation_message(
        job_id=job_id, sender_id=current_user.id,
        message=body.message, proposed_price=body.proposed_price,
    )
    msg_dict = {
        "id": msg.id, "job_id": msg.job_id, "sender_id": msg.sender_id,
        "message": msg.message, "proposed_price": msg.proposed_price,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }
    await _notify_job_bidders(service.serialize_job(job), msg_dict)
    return msg_dict
