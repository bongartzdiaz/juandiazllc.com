#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# Philly Dashboard — restore a MariaDB dump from backup.sh
#
# Usage:
#   sudo ./deploy/restore.sh /var/backups/philly/philly-20260417-030000.sql.gz
#
# Prompts for confirmation before wiping the current DB.
# ────────────────────────────────────────────────────────────────
set -euo pipefail

if [[ -f /etc/default/philly-backup ]]; then
  # shellcheck disable=SC1091
  source /etc/default/philly-backup
fi

DB_NAME="${DB_NAME:-phily}"
DB_USER="${DB_USER:-phily}"
DB_PASS_FILE="${DB_PASS_FILE:-/etc/philly/db-password}"

DUMP="${1:-}"
[[ -n "$DUMP" ]] || { echo "Usage: $0 <dump.sql.gz>"; exit 1; }
[[ -r "$DUMP" ]] || { echo "Dump not readable: $DUMP"; exit 1; }
[[ -r "$DB_PASS_FILE" ]] || { echo "Password file not readable: $DB_PASS_FILE"; exit 1; }
DB_PASS="$(cat "$DB_PASS_FILE")"

echo "About to OVERWRITE database '$DB_NAME' on localhost with: $DUMP"
read -r -p "Type the DB name to confirm: " CONFIRM
[[ "$CONFIRM" == "$DB_NAME" ]] || { echo "Aborted."; exit 1; }

CLIENT="mysql"
command -v mariadb >/dev/null 2>&1 && CLIENT="mariadb"

echo "Restoring…"
gunzip -c "$DUMP" | MYSQL_PWD="$DB_PASS" "$CLIENT" -u "$DB_USER" "$DB_NAME"
echo "Restore complete."
