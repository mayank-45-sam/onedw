"""Integration tests for the recommendation engine (AI / nearby / fastest / similar).

Covers:
- /workers/recommended -> AI-scored ranking, distinct from plain rating sort
- /workers/fastest     -> online only, sorted by response time / ETA
- /workers/nearby      -> full enriched payload
- /workers?search=     -> keyword filter
- /search              -> budget / fastest / highest-rated picks
- /search/workers/{id}/similar -> kind-aware ranking
"""
import sys
import os
import uuid

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


def _create_worker(**kwargs):
    """Create a worker row directly in the DB, returning its id."""
    db = TestSessionLocal()
    from app.models.user import User, UserRole
    from app.models.worker import Worker
    from app.core.security import get_password_hash

    email = kwargs.pop("email", f"w_{uuid.uuid4().hex[:8]}@test.com")
    user = User(
        email=email,
        password_hash=get_password_hash("StrongPass1!"),
        role=UserRole.WORKER,
        is_active=True,
        is_verified=kwargs.pop("user_verified", True),
    )
    db.add(user)
    db.flush()

    worker = Worker(user_id=user.id, **kwargs)
    db.add(worker)
    db.flush()

    worker_id = worker.id
    db.commit()
    db.close()
    return worker_id


def _set_worker_fields(worker_id, **fields):
    db = TestSessionLocal()
    from app.models.worker import Worker

    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    for k, v in fields.items():
        setattr(worker, k, v)
    db.commit()
    db.close()


# ============================================================
# AI RECOMMENDED
# ============================================================

class TestRecommendedWorkers:
    def test_returns_ai_scored_payload(self, client):
        _create_worker(name="Pro A", profession="Plumber", hourly_rate=300, rating=4.5)
        resp = client.get("/api/v1/workers/recommended")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) >= 1
        w = data[0]
        assert "ai_score" in w
        assert "trust_score" in w
        assert "verification_badge" in w
        assert "response_time_minutes" in w
        assert "eta_minutes" in w
        assert "availability_status" in w

    def test_ranks_by_ai_score_not_plain_rating(self, client):
        # A: strong all-round profile; B: high rating but poor everywhere else
        a = _create_worker(name="Strong A", profession="Electrician", hourly_rate=400,
                           rating=4.6, completed_jobs=400, experience_years=8,
                           review_count=150, is_online=True)
        b = _create_worker(name="Rated B", profession="Electrician", hourly_rate=500,
                           rating=5.0, completed_jobs=0, experience_years=0,
                           review_count=0, is_online=False)
        _set_worker_fields(a, verification_badge="gold", aadhaar_verified=True)
        _set_worker_fields(b, verification_badge=None, aadhaar_verified=False)

        resp = client.get("/api/v1/workers/recommended")
        data = resp.json()["data"]
        names = [w["name"] for w in data]
        assert names.index("Strong A") < names.index("Rated B")

    def test_budget_filter(self, client):
        _create_worker(name="Cheap", profession="Painter", hourly_rate=200)
        _create_worker(name="Expensive", profession="Painter", hourly_rate=900)
        resp = client.get("/api/v1/workers/recommended", params={"budget": 300})
        data = resp.json()["data"]
        assert all(w["hourly_rate"] <= 300 for w in data)
        assert any(w["name"] == "Cheap" for w in data)


# ============================================================
# FASTEST
# ============================================================

class TestFastestWorkers:
    def test_online_only(self, client):
        _create_worker(name="Online", profession="Plumber", hourly_rate=300, is_online=True)
        _create_worker(name="Offline", profession="Plumber", hourly_rate=300, is_online=False)
        resp = client.get("/api/v1/workers/fastest")
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["name"] == "Online"

    def test_sorted_by_response_time(self, client):
        # More completed jobs -> faster estimated response -> first
        _create_worker(name="Slow", profession="Plumber", hourly_rate=300,
                       is_online=True, completed_jobs=0)
        _create_worker(name="Fast", profession="Plumber", hourly_rate=300,
                       is_online=True, completed_jobs=600)
        resp = client.get("/api/v1/workers/fastest")
        data = resp.json()["data"]
        assert len(data) == 2
        assert data[0]["name"] == "Fast"
        assert data[0]["response_time_minutes"] <= data[1]["response_time_minutes"]

    def test_eta_and_distance_when_location_provided(self, client):
        _create_worker(name="Near", profession="Plumber", hourly_rate=300, is_online=True)
        resp = client.get("/api/v1/workers/fastest", params={"lat": 12.97, "lng": 77.59})
        data = resp.json()["data"]
        assert data[0]["name"] == "Near"
        assert "eta_minutes" in data[0]


# ============================================================
# NEARBY (enriched payload)
# ============================================================

class TestNearbyEnriched:
    def test_nearby_includes_trust_and_eta(self, client):
        db = TestSessionLocal()
        from app.models.user import User, UserRole
        from app.models.worker import Worker
        from app.models.worker_location import WorkerLocation
        from app.core.security import get_password_hash

        user = User(email="loc@test.com", password_hash=get_password_hash("StrongPass1!"),
                    role=UserRole.WORKER, is_active=True, is_verified=True)
        db.add(user)
        db.flush()
        worker = Worker(user_id=user.id, name="Located Pro", profession="Plumber",
                        hourly_rate=300, is_online=True, completed_jobs=50)
        db.add(worker)
        db.flush()
        db.add(WorkerLocation(worker_id=worker.id, latitude=12.9716, longitude=77.5946))
        db.commit()
        db.close()

        resp = client.get("/api/v1/workers/nearby", params={"lat": 12.9716, "lng": 77.5946})
        assert resp.status_code == 200
        w = resp.json()["data"][0]
        assert w["name"] == "Located Pro"
        assert "distance" in w
        assert "trust_score" in w
        assert "verification_badge" in w
        assert "eta_minutes" in w
        assert "response_time_minutes" in w


# ============================================================
# LIST SEARCH
# ============================================================

class TestWorkerSearch:
    def test_search_by_profession(self, client):
        _create_worker(name="Alice", profession="Plumber", hourly_rate=300)
        _create_worker(name="Bob", profession="Electrician", hourly_rate=400)
        resp = client.get("/api/v1/workers", params={"search": "plumb"})
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["name"] == "Alice"

    def test_search_by_name(self, client):
        _create_worker(name="Alice", profession="Plumber", hourly_rate=300)
        resp = client.get("/api/v1/workers", params={"search": "alic"})
        assert len(resp.json()["data"]) == 1

    def test_search_no_results(self, client):
        _create_worker(name="Alice", profession="Plumber", hourly_rate=300)
        resp = client.get("/api/v1/workers", params={"search": "zzznothing"})
        assert resp.json()["data"] == []

    def test_sort_mapping(self, client):
        _create_worker(name="Cheap", profession="Plumber", hourly_rate=100)
        _create_worker(name="Pricey", profession="Plumber", hourly_rate=500)
        resp = client.get("/api/v1/workers", params={"sort_by": "price_asc"})
        data = resp.json()["data"]
        assert data[0]["name"] == "Cheap"


# ============================================================
# SEARCH PICKS (budget / fastest / highest-rated)
# ============================================================

class TestSearchPicks:
    def test_returns_three_picks(self, client):
        _create_worker(name="W1", profession="Plumber", hourly_rate=300)
        resp = client.get("/api/v1/search", params={"q": "plumb"})
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "budgetWorker" in data
        assert "fastestWorker" in data
        assert "highestRatedWorker" in data

    def test_pick_strategies(self, client):
        _create_worker(name="BudgetPick", profession="Plumber", hourly_rate=100, rating=4.0)
        _create_worker(name="FastPick", profession="Plumber", hourly_rate=300,
                       rating=4.0, is_online=True, completed_jobs=500)
        _create_worker(name="RatedPick", profession="Plumber", hourly_rate=300, rating=4.9)
        resp = client.get("/api/v1/search", params={"q": "plumb"})
        data = resp.json()["data"]
        assert data["budgetWorker"]["name"] == "BudgetPick"
        assert data["highestRatedWorker"]["name"] == "RatedPick"
        assert data["fastestWorker"]["name"] == "FastPick"

    def test_picks_none_when_no_workers(self, client):
        resp = client.get("/api/v1/search", params={"q": "zzznothing"})
        data = resp.json()["data"]
        assert data["budgetWorker"] is None
        assert data["fastestWorker"] is None
        assert data["highestRatedWorker"] is None


# ============================================================
# SIMILAR WORKERS (kind-aware)
# ============================================================

class TestSimilarWorkersKind:
    def _seed(self, client):
        base = _create_worker(name="Base", profession="Plumber", hourly_rate=300)
        _set_worker_fields(base, category_ids=["cat1"])
        cheap = _create_worker(name="Cheap", profession="Plumber", hourly_rate=150)
        _set_worker_fields(cheap, category_ids=["cat1"])
        pricey = _create_worker(name="Pricey", profession="Plumber", hourly_rate=700)
        _set_worker_fields(pricey, category_ids=["cat1"])
        return base

    def test_budget_kind_returns_cheapest_first(self, client):
        base = self._seed(client)
        resp = client.get(f"/api/v1/search/workers/{base}/similar", params={"kind": "budget"})
        items = resp.json()["data"]["items"]
        assert items[0]["name"] == "Cheap"

    def test_premium_kind_returns_priciest_first(self, client):
        base = self._seed(client)
        resp = client.get(f"/api/v1/search/workers/{base}/similar", params={"kind": "premium"})
        items = resp.json()["data"]["items"]
        assert items[0]["name"] == "Pricey"

    def test_similar_kind_orders_by_rating(self, client):
        base = _create_worker(name="Base", profession="Plumber", hourly_rate=300)
        _set_worker_fields(base, category_ids=["cat1"])
        good = _create_worker(name="Good", profession="Plumber", hourly_rate=300, rating=4.8)
        _set_worker_fields(good, category_ids=["cat1"])
        ok = _create_worker(name="Ok", profession="Plumber", hourly_rate=300, rating=4.2)
        _set_worker_fields(ok, category_ids=["cat1"])
        resp = client.get(f"/api/v1/search/workers/{base}/similar", params={"kind": "similar"})
        items = resp.json()["data"]["items"]
        assert items[0]["name"] == "Good"

    def test_nearby_kind_returns_online_first(self, client):
        base = _create_worker(name="Base", profession="Plumber", hourly_rate=300)
        _set_worker_fields(base, category_ids=["cat1"])
        offline = _create_worker(name="Offline", profession="Plumber", hourly_rate=300)
        _set_worker_fields(offline, category_ids=["cat1"], is_online=False)
        online = _create_worker(name="Online", profession="Plumber", hourly_rate=300)
        _set_worker_fields(online, category_ids=["cat1"], is_online=True)
        resp = client.get(f"/api/v1/search/workers/{base}/similar", params={"kind": "nearby"})
        items = resp.json()["data"]["items"]
        assert items[0]["name"] == "Online"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
