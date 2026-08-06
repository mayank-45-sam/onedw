"""Async Worker service — Beanie version."""
from __future__ import annotations

from typing import Optional

from app.models.user import User
from app.models.worker_skill import WorkerSkill
from app.models.worker_language import WorkerLanguage
from app.models.worker_availability import WorkerAvailability
from app.repositories.worker_repository import WorkerRepository
from app.core.exceptions import NotFoundException


class WorkerService:
    """Service for worker listing operations."""

    def __init__(self):
        self.repo = WorkerRepository()

    async def list_workers(
        self,
        page: int = 1,
        limit: int = 20,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
        min_rating: Optional[float] = None,
        min_experience: Optional[int] = None,
        max_price: Optional[float] = None,
        min_price: Optional[float] = None,
        is_online: Optional[bool] = None,
        sort_by: Optional[str] = None,
    ) -> dict:
        skip = (page - 1) * limit
        items, total = await self.repo.search(
            skip=skip,
            limit=limit,
            category_id=category_id,
            search=search,
            min_rating=min_rating,
            min_experience=min_experience,
            max_price=max_price,
            min_price=min_price,
            is_online=is_online,
            sort_by=sort_by,
        )
        pages = (total + limit - 1) // limit if limit > 0 else 0

        serialized = []
        for w in items:
            user = await User.find_one(User.id == w.user_id)
            serialized.append(self._serialize(w, user))

        return {
            "data": serialized,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    async def get_worker(self, worker_id: str) -> dict:
        worker = await self.repo.get(worker_id)
        if worker is None:
            raise NotFoundException(message="Worker not found")
        user = await User.find_one(User.id == worker.user_id)
        skills = await WorkerSkill.find(WorkerSkill.worker_id == worker_id).to_list()
        languages = await WorkerLanguage.find(WorkerLanguage.worker_id == worker_id).to_list()
        availability = await WorkerAvailability.find(WorkerAvailability.worker_id == worker_id).to_list()
        return self._serialize_detail(worker, user, skills, languages, availability)

    def _serialize(self, worker, user=None) -> dict:
        return {
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
            "category_ids": worker.category_ids,
            "aadhaar_verified": worker.aadhaar_verified,
            "is_verified": user.is_verified if user else False,
            "trust_score": worker.trust_score,
            "verification_badge": worker.verification_badge,
            "verification_status": worker.verification_status,
        }

    def _serialize_detail(self, worker, user=None, skills=None, languages=None, availability=None) -> dict:
        data = self._serialize(worker, user)
        data["skills"] = [{"id": s.id, "skill": s.skill} for s in (skills or [])]
        data["languages"] = [{"id": l.id, "language": l.language} for l in (languages or [])]
        data["availability"] = [{"id": a.id, "day": a.day, "slots": a.slots} for a in (availability or [])]
        return data
