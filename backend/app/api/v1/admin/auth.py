from __future__ import annotations
from datetime import datetime, timedelta, timezone
import hmac
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import jwt
from app.config import settings

router = APIRouter()

_WWW_AUTH = {"WWW-Authenticate": "Bearer"}


class TokenRequest(BaseModel):
    secret: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _make_token() -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=settings.admin_token_expire_hours)
    return jwt.encode({"admin": True, "exp": exp}, settings.admin_jwt_signing_key, algorithm="HS256")


def get_admin_user(authorization: str | None = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin authentication required", headers=_WWW_AUTH)
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, settings.admin_jwt_signing_key, algorithms=["HS256"])
        if not payload.get("admin"):
            raise HTTPException(status_code=403)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired", headers=_WWW_AUTH)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token", headers=_WWW_AUTH)


@router.post("/auth/token", response_model=TokenResponse)
def login(body: TokenRequest):
    if not hmac.compare_digest(body.secret, settings.admin_secret):
        raise HTTPException(status_code=401, detail="Invalid secret")
    return TokenResponse(access_token=_make_token())
