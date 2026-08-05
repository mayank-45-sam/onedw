"""Shared test database setup for all integration tests."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from main import app

# main.app is wrapped by Socket.IO's ASGI application. The test overrides
# must be applied to the inner FastAPI app so requests use the in-memory DB.
fastapi_app = getattr(app, "other_asgi_app", app)

TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


fastapi_app.dependency_overrides[get_db] = override_get_db


def setup_test_db():
    Base.metadata.create_all(bind=test_engine)


def teardown_test_db():
    Base.metadata.drop_all(bind=test_engine)
