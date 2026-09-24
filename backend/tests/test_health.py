from fastapi.testclient import TestClient


def test_health_returns_ok_when_db_is_reachable(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "ok"}
