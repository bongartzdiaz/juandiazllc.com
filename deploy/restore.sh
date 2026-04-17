#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# Philly Dashboard — restore a MariaDB dump from backup.sh
#
# Usage:
#   sudo ./deploy/restore.sh /var/backups/philly/philly-20260417-030000.sql.gz
#   sudo ./deploy/restore.sh --target-db phily_scratch --yes dump.sql.gz
#
# Flags:
#   --target-db <name>  Restore into a different database (for verification).
#                       Default: $DB_NAME from env (normally `phily`).
#   --yes               Skip the interactive confirmation prompt.
#                       REQUIRED if restoring into the real DB via automation.
# ────────────────────────────────────────────────────────────────
set -euo pipefail

if [[ -f /etc/default/philly-backup ]]; then
  # shellcheck disable=SC1091
  source /etc/default/philly-backup
fi

DB_NAME="${DB_NAME:-phily}"
DB_USER="${DB_USER:-phily}"
DB_PASS_FILE="${DB_PASS_FILE:-/etc/philly/db-password}"

TARGET_DB=""
ASSUME_YES=0
DUMP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-db)
      TARGET_DB="${2:-}"; shift 2 ;;
    --yes|-y)
      ASSUME_YES=1; shift ;;
    -h|--help)
      sed -n '2,15p' "$0"; exit 0 ;;
    --*)
      echo "Unknown flag: $1" >&2; exit 1 ;;
    *)
      DUMP="$1"; shift ;;
  esac
done

[[ -n "$DUMP" ]] || { echo "Usage: $0 [--target-db <name>] [--yes] <dump.sql.gz>"; exit 1; }
[[ -r "$DUMP" ]] || { echo "Dump not readable: $DUMP"; exit 1; }
[[ -r "$DB_PASS_FILE" ]] || { echo "Password file not readable: $DB_PASS_FILE"; exit 1; }
DB_PASS="$(cat "$DB_PASS_FILE")"

TARGET="${TARGET_DB:-$DB_NAME}"

echo "About to OVERWRITE database '$TARGET' on localhost with: $DUMP"
if [[ "$ASSUME_YES" -ne 1 ]]; then
  read -r -p "Type the DB name to confirm: " CONFIRM
  [[ "$CONFIRM" == "$TARGET" ]] || { echo "Aborted."; exit 1; }
fi

CLIENT="mysql"
command -v mariadb >/dev/null 2>&1 && CLIENT="mariadb"

echo "Restoring…"
gunzip -c "$DUMP" | MYSQL_PWD="$DB_PASS" "$CLIENT" -u "$DB_USER" "$TARGET"
echo "Restore complete."
