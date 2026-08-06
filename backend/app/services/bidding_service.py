"""Async Bidding service — Beanie version."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from app.models.bidding import CustomJob, CustomJobStatus, JobBid, BidStatus, NegotiationMessage
from app.models.user import User
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException


class BiddingService:
    """Service for custom job bidding marketplace operations (Beanie/async)."""

    async def create_job(
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
        await job.insert()
        return job

    async def get_user_jobs(self, user_id: str) -> List[CustomJob]:
        jobs = await CustomJob.find(CustomJob.user_id == user_id).to_list()
        jobs.sort(key=lambda j: j.created_at or datetime.min, reverse=True)
        return jobs

    async def list_open_jobs(self, worker_id: Optional[str] = None) -> List[dict]:
        jobs = await CustomJob.find(CustomJob.status == CustomJobStatus.OPEN).to_list()
        jobs.sort(key=lambda j: j.created_at or datetime.min, reverse=True)

        result = []
        for job in jobs:
            item = self.serialize_job(job)
            item["my_bid"] = None
            if worker_id:
                bid = await JobBid.find_one(
                    JobBid.job_id == job.id,
                    JobBid.worker_id == worker_id,
                )
                if bid is not None:
                    item["my_bid"] = self.serialize_bid(bid)
            result.append(item)
        return result

    async def get_job(self, job_id: str) -> CustomJob:
        job = await CustomJob.find_one(CustomJob.id == job_id)
        if job is None:
            raise NotFoundException(message="Custom job not found")
        return job

    async def create_bid(
        self,
        job_id: str,
        worker_id: str,
        bid_amount: float,
        message: Optional[str],
        estimated_time: Optional[str],
    ) -> JobBid:
        job = await self.get_job(job_id)
        if job.status != CustomJobStatus.OPEN:
            raise BadRequestException(message="Cannot bid on a job that is not open")

        existing = await JobBid.find_one(JobBid.job_id == job_id, JobBid.worker_id == worker_id)
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
        await bid.insert()
        return bid

    async def get_job_bids(self, job_id: str) -> List[JobBid]:
        await self.get_job(job_id)
        bids = await JobBid.find(JobBid.job_id == job_id).to_list()
        bids.sort(key=lambda b: b.created_at or datetime.min, reverse=True)
        return bids

    async def accept_bid(self, bid_id: str, current_user: User) -> dict:
        bid = await JobBid.find_one(JobBid.id == bid_id)
        if bid is None:
            raise NotFoundException(message="Bid not found")

        job = await self.get_job(bid.job_id)
        if job.user_id != current_user.id:
            raise ForbiddenException(message="Only the job owner can accept a bid")

        if job.status != CustomJobStatus.OPEN:
            raise BadRequestException(message="Job is no longer open for bidding")

        bid.status = BidStatus.ACCEPTED
        job.status = CustomJobStatus.ACCEPTED
        await bid.save()
        await job.save()

        return {
            "job": self.serialize_job(job),
            "accepted_bid": self.serialize_bid(bid),
            "message": "Bid accepted. Proceeding to booking confirmation.",
        }

    async def add_negotiation_message(
        self,
        job_id: str,
        sender_id: str,
        message: Optional[str],
        proposed_price: Optional[float],
    ) -> NegotiationMessage:
        await self.get_job(job_id)

        msg = NegotiationMessage(
            job_id=job_id,
            sender_id=sender_id,
            message=message,
            proposed_price=proposed_price,
        )
        await msg.insert()
        return msg

    async def get_job_messages(self, job_id: str) -> List[NegotiationMessage]:
        await self.get_job(job_id)
        msgs = await NegotiationMessage.find(NegotiationMessage.job_id == job_id).to_list()
        msgs.sort(key=lambda m: m.created_at or datetime.min)
        return msgs

    @staticmethod
    def serialize_job(job: CustomJob) -> dict:
        data = {
            "id": job.id, "user_id": job.user_id, "category_id": job.category_id,
            "title": job.title, "description": job.description,
            "budget_min": job.budget_min, "budget_max": job.budget_max,
            "urgency": job.urgency, "preferred_time": job.preferred_time,
            "status": job.status.value if hasattr(job.status, "value") else job.status,
            "images": job.images.split(",") if job.images else [],
            "created_at": job.created_at.isoformat() if job.created_at else None,
        }
        return data

    @staticmethod
    def serialize_bid(bid: JobBid) -> dict:
        return {
            "id": bid.id, "job_id": bid.job_id, "worker_id": bid.worker_id,
            "bid_amount": bid.bid_amount, "message": bid.message,
            "estimated_time": bid.estimated_time,
            "status": bid.status.value if hasattr(bid.status, "value") else bid.status,
            "created_at": bid.created_at.isoformat() if bid.created_at else None,
        }
