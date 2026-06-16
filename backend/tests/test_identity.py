from app.db.models import Service, ServiceModel, ServiceMcpServer
from app.services.identity import match_service


def _make_model_service(db, *, engine_provider, platform_provider, model_name, model_version, name="Test Model"):
    svc = Service(name=name, slug=name.lower().replace(" ", "-"), service_type="ai_model")
    db.add(svc)
    db.flush()
    detail = ServiceModel(
        service_id=svc.id,
        engine_provider=engine_provider,
        platform_provider=platform_provider,
        model_name=model_name,
        model_version=model_version,
    )
    db.add(detail)
    db.flush()
    return svc


def _make_mcp_service(db, *, target_service, provider_org, provider_tier, hosting_type="hosted", name="Test MCP"):
    svc = Service(name=name, slug=name.lower().replace(" ", "-"), service_type="mcp_server")
    db.add(svc)
    db.flush()
    detail = ServiceMcpServer(
        service_id=svc.id,
        target_service=target_service,
        provider_org=provider_org,
        provider_tier=provider_tier,
        hosting_type=hosting_type,
    )
    db.add(detail)
    db.flush()
    return svc


# ── High confidence: external_id match ──────────────────────────────────────

def test_high_confidence_external_id(db):
    svc = _make_model_service(db, engine_provider="Anthropic", platform_provider=None,
                               model_name="Claude Sonnet 4.6", model_version="20250514")
    svc.external_id = "ext_abc123"
    db.flush()

    identity = {"engine_provider": "Anthropic", "platform_provider": None,
                "model_name": "Claude Sonnet 4.6", "model_version": "DIFFERENT"}
    result_svc, tier, flagged = match_service(db, "ai_model", identity, external_id="ext_abc123")

    assert result_svc.id == svc.id
    assert tier == "high_confidence"
    assert flagged is False


# ── High confidence: exact tuple match ──────────────────────────────────────

def test_high_confidence_exact_tuple(db):
    svc = _make_model_service(db, engine_provider="Anthropic", platform_provider=None,
                               model_name="Claude Sonnet 4.6", model_version="20250514")

    identity = {"engine_provider": "Anthropic", "platform_provider": None,
                "model_name": "Claude Sonnet 4.6", "model_version": "20250514"}
    result_svc, tier, flagged = match_service(db, "ai_model", identity)

    assert result_svc.id == svc.id
    assert tier == "high_confidence"
    assert flagged is False


# ── Medium confidence: exactly one field mismatch ───────────────────────────

def test_medium_confidence_one_field_mismatch(db):
    svc = _make_model_service(db, engine_provider="Anthropic", platform_provider=None,
                               model_name="Claude Sonnet 4.6", model_version="20241022")

    identity = {"engine_provider": "Anthropic", "platform_provider": None,
                "model_name": "Claude Sonnet 4.6", "model_version": "20241023-v2"}
    result_svc, tier, flagged = match_service(db, "ai_model", identity)

    assert result_svc.id == svc.id
    assert tier == "medium_confidence"
    assert flagged is True


# ── No match: two fields differ ─────────────────────────────────────────────

def test_no_match_two_fields_differ(db):
    _make_model_service(db, engine_provider="Anthropic", platform_provider=None,
                        model_name="Claude Sonnet 4.6", model_version="20250514")

    identity = {"engine_provider": "Anthropic", "platform_provider": None,
                "model_name": "Claude Haiku", "model_version": "DIFFERENT"}
    result_svc, tier, flagged = match_service(db, "ai_model", identity)

    assert result_svc is None
    assert tier == "no_match"
    assert flagged is True


# ── No match: empty DB ───────────────────────────────────────────────────────

def test_no_match_empty_db(db):
    identity = {"engine_provider": "Anthropic", "platform_provider": None,
                "model_name": "Claude Sonnet 4.6", "model_version": "20250514"}
    result_svc, tier, flagged = match_service(db, "ai_model", identity)

    assert result_svc is None
    assert tier == "no_match"
    assert flagged is True


# ── MCP server matching ──────────────────────────────────────────────────────

def test_medium_confidence_mcp_one_field(db):
    svc = _make_mcp_service(db, target_service="gmail", provider_org="Google",
                             provider_tier="official")

    identity = {"target_service": "gmail", "provider_org": "Google LLC",
                "provider_tier": "official", "hosting_type": "hosted"}
    result_svc, tier, flagged = match_service(db, "mcp_server", identity)

    assert result_svc.id == svc.id
    assert tier == "medium_confidence"
    assert flagged is True
