#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# Philly Dashboard — VPS deploy script
# Safe to run repeatedly; idempotent where it matters.
#
# Usage on the server:
#     chmod +x deploy/deploy.sh
#     ./deploy/deploy.sh              # production deploy from current checkout
#     BRANCH=staging ./deploy/deploy.sh
#
# Exits non-zero on any failure so PM2/CI can detect.
# ────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ───────────────────────────────────────────────────────
APP_NAME="${APP_NAME:-philly-dashboard}"
BRANCH="${BRANCH:-main}"
SKIP_PULL="${SKIP_PULL:-0}"
SKIP_MIGRATE="${SKIP_MIGRATE:-0}"

cd "$(dirname "$0")/.."   # cd to project root regardless of invocation dir
PROJECT_DIR="$(pwd)"

# ── Helpers ──────────────────────────────────────────────────────
log()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[1;32m✓\033[0m %s\n' "$*"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

# ── Preconditions ────────────────────────────────────────────────
log "Checking environment"
require_cmd node
require_cmd npm
require_cmd git
[[ -f .env.local || -f .env ]] || fail ".env.local or .env missing — copy from .env.example and fill in"
ok "Node $(node -v), npm $(npm -v), git present"

# ── Pull latest ──────────────────────────────────────────────────
if [[ "$SKIP_PULL" != "1" ]]; then
  log "Pulling branch '$BRANCH'"
  git fetch --all --prune
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
  ok "Now on $(git rev-parse --short HEAD) ($(git log -1 --pretty=%s))"
else
  log "Skipping git pull (SKIP_PULL=1)"
fi

# ── Dependencies ────────────────────────────────────────────────
log "Installing dependencies (npm ci)"
npm ci --omit=optional
ok "Dependencies installed"

# ── DB: generate + migrate ──────────────────────────────────────
if [[ "$SKIP_MIGRATE" != "1" ]]; then
  log "Generating Prisma client"
  npm run db:generate
  ok "Prisma client generated"

  # Apply pending migrations. On a fresh DB this runs 0_init + any
  # subsequent migrations in order. On an existing (baselined) DB
  # this applies only new migrations.
  #
  # NOTE: first-time baselining of an existing non-empty DB requires
  # one-time `prisma migrate resolve --applied 0_init` — see
  # docs/prisma-migrations.md for the procedure.
  log "Applying Prisma migrations"
  npm run db:migrate
  ok "Migrations applied"
else
  log "Skipping db migration (SKIP_MIGRATE=1)"
fi

# ── Preflight ───────────────────────────────────────────────────
log "Running preflight checks"
NODE_ENV=production npm run preflight
ok "Preflight passed"

# ── Build ───────────────────────────────────────────────────────
log "Building production bundle"
NODE_ENV=production npm run build
ok "Build succeeded"

# ── Ensure logs dir ─────────────────────────────────────────────
mkdir -p "$PROJECT_DIR/logs"

# ── Start or reload via PM2 ─────────────────────────────────────
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    log "Reloading PM2 process (zero-downtime)"
    pm2 reload "$APP_NAME" --update-env
  else
    log "Starting PM2 process for the first time"
    pm2 start ecosystem.config.js --env production
    pm2 save
    printf '\n  To auto-start on reboot, run once: \033[1;33mpm2 startup\033[0m\n  and execute the command it prints.\n'
  fi
  ok "PM2 process '$APP_NAME' is running"
  pm2 describe "$APP_NAME" | head -n 25
else
  printf '  \033[1;33m!\033[0m PM2 not installed — skipping process restart.\n'
  printf '    Install: \033[1;33mnpm install -g pm2\033[0m\n'
fi

# ── Smoke test ──────────────────────────────────────────────────
log "Smoke test: GET /api/health"
sleep 3   # give Node a moment to bind the port
if curl --fail --silent --show-error --max-time 5 "http://127.0.0.1:${PORT:-3100}/api/health" >/dev/null 2>&1; then
  ok "Health check passed"
else
  printf '  \033[1;33m!\033[0m Health check did not respond on port %s.\n' "${PORT:-3100}"
  printf '    Check \033[1;33mpm2 logs %s\033[0m for details.\n' "$APP_NAME"
fi

printf '\n\033[1;32m✓ Deploy complete.\033[0m\n\n'
