# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment

**Primary dev environment: VS Code devcontainer** (`.devcontainer/`).

Inside the devcontainer, `python`, `node`, `pip`, `npm` etc. are all on PATH — no special setup needed. PostgreSQL 16 runs as a sidecar container reachable at host `db`, port `5432`. Both `risk_rubric` and `risk_rubric_test` databases are created automatically on first container start.

Environment variables available inside the container:
- `DATABASE_URL=postgresql://postgres:postgres@db:5432/risk_rubric`
- `TEST_DATABASE_URL=postgresql://postgres:postgres@db:5432/risk_rubric_test`

**Fallback: NixOS shell.nix** — the host machine runs NixOS. If working outside the devcontainer, tools must be declared in `shell.nix` to be on PATH. If a tool is missing, add it to `shell.nix` and ask the user to restart Claude Code.

## Commands

### Backend (FastAPI — `backend/`)

```bash
# Install deps (run once or after pyproject.toml changes)
cd backend && pip install -e ".[dev]"

# Run dev server (port 8000)
cd backend && uvicorn app.main:app --reload

# Run all tests
cd backend && pytest tests/ -v

# Run a single test file
cd backend && pytest tests/test_scoring.py -v

# Run a single test by name
cd backend && pytest tests/test_scoring.py::test_compute_composite_all_same -v

# Apply migrations
cd backend && alembic upgrade head

# Autogenerate a new migration (after model changes)
cd backend && alembic revision --autogenerate -m "description"
```

### Frontend (Next.js — `frontend/`)

```bash
# Install deps (run once or after package.json changes)
cd frontend && npm install

# Run dev server (port 3000)
cd frontend && npm run dev

# Production build (also validates types)
cd frontend && npm run build

# Run tests
cd frontend && npm test

# Type check only
cd frontend && npx tsc --noEmit
```

## Project Status

Implementation plans in `docs/superpowers/plans/` are the authoritative blueprints:

- **Plan 1** (`2026-06-10-risk-rubric-v2-backend.md`) — FastAPI backend ✅ complete
- **Plan 2** (`2026-06-10-risk-rubric-v2-frontend.md`) — Next.js public frontend ✅ complete
- **Plan 3** (`2026-06-10-risk-rubric-v2-admin-mcp.md`) — Admin interface + read-only MCP server (not yet started)

Use `superpowers:subagent-driven-development` to execute plans task by task.

## Architecture

**Tech stack:** Python 3.12 + FastAPI backend, Next.js 16.2.9 + React 19 + Tailwind v4 frontend, PostgreSQL 16 database, Redis cache (not yet integrated), read-only MCP server (not yet built).

### ⚠️ Next.js version warning

This project uses **Next.js 16** and **React 19**, which have breaking changes relative to most training data. Before writing any Next.js code, read the relevant guide in `frontend/node_modules/next/dist/docs/`. Heed deprecation notices.

### Frontend structure (`frontend/src/`)

Layers and their responsibilities:

```
app/                    ← Next.js App Router pages (thin — just mount a Shell component)
  browse/page.tsx       ← mounts BrowseShell
  compare/page.tsx      ← mounts CompareShell
  services/[id]/page.tsx ← "use client"; fetches via useService hook, mounts detail components

components/
  browse/               ← BrowseShell (tab/filter state), BrowseTable, ServiceRow, SidebarFilters, TypeTabs
  compare/              ← CompareShell (loads services via useService), CompareGrid, PillarCompareRow,
                           ServiceColumnHeader, AddServiceColumn
  detail/               ← ServiceHero, PillarBreakdown, ScannerAccordion, DivergenceWarning
  nav/                  ← TopNav
  ui/                   ← Stateless primitives: GradeBadge, ProgressBar, ConfidenceChip, StaleBanner, TypeChip

hooks/
  useServices.ts        ← SWR wrapper around fetchServices(); keyed by [serviceType]
  useService.ts         ← SWR wrapper around fetchService(id)
  useCompare.ts         ← localStorage compare-set state (wraps compare-store.ts)

lib/
  api.ts                ← apiFetch helper; NEXT_PUBLIC_API_URL → http://localhost:8000/api/v1
  types.ts              ← ServiceListItem, ServiceDetail, ScannerScore, PillarBreakdown, Grade, ServiceType
  scoring.ts            ← PILLAR_WEIGHTS, PILLAR_LABELS, getGrade(), isStale(), hasDivergence()
  compare-store.ts      ← localStorage CRUD for compare set (key: "rr_compare_v1", max 4, type-locked)
```

Key patterns:
- Pages are server components by default; interactive shells are `"use client"` components
- Data fetching uses SWR (`useSWR`) — no direct fetch in components
- Compare set persists to `localStorage` and is type-locked to the first added service's `service_type`
- Frontend tests live in `frontend/tests/` (not colocated), use Jest + JSDOM + Testing Library

### Backend structure (`backend/app/`)

- `main.py` — FastAPI app, mounts `v1_router` at `/api/v1`
- `config.py` — Pydantic settings (reads `DATABASE_URL`)
- `db/models.py` — all SQLAlchemy ORM models; IDs are `{prefix}_{hex8}` strings (e.g. `svc_abc12345`)
- `db/session.py` — engine, `SessionLocal`, `get_db` FastAPI dependency
- `api/v1/` — routers: `scores.py` (submission), `services.py` (browse/detail), `scanners.py`, `methodology.py`
- `schemas/scores.py` — `ScoreSubmissionRequest` / `ScoreSubmissionResponse`
- `schemas/services.py` — `ServiceListItem`, `ServiceDetail`, `PillarBreakdown`, `ScannerScoreSummary`
- `services/scoring.py` — `PILLAR_WEIGHTS`, `compute_composite`, `validate_composite_tolerance`, `get_grade`, `aggregate_pillar_scores`
- `services/identity.py` — `match_service()` three-tier identity matching
- `services/keys.py` — argon2 API key generation (`generate_key`) and verification (`verify_key`)

Authentication: scanner API keys are verified in `scores.py:_authenticate_scanner` — iterates active scanners and calls `verify_key`. No JWT; key prefix `sk_<org>_XXXX…` is stored readable, full key is argon2-hashed.

### Database schema (class-table inheritance)

```
services                    ← anchor table for all service types
  service_models            ← ai_model details (engine_provider, platform_provider, model_name, model_version)
  service_mcp_servers       ← mcp_server details (target_service, provider_org, provider_tier, hosting_type)
  service_agents            ← stub only in v1
scores                      ← append-only; one row per submission (latest per scanner used at query time)
scanners                    ← api_key_hash (argon2), status (active|revoked)
identity_match_flags        ← async CSA review queue
methodology_versions        ← scoring weights; hardcoded v2.0.0 defaults used if no DB record
audit_log
```

Key invariants:
- Scores are **append-only** — resubmissions add a new row; public endpoints select the latest `created_at` per `(service_id, scanner_id)`.
- Aggregate scores (mean across scanners + weighted composite) are **computed at query time**, never stored.
- **Scores always publish immediately** — identity matching flags are created async and never block a submission.
- Scanner API keys are argon2-hashed; only the prefix (`sk_<org>_XXXX…`) is stored readable.

### Scoring model

Six pillars (weights): Transparency 16%, Reliability 16%, Security 20%, Privacy 16%, Safety & Societal Impacts 16%, Excessive Agency 16%.

Score range: 0–1000. Grades: A (900–1000), B (800–899), C (700–799), D (600–699), F (0–599).

Composite must be within 5% of weighted pillar sum (API returns 422 if violated).

Confidence index `C` = number of distinct scanners that have submitted for a service.

Stale rule: any score older than 90 days triggers a display indicator (no effect on grades).

Divergence indicator: shown when a scanner's pillar score differs from the aggregate by ≥ 100 points.

### Identity matching (three-tier)

When a scanner submits scores, the platform matches the submitted identity tuple to an existing service:

1. **High confidence** — `external_id` provided matches, or identity tuple is exact → auto-link, no review
2. **Medium confidence** — exactly one field mismatch → auto-link + flag for async CSA review
3. **No match** — 2+ fields differ or empty DB → auto-create new service + flag for CSA awareness

## Working Style

- Work directly on a feature branch in this repo — avoid git worktrees
- All implementation plans are in `docs/superpowers/plans/`
- Use `superpowers:subagent-driven-development` to execute plans task by task
- All backend tests run against a real PostgreSQL test database — no mocks (see `tests/conftest.py` transaction-rollback fixture pattern)
- Python formatter: Ruff (configured in devcontainer); format-on-save enabled
