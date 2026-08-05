"""Integration tests for file uploads (Phase 2.7)."""
import sys
import os
import io

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from main import app
from tests.test_db_setup import TestSessionLocal, setup_test_db, teardown_test_db


@pytest.fixture(autouse=True)
def setup_database():
    setup_test_db()
    yield
    teardown_test_db()


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


VALID_PASSWORD = "StrongPass1!"


def register_and_login(client, email="user@test.com", role="customer"):
    client.post("/api/v1/auth/register", json={
        "name": "Test User", "email": email, "password": VALID_PASSWORD, "role": role,
    })
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": VALID_PASSWORD})
    return resp.json()["data"]["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def _make_jpeg_bytes(size=100):
    """Minimal valid JPEG: SOI + APP0 marker + EOI."""
    return b"\xff\xd8\xff\xe0" + b"\x00" * size + b"\xff\xd9"


def _make_png_bytes(size=100):
    """Minimal PNG header + IHDR + IEND."""
    header = b"\x89PNG\r\n\x1a\n"
    return header + b"\x00" * size + b"IEND\xaeB`\x82"


# ============================================================
# UPLOAD TESTS
# ============================================================

class TestUploadSuccess:
    def test_upload_jpeg(self, client):
        token = register_and_login(client)
        files = {"file": ("test.jpg", _make_jpeg_bytes(), "image/jpeg")}
        resp = client.post("/api/v1/uploads", headers=auth_header(token), files=files)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["url"].startswith("/uploads/")
        assert data["data"]["url"].endswith(".jpg")

    def test_upload_png(self, client):
        token = register_and_login(client)
        files = {"file": ("test.png", _make_png_bytes(), "image/png")}
        resp = client.post("/api/v1/uploads", headers=auth_header(token), files=files)
        assert resp.status_code == 200
        assert resp.json()["data"]["url"].endswith(".png")

    def test_upload_jpeg_extension(self, client):
        token = register_and_login(client)
        files = {"file": ("photo.jpeg", _make_jpeg_bytes(), "image/jpeg")}
        resp = client.post("/api/v1/uploads", headers=auth_header(token), files=files)
        assert resp.status_code == 200
        assert resp.json()["data"]["url"].endswith(".jpeg")

    def test_upload_webp_extension(self, client):
        token = register_and_login(client)
        webp_bytes = b"RIFF\x00\x00\x00\x00WEBP" + b"\x00" * 50
        files = {"file": ("photo.webp", webp_bytes, "image/webp")}
        resp = client.post("/api/v1/uploads", headers=auth_header(token), files=files)
        assert resp.status_code == 200
        assert resp.json()["data"]["url"].endswith(".webp")

    def test_upload_unique_filenames(self, client):
        token = register_and_login(client)
        urls = []
        for _ in range(3):
            files = {"file": ("same.jpg", _make_jpeg_bytes(), "image/jpeg")}
            resp = client.post("/api/v1/uploads", headers=auth_header(token), files=files)
            urls.append(resp.json()["data"]["url"])
        assert len(set(urls)) == 3


class TestUploadValidation:
    def test_invalid_file_type(self, client):
        token = register_and_login(client)
        files = {"file": ("script.exe", b"MZ\x90\x00", "application/octet-stream")}
        resp = client.post("/api/v1/uploads", headers=auth_header(token), files=files)
        assert resp.status_code == 400
        assert "not allowed" in str(resp.json()).lower()

    def test_invalid_file_type_gif(self, client):
        token = register_and_login(client)
        files = {"file": ("image.gif", b"GIF89a" + b"\x00" * 10, "image/gif")}
        resp = client.post("/api/v1/uploads", headers=auth_header(token), files=files)
        assert resp.status_code == 400

    def test_large_file_rejection(self, client):
        token = register_and_login(client)
        large_content = b"\xff\xd8\xff\xe0" + b"\x00" * (5 * 1024 * 1024 + 1) + b"\xff\xd9"
        files = {"file": ("huge.jpg", large_content, "image/jpeg")}
        resp = client.post("/api/v1/uploads", headers=auth_header(token), files=files)
        assert resp.status_code == 400
        assert "5mb" in str(resp.json()).lower()

    def test_requires_auth(self, client):
        files = {"file": ("test.jpg", _make_jpeg_bytes(), "image/jpeg")}
        resp = client.post("/api/v1/uploads", files=files)
        assert resp.status_code in (401, 403)


# ============================================================
# BOOKING WITH IMAGES TESTS
# ============================================================

class TestBookingWithImages:
    def _seed(self, db):
        from app.models.category import Category
        from app.models.service import Service
        from app.models.worker import Worker
        from app.models.user import User, UserRole
        from app.models.customer import Customer
        from app.core.security import get_password_hash

        cat = Category(name="Plumbing", slug="plumbing", description="Plumbing", service_count=1)
        db.add(cat)
        db.flush()

        svc = Service(
            name="Pipe Repair", slug="pipe-repair", description="Fix pipes",
            category_id=cat.id, base_price=500.0, duration=60, rating=4.5,
            review_count=10, popular=True, trending=False,
        )
        db.add(svc)
        db.flush()

        user_w = User(
            email="worker@test.com", password_hash=get_password_hash(VALID_PASSWORD),
            role=UserRole.WORKER, is_active=True, is_verified=True,
        )
        db.add(user_w)
        db.flush()

        worker = Worker(user_id=user_w.id, name="Ravi Kumar", profession="Plumber", hourly_rate=200)
        db.add(worker)
        db.flush()

        user_c = User(
            email="cust@test.com", password_hash=get_password_hash(VALID_PASSWORD),
            role=UserRole.CUSTOMER, is_active=True, is_verified=True,
        )
        db.add(user_c)
        db.flush()

        customer = Customer(user_id=user_c.id, name="Priya Sharma")
        db.add(customer)
        db.flush()
        db.commit()

        return {"service_id": svc.id, "worker_id": worker.id}

    def test_booking_with_problem_images(self, client):
        db = TestSessionLocal()
        seed = self._seed(db)
        db.close()

        client.post("/api/v1/auth/register", json={
            "name": "Priya", "email": "cust@test.com", "password": VALID_PASSWORD, "role": "customer",
        })
        token = client.post("/api/v1/auth/login", json={
            "email": "cust@test.com", "password": VALID_PASSWORD,
        }).json()["data"]["access_token"]

        images = ["/uploads/abc123.jpg", "/uploads/def456.png"]
        resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service_id"],
            "problem_description": "Leaking pipe under kitchen sink",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St", "city": "Mumbai"},
            "problem_images": images,
        })
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["problem_images"] == images

    def test_booking_without_images(self, client):
        db = TestSessionLocal()
        seed = self._seed(db)
        db.close()

        client.post("/api/v1/auth/register", json={
            "name": "Priya", "email": "cust@test.com", "password": VALID_PASSWORD, "role": "customer",
        })
        token = client.post("/api/v1/auth/login", json={
            "email": "cust@test.com", "password": VALID_PASSWORD,
        }).json()["data"]["access_token"]

        resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service_id"],
            "problem_description": "Leaking pipe under kitchen sink",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St", "city": "Mumbai"},
        })
        assert resp.status_code == 201
        assert resp.json()["data"]["problem_images"] == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
