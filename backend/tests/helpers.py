from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.email_verification import EmailVerificationToken
from app.models.user import User

DEFAULT_PASSWORD = "correct horse battery staple"


def signup_verify_login(
    client: TestClient,
    db_session: DBSession,
    monkeypatch,
    email: str,
    *,
    is_admin: bool = False,
    full_name: str = "Test User",
) -> User:
    """Sign up, verify, and log in a fresh user, leaving the session cookie on `client`."""
    monkeypatch.setattr("app.routers.auth.send_verification_email", lambda *a, **k: None)

    response = client.post(
        "/auth/signup",
        json={"email": email, "password": DEFAULT_PASSWORD, "full_name": full_name},
    )
    assert response.status_code == 201, response.text

    user = db_session.query(User).filter(User.email == email).one()
    if is_admin:
        user.is_admin = True
        db_session.commit()

    token_row = (
        db_session.query(EmailVerificationToken)
        .filter(EmailVerificationToken.user_id == user.id)
        .one()
    )
    verify_response = client.post("/auth/verify-email", json={"token": token_row.token})
    assert verify_response.status_code == 200, verify_response.text

    login_response = client.post("/auth/login", json={"email": email, "password": DEFAULT_PASSWORD})
    assert login_response.status_code == 200, login_response.text

    return user
