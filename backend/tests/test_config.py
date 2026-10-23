import pytest
from fastapi.testclient import TestClient

from aura_api.config import Settings


def test_health_and_explicit_cors(make_app):
    with TestClient(make_app()) as client:
        response = client.get("/api/v1/health", headers={"Origin": "http://localhost:5173"})
        assert response.json() == {"status": "ok", "environment": "test", "storage": "postgresql"}
        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
        assert response.headers["access-control-allow-credentials"] == "true"
        untrusted = client.get("/api/v1/health", headers={"Origin": "https://untrusted.example"})
        assert "access-control-allow-origin" not in untrusted.headers
        assert client.get("/api/v1/health", headers={"Host": "untrusted.example"}).status_code == 400


@pytest.mark.parametrize("values", [
    {"environment": "production"},
    {"frontend_origins": ("*",)},
    {"frontend_origins": ("http://untrusted.example",)},
    {"frontend_origins": ("http://localhost:5173/path",)},
    {"frontend_origins": ("http://user:password@localhost:5173",)},
    {"frontend_origins": ("http://localhost:99999",)},
    {"frontend_origins": ()},
    {"session_ttl_seconds": 0},
    {"session_idle_seconds": 30_000},
])
def test_unsafe_or_invalid_configuration_is_rejected(values):
    with pytest.raises(ValueError):
        Settings(database_url=Settings.from_env().database_url, **values)


def test_env_parsing_is_strict(monkeypatch):
    monkeypatch.setenv("AURA_COOKIE_SECURE", "maybe")
    with pytest.raises(ValueError):
        Settings.from_env()
    monkeypatch.setenv("AURA_COOKIE_SECURE", "true")
    assert Settings.from_env().cookie_name == "__Host-aura_session"


def test_postgresql_is_required_and_empty_schema_fails_closed(make_app):
    with pytest.raises(ValueError, match="Configure the PostgreSQL"):
        Settings()
    with pytest.raises(ValueError, match="Use PostgreSQL"):
        Settings(database_url="sqlite://", environment="test")
    with pytest.raises(RuntimeError, match="migrations are missing"):
        with TestClient(make_app(create_tables=False)):
            pass
