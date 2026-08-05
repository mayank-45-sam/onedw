"""Integration tests for the fake Payment system."""
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


def register_customer(client, email="cust@test.com", name="Test Customer"):
    return client.post("/api/v1/auth/register", json={
        "name": name, "email": email, "password": VALID_PASSWORD, "role": "customer",
    })


def login_user(client, email="cust@test.com", password=VALID_PASSWORD):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def create_seed_data():
    db = TestSessionLocal()
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

    user_c = User(
        email="cust@test.com", password_hash=get_password_hash(VALID_PASSWORD),
        role=UserRole.CUSTOMER, is_active=True, is_verified=True,
    )
    db.add(user_c)
    db.flush()

    customer = Customer(user_id=user_c.id, name="Test Customer")
    db.add(customer)
    db.flush()

    cat_id = cat.id
    svc_id = svc.id
    cust_id = customer.id
    db.commit()
    db.close()

    return {
        "category_id": cat_id,
        "service_id": svc_id,
        "customer_id": cust_id,
    }


def _create_booking(client, seed, token):
    resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
        "service_id": seed["service_id"],
        "problem_description": "Leaking pipe needs fixing urgently",
        "scheduled_date": "2026-08-01",
        "scheduled_time": "10:00",
        "address": {"street": "123 Main St", "city": "Mumbai"},
    })
    return resp.json()["data"]["id"]


# ============================================================
# PAYMENT PROCESSING TESTS
# ============================================================

class TestPaymentProcess:
    def test_successful_card_payment(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "card",
            "card_number": "4242424242424242",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["payment_status"] == "paid"
        assert data["data"]["transaction_id"] is not None
        assert data["data"]["transaction_id"].startswith("TXN")
        assert data["data"]["payment_method"] == "card"
        assert data["data"]["amount"] == 500.0

    def test_successful_upi_payment(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "upi",
            "upi_id": "user@okaxis",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["payment_method"] == "upi"
        assert data["data"]["payment_status"] == "paid"

    def test_successful_wallet_payment(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "wallet",
        })
        assert resp.status_code == 200
        assert resp.json()["success"] is True
        assert resp.json()["data"]["payment_method"] == "wallet"

    def test_successful_cash_payment(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "cash",
        })
        assert resp.status_code == 200
        assert resp.json()["success"] is True
        assert resp.json()["data"]["payment_method"] == "cash"

    def test_already_paid_booking(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "card",
            "card_number": "4242424242424242",
        })

        resp = client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "upi",
        })
        assert resp.status_code == 400
        assert "already completed" in str(resp.json()).lower()

    def test_invalid_payment_method(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "bitcoin",
        })
        assert resp.status_code == 422

    def test_nonexistent_booking(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]

        resp = client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": "nonexistent-id",
            "payment_method": "card",
            "card_number": "4242424242424242",
        })
        assert resp.status_code == 404

    def test_requires_customer_role(self, client):
        seed = create_seed_data()

        from app.core.security import get_password_hash
        from app.models.user import User, UserRole
        db = TestSessionLocal()
        user_w = User(
            email="worker@test.com", password_hash=get_password_hash(VALID_PASSWORD),
            role=UserRole.WORKER, is_active=True, is_verified=True,
        )
        db.add(user_w)
        db.commit()
        db.close()

        from tests.test_db_setup import TestSessionLocal as TSL
        token = login_user(client, email="worker@test.com").json()["data"]["access_token"]

        resp = client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": "some-id",
            "payment_method": "card",
        })
        assert resp.status_code == 403

    def test_card_declined(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "card",
            "card_number": "4000000000000002",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert data["data"]["payment_status"] == "failed"
        assert data["data"]["transaction_id"] is None
        assert "declined" in data["message"].lower()

    def test_payment_updates_booking(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "card",
            "card_number": "4242424242424242",
        })

        resp = client.get(f"/api/v1/bookings/{booking_id}", headers=auth_header(token))
        assert resp.status_code == 200
        booking = resp.json()["data"]
        assert booking["payment_status"] == "paid"
        assert booking["payment_method"] == "card"
        assert booking["transaction_id"] is not None
        assert booking["paid_at"] is not None


# ============================================================
# PAYMENT STATUS TESTS
# ============================================================

class TestPaymentStatus:
    def test_get_payment_status_unpaid(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.get(f"/api/v1/payments/{booking_id}/status", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["payment_status"] == "unpaid"
        assert data["transaction_id"] is None

    def test_get_payment_status_paid(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "upi",
        })

        resp = client.get(f"/api/v1/payments/{booking_id}/status", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["payment_status"] == "paid"
        assert data["payment_method"] == "upi"
        assert data["transaction_id"] is not None
        assert data["paid_at"] is not None

    def test_get_payment_status_wrong_customer(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        register_customer(client, email="other@test.com", name="Other User")
        token2 = login_user(client, email="other@test.com").json()["data"]["access_token"]

        resp = client.get(f"/api/v1/payments/{booking_id}/status", headers=auth_header(token2))
        assert resp.status_code == 403

    def test_get_payment_status_nonexistent(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]

        resp = client.get("/api/v1/payments/nonexistent/status", headers=auth_header(token))
        assert resp.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
