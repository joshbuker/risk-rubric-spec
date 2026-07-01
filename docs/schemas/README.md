# CSA Risk Rubric — Score Submission Schemas

This directory contains the annotated YAML schemas for submitting scanner scores to the CSA Risk Rubric platform. These schemas define the request bodies for the score submission API endpoints.

## Files

| File | Purpose |
|------|---------|
| `schemas/ai-model-submission.yaml` | Schema for submitting scores for an AI model |
| `schemas/mcp-server-submission.yaml` | Schema for submitting scores for an MCP server |
| `examples/ai-model-submission.yaml` | Filled-in example (Claude Sonnet 4.6 via Anthropic) |
| `examples/mcp-server-submission.yaml` | Filled-in example (official GitHub MCP server) |

## API Endpoints

| Service type | Endpoint |
|---|---|
| AI model | `POST /api/v1/scores/ai-model` |
| MCP server | `POST /api/v1/scores/mcp-server` |

**Authentication:** all submission endpoints require a scanner API key passed as a Bearer token:

```
Authorization: Bearer sk_<org>_XXXXXXXX...
```

Contact CSA to obtain a scanner key.

## Scoring Model

All six pillar scores and the composite are integers in the range **0–1000** (inclusive, higher is better).

| Pillar | Weight |
|---|---|
| Transparency | 16% |
| Reliability | 16% |
| Security | 20% |
| Privacy | 16% |
| Safety & Societal Impacts | 16% |
| Excessive Agency | 16% |

**Composite validation:** the submitted `composite` value must be within **5%** of the value computed by the platform from the weighted pillar scores. Submissions that exceed this tolerance are rejected with HTTP 422.

**Grades** derived from the composite score:

| Grade | Range |
|---|---|
| A | 900–1000 |
| B | 800–899 |
| C | 700–799 |
| D | 600–699 |
| F | 0–599 |

## Identity Matching

When a score is submitted, the platform attempts to match the identity fields to an existing service record:

- **High confidence** — `external_id` matches an existing record, or all identity fields match exactly → auto-linked, no review needed.
- **Medium confidence** — exactly one identity field differs → auto-linked and flagged for async CSA review.
- **No match** — two or more fields differ, or the DB has no record → a new service record is created and flagged for CSA awareness.

Providing a stable `external_id` (your organization's internal identifier for the service) bypasses fuzzy matching entirely and is recommended for automated pipelines.

## Common Fields (both schemas)

Both schemas share the following top-level fields:

| Field | Required | Description |
|---|---|---|
| `external_id` | No | Your org's internal ID for this service. Bypasses identity fuzzy-matching when provided. |
| `identity` | Yes | Service-type-specific identity tuple (see below). |
| `scores` | Yes | Six pillar scores + composite (all integers 0–1000). |
| `evidence` | No | List of `{label, url}` artifacts backing the scores. |
| `scored_at` | Yes | ISO 8601 datetime of when the assessment was performed (not when the request is sent). Must not be in the future. |
| `coi_disclosed` | Yes | `true` if your organization has a material relationship with the assessed provider. Disclosure does not block submission. |
| `report_url` | Yes | Permanent URL to the full human-readable assessment report. |

## Identity Fields by Service Type

### AI Model (`ai-model-submission.yaml`)

| Field | Description |
|---|---|
| `engine_provider` | Organization that trained the base model (e.g. `"Anthropic"`, `"OpenAI"`). |
| `platform_provider` | Platform through which the model is accessed, if different from the engine provider (e.g. `"AWS Bedrock"`). Null when accessed directly. |
| `model_name` | Model family or product name as published by the provider (e.g. `"Claude Sonnet 4.6"`). |
| `model_version` | Provider's canonical version identifier (e.g. `"20250514"`). |

### MCP Server (`mcp-server-submission.yaml`)

| Field | Type | Description |
|---|---|---|
| `target_service` | string | The external service the MCP server wraps (e.g. `"GitHub"`, `"Slack"`). |
| `provider_org` | string | The organization that builds and maintains this MCP server. |
| `provider_tier` | enum | `official` / `platform_bundled` / `third_party` — relationship between the provider and the target service. |
| `hosting_type` | enum | `hosted` (provider-managed) or `self_hosted` (user-run). |

## Stale and Divergence Indicators

These are display-only indicators computed by the platform — they do not affect grades and require no action from scanners:

- **Stale** — any score older than 90 days surfaces a stale indicator on the public profile.
- **Divergence** — shown when a scanner's pillar score differs from the aggregate by ≥ 100 points.

## Feedback and Questions

To propose changes to these schemas, push directly to `main`. If you would like to discuss the changes first, please open a pull request or email Josh Buker at [jbuker@cloudsecurityalliance.org](mailto:jbuker@cloudsecurityalliance.org).
