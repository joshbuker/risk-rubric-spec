#!/usr/bin/env python3
"""Seed the database with sample scanners, services, and scores.

Usage (from repo root):
    backend/.venv/bin/python backend/scripts/seed.py
    # or inside devcontainer:
    cd backend && python scripts/seed.py
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.models import Score, Scanner, Service, ServiceModel, ServiceMcpServer
from app.db.session import SessionLocal
from app.services.keys import generate_api_key, hash_key
from app.services.scoring import compute_composite

SCORED_AT = datetime(2026, 6, 10, 12, 0, 0, tzinfo=timezone.utc)

SCANNER_DEFS = [
    ("Deloitte Risk Scanner", "Deloitte",   "dltt"),
    ("Tumeryk AI Security",   "Tumeryk",    "tmrk"),
    ("PointGuard Scanner",    "PointGuard", "ptg"),
]

MODEL_DEFS = [
    {
        "name": "Claude Opus 4.8",
        "slug": "claude-opus-4-8",
        "detail": dict(
            engine_provider="Anthropic",
            platform_provider=None,
            model_name="Claude Opus",
            model_version="4.8",
        ),
    },
    {
        "name": "OpenAI GPT-5.4",
        "slug": "openai-gpt-5-4",
        "detail": dict(
            engine_provider="OpenAI",
            platform_provider=None,
            model_name="GPT-5",
            model_version="5.4",
        ),
    },
]

MCP_DEFS = [
    {
        "name": "Todoist MCP",
        "slug": "todoist-mcp",
        "detail": dict(
            target_service="Todoist",
            provider_org="Doist",
            provider_tier="official",
            hosting_type="hosted",
        ),
    },
    {
        "name": "CSA MCP",
        "slug": "csa-mcp",
        "detail": dict(
            target_service="CSA Knowledge Base",
            provider_org="Cloud Security Alliance",
            provider_tier="official",
            hosting_type="hosted",
        ),
    },
]

# (service_slug, scanner_slug, pillar_scores)
# Composites are computed; pillar scores are on the 0–1000 scale.
SCORE_DEFS = [
    # Claude Opus 4.8 — three scanners, B/A range
    ("claude-opus-4-8", "dltt", dict(transparency=850, reliability=900, security=880, privacy=870, safety_societal=820, excessive_agency=800)),
    ("claude-opus-4-8", "tmrk", dict(transparency=820, reliability=860, security=900, privacy=840, safety_societal=780, excessive_agency=760)),
    ("claude-opus-4-8", "ptg",  dict(transparency=870, reliability=880, security=910, privacy=860, safety_societal=800, excessive_agency=790)),
    # OpenAI GPT-5.4 — two scanners, C range
    ("openai-gpt-5-4",  "dltt", dict(transparency=780, reliability=820, security=760, privacy=700, safety_societal=750, excessive_agency=720)),
    ("openai-gpt-5-4",  "tmrk", dict(transparency=800, reliability=840, security=780, privacy=720, safety_societal=760, excessive_agency=740)),
    # Todoist MCP — two scanners, C range
    ("todoist-mcp",     "dltt", dict(transparency=700, reliability=750, security=680, privacy=650, safety_societal=720, excessive_agency=690)),
    ("todoist-mcp",     "tmrk", dict(transparency=720, reliability=730, security=700, privacy=660, safety_societal=700, excessive_agency=710)),
    # CSA MCP — two scanners, B range
    ("csa-mcp",         "ptg",  dict(transparency=840, reliability=810, security=820, privacy=880, safety_societal=860, excessive_agency=830)),
    ("csa-mcp",         "dltt", dict(transparency=820, reliability=800, security=810, privacy=870, safety_societal=850, excessive_agency=810)),
]


def seed() -> None:
    db = SessionLocal()
    try:
        scanners = _seed_scanners(db)
        services = _seed_services(db)
        _seed_scores(db, scanners, services)
        db.commit()
        print("\nSeed complete.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _seed_scanners(db) -> dict[str, Scanner]:
    print("\n── Scanners ─────────────────────────────────────")
    result: dict[str, Scanner] = {}
    for name, org_name, slug in SCANNER_DEFS:
        existing = db.query(Scanner).filter(Scanner.org_name == org_name).first()
        if existing:
            print(f"  {org_name}: already exists (prefix={existing.api_key_prefix}…), skipping")
            result[slug] = existing
            continue
        plaintext = generate_api_key(slug)
        scanner = Scanner(
            name=name,
            org_name=org_name,
            api_key_hash=hash_key(plaintext),
            api_key_prefix=plaintext[:12],
            status="active",
            conformance_status="conformant",
        )
        db.add(scanner)
        db.flush()
        result[slug] = scanner
        print(f"  {org_name}: {plaintext}")
    return result


def _seed_services(db) -> dict[str, Service]:
    print("\n── Services ─────────────────────────────────────")
    result: dict[str, Service] = {}

    for sdef in MODEL_DEFS:
        svc = _get_or_create_service(db, sdef["name"], sdef["slug"], "ai_model")
        if svc.id not in [s.id for s in result.values()]:
            if not svc.model_detail:
                db.add(ServiceModel(service_id=svc.id, **sdef["detail"]))
        result[sdef["slug"]] = svc

    for sdef in MCP_DEFS:
        svc = _get_or_create_service(db, sdef["name"], sdef["slug"], "mcp_server")
        if not svc.mcp_detail:
            db.add(ServiceMcpServer(service_id=svc.id, **sdef["detail"]))
        result[sdef["slug"]] = svc

    return result


def _get_or_create_service(db, name: str, slug: str, service_type: str) -> Service:
    existing = db.query(Service).filter(Service.slug == slug).first()
    if existing:
        print(f"  {name}: already exists, skipping")
        return existing
    svc = Service(name=name, slug=slug, service_type=service_type)
    db.add(svc)
    db.flush()
    print(f"  {name}: created ({svc.id})")
    return svc


def _seed_scores(db, scanners: dict, services: dict) -> None:
    print("\n── Scores ───────────────────────────────────────")
    for svc_slug, scn_slug, pillars in SCORE_DEFS:
        svc = services.get(svc_slug)
        scn = scanners.get(scn_slug)
        if not svc or not scn:
            print(f"  {svc_slug}/{scn_slug}: missing entity, skipping")
            continue

        already = (
            db.query(Score)
            .filter(Score.service_id == svc.id, Score.scanner_id == scn.id)
            .first()
        )
        if already:
            print(f"  {svc_slug}/{scn_slug}: score already exists, skipping")
            continue

        composite = compute_composite(pillars)
        db.add(Score(
            service_id=svc.id,
            scanner_id=scn.id,
            transparency_score=pillars["transparency"],
            reliability_score=pillars["reliability"],
            security_score=pillars["security"],
            privacy_score=pillars["privacy"],
            safety_societal_score=pillars["safety_societal"],
            excessive_agency_score=pillars["excessive_agency"],
            composite_score=composite,
            scored_at=SCORED_AT,
            coi_disclosed=False,
        ))
        print(f"  {svc_slug}/{scn_slug}: composite={composite:.1f} ({_grade(composite)})")


def _grade(score: float) -> str:
    if score >= 900: return "A"
    if score >= 800: return "B"
    if score >= 700: return "C"
    if score >= 600: return "D"
    return "F"


if __name__ == "__main__":
    seed()
