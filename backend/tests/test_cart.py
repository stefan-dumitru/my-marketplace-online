from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from tests.helpers import make_approved_seller, make_category, make_product, signup_verify_login


def _setup_product(client: TestClient, db_session: DBSession, monkeypatch):
    seller = make_approved_seller(client, db_session, monkeypatch, "cartseller@example.com")
    category = make_category(db_session)
    product = make_product(
        db_session, seller, category, name="Widget", price="10.00", stock_quantity=5
    )
    signup_verify_login(client, db_session, monkeypatch, "cartbuyer@example.com")
    return product


def test_add_to_cart(client: TestClient, db_session: DBSession, monkeypatch):
    product = _setup_product(client, db_session, monkeypatch)

    response = client.post("/cart/items", json={"product_id": product.id, "quantity": 2})

    assert response.status_code == 201
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 2
    assert body["total"] == "20.00"


def test_adding_same_product_again_increments_quantity(
    client: TestClient, db_session: DBSession, monkeypatch
):
    product = _setup_product(client, db_session, monkeypatch)
    client.post("/cart/items", json={"product_id": product.id, "quantity": 2})

    response = client.post("/cart/items", json={"product_id": product.id, "quantity": 3})

    assert response.status_code == 201
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 5


def test_add_nonexistent_product_404s(client: TestClient, db_session: DBSession, monkeypatch):
    signup_verify_login(client, db_session, monkeypatch, "cartbuyer2@example.com")

    response = client.post("/cart/items", json={"product_id": 999999, "quantity": 1})

    assert response.status_code == 404


def test_update_cart_item_quantity(client: TestClient, db_session: DBSession, monkeypatch):
    product = _setup_product(client, db_session, monkeypatch)
    client.post("/cart/items", json={"product_id": product.id, "quantity": 1})

    response = client.patch(f"/cart/items/{product.id}", json={"quantity": 4})

    assert response.status_code == 200
    assert response.json()["items"][0]["quantity"] == 4


def test_update_item_not_in_cart_404s(client: TestClient, db_session: DBSession, monkeypatch):
    product = _setup_product(client, db_session, monkeypatch)

    response = client.patch(f"/cart/items/{product.id}", json={"quantity": 4})

    assert response.status_code == 404


def test_remove_from_cart(client: TestClient, db_session: DBSession, monkeypatch):
    product = _setup_product(client, db_session, monkeypatch)
    client.post("/cart/items", json={"product_id": product.id, "quantity": 1})

    response = client.delete(f"/cart/items/{product.id}")

    assert response.status_code == 200
    assert response.json()["items"] == []
