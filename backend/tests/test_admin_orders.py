from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from tests.helpers import login, place_order, signup_verify_login


def test_admin_can_transition_any_order(client: TestClient, db_session: DBSession, monkeypatch):
    monkeypatch.setattr(
        "app.routers.admin_orders.send_order_status_changed_email", lambda *a, **k: None
    )
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="ao-buyer1@example.com",
        seller_email="ao-seller1@example.com",
    )
    signup_verify_login(client, db_session, monkeypatch, "ao-admin1@example.com", is_admin=True)

    response = client.patch(
        f"/admin/orders/{result['order_id']}/status", json={"status": "shipped"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "shipped"


def test_non_admin_cannot_use_admin_endpoint(
    client: TestClient, db_session: DBSession, monkeypatch
):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="ao-buyer2@example.com",
        seller_email="ao-seller2@example.com",
    )
    login(client, "ao-buyer2@example.com")

    response = client.patch(
        f"/admin/orders/{result['order_id']}/status", json={"status": "shipped"}
    )

    assert response.status_code == 403


def test_admin_transition_of_nonexistent_order_404s(
    client: TestClient, db_session: DBSession, monkeypatch
):
    signup_verify_login(client, db_session, monkeypatch, "ao-admin2@example.com", is_admin=True)

    response = client.patch("/admin/orders/999999/status", json={"status": "shipped"})

    assert response.status_code == 404
