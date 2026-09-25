from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from tests.helpers import DEFAULT_ADDRESS_PAYLOAD, signup_verify_login


def _address_payload(**overrides):
    payload = dict(DEFAULT_ADDRESS_PAYLOAD)
    payload.update(overrides)
    return payload


def test_first_address_is_default_automatically(
    client: TestClient, db_session: DBSession, monkeypatch
):
    signup_verify_login(client, db_session, monkeypatch, "addr-buyer1@example.com")

    response = client.post("/addresses", json=_address_payload(label="Home"))

    assert response.status_code == 201, response.text
    assert response.json()["is_default"] is True


def test_second_address_is_not_default_by_default(
    client: TestClient, db_session: DBSession, monkeypatch
):
    signup_verify_login(client, db_session, monkeypatch, "addr-buyer2@example.com")
    client.post("/addresses", json=_address_payload(label="Home"))

    response = client.post("/addresses", json=_address_payload(label="Work"))

    assert response.status_code == 201, response.text
    assert response.json()["is_default"] is False


def test_creating_with_is_default_true_unsets_the_previous_default(
    client: TestClient, db_session: DBSession, monkeypatch
):
    signup_verify_login(client, db_session, monkeypatch, "addr-buyer3@example.com")
    first = client.post("/addresses", json=_address_payload(label="Home")).json()

    second = client.post("/addresses", json=_address_payload(label="Work", is_default=True)).json()

    assert second["is_default"] is True
    refreshed_first = client.get("/addresses").json()
    first_after = next(a for a in refreshed_first if a["id"] == first["id"])
    assert first_after["is_default"] is False


def test_patch_is_default_true_unsets_other_default(
    client: TestClient, db_session: DBSession, monkeypatch
):
    signup_verify_login(client, db_session, monkeypatch, "addr-buyer4@example.com")
    first = client.post("/addresses", json=_address_payload(label="Home")).json()
    second = client.post("/addresses", json=_address_payload(label="Work")).json()

    response = client.patch(f"/addresses/{second['id']}", json={"is_default": True})

    assert response.status_code == 200, response.text
    assert response.json()["is_default"] is True
    addresses = client.get("/addresses").json()
    first_after = next(a for a in addresses if a["id"] == first["id"])
    assert first_after["is_default"] is False


def test_delete_non_default_address_leaves_default_untouched(
    client: TestClient, db_session: DBSession, monkeypatch
):
    signup_verify_login(client, db_session, monkeypatch, "addr-buyer5@example.com")
    first = client.post("/addresses", json=_address_payload(label="Home")).json()
    second = client.post("/addresses", json=_address_payload(label="Work")).json()

    response = client.delete(f"/addresses/{second['id']}")

    assert response.status_code == 204
    addresses = client.get("/addresses").json()
    assert len(addresses) == 1
    assert addresses[0]["id"] == first["id"]
    assert addresses[0]["is_default"] is True


def test_delete_default_address_promotes_another(
    client: TestClient, db_session: DBSession, monkeypatch
):
    signup_verify_login(client, db_session, monkeypatch, "addr-buyer6@example.com")
    first = client.post("/addresses", json=_address_payload(label="Home")).json()
    second = client.post("/addresses", json=_address_payload(label="Work")).json()

    response = client.delete(f"/addresses/{first['id']}")

    assert response.status_code == 204
    addresses = client.get("/addresses").json()
    assert len(addresses) == 1
    assert addresses[0]["id"] == second["id"]
    assert addresses[0]["is_default"] is True


def test_delete_only_address_leaves_none(client: TestClient, db_session: DBSession, monkeypatch):
    signup_verify_login(client, db_session, monkeypatch, "addr-buyer7@example.com")
    only = client.post("/addresses", json=_address_payload(label="Home")).json()

    response = client.delete(f"/addresses/{only['id']}")

    assert response.status_code == 204
    assert client.get("/addresses").json() == []


def test_cannot_patch_or_delete_another_users_address(
    client: TestClient, db_session: DBSession, monkeypatch
):
    signup_verify_login(client, db_session, monkeypatch, "addr-owner@example.com")
    owned = client.post("/addresses", json=_address_payload(label="Home")).json()

    signup_verify_login(client, db_session, monkeypatch, "addr-intruder@example.com")

    patch_response = client.patch(f"/addresses/{owned['id']}", json={"label": "Hijacked"})
    delete_response = client.delete(f"/addresses/{owned['id']}")

    assert patch_response.status_code == 404
    assert delete_response.status_code == 404
