from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok_when_db_is_reachable() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "ok"}
