from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.product import Product
from app.models.seller_action_log import SellerActionLog
from tests.helpers import make_approved_seller, make_category, make_product, signup_verify_login


def _apply_as_seller(client: TestClient, db_session: DBSession, monkeypatch, email: str) -> int:
    signup_verify_login(client, db_session, monkeypatch, email)
    response = client.post("/sellers/apply", json={"business_name": "Pending Shop"})
    return response.json()["id"]  # type: ignore[no-any-return]


def test_non_admin_cannot_list_sellers(client: TestClient, db_session: DBSession, monkeypatch):
    signup_verify_login(client, db_session, monkeypatch, "notadmin@example.com")

    response = client.get("/admin/sellers")

    assert response.status_code == 403


def test_admin_can_approve_seller_and_logs_it(
    client: TestClient, db_session: DBSession, monkeypatch
):
    monkeypatch.setattr(
        "app.routers.admin_sellers.send_seller_decision_email", lambda *a, **k: None
    )
    seller_id = _apply_as_seller(client, db_session, monkeypatch, "applicant@example.com")
    signup_verify_login(client, db_session, monkeypatch, "admin@example.com", is_admin=True)

    response = client.post(f"/admin/sellers/{seller_id}/approve")

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    logs = (
        db_session.query(SellerActionLog)
        .filter(SellerActionLog.seller_profile_id == seller_id)
        .all()
    )
    assert len(logs) == 1
    assert logs[0].action == "approved"


def test_admin_can_reject_seller_with_reason(
    client: TestClient, db_session: DBSession, monkeypatch
):
    monkeypatch.setattr(
        "app.routers.admin_sellers.send_seller_decision_email", lambda *a, **k: None
    )
    seller_id = _apply_as_seller(client, db_session, monkeypatch, "applicant2@example.com")
    signup_verify_login(client, db_session, monkeypatch, "admin2@example.com", is_admin=True)

    response = client.post(f"/admin/sellers/{seller_id}/reject", json={"reason": "Incomplete info"})

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    logs = (
        db_session.query(SellerActionLog)
        .filter(SellerActionLog.seller_profile_id == seller_id)
        .all()
    )
    assert logs[0].reason == "Incomplete info"


def test_approve_nonexistent_seller_404s(client: TestClient, db_session: DBSession, monkeypatch):
    signup_verify_login(client, db_session, monkeypatch, "admin3@example.com", is_admin=True)

    response = client.post("/admin/sellers/999999/approve")

    assert response.status_code == 404


def test_suspend_deactivates_all_seller_products_and_logs_it(
    client: TestClient, db_session: DBSession, monkeypatch
):
    seller = make_approved_seller(client, db_session, monkeypatch, "suspend-seller1@example.com")
    category = make_category(db_session)
    product_a = make_product(db_session, seller, category, name="A")
    product_b = make_product(db_session, seller, category, name="B")

    signup_verify_login(client, db_session, monkeypatch, "suspend-admin1@example.com", is_admin=True)
    response = client.post(
        f"/admin/sellers/{seller.id}/suspend", json={"reason": "policy violation"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "suspended"

    db_session.refresh(product_a)
    db_session.refresh(product_b)
    assert product_a.is_active is False
    assert product_b.is_active is False

    logs = (
        db_session.query(SellerActionLog)
        .filter(SellerActionLog.seller_profile_id == seller.id)
        .all()
    )
    assert logs[0].action == "suspended"
    assert logs[0].reason == "policy violation"


def test_reinstate_restores_approved_status_without_reactivating_products(
    client: TestClient, db_session: DBSession, monkeypatch
):
    seller = make_approved_seller(client, db_session, monkeypatch, "suspend-seller2@example.com")
    category = make_category(db_session)
    product = make_product(db_session, seller, category)

    signup_verify_login(client, db_session, monkeypatch, "suspend-admin2@example.com", is_admin=True)
    client.post(f"/admin/sellers/{seller.id}/suspend", json={"reason": "test"})

    response = client.post(f"/admin/sellers/{seller.id}/reinstate")

    assert response.status_code == 200
    assert response.json()["status"] == "approved"

    reloaded_product = db_session.query(Product).filter(Product.id == product.id).one()
    assert reloaded_product.is_active is False  # not auto-reactivated

    logs = (
        db_session.query(SellerActionLog)
        .filter(SellerActionLog.seller_profile_id == seller.id)
        .order_by(SellerActionLog.id)
        .all()
    )
    assert [log.action for log in logs] == ["suspended", "reinstated"]
