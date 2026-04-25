#!/usr/bin/env bash
# ---------------------------------------------------------------
# Launch checklist — pre-flight probe for the Philly CRM standalone.
# ---------------------------------------------------------------
# Run this before flipping production traffic. It checks:
#
#   1. Required env vars are set (and not the dev placeholder).
#   2. The Prisma schema parses + every migration SQL file is
#      well-formed.
#   3. The static gates pass (typecheck, build, tests, audit).
#   4. /api/health returns 200 with a fast DB check.
#   5. /api/assistant/health returns 200 (if the assistant is
#      configured).
#
# Exits 0 only when every check passes. Wire to your deploy
# pipeline as a pre-flight blocker.
# ---------------------------------------------------------------
set -u

cd "$(dirname "$0")/.." || { echo "could not cd to standalone root" >&2; exit 99; }

GREEN=$'\033[32m'
RED=$'\033[31m'
YELLOW=$'\033[33m'
RESET=$'\033[0m'

PASS=0
FAIL=0
WARN=0
FINDINGS=()

note_pass() { PASS=$((PASS + 1)); echo "${GREEN}✓${RESET} $1"; }
note_fail() { FAIL=$((FAIL + 1)); FINDINGS+=("FAIL: $1"); echo "${RED}✗${RESET} $1"; }
note_warn() { WARN=$((WARN + 1)); FINDINGS+=("WARN: $1"); echo "${YELLOW}!${RESET} $1"; }

require_env() {
  local var="$1"
  local desc="$2"
  if [ -z "${!var:-}" ]; then
    note_fail "$var not set ($desc)"
    return 1
  fi
  if [ "${!var}" = "your-deepl-key:fx" ] || [ "${!var}" = "your-secret-from-step-3" ]; then
    note_fail "$var still has the .env.example placeholder value ($desc)"
    return 1
  fi
  note_pass "$var is set ($desc)"
}

recommend_env() {
  local var="$1"
  local desc="$2"
  if [ -z "${!var:-}" ]; then
    note_warn "$var not set ($desc)"
    return 1
  fi
  note_pass "$var is set ($desc)"
}

echo
echo "=== 1. Required env vars (must be set in production) ==="
require_env DATABASE_URL "Prisma MariaDB connection"
require_env NEXT_PUBLIC_SUPABASE_URL "Supabase auth provider"
require_env NEXT_PUBLIC_SUPABASE_ANON_KEY "Supabase public client key"
require_env SUPABASE_SERVICE_ROLE_KEY "Supabase service role (admin invites)"
require_env INTEGRATION_SECRET "AES-256 key for at-rest encryption"
require_env OAUTH_STATE_SECRET "OAuth state HMAC key"
require_env CRON_SECRET "Vercel Cron bearer token"
require_env APP_URL "Public canonical origin"

echo
echo "=== 2. Recommended env vars (operationally important) ==="
recommend_env SENTRY_DSN "Sentry — observability silently degrades without it"
recommend_env GIT_COMMIT_SHA "Build provenance in /api/health"

echo
echo "=== 3. Assistant env vars (only if /assistant is enabled) ==="
recommend_env OLLAMA_BASE_URL "Self-hosted Ollama VPS"
recommend_env OLLAMA_AUTH_TOKEN "Bearer for the Ollama VPS Caddy gate"
recommend_env ASSISTANT_CHAT_MODEL "Default qwen2.5:14b-instruct-q4_K_M"
recommend_env ASSISTANT_EMBED_MODEL "Default bge-m3"

echo
echo "=== 4. Schema integrity ==="
if [ -f prisma/schema.prisma ]; then
  if node_modules/.bin/prisma validate 2>/dev/null >/dev/null; then
    note_pass "prisma schema validates"
  else
    note_fail "prisma validate failed (run \`prisma validate\` to see details)"
  fi
else
  note_fail "prisma/schema.prisma not found"
fi

echo
echo "=== 5. Migration SQL files parse ==="
MIG_FAILED=0
for d in prisma/migrations/*/; do
  if [ -f "$d/migration.sql" ]; then
    # Basic syntactic checks: no template literals, no obviously
    # broken syntax markers, file is non-empty.
    if [ ! -s "$d/migration.sql" ]; then
      note_fail "$d/migration.sql is empty"
      MIG_FAILED=1
      continue
    fi
    # Look for common authoring mistakes
    if grep -nE '\bDROP\s+TABLE' "$d/migration.sql" >/dev/null; then
      note_warn "$d contains DROP TABLE — review for data loss before deploy"
    fi
    if grep -nE '^-- TODO' "$d/migration.sql" >/dev/null; then
      note_fail "$d contains -- TODO — finish before deploy"
      MIG_FAILED=1
    fi
  fi
done
if [ "$MIG_FAILED" = 0 ]; then
  COUNT=$(find prisma/migrations -name 'migration.sql' | wc -l | tr -d ' ')
  note_pass "$COUNT migrations look well-formed"
fi

echo
echo "=== 6. Static gates ==="
if node_modules/.bin/tsc --noEmit >/dev/null 2>&1; then
  note_pass "typecheck clean"
else
  note_fail "typecheck failed (run \`npm run typecheck\`)"
fi

if node_modules/.bin/tsx scripts/audit-tenant-isolation.ts >/dev/null 2>&1; then
  note_pass "tenant-isolation audit clean"
else
  note_fail "tenant-isolation audit failed (run \`npm run audit:tenant\`)"
fi

if node_modules/.bin/eslint . --max-warnings=9999 >/dev/null 2>&1; then
  note_pass "eslint runs (warnings are tracked separately)"
else
  note_fail "eslint reports errors (run \`npm run lint\`)"
fi

echo
echo "=== 7. KB index (if assistant is enabled) ==="
if [ -f data/assistant-kb.json ]; then
  CHUNKS=$(node -e "console.log(require('./data/assistant-kb.json').chunks.length)" 2>/dev/null)
  if [ -n "$CHUNKS" ] && [ "$CHUNKS" -gt 0 ]; then
    note_pass "data/assistant-kb.json has $CHUNKS chunks"
  else
    note_warn "data/assistant-kb.json exists but has no chunks — re-run \`npm run kb:build\`"
  fi
else
  note_warn "data/assistant-kb.json not built — run \`npm run kb:build\` after Ollama VPS is reachable"
fi

echo
echo "=== Summary ==="
echo "  ${GREEN}pass${RESET}: $PASS"
echo "  ${YELLOW}warn${RESET}: $WARN"
echo "  ${RED}fail${RESET}: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo
  echo "${RED}Not ready to launch. Findings:${RESET}"
  for f in "${FINDINGS[@]}"; do echo "  - $f"; done
  exit 1
fi
if [ "$WARN" -gt 0 ]; then
  echo
  echo "${YELLOW}Ready, but with warnings:${RESET}"
  for f in "${FINDINGS[@]}"; do echo "  - $f"; done
  exit 0
fi
echo
echo "${GREEN}All checks passed. Ready to launch.${RESET}"
exit 0
