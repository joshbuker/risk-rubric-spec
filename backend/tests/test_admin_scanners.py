from app.config import settings
from app.db.models import Scanner
from app.services.keys import generate_api_key, hash_key


def _seed_scanner(db, *, status="active", conformance_status="pending") -> Scanner:
    key = generate_api_key("test")
    scanner = Scanner(
        name="Test Scanner",
        org_name="Test Org",
        api_key_hash=hash_key(key),
        api_key_prefix=key[:12],
        status=status,
        conformance_status=conformance_status,
    )
    db.add(scanner)
    db.flush()
    return scanner


def _admin_headers(client) -> dict:
    token = client.post(
        "/api/v1/admin/auth/token",
        json={"secret": settings.admin_secret},
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_list_scanners_includes_seeded_scanner(client, db):
    scanner = _seed_scanner(db)
    headers = _admin_headers(client)

    resp = client.get("/api/v1/admin/scanners", headers=headers)
    assert resp.status_code == 200
    ids = [s["id"] for s in resp.json()]
    assert scanner.id in ids


def test_list_scanners_returns_submission_count(client, db):
    scanner = _seed_scanner(db)
    headers = _admin_headers(client)

    resp = client.get("/api/v1/admin/scanners", headers=headers)
    assert resp.status_code == 200
    row = next(s for s in resp.json() if s["id"] == scanner.id)
    assert row["submission_count"] == 0
    assert row["conformance_status"] == "pending"


def test_update_scanner_name(client, db):
    scanner = _seed_scanner(db)
    headers = _admin_headers(client)

    resp = client.patch(
        f"/api/v1/admin/scanners/{scanner.id}",
        json={"name": "Renamed Scanner"},
        headers=headers,
    )
    assert resp.status_code == 200

    db.refresh(scanner)
    assert scanner.name == "Renamed Scanner"


def test_update_scanner_404(client, db):
    headers = _admin_headers(client)
    resp = client.patch(
        "/api/v1/admin/scanners/scn_doesnotexist",
        json={"name": "x"},
        headers=headers,
    )
    assert resp.status_code == 404


def test_set_conformance_to_conformant(client, db):
    scanner = _seed_scanner(db, conformance_status="pending")
    headers = _admin_headers(client)

    resp = client.post(
        f"/api/v1/admin/scanners/{scanner.id}/set-conformance",
        json={"conformance_status": "conformant"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["conformance_status"] == "conformant"

    db.refresh(scanner)
    assert scanner.conformance_status == "conformant"


def test_set_conformance_back_to_pending(client, db):
    scanner = _seed_scanner(db, conformance_status="conformant")
    headers = _admin_headers(client)

    resp = client.post(
        f"/api/v1/admin/scanners/{scanner.id}/set-conformance",
        json={"conformance_status": "pending"},
        headers=headers,
    )
    assert resp.status_code == 200
    db.refresh(scanner)
    assert scanner.conformance_status == "pending"


def test_set_conformance_invalid_value_returns_422(client, db):
    scanner = _seed_scanner(db)
    headers = _admin_headers(client)

    resp = client.post(
        f"/api/v1/admin/scanners/{scanner.id}/set-conformance",
        json={"conformance_status": "revoked"},
        headers=headers,
    )
    assert resp.status_code == 422


def test_set_conformance_on_revoked_scanner_returns_409(client, db):
    scanner = _seed_scanner(db, status="revoked", conformance_status="revoked")
    headers = _admin_headers(client)

    resp = client.post(
        f"/api/v1/admin/scanners/{scanner.id}/set-conformance",
        json={"conformance_status": "conformant"},
        headers=headers,
    )
    assert resp.status_code == 409


def test_revoke_scanner(client, db):
    scanner = _seed_scanner(db, status="active", conformance_status="conformant")
    headers = _admin_headers(client)

    resp = client.post(
        f"/api/v1/admin/scanners/{scanner.id}/revoke",
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "revoked"

    db.refresh(scanner)
    assert scanner.status == "revoked"
    assert scanner.conformance_status == "revoked"


def test_revoke_already_revoked_scanner_returns_409(client, db):
    scanner = _seed_scanner(db, status="revoked", conformance_status="revoked")
    headers = _admin_headers(client)

    resp = client.post(
        f"/api/v1/admin/scanners/{scanner.id}/revoke",
        headers=headers,
    )
    assert resp.status_code == 409


def test_revoke_scanner_404(client, db):
    headers = _admin_headers(client)
    resp = client.post(
        "/api/v1/admin/scanners/scn_doesnotexist/revoke",
        headers=headers,
    )
    assert resp.status_code == 404
