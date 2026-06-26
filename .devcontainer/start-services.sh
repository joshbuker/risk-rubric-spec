#!/bin/bash
WORKSPACE=/workspaces/risk-rubric-spec

echo "==> Running database migrations..."
cd "$WORKSPACE/backend"
venv/bin/alembic upgrade head || echo "WARNING: migrations failed — check DB connectivity"

echo "==> Seeding database (skips existing records)..."
venv/bin/python scripts/seed.py || echo "WARNING: seed failed — check DB connectivity"

echo "==> Starting backend (FastAPI) on :8000..."
venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &

echo "==> Starting frontend (Next.js) on :3000..."
cd "$WORKSPACE/frontend"
exec npm run dev
