from typing import Optional, List
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, or_

from app.models.category import Category
from app.models.worker import Worker
from app.repositories.base import BaseRepository


class WorkerRepository(BaseRepository[Worker]):
    """Repository for Worker model operations."""

    def __init__(self, db: Session):
        super().__init__(Worker, db)

    def search(
        self,
        skip: int = 0,
        limit: int = 20,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
        min_rating: Optional[float] = None,
        min_experience: Optional[int] = None,
        max_price: Optional[float] = None,
        min_price: Optional[float] = None,
        is_online: Optional[bool] = None,
        sort_by: Optional[str] = None,
    ) -> tuple[List[Worker], int]:
        query = self.db.query(Worker)

        if category_id:
            query = query.filter(Worker.category_ids.contains(category_id))
        if search:
            term = f"%{search.strip()}%"
            filters = [
                Worker.name.ilike(term),
                Worker.profession.ilike(term),
                Worker.bio.ilike(term),
            ]
            matching_cat_ids = [
                cid for (cid,) in self.db.query(Category.id).filter(
                    or_(Category.name.ilike(term), Category.slug.ilike(term))
                ).all()
            ]
            if matching_cat_ids:
                filters.append(or_(*[Worker.category_ids.contains(cid) for cid in matching_cat_ids]))
            query = query.filter(or_(*filters))
        if min_rating is not None:
            query = query.filter(Worker.rating >= min_rating)
        if min_experience is not None:
            query = query.filter(Worker.experience_years >= min_experience)
        if max_price is not None:
            query = query.filter(Worker.hourly_rate <= max_price)
        if min_price is not None:
            query = query.filter(Worker.hourly_rate >= min_price)
        if is_online is not None:
            query = query.filter(Worker.is_online == is_online)

        total = query.count()

        if sort_by == "rating":
            query = query.order_by(Worker.rating.desc())
        elif sort_by == "price_asc":
            query = query.order_by(Worker.hourly_rate.asc())
        elif sort_by == "price_desc":
            query = query.order_by(Worker.hourly_rate.desc())
        elif sort_by == "experience":
            query = query.order_by(Worker.experience_years.desc())
        elif sort_by == "jobs":
            query = query.order_by(Worker.completed_jobs.desc())
        else:
            query = query.order_by(Worker.rating.desc(), Worker.completed_jobs.desc())

        items = query.offset(skip).limit(limit).all()
        return items, total

    def get_with_details(self, worker_id: str) -> Optional[Worker]:
        return (
            self.db.query(Worker)
            .options(
                selectinload(Worker.skills),
                selectinload(Worker.languages),
                selectinload(Worker.availability),
            )
            .filter(Worker.id == worker_id)
            .first()
        )

    def get_by_user_id(self, user_id: str) -> Optional[Worker]:
        return self.db.query(Worker).filter(Worker.user_id == user_id).first()

    def get_aadhaar_status(self, worker_id: str) -> Optional[dict]:
        worker = self.db.query(Worker).filter(Worker.id == worker_id).first()
        if worker is None:
            return None
        return {
            "aadhaar_verified": worker.aadhaar_verified,
            "aadhaar_verified_at": worker.aadhaar_verified_at.isoformat() if worker.aadhaar_verified_at else None,
        }
