#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# Philly Dashboard — install systemd units for backup + verify
#
# Run this ONCE on the VPS after cloning the repo. Idempotent —
# safe to re-run after editing a unit file.
#
# Usage (as root, from the repo root):
#   sudo ./deploy/install-systemd.sh
#
# What it does:
#   1. Copies the three shell scripts to /usr/local/bin/philly-*
#   2. Installs the four systemd units to /etc/systemd/system/
#   3. daemon-reload, enable + start both timers
#   4. Shows `systemctl list-timers` so you can confirm they're scheduled
#
# Prerequisites (not handled here — do these first):
#   - /etc/default/philly-backup exists with DB_NAME/DB_USER/DB_PASS_FILE
#   - /etc/philly/db-password exists with mode 600
#   - mariadb server is installed and running
# ────────────────────────────────────────────────────────────────
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Must be run as root (sudo)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }

# ── Preflight checks ────────────────────────────────────────────
log "Preflight…"
[[ -f /etc/default/philly-backup ]] \
  || { echo "Missing /etc/default/philly-backup — see docs/backup-verification.md" >&2; exit 1; }
[[ -f /etc/philly/db-password ]] \
  || { echo "Missing /etc/philly/db-password — see docs/backup-verification.md" >&2; exit 1; }
command -v systemctl >/dev/null 2>&1 \
  || { echo "systemctl not found — this install script requires systemd" >&2; exit 1; }

# ── Install shell scripts ──────────────────────────────────────
log "Installing shell scripts to /usr/local/bin…"
install -m 0755 deploy/backup.sh       /usr/local/bin/philly-backup
install -m 0755 deploy/verify.sh       /usr/local/bin/philly-verify
install -m 0755 deploy/restore.sh      /usr/local/bin/philly-restore
install -m 0755 deploy/philly-alert.sh /usr/local/bin/philly-alert

# ── Install systemd units ──────────────────────────────────────
log "Installing systemd units to /etc/systemd/system…"
install -m 0644 deploy/systemd/philly-backup.service   /etc/systemd/system/
install -m 0644 deploy/systemd/philly-backup.timer     /etc/systemd/system/
install -m 0644 deploy/systemd/philly-verify.service   /etc/systemd/system/
install -m 0644 deploy/systemd/philly-verify.timer     /etc/systemd/system/
install -m 0644 deploy/systemd/philly-alert@.service   /etc/systemd/system/

# ── Ensure backup dir exists with sane perms ──────────────────
BACKUP_DIR="$(grep -E '^BACKUP_DIR=' /etc/default/philly-backup | cut -d= -f2- | tr -d '"' | tr -d "'")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/philly}"
mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR"
log "Backup dir: $BACKUP_DIR"

# ── Reload + enable ───────────────────────────────────────────
log "systemctl daemon-reload…"
systemctl daemon-reload

log "Enabling + starting timers…"
systemctl enable --now philly-backup.timer
systemctl enable --now philly-verify.timer

# ── Show status ────────────────────────────────────────────────
log "Installed. Scheduled runs:"
systemctl list-timers --no-pager philly-backup.timer philly-verify.timer

cat <<EOF

Done. Next steps:

  1. Take an ad-hoc backup to prove it works end-to-end:
       sudo systemctl start philly-backup.service
       journalctl -u philly-backup -n 20 --no-pager

  2. Run a verification pass on the newest dump:
       sudo systemctl start philly-verify.service
       journalctl -u philly-verify -n 30 --no-pager

  3. (Optional) Configure failure alerts — edit /etc/default/philly-backup:
       ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/XXX/YYY/ZZZ
       ALERT_EMAIL=ops@example.com

  4. Monitor the timers:
       systemctl list-timers 'philly-*'
EOF
