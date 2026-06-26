from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slugify import slugify

from app.db.session import get_db
from app.db.models import Scanner, Service, ServiceModel, ServiceMcpServer, Score, IdentityMatchFlag
from app.schemas.scores import (
    AiModelScoreSubmission,
    McpServerScoreSubmission,
    ScoreSubmissionResponse,
)
from app.services.identity import match_service
from app.services.keys import verify_key
from app.services.scoring import validate_composite_tolerance, PILLAR_KEYS

router = APIRouter()


def _authenticate_scanner(authorization: str | None, db: Session) -> Scanner:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    scanners = db.query(Scanner).filter(Scanner.status == "active").all()
    for scanner in scanners:
        if verify_key(token, scanner.api_key_hash):
            return scanner
    raise HTTPException(status_code=401, detail="Invalid or revoked API key")


def _derive_service_name(service_type: str, identity: dict) -> str:
    if service_type == "ai_model":
        platform = identity.get("platform_provider") or "Direct API"
        return f"{identity['model_name']} ({platform})"
    if service_type == "mcp_server":
        return f"{identity['target_service'].title()} MCP ({identity['provider_org']})"
    return "Unknown Service"


def _get_or_create_service(
    db: Session,
    service_type: str,
    external_id: str | None,
    identity: dict,
    match_result: tuple,
) -> tuple[Service, str, bool]:
    svc, tier, flagged = match_result

    if svc is None:
        name = _derive_service_name(service_type, identity)
        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while db.query(Service).filter(Service.slug == slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        svc = Service(
            name=name,
            slug=slug,
            service_type=service_type,
            external_id=external_id,
        )
        db.add(svc)
        db.flush()

        if service_type == "ai_model":
            db.add(ServiceModel(service_id=svc.id, **identity))
        elif service_type == "mcp_server":
            db.add(ServiceMcpServer(service_id=svc.id, **identity))
        db.flush()

    return svc, tier, flagged


def _submit_scores(
    request: Request,
    db: Session,
    service_type: str,
    external_id: str | None,
    identity: dict,
    payload,
) -> ScoreSubmissionResponse:
    auth_header = request.headers.get("authorization")
    scanner = _authenticate_scanner(auth_header, db)

    pillar_scores = {p: getattr(payload.scores, p) for p in PILLAR_KEYS}
    if not validate_composite_tolerance(pillar_scores, payload.scores.composite):
        raise HTTPException(
            status_code=422,
            detail="composite score is not within 5% of the weighted pillar sum",
        )

    match_result = match_service(db, service_type, identity, external_id)

    existing_identity = None
    matched_svc, match_tier, _ = match_result
    if matched_svc is not None and match_tier == "medium_confidence":
        detail = matched_svc.model_detail or matched_svc.mcp_detail
        if detail:
            existing_identity = {k: getattr(detail, k, None) for k in identity}

    svc, tier, flagged = _get_or_create_service(db, service_type, external_id, identity, match_result)

    db.add(Score(
        service_id=svc.id,
        scanner_id=scanner.id,
        transparency_score=payload.scores.transparency,
        reliability_score=payload.scores.reliability,
        security_score=payload.scores.security,
        privacy_score=payload.scores.privacy,
        safety_societal_score=payload.scores.safety_societal,
        excessive_agency_score=payload.scores.excessive_agency,
        composite_score=payload.scores.composite,
        coi_disclosed=payload.coi_disclosed,
        scored_at=payload.scored_at,
        report_url=str(payload.report_url) if payload.report_url else None,
    ))

    if flagged:
        db.add(IdentityMatchFlag(
            service_id=svc.id,
            scanner_id=scanner.id,
            incoming_identity=identity,
            existing_identity=existing_identity,
            match_tier=tier,
        ))

    scanner.last_used_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    return ScoreSubmissionResponse(
        status="accepted",
        service_id=svc.id,
        match_tier=tier,
        review_flagged=flagged,
    )


@router.post("/scores/ai-model", response_model=ScoreSubmissionResponse)
def submit_ai_model_scores(
    request: Request,
    payload: AiModelScoreSubmission,
    db: Session = Depends(get_db),
):
    return _submit_scores(
        request, db,
        service_type="ai_model",
        external_id=payload.external_id,
        identity=payload.identity.model_dump(),
        payload=payload,
    )


@router.post("/scores/mcp-server", response_model=ScoreSubmissionResponse)
def submit_mcp_server_scores(
    request: Request,
    payload: McpServerScoreSubmission,
    db: Session = Depends(get_db),
):
    return _submit_scores(
        request, db,
        service_type="mcp_server",
        external_id=payload.external_id,
        identity=payload.identity.model_dump(),
        payload=payload,
    )
