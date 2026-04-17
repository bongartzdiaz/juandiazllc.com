# Audit log retention

The `AuditLog` table grows unbounded otherwise — a row is written for every
mutation across the app. At ~50 mutations/user/day for 20 users that's
~1M rows/year. The `prune` endpoint deletes rows older than the retention
window.

## Defaults

| Setting | Default | Min | Source |
|---------|---------|-----|--------|
| Retention window | 365 days | 30 days | `AUDIT_RETENTION_DAYS` env, or request body `{ days: N }` |
| Floor enforced | — | 30 days | hardcoded — a typo can't wipe the log |

## Endpoint

`POST /api/audit/prune`

Two acceptable callers:

1. **Admin user** with a valid session — prunes their organization only.
   Self-audited (a `delete` AuditLog row is written for the prune itself).
2. **Cron** with header `X-Cron-Secret: $CRON_SECRET` — prunes across
   all organizations. No session required.

Response:

```json
{ "data": { "deleted": 1234, "cutoff": "2025-04-17T00:00:00Z", "days": 365, "triggeredBy": "cron" } }
```

## Scheduling (production)

### Option A: system cron on the VPS (simplest)

```bash
# /etc/cron.d/philly-audit-prune
# Runs every day at 03:17 local time (spread out from other cron jobs)
17 3 * * * root curl -sS -X POST \
  -H "X-Cron-Secret: ${CRON_SECRET}" \
  https://your-host.example.com/api/audit/prune \
  >> /var/log/philly-audit-prune.log 2>&1
```

Ensure `$CRON_SECRET` is exported in the root shell or read it from the app's
`.env.production` file in the cron wrapper script.

### Option B: systemd timer

```ini
# /etc/systemd/system/philly-audit-prune.service
[Unit]
Description=Philly Dashboard — prune old audit logs
After=network.target

[Service]
Type=oneshot
EnvironmentFile=/etc/philly-dashboard/env
ExecStart=/usr/bin/curl -fsS -X POST \
  -H "X-Cron-Secret: ${CRON_SECRET}" \
  https://your-host.example.com/api/audit/prune
```

```ini
# /etc/systemd/system/philly-audit-prune.timer
[Unit]
Description=Daily prune of Philly Dashboard audit logs

[Timer]
OnCalendar=*-*-* 03:17:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now philly-audit-prune.timer
sudo systemctl list-timers philly-audit-prune.timer
```

### Option C: GitHub Actions (if you already deploy from GH)

```yaml
# .github/workflows/audit-prune.yml
name: Audit log prune
on:
  schedule:
    - cron: '17 3 * * *'
  workflow_dispatch:
jobs:
  prune:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" \
            https://your-host.example.com/api/audit/prune
```

## Required env

Add to `.env.production`:

```
CRON_SECRET=<generate with: openssl rand -hex 32>
AUDIT_RETENTION_DAYS=365   # optional override, default 365
```

The app does NOT enforce cron auth if `CRON_SECRET` is unset — but then
only admin-session callers can prune, which means you must run the prune
manually (not recommended).

## Manual one-off prune

As an admin in the browser:

```js
// In devtools console, while logged in as an admin
fetch('/api/audit/prune', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ days: 180 }),   // custom window for this run
}).then(r => r.json()).then(console.log)
```

## Verification

After each run, check the app logs:

```
{"level":"info","msg":"audit: pruned","deleted":1234,"cutoff":"...","triggeredBy":"cron","days":365}
```

And verify the table shrinks:

```sql
SELECT COUNT(*) FROM AuditLog;
SELECT MIN(createdAt), MAX(createdAt) FROM AuditLog;
```
