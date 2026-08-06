"""Base async Beanie repository with common CRUD operations."""
from __future__ import annotations

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from beanie import Document

DocType = TypeVar("DocType", bound=Document)


class BaseRepository(Generic[DocType]):
    """Base repository — all methods are async (Beanie)."""

    def __init__(self, model: Type[DocType]):
        self.model = model

    async def get(self, id: Any) -> Optional[DocType]:
        """Get a single document by its string id field."""
        return await self.model.find_one(self.model.id == id)  # type: ignore[attr-defined]

    async def get_by(self, **kwargs) -> Optional[DocType]:
        """Get a single document matching all keyword filters."""
        conditions = [
            getattr(self.model, k) == v
            for k, v in kwargs.items()
            if hasattr(self.model, k)
        ]
        if not conditions:
            return None
        query = conditions[0]
        for cond in conditions[1:]:
            query &= cond
        return await self.model.find_one(query)  # type: ignore[arg-type]

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        **filters,
    ) -> List[DocType]:
        """Get all documents with optional pagination and equality filters."""
        conditions = [
            getattr(self.model, k) == v
            for k, v in filters.items()
            if hasattr(self.model, k)
        ]
        if conditions:
            query = conditions[0]
            for cond in conditions[1:]:
                query &= cond
            return await self.model.find(query).skip(skip).limit(limit).to_list()  # type: ignore[arg-type]
        return await self.model.find_all().skip(skip).limit(limit).to_list()

    async def create(self, obj_in: Dict[str, Any]) -> DocType:
        """Create and insert a new document."""
        db_obj = self.model(**obj_in)
        await db_obj.insert()
        return db_obj

    async def update(self, db_obj: DocType, obj_in: Dict[str, Any]) -> DocType:
        """Update fields on an existing document and save."""
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        await db_obj.save()
        return db_obj

    async def delete(self, id: Any) -> Optional[DocType]:
        """Delete a document by id; returns the deleted document or None."""
        obj = await self.get(id)
        if obj:
            await obj.delete()
        return obj

    async def count(self, **filters) -> int:
        """Count documents matching optional equality filters."""
        conditions = [
            getattr(self.model, k) == v
            for k, v in filters.items()
            if hasattr(self.model, k)
        ]
        if conditions:
            query = conditions[0]
            for cond in conditions[1:]:
                query &= cond
            return await self.model.find(query).count()  # type: ignore[arg-type]
        return await self.model.find_all().count()

    async def exists(self, **kwargs) -> bool:
        """Return True if at least one matching document exists."""
        doc = await self.get_by(**kwargs)
        return doc is not None
