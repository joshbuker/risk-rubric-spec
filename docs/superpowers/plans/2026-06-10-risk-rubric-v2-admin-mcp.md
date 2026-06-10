# Risk Rubric v2 — Admin Interface + MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the CSA admin interface (JWT-protected Next.js pages + FastAPI admin endpoints) and the public read-only MCP server exposing Risk Rubric data to AI assistants.

**Architecture:** Admin API endpoints are mounted under `/api/v1/admin/` and protected by a shared-secret JWT (prototype; replaced by Auth0 in production). The admin frontend lives in the existing Next.js app under `/admin/` with Next.js middleware guarding all routes. The MCP server is a standalone Python script using FastMCP (official MCP SDK) that shares the backend's DB session; it runs via stdio for Claude Desktop and exposes an HTTP endpoint via Starlette for programmatic use.

**Tech Stack:** PyJWT, FastMCP (`mcp[cli]`), Next.js middleware, same stack as Plans 1 + 2.

**Prerequisites:**
- Plan 1 backend is complete and running.
- Plan 2 frontend is complete.
- One schema fix is required before starting (Task 1): add `scanner_id` to `identity_match_flags`.

---

## File Map

```
# Backend additions (extends Plan 1 backend/)
backend/app/
  config.py                              # + admin_secret field
  db/models.py                           # + scanner_id on IdentityMatchFlag
  api/v1/
    router.py                            # + admin router mount
    admin/
      __init__.py
      router.py                          # assembles admin sub-routers; JWT dependency
      auth.py                            # POST /admin/auth/token + get_admin_user dep
      services.py                        # GET/PATCH /admin/services
      flags.py                           # GET/POST accept+reject /admin/flags
      scanners.py                        # GET/PATCH/POST revoke /admin/scanners
      keys.py                            # GET/POST issue+revoke /admin/keys
  alembic/versions/
    0002_add_scanner_id_to_flags.py      # migration: scanner_id FK on identity_match_flags

backend/tests/
  test_admin_auth.py                     # unit: JWT issue + verify
  test_admin_flags.py                    # integration: accept + reject flag actions

# MCP server (new top-level directory)
mcp/
  pyproject.toml                         # mcp[cli], sqlalchemy, psycopg2-binary
  server.py                              # FastMCP app with 4 tools
  tests/
    test_mcp_tools.py                    # unit tests (DB-backed, same test DB)

# Admin frontend additions (extends Plan 2 frontend/)
frontend/src/
  middleware.ts                          # protect /admin/* → /admin/login
  lib/admin-api.ts                       # JWT-authed fetch wrappers for admin endpoints
  hooks/useAdminAuth.ts                  # login/logout, JWT storage, auth state
  app/admin/
    layout.tsx                           # admin shell: top badge + sidebar
    page.tsx                             # redirect → /admin/services
    login/
      page.tsx                           # login form (shared secret)
    services/
      page.tsx                           # services search + table + edit modal
    flags/
      page.tsx                           # identity match triage queue
    scanners/
      page.tsx                           # scanner cards + revoke
    keys/
      page.tsx                           # API key table + issue modal
  components/admin/
    AdminSidebar.tsx                     # sidebar nav with badge counts
    AdminServiceTable.tsx                # searchable table + Edit action
    EditServiceModal.tsx                 # modal: editable identity fields
    FlagCard.tsx                         # triage card: incoming vs existing + actions
    ScannerCard.tsx                      # scanner row: stats + revoke button
    KeyTable.tsx                         # issued keys table
    NewKeyModal.tsx                      # issue new key form + one-time key display
```

---

## Task 1: Schema Fix — Add `scanner_id` to Identity Match Flags

The reject action must move a specific Score row from the auto-linked service to a new one.
That requires knowing which scanner submitted the flagged score.

**Files:**
- Modify: `backend/app/db/models.py`
- Modify: `backend/app/api/v1/scores.py` (pass scanner_id when creating flag)
- Create: `backend/alembic/versions/0002_add_scanner_id_to_flags.py`

- [ ] **Step 1: Add `scanner_id` to `IdentityMatchFlag` in `app/db/models.py`**

Find the `IdentityMatchFlag` class and add one column after `service_id`:

```python
scanner_id = Column(String, ForeignKey("scanners.id"), nullable=True)
```

Also add the relationship:
```python
scanner = relationship("Scanner")
```

- [ ] **Step 2: Update the flag creation in `app/api/v1/scores.py`**

Find where `IdentityMatchFlag(...)` is constructed and add `scanner_id=scanner.id`:

```python
db.add(IdentityMatchFlag(
    service_id=svc.id,
    scanner_id=scanner.id,       # ← add this line
    incoming_identity=identity,
    existing_identity=existing_identity,
    match_tier=tier,
))
```

- [ ] **Step 3: Generate migration**

```bash
cd backend
alembic revision --autogenerate -m "add scanner_id to identity_match_flags"
```

Verify the generated file adds `scanner_id` as a nullable FK column on `identity_match_flags`.

- [ ] **Step 4: Apply migration**

```bash
alembic upgrade head
```

- [ ] **Step 5: Re-run Plan 1 tests to confirm nothing broke**

```bash
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/db/models.py app/api/v1/scores.py alembic/versions/
git commit -m "fix: add scanner_id to identity_match_flags for reject action"
```

---

## Task 2: Admin Auth (JWT)

**Files:**
- Modify: `backend/app/config.py`
- Create: `backend/app/api/v1/admin/__init__.py`
- Create: `backend/app/api/v1/admin/auth.py`
- Create: `backend/app/api/v1/admin/router.py`
- Modify: `backend/app/api/v1/router.py`
- Create: `backend/tests/test_admin_auth.py`

- [ ] **Step 1: Add `admin_secret` to config**

```bash
pip install PyJWT
```

In `app/config.py`, add to the `Settings` class:

```python
admin_secret: str = "change-me-in-production"
admin_token_expire_hours: int = 8
```

Add `ADMIN_SECRET=your-secret-here` to `.env`.

- [ ] **Step 2: Write failing auth tests**

Create `tests/test_admin_auth.py`:

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_login_with_correct_secret(client):
    resp = client.post("/api/v1/admin/auth/token", json={"secret": settings.admin_secret})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_with_wrong_secret(client):
    resp = client.post("/api/v1/admin/auth/token", json={"secret": "wrong"})
    assert resp.status_code == 401


def test_admin_route_requires_token(client):
    resp = client.get("/api/v1/admin/services")
    assert resp.status_code == 401


def test_admin_route_accepts_valid_token(client):
    token = client.post(
        "/api/v1/admin/auth/token", json={"secret": settings.admin_secret}
    ).json()["access_token"]
    resp = client.get("/api/v1/admin/services",
                      headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
```

- [ ] **Step 3: Run to confirm failures**

```bash
pytest tests/test_admin_auth.py -v
```

Expected: 404 errors — admin routes don't exist yet.

- [ ] **Step 4: Create `app/api/v1/admin/auth.py`**

```python
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
import jwt
from app.config import settings

router = APIRouter()


class TokenRequest(BaseModel):
    secret: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _make_token() -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=settings.admin_token_expire_hours)
    return jwt.encode({"admin": True, "exp": exp}, settings.admin_secret, algorithm="HS256")


def get_admin_user(authorization: str | None = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, settings.admin_secret, algorithms=["HS256"])
        if not payload.get("admin"):
            raise HTTPException(status_code=403)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/auth/token", response_model=TokenResponse)
def login(body: TokenRequest):
    if body.secret != settings.admin_secret:
        raise HTTPException(status_code=401, detail="Invalid secret")
    return TokenResponse(access_token=_make_token())
```

- [ ] **Step 5: Create `app/api/v1/admin/router.py`**

```python
from fastapi import APIRouter, Depends
from app.api.v1.admin.auth import router as auth_router, get_admin_user
from app.api.v1.admin.services import router as services_router
from app.api.v1.admin.flags import router as flags_router
from app.api.v1.admin.scanners import router as scanners_router
from app.api.v1.admin.keys import router as keys_router

router = APIRouter(prefix="/admin")
router.include_router(auth_router, tags=["admin-auth"])

protected = APIRouter(dependencies=[Depends(get_admin_user)])
protected.include_router(services_router, tags=["admin-services"])
protected.include_router(flags_router, tags=["admin-flags"])
protected.include_router(scanners_router, tags=["admin-scanners"])
protected.include_router(keys_router, tags=["admin-keys"])
router.include_router(protected)
```

- [ ] **Step 6: Create stub files for the four protected routers** (so the import works):

```python
# app/api/v1/admin/services.py
from fastapi import APIRouter
router = APIRouter()

# app/api/v1/admin/flags.py
from fastapi import APIRouter
router = APIRouter()

# app/api/v1/admin/scanners.py
from fastapi import APIRouter
router = APIRouter()

# app/api/v1/admin/keys.py
from fastapi import APIRouter
router = APIRouter()
```

- [ ] **Step 7: Mount admin router in `app/api/v1/router.py`**

```python
from app.api.v1.admin.router import router as admin_router
router.include_router(admin_router, tags=["admin"])
```

- [ ] **Step 8: Run tests to confirm pass**

```bash
pytest tests/test_admin_auth.py -v
```

Expected: all 4 tests pass.

- [ ] **Step 9: Commit**

```bash
git add app/api/v1/admin/ app/config.py app/api/v1/router.py tests/test_admin_auth.py
git commit -m "feat: admin JWT auth endpoint and protected router"
```

---

## Task 3: Admin Services + Identity Flags API

**Files:**
- Modify: `backend/app/api/v1/admin/services.py`
- Modify: `backend/app/api/v1/admin/flags.py`
- Create: `backend/tests/test_admin_flags.py`

- [ ] **Step 1: Write failing flag tests**

Create `tests/test_admin_flags.py`:

```python
import pytest
from datetime import datetime
from app.db.models import Service, ServiceModel, Scanner, Score, IdentityMatchFlag
from app.services.keys import generate_api_key, hash_key
from app.services.scoring import compute_composite, PILLAR_WEIGHTS
from app.config import settings


def _auth_header(client) -> dict:
    token = client.post(
        "/api/v1/admin/auth/token", json={"secret": settings.admin_secret}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _seed_flag(db) -> tuple[IdentityMatchFlag, Scanner, Service]:
    svc = Service(name="Claude Sonnet 4.6 (Direct API)",
                  slug="claude-s-direct", service_type="ai_model")
    db.add(svc)
    db.flush()
    db.add(ServiceModel(service_id=svc.id, engine_provider="Anthropic",
                        platform_provider=None, model_name="Claude Sonnet 4.6",
                        model_version="20250514"))
    scanner = Scanner(name="RiskRubric scanner powered by PointGuard",
                      org_name="PointGuard",
                      api_key_hash=hash_key(generate_api_key("ptg")),
                      api_key_prefix="sk_ptg_test")
    db.add(scanner)
    db.flush()

    pillars = {p: 800.0 for p in PILLAR_WEIGHTS}
    db.add(Score(
        service_id=svc.id, scanner_id=scanner.id,
        transparency_score=800, reliability_score=800, security_score=800,
        privacy_score=800, safety_societal_score=800, excessive_agency_score=800,
        composite_score=compute_composite(pillars),
        scored_at=datetime.utcnow(),
    ))

    flag = IdentityMatchFlag(
        service_id=svc.id,
        scanner_id=scanner.id,
        incoming_identity={"engine_provider": "Anthropic", "platform_provider": None,
                           "model_name": "Claude Sonnet 4.6", "model_version": "20241023-v2"},
        existing_identity={"engine_provider": "Anthropic", "platform_provider": None,
                           "model_name": "Claude Sonnet 4.6", "model_version": "20250514"},
        match_tier="medium_confidence",
    )
    db.add(flag)
    db.flush()
    return flag, scanner, svc


def test_list_flags_returns_pending(client, db):
    _seed_flag(db)
    resp = client.get("/api/v1/admin/flags", headers=_auth_header(client))
    assert resp.status_code == 200
    flags = resp.json()
    assert len(flags) >= 1
    assert flags[0]["status"] == "pending"


def test_accept_flag_marks_resolved(client, db):
    flag, _, _ = _seed_flag(db)
    resp = client.post(f"/api/v1/admin/flags/{flag.id}/accept",
                       headers=_auth_header(client))
    assert resp.status_code == 200
    db.refresh(flag)
    assert flag.status == "accepted"
    assert flag.resolved_at is not None


def test_reject_flag_creates_new_service_and_moves_score(client, db):
    flag, scanner, original_svc = _seed_flag(db)
    resp = client.post(f"/api/v1/admin/flags/{flag.id}/reject",
                       headers=_auth_header(client))
    assert resp.status_code == 200
    db.refresh(flag)
    assert flag.status == "rejected"

    # Score should now be on a NEW service, not the original
    score = db.query(Score).filter(
        Score.scanner_id == scanner.id,
        Score.service_id != original_svc.id,
    ).first()
    assert score is not None

    # Original service should no longer have this scanner's score
    old_score = db.query(Score).filter(
        Score.scanner_id == scanner.id,
        Score.service_id == original_svc.id,
    ).first()
    assert old_score is None
```

- [ ] **Step 2: Run to confirm failures**

```bash
pytest tests/test_admin_flags.py -v
```

Expected: 404/401 — endpoints not implemented yet.

- [ ] **Step 3: Implement `app/api/v1/admin/services.py`**

```python
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Service, ServiceModel, ServiceMcpServer
from app.services.scoring import get_grade

router = APIRouter()


class ServiceAdminItem(BaseModel):
    id: str
    name: str
    service_type: str
    composite_score: float | None
    grade: str | None
    confidence: int
    is_stale: bool


class ServiceEditRequest(BaseModel):
    name: str | None = None
    engine_provider: str | None = None
    platform_provider: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    target_service: str | None = None
    provider_org: str | None = None
    provider_tier: str | None = None


@router.get("/services")
def list_services(
    q: str | None = None,
    service_type: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Service)
    if service_type:
        query = query.filter(Service.service_type == service_type)
    if q:
        query = query.filter(Service.name.ilike(f"%{q}%"))
    services = query.order_by(Service.name).all()

    result = []
    for svc in services:
        scores = svc.scores.all()
        composites = [s.composite_score for s in scores]
        avg = sum(composites) / len(composites) if composites else None
        result.append({
            "id": svc.id,
            "name": svc.name,
            "service_type": svc.service_type,
            "composite_score": avg,
            "grade": get_grade(avg) if avg is not None else None,
            "confidence": len(scores),
            "is_stale": False,
        })
    return result


@router.patch("/services/{service_id}")
def edit_service(service_id: str, body: ServiceEditRequest, db: Session = Depends(get_db)):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    if body.name:
        svc.name = body.name

    if svc.service_type == "ai_model" and svc.model_detail:
        detail = svc.model_detail
        if body.engine_provider is not None:
            detail.engine_provider = body.engine_provider
        if body.platform_provider is not None:
            detail.platform_provider = body.platform_provider
        if body.model_name is not None:
            detail.model_name = body.model_name
        if body.model_version is not None:
            detail.model_version = body.model_version

    elif svc.service_type == "mcp_server" and svc.mcp_detail:
        detail = svc.mcp_detail
        if body.target_service is not None:
            detail.target_service = body.target_service
        if body.provider_org is not None:
            detail.provider_org = body.provider_org
        if body.provider_tier is not None:
            detail.provider_tier = body.provider_tier

    db.commit()
    return {"status": "updated", "service_id": service_id}
```

- [ ] **Step 4: Implement `app/api/v1/admin/flags.py`**

```python
from __future__ import annotations
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from slugify import slugify
from app.db.session import get_db
from app.db.models import IdentityMatchFlag, Service, ServiceModel, ServiceMcpServer, Score

router = APIRouter()


@router.get("/flags")
def list_flags(status: str = "pending", db: Session = Depends(get_db)):
    flags = db.query(IdentityMatchFlag).filter(
        IdentityMatchFlag.status == status
    ).order_by(IdentityMatchFlag.created_at.desc()).all()
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
def accept_flag(flag_id: str, db: Session = Depends(get_db)):
    flag = db.query(IdentityMatchFlag).filter(IdentityMatchFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    if flag.status != "pending":
        raise HTTPException(status_code=409, detail="Flag already resolved")

    flag.status = "accepted"
    flag.resolved_at = datetime.utcnow()
    db.commit()
    return {"status": "accepted", "flag_id": flag_id}


@router.post("/flags/{flag_id}/reject")
def reject_flag(flag_id: str, db: Session = Depends(get_db)):
    flag = db.query(IdentityMatchFlag).filter(IdentityMatchFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    if flag.status != "pending":
        raise HTTPException(status_code=409, detail="Flag already resolved")
    if not flag.scanner_id:
        raise HTTPException(status_code=422, detail="Flag has no scanner_id — cannot move score")

    # Create new service from incoming_identity
    identity = flag.incoming_identity
    svc_type = db.query(Service).filter(Service.id == flag.service_id).first().service_type

    base_slug = slugify(str(identity))
    slug = base_slug[:60]
    counter = 1
    while db.query(Service).filter(Service.slug == slug).first():
        slug = f"{base_slug[:55]}-{counter}"
        counter += 1

    new_svc = Service(
        name=_derive_name(svc_type, identity),
        slug=slug,
        service_type=svc_type,
    )
    db.add(new_svc)
    db.flush()

    if svc_type == "ai_model":
        db.add(ServiceModel(service_id=new_svc.id, **{
            k: identity.get(k) for k in ["engine_provider", "platform_provider", "model_name", "model_version"]
        }))
    elif svc_type == "mcp_server":
        db.add(ServiceMcpServer(service_id=new_svc.id, **{
            k: identity.get(k) for k in ["target_service", "provider_org", "provider_tier", "hosting_type"]
        }))
    db.flush()

    # Move the latest score for this scanner from old service to new service.
    # Scores are append-only so there may be multiple rows; move only the most recent.
    score = (
        db.query(Score)
        .filter(Score.service_id == flag.service_id, Score.scanner_id == flag.scanner_id)
        .order_by(Score.created_at.desc())
        .first()
    )
    if score:
        score.service_id = new_svc.id

    flag.status = "rejected"
    flag.resolved_at = datetime.utcnow()
    db.commit()
    return {"status": "rejected", "flag_id": flag_id, "new_service_id": new_svc.id}


def _derive_name(service_type: str, identity: dict) -> str:
    if service_type == "ai_model":
        platform = identity.get("platform_provider") or "Direct API"
        return f"{identity.get('model_name', 'Unknown')} ({platform})"
    elif service_type == "mcp_server":
        return f"{str(identity.get('target_service', '')).title()} MCP ({identity.get('provider_org', '')})"
    return "Unknown Service"
```

- [ ] **Step 5: Run flag tests**

```bash
pytest tests/test_admin_flags.py -v
```

Expected: all 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/api/v1/admin/services.py app/api/v1/admin/flags.py tests/test_admin_flags.py
git commit -m "feat: admin services and identity flags API (list, accept, reject)"
```

---

## Task 4: Admin Scanners + API Keys API

**Files:**
- Modify: `backend/app/api/v1/admin/scanners.py`
- Modify: `backend/app/api/v1/admin/keys.py`

- [ ] **Step 1: Implement `app/api/v1/admin/scanners.py`**

```python
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Scanner, Score

router = APIRouter()


class ScannerEditRequest(BaseModel):
    name: str | None = None


class ConformanceRequest(BaseModel):
    conformance_status: str  # "conformant" | "pending"


@router.get("/scanners")
def list_scanners(db: Session = Depends(get_db)):
    scanners = db.query(Scanner).order_by(Scanner.created_at).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "org_name": s.org_name,
            "api_key_prefix": s.api_key_prefix,
            "status": s.status,
            "conformance_status": s.conformance_status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "last_used_at": s.last_used_at.isoformat() if s.last_used_at else None,
            "submission_count": db.query(func.count(Score.id))
                .filter(Score.scanner_id == s.id).scalar() or 0,
        }
        for s in scanners
    ]


@router.patch("/scanners/{scanner_id}")
def edit_scanner(scanner_id: str, body: ScannerEditRequest, db: Session = Depends(get_db)):
    scanner = db.query(Scanner).filter(Scanner.id == scanner_id).first()
    if not scanner:
        raise HTTPException(status_code=404, detail="Scanner not found")
    if body.name:
        scanner.name = body.name
    db.commit()
    return {"status": "updated"}


@router.post("/scanners/{scanner_id}/set-conformance")
def set_conformance(scanner_id: str, body: ConformanceRequest, db: Session = Depends(get_db)):
    if body.conformance_status not in ("conformant", "pending"):
        raise HTTPException(status_code=422, detail="conformance_status must be 'conformant' or 'pending'")
    scanner = db.query(Scanner).filter(Scanner.id == scanner_id).first()
    if not scanner:
        raise HTTPException(status_code=404, detail="Scanner not found")
    if scanner.status == "revoked":
        raise HTTPException(status_code=409, detail="Cannot set conformance on a revoked scanner")
    scanner.conformance_status = body.conformance_status
    db.commit()
    return {"status": "updated", "conformance_status": scanner.conformance_status}


@router.post("/scanners/{scanner_id}/revoke")
def revoke_scanner(scanner_id: str, db: Session = Depends(get_db)):
    scanner = db.query(Scanner).filter(Scanner.id == scanner_id).first()
    if not scanner:
        raise HTTPException(status_code=404, detail="Scanner not found")
    if scanner.status == "revoked":
        raise HTTPException(status_code=409, detail="Already revoked")
    scanner.status = "revoked"
    scanner.conformance_status = "revoked"
    db.commit()
    return {"status": "revoked", "scanner_id": scanner_id}
```

- [ ] **Step 2: Implement `app/api/v1/admin/keys.py`**

```python
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
    org_slug: str   # short identifier used in key prefix, e.g. "ptg"
    display_name: str   # "RiskRubric scanner powered by PointGuard"


class IssueKeyResponse(BaseModel):
    scanner_id: str
    plaintext_key: str   # shown once only
    api_key_prefix: str
    message: str


@router.get("/keys")
def list_keys(db: Session = Depends(get_db)):
    scanners = db.query(Scanner).order_by(Scanner.created_at.desc()).all()
    return [
        {
            "scanner_id": s.id,
            "org_name": s.org_name,
            "display_name": s.name,
            "api_key_prefix": s.api_key_prefix,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "last_used_at": s.last_used_at.isoformat() if s.last_used_at else None,
            "submission_count": db.query(func.count(Score.id))
                .filter(Score.scanner_id == s.id).scalar() or 0,
        }
        for s in scanners
    ]


@router.post("/keys", response_model=IssueKeyResponse)
def issue_key(body: IssueKeyRequest, db: Session = Depends(get_db)):
    plaintext = generate_api_key(body.org_slug)
    scanner = Scanner(
        name=body.display_name,
        org_name=body.org_name,
        api_key_hash=hash_key(plaintext),
        api_key_prefix=plaintext[:12],
    )
    db.add(scanner)
    db.commit()
    db.refresh(scanner)
    return IssueKeyResponse(
        scanner_id=scanner.id,
        plaintext_key=plaintext,
        api_key_prefix=scanner.api_key_prefix,
        message="Save this key immediately — it will never be shown again.",
    )


@router.post("/keys/{scanner_id}/revoke")
def revoke_key(scanner_id: str, db: Session = Depends(get_db)):
    scanner = db.query(Scanner).filter(Scanner.id == scanner_id).first()
    if not scanner:
        raise HTTPException(status_code=404, detail="Scanner not found")
    if scanner.status == "revoked":
        raise HTTPException(status_code=409, detail="Already revoked")
    scanner.status = "revoked"
    db.commit()
    return {"status": "revoked", "scanner_id": scanner_id}
```

- [ ] **Step 3: Run full backend test suite**

```bash
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/admin/scanners.py app/api/v1/admin/keys.py
git commit -m "feat: admin scanners and API key management endpoints"
```

---

## Task 5: Read-Only MCP Server

**Files:**
- Create: `mcp/pyproject.toml`
- Create: `mcp/server.py`
- Create: `mcp/tests/test_mcp_tools.py`

- [ ] **Step 1: Create `mcp/pyproject.toml`**

```toml
[project]
name = "risk-rubric-mcp"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "mcp[cli]>=1.0.0",
    "sqlalchemy>=2.0.0",
    "psycopg2-binary>=2.9.0",
    "pydantic-settings>=2.0.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0.0"]

[project.scripts]
risk-rubric-mcp = "server:main"
```

- [ ] **Step 2: Write failing tests**

Create `mcp/tests/test_mcp_tools.py`:

```python
import os
import sys
import pytest
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Reuse the backend's models and test DB
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../backend"))
from app.db.base import Base
from app.db.models import Service, ServiceModel, Scanner, Score
from app.services.keys import generate_api_key, hash_key
from app.services.scoring import compute_composite, PILLAR_WEIGHTS

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/risk_rubric_test",
)


@pytest.fixture(scope="session")
def engine():
    e = create_engine(TEST_DB_URL)
    Base.metadata.create_all(e)
    yield e
    Base.metadata.drop_all(e)


@pytest.fixture
def db(engine):
    conn = engine.connect()
    tx = conn.begin()
    Session = sessionmaker(bind=conn)
    session = Session()
    yield session
    session.close()
    tx.rollback()
    conn.close()


def _seed(db):
    svc = Service(name="Claude Sonnet 4.6 (Direct API)",
                  slug="claude-sonnet-direct", service_type="ai_model")
    db.add(svc)
    db.flush()
    db.add(ServiceModel(service_id=svc.id, engine_provider="Anthropic",
                        platform_provider=None, model_name="Claude Sonnet 4.6",
                        model_version="20250514"))
    scanner = Scanner(name="RiskRubric scanner powered by PointGuard",
                      org_name="PointGuard",
                      api_key_hash=hash_key(generate_api_key("ptg")),
                      api_key_prefix="sk_ptg_test")
    db.add(scanner)
    db.flush()
    pillars = {p: 900.0 for p in PILLAR_WEIGHTS}
    db.add(Score(
        service_id=svc.id, scanner_id=scanner.id,
        transparency_score=900, reliability_score=900, security_score=900,
        privacy_score=900, safety_societal_score=900, excessive_agency_score=900,
        composite_score=compute_composite(pillars),
        scored_at=__import__("datetime").datetime.utcnow(),
    ))
    db.flush()
    return svc, scanner


# Import tool functions directly (they accept a db argument for testing)
from server import _search_services, _get_service_score, _compare_services, _list_scanners


def test_search_returns_matching_services(db):
    svc, _ = _seed(db)
    results = _search_services(db, query="Claude")
    assert any(r["id"] == svc.id for r in results)


def test_search_filters_by_type(db):
    _seed(db)
    results = _search_services(db, query="", service_type="mcp_server")
    assert all(r["service_type"] == "mcp_server" for r in results)


def test_get_service_score_returns_pillars(db):
    svc, _ = _seed(db)
    result = _get_service_score(db, service_id=svc.id)
    assert result["id"] == svc.id
    assert result["pillars"]["security"] == 900.0
    assert result["confidence"] == 1


def test_get_service_score_not_found(db):
    result = _get_service_score(db, service_id="svc_doesnotexist")
    assert result is None


def test_compare_services_returns_all(db):
    svc, _ = _seed(db)
    result = _compare_services(db, service_ids=[svc.id])
    assert len(result) == 1
    assert result[0]["id"] == svc.id


def test_list_scanners_returns_active(db):
    _, scanner = _seed(db)
    results = _list_scanners(db)
    assert any(r["id"] == scanner.id for r in results)
```

- [ ] **Step 3: Run to confirm failures**

```bash
cd mcp
pip install -e ".[dev]"
pytest tests/test_mcp_tools.py -v
```

Expected: `ModuleNotFoundError: No module named 'server'`.

- [ ] **Step 4: Create `mcp/server.py`**

```python
"""
Risk Rubric read-only MCP server.

Run via stdio (for Claude Desktop):
    python server.py

Run via HTTP (for programmatic access):
    python server.py --http --port 8001
"""
from __future__ import annotations
import sys
import os

# Allow importing backend app modules when run from this directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from mcp.server.fastmcp import FastMCP
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import Service, Score, Scanner
from app.services.scoring import aggregate_pillar_scores, compute_composite, get_grade, PILLAR_KEYS

mcp = FastMCP(
    "Risk Rubric",
    instructions=(
        "Search and query CSA Risk Rubric scores for AI Models and MCP Servers. "
        "All data is read-only and publicly available."
    ),
)


# ── Internal helpers (accept db for testability) ─────────────────────────────

def _build_service_summary(svc: Service, db: Session) -> dict:
    scores = svc.scores.all()
    if not scores:
        return {"id": svc.id, "name": svc.name, "service_type": svc.service_type,
                "composite_score": None, "grade": None, "confidence": 0}
    pillar_dicts = [
        {"transparency": s.transparency_score, "reliability": s.reliability_score,
         "security": s.security_score, "privacy": s.privacy_score,
         "safety_societal": s.safety_societal_score, "excessive_agency": s.excessive_agency_score}
        for s in scores
    ]
    agg = aggregate_pillar_scores(pillar_dicts)
    composite = compute_composite(agg)
    return {
        "id": svc.id,
        "name": svc.name,
        "service_type": svc.service_type,
        "composite_score": round(composite, 1),
        "grade": get_grade(composite),
        "confidence": len(scores),
        "pillars": {k: round(agg[k], 1) for k in PILLAR_KEYS},
    }


def _search_services(db: Session, query: str, service_type: str | None = None) -> list[dict]:
    q = db.query(Service)
    if service_type:
        q = q.filter(Service.service_type == service_type)
    if query:
        q = q.filter(Service.name.ilike(f"%{query}%"))
    return [_build_service_summary(s, db) for s in q.limit(20).all()]


def _get_service_score(db: Session, service_id: str) -> dict | None:
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        return None
    return _build_service_summary(svc, db)


def _compare_services(db: Session, service_ids: list[str]) -> list[dict]:
    services = db.query(Service).filter(Service.id.in_(service_ids)).all()
    return [_build_service_summary(s, db) for s in services]


def _list_scanners(db: Session) -> list[dict]:
    scanners = db.query(Scanner).filter(Scanner.status == "active").all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "org_name": s.org_name,
            "submission_count": db.query(func.count(Score.id))
                .filter(Score.scanner_id == s.id).scalar() or 0,
        }
        for s in scanners
    ]


# ── MCP tool wrappers ─────────────────────────────────────────────────────────

@mcp.tool()
def search_services(query: str, service_type: str | None = None) -> list[dict]:
    """
    Search for AI services (AI Models, MCP Servers) by name or provider.
    Returns up to 20 results with composite grade and score.
    service_type: 'ai_model' or 'mcp_server' (optional filter)
    """
    db = SessionLocal()
    try:
        return _search_services(db, query=query, service_type=service_type)
    finally:
        db.close()


@mcp.tool()
def get_service_score(service_id: str) -> dict | None:
    """
    Get the full score breakdown for a service by its ID.
    Returns composite grade, per-pillar scores, and confidence index.
    Returns null if the service is not found.
    """
    db = SessionLocal()
    try:
        return _get_service_score(db, service_id=service_id)
    finally:
        db.close()


@mcp.tool()
def compare_services(service_ids: list[str]) -> list[dict]:
    """
    Compare 2 to 4 services side by side.
    Returns composite grade and per-pillar scores for each service.
    service_ids: list of service ID strings (2–4 items)
    """
    if not 2 <= len(service_ids) <= 4:
        return [{"error": "Provide between 2 and 4 service IDs"}]
    db = SessionLocal()
    try:
        return _compare_services(db, service_ids=service_ids)
    finally:
        db.close()


@mcp.tool()
def list_scanners() -> list[dict]:
    """
    List active scanner partners and their submission counts.
    """
    db = SessionLocal()
    try:
        return _list_scanners(db)
    finally:
        db.close()


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--http", action="store_true")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()

    if args.http:
        mcp.run(transport="streamable-http", host="0.0.0.0", port=args.port)
    else:
        mcp.run()


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Run MCP tests**

```bash
cd mcp
pytest tests/test_mcp_tools.py -v
```

Expected: all 6 tests pass.

- [ ] **Step 6: Test stdio mode manually**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | python server.py
```

Expected: JSON response listing the four tools: `search_services`, `get_service_score`, `compare_services`, `list_scanners`.

- [ ] **Step 7: Commit**

```bash
git add mcp/
git commit -m "feat: read-only MCP server with search, detail, compare, and list_scanners tools"
```

---

## Task 6: Admin Frontend — Auth + Layout

**Files:**
- Create: `frontend/src/middleware.ts`
- Create: `frontend/src/lib/admin-api.ts`
- Create: `frontend/src/hooks/useAdminAuth.ts`
- Create: `frontend/src/app/admin/login/page.tsx`
- Create: `frontend/src/app/admin/layout.tsx`
- Create: `frontend/src/app/admin/page.tsx`
- Create: `frontend/src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Create `src/middleware.ts`** (protects all `/admin/*` except `/admin/login`)

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("admin_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
```

- [ ] **Step 2: Create `src/lib/admin-api.ts`**

```ts
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function getToken(): string {
  if (typeof document === "undefined") return "";
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith("admin_token="))
    ?.split("=")[1] ?? "";
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/admin${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  if (res.status === 401) {
    document.cookie = "admin_token=; Max-Age=0; path=/";
    window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`Admin API error ${res.status}`);
  return res.json() as Promise<T>;
}

export const adminApi = {
  login: (secret: string) =>
    fetch(`${API_BASE}/admin/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    }).then((r) => r.json()),

  getServices: (q?: string, type?: string) =>
    adminFetch<any[]>(`/services?${new URLSearchParams({ ...(q && { q }), ...(type && { service_type: type }) })}`),

  editService: (id: string, body: object) =>
    adminFetch(`/services/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  getFlags: () => adminFetch<any[]>("/flags"),
  acceptFlag: (id: string) => adminFetch(`/flags/${id}/accept`, { method: "POST" }),
  rejectFlag: (id: string) => adminFetch(`/flags/${id}/reject`, { method: "POST" }),

  getScanners: () => adminFetch<any[]>("/scanners"),
  revokeScanner: (id: string) => adminFetch(`/scanners/${id}/revoke`, { method: "POST" }),

  getKeys: () => adminFetch<any[]>("/keys"),
  issueKey: (body: object) =>
    adminFetch<{ scanner_id: string; plaintext_key: string; api_key_prefix: string; message: string }>(
      "/keys", { method: "POST", body: JSON.stringify(body) }
    ),
  revokeKey: (id: string) => adminFetch(`/keys/${id}/revoke`, { method: "POST" }),
};
```

- [ ] **Step 3: Create `src/hooks/useAdminAuth.ts`**

```ts
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";

export function useAdminAuth() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(secret: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.login(secret);
      if (!data.access_token) {
        setError("Invalid secret");
        return;
      }
      document.cookie = `admin_token=${data.access_token}; path=/; max-age=${8 * 3600}`;
      router.push("/admin/services");
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    document.cookie = "admin_token=; Max-Age=0; path=/";
    router.push("/admin/login");
  }

  return { login, logout, error, loading };
}
```

- [ ] **Step 4: Create `src/app/admin/login/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminLoginPage() {
  const [secret, setSecret] = useState("");
  const { login, error, loading } = useAdminAuth();

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="font-bold text-blue-600 text-lg">CSA Risk Rubric</span>
          <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase">Admin</span>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 mb-6">CSA staff only.</p>

        <form onSubmit={(e) => { e.preventDefault(); login(secret); }}>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Admin Secret
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Enter admin secret"
            required
          />
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/admin/AdminSidebar.tsx`**

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const NAV = [
  { href: "/admin/services", label: "Services", section: "Catalog" },
  { href: "/admin/scanners", label: "Scanners", section: "Catalog" },
  { href: "/admin/flags",    label: "Identity Matches", section: "Review Queue", badge: true },
  { href: "/admin/keys",     label: "API Keys", section: "Access" },
];

export function AdminSidebar({ flagCount = 0 }: { flagCount?: number }) {
  const pathname = usePathname();
  const { logout } = useAdminAuth();
  const sections = [...new Set(NAV.map((n) => n.section))];

  return (
    <aside className="w-48 shrink-0 bg-white border-r border-slate-200 min-h-screen flex flex-col py-5">
      {sections.map((section) => (
        <div key={section} className="mb-5">
          <div className="px-4 text-xs font-bold uppercase text-slate-400 tracking-wide mb-1">
            {section}
          </div>
          {NAV.filter((n) => n.section === section).map(({ href, label, badge }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between px-4 py-2 text-sm transition-colors border-l-2 ${
                pathname.startsWith(href)
                  ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                  : "border-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
              {badge && flagCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {flagCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      ))}
      <div className="mt-auto px-4">
        <button
          onClick={logout}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 6: Create `src/app/admin/layout.tsx`**

```tsx
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-[#1a1a2e] text-white px-6 py-2.5 flex items-center gap-3">
        <span className="text-blue-400 font-bold">CSA Risk Rubric</span>
        <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Admin
        </span>
      </div>
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/app/admin/page.tsx`**

```tsx
import { redirect } from "next/navigation";
export default function AdminPage() { redirect("/admin/services"); }
```

- [ ] **Step 8: Verify admin login flow**

```bash
npm run dev
```

1. Navigate to `http://localhost:3000/admin/services` — should redirect to `/admin/login`.
2. Enter the `ADMIN_SECRET` value from `.env`. Expected: redirects to `/admin/services` with the sidebar visible.
3. Refresh — should stay logged in (JWT cookie persists).

- [ ] **Step 9: Commit**

```bash
git add src/middleware.ts src/lib/admin-api.ts src/hooks/useAdminAuth.ts \
        src/app/admin/ src/components/admin/AdminSidebar.tsx
git commit -m "feat: admin auth flow, layout, and sidebar navigation"
```

---

## Task 7: Admin Services + Flags Pages

**Files:**
- Create: `frontend/src/app/admin/services/page.tsx`
- Create: `frontend/src/components/admin/AdminServiceTable.tsx`
- Create: `frontend/src/components/admin/EditServiceModal.tsx`
- Create: `frontend/src/app/admin/flags/page.tsx`
- Create: `frontend/src/components/admin/FlagCard.tsx`

- [ ] **Step 1: Create `src/components/admin/EditServiceModal.tsx`**

```tsx
"use client";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface Props {
  service: any;
  onClose: () => void;
  onSaved: () => void;
}

export function EditServiceModal({ service, onClose, onSaved }: Props) {
  const [name, setName] = useState(service.name);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await adminApi.editService(service.id, { name });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">Edit Service</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Display Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/admin/AdminServiceTable.tsx`**

```tsx
"use client";
import { useState } from "react";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { TypeChip } from "@/components/ui/TypeChip";
import { EditServiceModal } from "./EditServiceModal";
import type { Grade, ServiceType } from "@/lib/types";

interface Props {
  services: any[];
  onRefresh: () => void;
}

export function AdminServiceTable({ services, onRefresh }: Props) {
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <>
      <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-400">Service</th>
            <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-400">Type</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold uppercase text-slate-400">Grade</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold uppercase text-slate-400">C</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
              <td className="px-4 py-3"><TypeChip type={s.service_type as ServiceType} /></td>
              <td className="px-4 py-3 text-center">
                {s.grade ? <GradeBadge grade={s.grade as Grade} size="sm" /> : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3 text-center text-slate-500">{s.confidence}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => setEditing(s)}
                  className="text-xs font-semibold px-2 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <EditServiceModal service={editing} onClose={() => setEditing(null)} onSaved={onRefresh} />
      )}
    </>
  );
}
```

- [ ] **Step 3: Create `src/app/admin/services/page.tsx`**

```tsx
"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { AdminServiceTable } from "@/components/admin/AdminServiceTable";

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  const load = async () => setServices(await adminApi.getServices(query || undefined));

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Services</h1>
          <p className="text-sm text-slate-500 mt-0.5">All registered AI Models and MCP Servers</p>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search by name…"
          className="max-w-xs border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button onClick={load} className="px-4 py-2 text-sm bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700">
          Search
        </button>
      </div>
      <AdminServiceTable services={services} onRefresh={load} />
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/admin/FlagCard.tsx`**

```tsx
"use client";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface Props {
  flag: any;
  onResolved: () => void;
}

function IdentityField({ label, incoming, existing }: { label: string; incoming: any; existing: any }) {
  const differs = String(incoming) !== String(existing);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${differs ? "text-amber-700 bg-amber-50 px-1 rounded" : "text-slate-800"}`}>
        {String(incoming ?? "null")}
      </span>
    </div>
  );
}

export function FlagCard({ flag, onResolved }: Props) {
  const [acting, setActing] = useState(false);

  async function handle(action: "accept" | "reject") {
    setActing(true);
    if (action === "accept") await adminApi.acceptFlag(flag.id);
    else await adminApi.rejectFlag(flag.id);
    onResolved();
  }

  const incomingFields = Object.entries(flag.incoming_identity as Record<string, any>);

  return (
    <div className="bg-white rounded-xl border-l-4 border-l-orange-400 border border-slate-200 overflow-hidden mb-4">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
        <div className="font-bold text-sm text-slate-800">
          Incoming: {flag.match_tier === "medium_confidence" ? "1-field mismatch" : "no match"}
        </div>
        <span className="text-xs text-slate-400">
          {new Date(flag.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_32px_1fr] gap-3 px-5 py-4 items-start">
        <div>
          <div className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-2">Incoming (from scanner)</div>
          <div className="flex flex-col gap-2">
            {incomingFields.map(([key, val]) => (
              <IdentityField
                key={key}
                label={key}
                incoming={val}
                existing={flag.existing_identity?.[key]}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center pt-6 text-slate-400 text-lg">→</div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-2">Existing service</div>
          {flag.existing_identity ? (
            <div className="flex flex-col gap-2">
              {incomingFields.map(([key]) => (
                <IdentityField
                  key={key}
                  label={key}
                  incoming={flag.existing_identity[key]}
                  existing={flag.existing_identity[key]}
                />
              ))}
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">No existing match — auto-created new service</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-t border-slate-200">
        <button
          onClick={() => handle("accept")}
          disabled={acting}
          className="text-sm font-semibold px-4 py-1.5 bg-green-100 text-green-800 border border-green-300 rounded-lg hover:bg-green-200 disabled:opacity-50"
        >
          ✓ Accept — merge into existing
        </button>
        <button
          onClick={() => handle("reject")}
          disabled={acting}
          className="text-sm font-semibold px-4 py-1.5 bg-red-100 text-red-800 border border-red-300 rounded-lg hover:bg-red-200 disabled:opacity-50"
        >
          ✗ Reject — keep as separate service
        </button>
        <span className="ml-auto text-xs text-slate-400">
          Scores are already live — this is async cleanup
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/app/admin/flags/page.tsx`**

```tsx
"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { FlagCard } from "@/components/admin/FlagCard";

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const load = async () => setFlags(await adminApi.getFlags());
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">
          Identity Matches
          {flags.length > 0 && (
            <span className="ml-2 bg-red-100 text-red-700 text-sm font-bold px-2 py-0.5 rounded-full">
              {flags.length} pending
            </span>
          )}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Scores are already published. Review and resolve at your own pace.
        </p>
      </div>
      {flags.length === 0 ? (
        <div className="text-center text-slate-400 py-16 text-sm">No pending flags.</div>
      ) : (
        flags.map((f) => <FlagCard key={f.id} flag={f} onResolved={load} />)
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/services/ src/app/admin/flags/ \
        src/components/admin/AdminServiceTable.tsx \
        src/components/admin/EditServiceModal.tsx \
        src/components/admin/FlagCard.tsx
git commit -m "feat: admin services table + identity match triage queue"
```

---

## Task 8: Admin Scanners + API Keys Pages

**Files:**
- Create: `frontend/src/app/admin/scanners/page.tsx`
- Create: `frontend/src/components/admin/ScannerCard.tsx`
- Create: `frontend/src/app/admin/keys/page.tsx`
- Create: `frontend/src/components/admin/KeyTable.tsx`
- Create: `frontend/src/components/admin/NewKeyModal.tsx`

- [ ] **Step 1: Create `src/components/admin/ScannerCard.tsx`**

```tsx
"use client";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface Props {
  scanner: any;
  onRefresh: () => void;
}

export function ScannerCard({ scanner, onRefresh }: Props) {
  const [confirming, setConfirming] = useState(false);

  async function revoke() {
    await adminApi.revokeScanner(scanner.id);
    setConfirming(false);
    onRefresh();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-5 mb-3">
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl shrink-0">
        🔬
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-800">{scanner.name}</div>
        <div className="text-xs text-slate-500">{scanner.org_name}</div>
      </div>
      <div className="flex gap-6 shrink-0 text-center">
        <div>
          <div className="text-base font-bold text-slate-800">{scanner.submission_count.toLocaleString()}</div>
          <div className="text-xs text-slate-400 uppercase">Submissions</div>
        </div>
        <div>
          <div className="text-sm font-mono text-slate-600">{scanner.api_key_prefix}…</div>
          <div className="text-xs text-slate-400 uppercase">Key prefix</div>
        </div>
      </div>
      <div className="shrink-0">
        {scanner.status === "revoked" ? (
          <span className="text-xs font-semibold bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg">
            Revoked
          </span>
        ) : confirming ? (
          <div className="flex gap-2">
            <span className="text-xs text-red-600 font-medium self-center">Confirm revoke?</span>
            <button onClick={revoke} className="text-xs font-semibold px-2 py-1.5 bg-red-600 text-white rounded-lg">Yes</button>
            <button onClick={() => setConfirming(false)} className="text-xs font-semibold px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600">No</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/admin/scanners/page.tsx`**

```tsx
"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { ScannerCard } from "@/components/admin/ScannerCard";

export default function AdminScannersPage() {
  const [scanners, setScanners] = useState<any[]>([]);
  const load = async () => setScanners(await adminApi.getScanners());
  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-5">Scanner Partners</h1>
      {scanners.map((s) => <ScannerCard key={s.id} scanner={s} onRefresh={load} />)}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/admin/NewKeyModal.tsx`**

```tsx
"use client";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface Props {
  onClose: () => void;
  onIssued: () => void;
}

export function NewKeyModal({ onClose, onIssued }: Props) {
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [issued, setIssued] = useState<{ plaintext_key: string; api_key_prefix: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function issue() {
    setSaving(true);
    const result = await adminApi.issueKey({
      org_name: orgName,
      org_slug: orgSlug,
      display_name: displayName || `RiskRubric scanner powered by ${orgName}`,
    });
    setIssued(result);
    setSaving(false);
    onIssued();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-lg shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-800">Issue New API Key</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {issued ? (
          <div>
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-amber-800 mb-2">
                ⚠ Copy this key now — it will never be shown again.
              </p>
              <code className="block bg-white border border-amber-200 rounded px-3 py-2 text-sm font-mono text-slate-800 break-all">
                {issued.plaintext_key}
              </code>
            </div>
            <button onClick={onClose} className="w-full py-2 bg-slate-800 text-white font-semibold rounded-lg text-sm hover:bg-slate-700">
              I have saved the key
            </button>
          </div>
        ) : (
          <>
            {[
              ["Org Name", orgName, setOrgName, "e.g. PointGuard"],
              ["Org Slug", orgSlug, setOrgSlug, "e.g. ptg (used in key prefix)"],
              ["Display Name (optional)", displayName, setDisplayName, "RiskRubric scanner powered by PointGuard"],
            ].map(([label, val, setter, placeholder]) => (
              <div key={label as string} className="mb-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label as string}</label>
                <input
                  value={val as string}
                  onChange={(e) => (setter as any)(e.target.value)}
                  placeholder={placeholder as string}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            ))}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={issue}
                disabled={saving || !orgName || !orgSlug}
                className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Issuing…" : "Issue Key"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/admin/KeyTable.tsx`**

```tsx
"use client";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface Props {
  keys: any[];
  onRefresh: () => void;
}

export function KeyTable({ keys, onRefresh }: Props) {
  async function revoke(id: string) {
    if (!confirm("Revoke this key? This immediately blocks all submissions from this scanner.")) return;
    await adminApi.revokeKey(id);
    onRefresh();
  }

  return (
    <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          {["Scanner", "Key prefix", "Issued", "Last used", "Submissions", "Status", ""].map((h) => (
            <th key={h} className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-400">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k.scanner_id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="px-4 py-3">
              <div className="font-semibold text-slate-800">{k.org_name}</div>
              <div className="text-xs text-slate-400">{k.display_name}</div>
            </td>
            <td className="px-4 py-3 font-mono text-xs text-slate-600">{k.api_key_prefix}…</td>
            <td className="px-4 py-3 text-xs text-slate-500">{k.created_at ? new Date(k.created_at).toLocaleDateString() : "—"}</td>
            <td className="px-4 py-3 text-xs text-slate-500">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "—"}</td>
            <td className="px-4 py-3 font-semibold text-slate-700">{k.submission_count.toLocaleString()}</td>
            <td className="px-4 py-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${k.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {k.status}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              {k.status === "active" && (
                <button
                  onClick={() => revoke(k.scanner_id)}
                  className="text-xs font-semibold px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
                >
                  Revoke
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Create `src/app/admin/keys/page.tsx`**

```tsx
"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { KeyTable } from "@/components/admin/KeyTable";
import { NewKeyModal } from "@/components/admin/NewKeyModal";

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const load = async () => setKeys(await adminApi.getKeys());
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Scanner API Keys</h1>
          <p className="text-sm text-slate-500 mt-0.5">Argon2-hashed. Full key shown once at creation.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm font-semibold px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Issue new key
        </button>
      </div>
      <KeyTable keys={keys} onRefresh={load} />
      {showModal && <NewKeyModal onClose={() => setShowModal(false)} onIssued={load} />}
    </div>
  );
}
```

- [ ] **Step 6: Run full test suite**

```bash
cd frontend && npx jest
cd ../backend && pytest tests/ -v
cd ../mcp && pytest tests/ -v
```

Expected: all tests pass across all three projects.

- [ ] **Step 7: End-to-end admin smoke test**

1. Log in to `/admin`
2. Services tab: search for a service, click Edit, change name, verify update
3. Flags tab: submit a medium-confidence score via the scanner API and confirm it appears as a pending flag; accept it
4. Keys tab: issue a new key for "PointGuard", copy the plaintext key, use it to submit a score via `POST /api/v1/scores`, verify it works
5. Scanners tab: confirm the scanner appears; revoke the test key

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/scanners/ src/app/admin/keys/ \
        src/components/admin/ScannerCard.tsx \
        src/components/admin/KeyTable.tsx \
        src/components/admin/NewKeyModal.tsx
git commit -m "feat: admin scanners and API key management pages"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|------------|
| Admin: JWT prototype auth | Task 2 (`auth.py`, login endpoint, `get_admin_user`) |
| Admin: services searchable table | Task 3 + Task 7 (`admin/services.py`, `AdminServiceTable`) |
| Admin: edit service identity fields | Task 3 + Task 7 (`PATCH /admin/services/{id}`, `EditServiceModal`) |
| Admin: identity match triage queue | Task 3 + Task 7 (`flags.py`, `FlagCard`) |
| Admin: accept flag (confirm auto-link) | Task 3 + Task 7 (`POST .../accept`) |
| Admin: reject flag (create new service, move score) | Task 3 + Task 7 (`POST .../reject`, score moved) |
| Admin: scanner management (list, revoke) | Task 4 + Task 8 (`scanners.py`, `ScannerCard`) |
| Admin: API key management (issue, revoke) | Task 4 + Task 8 (`keys.py`, `KeyTable`, `NewKeyModal`) |
| Admin: key shown once at creation | Task 4 + Task 8 (`IssueKeyResponse.plaintext_key`, one-time display modal) |
| Admin: revoke blocks future submissions | Task 4 (`status="revoked"` checked in `_authenticate_scanner` from Plan 1) |
| Admin sidebar badge (pending count) | Task 6 `AdminSidebar` (`flagCount` prop) |
| MCP: `search_services` tool | Task 5 |
| MCP: `get_service_score` tool | Task 5 |
| MCP: `compare_services` tool (2–4 services) | Task 5 |
| MCP: `list_scanners` tool | Task 5 |
| MCP: stdio transport | Task 5 (`mcp.run()` default) |
| MCP: HTTP transport | Task 5 (`mcp.run(transport="streamable-http", ...)`) |
| MCP: no auth required | Task 5 (no auth dependency on any tool) |
| Schema fix: `scanner_id` on flags | Task 1 (migration + model + submission endpoint patch) |

**Not in any plan (deferred to post-launch):**
- Auth0 integration (admin production auth)
- Staff user management table (CSA admin can manage staff via Auth0 dashboard)
- Compare page: Export CSV
- Compare page: Share comparison URL
- STAR Registry integration (Q1 2027)
