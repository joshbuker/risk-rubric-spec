from datetime import datetime, timedelta, timezone
from app.db.models import Scanner, Service, Score, IdentityMatchFlag
from app.services.keys import generate_api_key, hash_key
from app.services.scoring import compute_composite, PILLAR_WEIGHTS

AI_MODEL_URL = "/api/v1/scores/ai-model"
MCP_SERVER_URL = "/api/v1/scores/mcp-server"


def _make_scanner(db, org_slug="ptg") -> tuple[Scanner, str]:
    key = generate_api_key(org_slug)
    scanner = Scanner(
        name="RiskRubric scanner powered by PointGuard",
        org_name="PointGuard",
        api_key_hash=hash_key(key),
        api_key_prefix=key[:12],
    )
    db.add(scanner)
    db.flush()
    return scanner, key


def _valid_ai_model_payload(scored_at=None) -> dict:
    pillars = {p: 800.0 for p in PILLAR_WEIGHTS}
    composite = compute_composite(pillars)
    return {
        "identity": {
            "engine_provider": "Anthropic",
            "platform_provider": None,
            "model_name": "Claude Sonnet 4.6",
            "model_version": "20250514",
        },
        "scores": {**pillars, "composite": composite},
        "evidence": [{"label": "Audit report", "url": "https://example.com/audit.pdf"}],
        "scored_at": (scored_at or datetime.now(timezone.utc).replace(tzinfo=None)).isoformat(),
        "report_url": "https://pointguard.example.com/reports/claude-sonnet-4-6",
    }


def _valid_mcp_server_payload(scored_at=None) -> dict:
    pillars = {p: 800.0 for p in PILLAR_WEIGHTS}
    composite = compute_composite(pillars)
    return {
        "identity": {
            "target_service": "GitHub",
            "provider_org": "Anthropic",
            "provider_tier": "official",
            "hosting_type": "hosted",
        },
        "scores": {**pillars, "composite": composite},
        "evidence": [{"label": "Audit report", "url": "https://example.com/audit.pdf"}],
        "scored_at": (scored_at or datetime.now(timezone.utc).replace(tzinfo=None)).isoformat(),
        "report_url": "https://pointguard.example.com/reports/github-mcp",
    }


# ── Auth ─────────────────────────────────────────────────────────────────────

def test_submission_rejects_missing_auth(client):
    resp = client.post(AI_MODEL_URL, json=_valid_ai_model_payload())
    assert resp.status_code == 401


def test_submission_rejects_bad_key(client, db):
    _make_scanner(db)
    resp = client.post(AI_MODEL_URL, json=_valid_ai_model_payload(),
                       headers={"Authorization": "Bearer sk_bad_key"})
    assert resp.status_code == 401


def test_submission_rejects_revoked_scanner(client, db):
    scanner, key = _make_scanner(db)
    scanner.status = "revoked"
    db.flush()
    resp = client.post(AI_MODEL_URL, json=_valid_ai_model_payload(),
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 401


# ── Validation ────────────────────────────────────────────────────────────────

def test_submission_rejects_composite_out_of_tolerance(client, db):
    _, key = _make_scanner(db)
    payload = _valid_ai_model_payload()
    payload["scores"]["composite"] = 999.0  # clearly wrong
    resp = client.post(AI_MODEL_URL, json=payload,
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 422


def test_submission_rejects_missing_report_url(client, db):
    _, key = _make_scanner(db)
    payload = _valid_ai_model_payload()
    del payload["report_url"]
    resp = client.post(AI_MODEL_URL, json=payload,
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 422


def test_submission_rejects_invalid_report_url(client, db):
    _, key = _make_scanner(db)
    payload = _valid_ai_model_payload()
    payload["report_url"] = "not-a-url"
    resp = client.post(AI_MODEL_URL, json=payload,
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 422


def test_submission_rejects_future_scored_at(client, db):
    _, key = _make_scanner(db)
    payload = _valid_ai_model_payload(
        scored_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=1)
    )
    resp = client.post(AI_MODEL_URL, json=payload,
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 422


# ── Happy path — AI model ─────────────────────────────────────────────────────

def test_ai_model_submission_creates_service_and_score(client, db):
    _, key = _make_scanner(db)
    resp = client.post(AI_MODEL_URL, json=_valid_ai_model_payload(),
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "accepted"
    assert body["match_tier"] == "no_match"
    assert body["review_flagged"] is True

    svc = db.query(Service).filter(Service.id == body["service_id"]).first()
    assert svc is not None
    assert svc.service_type == "ai_model"

    score = db.query(Score).filter(Score.service_id == svc.id).first()
    assert score is not None
    assert score.security_score == 800.0
    assert score.report_url == "https://pointguard.example.com/reports/claude-sonnet-4-6"


def test_ai_model_submission_appends_score_on_resubmit(client, db):
    scanner, key = _make_scanner(db)
    client.post(AI_MODEL_URL, json=_valid_ai_model_payload(),
                headers={"Authorization": f"Bearer {key}"})

    payload = _valid_ai_model_payload()
    payload["scores"] = {p: 900.0 for p in PILLAR_WEIGHTS}
    payload["scores"]["composite"] = compute_composite({p: 900.0 for p in PILLAR_WEIGHTS})
    client.post(AI_MODEL_URL, json=payload,
                headers={"Authorization": f"Bearer {key}"})

    scores = db.query(Score).order_by(Score.created_at).all()
    assert len(scores) == 2
    assert scores[-1].security_score == 900.0


def test_ai_model_submission_medium_confidence_flags_match(client, db):
    scanner, key = _make_scanner(db)
    client.post(AI_MODEL_URL, json=_valid_ai_model_payload(),
                headers={"Authorization": f"Bearer {key}"})

    payload = _valid_ai_model_payload()
    payload["identity"]["model_version"] = "20241023-v2"
    payload["scores"]["composite"] = compute_composite({p: 800.0 for p in PILLAR_WEIGHTS})
    resp = client.post(AI_MODEL_URL, json=payload,
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["match_tier"] == "medium_confidence"
    assert body["review_flagged"] is True

    flag = db.query(IdentityMatchFlag).first()
    assert flag is not None
    assert flag.status == "pending"


# ── Happy path — MCP server ───────────────────────────────────────────────────

def test_mcp_server_submission_creates_service_and_score(client, db):
    _, key = _make_scanner(db)
    resp = client.post(MCP_SERVER_URL, json=_valid_mcp_server_payload(),
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "accepted"
    assert body["match_tier"] == "no_match"

    svc = db.query(Service).filter(Service.id == body["service_id"]).first()
    assert svc is not None
    assert svc.service_type == "mcp_server"

    score = db.query(Score).filter(Score.service_id == svc.id).first()
    assert score is not None
    assert score.security_score == 800.0
    assert score.report_url == "https://pointguard.example.com/reports/github-mcp"
