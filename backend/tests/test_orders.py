from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from tests.helpers import place_order, signup_verify_login


def test_buyer_sees_only_their_own_orders(client: TestClient, db_session: DBSession, monkeypatch):
    place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="orders-buyer-a@example.com",
        seller_email="orders-seller-a@example.com",
    )
    result_b = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="orders-buyer-b@example.com",
        seller_email="orders-seller-b@example.com",
    )

    response = client.get("/orders")

    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["items"]]
    assert ids == [result_b["order_id"]]


def test_cannot_view_another_buyers_order(client: TestClient, db_session: DBSession, monkeypatch):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="orders-buyer-c@example.com",
        seller_email="orders-seller-c@example.com",
    )
    signup_verify_login(client, db_session, monkeypatch, "orders-buyer-d@example.com")

    response = client.get(f"/orders/{result['order_id']}")

    assert response.status_code == 404


def test_order_detail_includes_lines(client: TestClient, db_session: DBSession, monkeypatch):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="orders-buyer-e@example.com",
        seller_email="orders-seller-e@example.com",
    )

    response = client.get(f"/orders/{result['order_id']}")

    assert response.status_code == 200
    body = response.json()
    assert len(body["lines"]) == 1
    assert body["lines"][0]["quantity"] == 1


def test_order_summary_counts_in_progress_orders(
    client: TestClient, db_session: DBSession, monkeypatch
):
    place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="orders-buyer-f@example.com",
        seller_email="orders-seller-f@example.com",
    )
    place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="orders-buyer-f@example.com",
        seller_email="orders-seller-g@example.com",
        new_buyer=False,
    )

    response = client.get("/orders/summary")

    assert response.status_code == 200
    assert response.json()["in_progress_count"] == 2
