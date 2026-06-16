from app.services.scoring import PILLAR_WEIGHTS


def test_methodology_returns_hardcoded_defaults(client):
    resp = client.get("/api/v1/methodology/current")
    assert resp.status_code == 200
    data = resp.json()
    assert data["version"] == "2.0.0"
    assert data["pillar_weights"]["security"] == PILLAR_WEIGHTS["security"]
    assert data["grade_thresholds"]["A"] == 900
    assert data["stale_threshold_days"] == 90
    assert data["divergence_threshold"] == 100
    assert data["composite_tolerance_pct"] == 5.0
