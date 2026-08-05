"""Integration tests for refund + receipt (Phase 2.6)."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import patch
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

    data = {
        "category_id": cat.id,
        "service_id": svc.id,
        "customer_id": customer.id,
        "worker_id": worker.id,
    }
    db.commit()
    db.close()
    return data


def _create_booking(client, seed, token):
    resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
        "service_id": seed["service_id"],
        "problem_description": "Leaking pipe needs fixing urgently",
        "scheduled_date": "2026-08-01",
        "scheduled_time": "10:00",
        "address": {"street": "123 Main St", "city": "Mumbai"},
        "worker_id": seed["worker_id"],
    })
    return resp.json()["data"]["id"]


def _pay_booking(client, token, booking_id):
    return client.post("/api/v1/payments/process", headers=auth_header(token), json={
        "booking_id": booking_id,
        "payment_method": "card",
        "card_number": "4242424242424242",
    })


# ============================================================
# REFUND TESTS
# ============================================================

class TestPaymentRefund:
    def test_successful_refund(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        _pay_booking(client, token, booking_id)

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            resp = client.post(
                f"/api/v1/payments/{booking_id}/refund",
                headers=auth_header(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["message"] == "Refund successful"
        d = data["data"]
        assert d["payment_status"] == "refunded"
        assert d["status"] == "refunded"
        assert d["booking_id"] == booking_id
        assert d["transaction_id"] is not None
        assert d["refund_id"].startswith("REF-")
        assert d["refunded_at"] is not None

    def test_refund_updates_booking(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            client.post(f"/api/v1/payments/{booking_id}/refund", headers=auth_header(token))

        resp = client.get(f"/api/v1/bookings/{booking_id}", headers=auth_header(token))
        assert resp.status_code == 200
        booking = resp.json()["data"]
        assert booking["status"] == "refunded"
        assert booking["payment_status"] == "refunded"

    def test_refund_already_refunded_booking(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            client.post(f"/api/v1/payments/{booking_id}/refund", headers=auth_header(token))

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            resp = client.post(
                f"/api/v1/payments/{booking_id}/refund",
                headers=auth_header(token),
            )
        assert resp.status_code == 400
        assert "refund" in str(resp.json()).lower()

    def test_refund_unpaid_booking(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.post(
            f"/api/v1/payments/{booking_id}/refund",
            headers=auth_header(token),
        )
        assert resp.status_code == 400
        assert "paid" in str(resp.json()).lower()

    def test_refund_nonexistent_booking(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]

        resp = client.post(
            "/api/v1/payments/nonexistent/refund",
            headers=auth_header(token),
        )
        assert resp.status_code == 404

    def test_refund_wrong_customer(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        register_customer(client, email="other@test.com", name="Other User")
        token2 = login_user(client, email="other@test.com").json()["data"]["access_token"]

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            resp = client.post(
                f"/api/v1/payments/{booking_id}/refund",
                headers=auth_header(token2),
            )
        assert resp.status_code == 403

    def test_refund_requires_customer_role(self, client):
        seed = create_seed_data()
        from app.core.security import get_password_hash
        from app.models.user import User, UserRole
        db = TestSessionLocal()
        user_w = User(
            email="worker2@test.com", password_hash=get_password_hash(VALID_PASSWORD),
            role=UserRole.WORKER, is_active=True, is_verified=True,
        )
        db.add(user_w)
        db.commit()
        db.close()

        token = login_user(client, email="worker2@test.com").json()["data"]["access_token"]
        resp = client.post(
            "/api/v1/payments/some-id/refund",
            headers=auth_header(token),
        )
        assert resp.status_code == 403

    def test_refund_creates_status_history(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            client.post(f"/api/v1/payments/{booking_id}/refund", headers=auth_header(token))

        db = TestSessionLocal()
        from app.models.booking_status_history import BookingStatusHistory
        history = (
            db.query(BookingStatusHistory)
            .filter(BookingStatusHistory.booking_id == booking_id)
            .all()
        )
        statuses = [h.status for h in history]
        assert "refunded" in statuses
        refunded_entry = [h for h in history if h.status == "refunded"][0]
        assert "REF-" in (refunded_entry.note or "")
        db.close()

    def test_refund_keeps_original_transaction_id(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        status_before = client.get(
            f"/api/v1/payments/{booking_id}/status",
            headers=auth_header(token),
        ).json()["data"]
        original_txn = status_before["transaction_id"]

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            resp = client.post(
                f"/api/v1/payments/{booking_id}/refund",
                headers=auth_header(token),
            )

        assert resp.json()["data"]["transaction_id"] == original_txn

    def test_refund_failed_booking(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "card",
            "card_number": "4000000000000002",
        })

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            resp = client.post(
                f"/api/v1/payments/{booking_id}/refund",
                headers=auth_header(token),
            )
        assert resp.status_code == 400

    def test_payment_status_after_refund(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            client.post(f"/api/v1/payments/{booking_id}/refund", headers=auth_header(token))

        resp = client.get(
            f"/api/v1/payments/{booking_id}/status",
            headers=auth_header(token),
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["payment_status"] == "refunded"

    def test_double_refund_blocked(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            resp1 = client.post(f"/api/v1/payments/{booking_id}/refund", headers=auth_header(token))
        assert resp1.status_code == 200

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            resp2 = client.post(f"/api/v1/payments/{booking_id}/refund", headers=auth_header(token))
        assert resp2.status_code == 400
        body = resp2.json()
        assert "already refunded" in str(body).lower()

    def test_refund_only_paid_booking(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.post(
            f"/api/v1/payments/{booking_id}/refund",
            headers=auth_header(token),
        )
        assert resp.status_code == 400
        assert "only paid" in str(resp.json()).lower()

    def test_refund_sets_timestamp(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            resp = client.post(f"/api/v1/payments/{booking_id}/refund", headers=auth_header(token))

        assert resp.status_code == 200
        d = resp.json()["data"]
        assert d["refunded_at"] is not None
        assert len(d["refunded_at"]) > 0

        db = TestSessionLocal()
        from app.models.booking import Booking as BookingModel
        b = db.query(BookingModel).filter(BookingModel.id == booking_id).first()
        assert b.refunded_at is not None
        db.close()

    def test_refund_with_reason(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            resp = client.post(
                f"/api/v1/payments/{booking_id}/refund",
                headers=auth_header(token),
                json={"reason": "Customer cancelled service"},
            )

        assert resp.status_code == 200
        d = resp.json()["data"]
        assert d["refunded_at"] is not None

        db = TestSessionLocal()
        from app.models.booking import Booking as BookingModel
        b = db.query(BookingModel).filter(BookingModel.id == booking_id).first()
        assert b.refund_reason == "Customer cancelled service"
        db.close()


# ============================================================
# RECEIPT TESTS
# ============================================================

class TestPaymentReceipt:
    def test_successful_receipt(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        resp = client.get(
            f"/api/v1/payments/{booking_id}/receipt",
            headers=auth_header(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        d = data["data"]
        assert d["receipt_id"].startswith("RCP-")
        assert d["booking_id"] == booking_id
        assert d["service"] == "Pipe Repair"
        assert d["customer"] == "Priya Sharma"
        assert d["worker"] == "Ravi Kumar"
        assert d["amount"] == 500.0
        assert d["discount"] == 0.0
        assert d["total_paid"] == 500.0
        assert d["method"] == "card"
        assert d["transaction_id"] is not None
        assert d["date"] is not None

    def test_receipt_with_discount(self, client):
        seed = create_seed_data()
        db = TestSessionLocal()
        from app.models.coupon import Coupon
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        coupon = Coupon(
            code="SAVE10", title="10% Off", type="percentage", value=10,
            min_order=100, max_discount=100, is_active=True, used_count=0,
            usage_limit=100, valid_from=now - timedelta(days=1),
            valid_until=now + timedelta(days=30),
        )
        db.add(coupon)
        db.commit()
        db.close()

        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]

        resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service_id"],
            "problem_description": "Pipe inspection needed",
            "scheduled_date": "2026-08-02",
            "scheduled_time": "14:00",
            "address": {"street": "456 Oak Ave", "city": "Mumbai"},
            "coupon_code": "SAVE10",
        })
        booking_id = resp.json()["data"]["id"]
        _pay_booking(client, token, booking_id)

        resp = client.get(
            f"/api/v1/payments/{booking_id}/receipt",
            headers=auth_header(token),
        )
        assert resp.status_code == 200
        d = resp.json()["data"]
        assert d["amount"] == 500.0
        assert d["discount"] > 0
        assert d["total_paid"] < 500.0

    def test_receipt_unpaid_booking(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.get(
            f"/api/v1/payments/{booking_id}/receipt",
            headers=auth_header(token),
        )
        assert resp.status_code == 400
        assert "paid" in str(resp.json()).lower()

    def test_receipt_nonexistent_booking(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]

        resp = client.get(
            "/api/v1/payments/nonexistent/receipt",
            headers=auth_header(token),
        )
        assert resp.status_code == 404

    def test_receipt_wrong_customer(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        register_customer(client, email="other@test.com", name="Other User")
        token2 = login_user(client, email="other@test.com").json()["data"]["access_token"]

        resp = client.get(
            f"/api/v1/payments/{booking_id}/receipt",
            headers=auth_header(token2),
        )
        assert resp.status_code == 403

    def test_receipt_no_worker_assigned(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]

        resp = client.post("/api/v1/bookings", headers=auth_header(token), json={
            "service_id": seed["service_id"],
            "problem_description": "Leaking pipe",
            "scheduled_date": "2026-08-01",
            "scheduled_time": "10:00",
            "address": {"street": "123 Main St", "city": "Mumbai"},
        })
        booking_id = resp.json()["data"]["id"]

        client.post("/api/v1/payments/process", headers=auth_header(token), json={
            "booking_id": booking_id,
            "payment_method": "cash",
        })

        resp = client.get(
            f"/api/v1/payments/{booking_id}/receipt",
            headers=auth_header(token),
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["worker"] == "Unassigned"


# ============================================================
# BOOKING PAYMENT NESTED OBJECT TESTS
# ============================================================

class TestBookingPaymentNested:
    def test_booking_detail_has_payment_object(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.get(f"/api/v1/bookings/{booking_id}", headers=auth_header(token))
        assert resp.status_code == 200
        booking = resp.json()["data"]
        assert "payment" in booking
        assert booking["payment"]["status"] == "unpaid"
        assert booking["payment"]["method"] is None
        assert booking["payment"]["transaction_id"] is None
        assert booking["payment"]["amount"] == 500.0
        assert booking["payment"]["paid_at"] is None

    def test_booking_detail_payment_after_pay(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        resp = client.get(f"/api/v1/bookings/{booking_id}", headers=auth_header(token))
        booking = resp.json()["data"]
        assert booking["payment"]["status"] == "paid"
        assert booking["payment"]["method"] == "card"
        assert booking["payment"]["transaction_id"] is not None
        assert booking["payment"]["paid_at"] is not None

    def test_my_bookings_have_payment_object(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        _create_booking(client, seed, token)

        resp = client.get("/api/v1/bookings/my-bookings", headers=auth_header(token))
        assert resp.status_code == 200
        bookings = resp.json()["data"]
        assert len(bookings) >= 1
        for b in bookings:
            assert "payment" in b
            assert "status" in b["payment"]
            assert "method" in b["payment"]
            assert "transaction_id" in b["payment"]
            assert "amount" in b["payment"]
            assert "paid_at" in b["payment"]

    def test_booking_payment_after_refund(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)
        _pay_booking(client, token, booking_id)

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            client.post(f"/api/v1/payments/{booking_id}/refund", headers=auth_header(token))

        resp = client.get(f"/api/v1/bookings/{booking_id}", headers=auth_header(token))
        booking = resp.json()["data"]
        assert booking["payment"]["status"] == "refunded"
        assert booking["status"] == "refunded"


# ============================================================
# FULL LIFECYCLE TEST
# ============================================================

class TestFullPaymentLifecycle:
    def test_booking_to_payment_to_refund_to_receipt(self, client):
        seed = create_seed_data()
        register_customer(client)
        token = login_user(client).json()["data"]["access_token"]
        booking_id = _create_booking(client, seed, token)

        resp = client.get(f"/api/v1/bookings/{booking_id}", headers=auth_header(token))
        assert resp.json()["data"]["payment"]["status"] == "unpaid"

        _pay_booking(client, token, booking_id)
        resp = client.get(f"/api/v1/payments/{booking_id}/status", headers=auth_header(token))
        assert resp.json()["data"]["payment_status"] == "paid"

        resp = client.get(f"/api/v1/payments/{booking_id}/receipt", headers=auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["data"]["service"] == "Pipe Repair"

        with patch("app.services.payment_service.REFUND_DELAY_SECONDS", 0):
            resp = client.post(f"/api/v1/payments/{booking_id}/refund", headers=auth_header(token))
        assert resp.json()["data"]["status"] == "refunded"

        resp = client.get(f"/api/v1/payments/{booking_id}/status", headers=auth_header(token))
        assert resp.json()["data"]["payment_status"] == "refunded"

        resp = client.get(f"/api/v1/bookings/{booking_id}", headers=auth_header(token))
        assert resp.json()["data"]["status"] == "refunded"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
