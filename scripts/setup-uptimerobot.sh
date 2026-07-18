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

# type=1 = HTTP(s)   interval=300 = 5 minutes   http_method=1 = HEAD (faster)
create() {
  local name="$1" url="$2" keyword="${3:-}"
  local extra=""
  if [[ -n "$keyword" ]]; then
    # type=2 = keyword monitor — confirms page returns expected content
    extra="&type=2&keyword_type=1&keyword_value=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$keyword")"
  fi

  echo -n "Creating [$name] ... "
  response=$(curl -s -X POST "$API" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Cache-Control: no-cache" \
    --data-urlencode "api_key=$KEY" \
    --data "format=json" \
    --data "type=1" \
    --data "interval=300" \
    --data-urlencode "friendly_name=$name" \
    --data-urlencode "url=$url" \
    ${extra:+--data-raw "$extra"})

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

echo ""
echo "Done. View monitors at https://uptimerobot.com/dashboard"
echo ""
echo "Tip: to add Slack/email alerts beyond your default contact, go to"
echo "  Dashboard → Alert Contacts → New Alert Contact, then re-run"
echo "  this script with the contact ID appended to each call."
