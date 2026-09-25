from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.seller_action_log import SellerActionLog
from tests.helpers import signup_verify_login


def _apply_as_seller(client: TestClient, db_session: DBSession, monkeypatch, email: str) -> int:
    signup_verify_login(client, db_session, monkeypatch, email)
    response = client.post("/sellers/apply", json={"business_name": "Pending Shop"})
    return response.json()["id"]  # type: ignore[no-any-return]


def test_non_admin_cannot_list_sellers(client: TestClient, db_session: DBSession, monkeypatch):
    signup_verify_login(client, db_session, monkeypatch, "notadmin@example.com")

    response = client.get("/admin/sellers")

    assert response.status_code == 403


def test_admin_can_approve_seller_and_logs_it(
    client: TestClient, db_session: DBSession, monkeypatch
):
    seller_id = _apply_as_seller(client, db_session, monkeypatch, "applicant@example.com")
    signup_verify_login(client, db_session, monkeypatch, "admin@example.com", is_admin=True)

    response = client.post(f"/admin/sellers/{seller_id}/approve")

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    logs = (
        db_session.query(SellerActionLog)
        .filter(SellerActionLog.seller_profile_id == seller_id)
        .all()
    )
    assert len(logs) == 1
    assert logs[0].action == "approved"


def test_admin_can_reject_seller_with_reason(
    client: TestClient, db_session: DBSession, monkeypatch
):
    seller_id = _apply_as_seller(client, db_session, monkeypatch, "applicant2@example.com")
    signup_verify_login(client, db_session, monkeypatch, "admin2@example.com", is_admin=True)

    response = client.post(f"/admin/sellers/{seller_id}/reject", json={"reason": "Incomplete info"})

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    logs = (
        db_session.query(SellerActionLog)
        .filter(SellerActionLog.seller_profile_id == seller_id)
        .all()
    )
    assert logs[0].reason == "Incomplete info"


def test_approve_nonexistent_seller_404s(client: TestClient, db_session: DBSession, monkeypatch):
    signup_verify_login(client, db_session, monkeypatch, "admin3@example.com", is_admin=True)

    response = client.post("/admin/sellers/999999/approve")

    assert response.status_code == 404
