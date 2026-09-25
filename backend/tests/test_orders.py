from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from tests.helpers import make_approved_seller, make_category, make_product, signup_verify_login

ADDRESS_PAYLOAD = {
    "label": "Home",
    "recipient_name": "Test Buyer",
    "street": "1 Main St",
    "city": "Bucharest",
    "region": "Bucharest",
    "postal_code": "010101",
    "country": "Romania",
}


def _place_order(client: TestClient, db_session: DBSession, monkeypatch, buyer_email: str) -> int:
    seller = make_approved_seller(client, db_session, monkeypatch, f"seller-for-{buyer_email}")
    category = make_category(db_session)
    product = make_product(db_session, seller, category)

    signup_verify_login(client, db_session, monkeypatch, buyer_email)
    address_id = client.post("/addresses", json=ADDRESS_PAYLOAD).json()["id"]
    client.post("/cart/items", json={"product_id": product.id, "quantity": 1})
    response = client.post("/checkout", json={"address_id": address_id})
    return response.json()["order_ids"][0]  # type: ignore[no-any-return]


def test_buyer_sees_only_their_own_orders(client: TestClient, db_session: DBSession, monkeypatch):
    _place_order(client, db_session, monkeypatch, "orders-buyer-a@example.com")
    order_b_id = _place_order(client, db_session, monkeypatch, "orders-buyer-b@example.com")

    response = client.get("/orders")

    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["items"]]
    assert ids == [order_b_id]


def test_cannot_view_another_buyers_order(client: TestClient, db_session: DBSession, monkeypatch):
    order_a_id = _place_order(client, db_session, monkeypatch, "orders-buyer-c@example.com")
    signup_verify_login(client, db_session, monkeypatch, "orders-buyer-d@example.com")

    response = client.get(f"/orders/{order_a_id}")

    assert response.status_code == 404


def test_order_detail_includes_lines(client: TestClient, db_session: DBSession, monkeypatch):
    order_id = _place_order(client, db_session, monkeypatch, "orders-buyer-e@example.com")

    response = client.get(f"/orders/{order_id}")

    assert response.status_code == 200
    body = response.json()
    assert len(body["lines"]) == 1
    assert body["lines"][0]["quantity"] == 1
