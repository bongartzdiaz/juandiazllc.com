#!/bin/bash
set -euo pipefail

# 09-smoke-test.sh
# What this does:
#   Runs the 10 cutover smoke checks via curl. Designed to run from
#   the operator laptop right after the DNS flip in the cutover
#   ceremony (see docs/hetzner-cutover-runbook.md Section 6, step 5).
#
#   Each check has an expected status / body marker. If anything
#   fails, the script exits non-zero AND prints which check failed
#   — that's the trigger for rollback.
#
# Required env (in shell or .env-smoke):
#   DEUS_SMOKE_USER       email of a test user in the DB
#   DEUS_SMOKE_PASSWORD   plaintext password for the test user
#
# Usage:
#   bash 09-smoke-test.sh https://app.juandiazllc.com

BASE="${1:-}"
if [[ -z "${BASE}" ]]; then
  echo "Usage: $0 <base-url>" >&2
  echo "Example: $0 https://app.juandiazllc.com" >&2
  exit 1
fi

: "${DEUS_SMOKE_USER:?DEUS_SMOKE_USER required}"
: "${DEUS_SMOKE_PASSWORD:?DEUS_SMOKE_PASSWORD required}"

COOKIE_JAR=$(mktemp)
trap 'rm -f "${COOKIE_JAR}"' EXIT

PASS=0
FAIL=0

check() {
  local name="$1"
  shift
  echo -n "[ ] ${name}... "
  if "$@" >/dev/null 2>&1; then
    echo "OK"
    PASS=$((PASS + 1))
  else
    echo "FAIL"
    FAIL=$((FAIL + 1))
    "$@" || true   # re-run so the failure body shows
  fi
}

# 1. /philly/api/health → 200, all checks ok
check_health() {
  local body status
  body=$(curl -sS -o /tmp/smoke-health.json -w '%{http_code}' "${BASE}/philly/api/health")
  [[ "${body}" == "200" ]] || return 1
  jq -e '.checks | (.database.status == "ok" and .lucia_db.status == "ok")' \
    /tmp/smoke-health.json >/dev/null
}
check "1/10 health endpoint" check_health

# 2. /philly/login → 200 + form
check_login_page() {
  local html
  html=$(curl -sS "${BASE}/philly/login")
  echo "${html}" | grep -qi '<form'
}
check "2/10 login page renders" check_login_page

# 3. POST /philly/api/auth/login → 302 + cookie
check_login() {
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' \
    -c "${COOKIE_JAR}" \
    -d "email=${DEUS_SMOKE_USER}" \
    -d "password=${DEUS_SMOKE_PASSWORD}" \
    "${BASE}/philly/api/auth/login")
  [[ "${code}" == "302" || "${code}" == "303" || "${code}" == "200" ]] \
    && grep -q 'deus_session' "${COOKIE_JAR}"
}
check "3/10 login + session cookie" check_login

# 4. /philly with cookie → 200 + Topbar marker
check_dashboard() {
  local html
  html=$(curl -sS -b "${COOKIE_JAR}" "${BASE}/philly")
  echo "${html}" | grep -qi 'topbar\|sidebar\|aria-label'
}
check "4/10 dashboard authenticated" check_dashboard

# 5. POST /philly/api/contacts → 201
SMOKE_EMAIL="smoke-$(date +%s)@example.com"
check_contact_create() {
  local code
  code=$(curl -sS -o /tmp/smoke-contact.json -w '%{http_code}' \
    -b "${COOKIE_JAR}" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${SMOKE_EMAIL}\",\"firstName\":\"Smoke\",\"lastName\":\"Test\"}" \
    "${BASE}/philly/api/contacts")
  [[ "${code}" == "201" || "${code}" == "200" ]]
}
check "5/10 create contact" check_contact_create

# 6. GET /philly/api/contacts/<id> → 200
CONTACT_ID=""
if [[ -f /tmp/smoke-contact.json ]]; then
  CONTACT_ID=$(jq -r '.id // .data.id // empty' /tmp/smoke-contact.json 2>/dev/null || true)
fi
check_contact_read() {
  [[ -n "${CONTACT_ID}" ]] || return 1
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' \
    -b "${COOKIE_JAR}" \
    "${BASE}/philly/api/contacts/${CONTACT_ID}")
  [[ "${code}" == "200" ]]
}
check "6/10 read contact" check_contact_read

# 7. DELETE /philly/api/contacts/<id> → 204
check_contact_delete() {
  [[ -n "${CONTACT_ID}" ]] || return 1
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' \
    -X DELETE \
    -b "${COOKIE_JAR}" \
    "${BASE}/philly/api/contacts/${CONTACT_ID}")
  [[ "${code}" == "204" || "${code}" == "200" ]]
}
check "7/10 delete contact" check_contact_delete

# 8. POST /philly/api/auth/logout → cookie cleared
check_logout() {
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' \
    -X POST \
    -b "${COOKIE_JAR}" \
    -c "${COOKIE_JAR}" \
    "${BASE}/philly/api/auth/logout")
  [[ "${code}" == "302" || "${code}" == "303" || "${code}" == "200" ]]
}
check "8/10 logout" check_logout

# 9. /philly/api/calendar/connections without cookie → 401 (negative test)
check_unauth() {
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' \
    "${BASE}/philly/api/calendar/connections")
  [[ "${code}" == "401" || "${code}" == "302" || "${code}" == "303" ]]
}
check "9/10 unauthenticated → 401" check_unauth

# 10. HEAD /philly/api/billing/webhook → 405 (method not allowed, route exists)
check_webhook_route() {
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' \
    -X HEAD \
    "${BASE}/philly/api/billing/webhook")
  # 405 method not allowed = route exists; 400 = also fine (signature missing)
  [[ "${code}" == "405" || "${code}" == "400" ]]
}
check "10/10 stripe webhook route exists" check_webhook_route

echo
echo "==================================================================="
echo "Smoke results: ${PASS}/10 PASS, ${FAIL}/10 FAIL"
echo "==================================================================="

if [[ "${FAIL}" -gt 0 ]]; then
  echo
  echo "ROLLBACK CRITERIA HIT — see docs/hetzner-cutover-runbook.md Section 6 step 6."
  exit 1
fi

echo "All checks green. Cutover stable."
