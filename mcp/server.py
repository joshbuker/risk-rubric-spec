"""
Risk Rubric read-only MCP server.

Run via stdio (for Claude Desktop):
    python server.py

Run via HTTP (for programmatic access):
    python server.py --http --port 8001
"""
from __future__ import annotations
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from mcp.server.fastmcp import FastMCP
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import Service, Score, Scanner
from app.services.scoring import aggregate_pillar_scores, compute_composite, get_grade, PILLAR_KEYS

mcp = FastMCP(
    "Risk Rubric",
    instructions=(
        "Search and query CSA Risk Rubric scores for AI Models and MCP Servers. "
        "All data is read-only and publicly available."
    ),
)


def _build_service_summary(svc: Service, db: Session) -> dict:
    scores = svc.scores.all()
    if not scores:
        return {"id": svc.id, "name": svc.name, "service_type": svc.service_type,
                "composite_score": None, "grade": None, "confidence": 0}
    pillar_dicts = [
        {"transparency": s.transparency_score, "reliability": s.reliability_score,
         "security": s.security_score, "privacy": s.privacy_score,
         "safety_societal": s.safety_societal_score, "excessive_agency": s.excessive_agency_score}
        for s in scores
    ]
    agg = aggregate_pillar_scores(pillar_dicts)
    composite = compute_composite(agg)
    return {
        "id": svc.id,
        "name": svc.name,
        "service_type": svc.service_type,
        "composite_score": round(composite, 1),
        "grade": get_grade(composite),
        "confidence": len(scores),
        "pillars": {k: round(agg[k], 1) for k in PILLAR_KEYS},
    }


def _search_services(db: Session, query: str, service_type: str | None = None) -> list[dict]:
    q = db.query(Service)
    if service_type:
        q = q.filter(Service.service_type == service_type)
    if query:
        q = q.filter(Service.name.ilike(f"%{query}%"))
    return [_build_service_summary(s, db) for s in q.limit(20).all()]


def _get_service_score(db: Session, service_id: str) -> dict | None:
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        return None
    return _build_service_summary(svc, db)


def _compare_services(db: Session, service_ids: list[str]) -> list[dict]:
    services = db.query(Service).filter(Service.id.in_(service_ids)).all()
    return [_build_service_summary(s, db) for s in services]


def _list_scanners(db: Session) -> list[dict]:
    scanners = db.query(Scanner).filter(Scanner.status == "active").all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "org_name": s.org_name,
            "submission_count": db.query(func.count(Score.id))
                .filter(Score.scanner_id == s.id).scalar() or 0,
        }
        for s in scanners
    ]


@mcp.tool()
def search_services(query: str, service_type: str | None = None) -> list[dict]:
    """
    Search for AI services (AI Models, MCP Servers) by name or provider.
    Returns up to 20 results with composite grade and score.
    service_type: 'ai_model' or 'mcp_server' (optional filter)
    """
    db = SessionLocal()
    try:
        return _search_services(db, query=query, service_type=service_type)
    finally:
        db.close()


@mcp.tool()
def get_service_score(service_id: str) -> dict | None:
    """
    Get the full score breakdown for a service by its ID.
    Returns composite grade, per-pillar scores, and confidence index.
    Returns null if the service is not found.
    """
    db = SessionLocal()
    try:
        return _get_service_score(db, service_id=service_id)
    finally:
        db.close()


@mcp.tool()
def compare_services(service_ids: list[str]) -> list[dict]:
    """
    Compare 2 to 4 services side by side.
    Returns composite grade and per-pillar scores for each service.
    service_ids: list of service ID strings (2-4 items)
    """
    if not 2 <= len(service_ids) <= 4:
        return [{"error": "Provide between 2 and 4 service IDs"}]
    db = SessionLocal()
    try:
        return _compare_services(db, service_ids=service_ids)
    finally:
        db.close()


@mcp.tool()
def list_scanners() -> list[dict]:
    """
    List active scanner partners and their submission counts.
    """
    db = SessionLocal()
    try:
        return _list_scanners(db)
    finally:
        db.close()


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--http", action="store_true")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()

    if args.http:
        mcp.run(transport="streamable-http", host="0.0.0.0", port=args.port)
    else:
        mcp.run()


if __name__ == "__main__":
    main()
