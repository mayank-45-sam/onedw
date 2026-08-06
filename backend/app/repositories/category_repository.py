"""Async Category repository."""
from __future__ import annotations

from typing import List, Optional

from app.models.category import Category
from app.models.service import Service
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    def __init__(self):
        super().__init__(Category)

    async def get_all_paginated(self, skip: int = 0, limit: int = 100) -> List[Category]:
        return await Category.find_all().skip(skip).limit(limit).to_list()

    async def get_by_slug(self, slug: str) -> Optional[Category]:
        return await Category.find_one(Category.slug == slug)

    async def count_all(self) -> int:
        return await Category.find_all().count()

    async def update_service_count(self, category_id: str) -> None:
        count = await Service.find(Service.category_id == category_id).count()
        cat = await self.get(category_id)
        if cat:
            cat.service_count = count
            await cat.save()
