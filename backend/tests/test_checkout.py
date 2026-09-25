import threading

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.cart_item import CartItem
from app.models.category import Category
from app.models.order import Order
from app.models.product import ModerationStatus, Product
from app.models.seller_profile import SellerProfile, SellerStatus
from app.models.user import User
from app.security import hash_password
from tests.conftest import TestingSessionLocal
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


def _create_address(client: TestClient) -> int:
    response = client.post("/addresses", json=ADDRESS_PAYLOAD)
    assert response.status_code == 201, response.text
    return response.json()["id"]  # type: ignore[no-any-return]


def test_multi_seller_checkout_creates_one_order_per_seller(
    client: TestClient, db_session: DBSession, monkeypatch
):
    monkeypatch.setattr("app.routers.checkout.send_order_placed_email", lambda *a, **k: None)
    seller_a = make_approved_seller(
        client, db_session, monkeypatch, "checkout-seller-a@example.com"
    )
    category = make_category(db_session)
    product_a = make_product(db_session, seller_a, category, name="A Widget", price="10.00")

    seller_b = make_approved_seller(
        client, db_session, monkeypatch, "checkout-seller-b@example.com"
    )
    product_b = make_product(db_session, seller_b, category, name="B Widget", price="20.00")

    signup_verify_login(client, db_session, monkeypatch, "checkout-buyer@example.com")
    address_id = _create_address(client)
    client.post("/cart/items", json={"product_id": product_a.id, "quantity": 2})
    client.post("/cart/items", json={"product_id": product_b.id, "quantity": 1})

    response = client.post("/checkout", json={"address_id": address_id})

    assert response.status_code == 200
    body = response.json()
    assert len(body["order_ids"]) == 2
    assert body["skipped"] == []

    orders = db_session.query(Order).filter(Order.id.in_(body["order_ids"])).all()
    totals = sorted(str(o.total_amount) for o in orders)
    assert totals == ["20.00", "20.00"]  # 2 x 10.00, and 1 x 20.00

    remaining_cart = (
        db_session.query(CartItem).filter(CartItem.user_id == orders[0].buyer_id).count()
    )
    assert remaining_cart == 0


def test_checkout_with_empty_cart_is_400(client: TestClient, db_session: DBSession, monkeypatch):
    signup_verify_login(client, db_session, monkeypatch, "checkout-empty@example.com")
    address_id = _create_address(client)

    response = client.post("/checkout", json={"address_id": address_id})

    assert response.status_code == 400


def test_checkout_with_someone_elses_address_is_400(
    client: TestClient, db_session: DBSession, monkeypatch
):
    seller = make_approved_seller(client, db_session, monkeypatch, "checkout-seller-c@example.com")
    category = make_category(db_session)
    product = make_product(db_session, seller, category)

    signup_verify_login(client, db_session, monkeypatch, "checkout-owner@example.com")
    address_id = _create_address(client)

    signup_verify_login(client, db_session, monkeypatch, "checkout-intruder@example.com")
    client.post("/cart/items", json={"product_id": product.id, "quantity": 1})

    response = client.post("/checkout", json={"address_id": address_id})

    assert response.status_code == 400


def test_stock_out_skips_only_that_line(client: TestClient, db_session: DBSession, monkeypatch):
    monkeypatch.setattr("app.routers.checkout.send_order_placed_email", lambda *a, **k: None)
    seller_a = make_approved_seller(
        client, db_session, monkeypatch, "checkout-seller-d@example.com"
    )
    category = make_category(db_session)
    scarce = make_product(db_session, seller_a, category, name="Scarce", stock_quantity=1)

    seller_b = make_approved_seller(
        client, db_session, monkeypatch, "checkout-seller-e@example.com"
    )
    plentiful = make_product(db_session, seller_b, category, name="Plentiful", stock_quantity=10)

    signup_verify_login(client, db_session, monkeypatch, "checkout-buyer2@example.com")
    address_id = _create_address(client)
    client.post("/cart/items", json={"product_id": scarce.id, "quantity": 5})
    client.post("/cart/items", json={"product_id": plentiful.id, "quantity": 1})

    response = client.post("/checkout", json={"address_id": address_id})

    assert response.status_code == 200
    body = response.json()
    assert len(body["order_ids"]) == 1
    assert len(body["skipped"]) == 1
    assert body["skipped"][0]["product_name"] == "Scarce"
    assert body["skipped"][0]["reason"] == "Out of stock"

    remaining = db_session.query(CartItem).filter(CartItem.product_id == scarce.id).first()
    assert remaining is not None  # skipped item stays in the cart


def test_deactivated_product_is_skipped_like_a_stock_out(
    client: TestClient, db_session: DBSession, monkeypatch
):
    seller = make_approved_seller(client, db_session, monkeypatch, "checkout-seller-f@example.com")
    category = make_category(db_session)
    product = make_product(db_session, seller, category, name="Soon Deactivated")

    signup_verify_login(client, db_session, monkeypatch, "checkout-buyer3@example.com")
    address_id = _create_address(client)
    client.post("/cart/items", json={"product_id": product.id, "quantity": 1})

    live_product = db_session.query(Product).filter(Product.id == product.id).one()
    live_product.is_active = False
    db_session.commit()

    response = client.post("/checkout", json={"address_id": address_id})

    assert response.status_code == 200
    body = response.json()
    assert body["order_ids"] == []
    assert body["skipped"][0]["reason"] == "No longer available"


def test_concurrent_checkout_never_oversells_the_last_unit():
    """Two genuinely separate DB sessions race the same conditional UPDATE checkout.py uses.

    Deliberately bypasses the shared `db_session`/`client` fixtures: their savepoint-based
    transaction never really commits, so a second connection wouldn't see the setup rows at all.
    """
    setup_session = TestingSessionLocal()
    try:
        user = User(
            email="race-seller@example.com",
            password_hash=hash_password("x"),
            full_name="Race Seller",
            email_verified=True,
        )
        setup_session.add(user)
        setup_session.flush()

        seller = SellerProfile(
            user_id=user.id, business_name="Race Shop", status=SellerStatus.approved
        )
        setup_session.add(seller)
        setup_session.flush()

        category = Category(name="Race Category", slug="race-category")
        setup_session.add(category)
        setup_session.flush()

        product = Product(
            seller_id=seller.id,
            category_id=category.id,
            name="Last Unit",
            description="Only one left",
            price="9.99",
            stock_quantity=1,
            moderation_status=ModerationStatus.active,
        )
        setup_session.add(product)
        setup_session.commit()
        product_id = product.id

        results: dict[str, int] = {}

        def attempt(name: str) -> None:
            session = TestingSessionLocal()
            try:
                updated = (
                    session.query(Product)
                    .filter(Product.id == product_id, Product.stock_quantity >= 1)
                    .update(
                        {Product.stock_quantity: Product.stock_quantity - 1},
                        synchronize_session=False,
                    )
                )
                session.commit()
                results[name] = updated
            finally:
                session.close()

        t1 = threading.Thread(target=attempt, args=("first",))
        t2 = threading.Thread(target=attempt, args=("second",))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        assert sum(results.values()) == 1

        setup_session.refresh(product)
        assert product.stock_quantity == 0
    finally:
        setup_session.rollback()
        setup_session.query(Product).filter(Product.name == "Last Unit").delete()
        setup_session.query(Category).filter(Category.slug == "race-category").delete()
        setup_session.query(SellerProfile).filter(
            SellerProfile.business_name == "Race Shop"
        ).delete()
        setup_session.query(User).filter(User.email == "race-seller@example.com").delete()
        setup_session.commit()
        setup_session.close()
