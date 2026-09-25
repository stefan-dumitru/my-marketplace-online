import io

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.category import Category
from app.models.seller_profile import SellerProfile, SellerStatus
from tests.helpers import signup_verify_login


def _make_approved_seller(client: TestClient, db_session: DBSession, monkeypatch, email: str):
    user = signup_verify_login(client, db_session, monkeypatch, email)
    client.post("/sellers/apply", json={"business_name": "Shop"})
    seller = db_session.query(SellerProfile).filter(SellerProfile.user_id == user.id).one()
    seller.status = SellerStatus.approved
    db_session.commit()
    return seller


def _make_category(db_session: DBSession) -> Category:
    category = Category(name="Gadgets", slug="gadgets")
    db_session.add(category)
    db_session.commit()
    return category


def test_pending_seller_cannot_create_product(
    client: TestClient, db_session: DBSession, monkeypatch
):
    signup_verify_login(client, db_session, monkeypatch, "pending@example.com")
    client.post("/sellers/apply", json={"business_name": "Shop"})
    category = _make_category(db_session)

    response = client.post(
        "/sellers/me/products",
        json={"name": "Widget", "description": "x", "price": "10.00", "category_id": category.id},
    )

    assert response.status_code == 403


def test_create_product_with_unknown_category_is_400(
    client: TestClient, db_session: DBSession, monkeypatch
):
    _make_approved_seller(client, db_session, monkeypatch, "seller1@example.com")

    response = client.post(
        "/sellers/me/products",
        json={"name": "Widget", "description": "x", "price": "10.00", "category_id": 999999},
    )

    assert response.status_code == 400


def test_create_and_list_own_products(client: TestClient, db_session: DBSession, monkeypatch):
    _make_approved_seller(client, db_session, monkeypatch, "seller2@example.com")
    category = _make_category(db_session)

    create_response = client.post(
        "/sellers/me/products",
        json={
            "name": "Widget",
            "description": "A widget",
            "price": "10.00",
            "category_id": category.id,
            "stock_quantity": 3,
        },
    )
    assert create_response.status_code == 201

    list_response = client.get("/sellers/me/products")
    names = [p["name"] for p in list_response.json()["items"]]
    assert names == ["Widget"]


def test_update_own_product(client: TestClient, db_session: DBSession, monkeypatch):
    _make_approved_seller(client, db_session, monkeypatch, "seller3@example.com")
    category = _make_category(db_session)
    product_id = client.post(
        "/sellers/me/products",
        json={"name": "Widget", "description": "x", "price": "10.00", "category_id": category.id},
    ).json()["id"]

    response = client.patch(
        f"/sellers/me/products/{product_id}", json={"price": "12.50", "is_active": False}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["price"] == "12.50"
    assert body["is_active"] is False


def test_cannot_update_another_sellers_product(
    client: TestClient, db_session: DBSession, monkeypatch
):
    _make_approved_seller(client, db_session, monkeypatch, "seller4a@example.com")
    category = _make_category(db_session)
    product_id = client.post(
        "/sellers/me/products",
        json={"name": "Widget", "description": "x", "price": "10.00", "category_id": category.id},
    ).json()["id"]

    _make_approved_seller(client, db_session, monkeypatch, "seller4b@example.com")
    response = client.patch(f"/sellers/me/products/{product_id}", json={"price": "1.00"})

    assert response.status_code == 404


def test_image_upload_rejects_bad_type_before_storage_call(
    client: TestClient, db_session: DBSession, monkeypatch
):
    _make_approved_seller(client, db_session, monkeypatch, "seller5@example.com")
    category = _make_category(db_session)
    product_id = client.post(
        "/sellers/me/products",
        json={"name": "Widget", "description": "x", "price": "10.00", "category_id": category.id},
    ).json()["id"]

    called = False

    def fake_upload(*args, **kwargs):
        nonlocal called
        called = True
        return "products/should-not-happen.jpg"

    monkeypatch.setattr("app.routers.seller_products.upload_image", fake_upload)

    response = client.post(
        f"/sellers/me/products/{product_id}/images",
        files={"file": ("bad.txt", io.BytesIO(b"not an image"), "text/plain")},
    )

    assert response.status_code == 400
    assert called is False


def test_image_upload_authorization_runs_before_storage_call(
    client: TestClient, db_session: DBSession, monkeypatch
):
    _make_approved_seller(client, db_session, monkeypatch, "seller6a@example.com")
    category = _make_category(db_session)
    product_id = client.post(
        "/sellers/me/products",
        json={"name": "Widget", "description": "x", "price": "10.00", "category_id": category.id},
    ).json()["id"]

    _make_approved_seller(client, db_session, monkeypatch, "seller6b@example.com")

    called = False

    def fake_upload(*args, **kwargs):
        nonlocal called
        called = True
        return "products/should-not-happen.jpg"

    monkeypatch.setattr("app.routers.seller_products.upload_image", fake_upload)

    response = client.post(
        f"/sellers/me/products/{product_id}/images",
        files={"file": ("photo.jpg", io.BytesIO(b"fake-bytes"), "image/jpeg")},
    )

    assert response.status_code == 404
    assert called is False


def test_image_upload_succeeds_for_owner(client: TestClient, db_session: DBSession, monkeypatch):
    _make_approved_seller(client, db_session, monkeypatch, "seller7@example.com")
    category = _make_category(db_session)
    product_id = client.post(
        "/sellers/me/products",
        json={"name": "Widget", "description": "x", "price": "10.00", "category_id": category.id},
    ).json()["id"]

    monkeypatch.setattr(
        "app.routers.seller_products.upload_image", lambda *a, **k: "products/fake.jpg"
    )

    response = client.post(
        f"/sellers/me/products/{product_id}/images",
        files={"file": ("photo.jpg", io.BytesIO(b"fake-bytes"), "image/jpeg")},
    )

    assert response.status_code == 201
