from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.category import Category
from app.repositories.category_repository import CategoryRepository
from app.core.exceptions import NotFoundException


class CategoryService:
    """Service for category operations."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = CategoryRepository(db)

    def list_categories(self, page: int = 1, limit: int = 20) -> dict:
        skip = (page - 1) * limit
        total = self.repo.count_all()
        categories = self.repo.get_all_paginated(skip=skip, limit=limit)
        pages = (total + limit - 1) // limit if limit > 0 else 0

        return {
            "data": [self._serialize(c) for c in categories],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    def get_category(self, category_id: str) -> dict:
        category = self.repo.get(category_id)
        if category is None:
            category = self.repo.get_by_slug(category_id)
        if category is None:
            raise NotFoundException(message="Category not found")
        return self._serialize(category)

    def _serialize(self, category: Category) -> dict:
        return {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
            "description": category.description,
            "icon": category.icon,
            "image": category.image,
            "color": category.color,
            "service_count": category.service_count,
            "created_at": category.created_at.isoformat() if category.created_at else None,
            "updated_at": category.updated_at.isoformat() if category.updated_at else None,
        }
