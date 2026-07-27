from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.models.service import Service
from app.repositories.base import BaseRepository


class ServiceRepository(BaseRepository[Service]):
    """Repository for Service model operations."""

    def __init__(self, db: Session):
        super().__init__(Service, db)

    def search(
        self,
        skip: int = 0,
        limit: int = 20,
        category_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> tuple[List[Service], int]:
        query = self.db.query(Service)

        if category_id:
            query = query.filter(Service.category_id == category_id)
        if min_price is not None:
            query = query.filter(Service.base_price >= min_price)
        if max_price is not None:
            query = query.filter(Service.base_price <= max_price)
        if min_rating is not None:
            query = query.filter(Service.rating >= min_rating)
        if search_query:
            pattern = f"%{search_query}%"
            query = query.filter(
                or_(
                    Service.name.ilike(pattern),
                    Service.description.ilike(pattern),
                )
            )

        total = query.count()

        if sort_by == "price_asc":
            query = query.order_by(Service.base_price.asc())
        elif sort_by == "price_desc":
            query = query.order_by(Service.base_price.desc())
        elif sort_by == "rating":
            query = query.order_by(Service.rating.desc())
        elif sort_by == "popular":
            query = query.order_by(Service.popular.desc(), Service.review_count.desc())
        elif sort_by == "newest":
            query = query.order_by(Service.created_at.desc())
        else:
            query = query.order_by(Service.popular.desc(), Service.rating.desc())

        items = query.offset(skip).limit(limit).all()
        return items, total

    def get_by_category(self, category_id: str, skip: int = 0, limit: int = 20) -> tuple[List[Service], int]:
        query = self.db.query(Service).filter(Service.category_id == category_id)
        total = query.count()
        items = query.order_by(Service.rating.desc()).offset(skip).limit(limit).all()
        return items, total

    def count_by_category(self, category_id: str) -> int:
        return (
            self.db.query(func.count(Service.id))
            .filter(Service.category_id == category_id)
            .scalar()
            or 0
        )
