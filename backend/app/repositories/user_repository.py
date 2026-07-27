from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import exists

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User model operations."""

    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_phone(self, phone: str) -> Optional[User]:
        return self.db.query(User).filter(User.phone == phone).first()

    def email_exists(self, email: str) -> bool:
        return self.db.query(exists().where(User.email == email)).scalar()

    def phone_exists(self, phone: str) -> bool:
        if phone is None:
            return False
        return self.db.query(exists().where(User.phone == phone)).scalar()

    def get_active_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        return self.db.query(User).filter(User.is_active == True).offset(skip).limit(limit).all()

    def deactivate(self, user: User) -> User:
        user.is_active = False
        self.db.commit()
        self.db.refresh(user)
        return user

    def verify_user(self, user: User) -> User:
        user.is_verified = True
        self.db.commit()
        self.db.refresh(user)
        return user
