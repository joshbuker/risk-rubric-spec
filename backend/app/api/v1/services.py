from __future__ import annotations
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Service, Scanner, Score
from app.schemas.services import ServiceListItem, ServiceDetail, PillarBreakdown, ScannerScoreSummary
from app.services.scoring import aggregate_pillar_scores, get_grade, compute_composite, PILLAR_KEYS

router = APIRouter()

_STALE_DAYS = 90


def _pillar_dict(score: Score) -> dict[str, float]:
    return {
        "transparency": score.transparency_score,
        "reliability": score.reliability_score,
        "security": score.security_score,
        "privacy": score.privacy_score,
        "safety_societal": score.safety_societal_score,
        "excessive_agency": score.excessive_agency_score,
    }


def _get_latest_scores(db: Session, service_id: str) -> list[Score]:
    """One latest Score per scanner for the given service."""
    latest_per_scanner = (
        db.query(Score.scanner_id, func.max(Score.created_at).label("max_created_at"))
        .filter(Score.service_id == service_id)
        .group_by(Score.scanner_id)
        .subquery()
    )
    return (
        db.query(Score)
        .join(
            latest_per_scanner,
            (Score.scanner_id == latest_per_scanner.c.scanner_id)
            & (Score.created_at == latest_per_scanner.c.max_created_at),
        )
        .filter(Score.service_id == service_id)
        .order_by(Score.id.desc())
        .all()
    )


def _is_stale(scored_at: datetime | None) -> bool:
    if scored_at is None:
        return False
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=_STALE_DAYS)
    return scored_at < cutoff


def _build_list_item(svc: Service, latest_scores: list[Score]) -> ServiceListItem:
    pillar_dicts = [_pillar_dict(s) for s in latest_scores]
    agg = aggregate_pillar_scores(pillar_dicts)
    composite = compute_composite(agg) if agg else None
    most_recent = max((s.scored_at for s in latest_scores), default=None)

    engine_provider = platform_provider = provider_org = target_service = None
    if svc.service_type == "ai_model" and svc.model_detail:
        engine_provider = svc.model_detail.engine_provider
        platform_provider = svc.model_detail.platform_provider
    elif svc.service_type == "mcp_server" and svc.mcp_detail:
        provider_org = svc.mcp_detail.provider_org
        target_service = svc.mcp_detail.target_service

    return ServiceListItem(
        id=svc.id,
        name=svc.name,
        slug=svc.slug,
        service_type=svc.service_type,
        composite_score=composite,
        grade=get_grade(composite) if composite is not None else None,
        confidence=len(latest_scores),
        is_stale=_is_stale(most_recent),
        is_synthetic=svc.is_synthetic,
        scored_at=most_recent,
        engine_provider=engine_provider,
        platform_provider=platform_provider,
        provider_org=provider_org,
        target_service=target_service,
        pillar_scores=agg if agg else None,
    )


@router.get("/services", response_model=list[ServiceListItem])
def browse_services(service_type: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Service)
    if service_type:
        q = q.filter(Service.service_type == service_type)
    services = q.order_by(Service.created_at.desc()).all()

    result = []
    for svc in services:
        latest = _get_latest_scores(db, svc.id)
        result.append(_build_list_item(svc, latest))
    return result


@router.get("/services/{service_id}", response_model=ServiceDetail)
def get_service(service_id: str, db: Session = Depends(get_db)):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if svc is None:
        raise HTTPException(status_code=404, detail="Service not found")

    latest_scores = _get_latest_scores(db, service_id)
    base = _build_list_item(svc, latest_scores)

    pillar_dicts = [_pillar_dict(s) for s in latest_scores]
    agg = aggregate_pillar_scores(pillar_dicts)
    pillars = PillarBreakdown(**agg) if agg else None

    scanner_summaries = []
    for score in latest_scores:
        scanner = db.query(Scanner).filter(Scanner.id == score.scanner_id).first()
        scanner_summaries.append(ScannerScoreSummary(
            scanner_id=score.scanner_id,
            scanner_name=scanner.name if scanner else score.scanner_id,
            composite_score=score.composite_score,
            pillars=PillarBreakdown(**_pillar_dict(score)),
            scored_at=score.scored_at,
            evidence=[],
        ))

    return ServiceDetail(**base.model_dump(), pillars=pillars, scanners=scanner_summaries)
