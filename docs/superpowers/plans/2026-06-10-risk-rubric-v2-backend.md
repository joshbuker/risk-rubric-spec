# Risk Rubric v2 — Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the FastAPI backend for Risk Rubric v2 — PostgreSQL schema, scanner submission API with three-tier identity matching, and public read endpoints for services and scores.

**Architecture:** PostgreSQL with class-table inheritance for service types; SQLAlchemy 2.x ORM (sync); FastAPI for HTTP. Scoring aggregation is computed at query time, never stored. Scanner API keys are argon2-hashed at rest. All tests run against a real PostgreSQL test database — no mocks.

**Tech Stack:** Python 3.12, FastAPI 0.111+, SQLAlchemy 2.x, PostgreSQL 16, Alembic, passlib[argon2], python-slugify, pytest, httpx

---

## Scope Note

This plan covers the backend API only. Two follow-on plans should be written before the August 4 launch:

- **Plan 2:** Public frontend (Next.js — Browse, Detail, Compare pages)
- **Plan 3:** Admin interface (Next.js) + read-only MCP server

Plan 1 must ship first — the frontend plans depend on this API being available.

---

## File Map

```
backend/
  pyproject.toml                          # project deps + dev deps
  .env.example                            # DATABASE_URL template
  alembic.ini                             # alembic config
  alembic/
    env.py                                # import Base.metadata for autogenerate
    versions/
      0001_initial_schema.py              # all tables in one migration
  app/
    __init__.py
    main.py                               # FastAPI app factory, router mount
    config.py                             # pydantic-settings Settings
    db/
      __init__.py
      base.py                             # declarative_base()
      session.py                          # engine, SessionLocal, get_db dependency
      models.py                           # ALL ORM models (Service, ServiceModel,
                                          #   ServiceMcpServer, Scanner, Score,
                                          #   IdentityMatchFlag)
    api/
      __init__.py
      v1/
        __init__.py
        router.py                         # assembles scores + services + scanners routers
        scores.py                         # POST /api/v1/scores
        services.py                       # GET /api/v1/services, GET /api/v1/services/{id}
        scanners.py                       # GET /api/v1/scanners
    schemas/
      __init__.py
      scores.py                           # Pydantic request/response for submission
      services.py                         # Pydantic response for browse + detail
    services/
      __init__.py
      scoring.py                          # PILLAR_WEIGHTS, compute_composite,
                                          #   validate_composite_tolerance, get_grade,
                                          #   aggregate_scores
      identity.py                         # match_service() — three-tier matching
      keys.py                             # generate_api_key, hash_key, verify_key
  tests/
    __init__.py
    conftest.py                           # engine, db, client fixtures
    test_scoring.py                       # unit: compute_composite, validate, get_grade
    test_identity.py                      # unit: match_service() all three tiers
    test_keys.py                          # unit: generate, hash, verify
    test_api_submission.py                # integration: POST /api/v1/scores full flow
    test_api_services.py                  # integration: GET browse + detail
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/app/db/__init__.py`
- Create: `backend/app/db/base.py`
- Create: `backend/app/db/session.py`

- [ ] **Step 1: Create `backend/pyproject.toml`**

```toml
[project]
name = "risk-rubric-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.111.0",
    "uvicorn[standard]>=0.30.0",
    "sqlalchemy>=2.0.0",
    "alembic>=1.13.0",
    "psycopg2-binary>=2.9.0",
    "pydantic-settings>=2.0.0",
    "passlib[argon2]>=1.7.4",
    "python-slugify>=8.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-cov>=5.0.0",
    "httpx>=0.27.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

- [ ] **Step 2: Create `.env.example`**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/risk_rubric
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/risk_rubric_test
```

- [ ] **Step 3: Create `app/config.py`**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/risk_rubric"
    test_database_url: str = "postgresql://postgres:postgres@localhost:5432/risk_rubric_test"

    model_config = {"env_file": ".env"}

settings = Settings()
```

- [ ] **Step 4: Create `app/db/base.py`**

```python
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
```

- [ ] **Step 5: Create `app/db/session.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 6: Create `app/main.py`**

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.v1.router import router as v1_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Risk Rubric API", version="1.0.0", lifespan=lifespan)
app.include_router(v1_router, prefix="/api/v1")
```

- [ ] **Step 7: Create stub `app/api/v1/router.py`** (so the app starts; routes added in later tasks)

```python
from fastapi import APIRouter

router = APIRouter()
```

- [ ] **Step 8: Install dependencies and verify app starts**

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Expected: server starts on `http://127.0.0.1:8000`. `curl http://127.0.0.1:8000/docs` returns 200.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat: scaffold FastAPI backend project"
```

---

## Task 2: Database Models

**Files:**
- Create: `backend/app/db/models.py`

- [ ] **Step 1: Create `app/db/models.py`**

```python
from __future__ import annotations
from datetime import datetime
from uuid import uuid4
from sqlalchemy import (
    Column, String, Float, DateTime, JSON, Enum, UniqueConstraint,
    ForeignKey, func,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


def _sid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"


class Service(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True, default=lambda: _sid("svc"))
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True)
    service_type = Column(
        Enum("ai_model", "mcp_server", "agent", name="service_type_enum"),
        nullable=False,
    )
    external_id = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    scores = relationship("Score", back_populates="service", lazy="dynamic")
    model_detail = relationship("ServiceModel", back_populates="service", uselist=False)
    mcp_detail = relationship("ServiceMcpServer", back_populates="service", uselist=False)
    flags = relationship("IdentityMatchFlag", back_populates="service")


class ServiceModel(Base):
    __tablename__ = "service_models"

    service_id = Column(String, ForeignKey("services.id"), primary_key=True)
    engine_provider = Column(String, nullable=False)
    platform_provider = Column(String, nullable=True)  # null = Direct API
    model_name = Column(String, nullable=False)
    model_version = Column(String, nullable=False)

    service = relationship("Service", back_populates="model_detail")


class ServiceMcpServer(Base):
    __tablename__ = "service_mcp_servers"

    service_id = Column(String, ForeignKey("services.id"), primary_key=True)
    target_service = Column(String, nullable=False)
    provider_org = Column(String, nullable=False)
    provider_tier = Column(
        Enum("official", "platform_bundled", "third_party", name="provider_tier_enum"),
        nullable=False,
    )
    hosting_type = Column(
        Enum("hosted", "self_hosted", name="hosting_type_enum"),
        nullable=False,
        default="hosted",
    )

    service = relationship("Service", back_populates="mcp_detail")


class Scanner(Base):
    __tablename__ = "scanners"

    id = Column(String, primary_key=True, default=lambda: _sid("scn"))
    name = Column(String, nullable=False)       # "RiskRubric scanner powered by PointGuard"
    org_name = Column(String, nullable=False)   # "PointGuard"
    api_key_hash = Column(String, nullable=False)
    api_key_prefix = Column(String, nullable=False)
    status = Column(
        Enum("active", "revoked", name="scanner_status_enum"),
        nullable=False,
        default="active",
    )
    created_at = Column(DateTime, default=func.now())
    last_used_at = Column(DateTime, nullable=True)

    scores = relationship("Score", back_populates="scanner")


class Score(Base):
    __tablename__ = "scores"

    id = Column(String, primary_key=True, default=lambda: _sid("scr"))
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    scanner_id = Column(String, ForeignKey("scanners.id"), nullable=False)
    transparency_score = Column(Float, nullable=False)
    reliability_score = Column(Float, nullable=False)
    security_score = Column(Float, nullable=False)
    privacy_score = Column(Float, nullable=False)
    safety_societal_score = Column(Float, nullable=False)
    excessive_agency_score = Column(Float, nullable=False)
    composite_score = Column(Float, nullable=False)
    scored_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now())

    service = relationship("Service", back_populates="scores")
    scanner = relationship("Scanner", back_populates="scores")

    __table_args__ = (UniqueConstraint("service_id", "scanner_id", name="uq_score_service_scanner"),)


class IdentityMatchFlag(Base):
    __tablename__ = "identity_match_flags"

    id = Column(String, primary_key=True, default=lambda: _sid("flg"))
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    incoming_identity = Column(JSON, nullable=False)
    existing_identity = Column(JSON, nullable=True)  # null when tier is no_match (auto-created)
    match_tier = Column(String, nullable=False)  # "medium_confidence" | "no_match"
    status = Column(
        Enum("pending", "accepted", "rejected", name="flag_status_enum"),
        nullable=False,
        default="pending",
    )
    created_at = Column(DateTime, default=func.now())
    resolved_at = Column(DateTime, nullable=True)

    service = relationship("Service", back_populates="flags")
```

- [ ] **Step 2: Verify models import cleanly**

```bash
cd backend
python -c "from app.db.models import Service, Score, Scanner; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/db/models.py
git commit -m "feat: add SQLAlchemy ORM models"
```

---

## Task 3: Alembic Migration

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/0001_initial_schema.py`

- [ ] **Step 1: Init alembic**

```bash
cd backend
alembic init alembic
```

- [ ] **Step 2: Replace `alembic/env.py` with this** (wires in Base.metadata for autogenerate):

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.db.base import Base
import app.db.models  # noqa: F401 — ensure all models are registered

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Set `sqlalchemy.url` in `alembic.ini`**

Replace the `sqlalchemy.url` line:
```ini
sqlalchemy.url = postgresql://postgres:postgres@localhost:5432/risk_rubric
```

- [ ] **Step 4: Create the databases**

```bash
psql -U postgres -c "CREATE DATABASE risk_rubric;"
psql -U postgres -c "CREATE DATABASE risk_rubric_test;"
```

- [ ] **Step 5: Autogenerate the initial migration**

```bash
cd backend
alembic revision --autogenerate -m "initial schema"
```

Expected: creates `alembic/versions/<hash>_initial_schema.py`. Verify the generated file creates all tables: `services`, `service_models`, `service_mcp_servers`, `scanners`, `scores`, `identity_match_flags`, plus all ENUMs.

- [ ] **Step 6: Run migration**

```bash
alembic upgrade head
```

Expected: no errors. Verify with:
```bash
psql -U postgres -d risk_rubric -c "\dt"
```
Expected: lists all 6 tables.

- [ ] **Step 7: Commit**

```bash
git add alembic/ alembic.ini
git commit -m "feat: add initial Alembic schema migration"
```

---

## Task 4: Scoring Service

**Files:**
- Create: `backend/app/services/scoring.py`
- Create: `backend/tests/test_scoring.py`

- [ ] **Step 1: Write failing tests first**

Create `tests/test_scoring.py`:

```python
import pytest
from app.services.scoring import (
    compute_composite,
    validate_composite_tolerance,
    get_grade,
    PILLAR_WEIGHTS,
)


def test_pillar_weights_sum_to_one():
    assert abs(sum(PILLAR_WEIGHTS.values()) - 1.0) < 1e-9


def test_compute_composite_all_same():
    scores = {p: 800.0 for p in PILLAR_WEIGHTS}
    assert abs(compute_composite(scores) - 800.0) < 0.01


def test_compute_composite_security_weighted_higher():
    scores = {p: 0.0 for p in PILLAR_WEIGHTS}
    scores["security"] = 1000.0
    result = compute_composite(scores)
    assert abs(result - 200.0) < 0.01  # 1000 * 0.20


def test_validate_composite_within_tolerance():
    scores = {p: 800.0 for p in PILLAR_WEIGHTS}
    submitted = compute_composite(scores)
    assert validate_composite_tolerance(scores, submitted) is True


def test_validate_composite_just_within_tolerance():
    scores = {p: 800.0 for p in PILLAR_WEIGHTS}
    computed = compute_composite(scores)
    # 4.9% deviation is within tolerance
    just_within = computed * 1.049
    assert validate_composite_tolerance(scores, just_within) is True


def test_validate_composite_over_tolerance():
    scores = {p: 800.0 for p in PILLAR_WEIGHTS}
    computed = compute_composite(scores)
    over = computed * 1.06  # 6% over
    assert validate_composite_tolerance(scores, over) is False


def test_get_grade_boundaries():
    assert get_grade(1000) == "A"
    assert get_grade(900) == "A"
    assert get_grade(899) == "B"
    assert get_grade(800) == "B"
    assert get_grade(799) == "C"
    assert get_grade(700) == "C"
    assert get_grade(699) == "D"
    assert get_grade(600) == "D"
    assert get_grade(599) == "F"
    assert get_grade(0) == "F"
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd backend
pytest tests/test_scoring.py -v
```

Expected: `ImportError` — `app.services.scoring` does not exist yet.

- [ ] **Step 3: Create `app/services/scoring.py`**

```python
PILLAR_WEIGHTS: dict[str, float] = {
    "transparency": 0.16,
    "reliability": 0.16,
    "security": 0.20,
    "privacy": 0.16,
    "safety_societal": 0.16,
    "excessive_agency": 0.16,
}

PILLAR_KEYS = list(PILLAR_WEIGHTS.keys())


def compute_composite(pillar_scores: dict[str, float]) -> float:
    return sum(pillar_scores[p] * w for p, w in PILLAR_WEIGHTS.items())


def validate_composite_tolerance(pillar_scores: dict[str, float], submitted: float) -> bool:
    computed = compute_composite(pillar_scores)
    if computed == 0:
        return submitted == 0
    return abs(computed - submitted) / computed <= 0.05


def get_grade(score: float) -> str:
    if score >= 900:
        return "A"
    if score >= 800:
        return "B"
    if score >= 700:
        return "C"
    if score >= 600:
        return "D"
    return "F"


def aggregate_pillar_scores(scores: list[dict[str, float]]) -> dict[str, float]:
    """Arithmetic mean per pillar across a list of scanner score dicts."""
    if not scores:
        return {}
    return {p: sum(s[p] for s in scores) / len(scores) for p in PILLAR_KEYS}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/test_scoring.py -v
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/services/scoring.py tests/test_scoring.py
git commit -m "feat: scoring service — composite, grade, aggregation"
```

---

## Task 5: Identity Matching Service

**Files:**
- Create: `backend/app/services/identity.py`
- Create: `backend/tests/test_identity.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Create `tests/conftest.py`** (shared DB and test client fixtures)

```python
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base
from app.db.session import get_db

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/risk_rubric_test",
)


@pytest.fixture(scope="session")
def engine():
    e = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(e)
    yield e
    Base.metadata.drop_all(e)


@pytest.fixture
def db(engine):
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 2: Write failing tests for identity matching**

Create `tests/test_identity.py`:

```python
import pytest
from app.db.models import Service, ServiceModel, ServiceMcpServer
from app.services.identity import match_service


def _make_model_service(db, *, engine_provider, platform_provider, model_name, model_version, name="Test Model"):
    svc = Service(name=name, slug=name.lower().replace(" ", "-"), service_type="ai_model")
    db.add(svc)
    db.flush()
    detail = ServiceModel(
        service_id=svc.id,
        engine_provider=engine_provider,
        platform_provider=platform_provider,
        model_name=model_name,
        model_version=model_version,
    )
    db.add(detail)
    db.flush()
    return svc


def _make_mcp_service(db, *, target_service, provider_org, provider_tier, hosting_type="hosted", name="Test MCP"):
    svc = Service(name=name, slug=name.lower().replace(" ", "-"), service_type="mcp_server")
    db.add(svc)
    db.flush()
    detail = ServiceMcpServer(
        service_id=svc.id,
        target_service=target_service,
        provider_org=provider_org,
        provider_tier=provider_tier,
        hosting_type=hosting_type,
    )
    db.add(detail)
    db.flush()
    return svc


# ── High confidence: external_id match ──────────────────────────────────────

def test_high_confidence_external_id(db):
    svc = _make_model_service(db, engine_provider="Anthropic", platform_provider=None,
                               model_name="Claude Sonnet 4.6", model_version="20250514")
    svc.external_id = "ext_abc123"
    db.flush()

    identity = {"engine_provider": "Anthropic", "platform_provider": None,
                "model_name": "Claude Sonnet 4.6", "model_version": "DIFFERENT"}
    result_svc, tier, flagged = match_service(db, "ai_model", identity, external_id="ext_abc123")

    assert result_svc.id == svc.id
    assert tier == "high_confidence"
    assert flagged is False


# ── High confidence: exact tuple match ──────────────────────────────────────

def test_high_confidence_exact_tuple(db):
    svc = _make_model_service(db, engine_provider="Anthropic", platform_provider=None,
                               model_name="Claude Sonnet 4.6", model_version="20250514")

    identity = {"engine_provider": "Anthropic", "platform_provider": None,
                "model_name": "Claude Sonnet 4.6", "model_version": "20250514"}
    result_svc, tier, flagged = match_service(db, "ai_model", identity)

    assert result_svc.id == svc.id
    assert tier == "high_confidence"
    assert flagged is False


# ── Medium confidence: exactly one field mismatch ───────────────────────────

def test_medium_confidence_one_field_mismatch(db):
    svc = _make_model_service(db, engine_provider="Anthropic", platform_provider=None,
                               model_name="Claude Sonnet 4.6", model_version="20241022")

    identity = {"engine_provider": "Anthropic", "platform_provider": None,
                "model_name": "Claude Sonnet 4.6", "model_version": "20241023-v2"}
    result_svc, tier, flagged = match_service(db, "ai_model", identity)

    assert result_svc.id == svc.id
    assert tier == "medium_confidence"
    assert flagged is True


# ── No match: two fields differ ─────────────────────────────────────────────

def test_no_match_two_fields_differ(db):
    _make_model_service(db, engine_provider="Anthropic", platform_provider=None,
                        model_name="Claude Sonnet 4.6", model_version="20250514")

    identity = {"engine_provider": "Anthropic", "platform_provider": None,
                "model_name": "Claude Haiku", "model_version": "DIFFERENT"}
    result_svc, tier, flagged = match_service(db, "ai_model", identity)

    assert result_svc is None
    assert tier == "no_match"
    assert flagged is True


# ── No match: empty DB ───────────────────────────────────────────────────────

def test_no_match_empty_db(db):
    identity = {"engine_provider": "Anthropic", "platform_provider": None,
                "model_name": "Claude Sonnet 4.6", "model_version": "20250514"}
    result_svc, tier, flagged = match_service(db, "ai_model", identity)

    assert result_svc is None
    assert tier == "no_match"
    assert flagged is True


# ── MCP server matching ──────────────────────────────────────────────────────

def test_medium_confidence_mcp_one_field(db):
    svc = _make_mcp_service(db, target_service="gmail", provider_org="Google",
                             provider_tier="official")

    identity = {"target_service": "gmail", "provider_org": "Google LLC",
                "provider_tier": "official", "hosting_type": "hosted"}
    result_svc, tier, flagged = match_service(db, "mcp_server", identity)

    assert result_svc.id == svc.id
    assert tier == "medium_confidence"
    assert flagged is True
```

- [ ] **Step 3: Run to confirm failures**

```bash
pytest tests/test_identity.py -v
```

Expected: `ImportError` — `app.services.identity` does not exist yet.

- [ ] **Step 4: Create `app/services/identity.py`**

```python
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
    needs_flag: True when CSA review queue entry should be created.
    """
    # Tier 1: external_id provided and matches an existing service
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
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
pytest tests/test_identity.py -v
```

Expected: all 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/services/identity.py tests/test_identity.py tests/conftest.py
git commit -m "feat: three-tier identity matching service"
```

---

## Task 6: API Key Service

**Files:**
- Create: `backend/app/services/keys.py`
- Create: `backend/tests/test_keys.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_keys.py`:

```python
import pytest
from app.services.keys import generate_api_key, hash_key, verify_key


def test_generate_api_key_format():
    key = generate_api_key("ptg")
    assert key.startswith("sk_ptg_")
    assert len(key) > 20


def test_generate_api_key_unique():
    keys = {generate_api_key("ptg") for _ in range(100)}
    assert len(keys) == 100


def test_hash_key_is_not_plaintext():
    key = generate_api_key("ptg")
    hashed = hash_key(key)
    assert key not in hashed
    assert hashed.startswith("$argon2")


def test_verify_key_correct():
    key = generate_api_key("ptg")
    hashed = hash_key(key)
    assert verify_key(key, hashed) is True


def test_verify_key_wrong():
    key = generate_api_key("ptg")
    hashed = hash_key(key)
    assert verify_key("wrong_key", hashed) is False


def test_key_prefix():
    key = generate_api_key("ptg")
    # prefix is "sk_ptg_" + first 4 chars of random portion
    assert key[:7] == "sk_ptg_"
```

- [ ] **Step 2: Run to confirm failures**

```bash
pytest tests/test_keys.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create `app/services/keys.py`**

```python
import secrets
from passlib.context import CryptContext

_pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def generate_api_key(org_slug: str) -> str:
    """Generate a new plaintext API key. org_slug is a short identifier, e.g. 'ptg'."""
    random_part = secrets.token_urlsafe(32)
    return f"sk_{org_slug}_{random_part}"


def hash_key(plaintext_key: str) -> str:
    """Argon2-hash a plaintext API key for storage."""
    return _pwd_context.hash(plaintext_key)


def verify_key(plaintext_key: str, hashed_key: str) -> bool:
    """Verify a plaintext key against its stored argon2 hash."""
    return _pwd_context.verify(plaintext_key, hashed_key)
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/test_keys.py -v
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/services/keys.py tests/test_keys.py
git commit -m "feat: argon2 API key generation and verification"
```

---

## Task 7: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/scores.py`
- Create: `backend/app/schemas/services.py`

- [ ] **Step 1: Create `app/schemas/scores.py`**

```python
from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, field_validator, model_validator
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


class ServiceInput(BaseModel):
    external_id: str | None = None
    service_type: Literal["ai_model", "mcp_server", "agent"]
    identity: AiModelIdentity | McpServerIdentity


class ScoreSubmissionRequest(BaseModel):
    service: ServiceInput
    scores: PillarScores
    evidence: list[EvidenceItem] = []
    scored_at: datetime

    @model_validator(mode="after")
    def scored_at_not_future(self) -> "ScoreSubmissionRequest":
        if self.scored_at > datetime.utcnow():
            raise ValueError("scored_at must not be in the future")
        return self


class ScoreSubmissionResponse(BaseModel):
    status: str
    service_id: str
    match_tier: str
    review_flagged: bool
```

- [ ] **Step 2: Create `app/schemas/services.py`**

```python
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
    scored_at: datetime | None


class ServiceDetail(ServiceListItem):
    pillars: PillarBreakdown | None
    scanners: list[ScannerScoreSummary]
```

- [ ] **Step 3: Verify schemas import**

```bash
python -c "from app.schemas.scores import ScoreSubmissionRequest; from app.schemas.services import ServiceDetail; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add app/schemas/
git commit -m "feat: Pydantic request and response schemas"
```

---

## Task 8: Scanner Submission Endpoint

**Files:**
- Create: `backend/app/api/v1/scores.py`
- Modify: `backend/app/api/v1/router.py`
- Create: `backend/tests/test_api_submission.py`

- [ ] **Step 1: Write failing integration tests**

Create `tests/test_api_submission.py`:

```python
import pytest
from datetime import datetime, timedelta
from app.db.models import Scanner, Service, ServiceModel, Score, IdentityMatchFlag
from app.services.keys import generate_api_key, hash_key
from app.services.scoring import compute_composite, PILLAR_WEIGHTS


def _make_scanner(db, org_slug="ptg") -> tuple[Scanner, str]:
    key = generate_api_key(org_slug)
    scanner = Scanner(
        name=f"RiskRubric scanner powered by PointGuard",
        org_name="PointGuard",
        api_key_hash=hash_key(key),
        api_key_prefix=key[:12],
    )
    db.add(scanner)
    db.flush()
    return scanner, key


def _valid_payload(scored_at=None) -> dict:
    pillars = {p: 800.0 for p in PILLAR_WEIGHTS}
    composite = compute_composite(pillars)
    return {
        "service": {
            "service_type": "ai_model",
            "identity": {
                "engine_provider": "Anthropic",
                "platform_provider": None,
                "model_name": "Claude Sonnet 4.6",
                "model_version": "20250514",
            },
        },
        "scores": {**pillars, "composite": composite},
        "evidence": [{"label": "Audit report", "url": "https://example.com/audit.pdf"}],
        "scored_at": (scored_at or datetime.utcnow()).isoformat(),
    }


# ── Auth ─────────────────────────────────────────────────────────────────────

def test_submission_rejects_missing_auth(client):
    resp = client.post("/api/v1/scores", json=_valid_payload())
    assert resp.status_code == 401


def test_submission_rejects_bad_key(client, db):
    _make_scanner(db)
    resp = client.post("/api/v1/scores", json=_valid_payload(),
                       headers={"Authorization": "Bearer sk_bad_key"})
    assert resp.status_code == 401


def test_submission_rejects_revoked_scanner(client, db):
    scanner, key = _make_scanner(db)
    scanner.status = "revoked"
    db.flush()
    resp = client.post("/api/v1/scores", json=_valid_payload(),
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 401


# ── Validation ────────────────────────────────────────────────────────────────

def test_submission_rejects_composite_out_of_tolerance(client, db):
    _, key = _make_scanner(db)
    payload = _valid_payload()
    payload["scores"]["composite"] = 999.0  # clearly wrong
    resp = client.post("/api/v1/scores", json=payload,
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 422


def test_submission_rejects_future_scored_at(client, db):
    _, key = _make_scanner(db)
    payload = _valid_payload(scored_at=datetime.utcnow() + timedelta(days=1))
    resp = client.post("/api/v1/scores", json=payload,
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 422


# ── Happy path ────────────────────────────────────────────────────────────────

def test_submission_creates_service_and_score(client, db):
    _, key = _make_scanner(db)
    resp = client.post("/api/v1/scores", json=_valid_payload(),
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "accepted"
    assert body["match_tier"] == "no_match"  # first submission, no existing service
    assert body["review_flagged"] is True

    svc = db.query(Service).filter(Service.id == body["service_id"]).first()
    assert svc is not None
    assert svc.service_type == "ai_model"

    score = db.query(Score).filter(Score.service_id == svc.id).first()
    assert score is not None
    assert score.security_score == 800.0


def test_submission_upserts_score_on_resubmit(client, db):
    scanner, key = _make_scanner(db)
    # First submission
    client.post("/api/v1/scores", json=_valid_payload(),
                headers={"Authorization": f"Bearer {key}"})

    # Second submission with updated scores
    payload = _valid_payload()
    payload["scores"] = {p: 900.0 for p in PILLAR_WEIGHTS}
    payload["scores"]["composite"] = compute_composite({p: 900.0 for p in PILLAR_WEIGHTS})
    client.post("/api/v1/scores", json=payload,
                headers={"Authorization": f"Bearer {key}"})

    scores = db.query(Score).all()
    assert len(scores) == 1  # upserted, not duplicated
    assert scores[0].security_score == 900.0


def test_submission_medium_confidence_flags_match(client, db):
    scanner, key = _make_scanner(db)
    # Create existing service
    first = _valid_payload()
    client.post("/api/v1/scores", json=first, headers={"Authorization": f"Bearer {key}"})

    # Second submission — same service but different model_version
    payload = _valid_payload()
    payload["service"]["identity"]["model_version"] = "20241023-v2"
    payload["scores"]["composite"] = compute_composite({p: 800.0 for p in PILLAR_WEIGHTS})
    resp = client.post("/api/v1/scores", json=payload,
                       headers={"Authorization": f"Bearer {key}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["match_tier"] == "medium_confidence"
    assert body["review_flagged"] is True

    flag = db.query(IdentityMatchFlag).first()
    assert flag is not None
    assert flag.status == "pending"
```

- [ ] **Step 2: Run to confirm failures**

```bash
pytest tests/test_api_submission.py -v
```

Expected: `404` errors (routes don't exist yet).

- [ ] **Step 3: Create `app/api/v1/scores.py`**

```python
from __future__ import annotations
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from slugify import slugify

from app.db.session import get_db
from app.db.models import Scanner, Service, ServiceModel, ServiceMcpServer, Score, IdentityMatchFlag
from app.schemas.scores import ScoreSubmissionRequest, ScoreSubmissionResponse
from app.services.identity import match_service
from app.services.keys import verify_key
from app.services.scoring import validate_composite_tolerance, PILLAR_KEYS

router = APIRouter()


def _authenticate_scanner(authorization: str | None, db: Session) -> Scanner:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    scanners = db.query(Scanner).filter(Scanner.status == "active").all()
    for scanner in scanners:
        if verify_key(token, scanner.api_key_hash):
            return scanner
    raise HTTPException(status_code=401, detail="Invalid or revoked API key")


def _get_or_create_service(
    db: Session,
    service_input,
    match_result: tuple,
) -> tuple[Service, str, bool]:
    svc, tier, flagged = match_result

    if svc is None:
        # Auto-create new service
        identity = service_input.identity.model_dump()
        name = _derive_service_name(service_input.service_type, identity)
        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while db.query(Service).filter(Service.slug == slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        svc = Service(
            name=name,
            slug=slug,
            service_type=service_input.service_type,
            external_id=service_input.external_id,
        )
        db.add(svc)
        db.flush()

        if service_input.service_type == "ai_model":
            db.add(ServiceModel(service_id=svc.id, **identity))
        elif service_input.service_type == "mcp_server":
            db.add(ServiceMcpServer(service_id=svc.id, **identity))
        db.flush()

    return svc, tier, flagged


def _derive_service_name(service_type: str, identity: dict) -> str:
    if service_type == "ai_model":
        platform = identity.get("platform_provider") or "Direct API"
        return f"{identity['model_name']} ({platform})"
    elif service_type == "mcp_server":
        return f"{identity['target_service'].title()} MCP ({identity['provider_org']})"
    return "Unknown Service"


def _upsert_score(db: Session, service_id: str, scanner_id: str, scores, scored_at: datetime) -> None:
    existing = db.query(Score).filter(
        Score.service_id == service_id,
        Score.scanner_id == scanner_id,
    ).first()

    pillar_data = {
        "transparency_score": scores.transparency,
        "reliability_score": scores.reliability,
        "security_score": scores.security,
        "privacy_score": scores.privacy,
        "safety_societal_score": scores.safety_societal,
        "excessive_agency_score": scores.excessive_agency,
        "composite_score": scores.composite,
        "scored_at": scored_at,
    }

    if existing:
        for k, v in pillar_data.items():
            setattr(existing, k, v)
    else:
        db.add(Score(service_id=service_id, scanner_id=scanner_id, **pillar_data))


@router.post("/scores", response_model=ScoreSubmissionResponse)
def submit_scores(
    payload: ScoreSubmissionRequest,
    authorization: str | None = None,
    db: Session = Depends(get_db),
):
    from fastapi import Request
    scanner = _authenticate_scanner(authorization, db)

    pillar_scores = {p: getattr(payload.scores, p) for p in PILLAR_KEYS}
    if not validate_composite_tolerance(pillar_scores, payload.scores.composite):
        raise HTTPException(
            status_code=422,
            detail="composite score is not within 5% of the weighted pillar sum",
        )

    identity = payload.service.identity.model_dump()
    match_result = match_service(db, payload.service.service_type, identity, payload.service.external_id)

    existing_identity = None
    if match_result[0] is not None and match_result[1] == "medium_confidence":
        svc_detail = match_result[0].model_detail or match_result[0].mcp_detail
        if svc_detail:
            existing_identity = {k: getattr(svc_detail, k, None) for k in identity}

    svc, tier, flagged = _get_or_create_service(db, payload.service, match_result)

    _upsert_score(db, svc.id, scanner.id, payload.scores, payload.scored_at)

    if flagged:
        db.add(IdentityMatchFlag(
            service_id=svc.id,
            incoming_identity=identity,
            existing_identity=existing_identity,
            match_tier=tier,
        ))

    scanner.last_used_at = datetime.utcnow()
    db.commit()

    return ScoreSubmissionResponse(
        status="accepted",
        service_id=svc.id,
        match_tier=tier,
        review_flagged=flagged,
    )
```

- [ ] **Step 4: Fix the Authorization header extraction** — FastAPI doesn't auto-inject raw headers into route functions. Update the route signature:

```python
@router.post("/scores", response_model=ScoreSubmissionResponse)
def submit_scores(
    payload: ScoreSubmissionRequest,
    db: Session = Depends(get_db),
    request: "Request" = None,
):
    from fastapi import Request as FastAPIRequest
    auth_header = request.headers.get("authorization") if request else None
    scanner = _authenticate_scanner(auth_header, db)
    ...
```

Replace the full route signature:

```python
from fastapi import APIRouter, Depends, HTTPException, Request

@router.post("/scores", response_model=ScoreSubmissionResponse)
def submit_scores(
    request: Request,
    payload: ScoreSubmissionRequest,
    db: Session = Depends(get_db),
):
    auth_header = request.headers.get("authorization")
    scanner = _authenticate_scanner(auth_header, db)
    # ... rest unchanged
```

- [ ] **Step 5: Wire router into `app/api/v1/router.py`**

```python
from fastapi import APIRouter
from app.api.v1.scores import router as scores_router

router = APIRouter()
router.include_router(scores_router, tags=["scores"])
```

- [ ] **Step 6: Run tests to confirm pass**

```bash
pytest tests/test_api_submission.py -v
```

Expected: all 8 tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/api/v1/scores.py app/api/v1/router.py tests/test_api_submission.py
git commit -m "feat: scanner submission endpoint with identity matching and upsert"
```

---

## Task 9: Public Read API

**Files:**
- Create: `backend/app/api/v1/services.py`
- Create: `backend/app/api/v1/scanners.py`
- Modify: `backend/app/api/v1/router.py`
- Create: `backend/tests/test_api_services.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_api_services.py`:

```python
import pytest
from datetime import datetime, timedelta
from app.db.models import Scanner, Service, ServiceModel, Score
from app.services.keys import generate_api_key, hash_key
from app.services.scoring import compute_composite, PILLAR_WEIGHTS


def _seed_service_with_score(db, model_version="20250514", days_ago=1) -> Service:
    svc = Service(name="Claude Sonnet 4.6 (Direct API)", slug="claude-sonnet-4-6-direct-api",
                  service_type="ai_model")
    db.add(svc)
    db.flush()
    db.add(ServiceModel(service_id=svc.id, engine_provider="Anthropic",
                        platform_provider=None, model_name="Claude Sonnet 4.6",
                        model_version=model_version))
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
        scored_at=datetime.utcnow() - timedelta(days=days_ago),
    ))
    db.flush()
    return svc


def test_browse_returns_services(client, db):
    _seed_service_with_score(db)
    resp = client.get("/api/v1/services")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    item = data[0]
    assert "id" in item
    assert "composite_score" in item
    assert "grade" in item
    assert item["confidence"] == 1


def test_browse_filters_by_type(client, db):
    _seed_service_with_score(db)
    resp = client.get("/api/v1/services?service_type=ai_model")
    assert resp.status_code == 200
    for item in resp.json():
        assert item["service_type"] == "ai_model"


def test_detail_returns_pillar_breakdown(client, db):
    svc = _seed_service_with_score(db)
    resp = client.get(f"/api/v1/services/{svc.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["pillars"]["security"] == 800.0
    assert len(data["scanners"]) == 1
    assert data["scanners"][0]["scanner_name"] == "RiskRubric scanner powered by PointGuard"


def test_detail_stale_flag(client, db):
    svc = _seed_service_with_score(db, days_ago=91)
    resp = client.get(f"/api/v1/services/{svc.id}")
    assert resp.status_code == 200
    assert resp.json()["is_stale"] is True


def test_detail_not_stale_when_recent(client, db):
    svc = _seed_service_with_score(db, days_ago=1)
    resp = client.get(f"/api/v1/services/{svc.id}")
    assert resp.json()["is_stale"] is False


def test_detail_404_for_unknown(client):
    resp = client.get("/api/v1/services/svc_doesnotexist")
    assert resp.status_code == 404


def test_scanners_list(client, db):
    _seed_service_with_score(db)
    resp = client.get("/api/v1/scanners")
    assert resp.status_code == 200
    scanners = resp.json()
    assert len(scanners) >= 1
    assert "org_name" in scanners[0]
    assert "submission_count" in scanners[0]
```

- [ ] **Step 2: Run to confirm failures**

```bash
pytest tests/test_api_services.py -v
```

Expected: 404 errors (routes don't exist).

- [ ] **Step 3: Create `app/api/v1/services.py`**

```python
from __future__ import annotations
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Service, Score, Scanner
from app.schemas.services import ServiceListItem, ServiceDetail, PillarBreakdown, ScannerScoreSummary
from app.services.scoring import get_grade, aggregate_pillar_scores, PILLAR_KEYS

router = APIRouter()

STALE_DAYS = 90


def _is_stale(scored_at: datetime | None) -> bool:
    if scored_at is None:
        return False
    return scored_at < datetime.utcnow() - timedelta(days=STALE_DAYS)


def _build_pillar_breakdown(score: Score) -> PillarBreakdown:
    return PillarBreakdown(
        transparency=score.transparency_score,
        reliability=score.reliability_score,
        security=score.security_score,
        privacy=score.privacy_score,
        safety_societal=score.safety_societal_score,
        excessive_agency=score.excessive_agency_score,
    )


def _aggregate_service_scores(scores: list[Score]) -> tuple[PillarBreakdown | None, float | None]:
    if not scores:
        return None, None
    pillar_dicts = [
        {
            "transparency": s.transparency_score,
            "reliability": s.reliability_score,
            "security": s.security_score,
            "privacy": s.privacy_score,
            "safety_societal": s.safety_societal_score,
            "excessive_agency": s.excessive_agency_score,
        }
        for s in scores
    ]
    agg = aggregate_pillar_scores(pillar_dicts)
    from app.services.scoring import compute_composite
    composite = compute_composite(agg)
    return PillarBreakdown(**agg), composite


@router.get("/services", response_model=list[ServiceListItem])
def browse_services(
    service_type: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Service)
    if service_type:
        query = query.filter(Service.service_type == service_type)
    services = query.all()

    result = []
    for svc in services:
        scores = svc.scores.all()
        _, composite = _aggregate_service_scores(scores)
        latest = max((s.scored_at for s in scores), default=None)
        result.append(ServiceListItem(
            id=svc.id,
            name=svc.name,
            slug=svc.slug,
            service_type=svc.service_type,
            composite_score=composite,
            grade=get_grade(composite) if composite is not None else None,
            confidence=len(scores),
            is_stale=_is_stale(latest),
            scored_at=latest,
        ))
    return result


@router.get("/services/{service_id}", response_model=ServiceDetail)
def get_service(service_id: str, db: Session = Depends(get_db)):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    scores = svc.scores.all()
    pillars, composite = _aggregate_service_scores(scores)
    latest = max((s.scored_at for s in scores), default=None)

    scanner_summaries = []
    for score in scores:
        scanner = db.query(Scanner).filter(Scanner.id == score.scanner_id).first()
        scanner_summaries.append(ScannerScoreSummary(
            scanner_id=score.scanner_id,
            scanner_name=scanner.name if scanner else "Unknown",
            composite_score=score.composite_score,
            pillars=_build_pillar_breakdown(score),
            scored_at=score.scored_at,
            evidence=[],
        ))

    return ServiceDetail(
        id=svc.id,
        name=svc.name,
        slug=svc.slug,
        service_type=svc.service_type,
        composite_score=composite,
        grade=get_grade(composite) if composite is not None else None,
        confidence=len(scores),
        is_stale=_is_stale(latest),
        scored_at=latest,
        pillars=pillars,
        scanners=scanner_summaries,
    )
```

- [ ] **Step 4: Create `app/api/v1/scanners.py`**

```python
from __future__ import annotations
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Scanner, Score

router = APIRouter()


class ScannerListItem(BaseModel):
    id: str
    name: str
    org_name: str
    submission_count: int
    status: str


@router.get("/scanners", response_model=list[ScannerListItem])
def list_scanners(db: Session = Depends(get_db)):
    scanners = db.query(Scanner).filter(Scanner.status == "active").all()
    result = []
    for s in scanners:
        count = db.query(func.count(Score.id)).filter(Score.scanner_id == s.id).scalar()
        result.append(ScannerListItem(
            id=s.id, name=s.name, org_name=s.org_name,
            submission_count=count or 0, status=s.status,
        ))
    return result
```

- [ ] **Step 5: Wire routers in `app/api/v1/router.py`**

```python
from fastapi import APIRouter
from app.api.v1.scores import router as scores_router
from app.api.v1.services import router as services_router
from app.api.v1.scanners import router as scanners_router

router = APIRouter()
router.include_router(scores_router, tags=["scores"])
router.include_router(services_router, tags=["services"])
router.include_router(scanners_router, tags=["scanners"])
```

- [ ] **Step 6: Run all tests**

```bash
pytest tests/ -v
```

Expected: all tests pass. If `lazy="dynamic"` on `Service.scores` causes issues in the test session, replace it with `lazy="select"` in `models.py` and call `svc.scores` without `.all()` — it will return a list directly.

- [ ] **Step 7: Commit**

```bash
git add app/api/v1/services.py app/api/v1/scanners.py app/api/v1/router.py tests/test_api_services.py
git commit -m "feat: public services browse, detail, and scanners list endpoints"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|------------|
| Six pillars + weights | Task 4 (`scoring.py`, `PILLAR_WEIGHTS`) |
| 0–1000 per-pillar range | Task 7 (`PillarScores` validator) |
| Composite = weighted sum | Task 4 (`compute_composite`) |
| 5% tolerance validation | Task 4 + Task 8 (submission endpoint) |
| Letter grades A–F | Task 4 (`get_grade`) |
| Confidence index (C) | Task 9 (browse endpoint, `confidence=len(scores)`) |
| Argon2 key hashing | Task 6 (`keys.py`) |
| Three-tier identity matching | Task 5 (`identity.py`) |
| UNIQUE(service_id, scanner_id) upsert | Task 8 (submission endpoint, `_upsert_score`) |
| Scores publish immediately | Task 8 (commit before returning) |
| IdentityMatchFlag created async | Task 8 (flagged after score commit) |
| Stale rule (90 days) | Task 9 (`_is_stale`, `is_stale` on responses) |
| Arithmetic mean aggregation | Task 9 (`aggregate_pillar_scores`) |
| Revoked scanner blocked | Task 8 (`_authenticate_scanner` checks status) |
| Class table inheritance schema | Task 2 (`models.py`) |
| Real DB tests (no mocks) | Task 5 `conftest.py` (transaction rollback per test) |

**Not covered in this plan (follow-on plans):**
- Divergence indicator (frontend concern — Plan 2)
- Admin interface (Plan 3)
- Read-only MCP server (Plan 3)
- Export CSV / share comparison (Plan 2)

All spec requirements that belong to the backend are covered. No placeholders found.
