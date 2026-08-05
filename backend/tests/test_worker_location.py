"""Integration tests for worker location + nearby workers (Phase 2.7)."""
import sys
import os

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


def _create_worker(client, email="worker@test.com", name="Test Worker"):
    """Create a worker directly in DB (registration blocks worker role), then login."""
    db = TestSessionLocal()
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash

    user = User(
        email=email, password_hash=get_password_hash(VALID_PASSWORD),
        role=UserRole.WORKER, is_active=True, is_verified=True,
    )
    db.add(user)
    db.flush()

    from app.models.worker import Worker
    worker = Worker(user_id=user.id, name=name, profession="Plumber", hourly_rate=300)
    db.add(worker)
    db.commit()
    db.close()

    resp = client.post("/api/v1/auth/login", json={"email": email, "password": VALID_PASSWORD})
    return resp.json()["data"]["access_token"]


def _create_worker_in_db(email="worker@test.com", name="Test Worker", lat=None, lng=None):
    db = TestSessionLocal()
    from app.models.user import User, UserRole
    from app.models.worker import Worker
    from app.core.security import get_password_hash

    user = User(
        email=email, password_hash=get_password_hash(VALID_PASSWORD),
        role=UserRole.WORKER, is_active=True, is_verified=True,
    )
    db.add(user)
    db.flush()

    worker = Worker(user_id=user.id, name=name, profession="Plumber", hourly_rate=300)
    db.add(worker)
    db.flush()

    if lat is not None and lng is not None:
        from app.models.worker_location import WorkerLocation
        loc = WorkerLocation(worker_id=worker.id, latitude=lat, longitude=lng)
        db.add(loc)

    db.commit()
    worker_id = worker.id
    db.close()
    return worker_id


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# ============================================================
# WORKER LOCATION TESTS
# ============================================================

class TestWorkerLocationUpdate:
    def test_update_location(self, client):
        token = _create_worker(client)
        resp = client.put("/api/v1/workers/location", headers=auth_header(token), json={
            "latitude": 12.9716,
            "longitude": 77.5946,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["latitude"] == 12.9716
        assert data["data"]["longitude"] == 77.5946

    def test_update_location_overwrites(self, client):
        token = _create_worker(client)

        client.put("/api/v1/workers/location", headers=auth_header(token), json={
            "latitude": 12.9716, "longitude": 77.5946,
        })
        resp = client.put("/api/v1/workers/location", headers=auth_header(token), json={
            "latitude": 19.0760, "longitude": 72.8777,
        })
        assert resp.status_code == 200
        assert resp.json()["data"]["latitude"] == 19.0760

    def test_location_persisted_in_db(self, client):
        token = _create_worker(client)
        client.put("/api/v1/workers/location", headers=auth_header(token), json={
            "latitude": 28.6139, "longitude": 77.2090,
        })

        db = TestSessionLocal()
        from app.models.worker_location import WorkerLocation
        loc = db.query(WorkerLocation).first()
        assert loc is not None
        assert loc.latitude == 28.6139
        assert loc.longitude == 77.2090
        db.close()

    def test_requires_worker_role(self, client):
        client.post("/api/v1/auth/register", json={
            "name": "Cust", "email": "cust@test.com", "password": VALID_PASSWORD, "role": "customer",
        })
        token = client.post("/api/v1/auth/login", json={
            "email": "cust@test.com", "password": VALID_PASSWORD,
        }).json()["data"]["access_token"]

        resp = client.put("/api/v1/workers/location", headers=auth_header(token), json={
            "latitude": 12.97, "longitude": 77.59,
        })
        assert resp.status_code == 403

    def test_invalid_latitude(self, client):
        token = _create_worker(client)
        resp = client.put("/api/v1/workers/location", headers=auth_header(token), json={
            "latitude": 999, "longitude": 77.59,
        })
        assert resp.status_code == 422

    def test_invalid_longitude(self, client):
        token = _create_worker(client)
        resp = client.put("/api/v1/workers/location", headers=auth_header(token), json={
            "latitude": 12.97, "longitude": 999,
        })
        assert resp.status_code == 422


# ============================================================
# NEARBY WORKERS TESTS
# ============================================================

class TestNearbyWorkers:
    def test_nearby_workers_basic(self, client):
        _create_worker_in_db("w1@test.com", "Plumber A", lat=12.9716, lng=77.5946)
        _create_worker_in_db("w2@test.com", "Plumber B", lat=12.9800, lng=77.6000)
        _create_worker_in_db("w3@test.com", "Plumber C", lat=19.0760, lng=72.8777)

        resp = client.get("/api/v1/workers/nearby", params={
            "lat": 12.9716, "lng": 77.5946, "radius": 10,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        ids = [w["id"] for w in data["data"]]
        assert len(data["data"]) == 2
        assert "distance" in data["data"][0]

    def test_nearby_sorted_by_distance(self, client):
        _create_worker_in_db("w1@test.com", "Close", lat=12.9716, lng=77.5946)
        _create_worker_in_db("w2@test.com", "Medium", lat=12.9750, lng=77.5980)
        _create_worker_in_db("w3@test.com", "Far", lat=19.0760, lng=72.8777)

        resp = client.get("/api/v1/workers/nearby", params={
            "lat": 12.9716, "lng": 77.5946, "radius": 50,
        })
        data = resp.json()["data"]
        assert len(data) == 2
        assert data[0]["distance"] <= data[1]["distance"]

    def test_nearby_radius_filter(self, client):
        _create_worker_in_db("w1@test.com", "Near", lat=12.9716, lng=77.5946)
        _create_worker_in_db("w2@test.com", "Far", lat=19.0760, lng=72.8777)

        resp = client.get("/api/v1/workers/nearby", params={
            "lat": 12.9716, "lng": 77.5946, "radius": 1,
        })
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["name"] == "Near"

    def test_nearby_limit(self, client):
        for i in range(5):
            _create_worker_in_db(f"w{i}@test.com", f"Worker {i}", lat=12.9716, lng=77.5946)

        resp = client.get("/api/v1/workers/nearby", params={
            "lat": 12.9716, "lng": 77.5946, "radius": 1, "limit": 3,
        })
        assert len(resp.json()["data"]) == 3

    def test_nearby_no_workers(self, client):
        resp = client.get("/api/v1/workers/nearby", params={
            "lat": 0.0, "lng": 0.0, "radius": 1,
        })
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    def test_nearby_workers_without_location_excluded(self, client):
        _create_worker_in_db("w1@test.com", "Located", lat=12.9716, lng=77.5946)
        _create_worker_in_db("w2@test.com", "No Location")

        resp = client.get("/api/v1/workers/nearby", params={
            "lat": 12.9716, "lng": 77.5946, "radius": 10,
        })
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["name"] == "Located"

    def test_nearby_response_fields(self, client):
        _create_worker_in_db("w1@test.com", "Plumber Pro", lat=12.9716, lng=77.5946)

        resp = client.get("/api/v1/workers/nearby", params={
            "lat": 12.9716, "lng": 77.5946, "radius": 10,
        })
        worker = resp.json()["data"][0]
        assert "id" in worker
        assert "name" in worker
        assert "profession" in worker
        assert "rating" in worker
        assert "hourly_rate" in worker
        assert "is_online" in worker
        assert "distance" in worker

    def test_nearby_invalid_lat(self, client):
        resp = client.get("/api/v1/workers/nearby", params={
            "lat": 999, "lng": 77.59, "radius": 10,
        })
        assert resp.status_code == 422

    def test_nearby_invalid_radius(self, client):
        resp = client.get("/api/v1/workers/nearby", params={
            "lat": 12.97, "lng": 77.59, "radius": -5,
        })
        assert resp.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
