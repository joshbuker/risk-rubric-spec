import uuid
from datetime import datetime, timezone

import pytest

from app.config import settings
from app.db.models import IdentityMatchFlag, Scanner, Score, Service, ServiceModel
from app.services.keys import generate_api_key, hash_key
from app.services.scoring import PILLAR_WEIGHTS, compute_composite


def _seed_flag(db):
    """Seed a Service + ServiceModel + Scanner + Score + IdentityMatchFlag.

    Returns (flag, scanner, svc).  Uses db.flush() — caller owns the
    transaction; conftest rolls back after each test.
    """
    slug = f"claude-s-direct-{uuid.uuid4().hex[:6]}"

    svc = Service(
        name="Claude Sonnet 4.6 (Direct API)",
        slug=slug,
        service_type="ai_model",
    )
    db.add(svc)
    db.flush()

    model_detail = ServiceModel(
        service_id=svc.id,
        engine_provider="Anthropic",
        platform_provider=None,
        model_name="Claude Sonnet 4.6",
        model_version="20250514",
    )
    db.add(model_detail)
    db.flush()

    key = generate_api_key("ptg")
    scanner = Scanner(
        name="PointGuard Scanner",
        org_name="PointGuard",
        status="active",
        api_key_hash=hash_key(key),
        api_key_prefix=key[:12],
    )
    db.add(scanner)
    db.flush()

    pillar_scores = {p: 800.0 for p in PILLAR_WEIGHTS}
    score = Score(
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
    )
    db.add(score)
    db.flush()

    flag = IdentityMatchFlag(
        service_id=svc.id,
        scanner_id=scanner.id,
        incoming_identity={
            "engine_provider": "Anthropic",
            "platform_provider": None,
            "model_name": "Claude Sonnet 4.6",
            "model_version": "20241023-v2",
        },
        existing_identity={
            "engine_provider": "Anthropic",
            "platform_provider": None,
            "model_name": "Claude Sonnet 4.6",
            "model_version": "20250514",
        },
        match_tier="medium_confidence",
    )
    db.add(flag)
    db.flush()

    return flag, scanner, svc


def _admin_headers(client) -> dict:
    token = client.post(
        "/api/v1/admin/auth/token",
        json={"secret": settings.admin_secret},
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_list_flags_returns_pending(client, db):
    flag, _scanner, _svc = _seed_flag(db)
    headers = _admin_headers(client)

    resp = client.get("/api/v1/admin/flags", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    ids = [f["id"] for f in body]
    assert flag.id in ids

    matching = next(f for f in body if f["id"] == flag.id)
    assert matching["status"] == "pending"


def test_accept_flag_marks_resolved(client, db):
    flag, _scanner, _svc = _seed_flag(db)
    headers = _admin_headers(client)

    resp = client.post(f"/api/v1/admin/flags/{flag.id}/accept", headers=headers)
    assert resp.status_code == 200

    db.refresh(flag)
    assert flag.status == "accepted"
    assert flag.resolved_at is not None


def test_reject_flag_creates_new_service_and_moves_score(client, db):
    flag, scanner, svc = _seed_flag(db)
    headers = _admin_headers(client)
    original_svc_id = svc.id

    resp = client.post(f"/api/v1/admin/flags/{flag.id}/reject", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "rejected"
    new_service_id = body["new_service_id"]
    assert new_service_id != original_svc_id

    db.refresh(flag)
    assert flag.status == "rejected"

    # Score should now belong to the new service, not the original
    score_on_new = (
        db.query(Score)
        .filter(Score.scanner_id == scanner.id, Score.service_id == new_service_id)
        .first()
    )
    assert score_on_new is not None

    score_on_old = (
        db.query(Score)
        .filter(Score.scanner_id == scanner.id, Score.service_id == original_svc_id)
        .first()
    )
    assert score_on_old is None
