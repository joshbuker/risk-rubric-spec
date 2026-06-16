import pytest
from app.config import settings


def test_login_with_correct_secret(client):
    resp = client.post("/api/v1/admin/auth/token", json={"secret": settings.admin_secret})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_with_wrong_secret(client):
    resp = client.post("/api/v1/admin/auth/token", json={"secret": "wrong"})
    assert resp.status_code == 401


def test_admin_route_requires_token(client):
    resp = client.get("/api/v1/admin/services")
    assert resp.status_code == 401


def test_admin_route_accepts_valid_token(client):
    token = client.post(
        "/api/v1/admin/auth/token", json={"secret": settings.admin_secret}
    ).json()["access_token"]
    resp = client.get("/api/v1/admin/services",
                      headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
