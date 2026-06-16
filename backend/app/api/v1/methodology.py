from __future__ import annotations
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import MethodologyVersion
from app.services.scoring import PILLAR_WEIGHTS

router = APIRouter()

_DEFAULT_VERSION = "2.0.0"


class MethodologyResponse(BaseModel):
    version: str
    pillar_weights: dict[str, float]
    grade_thresholds: dict[str, int]
    stale_threshold_days: int
    divergence_threshold: int
    composite_tolerance_pct: float


_HARDCODED_DEFAULTS = MethodologyResponse(
    version=_DEFAULT_VERSION,
    pillar_weights=PILLAR_WEIGHTS,
    grade_thresholds={"A": 900, "B": 800, "C": 700, "D": 600, "F": 0},
    stale_threshold_days=90,
    divergence_threshold=100,
    composite_tolerance_pct=5.0,
)


@router.get("/methodology/current", response_model=MethodologyResponse)
def get_current_methodology(db: Session = Depends(get_db)):
    record = (
        db.query(MethodologyVersion)
        .filter(MethodologyVersion.is_current == True)
        .first()
    )
    if record is None:
        return _HARDCODED_DEFAULTS

    return MethodologyResponse(
        version=record.version,
        pillar_weights=record.pillar_weights,
        grade_thresholds={"A": 900, "B": 800, "C": 700, "D": 600, "F": 0},
        stale_threshold_days=90,
        divergence_threshold=100,
        composite_tolerance_pct=5.0,
    )
