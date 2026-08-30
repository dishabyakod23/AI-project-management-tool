from app.models.enums import UserRole


def test_valid_login_returns_token(client, make_user):
    make_user("pm@demo.com", "PM User", UserRole.PM)
    resp = client.post("/api/auth/login", json={"email": "pm@demo.com", "password": "password123"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["user"]["email"] == "pm@demo.com"
    assert body["user"]["role"] == "PM"


def test_invalid_password_rejected(client, make_user):
    make_user("pm@demo.com", "PM User", UserRole.PM)
    resp = client.post("/api/auth/login", json={"email": "pm@demo.com", "password": "wrong"})
    assert resp.status_code == 401


def test_unknown_email_rejected(client):
    resp = client.post("/api/auth/login", json={"email": "nobody@demo.com", "password": "password123"})
    assert resp.status_code == 401


def test_protected_route_requires_auth(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_protected_route_rejects_garbage_token(client):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401


def test_me_returns_current_user(client, make_user, auth_headers):
    make_user("pm@demo.com", "PM User", UserRole.PM)
    resp = client.get("/api/auth/me", headers=auth_headers("pm@demo.com"))
    assert resp.status_code == 200
    assert resp.json()["email"] == "pm@demo.com"
