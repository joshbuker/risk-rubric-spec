import os
import sys
import uuid
import pytest
from datetime import datetime, timezone

# Add mcp/ dir so we can import server.py
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
# Add backend/ dir so server.py's own sys.path.insert doesn't fail
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "../backend"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.models import Service, ServiceModel, Scanner, Score
from app.services.keys import generate_api_key, hash_key
from app.services.scoring import compute_composite, PILLAR_WEIGHTS
from server import _search_services, _get_service_score, _compare_services, _list_scanners

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/risk_rubric_test",
)


@pytest.fixture(scope="session")
def engine():
    e = create_engine(TEST_DB_URL)
    Base.metadata.create_all(e)
    yield e
    Base.metadata.drop_all(e)


@pytest.fixture
def db(engine):
    conn = engine.connect()
    tx = conn.begin()
    Session = sessionmaker(bind=conn)
    session = Session()
    yield session
    session.close()
    tx.rollback()
    conn.close()


def _seed(db):
    svc = Service(
        name="Claude Sonnet 4.6 (Direct API)",
        slug=f"claude-sonnet-direct-{uuid.uuid4().hex[:6]}",
        service_type="ai_model",
    )
    db.add(svc)
    db.flush()
    db.add(ServiceModel(
        service_id=svc.id,
        engine_provider="Anthropic",
        platform_provider=None,
        model_name="Claude Sonnet 4.6",
        model_version="20250514",
    ))
    scanner = Scanner(
        name="PointGuard Scanner",
        org_name="PointGuard",
        api_key_hash=hash_key(generate_api_key("ptg")),
        api_key_prefix="sk_ptg_test",
    )
    db.add(scanner)
    db.flush()
    pillars = {p: 900.0 for p in PILLAR_WEIGHTS}
    db.add(Score(
        service_id=svc.id,
        scanner_id=scanner.id,
        transparency_score=900,
        reliability_score=900,
        security_score=900,
        privacy_score=900,
        safety_societal_score=900,
        excessive_agency_score=900,
        composite_score=compute_composite(pillars),
        scored_at=datetime.now(timezone.utc),
    ))
    db.flush()
    return svc, scanner


def test_search_returns_matching_services(db):
    svc, _ = _seed(db)
    results = _search_services(db, query="Claude")
    ids = [r["id"] for r in results]
    assert svc.id in ids


def test_search_filters_by_type(db):
    _seed(db)
    results = _search_services(db, query="", service_type="mcp_server")
    for r in results:
        assert r["service_type"] == "mcp_server"


def test_get_service_score_returns_pillars(db):
    svc, _ = _seed(db)
    result = _get_service_score(db, service_id=svc.id)
    assert result is not None
    assert result["pillars"]["security"] == 900.0
    assert result["confidence"] == 1


def test_get_service_score_not_found(db):
    result = _get_service_score(db, service_id="svc_doesnotexist")
    assert result is None


def test_compare_services_returns_all(db):
    svc, _ = _seed(db)
    results = _compare_services(db, service_ids=[svc.id])
    assert len(results) == 1
    assert results[0]["id"] == svc.id


def test_list_scanners_returns_active(db):
    _, scanner = _seed(db)
    results = _list_scanners(db)
    ids = [r["id"] for r in results]
    assert scanner.id in ids
