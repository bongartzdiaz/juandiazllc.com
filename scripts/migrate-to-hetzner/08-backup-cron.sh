#!/bin/bash
set -euo pipefail

# 08-backup-cron.sh
# What this does:
#   Daily backup driver: dumps Postgres (lucia_auth), dumps MariaDB
#   (the Prisma data layer), gzips both, and pushes to a B2 bucket
#   in EU. Designed to run at 03:00 CET via /etc/cron.d/deus.
#
#   On first run, also installs itself into /etc/cron.d/deus and
#   creates the local backup directory.
#
# Required env (loaded from /home/deus/.deus-backup-env, mode 0600):
#   B2_KEY_ID
#   B2_APPLICATION_KEY
#   B2_BUCKET                  e.g. deus-backups-eu
#   MARIADB_DUMP_HOST          e.g. db.example.com
#   MARIADB_DUMP_USER
#   MARIADB_DUMP_PASSWORD
#   MARIADB_DUMP_DB            e.g. philly
#
# Usage:
#   sudo cp 08-backup-cron.sh /usr/local/bin/deus-backup
#   sudo chmod +x /usr/local/bin/deus-backup
#   sudo /usr/local/bin/deus-backup --install     # writes /etc/cron.d/deus
#   sudo /usr/local/bin/deus-backup               # one-shot
#
# Cron line (auto-installed):
#   0 3 * * * deus /usr/local/bin/deus-backup >> /var/log/deus-backup.log 2>&1

ENV_FILE="/home/deus/.deus-backup-env"
LOCAL_DIR="/var/lib/deus-backups"
DATE_TAG="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ "${1:-}" == "--install" ]]; then
  if [[ "${EUID}" -ne 0 ]]; then
    echo "ERROR: --install must run as root" >&2
    exit 1
  fi
  install -d -m 0750 -o deus -g deus "${LOCAL_DIR}"
  cat >/etc/cron.d/deus <<'CRON'
# DEUS scheduled jobs
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""

# Daily 03:00 UTC — Postgres + MariaDB dumps to B2 EU
0 3 * * * deus /usr/local/bin/deus-backup >> /var/log/deus-backup.log 2>&1

# Hourly — calendar push-sync channel renewal (see docs/calendar-push-sync.md)
17 * * * * deus curl -fsS -X POST -H "Authorization: Bearer ${DEUS_CRON_SECRET}" https://localhost/philly/api/calendar/renew-channels >/dev/null

# Daily 04:00 UTC — audit log prune
0 4 * * * deus curl -fsS -X POST -H "Authorization: Bearer ${DEUS_CRON_SECRET}" https://localhost/philly/api/audit/prune >/dev/null
CRON
  chmod 644 /etc/cron.d/deus
  touch /var/log/deus-backup.log
  chown deus:deus /var/log/deus-backup.log
  echo "OK: installed /etc/cron.d/deus + /var/log/deus-backup.log"
  exit 0
fi

if [[ ! -r "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} missing or unreadable. Create with mode 0600 and the required env vars." >&2
  exit 1
fi
# shellcheck disable=SC1090
source "${ENV_FILE}"

: "${B2_KEY_ID:?B2_KEY_ID required in ${ENV_FILE}}"
: "${B2_APPLICATION_KEY:?B2_APPLICATION_KEY required in ${ENV_FILE}}"
: "${B2_BUCKET:?B2_BUCKET required in ${ENV_FILE}}"
: "${MARIADB_DUMP_HOST:?required}"
: "${MARIADB_DUMP_USER:?required}"
: "${MARIADB_DUMP_PASSWORD:?required}"
: "${MARIADB_DUMP_DB:?required}"

mkdir -p "${LOCAL_DIR}"

# ---------- Postgres ----------
PG_FILE="${LOCAL_DIR}/lucia_auth-${DATE_TAG}.sql.gz"
echo "[$(date -Iseconds)] dumping postgres -> ${PG_FILE}"
sudo -u postgres pg_dump --format=plain --no-owner --no-privileges lucia_auth \
  | gzip -9 \
  > "${PG_FILE}"
PG_SIZE=$(stat -c %s "${PG_FILE}")
if [[ "${PG_SIZE}" -lt 1024 ]]; then
  echo "ERROR: postgres dump suspiciously small (${PG_SIZE} bytes)" >&2
  exit 2
fi

# ---------- MariaDB ----------
MD_FILE="${LOCAL_DIR}/${MARIADB_DUMP_DB}-${DATE_TAG}.sql.gz"
echo "[$(date -Iseconds)] dumping mariadb -> ${MD_FILE}"
mysqldump \
  --host="${MARIADB_DUMP_HOST}" \
  --user="${MARIADB_DUMP_USER}" \
  --password="${MARIADB_DUMP_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  --hex-blob \
  --quick \
  "${MARIADB_DUMP_DB}" \
  | gzip -9 \
  > "${MD_FILE}"
MD_SIZE=$(stat -c %s "${MD_FILE}")
if [[ "${MD_SIZE}" -lt 1024 ]]; then
  echo "ERROR: mariadb dump suspiciously small (${MD_SIZE} bytes)" >&2
  exit 3
fi

# ---------- B2 push ----------
echo "[$(date -Iseconds)] authorising b2"
b2 account authorize "${B2_KEY_ID}" "${B2_APPLICATION_KEY}" >/dev/null

echo "[$(date -Iseconds)] uploading postgres dump"
b2 file upload "${B2_BUCKET}" "${PG_FILE}" "postgres/$(basename "${PG_FILE}")" >/dev/null

echo "[$(date -Iseconds)] uploading mariadb dump"
b2 file upload "${B2_BUCKET}" "${MD_FILE}" "mariadb/$(basename "${MD_FILE}")" >/dev/null

# ---------- local cleanup (keep 7 days on disk; B2 lifecycle handles 30d off-site) ----------
find "${LOCAL_DIR}" -type f -mtime +7 -delete

echo "[$(date -Iseconds)] OK: backup complete (pg=${PG_SIZE}b mariadb=${MD_SIZE}b)"
