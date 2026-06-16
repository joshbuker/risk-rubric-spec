from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Scanner, Score

router = APIRouter()

_VALID_CONFORMANCE = {"conformant", "pending"}


class ScannerEditRequest(BaseModel):
    name: str | None = None


class SetConformanceRequest(BaseModel):
    conformance_status: str


def _scanner_dict(s: Scanner, submission_count: int) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "org_name": s.org_name,
        "api_key_prefix": s.api_key_prefix,
        "status": s.status,
        "conformance_status": s.conformance_status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "last_used_at": s.last_used_at.isoformat() if s.last_used_at else None,
        "submission_count": submission_count,
    }


@router.get("/scanners")
def list_scanners(db: Session = Depends(get_db)):
    scanners = db.query(Scanner).order_by(Scanner.created_at).all()
    result = []
    for s in scanners:
        count = db.query(func.count(Score.id)).filter(Score.scanner_id == s.id).scalar() or 0
        result.append(_scanner_dict(s, count))
    return result


@router.patch("/scanners/{scanner_id}")
def update_scanner(
    scanner_id: str,
    body: ScannerEditRequest,
    db: Session = Depends(get_db),
):
    scanner = db.query(Scanner).filter(Scanner.id == scanner_id).first()
    if not scanner:
        raise HTTPException(status_code=404, detail="Scanner not found")

    if body.name is not None:
        scanner.name = body.name

    db.commit()
    return {"status": "updated"}


@router.post("/scanners/{scanner_id}/set-conformance")
def set_conformance(
    scanner_id: str,
    body: SetConformanceRequest,
    db: Session = Depends(get_db),
):
    if body.conformance_status not in _VALID_CONFORMANCE:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid conformance_status '{body.conformance_status}'. Must be one of: {sorted(_VALID_CONFORMANCE)}",
        )

    scanner = db.query(Scanner).filter(Scanner.id == scanner_id).first()
    if not scanner:
        raise HTTPException(status_code=404, detail="Scanner not found")

    if scanner.status == "revoked":
        raise HTTPException(status_code=409, detail="Scanner is already revoked")

    scanner.conformance_status = body.conformance_status
    db.commit()
    return {"status": "updated", "conformance_status": scanner.conformance_status}


@router.post("/scanners/{scanner_id}/revoke")
def revoke_scanner(
    scanner_id: str,
    db: Session = Depends(get_db),
):
    scanner = db.query(Scanner).filter(Scanner.id == scanner_id).first()
    if not scanner:
        raise HTTPException(status_code=404, detail="Scanner not found")

    if scanner.status == "revoked":
        raise HTTPException(status_code=409, detail="Scanner is already revoked")

    scanner.status = "revoked"
    scanner.conformance_status = "revoked"
    db.commit()
    return {"status": "revoked", "scanner_id": scanner_id}
