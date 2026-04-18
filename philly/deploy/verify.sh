#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# Philly Dashboard — verify a backup is actually restorable
#
# Creates a scratch database, restores the given dump into it,
# runs sanity checks (table count + row counts for key tables),
# drops the scratch DB, reports PASS/FAIL.
#
# Usage:
#   sudo ./deploy/verify.sh /var/backups/philly/philly-20260417-030000.sql.gz
#
# Requires:
#   - mariadb/mysql client + mariadb-dump/mysqldump installed
#   - The DB_USER account has CREATE / DROP privileges (or use DB_ADMIN_USER)
#
# Exit codes:
#   0  dump restored and passed sanity checks
#   1  dump cannot be restored OR sanity checks failed
# ────────────────────────────────────────────────────────────────
set -euo pipefail

if [[ -f /etc/default/philly-backup ]]; then
  # shellcheck disable=SC1091
  source /etc/default/philly-backup
fi

DB_USER="${DB_USER:-phily}"
DB_PASS_FILE="${DB_PASS_FILE:-/etc/philly/db-password}"
# Optional: a separate admin account with CREATE/DROP DATABASE privileges.
# Falls back to $DB_USER if unset — will work if that account has those grants.
DB_ADMIN_USER="${DB_ADMIN_USER:-$DB_USER}"
DB_ADMIN_PASS_FILE="${DB_ADMIN_PASS_FILE:-$DB_PASS_FILE}"

DUMP="${1:-}"
[[ -n "$DUMP" ]] || { echo "Usage: $0 <dump.sql.gz>"; exit 1; }
[[ -r "$DUMP" ]] || { echo "Dump not readable: $DUMP"; exit 1; }
[[ -r "$DB_PASS_FILE" ]] || { echo "Password file not readable: $DB_PASS_FILE"; exit 1; }
[[ -r "$DB_ADMIN_PASS_FILE" ]] || { echo "Admin password file not readable: $DB_ADMIN_PASS_FILE"; exit 1; }

DB_PASS="$(cat "$DB_PASS_FILE")"
DB_ADMIN_PASS="$(cat "$DB_ADMIN_PASS_FILE")"

CLIENT="mysql"
command -v mariadb >/dev/null 2>&1 && CLIENT="mariadb"

# Unique scratch DB name — includes PID so parallel verifies don't collide
TS="$(date -u +%Y%m%d_%H%M%S)"
SCRATCH="phily_verify_${TS}_$$"

log()  { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { log "FAIL: $*" >&2; cleanup; exit 1; }

admin_sql() {
  MYSQL_PWD="$DB_ADMIN_PASS" "$CLIENT" -u "$DB_ADMIN_USER" -N -B -e "$1"
}

scratch_sql() {
  MYSQL_PWD="$DB_PASS" "$CLIENT" -u "$DB_USER" -N -B "$SCRATCH" -e "$1"
}

cleanup() {
  # Always try to drop the scratch DB, even on failure. Swallow errors.
  admin_sql "DROP DATABASE IF EXISTS \`$SCRATCH\`;" 2>/dev/null || true
}
trap cleanup EXIT

log "Scratch DB: $SCRATCH"

# 1. Create scratch DB
log "Creating scratch database…"
admin_sql "CREATE DATABASE \`$SCRATCH\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
  || fail "Could not create scratch DB (need CREATE privilege)"

# If DB_ADMIN_USER != DB_USER, grant the runtime user access to the scratch DB
if [[ "$DB_ADMIN_USER" != "$DB_USER" ]]; then
  admin_sql "GRANT ALL PRIVILEGES ON \`$SCRATCH\`.* TO '$DB_USER'@'%'; FLUSH PRIVILEGES;" \
    || fail "Could not grant to $DB_USER on scratch DB"
fi

# 2. Gzip integrity first — cheap check
log "Checking gzip integrity of dump…"
gzip -t "$DUMP" || fail "Dump is not a valid gzip file"

# 3. Restore into scratch
log "Restoring dump into $SCRATCH…"
if ! gunzip -c "$DUMP" | MYSQL_PWD="$DB_PASS" "$CLIENT" -u "$DB_USER" "$SCRATCH"; then
  fail "Restore into scratch DB failed — dump is not restorable"
fi

# 4. Sanity checks
log "Running sanity checks…"

TABLE_COUNT="$(scratch_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$SCRATCH';" | tr -d ' \n\r')"
log "  Tables present: $TABLE_COUNT"
[[ "$TABLE_COUNT" -gt 20 ]] || fail "Only $TABLE_COUNT tables restored (expected 60+)"

# Spot-check a few tables that must exist. The AuditLog and User tables
# are the minimum-viable "we can still log in and see history" pair.
for TBL in User Organization AuditLog; do
  EXISTS="$(scratch_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$SCRATCH' AND table_name='$TBL';" | tr -d ' \n\r')"
  [[ "$EXISTS" == "1" ]] || fail "Required table $TBL missing from restored dump"
done
log "  Required tables present: User, Organization, AuditLog"

# At least one user, otherwise you literally can't log in.
USER_COUNT="$(scratch_sql "SELECT COUNT(*) FROM User;" | tr -d ' \n\r')"
log "  Users in restored dump: $USER_COUNT"
[[ "$USER_COUNT" -ge 1 ]] || fail "Zero users in restored dump — backup is useless for recovery"

# Encryption round-trip: pick one encrypted secret (if any) and verify it
# still has the iv.ct.tag shape — catches silent corruption in BLOB/TEXT.
ENCRYPTED_SAMPLE="$(scratch_sql "SELECT accessToken FROM Integration WHERE accessToken IS NOT NULL LIMIT 1;" 2>/dev/null | tr -d '\n\r' || true)"
if [[ -n "$ENCRYPTED_SAMPLE" && "$ENCRYPTED_SAMPLE" != "NULL" ]]; then
  if [[ "$ENCRYPTED_SAMPLE" =~ ^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$ ]]; then
    log "  Integration accessToken shape OK (iv.ct.tag)"
  else
    log "  WARN: Integration accessToken in dump doesn't look like AES-GCM ciphertext"
  fi
fi

log "PASS: dump $DUMP restored cleanly into $SCRATCH and passed all checks."
# cleanup trap will drop the scratch DB on exit
exit 0
