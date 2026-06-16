from __future__ import annotations
from sqlalchemy.orm import Session
from app.db.models import Service, ServiceModel, ServiceMcpServer

_MODEL_FIELDS = ["engine_provider", "platform_provider", "model_name", "model_version"]
_MCP_FIELDS = ["target_service", "provider_org", "provider_tier", "hosting_type"]


def _model_tuple(detail: ServiceModel) -> dict:
    return {f: getattr(detail, f) for f in _MODEL_FIELDS}


def _mcp_tuple(detail: ServiceMcpServer) -> dict:
    return {f: getattr(detail, f) for f in _MCP_FIELDS}


def _mismatch_count(a: dict, b: dict, fields: list[str]) -> int:
    return sum(1 for f in fields if str(a.get(f)) != str(b.get(f)))


def match_service(
    db: Session,
    service_type: str,
    identity: dict,
    external_id: str | None = None,
) -> tuple[Service | None, str, bool]:
    """
    Returns (service_or_None, tier, needs_flag).
    tier: "high_confidence" | "medium_confidence" | "no_match"
    needs_flag: True when a CSA review queue entry should be created.
    """
    if external_id:
        svc = db.query(Service).filter(
            Service.external_id == external_id,
            Service.service_type == service_type,
        ).first()
        if svc:
            return svc, "high_confidence", False

    if service_type == "ai_model":
        candidates = (
            db.query(Service)
            .join(ServiceModel, Service.id == ServiceModel.service_id)
            .filter(Service.service_type == "ai_model")
            .all()
        )
        fields = _MODEL_FIELDS
        get_tuple = lambda svc: _model_tuple(svc.model_detail)  # noqa: E731
    elif service_type == "mcp_server":
        candidates = (
            db.query(Service)
            .join(ServiceMcpServer, Service.id == ServiceMcpServer.service_id)
            .filter(Service.service_type == "mcp_server")
            .all()
        )
        fields = _MCP_FIELDS
        get_tuple = lambda svc: _mcp_tuple(svc.mcp_detail)  # noqa: E731
    else:
        return None, "no_match", True

    for candidate in candidates:
        existing = get_tuple(candidate)
        mismatches = _mismatch_count(identity, existing, fields)
        if mismatches == 0:
            return candidate, "high_confidence", False
        if mismatches == 1:
            return candidate, "medium_confidence", True

    return None, "no_match", True
