from datetime import datetime, timezone

from app.config import settings
from app.db.models import Scanner, Score, Service, ServiceModel
from app.services.keys import generate_api_key, hash_key
from app.services.scoring import PILLAR_WEIGHTS, compute_composite


def _seed_scanner(db, *, status="active") -> Scanner:
    key = generate_api_key("test")
    scanner = Scanner(
        name="Test Scanner",
        org_name="Test Org",
        api_key_hash=hash_key(key),
        api_key_prefix=key[:12],
        status=status,
        conformance_status="pending",
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


def test_list_keys_includes_seeded_scanner(client, db):
    scanner = _seed_scanner(db)
    headers = _admin_headers(client)

    resp = client.get("/api/v1/admin/keys", headers=headers)
    assert resp.status_code == 200
    ids = [k["scanner_id"] for k in resp.json()]
    assert scanner.id in ids


def test_list_keys_submission_count_is_zero_for_new_scanner(client, db):
    scanner = _seed_scanner(db)
    headers = _admin_headers(client)

    resp = client.get("/api/v1/admin/keys", headers=headers)
    row = next(k for k in resp.json() if k["scanner_id"] == scanner.id)
    assert row["submission_count"] == 0


def test_list_keys_submission_count_reflects_scores(client, db):
    """submission_count increments when scores exist for that scanner."""
    import uuid

    scanner = _seed_scanner(db)

    slug = f"svc-key-test-{uuid.uuid4().hex[:6]}"
    svc = Service(name="Key Test Service", slug=slug, service_type="ai_model")
    db.add(svc)
    db.flush()
    db.add(ServiceModel(
        service_id=svc.id,
        engine_provider="Acme",
        platform_provider=None,
        model_name="TestModel",
        model_version="1.0",
    ))
    pillar_scores = {p: 750.0 for p in PILLAR_WEIGHTS}
    db.add(Score(
        service_id=svc.id,
        scanner_id=scanner.id,
        transparency_score=pillar_scores["transparency"],
        reliability_score=pillar_scores["reliability"],
        security_score=pillar_scores["security"],
        privacy_score=pillar_scores["privacy"],
        safety_societal_score=pillar_scores["safety_societal"],
        excessive_agency_score=pillar_scores["excessive_agency"],
        composite_score=compute_composite(pillar_scores),
        scored_at=datetime.now(timezone.utc),
    ))
    db.flush()

    headers = _admin_headers(client)
    resp = client.get("/api/v1/admin/keys", headers=headers)
    row = next(k for k in resp.json() if k["scanner_id"] == scanner.id)
    assert row["submission_count"] == 1


def test_issue_key_creates_scanner_returns_plaintext(client, db):
    headers = _admin_headers(client)

    resp = client.post(
        "/api/v1/admin/keys",
        json={"org_name": "Acme Corp", "org_slug": "acme", "display_name": "Acme Scanner"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "plaintext_key" in body
    assert "scanner_id" in body
    assert "api_key_prefix" in body
    assert body["plaintext_key"].startswith("sk_acme_")


def test_issued_key_prefix_matches_plaintext(client, db):
    headers = _admin_headers(client)

    resp = client.post(
        "/api/v1/admin/keys",
        json={"org_name": "Acme Corp", "org_slug": "acme", "display_name": "Acme Scanner"},
        headers=headers,
    )
    body = resp.json()
    # Prefix stored in DB must equal the first 12 chars of the returned plaintext key
    assert body["api_key_prefix"] == body["plaintext_key"][:12]


def test_issued_key_scanner_appears_in_list(client, db):
    headers = _admin_headers(client)

    issue_resp = client.post(
        "/api/v1/admin/keys",
        json={"org_name": "Acme Corp", "org_slug": "acme", "display_name": "Acme Scanner"},
        headers=headers,
    )
    scanner_id = issue_resp.json()["scanner_id"]

    list_resp = client.get("/api/v1/admin/keys", headers=headers)
    ids = [k["scanner_id"] for k in list_resp.json()]
    assert scanner_id in ids


def test_revoke_key(client, db):
    scanner = _seed_scanner(db, status="active")
    headers = _admin_headers(client)

    resp = client.post(
        f"/api/v1/admin/keys/{scanner.id}/revoke",
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "revoked"

    db.refresh(scanner)
    assert scanner.status == "revoked"


def test_revoke_already_revoked_key_returns_409(client, db):
    scanner = _seed_scanner(db, status="revoked")
    headers = _admin_headers(client)

    resp = client.post(
        f"/api/v1/admin/keys/{scanner.id}/revoke",
        headers=headers,
    )
    assert resp.status_code == 409


def test_revoke_key_404(client, db):
    headers = _admin_headers(client)
    resp = client.post(
        "/api/v1/admin/keys/scn_doesnotexist/revoke",
        headers=headers,
    )
    assert resp.status_code == 404
