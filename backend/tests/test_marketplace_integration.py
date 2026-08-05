"""Integration tests for Phase 2.4 - Marketplace Core."""
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


def register_customer(client, email="test@example.com", name="Test User", phone=None):
    payload = {
        "name": name,
        "email": email,
        "password": VALID_PASSWORD,
        "role": "customer",
    }
    if phone:
        payload["phone"] = phone
    return client.post("/api/v1/auth/register", json=payload)


def login_user(client, email="test@example.com", password=VALID_PASSWORD):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def auth_header(access_token):
    return {"Authorization": f"Bearer {access_token}"}


def create_seed_data():
    """Insert seed data directly into DB for testing."""
    db = TestSessionLocal()
    from app.models.category import Category
    from app.models.service import Service
    from app.models.worker import Worker
    from app.models.user import User, UserRole
    from app.models.customer import Customer
    from app.core.security import get_password_hash
    import uuid

    cat1 = Category(name="Plumbing", slug="plumbing", description="Plumbing services", service_count=2)
    cat2 = Category(name="Electrical", slug="electrical", description="Electrical services", service_count=1)
    db.add_all([cat1, cat2])
    db.flush()

    svc1 = Service(
        name="Pipe Repair", slug="pipe-repair", description="Fix leaking pipes",
        category_id=cat1.id, base_price=500.0, duration=60, rating=4.5, review_count=10,
        popular=True, trending=False,
    )
    svc2 = Service(
        name="Drain Cleaning", slug="drain-cleaning", description="Clean blocked drains",
        category_id=cat1.id, base_price=800.0, duration=90, rating=4.0, review_count=5,
        popular=False, trending=True,
    )
    svc3 = Service(
        name="Wiring", slug="wiring", description="House wiring",
        category_id=cat2.id, base_price=1200.0, duration=120, rating=4.8, review_count=20,
        popular=True, trending=True,
    )
    db.add_all([svc1, svc2, svc3])
    db.flush()

    user_w = User(
        email="worker@test.com", password_hash=get_password_hash(VALID_PASSWORD),
        role=UserRole.WORKER, is_active=True, is_verified=True,
    )
    db.add(user_w)
    db.flush()

    worker = Worker(
        user_id=user_w.id, name="Pro Worker", profession="Plumber",
        bio="Expert plumber", experience_years=5, completed_jobs=50,
        rating=4.7, review_count=45, hourly_rate=600.0, is_online=True,
        category_ids=[cat1.id],
    )
    db.add(worker)
    db.flush()

    user_c = User(
        email="customer@test.com", password_hash=get_password_hash(VALID_PASSWORD),
        role=UserRole.CUSTOMER, is_active=True, is_verified=True,
    )
    db.add(user_c)
    db.flush()

    customer = Customer(user_id=user_c.id, name="Test Customer")
    db.add(customer)

    from app.models.coupon import Coupon
    from app.core.security import utc_now
    from datetime import timedelta
    coupon = Coupon(
        code="SAVE10", title="10% Off", type="percentage", value=10.0,
        max_discount=200.0, min_order=100.0,
        valid_from=utc_now() - timedelta(days=1),
        valid_until=utc_now() + timedelta(days=30),
        usage_limit=10, used_count=0, is_active=True,
    )
    coupon_high_min = Coupon(
        code="MINORDER", title="High Min Order", type="percentage", value=10.0,
        max_discount=200.0, min_order=1000.0,
        valid_from=utc_now() - timedelta(days=1),
        valid_until=utc_now() + timedelta(days=30),
        usage_limit=10, used_count=0, is_active=True,
    )
    db.add_all([coupon, coupon_high_min])
    db.flush()

    cat1_id = cat1.id
    cat2_id = cat2.id
    svc1_id = svc1.id
    svc2_id = svc2.id
    svc3_id = svc3.id
    worker_id = worker.id
    customer_id = customer.id

    db.commit()
    db.close()
    return {
        "category_id": cat1_id,
        "category2_id": cat2_id,
        "service_id": svc1_id,
        "service2_id": svc2_id,
        "service3_id": svc3_id,
        "worker_id": worker_id,
        "customer_id": customer_id,
        "coupon_code": "SAVE10",
        "worker_email": "worker@test.com",
        "customer_email": "customer@test.com",
    }


# ============================================================
# CATEGORY TESTS
# ============================================================

class TestCategories:
    def test_list_categories(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/categories")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["total"] == 2
        assert len(data["data"]) == 2

    def test_list_categories_pagination(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/categories?page=1&limit=1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert len(data["data"]) == 1
        assert data["pages"] == 2

    def test_get_category_by_id(self, client):
        seed = create_seed_data()
        resp = client.get(f"/api/v1/categories/{seed['category_id']}")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["name"] == "Plumbing"
        assert data["slug"] == "plumbing"

    def test_get_category_not_found(self, client):
        resp = client.get("/api/v1/categories/nonexistent")
        assert resp.status_code == 404


# ============================================================
# SERVICE TESTS
# ============================================================

class TestServices:
    def test_list_services(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/services")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3

    def test_filter_by_category(self, client):
        seed = create_seed_data()
        resp = client.get(f"/api/v1/services?category_id={seed['category_id']}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2

    def test_filter_by_price_range(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/services?min_price=600&max_price=1000")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["data"][0]["name"] == "Drain Cleaning"

    def test_filter_by_rating(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/services?min_rating=4.5")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2

    def test_search_services(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/services?search=Pipe")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["data"][0]["name"] == "Pipe Repair"

    def test_sort_by_price_asc(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/services?sort_by=price_asc")
        assert resp.status_code == 200
        prices = [s["base_price"] for s in resp.json()["data"]]
        assert prices == sorted(prices)

    def test_sort_by_price_desc(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/services?sort_by=price_desc")
        assert resp.status_code == 200
        prices = [s["base_price"] for s in resp.json()["data"]]
        assert prices == sorted(prices, reverse=True)

    def test_get_service_by_id(self, client):
        seed = create_seed_data()
        resp = client.get(f"/api/v1/services/{seed['service_id']}")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["name"] == "Pipe Repair"
        assert data["category"] is not None
        assert data["category"]["name"] == "Plumbing"

    def test_get_service_not_found(self, client):
        resp = client.get("/api/v1/services/nonexistent")
        assert resp.status_code == 404

    def test_list_by_category_endpoint(self, client):
        seed = create_seed_data()
        resp = client.get(f"/api/v1/services/category/{seed['category_id']}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2


# ============================================================
# WORKER TESTS
# ============================================================

class TestWorkers:
    def test_list_workers(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/workers")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["data"][0]["name"] == "Pro Worker"

    def test_filter_by_min_rating(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/workers?min_rating=4.0")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_filter_by_max_price(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/workers?max_price=500")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_filter_by_experience(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/workers?min_experience=3")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_sort_by_rating(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/workers?sort_by=rating")
        assert resp.status_code == 200

    def test_sort_by_price(self, client):
        seed = create_seed_data()
        resp = client.get("/api/v1/workers?sort_by=price_asc")
        assert resp.status_code == 200

    def test_get_worker_by_id(self, client):
        seed = create_seed_data()
        resp = client.get(f"/api/v1/workers/{seed['worker_id']}")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["name"] == "Pro Worker"
        assert data["skills"] is not None
        assert data["languages"] is not None

    def test_get_worker_not_found(self, client):
        resp = client.get("/api/v1/workers/nonexistent")
        assert resp.status_code == 404


# ============================================================
# BOOKING TESTS
# ============================================================

class TestBookings:
    def test_create_booking(self, client):
        seed = create_seed_data()
        login_resp = login_user(client, email=seed["customer_email"])
        token = login_resp.json()["data"]["access_token"]

        resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service_id"],
            "worker_id": seed["worker_id"],
            "problem_description": "My pipes are leaking badly",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St", "city": "Mumbai"},
        })
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["status"] == "pending"
        assert data["price"] == 500.0
        assert data["final_price"] == 500.0

    def test_create_booking_with_coupon(self, client):
        seed = create_seed_data()
        login_resp = login_user(client, email=seed["customer_email"])
        token = login_resp.json()["data"]["access_token"]

        resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service_id"],
            "problem_description": "Leaking tap",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "14:00",
            "address": {"street": "456 Oak St", "city": "Delhi"},
            "coupon_code": "SAVE10",
        })
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["coupon_code"] == "SAVE10"
        assert data["discount"] == 50.0
        assert data["final_price"] == 450.0

    def test_create_booking_invalid_coupon(self, client):
        seed = create_seed_data()
        login_resp = login_user(client, email=seed["customer_email"])
        token = login_resp.json()["data"]["access_token"]

        resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service_id"],
            "problem_description": "Leaking tap",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "14:00",
            "address": {"street": "456 Oak St", "city": "Delhi"},
            "coupon_code": "INVALID",
        })
        assert resp.status_code == 400

    def test_create_booking_invalid_service(self, client):
        seed = create_seed_data()
        login_resp = login_user(client, email=seed["customer_email"])
        token = login_resp.json()["data"]["access_token"]

        resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": "nonexistent",
            "problem_description": "Something",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "14:00",
            "address": {"street": "123 Main St"},
        })
        assert resp.status_code == 404

    def test_create_booking_requires_customer(self, client):
        seed = create_seed_data()
        login_resp = login_user(client, email=seed["worker_email"])
        token = login_resp.json()["data"]["access_token"]

        resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service_id"],
            "problem_description": "Something",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "14:00",
            "address": {"street": "123 Main St"},
        })
        assert resp.status_code == 403

    def test_get_booking(self, client):
        seed = create_seed_data()
        login_resp = login_user(client, email=seed["customer_email"])
        token = login_resp.json()["data"]["access_token"]

        create_resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service_id"],
            "worker_id": seed["worker_id"],
            "problem_description": "Leaking pipe",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St"},
        })
        booking_id = create_resp.json()["data"]["id"]

        resp = client.get(f"/api/v1/bookings/{booking_id}", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["id"] == booking_id
        assert data["service"] is not None

    def test_get_my_bookings(self, client):
        seed = create_seed_data()
        login_resp = login_user(client, email=seed["customer_email"])
        token = login_resp.json()["data"]["access_token"]

        client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service_id"],
            "worker_id": seed["worker_id"],
            "problem_description": "Issue 1",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St"},
        })

        resp = client.get("/api/v1/bookings/my-bookings", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1

    def test_update_booking_status(self, client):
        seed = create_seed_data()
        cust_resp = login_user(client, email=seed["customer_email"])
        cust_token = cust_resp.json()["data"]["access_token"]

        create_resp = client.post("/api/v1/bookings", headers=auth_header(cust_token), json={
            "service_id": seed["service_id"],
            "worker_id": seed["worker_id"],
            "problem_description": "Leaking pipe",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St"},
        })
        booking_id = create_resp.json()["data"]["id"]

        work_resp = login_user(client, email=seed["worker_email"])
        work_token = work_resp.json()["data"]["access_token"]

        resp = client.patch(
            f"/api/v1/bookings/{booking_id}/status",
            headers=auth_header(work_token),
            json={"status": "accepted", "note": "Will be there soon"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "accepted"

    def test_invalid_status_transition(self, client):
        seed = create_seed_data()
        cust_resp = login_user(client, email=seed["customer_email"])
        cust_token = cust_resp.json()["data"]["access_token"]

        create_resp = client.post("/api/v1/bookings", headers=auth_header(cust_token), json={
            "service_id": seed["service_id"],
            "worker_id": seed["worker_id"],
            "problem_description": "Leaking pipe",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St"},
        })
        booking_id = create_resp.json()["data"]["id"]

        work_resp = login_user(client, email=seed["worker_email"])
        work_token = work_resp.json()["data"]["access_token"]

        resp = client.patch(
            f"/api/v1/bookings/{booking_id}/status",
            headers=auth_header(work_token),
            json={"status": "completed"},
        )
        assert resp.status_code == 400


# ============================================================
# REVIEW TESTS
# ============================================================

class TestReviews:
    def _create_completed_booking(self, client, seed):
        cust_resp = login_user(client, email=seed["customer_email"])
        cust_token = cust_resp.json()["data"]["access_token"]
        cust_headers = auth_header(cust_token)

        create_resp = client.post("/api/v1/bookings", headers=cust_headers, json={
            "service_id": seed["service_id"],
            "worker_id": seed["worker_id"],
            "problem_description": "Leaking pipe",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St"},
        })
        booking_id = create_resp.json()["data"]["id"]

        work_resp = login_user(client, email=seed["worker_email"])
        work_token = work_resp.json()["data"]["access_token"]
        work_headers = auth_header(work_token)

        transitions = ["accepted", "worker-assigned", "worker-on-the-way", "arrived", "started-work", "completed"]
        for status in transitions:
            client.patch(
                f"/api/v1/bookings/{booking_id}/status",
                headers=work_headers,
                json={"status": status},
            )

        return booking_id, cust_headers

    def test_create_review(self, client):
        seed = create_seed_data()
        booking_id, cust_headers = self._create_completed_booking(client, seed)

        resp = client.post("/api/v1/reviews", headers=cust_headers, json={
            "booking_id": booking_id,
            "rating": 4.5,
            "behaviour": 5,
            "quality": 4,
            "price": 4,
            "time": 5,
            "comment": "Great work!",
            "recommends": True,
        })
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["rating"] == 4.5
        assert data["comment"] == "Great work!"

    def test_cannot_review_twice(self, client):
        seed = create_seed_data()
        booking_id, cust_headers = self._create_completed_booking(client, seed)

        client.post("/api/v1/reviews", headers=cust_headers, json={
            "booking_id": booking_id,
            "rating": 4.0,
            "behaviour": 4,
            "quality": 4,
            "price": 4,
            "time": 4,
        })

        resp = client.post("/api/v1/reviews", headers=cust_headers, json={
            "booking_id": booking_id,
            "rating": 3.0,
            "behaviour": 3,
            "quality": 3,
            "price": 3,
            "time": 3,
        })
        assert resp.status_code == 400

    def test_cannot_review_incomplete_booking(self, client):
        seed = create_seed_data()
        cust_resp = login_user(client, email=seed["customer_email"])
        cust_token = cust_resp.json()["data"]["access_token"]

        create_resp = client.post("/api/v1/bookings", headers=auth_header(cust_token), json={
            "service_id": seed["service_id"],
            "worker_id": seed["worker_id"],
            "problem_description": "Leaking pipe",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St"},
        })
        booking_id = create_resp.json()["data"]["id"]

        resp = client.post("/api/v1/reviews", headers=auth_header(cust_token), json={
            "booking_id": booking_id,
            "rating": 4.0,
            "behaviour": 4,
            "quality": 4,
            "price": 4,
            "time": 4,
        })
        assert resp.status_code == 400

    def test_get_worker_reviews(self, client):
        seed = create_seed_data()
        booking_id, cust_headers = self._create_completed_booking(client, seed)

        client.post("/api/v1/reviews", headers=cust_headers, json={
            "booking_id": booking_id,
            "rating": 4.5,
            "behaviour": 5,
            "quality": 4,
            "price": 4,
            "time": 5,
            "comment": "Excellent service",
        })

        resp = client.get(f"/api/v1/reviews/worker/{seed['worker_id']}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["average_rating"] == 4.5
        assert data["review_count"] == 1


# ============================================================
# COUPON VALIDATION TESTS
# ============================================================

class TestCoupons:
    def test_coupon_min_order_not_met(self, client):
        seed = create_seed_data()
        login_resp = login_user(client, email=seed["customer_email"])
        token = login_resp.json()["data"]["access_token"]

        resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service_id"],
            "problem_description": "Small job",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St"},
            "coupon_code": "MINORDER",
        })
        assert resp.status_code == 400
        body = resp.json()
        error_text = str(body)
        assert "Minimum order" in error_text

    def test_coupon_applies_percentage(self, client):
        seed = create_seed_data()
        login_resp = login_user(client, email=seed["customer_email"])
        token = login_resp.json()["data"]["access_token"]

        resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service3_id"],
            "problem_description": "Wiring job",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St"},
            "coupon_code": "SAVE10",
        })
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["discount"] == 120.0
        assert data["final_price"] == 1080.0


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
