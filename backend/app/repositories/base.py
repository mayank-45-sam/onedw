from typing import Generic, TypeVar, Type, List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete, func
from app.db.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Base repository with common CRUD operations."""

    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get(self, id: Any) -> Optional[ModelType]:
        """Get a single record by ID."""
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_by(self, **kwargs) -> Optional[ModelType]:
        """Get a single record by filters."""
        return self.db.query(self.model).filter_by(**kwargs).first()

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        **filters
    ) -> List[ModelType]:
        """Get all records with optional pagination and filters."""
        query = self.db.query(self.model)
        
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.filter(getattr(self.model, key) == value)
        
        return query.offset(skip).limit(limit).all()

    def create(self, obj_in: Dict[str, Any]) -> ModelType:
        """Create a new record."""
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: ModelType, obj_in: Dict[str, Any]) -> ModelType:
        """Update an existing record."""
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, id: Any) -> Optional[ModelType]:
        """Delete a record by ID."""
        obj = self.get(id)
        if obj:
            self.db.delete(obj)
            self.db.commit()
        return obj

    def count(self, **filters) -> int:
        """Count records with optional filters."""
        query = self.db.query(func.count(self.model.id))
        
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.filter(getattr(self.model, key) == value)
        
        return query.scalar() or 0

    def exists(self, **kwargs) -> bool:
        """Check if a record exists with given filters."""
        return self.db.query(self.model).filter_by(**kwargs).first() is not None
