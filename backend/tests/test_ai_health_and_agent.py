from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

from app.ai.client import AICallResult
from app.models.enums import UserRole
from app.schemas.ai import AgentProposalRaw, ProjectHealthRaw, RawAgentProposedChange, RawHealthAction, RawHealthRisk

TODAY = date.today()


def _make_project(client, pm_headers, member_ids=None):
    resp = client.post(
        "/api/projects",
        json={
            "name": "Health Project",
            "description": "desc",
            "start_date": TODAY.isoformat(),
            "end_date": (TODAY + timedelta(days=60)).isoformat(),
            "member_ids": member_ids or [],
        },
        headers=pm_headers,
    )
    return resp.json()["id"]


def _create_task(client, headers, project_id, owner_id, status_, due_offset, priority="HIGH", title="Payment API"):
    resp = client.post(
        f"/api/projects/{project_id}/tasks",
        json={
            "title": title,
            "owner_id": owner_id,
            "priority": priority,
            "status": status_,
            "start_date": (TODAY - timedelta(days=10)).isoformat(),
            "due_date": (TODAY + timedelta(days=due_offset)).isoformat(),
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _fake_result(parsed):
    now = datetime.now(timezone.utc)
    return AICallResult(parsed=parsed, started_at=now, completed_at=now, input_tokens=100, output_tokens=50)


def test_health_analysis_is_grounded_in_real_task(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)
    _create_task(client, headers, project_id, pm.id, "IN_PROGRESS", due_offset=-3, priority="HIGH", title="Payment API")

    fake = ProjectHealthRaw(
        health="AMBER",
        summary="Payment API is overdue and needs attention.",
        risks=[RawHealthRisk(title="Payment API is overdue", severity="HIGH", evidence="Payment API is past its due date and not completed")],
        recommended_actions=[RawHealthAction(action="Escalate payment integration", reason="High priority and overdue")],
    )

    with patch("app.ai.service.call_structured", return_value=_fake_result(fake)):
        resp = client.post(f"/api/ai/projects/{project_id}/health", headers=headers)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["health"] == "AMBER"
    assert len(body["risks"]) == 1
    assert body["objective_facts"]["high_priority_overdue"] == 1


def test_health_analysis_filters_ungrounded_risk(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)
    _create_task(client, headers, project_id, pm.id, "COMPLETED", due_offset=-3, priority="LOW", title="Checkout UI")

    fake = ProjectHealthRaw(
        health="RED",
        summary="Fabricated risk",
        risks=[
            RawHealthRisk(
                title="Payment gateway is down",
                severity="HIGH",
                evidence="The payment gateway integration is failing in production",
            )
        ],
        recommended_actions=[],
    )

    with patch("app.ai.service.call_structured", return_value=_fake_result(fake)):
        resp = client.post(f"/api/ai/projects/{project_id}/health", headers=headers)

    assert resp.status_code == 200
    # No task in the project relates to "payment gateway" — the ungrounded risk must be filtered out.
    assert resp.json()["risks"] == []


def test_empty_project_health_handled(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)

    fake = ProjectHealthRaw(health="GREEN", summary="No tasks yet — nothing to assess.", risks=[], recommended_actions=[])
    with patch("app.ai.service.call_structured", return_value=_fake_result(fake)):
        resp = client.post(f"/api/ai/projects/{project_id}/health", headers=headers)

    assert resp.status_code == 200
    assert resp.json()["objective_facts"]["total_tasks"] == 0


def test_agent_proposal_ignores_invalid_task_id(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)
    task = _create_task(client, headers, project_id, pm.id, "IN_PROGRESS", due_offset=-2)

    fake = AgentProposalRaw(
        summary="Reschedule overdue high priority tasks to tomorrow.",
        changes=[
            RawAgentProposedChange(
                task_id=task["id"], field="due_date", current_value=task["due_date"], new_value=(TODAY + timedelta(days=1)).isoformat(), reason="Overdue high priority task"
            ),
            RawAgentProposedChange(
                task_id=999999, field="due_date", current_value="2020-01-01", new_value="2020-01-02", reason="hallucinated task"
            ),
        ],
        impacted_user_ids=[pm.id, 999999],
    )

    with patch("app.ai.service.call_structured", return_value=_fake_result(fake)):
        resp = client.post(
            f"/api/ai/projects/{project_id}/agent/propose",
            json={"request_text": "Move overdue high priority tasks to tomorrow."},
            headers=headers,
        )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert len(body["proposal_json"]["changes"]) == 1
    assert body["proposal_json"]["changes"][0]["task_id"] == task["id"]
    assert body["impacted_user_ids"] == [pm.id]
    assert body["status"] == "PROPOSED"


def test_agent_reject_makes_no_changes(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)
    task = _create_task(client, headers, project_id, pm.id, "IN_PROGRESS", due_offset=-2)
    original_due_date = task["due_date"]

    fake = AgentProposalRaw(
        summary="Reschedule",
        changes=[
            RawAgentProposedChange(
                task_id=task["id"], field="due_date", current_value=original_due_date, new_value=(TODAY + timedelta(days=1)).isoformat(), reason="overdue"
            )
        ],
        impacted_user_ids=[pm.id],
    )
    with patch("app.ai.service.call_structured", return_value=_fake_result(fake)):
        propose_resp = client.post(
            f"/api/ai/projects/{project_id}/agent/propose",
            json={"request_text": "Move overdue tasks to tomorrow."},
            headers=headers,
        )
    action_id = propose_resp.json()["id"]

    reject_resp = client.post(f"/api/ai/agent-actions/{action_id}/reject", headers=headers)
    assert reject_resp.status_code == 200
    assert reject_resp.json()["status"] == "REJECTED"

    unchanged_task = client.get(f"/api/tasks/{task['id']}", headers=headers).json()
    assert unchanged_task["due_date"] == original_due_date


def test_agent_approve_executes_change_and_notifies(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)
    task = _create_task(client, headers, project_id, pm.id, "IN_PROGRESS", due_offset=-2)
    new_due = (TODAY + timedelta(days=1)).isoformat()

    fake = AgentProposalRaw(
        summary="Reschedule",
        changes=[
            RawAgentProposedChange(
                task_id=task["id"], field="due_date", current_value=task["due_date"], new_value=new_due, reason="overdue"
            )
        ],
        impacted_user_ids=[pm.id],
    )
    with patch("app.ai.service.call_structured", return_value=_fake_result(fake)):
        propose_resp = client.post(
            f"/api/ai/projects/{project_id}/agent/propose",
            json={"request_text": "Move overdue tasks to tomorrow."},
            headers=headers,
        )
    action_id = propose_resp.json()["id"]

    approve_resp = client.post(f"/api/ai/agent-actions/{action_id}/approve", headers=headers)
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "EXECUTED"

    updated_task = client.get(f"/api/tasks/{task['id']}", headers=headers).json()
    assert updated_task["due_date"] == new_due

    notifications = client.get("/api/notifications", headers=headers).json()
    assert any(n["type"] == "AGENT_ACTION_EXECUTED" for n in notifications)
