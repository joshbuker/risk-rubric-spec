# Risk Rubric v2 — Design Specification

**Status:** Draft for review  
**Author:** Josh Buker, Cloud Security Alliance  
**Date:** 2026-06-09  
**Repo:** `csa/risk-rubric-spec`

---

## 1. Overview

Risk Rubric v2 is a CSA-governed, multi-scanner risk rating platform for AI services. It replaces Risk Rubric v1, which supported a single scanner and only covered AI Models.

**What changes in v2:**

- Adds MCP Servers and AI Agents as scoreable service types
- Opens scoring to multiple independent scanner partners ("scanner pluralism")
- Aggregates scores from multiple scanners into a single public-facing composite score
- Introduces the Excessive Agency pillar (replaces Reputation from v1)

**What it produces:** A public-facing website where individuals and organizations can look up risk grades for AI services, compare them side-by-side, and understand which scanners contributed to each score.

---

## 2. Service Types

Three service types are in scope for v2:

| Type | Description | v2 status |
|------|-------------|-----------|
| AI Model | A foundational model accessed via API or through a hosting platform (e.g., Claude Sonnet 4.6 via Anthropic Direct API, GPT-4o via Azure OpenAI) | Full support |
| MCP Server | A Model Context Protocol server that exposes tools/resources to AI clients | Full support |
| AI Agent | An autonomous AI system combining models and tools | Schema stub only; no scoring UI in v1 |

A service is always a specific deployment, not just a model family. Claude Sonnet 4.6 on Direct API and Claude Sonnet 4.6 on AWS Bedrock are two separate services.

---

## 3. Scoring Model

### 3.1 Six Pillars

| Pillar | Weight | Notes |
|--------|--------|-------|
| Transparency | 16% | |
| Reliability | 16% | |
| Security | 20% | Highest weight |
| Privacy | 16% | |
| Safety & Societal Impacts | 16% | |
| Excessive Agency | 16% | New in v2; replaces Reputation |

### 3.2 Per-Pillar Score Formula

Scores use the resilience formula: `score = e^(-α·r) × 1000`, producing a 0–1000 range. Scanners submit raw pillar scores in this range.

### 3.3 Multi-Scanner Aggregation

When multiple scanners have submitted scores for a service, the platform computes:

1. **Per-pillar aggregate** = arithmetic mean of that pillar's score across all scanners
2. **Composite score** = weighted sum of per-pillar aggregates using the weights above

Arithmetic mean is used rather than weighted-by-scanner-trust to avoid privileging any scanner partner. All scanners are treated as equals.

### 3.4 Letter Grades

| Grade | Score range |
|-------|------------|
| A | 900–1000 |
| B | 800–899 |
| C | 700–799 |
| D | 600–699 |
| F | 0–599 |

### 3.5 Confidence Index

`C = count of distinct scanners that have submitted scores for this service`

Displayed alongside every grade. C=1 means one scanner; C=3 means three independent scanners contributed.

### 3.6 Submission Validation

The scanner API validates that the submitted composite score is within 5% of the weighted pillar sum. Submissions outside this tolerance are rejected with a 422 error. This catches scanners that compute pillars and composite independently and produce inconsistent numbers.

---

## 4. Service Identity & Matching

### 4.1 Why Identity Matching Is Needed

Scanners submit scores referencing services by an identity tuple, not by a platform-assigned ID. Two different scanners scoring the same service may use slightly different strings (e.g., `"Google"` vs `"Google LLC"`). The platform must decide whether these refer to the same service.

### 4.2 Identity Tuples

**AI Model identity tuple:**

| Field | Description |
|-------|-------------|
| `engine_provider` | Who trained/owns the model (e.g., Anthropic, OpenAI, Google) |
| `platform_provider` | Where it's accessed (nullable = Direct API; e.g., AWS Bedrock, Azure OpenAI, GCP Vertex AI) |
| `model_name` | Model family name (e.g., Claude Sonnet 4.6, GPT-4o) |
| `model_version` | Specific version string |

**MCP Server identity tuple:**

| Field | Description |
|-------|-------------|
| `target_service` | The service this MCP server wraps (e.g., gmail, slack, github) |
| `provider_org` | Organization that publishes the MCP server |
| `provider_tier` | ENUM: `official` / `platform_bundled` / `third_party` |
| `hosting_type` | `hosted` (v1 only); `self_hosted` stubbed in schema for future |

### 4.3 Three-Tier Matching

When a scanner submits scores, the platform attempts to match the identity tuple to an existing service:

| Tier | Condition | Action |
|------|-----------|--------|
| High confidence | Scanner provides a platform-assigned `external_id` that matches | Auto-link; no review needed |
| Medium confidence | Identity tuple matches an existing service on exactly one field mismatch (all other fields identical) | Auto-link AND flag for async CSA review |
| No match | No existing service matches, or 2+ fields differ | Auto-create new service record AND flag for CSA awareness |

**Scores always publish immediately.** CSA review is asynchronous and never blocks a scanner submission. This is a deliberate design choice: scanner partners should never be throttled by internal review queues.

### 4.4 CSA Review Actions (Identity Match Queue)

When a medium-confidence match is flagged, CSA staff can:

- **Accept** — merge the incoming submission into the existing service record
- **Reject** — keep them as separate service records

No partial editing during triage. If field values need correcting, that is done via the Edit action on the service detail screen.

---

## 5. Data Model

### 5.1 Class Table Inheritance

A thin `services` anchor table holds fields common to all service types. Type-specific detail tables extend it:

```
services (id, name, slug, service_type, created_at, updated_at)
  ├── service_models (service_id, engine_provider, platform_provider, model_name, model_version, ...)
  ├── service_mcp_servers (service_id, target_service, provider_org, provider_tier, hosting_type, ...)
  └── service_agents (service_id, ...) ← stub only in v1
```

This keeps cross-type queries simple (browse, search) while allowing type-specific identity tuple fields to be enforced with NOT NULL constraints in their own table.

### 5.2 Scores Table

```
scores (
  id,
  service_id  → services.id,
  scanner_id  → scanners.id,
  transparency_score, reliability_score, security_score,
  privacy_score, safety_societal_score, excessive_agency_score,
  composite_score,
  scored_at,
  UNIQUE(service_id, scanner_id)
)
```

`UNIQUE(service_id, scanner_id)` enforces one current score per scanner per service. When a scanner resubmits, the existing row is replaced (upsert). Historical scores are not retained in v1.

Aggregate scores (mean across scanners, weighted composite) are computed at query time — not stored. This ensures the aggregate is always fresh when a new scanner submission arrives.

### 5.3 Scanners Table

```
scanners (
  id,
  name,           -- display name, e.g. "RiskRubric scanner powered by PointGuard"
  org_name,       -- e.g. "PointGuard"
  api_key_hash,   -- argon2 hash; never store plaintext
  api_key_prefix, -- first 8 chars of key for display in admin (e.g. "sk_ptg_4f2a…")
  status,         -- active | revoked
  created_at,
  last_used_at
)
```

### 5.4 Stale Rule

A service's scores are considered stale when `scored_at < NOW() - 90 days` for any scanner. Stale state is display-only — it does not affect the score or grade. Stale indicators:

- Detail page: amber banner at top of page
- Browse table: `.stale-row` row styling
- Admin services table: amber ⚠ on the last-scored date

### 5.5 Divergence Rule

If any scanner's pillar score differs from the aggregate for that pillar by ≥ 100 points, the platform shows a divergence indicator on that scanner's block in the service detail expanded view. Display-only — does not affect aggregate calculation.

---

## 6. Scanner Submission API

### 6.1 Authentication

Scanners authenticate with a bearer token (`Authorization: Bearer sk_<partner>_<random>`). Keys are argon2-hashed at rest using `passlib[argon2]`. The full key is shown to the issuing admin exactly once at creation; only the prefix is stored readable.

Argon2 is used over bcrypt because it is the Password Hashing Competition winner and is memory-hard by design, making brute-force attacks more expensive.

### 6.2 Submission Endpoint

```
POST /api/v1/scores
Authorization: Bearer <api_key>
Content-Type: application/json
```

**Request body:**

```json
{
  "service": {
    "external_id": "optional-platform-id",
    "service_type": "ai_model",
    "identity": {
      "engine_provider": "Anthropic",
      "platform_provider": null,
      "model_name": "Claude Sonnet 4.6",
      "model_version": "20250514"
    }
  },
  "scores": {
    "transparency": 910,
    "reliability": 948,
    "security": 905,
    "privacy": 935,
    "safety_societal": 960,
    "excessive_agency": 905,
    "composite": 923
  },
  "evidence": [
    { "label": "Security audit report", "url": "https://example.com/audit.pdf" }
  ],
  "scored_at": "2026-06-01T00:00:00Z"
}
```

**Validation rules:**
- All six pillar scores required; each 0–1000
- Composite must be within 5% of the weighted pillar sum (422 if violated)
- `service_type` must be `ai_model`, `mcp_server`, or `agent`
- `scored_at` must not be in the future

**Response:**

```json
{
  "status": "accepted",
  "service_id": "svc_abc123",
  "match_tier": "high_confidence",
  "review_flagged": false
}
```

`match_tier` reflects the identity matching outcome. `review_flagged: true` indicates a medium-confidence match was auto-linked but queued for CSA review.

### 6.3 Scanner Attribution Display

On the public-facing site, scanner-contributed scores are attributed as:

- Single scanner: `"RiskRubric scanner powered by PointGuard"`
- Multiple scanners: aggregate score shown by default; expandable per-scanner breakdown available on the detail page

---

## 7. Read-Only MCP Server

The platform exposes a read-only MCP server so AI assistants can query Risk Rubric data. It is public — no authentication required.

**Transport:** stdio (primary) + HTTP (secondary)  
**Tools:**

| Tool | Description |
|------|-------------|
| `search_services` | Search by name, type, provider |
| `get_service_score` | Get full score breakdown for a service by ID or name |
| `compare_services` | Get scores for 2–4 services side by side |
| `list_scanners` | List active scanner partners and their submission counts |

No write tools are exposed. The MCP server is a read-only projection of the public data.

---

## 8. Frontend Pages

All pages are built in Next.js. The browse and detail pages are fully public (no login required).

### 8.1 Browse Page

Compact table: one row per service. Columns: Service | Transparency | Reliability | Security | Privacy | Safety & Societal Impacts | Excessive Agency | Score | Confidence | Actions.

Per-pillar columns show a letter grade badge (A–F, color-coded). Composite Score column shows numeric score. Confidence column shows `C=N`.

**Tabs:** 🧠 AI Models / 🔌 MCP Servers (separate tabs; counts shown on each tab label).

**Sidebar filters (AI Models tab):** Grade, Confidence, Engine Provider, Platform Provider, Min Pillar Score (per pillar), Modalities.  
**Sidebar filters (MCP Servers tab):** Grade, Confidence, Target Service, Provider Tier.

Stale rows get `.stale-row` styling. Each row has an "+ Add to Compare" action.

### 8.2 Service Detail Page

**Hero section:** Service name, type chip, composite grade (large letter), composite numeric score, confidence count. Stale banner shown when any score is >90 days old.

**Pillar breakdown:** One row per pillar showing grade badge + progress bar + numeric score + weight label.

**Scanner breakdown:** One collapsible block per scanner. Collapsed state shows scanner name, submission date, composite from that scanner. Expanded state shows per-pillar scores + evidence links. Divergence chip (↕ Diverges) shown on a scanner block when any of its pillar scores differs from the aggregate by ≥100 points. A warning callout is shown inside the expanded view for that pillar.

**Bottom CTA bar:** Back to Browse + Add to Compare.

### 8.3 Compare Page

Side-by-side comparison of 2–4 services. Layout: fixed label column (pillar names) + one column per service + an "+ Add service" column (shown until max of 4 is reached).

**Service header card:** Type chip, service name, provider, composite grade (large), composite score, confidence. Stale chip shown if applicable. × remove button.

**Pillar rows:** Grade badge + numeric score + mini bar per service per pillar. Best score per row highlighted green (▲ Best). Lowest score per row highlighted red (▼ Low).

**Type lock:** The comparison set is locked to one service type. The first service added sets the type; subsequent "+ Add service" flows only show services of that type. Type chip shown in page header.

**Bottom bar:** Back to Browse, Export CSV, Share comparison.

### 8.4 Admin Interface

CSA staff only. Auth: JWT in prototype; Auth0 in production.

**Sidebar navigation:**
- Catalog: Services, Scanners
- Review Queue: Identity Matches (badge shows pending count)
- Access: API Keys, Staff Users

**Services tab:** Searchable/filterable table. Filters: type, grade, status (active / stale / no scores). Actions per row: Edit (identity fields, service metadata), Scores (view score history).

**Scanners tab:** One card per scanner partner showing org name, submission count, last submission date, status. Actions: Edit display name, Revoke (irreversible).

**Identity Matches tab:** Triage queue. Each card shows incoming tuple vs. candidate existing service side by side, with differing fields highlighted amber. Actions: Accept (merge into existing) / Reject (keep as separate service). Annotation confirms scores are already live — this is async cleanup only.

**API Keys tab:** Table of issued keys with prefix, issue date, last-used date, submission count, status. Action: Revoke. New key issuance shows full key once and never again. Keys are argon2-hashed at rest.

---

## 9. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js |
| Backend API | Python / FastAPI |
| Database | PostgreSQL |
| Cache | Redis |
| Auth (admin prototype) | JWT |
| Auth (admin production) | Auth0 |
| API key hashing | argon2 via `passlib[argon2]` |
| MCP server | Python SDK, stdio + HTTP transport |

---

## 10. Timeline

| Milestone | Target |
|-----------|--------|
| Concept paper + pilot | Q2 2026 |
| First assessments live | Q3 2026 |
| CSA STAR Registry integration | Q1 2027 |

---

## 11. Out of Scope for v1

- AI Agents scoring (schema stub only)
- Self-hosted MCP Servers (schema stubbed; no scoring UI)
- Historical score retention (only current score per scanner per service)
- Scanner trust weighting (all scanners are equal)
- STAR Registry integration
