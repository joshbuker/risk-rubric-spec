from __future__ import annotations
from datetime import datetime, timezone
from pydantic import AnyHttpUrl, BaseModel, field_validator, model_validator
from typing import Literal


class PillarScores(BaseModel):
    transparency: float
    reliability: float
    security: float
    privacy: float
    safety_societal: float
    excessive_agency: float
    composite: float

    @field_validator("transparency", "reliability", "security", "privacy",
                     "safety_societal", "excessive_agency", "composite")
    @classmethod
    def score_in_range(cls, v: float) -> float:
        if not 0 <= v <= 1000:
            raise ValueError("score must be between 0 and 1000")
        return v


class EvidenceItem(BaseModel):
    label: str
    url: str


class AiModelIdentity(BaseModel):
    engine_provider: str
    platform_provider: str | None = None
    model_name: str
    model_version: str


class McpServerIdentity(BaseModel):
    target_service: str
    provider_org: str
    provider_tier: Literal["official", "platform_bundled", "third_party"]
    hosting_type: Literal["hosted", "self_hosted"] = "hosted"


class _ScoreSubmissionBase(BaseModel):
    scores: PillarScores
    evidence: list[EvidenceItem] = []
    scored_at: datetime
    coi_disclosed: bool = False
    report_url: AnyHttpUrl

    @model_validator(mode="after")
    def scored_at_not_future(self) -> "_ScoreSubmissionBase":
        if self.scored_at.replace(tzinfo=None) > datetime.now(timezone.utc).replace(tzinfo=None):
            raise ValueError("scored_at must not be in the future")
        return self


class AiModelScoreSubmission(_ScoreSubmissionBase):
    external_id: str | None = None
    identity: AiModelIdentity


class McpServerScoreSubmission(_ScoreSubmissionBase):
    external_id: str | None = None
    identity: McpServerIdentity


class ScoreSubmissionResponse(BaseModel):
    status: str
    service_id: str
    match_tier: str
    review_flagged: bool
