from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel


class PillarBreakdown(BaseModel):
    transparency: float
    reliability: float
    security: float
    privacy: float
    safety_societal: float
    excessive_agency: float


class ScannerScoreSummary(BaseModel):
    scanner_id: str
    scanner_name: str
    composite_score: float
    pillars: PillarBreakdown
    scored_at: datetime
    evidence: list[dict]


class ServiceListItem(BaseModel):
    id: str
    name: str
    slug: str
    service_type: str
    composite_score: float | None
    grade: str | None
    confidence: int
    is_stale: bool
    is_synthetic: bool
    scored_at: datetime | None
    # Per-type detail fields (for subtitle + sidebar filters)
    engine_provider: str | None = None
    platform_provider: str | None = None
    model_version: str | None = None
    provider_org: str | None = None
    target_service: str | None = None
    provider_tier: str | None = None
    hosting_type: str | None = None
    # Aggregate pillar scores across all scanners (for per-column grade badges)
    pillar_scores: dict | None = None


class ServiceDetail(ServiceListItem):
    pillars: PillarBreakdown | None
    scanners: list[ScannerScoreSummary]
