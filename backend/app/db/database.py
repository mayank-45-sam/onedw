from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base for ORM models."""


engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE if "postgresql" in settings.DATABASE_URL else 5,
    max_overflow=settings.DATABASE_MAX_OVERFLOW if "postgresql" in settings.DATABASE_URL else 5,
    pool_pre_ping=True,
    echo=settings.DEBUG,
    **({"connect_args": {"connect_timeout": 2}} if "postgresql" in settings.DATABASE_URL else {}),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    Used in FastAPI endpoints via Depends(get_db).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    """Verify the database accepts connections."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def init_db() -> None:
    """
    Initialize database tables.
    Note: In production, use Alembic migrations instead.
    """
    Base.metadata.create_all(bind=engine)
