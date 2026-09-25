from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.order_status_history import OrderStatusHistory
from app.models.product import Product
from tests.helpers import login, make_approved_seller, place_order


def test_seller_can_ship_then_deliver(client: TestClient, db_session: DBSession, monkeypatch):
    monkeypatch.setattr(
        "app.routers.seller_orders.send_order_status_changed_email", lambda *a, **k: None
    )
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="so-buyer1@example.com",
        seller_email="so-seller1@example.com",
    )
    login(client, "so-seller1@example.com")

    ship_response = client.patch(
        f"/sellers/me/orders/{result['order_id']}/status", json={"status": "shipped"}
    )
    assert ship_response.status_code == 200
    assert ship_response.json()["status"] == "shipped"

    deliver_response = client.patch(
        f"/sellers/me/orders/{result['order_id']}/status", json={"status": "delivered"}
    )
    assert deliver_response.status_code == 200
    assert deliver_response.json()["status"] == "delivered"

    history = (
        db_session.query(OrderStatusHistory)
        .filter(OrderStatusHistory.order_id == result["order_id"])
        .order_by(OrderStatusHistory.id)
        .all()
    )
    assert [h.to_status for h in history] == ["placed", "shipped", "delivered"]


def test_invalid_transition_is_400(client: TestClient, db_session: DBSession, monkeypatch):
    monkeypatch.setattr(
        "app.routers.seller_orders.send_order_status_changed_email", lambda *a, **k: None
    )
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="so-buyer2@example.com",
        seller_email="so-seller2@example.com",
    )
    login(client, "so-seller2@example.com")

    response = client.patch(
        f"/sellers/me/orders/{result['order_id']}/status", json={"status": "delivered"}
    )

    assert response.status_code == 400


def test_terminal_state_rejects_further_transitions(
    client: TestClient, db_session: DBSession, monkeypatch
):
    monkeypatch.setattr(
        "app.routers.seller_orders.send_order_status_changed_email", lambda *a, **k: None
    )
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="so-buyer3@example.com",
        seller_email="so-seller3@example.com",
    )
    login(client, "so-seller3@example.com")
    client.patch(f"/sellers/me/orders/{result['order_id']}/status", json={"status": "shipped"})
    client.patch(f"/sellers/me/orders/{result['order_id']}/status", json={"status": "delivered"})

    response = client.patch(
        f"/sellers/me/orders/{result['order_id']}/status", json={"status": "shipped"}
    )

    assert response.status_code == 400


def test_non_owning_seller_gets_404(client: TestClient, db_session: DBSession, monkeypatch):
    monkeypatch.setattr(
        "app.routers.seller_orders.send_order_status_changed_email", lambda *a, **k: None
    )
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="so-buyer4@example.com",
        seller_email="so-seller4@example.com",
    )
    make_approved_seller(client, db_session, monkeypatch, "so-other-seller@example.com")

    response = client.patch(
        f"/sellers/me/orders/{result['order_id']}/status", json={"status": "shipped"}
    )

    assert response.status_code == 404


def test_buyer_without_seller_profile_gets_403(
    client: TestClient, db_session: DBSession, monkeypatch
):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="so-buyer5@example.com",
        seller_email="so-seller5@example.com",
    )
    login(client, "so-buyer5@example.com")

    response = client.patch(
        f"/sellers/me/orders/{result['order_id']}/status", json={"status": "shipped"}
    )

    assert response.status_code == 403


def test_cancelling_restocks_the_product(client: TestClient, db_session: DBSession, monkeypatch):
    monkeypatch.setattr(
        "app.routers.seller_orders.send_order_status_changed_email", lambda *a, **k: None
    )
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="so-buyer6@example.com",
        seller_email="so-seller6@example.com",
        stock_quantity=5,
        quantity=2,
    )
    login(client, "so-seller6@example.com")

    response = client.patch(
        f"/sellers/me/orders/{result['order_id']}/status", json={"status": "cancelled"}
    )

    assert response.status_code == 200
    product = db_session.query(Product).filter(Product.id == result["product"].id).one()
    assert product.stock_quantity == 5  # 5 - 2 (checkout) + 2 (restock) = 5


def test_status_change_sends_email(client: TestClient, db_session: DBSession, monkeypatch):
    calls = []
    monkeypatch.setattr(
        "app.routers.seller_orders.send_order_status_changed_email",
        lambda email, order: calls.append((email, order.id)),
    )
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="so-buyer7@example.com",
        seller_email="so-seller7@example.com",
    )
    login(client, "so-seller7@example.com")

    client.patch(f"/sellers/me/orders/{result['order_id']}/status", json={"status": "shipped"})

    assert calls == [("so-buyer7@example.com", result["order_id"])]


def test_list_my_orders_only_shows_own(client: TestClient, db_session: DBSession, monkeypatch):
    result_a = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="so-buyer8@example.com",
        seller_email="so-seller8@example.com",
    )
    place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="so-buyer9@example.com",
        seller_email="so-seller9@example.com",
    )
    login(client, "so-seller8@example.com")

    response = client.get("/sellers/me/orders")

    ids = [item["id"] for item in response.json()["items"]]
    assert ids == [result_a["order_id"]]
