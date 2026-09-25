from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.order import Order, OrderStatus
from tests.helpers import login, place_order, signup_verify_login


def test_seller_stats_excludes_cancelled_orders(
    client: TestClient, db_session: DBSession, monkeypatch
):
    result_a = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="stats-buyer1@example.com",
        seller_email="stats-seller1@example.com",
        stock_quantity=10,
        quantity=2,
    )
    result_b = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="stats-buyer2@example.com",
        seller_email="stats-seller1@example.com",
        stock_quantity=10,
        quantity=1,
        new_seller=False,
    )

    # Cancel order B: should still count toward total_orders, but not revenue.
    order_b = db_session.query(Order).filter(Order.id == result_b["order_id"]).one()
    order_b.status = OrderStatus.cancelled
    db_session.commit()

    login(client, "stats-seller1@example.com")
    response = client.get("/sellers/me/stats")

    assert response.status_code == 200
    body = response.json()
    assert body["total_orders"] == 2
    assert Decimal(body["total_revenue"]) == result_a["product"].price * 2
    assert body["top_products"][0]["product_id"] == result_a["product"].id
    assert body["top_products"][0]["quantity_sold"] == 2


def test_non_seller_cannot_view_seller_stats(
    client: TestClient, db_session: DBSession, monkeypatch
):

    signup_verify_login(client, db_session, monkeypatch, "stats-buyer3@example.com")

    response = client.get("/sellers/me/stats")

    assert response.status_code == 403


def test_admin_stats_aggregate_across_sellers(
    client: TestClient, db_session: DBSession, monkeypatch
):
    place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="stats-buyer4@example.com",
        seller_email="stats-seller2@example.com",
    )
    result2 = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="stats-buyer5@example.com",
        seller_email="stats-seller3@example.com",
    )

    order2 = db_session.query(Order).filter(Order.id == result2["order_id"]).one()
    order2.status = OrderStatus.cancelled
    db_session.commit()

    signup_verify_login(client, db_session, monkeypatch, "stats-admin1@example.com", is_admin=True)
    response = client.get("/admin/stats")

    assert response.status_code == 200
    body = response.json()
    assert body["total_orders"] >= 2
    assert body["orders_by_status"].get("cancelled", 0) >= 1
    assert body["total_sellers"] >= 2


def test_non_admin_cannot_view_admin_stats(client: TestClient, db_session: DBSession, monkeypatch):

    signup_verify_login(client, db_session, monkeypatch, "stats-buyer6@example.com")

    response = client.get("/admin/stats")

    assert response.status_code == 403
