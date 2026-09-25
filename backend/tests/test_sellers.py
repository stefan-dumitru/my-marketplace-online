from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.seller_profile import SellerProfile, SellerStatus
from tests.helpers import signup_verify_login


def test_apply_creates_pending_application(client: TestClient, db_session: DBSession, monkeypatch):
    signup_verify_login(client, db_session, monkeypatch, "buyer@example.com")

    response = client.post("/sellers/apply", json={"business_name": "My Shop"})

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["business_name"] == "My Shop"


def test_apply_while_pending_is_rejected(client: TestClient, db_session: DBSession, monkeypatch):
    signup_verify_login(client, db_session, monkeypatch, "buyer2@example.com")
    client.post("/sellers/apply", json={"business_name": "My Shop"})

    response = client.post("/sellers/apply", json={"business_name": "My Shop Again"})

    assert response.status_code == 409


def test_apply_while_approved_is_rejected(client: TestClient, db_session: DBSession, monkeypatch):
    user = signup_verify_login(client, db_session, monkeypatch, "buyer3@example.com")
    client.post("/sellers/apply", json={"business_name": "My Shop"})

    seller = db_session.query(SellerProfile).filter(SellerProfile.user_id == user.id).one()
    seller.status = SellerStatus.approved
    db_session.commit()

    response = client.post("/sellers/apply", json={"business_name": "My Shop"})

    assert response.status_code == 409


def test_reapply_after_rejection_resets_to_pending(
    client: TestClient, db_session: DBSession, monkeypatch
):
    user = signup_verify_login(client, db_session, monkeypatch, "buyer4@example.com")
    client.post("/sellers/apply", json={"business_name": "First Name"})

    seller = db_session.query(SellerProfile).filter(SellerProfile.user_id == user.id).one()
    seller.status = SellerStatus.rejected
    db_session.commit()

    response = client.post("/sellers/apply", json={"business_name": "Second Name"})

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["business_name"] == "Second Name"


def test_my_application_404_when_none_exists(
    client: TestClient, db_session: DBSession, monkeypatch
):
    signup_verify_login(client, db_session, monkeypatch, "buyer5@example.com")

    response = client.get("/sellers/me/application")

    assert response.status_code == 404
