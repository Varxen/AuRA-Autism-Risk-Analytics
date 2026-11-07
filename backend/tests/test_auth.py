from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
import pytest

from sqlalchemy import func, select

from aura_api.auth.schemas import Credentials
from aura_api.auth.store import (
    AssessmentAnswerRecord,
    AssessmentProcessingJobRecord,
    AssessmentRecord,
    ChatConversationRecord,
    ChatMessageRecord,
    OnboardingRecord,
    SessionRecord,
    UserRecord,
)
from aura_api.auth.security import hash_password, token_digest, verify_password
from aura_api.errors import APIError
from aura_api.main import create_app

ORIGIN = "http://localhost:5173"
PASSWORD = "fictional parent password 123"
CREDS = {"email": "parent@example.test", "password": PASSWORD}


@pytest.fixture
def client(make_app):
    app = make_app()
    with TestClient(app, headers={"Origin": ORIGIN}) as instance:
        yield instance


def stored_users(client):
    with client.app.state.database.sessions() as db:
        return list(db.scalars(select(UserRecord)))


def stored_sessions(client):
    with client.app.state.database.sessions() as db:
        return list(db.scalars(select(SessionRecord)))


def register(client, email="parent@example.test", password=PASSWORD):
    response = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert response.status_code == 201, response.text
    return response


def test_register_hashes_password_and_exposes_only_public_session_fields(client):
    response = register(client, "  Parent@Example.Test  ")
    body = response.json()
    assert set(body) == {"user", "csrfToken", "expiresAt", "idleExpiresAt"}
    assert set(body["user"]) == {"id", "email", "role", "emailVerified", "createdAt"}
    assert body["user"]["email"] == "parent@example.test"
    assert body["user"]["role"] == "parent_guardian"
    assert body["user"]["emailVerified"] is False
    token = client.cookies.get("aura_session")
    assert len(token) == 43 and token != body["csrfToken"]
    assert token not in response.text and PASSWORD not in response.text
    user = stored_users(client)[0]
    sessions = stored_sessions(client)
    assert user.password_hash != PASSWORD
    assert verify_password(PASSWORD, user.password_hash)
    assert {session.token_hash for session in sessions} == {token_digest(token)}
    assert all(session.token_hash != token for session in sessions)
    assert PASSWORD not in repr(user)
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie and "Path=/" in cookie
    assert "Max-Age=28800" in cookie and "Domain=" not in cookie
    current = client.get("/api/v1/auth/session")
    assert current.status_code == 200
    assert current.json()["user"] == body["user"]
    assert current.headers["cache-control"] == "no-store"
    assert current.headers["x-content-type-options"] == "nosniff"
    assert current.headers["access-control-allow-origin"] == ORIGIN


def test_password_hashes_are_salted_and_password_whitespace_is_preserved(client):
    first, second = hash_password(PASSWORD), hash_password(PASSWORD)
    assert first != second
    assert verify_password(PASSWORD, first)
    assert not verify_password(PASSWORD + "x", first)
    assert not verify_password(PASSWORD, "invalid hash")
    assert not verify_password(PASSWORD, first.replace("32768", "999999999"))
    password = "  a fictional parent password  "
    register(client, password=password)
    assert client.post("/api/v1/auth/login", json={**CREDS, "password": password.strip()}).status_code == 401
    assert client.post("/api/v1/auth/login", json={**CREDS, "password": password}).status_code == 200
    assert PASSWORD not in repr(Credentials(**CREDS))


def test_duplicate_email_is_canonical_and_atomic(client):
    register(client)
    duplicate = client.post("/api/v1/auth/register", json={**CREDS, "email": "PARENT@EXAMPLE.TEST"})
    assert duplicate.status_code == 409
    assert len(stored_users(client)) == 1
    auth = client.app.state.auth

    def attempt():
        try:
            auth.register("race@example.test", PASSWORD, None)
            return 201
        except APIError as error:
            return error.status

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(lambda _: attempt(), range(2))) == [201, 409]
    assert len(stored_users(client)) == 2


def test_login_rotates_only_current_browser_session_and_binds_csrf(client):
    original = register(client).json()
    first_token = client.cookies.get("aura_session")
    with TestClient(client.app, headers={"Origin": ORIGIN}) as other:
        other_login = other.post("/api/v1/auth/login", json=CREDS)
        assert other_login.status_code == 200
        refreshed = client.post("/api/v1/auth/login", json=CREDS)
        assert refreshed.status_code == 200
        assert client.cookies.get("aura_session") != first_token
        assert refreshed.json()["csrfToken"] != original["csrfToken"]
        assert other.get("/api/v1/auth/session").status_code == 200
        with TestClient(client.app) as replay:
            old = replay.get("/api/v1/auth/session", headers={"Cookie": f"aura_session={first_token}"})
            assert old.status_code == 401
        assert client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": original["csrfToken"]}).status_code == 403
        assert client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": other_login.json()["csrfToken"]}).status_code == 403
        assert client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": refreshed.json()["csrfToken"]}).status_code == 204
        assert other.get("/api/v1/auth/session").status_code == 200


def test_wrong_and_unknown_credentials_have_same_error_and_do_not_end_valid_session(client):
    register(client)
    wrong = client.post("/api/v1/auth/login", json={**CREDS, "password": "a fictional wrong password"})
    unknown = client.post("/api/v1/auth/login", json={**CREDS, "email": "unknown@example.test"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    assert "set-cookie" not in wrong.headers
    assert client.get("/api/v1/auth/session").status_code == 200
    assert PASSWORD not in unknown.text


def test_logout_requires_csrf_and_revokes_server_record(client):
    response = register(client)
    token = client.cookies.get("aura_session")
    assert client.post("/api/v1/auth/logout").status_code == 403
    assert client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": "wrong"}).status_code == 403
    assert client.get("/api/v1/auth/session").status_code == 200
    assert client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": response.json()["csrfToken"]}).status_code == 204
    assert client.cookies.get("aura_session") is None
    assert client.get("/api/v1/auth/session", headers={"Cookie": f"aura_session={token}"}).status_code == 401
    assert not stored_sessions(client)
    assert client.post("/api/v1/auth/logout").status_code == 204


def test_account_deletion_requires_csrf_and_password_and_cascades_all_owned_records(client):
    account = register(client, "delete@example.test").json()
    user_id = account["user"]["id"]
    other_user = UserRecord(
        id=uuid4(), email="keep@example.test", password_hash=hash_password(PASSWORD),
        email_verified=False, created_at=datetime.now(UTC),
    )
    now = datetime.now(UTC)
    assessment = AssessmentRecord(
        id=uuid4(), user_id=UUID(user_id),
        questionnaire_version="revised-pilot-testing-2-v1", language="en",
        status="in-progress", current_question_index=0,
        current_clarification_attempts=0, current_consistency_blocked=False,
        questions_snapshot=[], is_demo_preview=False, started_at=now, updated_at=now,
    )
    conversation = ChatConversationRecord(
        id=uuid4(), user_id=assessment.user_id, started_at=now, updated_at=now,
    )
    with client.app.state.database.sessions.begin() as db:
        db.add_all([
            other_user,
            OnboardingRecord(user_id=assessment.user_id),
            assessment,
            conversation,
        ])
        db.flush()
        db.add_all([
            AssessmentAnswerRecord(
                assessment_id=assessment.id, question_id="q1", question_number=1,
                selected_option_id="always", structured_score=0,
                follow_up_text="A fictional response.", answered_at=now,
            ),
            AssessmentProcessingJobRecord(
                id=uuid4(), assessment_id=assessment.id, attempt=1,
                status="failed", stage_id=None, started_at=now, updated_at=now,
            ),
            ChatMessageRecord(
                id=uuid4(), conversation_id=conversation.id, sequence_number=0,
                turn_id=None, turn_position=None, role="assistant", message_type="text",
                content="A fictional chat message.", actions=None, sources=None, created_at=now,
            ),
        ])

    endpoint = "/api/v1/auth/account"
    csrf = account["csrfToken"]
    assert client.request("DELETE", endpoint, json={"password": PASSWORD}).status_code == 403
    assert client.request(
        "DELETE", endpoint, json={"password": PASSWORD}, headers={"X-CSRF-Token": "wrong"}
    ).status_code == 403
    assert client.request(
        "DELETE", endpoint, json={"password": "a fictional wrong password"},
        headers={"X-CSRF-Token": csrf},
    ).status_code == 403
    assert client.get("/api/v1/auth/session").status_code == 200

    deleted = client.request(
        "DELETE", endpoint, json={"password": PASSWORD}, headers={"X-CSRF-Token": csrf}
    )
    assert deleted.status_code == 204
    assert "Max-Age=0" in deleted.headers["set-cookie"]
    assert client.cookies.get("aura_session") is None
    assert client.get("/api/v1/auth/session").status_code == 401

    with client.app.state.database.sessions() as db:
        assert db.scalar(select(func.count()).select_from(UserRecord)) == 1
        assert db.scalar(select(UserRecord.email)) == "keep@example.test"
        for model in (
            SessionRecord, OnboardingRecord, AssessmentRecord, AssessmentAnswerRecord,
            AssessmentProcessingJobRecord, ChatConversationRecord, ChatMessageRecord,
        ):
            assert db.scalar(select(func.count()).select_from(model)) == 0


def test_authentication_isolated_by_cookie_not_supplied_user_id(client):
    alice = register(client).json()
    with TestClient(client.app, headers={"Origin": ORIGIN}) as other:
        assert other.get("/api/v1/auth/session").status_code == 401
        bob = register(other, "other@example.test").json()
        current = other.get("/api/v1/auth/session", params={"userId": alice["user"]["id"]})
        assert current.json()["user"]["id"] == bob["user"]["id"]
        assert client.get("/api/v1/auth/session").json()["user"]["id"] == alice["user"]["id"]


@pytest.mark.parametrize("body", [
    {**CREDS, "password": "short-7"},
    {**CREDS, "password": "x" * 129},
    {**CREDS, "password": " " * 8},
    {**CREDS, "password": 1234567890123456},
    {**CREDS, "email": "bad@@example.test"},
    {**CREDS, "email": "parent@localhost"},
    {**CREDS, "email": "parent\x00@example.test"},
    {**CREDS, "email": "parent@"},
    {**CREDS, "email": "@example.test"},
    {**CREDS, "email": "parent@example..test"},
    {**CREDS, "email": "parent@example.test\nInjected"},
    {**CREDS, "email": "Display <parent@example.test>"},
    {**CREDS, "role": "admin"},
    {**CREDS, "onboardingComplete": True},
])
def test_invalid_payloads_are_rejected_without_echoing_credentials(client, body):
    response = client.post("/api/v1/auth/register", json=body)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert PASSWORD not in response.text and "short-7" not in response.text
    assert '"input"' not in response.text
    assert not stored_users(client)


def test_origin_json_size_and_cors_boundaries(client):
    for origin in ["https://untrusted.example", "null", ""]:
        response = client.post("/api/v1/auth/register", headers={"Origin": origin}, json=CREDS)
        assert response.status_code == 403
    anonymous = TestClient(client.app)
    assert anonymous.post("/api/v1/auth/login", json=CREDS).status_code == 403
    assert client.post("/api/v1/auth/register", content="email=private", headers={"Content-Type": "application/x-www-form-urlencoded"}).status_code == 415
    assert client.post("/api/v1/auth/register", json={**CREDS, "password": "x" * 20_000}).status_code == 413
    malformed = client.post("/api/v1/auth/register", content='{"password":"sensitive-value",', headers={"Content-Type": "application/json"})
    assert malformed.status_code == 422 and "sensitive-value" not in malformed.text
    assert not stored_users(client)
    allowed = client.options("/api/v1/auth/login", headers={"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Content-Type,X-CSRF-Token"})
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == ORIGIN
    assert "*" not in allowed.headers["access-control-allow-origin"]
    denied = client.options("/api/v1/auth/login", headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "POST"})
    assert denied.status_code == 400


def test_idle_and_absolute_expiry_are_enforced_and_clear_cookie(monkeypatch, make_app):
    clock = datetime.now(UTC)
    monkeypatch.setattr("aura_api.auth.service.utcnow", lambda: clock)
    app = make_app(session_ttl_seconds=120, session_idle_seconds=30)
    with TestClient(app, headers={"Origin": ORIGIN}) as client:
        register(client)
        initial = clock
        for offset in [29, 58, 87, 116]:
            clock = initial + timedelta(seconds=offset)
            response = client.get("/api/v1/auth/session")
            assert response.status_code == 200
            expiry = datetime.fromisoformat(response.json()["expiresAt"].replace("Z", "+00:00"))
            assert expiry == initial + timedelta(seconds=120)
        clock = initial + timedelta(seconds=120)
        assert client.get("/api/v1/auth/session").status_code == 401
        assert client.cookies.get("aura_session") is None
        assert not stored_sessions(client)
        register(client, "idle@example.test")
        clock += timedelta(seconds=30)
        assert client.get("/api/v1/auth/session").status_code == 401


def test_auth_rate_limit_cannot_be_bypassed_with_forwarded_ip(monkeypatch, make_app):
    now = 1000.0
    monkeypatch.setattr("aura_api.auth.security.monotonic", lambda: now)
    app = make_app(auth_rate_limit=2)
    with TestClient(app, headers={"Origin": ORIGIN}) as client:
        for _ in range(2):
            assert client.post("/api/v1/auth/login", json=CREDS).status_code == 401
        blocked = client.post("/api/v1/auth/login", json=CREDS, headers={"X-Forwarded-For": "203.0.113.12"})
        assert blocked.status_code == 429
        assert int(blocked.headers["retry-after"]) == 60
        assert blocked.headers["cache-control"] == "no-store"
        now += 61
        assert client.post("/api/v1/auth/login", json=CREDS).status_code == 401


def test_secure_cookie_prefix_and_sessions_survive_backend_restart(make_app):
    app = make_app(cookie_secure=True)
    settings = app.state.settings
    with TestClient(app, base_url="https://localhost", headers={"Origin": ORIGIN}) as client:
        response = register(client)
        cookie = response.headers["set-cookie"]
        assert cookie.startswith("__Host-aura_session=") and "Secure" in cookie
        token = client.cookies.get("__Host-aura_session")
        assert client.get("/api/v1/auth/session").status_code == 200
    with TestClient(create_app(settings), base_url="https://localhost", headers={"Origin": ORIGIN}) as restarted:
        assert restarted.get("/api/v1/auth/session", headers={"Cookie": f"__Host-aura_session={token}"}).status_code == 200
        assert restarted.post("/api/v1/auth/login", json=CREDS).status_code == 200


def test_openapi_marks_password_write_only_and_exposes_owned_assessment_storage(client):
    schema = client.get("/openapi.json").json()
    assert schema["components"]["schemas"]["Credentials"]["properties"]["password"]["writeOnly"]
    assert "/api/v1/assessments" in schema["paths"]
    assert any("onboarding" in path for path in schema["paths"])
    assert not any("result" in path or "classification" in path for path in schema["paths"])
    assert client.post("/api/v1/auth/register", json={**CREDS, "consent": True}).status_code == 422


def test_non_ascii_csrf_and_malformed_cookie_are_rejected(client):
    register(client)
    token = client.cookies.get("aura_session")
    with pytest.raises(APIError) as rejected:
        client.app.state.auth.logout(token, "\u00ff" * 43)
    assert rejected.value.status == 403
    with TestClient(client.app) as stranger:
        assert stranger.get("/api/v1/auth/session", headers={"Cookie": "aura_session=malformed"}).status_code == 401
    assert client.get("/api/v1/auth/session").status_code == 200


def test_same_origin_api_docs_and_logout_header_contract(client):
    response = client.post("/api/v1/auth/register", json=CREDS, headers={"Origin": "http://testserver"})
    assert response.status_code == 201
    schema = client.get("/openapi.json").json()
    parameters = schema["paths"]["/api/v1/auth/logout"]["post"]["parameters"]
    assert any(item["in"] == "header" and item["name"] == "X-CSRF-Token" for item in parameters)
    assert client.post("/api/v1/auth/logout", headers={"Origin": "http://testserver", "X-CSRF-Token": response.json()["csrfToken"]}).status_code == 204


def test_database_failures_return_safe_errors_without_credentials(client, monkeypatch):
    from sqlalchemy.exc import OperationalError

    def unavailable(*_args, **_kwargs):
        raise OperationalError("SELECT", {"password": PASSWORD}, Exception("private database details"))

    monkeypatch.setattr(client.app.state.auth, "login", unavailable)
    response = client.post("/api/v1/auth/login", json=CREDS)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "database_unavailable"
    assert PASSWORD not in response.text and "private database details" not in response.text
    assert response.headers["cache-control"] == "no-store"
