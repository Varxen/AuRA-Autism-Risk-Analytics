from uuid import uuid4

from fastapi.testclient import TestClient
import pytest

ORIGIN = "http://localhost:5173"
PASSWORD = "fictional parent password 123"


@pytest.fixture
def client(make_app):
    with TestClient(make_app(), headers={"Origin": ORIGIN}) as instance:
        yield instance


def register(client, email="chat@example.test"):
    return client.post("/api/v1/auth/register", json={"email": email, "password": PASSWORD})


def create_chat(client):
    return client.post("/api/v1/chats")


def complete_onboarding(client):
    client.get("/api/v1/onboarding")
    assert client.post("/api/v1/onboarding/about").status_code == 200
    assert client.post("/api/v1/onboarding/consent").status_code == 200
    assert client.put("/api/v1/onboarding/eligibility", json={
        "relationship": "parent", "regularInteraction": True, "ageMonths": 24,
    }).status_code == 200
    assert client.post("/api/v1/onboarding/complete").status_code == 200


def test_chat_creation_turns_history_delete_and_idempotent_retry(client):
    register(client)
    assert create_chat(client).status_code == 409
    complete_onboarding(client)
    created = create_chat(client)
    assert created.status_code == 201
    initial = created.json()
    chat_id = initial["id"]
    assert initial["messages"][0]["role"] == "assistant"
    assert len(initial["messages"][0]["actions"]) == 2

    turn = {
        "turnId": str(uuid4()),
        "userContent": "I want to know about ASD",
        "assistantMessages": [
            {
                "type": "education",
                "content": "Autism Spectrum Disorder (ASD) is a developmental condition.",
                "sources": ["WHO (2025)"],
            },
            {
                "type": "actions",
                "content": "Would you like to learn more or start the pre-assessment?",
                "actions": [
                    {"id": "learn-more", "label": "Learn more"},
                    {"id": "assessment", "label": "Pre-assessment"},
                ],
            },
        ],
    }
    saved = client.post(f"/api/v1/chats/{chat_id}/turns", json=turn)
    assert saved.status_code == 200
    body = saved.json()
    assert body["userMessage"]["content"] == turn["userContent"]
    assert body["assistantMessages"][0]["sources"] == ["WHO (2025)"]
    assert body["assistantMessages"][1]["actions"][0]["id"] == "learn-more"

    repeated = client.post(f"/api/v1/chats/{chat_id}/turns", json=turn)
    assert repeated.status_code == 200
    retried = repeated.json()
    assert retried["userMessage"]["id"] == body["userMessage"]["id"]
    assert [message["id"] for message in retried["assistantMessages"]] == [
        message["id"] for message in body["assistantMessages"]
    ]
    changed = {**turn, "userContent": "Changed content"}
    assert client.post(f"/api/v1/chats/{chat_id}/turns", json=changed).status_code == 409

    restored = client.get(f"/api/v1/chats/{chat_id}")
    assert restored.status_code == 200
    messages = restored.json()["messages"]
    assert len(messages) == 4
    assert [message["id"] for message in messages[1:]] == [
        body["userMessage"]["id"],
        *[message["id"] for message in body["assistantMessages"]],
    ]
    history = client.get("/api/v1/chats")
    assert history.status_code == 200
    assert [chat["id"] for chat in history.json()] == [chat_id]

    deleted = client.delete(f"/api/v1/chats/{chat_id}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/chats/{chat_id}").status_code == 404
    assert client.get("/api/v1/chats").json() == []


def test_chat_data_is_private_to_owner_and_turn_payloads_are_validated(client):
    register(client, "first-chat@example.test")
    complete_onboarding(client)
    first_id = create_chat(client).json()["id"]
    client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": client.get("/api/v1/auth/session").json()["csrfToken"]})

    register(client, "second-chat@example.test")
    complete_onboarding(client)
    assert client.get("/api/v1/chats").json() == []
    assert client.get(f"/api/v1/chats/{first_id}").status_code == 404
    assert client.delete(f"/api/v1/chats/{first_id}").status_code == 404
    assert client.post(f"/api/v1/chats/{first_id}/turns", json={
        "turnId": str(uuid4()),
        "userContent": "hello",
        "assistantMessages": [{"type": "actions", "content": "Pick one."}],
    }).status_code == 422
    assert create_chat(client).status_code == 201


def test_chat_routes_require_authentication(client):
    assert client.get("/api/v1/chats").status_code == 401
    assert client.post("/api/v1/chats").status_code == 401


def test_chat_turn_accepts_the_full_unicode_input_limit(client):
    register(client)
    complete_onboarding(client)
    chat_id = create_chat(client).json()["id"]
    content = "🙂" * 4000
    response = client.post(f"/api/v1/chats/{chat_id}/turns", json={
        "turnId": str(uuid4()),
        "userContent": content,
        "assistantMessages": [{"type": "text", "content": "Saved."}],
    })
    assert response.status_code == 200
    assert response.json()["userMessage"]["content"] == content


def test_chat_intent_requires_auth_and_maps_model_results(client, monkeypatch):
    from aura_api import chats

    assert client.post("/api/v1/chats/intent", json={"text": "is it contagious"}).status_code == 401
    register(client, "intent@example.test")
    monkeypatch.setattr(chats, "classify_intent", lambda text, base_url: {
        "decision": "answer", "question": "Is autism contagious?", "confidence": 0.97, "suggestions": [],
    })
    ok = client.post("/api/v1/chats/intent", json={"text": "nakakahawa ba"})
    assert ok.status_code == 200
    assert ok.json() == {
        "decision": "answer", "question": "Is autism contagious?", "confidence": 0.97, "suggestions": [],
    }
    assert client.post("/api/v1/chats/intent", json={"text": "   "}).status_code == 422

    def unavailable(text, base_url):
        raise chats.IntentModelUnavailable()

    monkeypatch.setattr(chats, "classify_intent", unavailable)
    assert client.post("/api/v1/chats/intent", json={"text": "hello"}).status_code == 503
