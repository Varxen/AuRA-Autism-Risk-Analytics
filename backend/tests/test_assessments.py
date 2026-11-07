from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from aura_api.auth.store import AssessmentProcessingJobRecord

from fastapi.testclient import TestClient
import pytest

ORIGIN = "http://localhost:5173"
PASSWORD = "fictional parent password 123"


@pytest.fixture
def client(make_app):
    with TestClient(make_app(), headers={"Origin": ORIGIN}) as instance:
        yield instance


def register(client, email="assessment@example.test"):
    return client.post("/api/v1/auth/register", json={"email": email, "password": PASSWORD})


def complete_onboarding(client):
    client.get("/api/v1/onboarding")
    assert client.post("/api/v1/onboarding/about").status_code == 200
    assert client.post("/api/v1/onboarding/consent").status_code == 200
    assert client.put("/api/v1/onboarding/eligibility", json={
        "relationship": "parent", "regularInteraction": True, "ageMonths": 24,
    }).status_code == 200
    assert client.post("/api/v1/onboarding/complete").status_code == 200


def create(client, language="en"):
    return client.post("/api/v1/assessments", json={
        "language": language,
        "questionnaireVersion": "revised-pilot-testing-2-v1",
    })


def test_assessment_creation_requires_current_server_consent_and_returns_versioned_snapshot(client):
    register(client)
    assert create(client).status_code == 409
    complete_onboarding(client)
    response = create(client, "fil")
    assert response.status_code == 201
    body = response.json()
    assert body["session"]["language"] == "fil"
    assert body["session"]["questionnaireVersion"] == "revised-pilot-testing-2-v1"
    assert len(body["questions"]) == 13
    assert body["questions"][0]["mainQuestion"] == "Gaano kadalas tumutugon ang inyong anak kapag tinatawag ang kanyang pangalan?"
    assert body["questions"][8]["options"] == [
        {"id": "always", "label": "Palagi", "score": 0},
        {"id": "sometimes", "label": "Minsan", "score": 1},
        {"id": "never", "label": "Hindi kailanman", "score": 2},
    ]
    assert "result" not in body and "riskLevel" not in body


def test_answers_are_server_scored_sequenced_immutable_and_recoverable(client):
    register(client)
    complete_onboarding(client)
    created = create(client).json()
    assessment_id = created["session"]["id"]

    assert client.post(f"/api/v1/assessments/{assessment_id}/advance").status_code == 409
    assert client.put(f"/api/v1/assessments/{assessment_id}/answers/q1", json={
        "selectedOptionId": "not-an-option",
    }).status_code == 422
    first = client.put(f"/api/v1/assessments/{assessment_id}/answers/q1", json={
        "selectedOptionId": "never",
    })
    assert first.status_code == 200
    assert first.json()["session"]["answers"][0]["structuredScore"] == 2
    assert client.post(f"/api/v1/assessments/{assessment_id}/advance").status_code == 409
    assert client.put(f"/api/v1/assessments/{assessment_id}/answers/q2", json={
        "selectedOptionId": "always",
    }).status_code == 409

    original = "  Sometimes he looks, but not always.  "
    saved = client.put(f"/api/v1/assessments/{assessment_id}/answers/q1", json={
        "selectedOptionId": "never", "followUpText": original,
    })
    assert saved.status_code == 200
    assert saved.json()["session"]["answers"][0]["followUpText"] == original
    assert client.put(f"/api/v1/assessments/{assessment_id}/answers/q1", json={
        "selectedOptionId": "never", "followUpText": original,
    }).status_code == 200
    assert client.put(f"/api/v1/assessments/{assessment_id}/answers/q1", json={
        "selectedOptionId": "never", "followUpText": "changed response",
    }).status_code == 409
    advanced = client.post(f"/api/v1/assessments/{assessment_id}/advance")
    assert advanced.status_code == 200
    assert advanced.json()["session"]["currentQuestionIndex"] == 1
    restored = client.get(f"/api/v1/assessments/{assessment_id}").json()
    assert restored["session"]["answers"][0]["followUpText"] == original


def test_full_assessment_completes_without_a_risk_result_and_preview_is_marked(client):
    register(client)
    complete_onboarding(client)
    assessment_id = create(client).json()["session"]["id"]
    for number in range(1, 14):
        option = "never" if number <= 9 else "yes"
        saved = client.put(f"/api/v1/assessments/{assessment_id}/answers/q{number}", json={
            "selectedOptionId": option,
        })
        assert saved.status_code == 200
        followed = client.put(f"/api/v1/assessments/{assessment_id}/answers/q{number}", json={
            "selectedOptionId": option,
            "followUpText": f"Fictional observation for question {number}.",
        })
        assert followed.status_code == 200
        advanced = client.post(f"/api/v1/assessments/{assessment_id}/advance")
        assert advanced.status_code == 200
    result = advanced.json()
    assert result["session"]["status"] == "completed"
    assert result["session"]["completedAt"]
    assert len(result["session"]["answers"]) == 13
    assert "riskLevel" not in result["session"]

    preview = create(client).json()["session"]["id"]
    previewed = client.post(f"/api/v1/assessments/{preview}/demo-preview")
    assert previewed.status_code == 200
    assert previewed.json()["session"]["isDemoPreview"] is True
    assert len(previewed.json()["session"]["answers"]) == 13
    assert previewed.json()["session"]["answers"][0]["followUpText"].startswith("[Demo preview]")


def test_processing_job_persists_demo_stages_and_retries_without_result(client):
    register(client)
    complete_onboarding(client)
    assessment_id = create(client).json()["session"]["id"]
    assert client.post(f"/api/v1/assessments/{assessment_id}/processing").status_code == 409
    assert client.post(f"/api/v1/assessments/{assessment_id}/demo-preview").status_code == 200

    started = client.post(f"/api/v1/assessments/{assessment_id}/processing")
    assert started.status_code == 202
    job = started.json()
    assert job["status"] == "running"
    assert job["mode"] == "demo"
    assert job["stageId"] == "review"
    assert job["attempt"] == 1
    assert job["resultAvailable"] is False
    assert "riskLevel" not in job
    repeated = client.post(f"/api/v1/assessments/{assessment_id}/processing").json()
    assert repeated["id"] == job["id"] and repeated["attempt"] == 1

    with client.app.state.database.sessions.begin() as db:
        record = db.scalar(select(AssessmentProcessingJobRecord).where(
            AssessmentProcessingJobRecord.assessment_id == job["assessmentId"],
        ))
        record.started_at = datetime.now(UTC) - timedelta(minutes=1)
    completed = client.get(f"/api/v1/assessments/{assessment_id}/processing")
    assert completed.status_code == 200
    assert completed.json()["status"] == "demo-completed"
    assert completed.json()["stageId"] is None
    assert completed.json()["resultAvailable"] is False

    retried = client.post(f"/api/v1/assessments/{assessment_id}/processing/retry")
    assert retried.status_code == 202
    assert retried.json()["status"] == "running"
    assert retried.json()["stageId"] == "review"
    assert retried.json()["attempt"] == 2
    listed = client.get("/api/v1/assessments").json()
    assert listed[0]["processingJob"]["id"] == job["id"]
    assert listed[0]["processingJob"]["attempt"] == 2


def test_assessment_history_isolated_and_parent_can_delete_saved_session(client):
    register(client, "assessment-owner@example.test")
    complete_onboarding(client)
    assessment_id = create(client).json()["session"]["id"]
    assert len(client.get("/api/v1/assessments").json()) == 1

    other = TestClient(client.app, headers={"Origin": ORIGIN})
    with other:
        assert other.post("/api/v1/auth/register", json={
            "email": "assessment-other@example.test", "password": PASSWORD,
        }).status_code == 201
        assert other.get("/api/v1/assessments").json() == []
        assert other.get(f"/api/v1/assessments/{assessment_id}").status_code == 404
        assert other.delete(f"/api/v1/assessments/{assessment_id}").status_code == 404

    deleted = client.delete(f"/api/v1/assessments/{assessment_id}")
    assert deleted.status_code == 204
    assert client.get("/api/v1/assessments").json() == []


def test_result_returns_each_parent_follow_up_under_its_indicator(client):
    register(client)
    complete_onboarding(client)
    assessment_id = create(client).json()["session"]["id"]
    for number in range(1, 14):
        option = "sometimes"
        saved = client.put(f"/api/v1/assessments/{assessment_id}/answers/q{number}", json={
            "selectedOptionId": option,
            "followUpText": f"Fictional observation {number}.",
        })
        assert saved.status_code == 200
        assert client.post(f"/api/v1/assessments/{assessment_id}/advance").status_code == 200
    job = client.post(f"/api/v1/assessments/{assessment_id}/processing").json()
    responses = job["result"]["indicatorResponses"]
    assert len(responses) == 13
    assert responses[1]["indicatorId"] == "eye-contact"
    assert responses[1]["followUpAnswer"] == "Fictional observation 2."
