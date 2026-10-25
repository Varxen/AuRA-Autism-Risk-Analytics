from datetime import datetime

from fastapi.testclient import TestClient
import pytest

ORIGIN = "http://localhost:5173"


@pytest.fixture
def client(make_app):
    with TestClient(make_app(), headers={"Origin": ORIGIN}) as instance:
        yield instance


def test_onboarding_is_persistent_and_requires_each_server_owned_step(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "onboarding@example.test", "password": "fictional parent password 123"},
    )
    assert response.status_code == 201

    state = client.get("/api/v1/onboarding")
    assert state.status_code == 200
    assert state.json()["requiredStep"] == "about"
    assert client.post("/api/v1/onboarding/consent").status_code == 409
    assert client.put("/api/v1/onboarding/eligibility", json={
        "relationship": "parent", "regularInteraction": True, "ageMonths": 24,
    }).status_code == 409

    about = client.post("/api/v1/onboarding/about")
    assert about.status_code == 200 and about.json()["requiredStep"] == "consent"
    consent = client.post("/api/v1/onboarding/consent")
    assert consent.status_code == 200
    assert consent.json()["consentVersion"] == consent.json()["consentVersionCurrent"]
    assert consent.json()["requiredStep"] == "parent-child"
    assert client.put("/api/v1/onboarding/eligibility", json={
        "relationship": "parent", "regularInteraction": True, "ageMonths": 11,
    }).status_code == 422

    saved = client.put("/api/v1/onboarding/eligibility", json={
        "relationship": "legal-guardian", "regularInteraction": True, "ageMonths": 24,
    })
    assert saved.status_code == 200 and saved.json()["requiredStep"] == "complete"
    assert client.get("/api/v1/onboarding").json()["ageMonths"] == 24
    complete = client.post("/api/v1/onboarding/complete")
    assert complete.status_code == 200 and complete.json()["requiredStep"] is None
    completed_at = complete.json()["completedAt"]
    assert client.post("/api/v1/onboarding/consent").json()["requiredStep"] is None
    repeated = client.post("/api/v1/onboarding/complete").json()["completedAt"]
    assert datetime.fromisoformat(repeated) == datetime.fromisoformat(completed_at)


def test_onboarding_records_are_isolated_by_authenticated_account(client):
    creds = {"password": "fictional parent password 123"}
    first = client.post("/api/v1/auth/register", json={"email": "first-onboard@example.test", **creds})
    assert first.status_code == 201
    client.post("/api/v1/onboarding/about")
    client.post("/api/v1/onboarding/consent")
    client.put("/api/v1/onboarding/eligibility", json={
        "relationship": "parent", "regularInteraction": True, "ageMonths": 20,
    })

    second = TestClient(client.app, headers={"Origin": "http://localhost:5173"})
    with second:
        created = second.post("/api/v1/auth/register", json={"email": "second-onboard@example.test", **creds})
        assert created.status_code == 201
        state = second.get("/api/v1/onboarding").json()
        assert state["requiredStep"] == "about"
        assert state["ageMonths"] is None
