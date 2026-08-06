"""Async Service repository."""
from __future__ import annotations

import re
from typing import List, Optional, Tuple

from app.models.service import Service
from app.repositories.base import BaseRepository


class ServiceRepository(BaseRepository[Service]):
    def __init__(self):
        super().__init__(Service)

    async def search(
        self,
        skip: int = 0,
        limit: int = 20,
        category_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> Tuple[List[Service], int]:
        conditions = []
        if category_id:
            conditions.append({"category_id": category_id})
        if min_price is not None:
            conditions.append({"base_price": {"$gte": min_price}})
        if max_price is not None:
            conditions.append({"base_price": {"$lte": max_price}})
        if min_rating is not None:
            conditions.append({"rating": {"$gte": min_rating}})
        if search_query:
            pattern = re.compile(search_query, re.IGNORECASE)
            conditions.append({
                "$or": [
                    {"name": pattern},
                    {"description": pattern},
                    {"tags": pattern},
                ]
            })

        mongo_filter = {"$and": conditions} if conditions else {}

        sort_field = "-popular"
        if sort_by == "price_asc":
            sort_field = "+base_price"
        elif sort_by == "price_desc":
            sort_field = "-base_price"
        elif sort_by == "rating":
            sort_field = "-rating"
        elif sort_by == "newest":
            sort_field = "-created_at"

        total = await Service.find(mongo_filter).count()
        items = await Service.find(mongo_filter).sort(sort_field).skip(skip).limit(limit).to_list()
        return items, total

    async def get_by_category(self, category_id: str, skip: int = 0, limit: int = 20) -> Tuple[List[Service], int]:
        total = await Service.find(Service.category_id == category_id).count()
        items = await Service.find(Service.category_id == category_id).sort("-rating").skip(skip).limit(limit).to_list()
        return items, total

    async def count_by_category(self, category_id: str) -> int:
        return await Service.find(Service.category_id == category_id).count()
