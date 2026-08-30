from datetime import date, timedelta

from app.models.enums import UserRole

TODAY = date.today()


def _make_project(client, pm_headers, member_ids):
    resp = client.post(
        "/api/projects",
        json={
            "name": "Task Project",
            "description": "desc",
            "start_date": TODAY.isoformat(),
            "end_date": (TODAY + timedelta(days=60)).isoformat(),
            "member_ids": member_ids,
        },
        headers=pm_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _task_payload(owner_id, **overrides):
    payload = {
        "title": "Build the thing",
        "description": "desc",
        "owner_id": owner_id,
        "priority": "HIGH",
        "status": "TODO",
        "start_date": TODAY.isoformat(),
        "due_date": (TODAY + timedelta(days=5)).isoformat(),
    }
    payload.update(overrides)
    return payload


def test_pm_can_create_task_for_member(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    member = make_user("member@demo.com", "Member", UserRole.MEMBER)
    project_id = _make_project(client, auth_headers("pm@demo.com"), [member.id])

    resp = client.post(
        f"/api/projects/{project_id}/tasks",
        json=_task_payload(member.id),
        headers=auth_headers("pm@demo.com"),
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["owner"]["id"] == member.id


def test_owner_must_be_project_member(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    outsider = make_user("outsider@demo.com", "Outsider", UserRole.MEMBER)
    project_id = _make_project(client, auth_headers("pm@demo.com"), [])

    resp = client.post(
        f"/api/projects/{project_id}/tasks",
        json=_task_payload(outsider.id),
        headers=auth_headers("pm@demo.com"),
    )
    assert resp.status_code == 400


def test_due_date_before_start_date_rejected(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    project_id = _make_project(client, auth_headers("pm@demo.com"), [])

    payload = _task_payload(pm.id, start_date=TODAY.isoformat(), due_date=(TODAY - timedelta(days=1)).isoformat())
    resp = client.post(f"/api/projects/{project_id}/tasks", json=payload, headers=auth_headers("pm@demo.com"))
    assert resp.status_code == 422


def test_member_cannot_create_task(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    member = make_user("member@demo.com", "Member", UserRole.MEMBER)
    project_id = _make_project(client, auth_headers("pm@demo.com"), [member.id])

    resp = client.post(
        f"/api/projects/{project_id}/tasks", json=_task_payload(member.id), headers=auth_headers("member@demo.com")
    )
    assert resp.status_code == 403


def test_member_can_update_own_task_status(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    member = make_user("member@demo.com", "Member", UserRole.MEMBER)
    project_id = _make_project(client, auth_headers("pm@demo.com"), [member.id])
    task_id = client.post(
        f"/api/projects/{project_id}/tasks", json=_task_payload(member.id), headers=auth_headers("pm@demo.com")
    ).json()["id"]

    resp = client.patch(
        f"/api/tasks/{task_id}", json={"status": "IN_PROGRESS"}, headers=auth_headers("member@demo.com")
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "IN_PROGRESS"


def test_member_cannot_change_priority_on_own_task(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    member = make_user("member@demo.com", "Member", UserRole.MEMBER)
    project_id = _make_project(client, auth_headers("pm@demo.com"), [member.id])
    task_id = client.post(
        f"/api/projects/{project_id}/tasks", json=_task_payload(member.id), headers=auth_headers("pm@demo.com")
    ).json()["id"]

    resp = client.patch(
        f"/api/tasks/{task_id}", json={"priority": "LOW"}, headers=auth_headers("member@demo.com")
    )
    assert resp.status_code == 403


def test_member_cannot_update_task_they_do_not_own(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    owner = make_user("owner@demo.com", "Owner", UserRole.MEMBER)
    other = make_user("other@demo.com", "Other", UserRole.MEMBER)
    project_id = _make_project(client, auth_headers("pm@demo.com"), [owner.id, other.id])
    task_id = client.post(
        f"/api/projects/{project_id}/tasks", json=_task_payload(owner.id), headers=auth_headers("pm@demo.com")
    ).json()["id"]

    resp = client.patch(
        f"/api/tasks/{task_id}", json={"status": "IN_PROGRESS"}, headers=auth_headers("other@demo.com")
    )
    assert resp.status_code == 403


def test_pm_can_delete_task(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    project_id = _make_project(client, auth_headers("pm@demo.com"), [])
    task_id = client.post(
        f"/api/projects/{project_id}/tasks", json=_task_payload(pm.id), headers=auth_headers("pm@demo.com")
    ).json()["id"]

    resp = client.delete(f"/api/tasks/{task_id}", headers=auth_headers("pm@demo.com"))
    assert resp.status_code == 204
    assert client.get(f"/api/tasks/{task_id}", headers=auth_headers("pm@demo.com")).status_code == 404


def test_task_board_persists_status_after_refresh(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    project_id = _make_project(client, auth_headers("pm@demo.com"), [])
    task_id = client.post(
        f"/api/projects/{project_id}/tasks", json=_task_payload(pm.id), headers=auth_headers("pm@demo.com")
    ).json()["id"]

    client.patch(f"/api/tasks/{task_id}", json={"status": "TESTING"}, headers=auth_headers("pm@demo.com"))
    resp = client.get(f"/api/tasks/{task_id}", headers=auth_headers("pm@demo.com"))
    assert resp.json()["status"] == "TESTING"
