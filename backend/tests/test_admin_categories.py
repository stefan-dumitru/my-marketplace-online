from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.category import Category
from tests.helpers import make_approved_seller, make_category, make_product, signup_verify_login


def test_non_admin_cannot_create_category(client: TestClient, db_session: DBSession, monkeypatch):
    signup_verify_login(client, db_session, monkeypatch, "not-admin1@example.com")

    response = client.post("/admin/categories", json={"name": "Toys", "slug": "toys"})

    assert response.status_code == 403


def test_admin_can_create_and_update_category(
    client: TestClient, db_session: DBSession, monkeypatch
):
    signup_verify_login(client, db_session, monkeypatch, "cat-admin1@example.com", is_admin=True)

    create_response = client.post("/admin/categories", json={"name": "Toys", "slug": "toys"})
    assert create_response.status_code == 201
    category_id = create_response.json()["id"]

    update_response = client.patch(
        f"/admin/categories/{category_id}", json={"name": "Toys & Games"}
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Toys & Games"
    assert update_response.json()["slug"] == "toys"


def test_create_with_unknown_parent_is_400(client: TestClient, db_session: DBSession, monkeypatch):
    signup_verify_login(client, db_session, monkeypatch, "cat-admin2@example.com", is_admin=True)

    response = client.post(
        "/admin/categories", json={"name": "Toys", "slug": "toys", "parent_id": 999999}
    )

    assert response.status_code == 400


def test_delete_blocked_by_direct_product(client: TestClient, db_session: DBSession, monkeypatch):
    category = make_category(db_session, "Direct Cat", "direct-cat")
    seller = make_approved_seller(client, db_session, monkeypatch, "cat-seller1@example.com")
    make_product(db_session, seller, category)
    signup_verify_login(client, db_session, monkeypatch, "cat-admin3@example.com", is_admin=True)

    response = client.delete(f"/admin/categories/{category.id}")

    assert response.status_code == 409


def test_delete_blocked_by_descendant_product(
    client: TestClient, db_session: DBSession, monkeypatch
):
    parent = Category(name="Parent Cat", slug="parent-cat")
    db_session.add(parent)
    db_session.flush()
    child = Category(name="Child Cat", slug="child-cat", parent_id=parent.id)
    db_session.add(child)
    db_session.commit()

    seller = make_approved_seller(client, db_session, monkeypatch, "cat-seller2@example.com")
    make_product(db_session, seller, child)
    signup_verify_login(client, db_session, monkeypatch, "cat-admin4@example.com", is_admin=True)

    response = client.delete(f"/admin/categories/{parent.id}")

    assert response.status_code == 409


def test_delete_succeeds_when_unreferenced(client: TestClient, db_session: DBSession, monkeypatch):
    category = make_category(db_session, "Empty Cat", "empty-cat")
    signup_verify_login(client, db_session, monkeypatch, "cat-admin5@example.com", is_admin=True)

    response = client.delete(f"/admin/categories/{category.id}")

    assert response.status_code == 204
    assert db_session.query(Category).filter(Category.id == category.id).first() is None
