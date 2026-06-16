from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from slugify import slugify
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import IdentityMatchFlag, Service, ServiceModel, ServiceMcpServer, Score

router = APIRouter()

_VALID_PROVIDER_TIERS = {"official", "platform_bundled", "third_party"}
_VALID_HOSTING_TYPES = {"hosted", "self_hosted"}


@router.get("/flags")
def list_flags(
    status: str = "pending",
    db: Session = Depends(get_db),
):
    flags = db.query(IdentityMatchFlag).filter(IdentityMatchFlag.status == status).all()
    return [
        {
            "id": f.id,
            "service_id": f.service_id,
            "scanner_id": f.scanner_id,
            "incoming_identity": f.incoming_identity,
            "existing_identity": f.existing_identity,
            "match_tier": f.match_tier,
            "status": f.status,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in flags
    ]


@router.post("/flags/{flag_id}/accept")
def accept_flag(
    flag_id: str,
    db: Session = Depends(get_db),
):
    flag = db.query(IdentityMatchFlag).filter(IdentityMatchFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    if flag.status != "pending":
        raise HTTPException(status_code=422, detail="Flag is not pending")

    flag.status = "accepted"
    flag.resolved_at = datetime.utcnow()
    db.commit()
    return {"status": "accepted", "flag_id": flag_id}


@router.post("/flags/{flag_id}/reject")
def reject_flag(
    flag_id: str,
    db: Session = Depends(get_db),
):
    flag = db.query(IdentityMatchFlag).filter(IdentityMatchFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    if flag.status != "pending":
        raise HTTPException(status_code=422, detail="Flag is not pending")
    if not flag.scanner_id:
        raise HTTPException(status_code=422, detail="Flag has no associated scanner")

    original_svc = db.query(Service).filter(Service.id == flag.service_id).first()
    if not original_svc:
        raise HTTPException(status_code=404, detail="Original service not found")

    service_type = original_svc.service_type
    identity = flag.incoming_identity or {}

    # Build a name from the incoming identity
    if service_type == "ai_model":
        platform = identity.get("platform_provider") or "Direct API"
        name = f"{identity.get('model_name', 'Unknown')} ({platform})"
    elif service_type == "mcp_server":
        target = identity.get("target_service", "Unknown")
        org = identity.get("provider_org", "Unknown")
        name = f"{target} MCP Server by {org}"
    else:
        name = identity.get("name", "Unknown Service")

    # Build a slug from the incoming identity with UUID suffix
    slug = f"{slugify(str(identity))[:50]}-{uuid.uuid4().hex[:6]}"

    # Create the new service
    new_svc = Service(
        name=name,
        slug=slug,
        service_type=service_type,
    )
    db.add(new_svc)
    db.flush()

    # Create the appropriate detail row
    if service_type == "ai_model":
        detail = ServiceModel(
            service_id=new_svc.id,
            engine_provider=identity.get("engine_provider", "Unknown"),
            platform_provider=identity.get("platform_provider"),
            model_name=identity.get("model_name", "Unknown"),
            model_version=identity.get("model_version", "unknown"),
        )
        db.add(detail)
    elif service_type == "mcp_server":
        raw_tier = identity.get("provider_tier", "third_party")
        provider_tier = raw_tier if raw_tier in _VALID_PROVIDER_TIERS else "third_party"
        raw_hosting = identity.get("hosting_type", "hosted")
        hosting_type = raw_hosting if raw_hosting in _VALID_HOSTING_TYPES else "hosted"
        detail = ServiceMcpServer(
            service_id=new_svc.id,
            target_service=identity.get("target_service", "unknown"),
            provider_org=identity.get("provider_org", "Unknown"),
            provider_tier=provider_tier,
            hosting_type=hosting_type,
        )
        db.add(detail)

    db.flush()

    # Move the most recent Score for (original service, scanner) to the new service
    latest_score = (
        db.query(Score)
        .filter(Score.service_id == flag.service_id, Score.scanner_id == flag.scanner_id)
        .order_by(Score.created_at.desc())
        .first()
    )
    if latest_score:
        latest_score.service_id = new_svc.id
        db.flush()

    # Resolve the flag
    flag.status = "rejected"
    flag.resolved_at = datetime.utcnow()
    db.commit()

    return {"status": "rejected", "flag_id": flag_id, "new_service_id": new_svc.id}
