from typing import Optional
from sqlalchemy.orm import Session

from app.repositories.service_repository import ServiceRepository
from app.core.exceptions import NotFoundException


class ServiceService:
    """Service for service listing operations."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = ServiceRepository(db)

    def list_services(
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
        items, total = self.repo.search(
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

        return {
            "data": [self._serialize(s) for s in items],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    def get_service(self, service_id: str) -> dict:
        service = self.repo.get(service_id)
        if service is None:
            raise NotFoundException(message="Service not found")
        return self._serialize_detail(service)

    def list_by_category(
        self, category_id: str, page: int = 1, limit: int = 20
    ) -> dict:
        skip = (page - 1) * limit
        items, total = self.repo.get_by_category(
            category_id=category_id, skip=skip, limit=limit
        )
        pages = (total + limit - 1) // limit if limit > 0 else 0

        return {
            "data": [self._serialize(s) for s in items],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    def _serialize(self, service) -> dict:
        cat_data = None
        if service.category:
            cat_data = {
                "id": service.category.id,
                "name": service.category.name,
                "slug": service.category.slug,
                "description": service.category.description,
                "icon": service.category.icon,
                "image": service.category.image,
                "color": service.category.color,
                "service_count": service.category.service_count,
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

    def _serialize_detail(self, service) -> dict:
        data = self._serialize(service)
        data["bookings_count"] = len(service.bookings) if service.bookings else 0
        return data
