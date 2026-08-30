from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

from app.ai.client import AICallResult, AIProviderError
from app.models.enums import UserRole
from app.schemas.ai import RawTaskSuggestion, TaskGenerationRaw

TODAY = date.today()


def _make_project(client, pm_headers, member_ids=None):
    resp = client.post(
        "/api/projects",
        json={
            "name": "AI Project",
            "description": "desc",
            "start_date": TODAY.isoformat(),
            "end_date": (TODAY + timedelta(days=60)).isoformat(),
            "member_ids": member_ids or [],
        },
        headers=pm_headers,
    )
    return resp.json()["id"]


def _fake_result(parsed):
    now = datetime.now(timezone.utc)
    return AICallResult(parsed=parsed, started_at=now, completed_at=now, input_tokens=100, output_tokens=50)


def test_generate_tasks_valid_response_creates_suggestions(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)

    fake = TaskGenerationRaw(
        tasks=[
            RawTaskSuggestion(
                title="User registration UI",
                description="Build the registration form",
                priority="HIGH",
                suggested_owner_role="Frontend Developer",
                estimated_effort="1 day",
                dependencies=[],
                acceptance_criteria=["User can enter email", "Validation shown for invalid input"],
            ),
            RawTaskSuggestion(
                title="OTP validation",
                priority="MEDIUM",
                suggested_owner_role="Backend Developer",
            ),
        ]
    )

    with patch("app.ai.service.call_structured", return_value=_fake_result(fake)):
        resp = client.post(
            f"/api/ai/projects/{project_id}/generate-tasks",
            json={"requirement_text": "Build customer registration with email OTP and forgot password."},
            headers=headers,
        )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert len(body["suggestions"]) == 2
    assert body["suggestions"][0]["title"] == "User registration UI"
    assert body["suggestions"][0]["status"] == "PENDING"


def test_malformed_ai_output_is_rejected_not_saved(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)

    empty = TaskGenerationRaw(tasks=[])

    with patch("app.ai.service.call_structured", return_value=_fake_result(empty)):
        resp = client.post(
            f"/api/ai/projects/{project_id}/generate-tasks",
            json={"requirement_text": "Improve login."},
            headers=headers,
        )

    assert resp.status_code == 502
    assert "valid task list" in resp.json()["detail"]


def test_ai_provider_failure_returns_useful_error(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)

    with patch("app.ai.service.call_structured", side_effect=AIProviderError("Could not reach the Anthropic API")):
        resp = client.post(
            f"/api/ai/projects/{project_id}/generate-tasks",
            json={"requirement_text": "Build customer registration."},
            headers=headers,
        )

    assert resp.status_code == 502
    assert "Anthropic API" in resp.json()["detail"]


def test_approve_suggestion_creates_real_task(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    member = make_user("member@demo.com", "Member", UserRole.MEMBER)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers, member_ids=[member.id])

    fake = TaskGenerationRaw(tasks=[RawTaskSuggestion(title="Reset password", priority="MEDIUM")])
    with patch("app.ai.service.call_structured", return_value=_fake_result(fake)):
        resp = client.post(
            f"/api/ai/projects/{project_id}/generate-tasks",
            json={"requirement_text": "Add forgot password."},
            headers=headers,
        )
    suggestion_id = resp.json()["suggestions"][0]["id"]

    resp = client.post(
        f"/api/ai/suggestions/{suggestion_id}/approve",
        json={"owner_id": member.id, "start_date": TODAY.isoformat(), "due_date": (TODAY + timedelta(days=3)).isoformat()},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    approved_task_id = resp.json()["approved_task_id"]
    assert approved_task_id is not None

    task_resp = client.get(f"/api/tasks/{approved_task_id}", headers=headers)
    assert task_resp.status_code == 200
    assert task_resp.json()["title"] == "Reset password"
    assert task_resp.json()["owner"]["id"] == member.id


def test_suggestion_can_be_edited_and_deleted(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)

    fake = TaskGenerationRaw(
        tasks=[
            RawTaskSuggestion(title="Task A", priority="LOW"),
            RawTaskSuggestion(title="Task B", priority="LOW"),
        ]
    )
    with patch("app.ai.service.call_structured", return_value=_fake_result(fake)):
        resp = client.post(
            f"/api/ai/projects/{project_id}/generate-tasks",
            json={"requirement_text": "Do two things."},
            headers=headers,
        )
    suggestions = resp.json()["suggestions"]

    edit_resp = client.put(
        f"/api/ai/suggestions/{suggestions[0]['id']}", json={"title": "Task A (edited)"}, headers=headers
    )
    assert edit_resp.status_code == 200
    assert edit_resp.json()["title"] == "Task A (edited)"
    assert edit_resp.json()["status"] == "EDITED"

    delete_resp = client.delete(f"/api/ai/suggestions/{suggestions[1]['id']}", headers=headers)
    assert delete_resp.status_code == 204
