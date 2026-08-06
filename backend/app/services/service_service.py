"""Async Service service — Beanie version."""
from __future__ import annotations

from typing import Optional

from app.models.category import Category
from app.repositories.service_repository import ServiceRepository
from app.core.exceptions import NotFoundException


class ServiceService:
    """Service for service listing operations."""

    def __init__(self):
        self.repo = ServiceRepository()

    async def list_services(
        self,
        page: int = 1,
        limit: int = 20,
        category_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> dict:
        skip = (page - 1) * limit
        items, total = await self.repo.search(
            skip=skip,
            limit=limit,
            category_id=category_id,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
            search_query=search,
            sort_by=sort_by,
        )
        pages = (total + limit - 1) // limit if limit > 0 else 0

        serialized = []
        for s in items:
            cat = await Category.find_one(Category.id == s.category_id) if s.category_id else None
            serialized.append(self._serialize(s, cat))

        return {
            "data": serialized,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    async def get_service(self, service_id: str) -> dict:
        service = await self.repo.get(service_id)
        if service is None:
            raise NotFoundException(message="Service not found")
        cat = await Category.find_one(Category.id == service.category_id) if service.category_id else None
        return self._serialize(service, cat)

    async def list_by_category(self, category_id: str, page: int = 1, limit: int = 20) -> dict:
        skip = (page - 1) * limit
        items, total = await self.repo.get_by_category(category_id=category_id, skip=skip, limit=limit)
        pages = (total + limit - 1) // limit if limit > 0 else 0
        cat = await Category.find_one(Category.id == category_id) if category_id else None

        return {
            "data": [self._serialize(s, cat) for s in items],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    def _serialize(self, service, category=None) -> dict:
        cat_data = None
        if category:
            cat_data = {
                "id": category.id,
                "name": category.name,
                "slug": category.slug,
                "description": category.description,
                "icon": category.icon,
                "image": category.image,
                "color": category.color,
                "service_count": category.service_count,
            }

        return {
            "id": service.id,
            "name": service.name,
            "slug": service.slug,
            "description": service.description,
            "category_id": service.category_id,
            "image": service.image,
            "gallery": service.gallery,
            "base_price": service.base_price,
            "duration": service.duration,
            "rating": service.rating,
            "review_count": service.review_count,
            "popular": service.popular,
            "trending": service.trending,
            "tags": service.tags,
            "category": cat_data,
        }
