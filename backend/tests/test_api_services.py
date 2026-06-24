from datetime import datetime, timedelta, timezone
from app.db.models import Scanner, Service, ServiceModel, Score
from app.services.keys import generate_api_key, hash_key
from app.services.scoring import compute_composite, PILLAR_WEIGHTS


def _seed_service_with_score(db, model_version="20250514", days_ago=1, report_url="https://pointguard.example.com/reports/test") -> Service:
    svc = Service(name="Claude Sonnet 4.6 (Direct API)", slug="claude-sonnet-4-6-direct-api",
                  service_type="ai_model")
    db.add(svc)
    db.flush()
    db.add(ServiceModel(service_id=svc.id, engine_provider="Anthropic",
                        platform_provider=None, model_name="Claude Sonnet 4.6",
                        model_version=model_version))
    scanner = Scanner(name="RiskRubric scanner powered by PointGuard",
                      org_name="PointGuard",
                      api_key_hash=hash_key(generate_api_key("ptg")),
                      api_key_prefix="sk_ptg_test")
    db.add(scanner)
    db.flush()
    pillars = {p: 800.0 for p in PILLAR_WEIGHTS}
    db.add(Score(
        service_id=svc.id, scanner_id=scanner.id,
        transparency_score=800, reliability_score=800, security_score=800,
        privacy_score=800, safety_societal_score=800, excessive_agency_score=800,
        composite_score=compute_composite(pillars),
        scored_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days_ago),
        report_url=report_url,
    ))
    db.flush()
    return svc


def test_browse_returns_services(client, db):
    _seed_service_with_score(db)
    resp = client.get("/api/v1/services")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    item = data[0]
    assert "id" in item
    assert "composite_score" in item
    assert "grade" in item
    assert item["confidence"] == 1


def test_browse_filters_by_type(client, db):
    _seed_service_with_score(db)
    resp = client.get("/api/v1/services?service_type=ai_model")
    assert resp.status_code == 200
    for item in resp.json():
        assert item["service_type"] == "ai_model"


def test_detail_returns_pillar_breakdown(client, db):
    svc = _seed_service_with_score(db)
    resp = client.get(f"/api/v1/services/{svc.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["pillars"]["security"] == 800.0
    assert len(data["scanners"]) == 1
    assert data["scanners"][0]["scanner_name"] == "RiskRubric scanner powered by PointGuard"


def test_detail_scanner_has_report_url(client, db):
    svc = _seed_service_with_score(db)
    resp = client.get(f"/api/v1/services/{svc.id}")
    assert resp.status_code == 200
    scanner = resp.json()["scanners"][0]
    assert scanner["report_url"] == "https://pointguard.example.com/reports/test"


def test_detail_scanner_report_url_null_when_absent(client, db):
    svc = _seed_service_with_score(db, report_url=None)
    resp = client.get(f"/api/v1/services/{svc.id}")
    assert resp.status_code == 200
    assert resp.json()["scanners"][0]["report_url"] is None


def test_detail_stale_flag(client, db):
    svc = _seed_service_with_score(db, days_ago=91)
    resp = client.get(f"/api/v1/services/{svc.id}")
    assert resp.status_code == 200
    assert resp.json()["is_stale"] is True


def test_detail_not_stale_when_recent(client, db):
    svc = _seed_service_with_score(db, days_ago=1)
    resp = client.get(f"/api/v1/services/{svc.id}")
    assert resp.json()["is_stale"] is False


def test_detail_404_for_unknown(client):
    resp = client.get("/api/v1/services/svc_doesnotexist")
    assert resp.status_code == 404


def test_scanners_list(client, db):
    _seed_service_with_score(db)
    resp = client.get("/api/v1/scanners")
    assert resp.status_code == 200
    scanners = resp.json()
    assert len(scanners) >= 1
    assert "org_name" in scanners[0]
    assert "submission_count" in scanners[0]
