"""Integration tests for Phase 2.3 - Authentication & User Management."""
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


def register_user(client, name="Test User", email="test@example.com",
                  password=VALID_PASSWORD, phone=None):
    """Helper: register a customer and return response."""
    payload = {
        "name": name,
        "email": email,
        "password": password,
        "role": "customer",
    }
    if phone:
        payload["phone"] = phone
    return client.post("/api/v1/auth/register", json=payload)


def login_user(client, email="test@example.com", password=VALID_PASSWORD):
    """Helper: login and return response."""
    return client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
    })


def auth_header(access_token):
    return {"Authorization": f"Bearer {access_token}"}


# ============================================================
# REGISTER TESTS
# ============================================================

class TestRegister:
    def test_register_customer(self, client):
        resp = register_user(client)
        assert resp.status_code == 201
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["user"]["role"] == "customer"
        assert data["data"]["access_token"]
        assert data["data"]["refresh_token"]
        assert data["data"]["expires_in"] > 0

    def test_register_admin_blocked(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Hacker",
            "email": "hacker@example.com",
            "password": VALID_PASSWORD,
            "role": "admin",
        })
        assert resp.status_code == 403

    def test_register_worker_blocked(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Worker",
            "email": "worker@example.com",
            "password": VALID_PASSWORD,
            "role": "worker",
        })
        assert resp.status_code == 403

    def test_duplicate_email(self, client):
        register_user(client, email="dup@example.com")
        resp = register_user(client, email="dup@example.com", name="Dup User")
        assert resp.status_code == 409

    def test_duplicate_phone(self, client):
        register_user(client, phone="+919876543210")
        resp = register_user(client, email="other@example.com",
                             name="Other User", phone="+919876543210")
        assert resp.status_code == 409

    def test_weak_password_no_uppercase(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Weak", "email": "weak@example.com",
            "password": "nouppercase1!", "role": "customer",
        })
        assert resp.status_code == 422

    def test_weak_password_no_special(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Weak", "email": "weak2@example.com",
            "password": "NoSpecial1", "role": "customer",
        })
        assert resp.status_code == 422

    def test_weak_password_too_short(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Short", "email": "short@example.com",
            "password": "Ab1!", "role": "customer",
        })
        assert resp.status_code == 422

    def test_invalid_email(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Bad Email", "email": "not-an-email",
            "password": VALID_PASSWORD, "role": "customer",
        })
        assert resp.status_code == 422


# ============================================================
# LOGIN TESTS
# ============================================================

class TestLogin:
    def test_login_success(self, client):
        register_user(client)
        resp = login_user(client)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["access_token"]
        assert data["data"]["refresh_token"]

    def test_login_wrong_password(self, client):
        register_user(client)
        resp = login_user(client, password="WrongPass1!")
        assert resp.status_code == 401

    def test_login_nonexistent_email(self, client):
        resp = login_user(client, email="nobody@example.com")
        assert resp.status_code == 401

    def test_login_deactivated_account(self, client):
        register_user(client)
        # Deactivate via direct DB manipulation
        db = TestSessionLocal()
        from app.models.user import User
        user = db.query(User).filter(User.email == "test@example.com").first()
        user.is_active = False
        db.commit()
        db.close()

        resp = login_user(client)
        assert resp.status_code == 401


# ============================================================
# REFRESH TOKEN TESTS
# ============================================================

class TestRefreshToken:
    def test_refresh_success(self, client):
        register_user(client)
        login_resp = login_user(client)
        refresh_token = login_resp.json()["data"]["refresh_token"]

        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["data"]["access_token"]
        assert data["data"]["refresh_token"]
        assert data["data"]["refresh_token"] != refresh_token

    def test_refresh_old_token_invalid(self, client):
        register_user(client)
        login_resp = login_user(client)
        refresh_token = login_resp.json()["data"]["refresh_token"]

        # First refresh succeeds
        client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})

        # Second refresh with same token fails (rotation)
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 401

    def test_refresh_invalid_token(self, client):
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": "totally-fake-token",
        })
        assert resp.status_code == 401

    def test_refresh_preserves_role(self, client):
        register_user(client)
        login_resp = login_user(client)
        refresh_token = login_resp.json()["data"]["refresh_token"]

        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        user_data = resp.json()["data"]["user"]
        assert user_data["role"] == "customer"

    def test_access_token_has_role_claim(self, client):
        register_user(client)
        login_resp = login_user(client)
        access_token = login_resp.json()["data"]["access_token"]

        from app.core.security import decode_token
        payload = decode_token(access_token)
        assert payload["role"] == "customer"


# ============================================================
# LOGOUT TESTS
# ============================================================

class TestLogout:
    def test_logout_with_refresh_token_only(self, client):
        register_user(client)
        login_resp = login_user(client)
        refresh_token = login_resp.json()["data"]["refresh_token"]

        # Logout should work WITHOUT an access token
        resp = client.post("/api/v1/auth/logout", json={
            "refresh_token": refresh_token,
        })
        assert resp.status_code == 200

    def test_logout_revokes_refresh_token(self, client):
        register_user(client)
        login_resp = login_user(client)
        refresh_token = login_resp.json()["data"]["refresh_token"]

        client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})

        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 401

    def test_logout_all(self, client):
        register_user(client)
        login_resp = login_user(client)
        access_token = login_resp.json()["data"]["access_token"]
        refresh_token = login_resp.json()["data"]["refresh_token"]

        resp = client.post("/api/v1/auth/logout-all",
                          headers=auth_header(access_token))
        assert resp.status_code == 200

        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 401

    def test_logout_all_requires_auth(self, client):
        resp = client.post("/api/v1/auth/logout-all")
        assert resp.status_code in (401, 403)


# ============================================================
# USER PROFILE TESTS
# ============================================================

class TestUserProfile:
    def test_get_me(self, client):
        register_user(client, name="Profile User")
        login_resp = login_user(client)
        token = login_resp.json()["data"]["access_token"]

        resp = client.get("/api/v1/users/me", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["data"]["email"] == "test@example.com"
        assert data["data"]["name"] == "Profile User"
        assert data["data"]["role"] == "customer"

    def test_get_me_unauthorized(self, client):
        resp = client.get("/api/v1/users/me")
        assert resp.status_code in (401, 403)

    def test_update_profile(self, client):
        register_user(client)
        login_resp = login_user(client)
        token = login_resp.json()["data"]["access_token"]

        resp = client.put("/api/v1/users/update-profile",
                         headers=auth_header(token),
                         json={"name": "Updated Name"})
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "Updated Name"

    def test_change_password(self, client):
        register_user(client)
        login_resp = login_user(client)
        token = login_resp.json()["data"]["access_token"]

        resp = client.post("/api/v1/users/change-password",
                          headers=auth_header(token),
                          json={
                              "current_password": VALID_PASSWORD,
                              "new_password": "NewStrongPass2!",
                          })
        assert resp.status_code == 200

        # Old password should no longer work
        resp = login_user(client, password=VALID_PASSWORD)
        assert resp.status_code == 401

        # New password should work
        resp = login_user(client, password="NewStrongPass2!")
        assert resp.status_code == 200

    def test_change_password_wrong_current(self, client):
        register_user(client)
        login_resp = login_user(client)
        token = login_resp.json()["data"]["access_token"]

        resp = client.post("/api/v1/users/change-password",
                          headers=auth_header(token),
                          json={
                              "current_password": "WrongPass1!",
                              "new_password": "NewStrongPass2!",
                          })
        assert resp.status_code == 400


# ============================================================
# OTP / PASSWORD RESET TESTS
# ============================================================

class TestOTPAndPasswordReset:
    def test_forgot_password_always_returns_200(self, client):
        register_user(client)
        resp = client.post("/api/v1/auth/forgot-password", json={
            "email": "test@example.com",
        })
        assert resp.status_code == 200

    def test_forgot_password_nonexistent_also_200(self, client):
        resp = client.post("/api/v1/auth/forgot-password", json={
            "email": "nonexistent@example.com",
        })
        assert resp.status_code == 200

    def test_reset_password_flow(self, client):
        import hashlib
        from datetime import datetime, timedelta
        from app.core.security import utc_now
        register_user(client)

        # Directly create a known OTP for testing (since OTPs are now hashed)
        from app.models.otp import OTP
        test_otp = "123456"
        db = TestSessionLocal()
        otp_hash = hashlib.sha256(test_otp.encode()).hexdigest()
        otp_record = OTP(
            email="test@example.com",
            otp_code=otp_hash,
            purpose="password_reset",
            expires_at=utc_now() + timedelta(minutes=10),
            used=False,
        )
        db.add(otp_record)
        db.commit()
        db.close()

        resp = client.post("/api/v1/auth/reset-password", json={
            "email": "test@example.com",
            "otp": test_otp,
            "new_password": "ResetPass1!",
        })
        assert resp.status_code == 200

    def test_verify_otp_invalid(self, client):
        register_user(client)
        client.post("/api/v1/auth/forgot-password", json={
            "email": "test@example.com",
        })

        resp = client.post("/api/v1/auth/verify-otp", json={
            "email": "test@example.com",
            "otp": "000000",
        })
        assert resp.status_code == 200
        assert "Invalid" in resp.json()["message"]

    def test_resend_otp(self, client):
        resp = client.post("/api/v1/auth/resend-otp", json={
            "email": "test@example.com",
        })
        assert resp.status_code == 200


# ============================================================
# SECURITY TESTS
# ============================================================

class TestSecurity:
    def test_token_hash_is_sha256(self, client):
        from app.core.security import hash_token
        result = hash_token("test")
        assert len(result) == 64  # SHA-256 hex

    def test_otp_stored_hashed(self, client):
        register_user(client)
        client.post("/api/v1/auth/forgot-password", json={
            "email": "test@example.com",
        })

        db = TestSessionLocal()
        from app.models.otp import OTP
        otp = db.query(OTP).filter(OTP.email == "test@example.com").first()
        # OTP should be a 64-char hex hash, not a 6-digit code
        assert len(otp.otp_code) == 64
        assert otp.otp_code != "123456"
        db.close()

    def test_refresh_token_stored_hashed(self, client):
        register_user(client)
        login_resp = login_user(client)
        refresh_token = login_resp.json()["data"]["refresh_token"]

        db = TestSessionLocal()
        from app.models.refresh_token import RefreshToken
        from app.core.security import hash_token
        # All stored tokens should be SHA-256 hashes (64-char hex), not plaintext JWTs
        tokens = db.query(RefreshToken).all()
        assert len(tokens) >= 2  # one from register, one from login
        for stored in tokens:
            assert len(stored.token) == 64  # SHA-256 hex digest length
            assert stored.token != refresh_token  # not stored as plaintext
        # The login token's hash should exist in the DB
        login_hash = hash_token(refresh_token)
        matching = db.query(RefreshToken).filter(RefreshToken.token == login_hash).first()
        assert matching is not None
        db.close()

    def test_role_in_refresh_token(self, client):
        register_user(client)
        login_resp = login_user(client)
        refresh_token = login_resp.json()["data"]["refresh_token"]

        from app.core.security import decode_token
        payload = decode_token(refresh_token)
        assert payload["role"] == "customer"

    def test_utcnow_replaced(self):
        """Verify no datetime.utcnow() calls remain in key files."""
        import importlib
        files_to_check = [
            "app.core.security",
            "app.services.token_service",
            "app.services.otp_service",
            "app.repositories.refresh_token_repository",
            "app.repositories.otp_repository",
        ]
        for module_name in files_to_check:
            mod = importlib.import_module(module_name)
            source_path = mod.__file__
            with open(source_path) as f:
                content = f.read()
            assert "utcnow()" not in content, f"utcnow() still present in {module_name}"
            # Also verify utc_now is used where datetime operations are needed
            if module_name in ("app.core.security", "app.services.token_service", 
                               "app.services.otp_service"):
                assert "utc_now()" in content, f"utc_now() not used in {module_name}"


# Run
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
