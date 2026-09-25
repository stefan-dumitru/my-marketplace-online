from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.order import Order, OrderStatus
from app.models.order_line import OrderLine
from tests.helpers import DEFAULT_ADDRESS_PAYLOAD, place_order, signup_verify_login


def _deliver(db_session: DBSession, order_id: int) -> None:
    order = db_session.query(Order).filter(Order.id == order_id).one()
    order.status = OrderStatus.delivered
    db_session.commit()


def _deliver_same_product_to_new_buyer(
    client: TestClient, db_session: DBSession, monkeypatch, buyer_email: str, product
) -> None:
    """A second buyer receives a delivered order for an already-existing product, without
    re-running the seller signup that `place_order` would otherwise repeat."""
    buyer = signup_verify_login(client, db_session, monkeypatch, buyer_email)
    order = Order(
        buyer_id=buyer.id,
        seller_id=product.seller_id,
        status=OrderStatus.delivered,
        total_amount=product.price,
        ship_recipient_name=DEFAULT_ADDRESS_PAYLOAD["recipient_name"],
        ship_street=DEFAULT_ADDRESS_PAYLOAD["street"],
        ship_city=DEFAULT_ADDRESS_PAYLOAD["city"],
        ship_region=DEFAULT_ADDRESS_PAYLOAD["region"],
        ship_postal_code=DEFAULT_ADDRESS_PAYLOAD["postal_code"],
        ship_country=DEFAULT_ADDRESS_PAYLOAD["country"],
    )
    db_session.add(order)
    db_session.flush()
    db_session.add(
        OrderLine(
            order_id=order.id,
            product_id=product.id,
            product_name_snapshot=product.name,
            unit_price_snapshot=product.price,
            quantity=1,
            line_total=product.price,
        )
    )
    db_session.commit()


def test_cannot_review_without_a_delivered_order(
    client: TestClient, db_session: DBSession, monkeypatch
):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="review-buyer1@example.com",
        seller_email="review-seller1@example.com",
    )

    response = client.post(
        f"/products/{result['product'].id}/reviews",
        json={"rating": 5, "comment": "Great!"},
    )

    assert response.status_code == 403


def test_review_after_delivery_then_duplicate_is_409(
    client: TestClient, db_session: DBSession, monkeypatch
):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="review-buyer2@example.com",
        seller_email="review-seller2@example.com",
    )
    _deliver(db_session, result["order_id"])

    response = client.post(
        f"/products/{result['product'].id}/reviews",
        json={"rating": 5, "comment": "Great product!"},
    )
    assert response.status_code == 201
    assert response.json()["rating"] == 5

    duplicate = client.post(
        f"/products/{result['product'].id}/reviews",
        json={"rating": 3, "comment": "Second try"},
    )
    assert duplicate.status_code == 409


def test_only_author_can_edit_or_delete(client: TestClient, db_session: DBSession, monkeypatch):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="review-buyer3@example.com",
        seller_email="review-seller3@example.com",
    )
    _deliver(db_session, result["order_id"])
    client.post(f"/products/{result['product'].id}/reviews", json={"rating": 4, "comment": "Good"})

    signup_verify_login(client, db_session, monkeypatch, "review-buyer3b@example.com")

    edit_response = client.patch(
        f"/products/{result['product'].id}/reviews/me",
        json={"rating": 1, "comment": "hijacked"},
    )
    assert edit_response.status_code == 404

    delete_response = client.delete(f"/products/{result['product'].id}/reviews/me")
    assert delete_response.status_code == 404


def test_author_can_edit_their_review(client: TestClient, db_session: DBSession, monkeypatch):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="review-buyer4@example.com",
        seller_email="review-seller4@example.com",
    )
    _deliver(db_session, result["order_id"])
    client.post(f"/products/{result['product'].id}/reviews", json={"rating": 4, "comment": "Good"})

    response = client.patch(
        f"/products/{result['product'].id}/reviews/me",
        json={"rating": 2, "comment": "Actually not great"},
    )

    assert response.status_code == 200
    assert response.json()["rating"] == 2
    assert response.json()["comment"] == "Actually not great"


def test_delete_then_review_again(client: TestClient, db_session: DBSession, monkeypatch):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="review-buyer5@example.com",
        seller_email="review-seller5@example.com",
    )
    _deliver(db_session, result["order_id"])
    client.post(f"/products/{result['product'].id}/reviews", json={"rating": 4, "comment": "Good"})

    delete_response = client.delete(f"/products/{result['product'].id}/reviews/me")
    assert delete_response.status_code == 204

    recreate_response = client.post(
        f"/products/{result['product'].id}/reviews", json={"rating": 5, "comment": "New review"}
    )
    assert recreate_response.status_code == 201


def test_list_reviews_and_product_average(client: TestClient, db_session: DBSession, monkeypatch):
    result = place_order(
        client,
        db_session,
        monkeypatch,
        buyer_email="review-buyer6@example.com",
        seller_email="review-seller6@example.com",
    )
    _deliver(db_session, result["order_id"])
    client.post(f"/products/{result['product'].id}/reviews", json={"rating": 4, "comment": "Good"})

    _deliver_same_product_to_new_buyer(
        client, db_session, monkeypatch, "review-buyer7@example.com", result["product"]
    )
    client.post(f"/products/{result['product'].id}/reviews", json={"rating": 2, "comment": "Meh"})

    list_response = client.get(f"/products/{result['product'].id}/reviews")
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 2

    detail_response = client.get(f"/products/{result['product'].id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["review_count"] == 2
    assert detail_response.json()["average_rating"] == 3.0
