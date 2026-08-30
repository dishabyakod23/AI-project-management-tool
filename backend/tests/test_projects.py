from datetime import date, timedelta

from app.models.enums import UserRole

TODAY = date.today()


def _project_payload(**overrides):
    payload = {
        "name": "Test Project",
        "description": "A test project",
        "start_date": TODAY.isoformat(),
        "end_date": (TODAY + timedelta(days=30)).isoformat(),
        "member_ids": [],
    }
    payload.update(overrides)
    return payload


def test_pm_can_create_project(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    member = make_user("member@demo.com", "Member", UserRole.MEMBER)
    resp = client.post(
        "/api/projects",
        json=_project_payload(member_ids=[member.id]),
        headers=auth_headers("pm@demo.com"),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["name"] == "Test Project"
    member_ids = {m["user"]["id"] for m in body["members"]}
    assert pm.id in member_ids  # creator auto-added
    assert member.id in member_ids


def test_member_cannot_create_project(client, make_user, auth_headers):
    make_user("member@demo.com", "Member", UserRole.MEMBER)
    resp = client.post("/api/projects", json=_project_payload(), headers=auth_headers("member@demo.com"))
    assert resp.status_code == 403


def test_end_date_before_start_date_rejected(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    payload = _project_payload(
        start_date=TODAY.isoformat(), end_date=(TODAY - timedelta(days=1)).isoformat()
    )
    resp = client.post("/api/projects", json=payload, headers=auth_headers("pm@demo.com"))
    assert resp.status_code == 422


def test_nonexistent_member_id_rejected(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    resp = client.post(
        "/api/projects", json=_project_payload(member_ids=[999999]), headers=auth_headers("pm@demo.com")
    )
    assert resp.status_code == 400


def test_missing_required_field_rejected(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    payload = _project_payload()
    del payload["name"]
    resp = client.post("/api/projects", json=payload, headers=auth_headers("pm@demo.com"))
    assert resp.status_code == 422


def test_non_member_cannot_view_project(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    outsider = make_user("outsider@demo.com", "Outsider", UserRole.MEMBER)
    resp = client.post("/api/projects", json=_project_payload(), headers=auth_headers("pm@demo.com"))
    project_id = resp.json()["id"]

    resp = client.get(f"/api/projects/{project_id}", headers=auth_headers("outsider@demo.com"))
    assert resp.status_code == 403


def test_non_member_pm_can_view_but_not_manage_project(client, make_user, auth_headers):
    """PMs have org-wide view access (matching the global dashboard's PM-sees-
    everything stats) even without membership, but still can't manage a
    project they don't belong to."""
    make_user("owner_pm@demo.com", "Owner PM", UserRole.PM)
    make_user("other_pm@demo.com", "Other PM", UserRole.PM)
    resp = client.post("/api/projects", json=_project_payload(), headers=auth_headers("owner_pm@demo.com"))
    project_id = resp.json()["id"]

    view_resp = client.get(f"/api/projects/{project_id}", headers=auth_headers("other_pm@demo.com"))
    assert view_resp.status_code == 200

    tasks_resp = client.get(f"/api/projects/{project_id}/tasks", headers=auth_headers("other_pm@demo.com"))
    assert tasks_resp.status_code == 200

    manage_resp = client.put(
        f"/api/projects/{project_id}", json={"name": "Hijacked"}, headers=auth_headers("other_pm@demo.com")
    )
    assert manage_resp.status_code == 403


def test_member_list_only_shows_their_projects(client, make_user, auth_headers):
    pm = make_user("pm@demo.com", "PM", UserRole.PM)
    member = make_user("member@demo.com", "Member", UserRole.MEMBER)

    client.post("/api/projects", json=_project_payload(name="Visible"), headers=auth_headers("pm@demo.com"))
    resp = client.post(
        "/api/projects",
        json=_project_payload(name="With Member", member_ids=[member.id]),
        headers=auth_headers("pm@demo.com"),
    )
    assert resp.status_code == 201

    resp = client.get("/api/projects", headers=auth_headers("member@demo.com"))
    names = {p["name"] for p in resp.json()}
    assert names == {"With Member"}


def test_add_and_remove_member(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM", UserRole.PM)
    other = make_user("other@demo.com", "Other", UserRole.MEMBER)
    resp = client.post("/api/projects", json=_project_payload(), headers=auth_headers("pm@demo.com"))
    project_id = resp.json()["id"]

    resp = client.post(
        f"/api/projects/{project_id}/members", json={"user_id": other.id}, headers=auth_headers("pm@demo.com")
    )
    assert resp.status_code == 200
    assert other.id in {m["user"]["id"] for m in resp.json()["members"]}

    resp = client.delete(
        f"/api/projects/{project_id}/members/{other.id}", headers=auth_headers("pm@demo.com")
    )
    assert resp.status_code == 200
    assert other.id not in {m["user"]["id"] for m in resp.json()["members"]}
