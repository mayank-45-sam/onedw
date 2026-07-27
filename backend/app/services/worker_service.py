from typing import Optional
from sqlalchemy.orm import Session

from app.repositories.worker_repository import WorkerRepository
from app.core.exceptions import NotFoundException


class WorkerService:
    """Service for worker listing operations."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = WorkerRepository(db)

    def list_workers(
        self,
        page: int = 1,
        limit: int = 20,
        category_id: Optional[str] = None,
        min_rating: Optional[float] = None,
        min_experience: Optional[int] = None,
        max_price: Optional[float] = None,
        min_price: Optional[float] = None,
        is_online: Optional[bool] = None,
        sort_by: Optional[str] = None,
    ) -> dict:
        skip = (page - 1) * limit
        items, total = self.repo.search(
            skip=skip,
            limit=limit,
            category_id=category_id,
            min_rating=min_rating,
            min_experience=min_experience,
            max_price=max_price,
            min_price=min_price,
            is_online=is_online,
            sort_by=sort_by,
        )
        pages = (total + limit - 1) // limit if limit > 0 else 0

        return {
            "data": [self._serialize(w) for w in items],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    def get_worker(self, worker_id: str) -> dict:
        worker = self.repo.get_with_details(worker_id)
        if worker is None:
            raise NotFoundException(message="Worker not found")
        return self._serialize_detail(worker)

    def _serialize(self, worker) -> dict:
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
        }

    def _serialize_detail(self, worker) -> dict:
        data = self._serialize(worker)
        data["skills"] = [
            {"id": s.id, "skill": s.skill} for s in (worker.skills or [])
        ]
        data["languages"] = [
            {"id": l.id, "language": l.language} for l in (worker.languages or [])
        ]
        data["availability"] = [
            {"id": a.id, "day": a.day, "slots": a.slots}
            for a in (worker.availability or [])
        ]
        return data
