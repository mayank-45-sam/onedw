from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.bidding import CustomJob, CustomJobStatus, JobBid, BidStatus, NegotiationMessage
from app.models.user import User, UserRole
from app.models.worker import Worker
from app.models.category import Category
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException


class BiddingService:
    """Service for custom job bidding marketplace operations.

    This service is completely isolated from the existing booking flow.
    It uses its own set of tables (custom_jobs, job_bids, negotiation_messages)
    with foreign keys to existing User/Worker/Category tables.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_job(
        self,
        user_id: str,
        category_id: Optional[str],
        title: str,
        description: str,
        budget_min: float,
        budget_max: float,
        urgency: Optional[str],
        preferred_time: Optional[str],
        images: Optional[List[str]],
    ) -> CustomJob:
        if budget_min > budget_max:
            raise BadRequestException(message="Budget minimum cannot exceed budget maximum")

        job = CustomJob(
            user_id=user_id,
            category_id=category_id,
            title=title,
            description=description,
            budget_min=budget_min,
            budget_max=budget_max,
            urgency=urgency,
            preferred_time=preferred_time,
            images=",".join(images) if images else None,
            status=CustomJobStatus.OPEN,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_user_jobs(self, user_id: str) -> List[CustomJob]:
        return (
            self.db.query(CustomJob)
            .filter(CustomJob.user_id == user_id)
            .order_by(CustomJob.created_at.desc())
            .all()
        )

    def list_open_jobs(self, worker_id: Optional[str] = None) -> List[dict]:
        """List all custom jobs that are still open for bidding.

        When ``worker_id`` is provided, each job is annotated with the
        ``my_bid`` serialized payload if that worker already submitted one.
        """
        jobs = (
            self.db.query(CustomJob)
            .filter(CustomJob.status == CustomJobStatus.OPEN)
            .order_by(CustomJob.created_at.desc())
            .all()
        )

        result = []
        for job in jobs:
            item = self.serialize_job(job)
            item["my_bid"] = None
            if worker_id:
                bid = (
                    self.db.query(JobBid)
                    .filter(JobBid.job_id == job.id, JobBid.worker_id == worker_id)
                    .first()
                )
                if bid is not None:
                    item["my_bid"] = self.serialize_bid(bid)
            result.append(item)
        return result

    def get_job(self, job_id: str) -> CustomJob:
        job = self.db.query(CustomJob).filter(CustomJob.id == job_id).first()
        if job is None:
            raise NotFoundException(message="Custom job not found")
        return job

    def create_bid(
        self,
        job_id: str,
        worker_id: str,
        bid_amount: float,
        message: Optional[str],
        estimated_time: Optional[str],
    ) -> JobBid:
        job = self.get_job(job_id)
        if job.status != CustomJobStatus.OPEN:
            raise BadRequestException(message="Cannot bid on a job that is not open")

        existing = (
            self.db.query(JobBid)
            .filter(JobBid.job_id == job_id, JobBid.worker_id == worker_id)
            .first()
        )
        if existing is not None:
            raise BadRequestException(message="You have already submitted a bid for this job")

        bid = JobBid(
            job_id=job_id,
            worker_id=worker_id,
            bid_amount=bid_amount,
            message=message,
            estimated_time=estimated_time,
            status=BidStatus.PENDING,
        )
        self.db.add(bid)
        self.db.commit()
        self.db.refresh(bid)
        return bid

    def get_job_bids(self, job_id: str) -> List[JobBid]:
        self.get_job(job_id)
        return (
            self.db.query(JobBid)
            .filter(JobBid.job_id == job_id)
            .order_by(JobBid.created_at.desc())
            .all()
        )

    def accept_bid(self, bid_id: str, current_user: User) -> dict:
        bid = self.db.query(JobBid).filter(JobBid.id == bid_id).first()
        if bid is None:
            raise NotFoundException(message="Bid not found")

        job = self.get_job(bid.job_id)
        if job.user_id != current_user.id:
            raise ForbiddenException(message="Only the job owner can accept a bid")

        if job.status != CustomJobStatus.OPEN:
            raise BadRequestException(message="Job is no longer open for bidding")

        bid.status = BidStatus.ACCEPTED
        job.status = CustomJobStatus.ACCEPTED
        self.db.add(bid)
        self.db.add(job)
        self.db.commit()
        self.db.refresh(bid)
        self.db.refresh(job)

        return {
            "job": job,
            "accepted_bid": bid,
            "message": "Bid accepted. Proceeding to booking confirmation.",
        }

    def add_negotiation_message(
        self,
        job_id: str,
        sender_id: str,
        message: Optional[str],
        proposed_price: Optional[float],
    ) -> NegotiationMessage:
        self.get_job(job_id)

        msg = NegotiationMessage(
            job_id=job_id,
            sender_id=sender_id,
            message=message,
            proposed_price=proposed_price,
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def get_job_messages(self, job_id: str) -> List[NegotiationMessage]:
        self.get_job(job_id)
        return (
            self.db.query(NegotiationMessage)
            .filter(NegotiationMessage.job_id == job_id)
            .order_by(NegotiationMessage.created_at.asc())
            .all()
        )

    @staticmethod
    def serialize_job(job: CustomJob) -> dict:
        result = job.to_dict()
        result["images"] = job.images.split(",") if job.images else []
        return result

    @staticmethod
    def notification_payload(job: CustomJob) -> dict:
        """JSON-safe snake_case payload of a job for notifications/emits."""
        payload = BiddingService.serialize_job(job)
        status = payload.get("status")
        if isinstance(status, CustomJobStatus):
            payload["status"] = status.value
        for key in ("created_at", "updated_at"):
            value = payload.get(key)
            if value is not None and hasattr(value, "isoformat"):
                payload[key] = value.isoformat()
        return payload

    @staticmethod
    def message_payload(msg: NegotiationMessage) -> dict:
        """JSON-safe snake_case payload of a negotiation message."""
        payload = msg.to_dict()
        for key in ("created_at", "updated_at"):
            value = payload.get(key)
            if value is not None and hasattr(value, "isoformat"):
                payload[key] = value.isoformat()
        return payload

    @staticmethod
    def serialize_bid(bid: JobBid) -> dict:
        result = bid.to_dict()
        worker = bid.worker
        if worker and worker.user:
            result["worker_name"] = worker.name
            result["worker_profession"] = worker.profession
            result["worker_avatar"] = worker.avatar
            result["worker_rating"] = worker.rating
            result["worker_review_count"] = worker.review_count
            result["worker_trust_score"] = worker.trust_score
        return result
