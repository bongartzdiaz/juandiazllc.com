# Backup verification runbook

An untested backup is just hope. This procedure proves your nightly dumps
actually produce a restorable database **before** you need to rely on them.

Run this the first time you set up the server, and again once a quarter
(or after any infra change — DB version bump, disk migration, new schema).

## What the scripts do

| Script | Purpose | Destructive? |
|--------|---------|--------------|
| `deploy/backup.sh` | Write a gzipped `mysqldump` to `$BACKUP_DIR`, verify gzip integrity, ship to S3 (optional), rotate old dumps | No — read-only on source DB |
| `deploy/verify.sh` | Restore a dump into a **scratch** database, run sanity checks, drop the scratch DB | No — creates and drops a separate DB |
| `deploy/restore.sh` | Restore a dump into the **real** database (or a target via `--target-db`) | **Yes** — overwrites target |

## One-time setup on the VPS

```bash
ssh root@64.225.74.36

# 1. Install the scripts into PATH
cd /root/philly-dashboard   # wherever the repo is cloned
sudo cp deploy/backup.sh  /usr/local/bin/philly-backup
sudo cp deploy/verify.sh  /usr/local/bin/philly-verify
sudo cp deploy/restore.sh /usr/local/bin/philly-restore
sudo chmod +x /usr/local/bin/philly-{backup,verify,restore}

# 2. Config file (env overrides)
sudo mkdir -p /etc/philly /var/backups/philly
sudo tee /etc/default/philly-backup > /dev/null <<'EOF'
BACKUP_DIR=/var/backups/philly
DB_NAME=phily
DB_USER=phily
DB_PASS_FILE=/etc/philly/db-password
KEEP_DAYS=14
# S3_BUCKET=s3://your-bucket/philly         # uncomment to ship offsite
# S3_ENDPOINT=https://fra1.digitaloceanspaces.com
# DB_ADMIN_USER=root                         # only needed for verify.sh
# DB_ADMIN_PASS_FILE=/etc/philly/db-admin-password
EOF

# 3. DB password (stored root-readable only)
echo -n "YOUR_DB_PASSWORD_HERE" | sudo tee /etc/philly/db-password > /dev/null
sudo chmod 600 /etc/philly/db-password
sudo chown root:root /etc/philly/db-password

# 4. (If DB_ADMIN_USER != DB_USER) admin password for verify.sh's CREATE/DROP
#    Skip this if your `phily` user already has CREATE/DROP DATABASE privileges.
echo -n "ROOT_DB_PASSWORD" | sudo tee /etc/philly/db-admin-password > /dev/null
sudo chmod 600 /etc/philly/db-admin-password
```

## First-time end-to-end test (run it NOW)

Execute these in order on the VPS:

```bash
# 1. Take a fresh backup
sudo /usr/local/bin/philly-backup

# Expected output:
#   [2026-04-17T12:34:56Z] Dumping phily → /var/backups/philly/philly-20260417-123456.sql.gz
#   [2026-04-17T12:34:58Z] Wrote /var/backups/philly/philly-20260417-123456.sql.gz (1.2M)
#   [2026-04-17T12:34:58Z] Rotating local dumps older than 14 days
#   [2026-04-17T12:34:58Z] Backup OK

# 2. Find the dump you just wrote
LATEST=$(ls -1t /var/backups/philly/philly-*.sql.gz | head -1)
echo "Latest dump: $LATEST"

# 3. VERIFY the dump restores cleanly (non-destructive — uses a scratch DB)
sudo /usr/local/bin/philly-verify "$LATEST"

# Expected tail:
#   [...] Users in restored dump: 1
#   [...] Integration accessToken shape OK (iv.ct.tag)
#   [...] PASS: dump ... restored cleanly into phily_verify_... and passed all checks.

# 4. Confirm the scratch DB was dropped (should print nothing)
MYSQL_PWD=$(cat /etc/philly/db-admin-password) mariadb -u root -N -B \
  -e "SHOW DATABASES LIKE 'phily_verify_%';"
```

If all four steps succeed, your backup pipeline is provably working.

## Schedule the nightly backup + weekly verification

Add two cron entries:

```bash
sudo crontab -e
```

```cron
# Nightly dump at 03:00 server time
0 3 * * *  /usr/local/bin/philly-backup >> /var/log/philly-backup.log 2>&1

# Weekly restore test every Sunday at 04:00 — catches silent rot
0 4 * * 0  /usr/local/bin/philly-verify "$(ls -1t /var/backups/philly/philly-*.sql.gz | head -1)" >> /var/log/philly-verify.log 2>&1
```

The weekly verify is important: a dump can become unrestorable if the DB
schema drifts from what mysqldump wrote (e.g. after a botched migration).
Catching it on Sunday in a log is far better than finding out when you
actually need to restore.

## When disaster strikes — full restore procedure

You have a bad day. The DB is trashed. Here's the sequence:

```bash
# 1. Stop the app so no one writes during restore
pm2 stop philly-dashboard        # or: sudo systemctl stop philly-dashboard

# 2. Pick which dump to restore from — usually the most recent
LATEST=$(ls -1t /var/backups/philly/philly-*.sql.gz | head -1)
echo "Restoring from: $LATEST"

# 3. (OPTIONAL BUT SMART) verify that specific dump first
sudo /usr/local/bin/philly-verify "$LATEST" || {
  echo "Dump is bad — pick an older one"; exit 1
}

# 4. Restore into prod — will prompt for DB name to confirm
sudo /usr/local/bin/philly-restore "$LATEST"

# 5. Start the app
pm2 start philly-dashboard

# 6. Verify login works — this is the only test that matters
curl -s -o /dev/null -w '%{http_code}\n' https://your-host/api/health
```

## Monitoring

Add to your log monitoring (Grafana / Papertrail / whatever):

- Alert if `/var/log/philly-backup.log` has no `Backup OK` line in the last 26 hours.
- Alert if `/var/log/philly-verify.log` has a `FAIL:` line, ever.
- Alert if the most recent file in `/var/backups/philly/` is older than 26 hours.

## Offsite backups

Local-only backups protect you from bad deletes but **not** from the VPS
itself dying (disk failure, provider outage, compromised host). Enable S3
shipping in `/etc/default/philly-backup`:

```bash
S3_BUCKET=s3://your-bucket/philly
S3_ENDPOINT=https://fra1.digitaloceanspaces.com  # or leave unset for AWS S3
```

Then `aws configure` under the user that runs the cron (typically root).
The backup script uses `STANDARD_IA` storage class — ~40% cheaper than
STANDARD, which matters when you've accumulated a year of 1–5 MB dumps.

## What to do if verify.sh fails

1. **Check the error message** — usually it's either "gzip invalid" (dump
   got truncated, disk full?) or a SQL syntax error (schema drift).
2. **Try the previous dump** — `ls -lt /var/backups/philly/` and run
   verify on the second-newest. If that passes, the new one is the problem.
3. **Keep the failing dump**: `mv broken.sql.gz broken.sql.gz.KEEP` so
   rotation doesn't delete it before you investigate.
4. **Check `SHOW ENGINE INNODB STATUS`** on the source DB — long-running
   transactions during backup can corrupt a dump.
