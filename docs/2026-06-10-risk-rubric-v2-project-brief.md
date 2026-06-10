# Risk Rubric v2 — Project Brief

**Date:** June 10, 2026
**Author:** Josh Buker, Cloud Security Alliance
**Audience:** Marketing, Development
**Purpose:** Pre-build alignment — what we are building, why, and what it will look like

---

## What Is Risk Rubric?

Risk Rubric is CSA's public platform for independent risk ratings of AI services. It answers a question that enterprises and developers increasingly need answered before deploying AI: *how risky is this model, server, or agent — and who says so?*

The platform publishes letter grades (A through F) and numeric scores for AI services, based on assessments submitted by independent scanning partners. Think of it as a credit rating agency for AI risk — CSA governs the methodology, independent partners do the assessments, and the public gets a clear, trustworthy answer.

**Version 2 makes three major advances over v1:**

1. Expands coverage from AI Models only to **AI Models, MCP Servers, and AI Agents**
2. Opens the scoring ecosystem to **multiple independent scanning partners** — no single organization controls the ratings
3. Introduces the **Excessive Agency pillar**, covering risks specific to agentic AI systems

---

## The Problem It Solves

Organizations adopting AI face a trust deficit. There is no independent, not-for-profit body publishing standardized risk grades for the AI services they are being asked to use. Vendor self-assessments exist, but they are not independent. Internal security reviews exist, but they require expertise most teams don't have.

Risk Rubric fills that gap. CSA's neutrality — as a non-profit standards body — is the foundation of its credibility. The multi-scanner model strengthens that credibility further: when three independent firms score a service similarly, the rating carries real weight. When they disagree, users can see why.

---

## Who It's For

**Primary audience:** Security professionals, procurement teams, and developers at organizations evaluating or deploying AI services.

**Secondary audience:** AI service providers who want a public, credible risk grade to demonstrate responsible AI practices to their customers.

**Scanner partners:** Independent security firms (initially PointGuard, Deloitte, and Tumeryk) who submit conformant assessments through the scanner API.

---

## The Six Evaluation Pillars

Every AI service is scored across six pillars. These are the same pillars whether the service is a model, an MCP server, or an agent — though what each pillar measures in practice differs by service type.

| Pillar | Weight | What It Measures |
|--------|--------|-----------------|
| Transparency | 16% | Documentation, disclosure, and auditability of the service |
| Reliability | 16% | Consistency, uptime, and behavioral stability |
| Security | **20%** | Resistance to adversarial attacks, data exposure, and misuse |
| Privacy | 16% | Data handling, retention, and user privacy protections |
| Safety & Societal Impacts | 16% | Harm potential, bias, and broader societal risk |
| Excessive Agency | 16% | Risk of unauthorized actions, scope creep, and loss of human control |

Security carries the highest weight (20%) because it has the most direct and immediate enterprise risk implications. All other pillars are equal at 16%.

**Excessive Agency is new in v2.** It addresses risks specific to agentic systems — models and servers that can take actions on behalf of users, not just generate text. This pillar has no equivalent in v1.

---

## How Scoring Works

Each pillar is scored from 0 to 1000, where 1000 is the safest possible outcome. Scanners submit these scores, along with evidence links and a declared assessment date.

**When multiple scanners have assessed a service**, the platform takes the arithmetic mean of each pillar across all scanners, then computes the composite as a weighted sum. No scanner is trusted more than any other — all assessments are treated as equal.

**Composite scores map to letter grades:**

| Grade | Score Range | Meaning |
|-------|-------------|---------|
| A | 900 – 1000 | Excellent — low risk across all pillars |
| B | 800 – 899 | Good — minor concerns in some areas |
| C | 700 – 799 | Acceptable — notable risks present |
| D | 600 – 699 | Poor — significant risk, remediation recommended |
| F | 0 – 599 | Failing — not recommended for deployment |

**Confidence Index (C=N):** Every score includes a confidence indicator showing how many independent scanners contributed. A service with C=3 has been assessed by three independent firms; a service with C=1 has been assessed by one. Higher confidence means more credible ratings.

**Divergence:** When two scanners produce scores that differ significantly on the same pillar (≥100 points), the platform flags this on the service detail page. Divergence is informational — it shows users where the assessors disagree and why additional scrutiny might be warranted.

**Staleness:** Scores older than 90 days are marked stale. AI services evolve quickly; an 18-month-old assessment may not reflect the current risk profile.

---

## The Scanner Ecosystem

Scanners are independent security firms that submit assessments through the Risk Rubric API. They must:

- Declare which methodology version they are assessing against
- Submit scores for all six pillars, along with evidence links
- Disclose any conflicts of interest with the service they are scoring
- Pass CSA's conformance review before their scores count toward public ratings

On the public platform, scanner attribution works as follows:
- **Single scanner:** "RiskRubric scanner powered by PointGuard"
- **Multiple scanners:** The aggregate score is shown by default, with an expandable breakdown by scanner available on the service detail page

**Launch scanners:** PointGuard, Deloitte, and Tumeryk. All three cover AI Models; PointGuard covers all three service types; Tumeryk covers Models and Agents.

---

## What We Are Building

### Public Website

**Browse Page**
The main landing experience. A tabbed table (AI Models / MCP Servers) showing all rated services. Each row shows per-pillar grade badges, a composite score, and a confidence indicator. Sidebar filters let users narrow by grade, provider, confidence level, and pillar score thresholds. Stale services are visually marked. Any service can be added to a comparison set directly from this view.

*Wireframe:* `docs/wireframes/browse.html`

**Service Detail Page**
The full picture for a single service. A hero section shows the composite grade, numeric score, and confidence count — with a stale banner if applicable. Below that, a per-pillar breakdown shows grade badges, progress bars, and scores. An expandable scanner section shows each scanner's individual assessment, evidence links, and divergence warnings where relevant.

*Wireframe:* `docs/wireframes/detail.html`

**Compare Page**
Side-by-side comparison of 2–4 services of the same type. Services are arranged in columns with pillar scores in rows. The best score in each pillar row is highlighted green; the lowest is highlighted red. The comparison set persists across navigation and is accessible via a persistent "Add to Compare" action throughout the site.

*Wireframe:* `docs/wireframes/compare.html`

### Admin Interface (CSA Staff Only)

An internal dashboard for CSA staff to manage the platform. Four sections:

- **Services** — search, filter, and edit service identity records
- **Identity Match Queue** — triage queue for scanner submissions that couldn't be automatically matched to an existing service. CSA staff accept (merge) or reject (keep separate) each flagged submission
- **Scanners** — view scanner partners, manage conformance status, revoke access
- **API Keys** — issue new scanner API keys (shown once, never again) and revoke existing ones

*Wireframe:* `docs/wireframes/admin.html`

### Scanner Submission API

A REST endpoint (`POST /api/v1/scores`) that scanner partners use to submit assessments. Authentication is via a per-scanner API key. Scores publish immediately — there is no CSA review gate on publication. The identity match queue is for data hygiene only and runs asynchronously.

*Wireframe/reference:* `docs/wireframes/scanner-api.html`

### Read-Only MCP Server

A public MCP server that allows AI assistants (such as Claude) to query Risk Rubric data directly. Exposes four tools: search services, get a service's full score breakdown, compare multiple services side by side, and list active scanner partners. No authentication required — this is public read-only data.

---

## Technical Approach (Summary for Dev)

| Layer | Technology |
|-------|------------|
| Public frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend API | Python 3.12, FastAPI, SQLAlchemy 2.x |
| Database | PostgreSQL 16 |
| Cache | Redis |
| Admin auth (prototype) | Shared-secret JWT |
| Admin auth (production) | Auth0 |
| Scanner API key hashing | argon2 via `passlib[argon2]` |
| MCP server | Python, FastMCP (official MCP SDK) |

**Data model highlights:**
- Services use class-table inheritance: a thin `services` anchor table plus type-specific tables for models and MCP servers
- Scores are append-only (every submission is a new row; public endpoints always use the latest per scanner)
- Multi-scanner aggregate is computed at query time from the latest score per scanner — never stored
- Scanner keys are argon2-hashed; the plaintext key is shown to the issuing admin exactly once

**Three implementation plans are ready**, covering backend, public frontend, and admin + MCP server, in that order. Plans live in `docs/superpowers/plans/`.

---

## Timeline

| Milestone | Date | Status |
|-----------|------|--------|
| Concept paper published | June 8, 2026 | ✅ Done |
| Design spec and wireframes complete | June 10, 2026 | ✅ Done |
| **Initial platform launch** | **August 4, 2026** | In progress |
| CSA STAR Registry integration | Q1 2027 | Planned |

The August 4 target is timed to coincide with Black Hat and DEF CON, which represent the highest-concentration audience of security professionals who are the platform's primary users.

---

## What Is Out of Scope for Launch

The following are intentionally deferred to keep the August 4 deadline achievable:

- **AI Agents scoring** — the schema is stubbed, but no scoring UI or scanner coverage at launch
- **Self-hosted MCP servers** — schema stubbed; only hosted MCP servers are scored at launch
- **Historical score retention** — each scanner's latest submission replaces the previous one for display purposes; raw history is stored but not surfaced
- **Scanner trust weighting** — all conformant scanners are treated as equals; no weighted scoring by scanner reputation
- **STAR Registry integration** — planned Q1 2027

---

## Reference Documents

| Document | Location |
|----------|----------|
| Concept paper | `docs/Risk Rubric v2 Concept Paper.md` |
| Scoring methodology | `docs/Risk Rubric v2 Scoring Methodology.md` |
| Full design specification | `docs/specs/2026-06-09-risk-rubric-v2-design.md` |
| Browse page wireframe | `docs/wireframes/browse.html` |
| Service detail wireframe | `docs/wireframes/detail.html` |
| Compare page wireframe | `docs/wireframes/compare.html` |
| Admin interface wireframe | `docs/wireframes/admin.html` |
| Scanner API reference | `docs/wireframes/scanner-api.html` |
| Backend implementation plan | `docs/superpowers/plans/2026-06-10-risk-rubric-v2-backend.md` |
| Frontend implementation plan | `docs/superpowers/plans/2026-06-10-risk-rubric-v2-frontend.md` |
| Admin + MCP implementation plan | `docs/superpowers/plans/2026-06-10-risk-rubric-v2-admin-mcp.md` |
