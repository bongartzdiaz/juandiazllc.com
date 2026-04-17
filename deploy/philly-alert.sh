#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# Philly Dashboard — failure-alert dispatcher
#
# Called by philly-alert@.service (systemd template) when backup or
# verify fails. Reads /etc/default/philly-backup for ALERT_SLACK_WEBHOOK
# and ALERT_EMAIL. Always writes to stdout so the alert lands in journald
# even when external channels are unconfigured.
#
# Usage:
#   philly-alert <failing-unit-name>
# ────────────────────────────────────────────────────────────────
set -euo pipefail

if [[ -f /etc/default/philly-backup ]]; then
  # shellcheck disable=SC1091
  source /etc/default/philly-backup
fi

UNIT="${1:-unknown.service}"
HOST="$(hostname)"
TS="$(date -u +%FT%TZ)"
MSG="[PHILLY ALERT] ${UNIT} FAILED on ${HOST} at ${TS}"

# Grab the last 30 lines of the failing unit's journal
LAST_LOG="$(journalctl -u "$UNIT" -n 30 --no-pager 2>/dev/null || echo '(journal read failed)')"

echo "$MSG"
echo "--- last 30 journal lines ---"
echo "$LAST_LOG"
echo "--- end ---"

# ── Slack ──────────────────────────────────────────────────────
if [[ -n "${ALERT_SLACK_WEBHOOK:-}" ]]; then
  if command -v curl >/dev/null 2>&1; then
    # Build payload via python if available for robust JSON escaping.
    # Falls back to jq, then to a naive sed — all three handle quotes/newlines.
    if command -v python3 >/dev/null 2>&1; then
      PAYLOAD="$(python3 -c '
import json, sys
msg = sys.argv[1]
tail = "\n".join(sys.argv[2].splitlines()[-15:])
print(json.dumps({"text": f"{msg}\n```{tail}```"}))
' "$MSG" "$LAST_LOG")"
    elif command -v jq >/dev/null 2>&1; then
      TAIL="$(printf '%s\n' "$LAST_LOG" | tail -15)"
      PAYLOAD="$(jq -cn --arg m "$MSG" --arg t "$TAIL" '{text: ($m + "\n```" + $t + "```")}')"
    else
      # Last-resort escaping: strip backticks, collapse quotes. Ugly but safe.
      TAIL="$(printf '%s\n' "$LAST_LOG" | tail -15 | tr '`"' "' " | tr '\n' ' ')"
      PAYLOAD="{\"text\":\"${MSG} ${TAIL}\"}"
    fi
    curl -fsS --max-time 10 -X POST \
      -H 'Content-Type: application/json' \
      -d "$PAYLOAD" \
      "$ALERT_SLACK_WEBHOOK" >/dev/null \
      && echo "Slack alert sent" \
      || echo "Slack alert FAILED (non-fatal)" >&2
  else
    echo "curl missing — can't send Slack alert" >&2
  fi
fi

# ── Email ──────────────────────────────────────────────────────
if [[ -n "${ALERT_EMAIL:-}" ]]; then
  if command -v mail >/dev/null 2>&1; then
    { echo "$MSG"; echo; echo "$LAST_LOG"; } | mail -s "$MSG" "$ALERT_EMAIL" \
      && echo "Email alert sent" \
      || echo "Email alert FAILED (non-fatal)" >&2
  else
    echo "mail command missing — install mailutils to enable email alerts" >&2
  fi
fi

# Always exit 0 — failure to alert shouldn't trigger another alert cascade.
exit 0
