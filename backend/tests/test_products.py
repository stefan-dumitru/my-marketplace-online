import itertools
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.category import Category
from app.models.product import ModerationStatus, Product
from app.models.seller_profile import SellerProfile, SellerStatus
from app.models.user import User

_seller_email_counter = itertools.count()


def _make_seller(db: DBSession, *, status: SellerStatus = SellerStatus.approved) -> SellerProfile:
    user = User(
        email=f"seller-{status.value}-{next(_seller_email_counter)}@example.com",
        password_hash="x",
        full_name="A Seller",
        created_at=datetime.now(UTC),
    )
    db.add(user)
    db.flush()
    seller = SellerProfile(user_id=user.id, business_name="A Business", status=status)
    db.add(seller)
    db.flush()
    return seller


def _make_category(db: DBSession, name: str, slug: str, parent: Category | None = None) -> Category:
    category = Category(name=name, slug=slug, parent_id=parent.id if parent else None)
    db.add(category)
    db.flush()
    return category


def _make_product(
    db: DBSession,
    seller: SellerProfile,
    category: Category,
    *,
    name: str = "Widget",
    price: str = "10.00",
    is_active: bool = True,
    moderation_status: ModerationStatus = ModerationStatus.active,
) -> Product:
    product = Product(
        seller_id=seller.id,
        category_id=category.id,
        name=name,
        description=f"A fine {name.lower()}",
        price=Decimal(price),
        stock_quantity=5,
        is_active=is_active,
        moderation_status=moderation_status,
    )
    db.add(product)
    db.flush()
    return product


@pytest.fixture
def visible_setup(db_session: DBSession):
    seller = _make_seller(db_session)
    electronics = _make_category(db_session, "Electronics", "electronics")
    laptops = _make_category(db_session, "Laptops", "laptops", parent=electronics)
    product = _make_product(db_session, seller, laptops, name="ThinkPad", price="1500.00")
    db_session.commit()
    return {"seller": seller, "electronics": electronics, "laptops": laptops, "product": product}


def test_list_excludes_inactive_product(client: TestClient, db_session: DBSession, visible_setup):
    _make_product(
        db_session,
        visible_setup["seller"],
        visible_setup["laptops"],
        name="Hidden",
        is_active=False,
    )
    db_session.commit()

    response = client.get("/products")

    names = [item["name"] for item in response.json()["items"]]
    assert "ThinkPad" in names
    assert "Hidden" not in names


def test_list_excludes_moderated_product(client: TestClient, db_session: DBSession, visible_setup):
    _make_product(
        db_session,
        visible_setup["seller"],
        visible_setup["laptops"],
        name="Removed",
        moderation_status=ModerationStatus.removed_by_admin,
    )
    db_session.commit()

    response = client.get("/products")

    names = [item["name"] for item in response.json()["items"]]
    assert "Removed" not in names


def test_list_excludes_product_from_unapproved_seller(
    client: TestClient, db_session: DBSession, visible_setup
):
    pending_seller = _make_seller(db_session, status=SellerStatus.pending)
    _make_product(db_session, pending_seller, visible_setup["laptops"], name="NotYetApproved")
    db_session.commit()

    response = client.get("/products")

    names = [item["name"] for item in response.json()["items"]]
    assert "NotYetApproved" not in names


def test_search_by_name(client: TestClient, db_session: DBSession, visible_setup):
    _make_product(
        db_session, visible_setup["seller"], visible_setup["laptops"], name="Banana Phone"
    )
    db_session.commit()

    response = client.get("/products", params={"q": "thinkpad"})

    names = [item["name"] for item in response.json()["items"]]
    assert names == ["ThinkPad"]


def test_filter_by_category_includes_subcategories(
    client: TestClient, db_session: DBSession, visible_setup
):
    response = client.get("/products", params={"category_id": visible_setup["electronics"].id})

    names = [item["name"] for item in response.json()["items"]]
    assert "ThinkPad" in names


def test_filter_by_seller(client: TestClient, db_session: DBSession, visible_setup):
    other_seller = _make_seller(db_session)
    other_seller.business_name = "Other Business"
    _make_product(db_session, other_seller, visible_setup["laptops"], name="OtherProduct")
    db_session.commit()

    response = client.get("/products", params={"seller_id": visible_setup["seller"].id})

    names = [item["name"] for item in response.json()["items"]]
    assert names == ["ThinkPad"]


def test_filter_by_price_range(client: TestClient, db_session: DBSession, visible_setup):
    _make_product(
        db_session, visible_setup["seller"], visible_setup["laptops"], name="Cheap", price="5.00"
    )
    db_session.commit()

    response = client.get("/products", params={"min_price": "10.00", "max_price": "2000.00"})

    names = [item["name"] for item in response.json()["items"]]
    assert "ThinkPad" in names
    assert "Cheap" not in names


def test_pagination_caps_page_size(client: TestClient, visible_setup):
    response = client.get("/products", params={"page_size": 500})

    assert response.status_code == 422


def test_pagination_reports_total(client: TestClient, db_session: DBSession, visible_setup):
    for i in range(3):
        _make_product(
            db_session, visible_setup["seller"], visible_setup["laptops"], name=f"Extra{i}"
        )
    db_session.commit()

    response = client.get("/products", params={"page": 1, "page_size": 2})
    body = response.json()

    assert body["total"] == 4
    assert len(body["items"]) == 2
    assert body["page"] == 1
    assert body["page_size"] == 2


def test_get_product_detail(client: TestClient, visible_setup):
    response = client.get(f"/products/{visible_setup['product'].id}")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "ThinkPad"
    assert body["images"] == []


def test_get_product_404_for_nonexistent(client: TestClient, visible_setup):
    response = client.get("/products/999999")

    assert response.status_code == 404


def test_get_product_404_for_inactive(client: TestClient, db_session: DBSession, visible_setup):
    hidden = _make_product(
        db_session,
        visible_setup["seller"],
        visible_setup["laptops"],
        name="Hidden2",
        is_active=False,
    )
    db_session.commit()

    response = client.get(f"/products/{hidden.id}")

    assert response.status_code == 404
