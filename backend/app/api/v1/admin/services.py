from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Service, Score
from app.services.scoring import get_grade

router = APIRouter()


class ServiceEditRequest(BaseModel):
    name: str | None = None
    # ai_model fields
    engine_provider: str | None = None
    platform_provider: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    # mcp_server fields
    target_service: str | None = None
    provider_org: str | None = None
    provider_tier: str | None = None


@router.get("/services")
def list_services(
    q: str | None = None,
    service_type: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Service)
    if service_type:
        query = query.filter(Service.service_type == service_type)
    if q:
        query = query.filter(Service.name.ilike(f"%{q}%"))

    services = query.all()
    result = []
    for svc in services:
        all_scores = svc.scores.all()
        if all_scores:
            # Latest score per scanner
            latest_by_scanner: dict[str, Score] = {}
            for score in all_scores:
                existing = latest_by_scanner.get(score.scanner_id)
                if existing is None or score.created_at > existing.created_at:
                    latest_by_scanner[score.scanner_id] = score
            latest_scores = list(latest_by_scanner.values())
            composite_mean = sum(s.composite_score for s in latest_scores) / len(latest_scores)
            grade = get_grade(composite_mean)
            confidence = len(latest_scores)
        else:
            composite_mean = None
            grade = None
            confidence = 0

        scanner_scores = []
        if all_scores:
            for score in latest_scores:
                scanner_scores.append({
                    "scanner_id": score.scanner_id,
                    "scanner_name": score.scanner.name if score.scanner else "Unknown",
                    "composite_score": score.composite_score,
                    "transparency_score": score.transparency_score,
                    "reliability_score": score.reliability_score,
                    "security_score": score.security_score,
                    "privacy_score": score.privacy_score,
                    "safety_societal_score": score.safety_societal_score,
                    "excessive_agency_score": score.excessive_agency_score,
                    "scored_at": score.scored_at.isoformat() if score.scored_at else None,
                })

        result.append({
            "id": svc.id,
            "name": svc.name,
            "service_type": svc.service_type,
            "composite_score": composite_mean,
            "grade": grade,
            "confidence": confidence,
            "is_stale": False,
            "scanner_scores": scanner_scores,
        })
    return result


@router.patch("/services/{service_id}")
def update_service(
    service_id: str,
    body: ServiceEditRequest,
    db: Session = Depends(get_db),
):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    if body.name is not None:
        svc.name = body.name

    if svc.service_type == "ai_model" and svc.model_detail is not None:
        detail = svc.model_detail
        if body.engine_provider is not None:
            detail.engine_provider = body.engine_provider
        if body.platform_provider is not None:
            detail.platform_provider = body.platform_provider
        if body.model_name is not None:
            detail.model_name = body.model_name
        if body.model_version is not None:
            detail.model_version = body.model_version

    elif svc.service_type == "mcp_server" and svc.mcp_detail is not None:
        detail = svc.mcp_detail
        if body.target_service is not None:
            detail.target_service = body.target_service
        if body.provider_org is not None:
            detail.provider_org = body.provider_org
        if body.provider_tier is not None:
            detail.provider_tier = body.provider_tier

    db.commit()
    return {"status": "updated", "service_id": service_id}
