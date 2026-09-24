from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.email_verification import EmailVerificationToken
from app.models.login_attempt import LoginAttempt
from app.models.user import User

SIGNUP_PAYLOAD = {
    "email": "buyer@example.com",
    "password": "correct horse battery staple",
    "full_name": "Test Buyer",
}


def _signup_and_verify(client: TestClient, db_session: DBSession, monkeypatch, **overrides):
    monkeypatch.setattr("app.routers.auth.send_verification_email", lambda *a, **k: None)
    payload = {**SIGNUP_PAYLOAD, **overrides}
    response = client.post("/auth/signup", json=payload)
    assert response.status_code == 201

    user = db_session.query(User).filter(User.email == payload["email"]).one()
    token_row = (
        db_session.query(EmailVerificationToken)
        .filter(EmailVerificationToken.user_id == user.id)
        .one()
    )
    verify_response = client.post("/auth/verify-email", json={"token": token_row.token})
    assert verify_response.status_code == 200
    return payload


def test_signup_creates_unverified_user(client: TestClient, db_session: DBSession, monkeypatch):
    monkeypatch.setattr("app.routers.auth.send_verification_email", lambda *a, **k: None)

    response = client.post("/auth/signup", json=SIGNUP_PAYLOAD)

    assert response.status_code == 201
    user = db_session.query(User).filter(User.email == SIGNUP_PAYLOAD["email"]).one()
    assert user.email_verified is False


def test_signup_rejects_duplicate_email(client: TestClient, monkeypatch):
    monkeypatch.setattr("app.routers.auth.send_verification_email", lambda *a, **k: None)
    client.post("/auth/signup", json=SIGNUP_PAYLOAD)

    response = client.post("/auth/signup", json=SIGNUP_PAYLOAD)

    assert response.status_code == 409


def test_login_rejected_before_email_verified(client: TestClient, monkeypatch):
    monkeypatch.setattr("app.routers.auth.send_verification_email", lambda *a, **k: None)
    client.post("/auth/signup", json=SIGNUP_PAYLOAD)

    response = client.post(
        "/auth/login",
        json={"email": SIGNUP_PAYLOAD["email"], "password": SIGNUP_PAYLOAD["password"]},
    )

    assert response.status_code == 403


def test_login_rejects_wrong_password_and_logs_attempt(
    client: TestClient, db_session: DBSession, monkeypatch
):
    _signup_and_verify(client, db_session, monkeypatch)

    response = client.post(
        "/auth/login", json={"email": SIGNUP_PAYLOAD["email"], "password": "wrong password"}
    )

    assert response.status_code == 401
    attempts = (
        db_session.query(LoginAttempt)
        .filter(LoginAttempt.email_attempted == SIGNUP_PAYLOAD["email"])
        .all()
    )
    assert len(attempts) == 1
    assert attempts[0].success is False


def test_login_succeeds_and_sets_session_cookie(
    client: TestClient, db_session: DBSession, monkeypatch
):
    _signup_and_verify(client, db_session, monkeypatch)

    response = client.post(
        "/auth/login",
        json={"email": SIGNUP_PAYLOAD["email"], "password": SIGNUP_PAYLOAD["password"]},
    )

    assert response.status_code == 200
    assert response.json()["email"] == SIGNUP_PAYLOAD["email"]
    assert "session_token" in response.cookies


def test_account_locks_after_five_failed_attempts(
    client: TestClient, db_session: DBSession, monkeypatch
):
    _signup_and_verify(client, db_session, monkeypatch)

    for _ in range(5):
        client.post(
            "/auth/login", json={"email": SIGNUP_PAYLOAD["email"], "password": "wrong password"}
        )

    # Even the correct password is rejected while locked.
    response = client.post(
        "/auth/login",
        json={"email": SIGNUP_PAYLOAD["email"], "password": SIGNUP_PAYLOAD["password"]},
    )

    assert response.status_code == 423


def test_me_requires_session(client: TestClient):
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_me_returns_current_user_when_logged_in(
    client: TestClient, db_session: DBSession, monkeypatch
):
    _signup_and_verify(client, db_session, monkeypatch)
    client.post(
        "/auth/login",
        json={"email": SIGNUP_PAYLOAD["email"], "password": SIGNUP_PAYLOAD["password"]},
    )

    response = client.get("/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == SIGNUP_PAYLOAD["email"]


def test_logout_invalidates_session(client: TestClient, db_session: DBSession, monkeypatch):
    _signup_and_verify(client, db_session, monkeypatch)
    client.post(
        "/auth/login",
        json={"email": SIGNUP_PAYLOAD["email"], "password": SIGNUP_PAYLOAD["password"]},
    )

    logout_response = client.post("/auth/logout")
    assert logout_response.status_code == 200

    me_response = client.get("/auth/me")
    assert me_response.status_code == 401
