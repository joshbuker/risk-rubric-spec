# Risk Rubric Spec — Claude Instructions

## Environment

**Primary dev environment: VS Code devcontainer** (`.devcontainer/`).

Inside the devcontainer, `python`, `node`, `psql`, `pip`, `npm` etc. are all on PATH — no special setup needed. PostgreSQL runs as a sidecar container and is reachable at host `db`, port `5432`. Both `risk_rubric` and `risk_rubric_test` databases are created automatically on first container start.

Environment variables available inside the container:
- `DATABASE_URL=postgresql://postgres:postgres@db:5432/risk_rubric`
- `TEST_DATABASE_URL=postgresql://postgres:postgres@db:5432/risk_rubric_test`

**Fallback: NixOS shell.nix** — the host machine runs NixOS. If working outside the devcontainer, tools must be declared in `shell.nix` to be on PATH. If a tool is missing, add it to `shell.nix` and ask the user to restart Claude Code.

## Working Style

- Work directly on a feature branch in this repo — avoid git worktrees
- All implementation plans are in `docs/superpowers/plans/`
- Use `superpowers:subagent-driven-development` to execute plans task by task
