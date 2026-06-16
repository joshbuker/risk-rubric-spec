from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Scanner, Score
from app.services.keys import generate_api_key, hash_key

router = APIRouter()


class IssueKeyRequest(BaseModel):
    org_name: str
    org_slug: str
    display_name: str


class IssueKeyResponse(BaseModel):
    scanner_id: str
    plaintext_key: str
    api_key_prefix: str
    message: str = "Save this key immediately — it will never be shown again."


def _key_dict(s: Scanner, submission_count: int) -> dict:
    return {
        "scanner_id": s.id,
        "org_name": s.org_name,
        "display_name": s.name,
        "api_key_prefix": s.api_key_prefix,
        "status": s.status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "last_used_at": s.last_used_at.isoformat() if s.last_used_at else None,
        "submission_count": submission_count,
    }


@router.get("/keys")
def list_keys(db: Session = Depends(get_db)):
    scanners = db.query(Scanner).order_by(Scanner.created_at.desc()).all()
    result = []
    for s in scanners:
        count = db.query(func.count(Score.id)).filter(Score.scanner_id == s.id).scalar() or 0
        result.append(_key_dict(s, count))
    return result


@router.post("/keys", response_model=IssueKeyResponse)
def issue_key(
    body: IssueKeyRequest,
    db: Session = Depends(get_db),
):
    plaintext = generate_api_key(body.org_slug)
    key_hash = hash_key(plaintext)
    prefix = plaintext[:12]

    scanner = Scanner(
        name=body.display_name,
        org_name=body.org_name,
        api_key_hash=key_hash,
        api_key_prefix=prefix,
    )
    db.add(scanner)
    db.commit()
    db.refresh(scanner)

    return IssueKeyResponse(
        scanner_id=scanner.id,
        plaintext_key=plaintext,
        api_key_prefix=prefix,
    )


@router.post("/keys/{scanner_id}/revoke")
def revoke_key(
    scanner_id: str,
    db: Session = Depends(get_db),
):
    scanner = db.query(Scanner).filter(Scanner.id == scanner_id).first()
    if not scanner:
        raise HTTPException(status_code=404, detail="Scanner not found")

    if scanner.status == "revoked":
        raise HTTPException(status_code=409, detail="Scanner is already revoked")

    scanner.status = "revoked"
    db.commit()
    return {"status": "revoked", "scanner_id": scanner_id}
