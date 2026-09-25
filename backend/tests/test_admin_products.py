from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.product_moderation_log import ProductModerationLog
from tests.helpers import login, place_order, signup_verify_login


def test_non_admin_cannot_moderate(client: TestClient, db_session: DBSession, monkeypatch):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="mod-buyer1@example.com",
        seller_email="mod-seller1@example.com",
    )
    signup_verify_login(client, db_session, monkeypatch, "mod-notadmin@example.com")

    response = client.post(
        f"/admin/products/{result['product'].id}/moderate",
        json={"action": "removed", "reason": "test"},
    )

    assert response.status_code == 403


def test_moderate_removed_hides_product_but_keeps_past_orders(
    client: TestClient, db_session: DBSession, monkeypatch
):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="mod-buyer2@example.com",
        seller_email="mod-seller2@example.com",
    )
    product_id = result["product"].id
    order_id = result["order_id"]

    signup_verify_login(client, db_session, monkeypatch, "mod-admin1@example.com", is_admin=True)

    response = client.post(
        f"/admin/products/{product_id}/moderate",
        json={"action": "removed", "reason": "policy violation"},
    )
    assert response.status_code == 200
    assert response.json()["moderation_status"] == "removed_by_admin"

    logs = (
        db_session.query(ProductModerationLog)
        .filter(ProductModerationLog.product_id == product_id)
        .all()
    )
    assert len(logs) == 1
    assert logs[0].action == "removed"
    assert logs[0].reason == "policy violation"

    catalog_response = client.get(f"/products/{product_id}")
    assert catalog_response.status_code == 404

    login(client, result["buyer"].email)
    order_response = client.get(f"/orders/{order_id}")
    assert order_response.status_code == 200


def test_suspend_then_reinstate_logs_both(client: TestClient, db_session: DBSession, monkeypatch):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="mod-buyer3@example.com",
        seller_email="mod-seller3@example.com",
    )
    product_id = result["product"].id
    signup_verify_login(client, db_session, monkeypatch, "mod-admin2@example.com", is_admin=True)

    suspend_response = client.post(
        f"/admin/products/{product_id}/moderate", json={"action": "suspended"}
    )
    assert suspend_response.status_code == 200
    assert suspend_response.json()["moderation_status"] == "suspended_by_admin"

    reinstate_response = client.post(
        f"/admin/products/{product_id}/moderate", json={"action": "reinstated"}
    )
    assert reinstate_response.status_code == 200
    assert reinstate_response.json()["moderation_status"] == "active"

    logs = (
        db_session.query(ProductModerationLog)
        .filter(ProductModerationLog.product_id == product_id)
        .order_by(ProductModerationLog.id)
        .all()
    )
    assert [log.action for log in logs] == ["suspended", "reinstated"]


def test_list_products_filters_by_moderation_status(
    client: TestClient, db_session: DBSession, monkeypatch
):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="mod-buyer4@example.com",
        seller_email="mod-seller4@example.com",
    )
    product_id = result["product"].id
    signup_verify_login(client, db_session, monkeypatch, "mod-admin3@example.com", is_admin=True)
    client.post(f"/admin/products/{product_id}/moderate", json={"action": "suspended"})

    response = client.get("/admin/products", params={"moderation_status": "suspended_by_admin"})

    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["items"]]
    assert product_id in ids
