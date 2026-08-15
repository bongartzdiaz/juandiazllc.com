#!/usr/bin/env bash
# Creates 5 UptimeRobot monitors for juandiazllc.com.
# Requires: UPTIMEROBOT_API_KEY env var (read-write API key from
# https://uptimerobot.com/dashboard#mySettings — "API Settings" section).
#
# Usage:
#   UPTIMEROBOT_API_KEY=ur... bash scripts/setup-uptimerobot.sh
#
# Free plan gives 50 monitors at 5-min intervals. All monitors below use 5 min.
# Alert contacts: UptimeRobot will use your account's default alert contact
# (the email you registered with). To add extra contacts, grab the contact ID
# from the API or dashboard and append &alert_contacts=<id>_0_0 to each call.

set -euo pipefail

API="https://api.uptimerobot.com/v2/newMonitor"
KEY="${UPTIMEROBOT_API_KEY:?Set UPTIMEROBOT_API_KEY to your read-write API key}"

# type=1 = HTTP(s)   type=2 = keyword   interval=300 = 5 minutes
#
# The keyword branch used to send `type` twice (1 and 2) and used
# keyword_type=1 ("exists" = alert when the word IS present), which is the
# opposite of what a content check wants. No caller passed a keyword, so it
# was never exercised. Rewritten below: keyword_type=2 means "not exists",
# i.e. alert when the expected string disappears from the response.
create() {
  local name="$1" url="$2" keyword="${3:-}"
  local -a extra=()
  if [[ -n "$keyword" ]]; then
    extra=(--data "type=2" --data "keyword_type=2" --data-urlencode "keyword_value=$keyword")
  else
    extra=(--data "type=1")
  fi

  echo -n "Creating [$name] ... "
  response=$(curl -s -X POST "$API" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Cache-Control: no-cache" \
    --data-urlencode "api_key=$KEY" \
    --data "format=json" \
    --data "interval=300" \
    --data-urlencode "friendly_name=$name" \
    --data-urlencode "url=$url" \
    "${extra[@]}")

  stat=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stat','?'))" 2>/dev/null || echo "parse_error")
  if [[ "$stat" == "ok" ]]; then
    id=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['monitor']['id'])" 2>/dev/null || echo "?")
    echo "OK (id=$id)"
  else
    err=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message','unknown'))" 2>/dev/null || echo "$response")
    echo "FAILED: $err"
  fi
}

echo "=== juandiazllc.com UptimeRobot setup ==="
echo ""

# Core availability — if any of these go down, the site is broken for users
create "juandiazllc — homepage (/en)"     "https://juandiazllc.com/en"
create "juandiazllc — sitemap.xml"        "https://juandiazllc.com/sitemap.xml"
create "juandiazllc — robots.txt"         "https://juandiazllc.com/robots.txt"

# DE content (key market page — confirms i18n routing works)
create "juandiazllc — DE insights article" \
  "https://juandiazllc.com/de/insights/the-build-vs-buy-trap"

# Energy ROI tool (high-value conversion page per sectors/energy CTA)
create "juandiazllc — energy ROI tool (/en)" \
  "https://juandiazllc.com/en/tools/energy-roi"

# ── The lead path ───────────────────────────────────────────────────────────
# Every monitor above fetches a static page. Those keep returning 200 while
# the contact form silently loses every lead — which is exactly what happened
# on 2026-08-12: PostgREST served 503 PGRST002 project-wide for hours and
# nothing noticed. This monitor watches the layer the pages can't see.
#
# It requests a table that deliberately does not exist. While PostgREST is
# healthy that is a stable 404 PGRST205, regardless of what the real schema
# looks like. When the schema cache breaks the body becomes PGRST002 instead,
# the keyword disappears, and UptimeRobot alerts.
#
# NOTE — this covers the project-wide failure only. Verifying that the
# `marketing` schema specifically is still exposed and still refuses anon
# SELECT needs an `Accept-Profile` header, which UptimeRobot cannot send on
# the free plan. That check lives in scripts/check-lead-path.sh and runs from
# .github/workflows/lead-health.yml. The two layers are complementary; neither
# replaces the other.
#
# The key in the URL is the publishable/anon key. It is public by design —
# it already ships in the browser bundle of every page on the site.
if [[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_ANON_KEY:-}" ]]; then
  create "juandiazllc — PostgREST alive (lead path)" \
    "${SUPABASE_URL%/}/rest/v1/postgrest_liveness_probe?apikey=${SUPABASE_ANON_KEY}" \
    "PGRST205"
else
  echo "Skipping [PostgREST alive (lead path)] — set SUPABASE_URL and"
  echo "  SUPABASE_ANON_KEY and re-run to add it. Without this monitor the"
  echo "  contact form can fail silently; see MANUAL_TASKS.md."
fi

echo ""
echo "Done. View monitors at https://uptimerobot.com/dashboard"
echo ""
echo "Tip: to add Slack/email alerts beyond your default contact, go to"
echo "  Dashboard → Alert Contacts → New Alert Contact, then re-run"
echo "  this script with the contact ID appended to each call."
