#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# Philly Dashboard — nightly MariaDB backup
#
# Install on the VPS:
#   chmod +x deploy/backup.sh
#   sudo cp deploy/backup.sh /usr/local/bin/philly-backup
#
# Add to root crontab (run `sudo crontab -e`):
#   0 3 * * * /usr/local/bin/philly-backup >> /var/log/philly-backup.log 2>&1
#
# Environment (set in /etc/default/philly-backup or pass inline):
#   BACKUP_DIR          Where to write dumps        (default /var/backups/philly)
#   DB_NAME             MariaDB database name       (default phily)
#   DB_USER             MariaDB user                (default phily)
#   DB_PASS_FILE        File containing DB password (default /etc/philly/db-password)
#   KEEP_DAYS           Local retention in days     (default 14)
#   S3_BUCKET           Optional S3 bucket URL      (e.g. s3://mybucket/philly)
#   S3_ENDPOINT         Optional non-AWS S3 URL     (e.g. https://fra1.digitaloceanspaces.com)
#   AWS_PROFILE         Optional AWS profile for awscli
# ────────────────────────────────────────────────────────────────
set -euo pipefail

# Load overrides if the system file exists
if [[ -f /etc/default/philly-backup ]]; then
  # shellcheck disable=SC1091
  source /etc/default/philly-backup
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/philly}"
DB_NAME="${DB_NAME:-phily}"
DB_USER="${DB_USER:-phily}"
DB_PASS_FILE="${DB_PASS_FILE:-/etc/philly/db-password}"
KEEP_DAYS="${KEEP_DAYS:-14}"

TS="$(date -u +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/philly-${TS}.sql.gz"

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"

[[ -r "$DB_PASS_FILE" ]] || fail "Password file not readable: $DB_PASS_FILE"
DB_PASS="$(cat "$DB_PASS_FILE")"

command -v mariadb-dump >/dev/null 2>&1 || command -v mysqldump >/dev/null 2>&1 \
  || fail "Neither mariadb-dump nor mysqldump installed"

DUMP_CMD="mysqldump"
command -v mariadb-dump >/dev/null 2>&1 && DUMP_CMD="mariadb-dump"

log "Dumping $DB_NAME → $OUT"
MYSQL_PWD="$DB_PASS" "$DUMP_CMD" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF 2>/dev/null \
  -u "$DB_USER" "$DB_NAME" 2>/dev/null \
  | gzip -9 > "$OUT" \
  || {
    # Retry without --set-gtid-purged (MariaDB doesn't support it)
    MYSQL_PWD="$DB_PASS" "$DUMP_CMD" \
      --single-transaction \
      --quick \
      --routines \
      --triggers \
      --events \
      -u "$DB_USER" "$DB_NAME" \
      | gzip -9 > "$OUT"
  }

SIZE="$(du -h "$OUT" | cut -f1)"
log "Wrote $OUT ($SIZE)"

# Verify dump is not empty
[[ -s "$OUT" ]] || fail "Dump file is empty"

# Sanity check: can gzip read it end-to-end?
gzip -t "$OUT" || fail "Dump is corrupt (gzip test failed)"

# Ship to S3 if configured
if [[ -n "${S3_BUCKET:-}" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    log "WARN: S3_BUCKET set but awscli not installed, skipping upload"
  else
    EP_ARG=()
    [[ -n "${S3_ENDPOINT:-}" ]] && EP_ARG=(--endpoint-url "$S3_ENDPOINT")
    log "Uploading to $S3_BUCKET"
    aws "${EP_ARG[@]}" s3 cp "$OUT" "$S3_BUCKET/philly-${TS}.sql.gz" \
      --storage-class STANDARD_IA
    log "S3 upload complete"
  fi
fi

# Rotate: delete local dumps older than KEEP_DAYS
log "Rotating local dumps older than $KEEP_DAYS days"
find "$BACKUP_DIR" -name 'philly-*.sql.gz' -type f -mtime "+$KEEP_DAYS" -print -delete || true

log "Backup OK"
