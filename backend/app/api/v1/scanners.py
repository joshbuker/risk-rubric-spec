from __future__ import annotations
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Scanner, Score

router = APIRouter()


class ScannerSummary(BaseModel):
    id: str
    name: str
    org_name: str
    conformance_status: str
    submission_count: int


@router.get("/scanners", response_model=list[ScannerSummary])
def list_scanners(db: Session = Depends(get_db)):
    rows = (
        db.query(Scanner, func.count(Score.id).label("submission_count"))
        .outerjoin(Score, Score.scanner_id == Scanner.id)
        .filter(Scanner.status == "active")
        .group_by(Scanner.id)
        .order_by(Scanner.name)
        .all()
    )
    return [
        ScannerSummary(
            id=scanner.id,
            name=scanner.name,
            org_name=scanner.org_name,
            conformance_status=scanner.conformance_status,
            submission_count=count,
        )
        for scanner, count in rows
    ]
