from datetime import date, timedelta

from app.models.enums import UserRole

TODAY = date.today()


def _make_project(client, pm_headers):
    resp = client.post(
        "/api/projects",
        json={
            "name": "Dashboard Project",
            "description": "desc",
            "start_date": TODAY.isoformat(),
            "end_date": (TODAY + timedelta(days=60)).isoformat(),
            "member_ids": [],
        },
        headers=pm_headers,
    )
    return resp.json()["id"]


def _create_task(client, pm_headers, project_id, owner_id, status_, due_offset, priority="MEDIUM"):
    resp = client.post(
        f"/api/projects/{project_id}/tasks",
        json={
            "title": f"Task due {due_offset}",
            "owner_id": owner_id,
            "priority": priority,
            "status": status_,
            "start_date": (TODAY + timedelta(days=min(due_offset, 0) - 10)).isoformat(),
            "due_date": (TODAY + timedelta(days=due_offset)).isoformat(),
        },
        headers=pm_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_dashboard_counts_are_correct(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)

    _create_task(client, headers, project_id, pm.id, "TODO", due_offset=-3)  # overdue
    _create_task(client, headers, project_id, pm.id, "IN_PROGRESS", due_offset=2)  # due this week (depends on today)
    _create_task(client, headers, project_id, pm.id, "COMPLETED", due_offset=-5)  # completed, NOT overdue
    _create_task(client, headers, project_id, pm.id, "TESTING", due_offset=100)  # far future, not due this week

    resp = client.get("/api/dashboard", headers=headers)
    assert resp.status_code == 200
    stats = resp.json()

    assert stats["total_tasks"] == 4
    assert stats["completed"] == 1
    assert stats["in_progress"] == 1
    assert stats["delayed"] == 1  # only the TODO one; completed overdue task must not count


def test_completed_overdue_task_not_counted_as_delayed(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)

    _create_task(client, headers, project_id, pm.id, "COMPLETED", due_offset=-30)

    resp = client.get("/api/dashboard", headers=headers)
    stats = resp.json()
    assert stats["delayed"] == 0
    assert stats["completed"] == 1


def test_empty_project_has_zero_stats(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    headers = auth_headers("pm@demo.com")
    project_id = _make_project(client, headers)

    resp = client.get(f"/api/projects/{project_id}/dashboard", headers=headers)
    assert resp.status_code == 200
    stats = resp.json()
    assert stats == {
        "total_tasks": 0,
        "completed": 0,
        "in_progress": 0,
        "delayed": 0,
        "due_this_week": 0,
    }


def test_member_dashboard_only_reflects_their_projects(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    member = make_user("member@demo.com", "Member", UserRole.MEMBER)
    headers = auth_headers("pm@demo.com")

    visible_project = _make_project(client, headers)
    client.post(f"/api/projects/{visible_project}/members", json={"user_id": member.id}, headers=headers)
    _create_task(client, headers, visible_project, member.id, "TODO", due_offset=-1)

    hidden_project = _make_project(client, headers)
    _create_task(client, headers, hidden_project, pm.id, "TODO", due_offset=-1)

    resp = client.get("/api/dashboard", headers=auth_headers("member@demo.com"))
    assert resp.json()["total_tasks"] == 1
