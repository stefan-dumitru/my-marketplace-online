from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.category import Category


def test_categories_nest_under_their_parent(client: TestClient, db_session: DBSession):
    electronics = Category(name="Electronics", slug="electronics")
    db_session.add(electronics)
    db_session.flush()
    laptops = Category(name="Laptops", slug="laptops", parent_id=electronics.id)
    books = Category(name="Books", slug="books")
    db_session.add_all([laptops, books])
    db_session.commit()

    response = client.get("/categories")

    assert response.status_code == 200
    body = response.json()
    by_slug = {c["slug"]: c for c in body}
    assert "laptops" not in by_slug  # nested under electronics, not top-level
    assert by_slug["electronics"]["children"][0]["slug"] == "laptops"
    assert by_slug["books"]["children"] == []
