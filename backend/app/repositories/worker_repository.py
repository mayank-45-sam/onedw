"""Async Worker repository."""
from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple

from app.models.worker import Worker
from app.repositories.base import BaseRepository


class WorkerRepository(BaseRepository[Worker]):
    def __init__(self):
        super().__init__(Worker)

    async def search(
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
    ) -> Tuple[List[Worker], int]:
        conditions = []
        if category_id:
            conditions.append({"category_ids": category_id})
        if search:
            term = re.compile(search.strip(), re.IGNORECASE)
            conditions.append({
                "$or": [
                    {"name": term},
                    {"profession": term},
                    {"bio": term},
                ]
            })
        if min_rating is not None:
            conditions.append({"rating": {"$gte": min_rating}})
        if min_experience is not None:
            conditions.append({"experience_years": {"$gte": min_experience}})
        if max_price is not None:
            conditions.append({"hourly_rate": {"$lte": max_price}})
        if min_price is not None:
            conditions.append({"hourly_rate": {"$gte": min_price}})
        if is_online is not None:
            conditions.append({"is_online": is_online})

        mongo_filter = {"$and": conditions} if conditions else {}

        sort_field = "-rating"
        if sort_by == "rating":
            sort_field = "-rating"
        elif sort_by == "price_asc":
            sort_field = "+hourly_rate"
        elif sort_by == "price_desc":
            sort_field = "-hourly_rate"
        elif sort_by == "experience":
            sort_field = "-experience_years"
        elif sort_by == "jobs":
            sort_field = "-completed_jobs"

        total = await Worker.find(mongo_filter).count()
        items = await Worker.find(mongo_filter).sort(sort_field).skip(skip).limit(limit).to_list()
        return items, total

    async def get_by_user_id(self, user_id: str) -> Optional[Worker]:
        return await Worker.find_one(Worker.user_id == user_id)

    async def get_aadhaar_status(self, worker_id: str) -> Optional[Dict]:
        worker = await self.get(worker_id)
        if worker is None:
            return None
        return {
            "aadhaar_verified": worker.aadhaar_verified,
            "aadhaar_verified_at": worker.aadhaar_verified_at.isoformat() if worker.aadhaar_verified_at else None,
        }
