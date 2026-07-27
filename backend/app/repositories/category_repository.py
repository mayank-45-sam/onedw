from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from typing import Optional, List
from sqlalchemy import func
from app.models.category import Category
from app.models.service import Service
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    """Repository for Category model operations."""

    def __init__(self, db: Session):
        super().__init__(Category, db)

    def get_all_paginated(self, skip: int = 0, limit: int = 100) -> List[Category]:
        return self.db.query(Category).offset(skip).limit(limit).all()

    def get_by_slug(self, slug: str) -> Optional[Category]:
        return self.db.query(Category).filter(Category.slug == slug).first()

    def count_all(self) -> int:
        return self.db.query(func.count(Category.id)).scalar() or 0

    def update_service_count(self, category_id: str) -> None:
        count = (
            self.db.query(func.count(Service.id))
            .filter(Service.category_id == category_id)
            .scalar()
        )
        cat = self.get(category_id)
        if cat:
            cat.service_count = count or 0
            self.db.commit()
