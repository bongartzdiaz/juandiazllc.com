---
name: cron-job
description: Bouw een scheduled job — pg_cron in Supabase, GitHub Actions cron, system cron op DO VPS, GHL workflow scheduler. Includes idempotency, error-handling, alerting, lock-mechanism. Gebruik wanneer Juan vraagt "run X elke Y" of bij periodieke tasks (cleanup, sync, report).
trigger: /cron-job
---

# /cron-job

Scheduled jobs over alle systemen. Anders dan `/cron-manage` (overzicht + debug); deze bouwt nieuwe jobs.

## Usage
```
/cron-job <doel> --target <pg-cron|github-actions|system-cron|ghl|n8n>
/cron-job <doel> --schedule <"cron expr">          # bv "*/15 * * * *"
/cron-job <doel> --idempotent
/cron-job <doel> --alert <slack|email>
```

## Targets per use-case

| Use-case | Target | Why |
|---|---|---|
| DB-cleanup, RLS-aware ops | `pg-cron` | dichtst bij data, no infra |
| Code-deploy, build, public CI | `github-actions` | repo context, secrets, free tier |
| Server-side scripts, file-ops | `system-cron` (DO VPS) | filesystem access, NEXUS BOS |
| Lead-nurture, email-sequence | `ghl` workflow | CRM context, native triggers |
| Multi-step orchestration | `n8n` | visual, multi-vendor |

## pg_cron (Supabase)

### Setup eenmalig
```sql
-- In Supabase Dashboard → Database → Extensions → enable `pg_cron`
-- Daarna in SQL editor:
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Schedule een job
```sql
-- Idempotent re-schedule
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup_otp_challenges') 
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_otp_challenges');
END $$;

SELECT cron.schedule(
  'cleanup_otp_challenges',
  '*/15 * * * *',
  $cron$
    DELETE FROM public.otp_challenges
    WHERE expires_at < now() - interval '24 hours';
  $cron$
);
```

### Job-met-edge-fn-call
```sql
SELECT cron.schedule(
  'sync_ghl_hourly',
  '0 * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://pssmedgsbwyggsovpnvg.supabase.co/functions/v1/sync-ghl',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='service_role_key' LIMIT 1),
        'x-api-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='sync_api_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );
  $cron$
);
```

### Monitor failures
```sql
-- Zie laatste 24u runs
SELECT job_name, status, return_message, start_time
FROM cron.job_run_details
WHERE start_time > now() - interval '24 hours'
ORDER BY start_time DESC;
```

## GitHub Actions cron

```yaml
# .github/workflows/<naam>.yml
name: Daily SEO publisher
on:
  schedule:
    - cron: "30 6 * * *"   # UTC! (30 6 = 8:30 NL winter, 7:30 NL zomer — let op)
  workflow_dispatch:        # handmatig triggerbaar

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run publisher
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          curl -X POST https://pssmedgsbwyggsovpnvg.supabase.co/functions/v1/daily-publisher \
            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
            --fail
      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H "Content-Type: application/json" \
            -d '{"text":"Daily publisher gefaald — check logs"}'
```

**Pas op:** GitHub cron-schedule kan vertraging hebben (5-15 min) bij hoge load. Niet voor strakke timing.

## System cron (DO VPS)

```bash
# /etc/cron.d/hmb-daily-publisher
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# 06:30 NL elke dag → run publisher
30 6 * * * root /usr/local/bin/hmb-daily-publisher >> /var/log/hmb-publisher.log 2>&1
```

```bash
# /usr/local/bin/hmb-daily-publisher
#!/usr/bin/env bash
set -euo pipefail

source /etc/hmb/daily-publisher.env

# Lock-file voorkomt overlap
exec 9>/var/lock/hmb-publisher.lock || exit 0
flock -n 9 || { echo "Already running"; exit 0; }

curl -fsS -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  https://api.example/publisher
```

Maak script executable: `chmod +x /usr/local/bin/hmb-daily-publisher`.

## Hard rules

### Idempotency (bijna altijd)
- Job moet veilig 2× kunnen draaien (race-conditions, retries)
- Gebruik `INSERT ... ON CONFLICT DO NOTHING` of state-checks
- Lock-mechanism (Postgres advisory locks of file-lock)

### Lock-pattern (Postgres)
```sql
SELECT pg_advisory_xact_lock(hashtext('my_job'));
-- ... werk ...
-- lock auto-released bij COMMIT
```

### Schedule-conventies
- **Cron-syntax** in NL: gebruik UTC en converteer mentaal (NL = UTC+1 winter, +2 zomer)
- **Of**: gebruik `Europe/Amsterdam` in pg_cron (PG ≥14):
  ```sql
  SELECT cron.schedule_in_database('job', '30 8 * * *', $cron$ ... $cron$, 'postgres', 'Europe/Amsterdam');
  ```

### Common schedules
| Wat | Cron |
|---|---|
| Elke 15 min | `*/15 * * * *` |
| Elk uur | `0 * * * *` |
| Elke nacht 03:00 | `0 3 * * *` |
| 8:30 weekdagen | `30 8 * * 1-5` |
| Maandag 09:00 | `0 9 * * 1` |
| Eerste van maand 06:00 | `0 6 1 * *` |
| 6-uurs (NEXUS BOS) | `0 0,6,12,18 * * *` |

### Alerting
- Faal-modus: log + Slack-webhook
- Geen email-alerts (verstopt in inbox) tenzij P1
- Status-page voor zichtbaarheid (`/status` endpoint dat laatste run-tijd toont)

## Combineer met
- `/cron-manage` — overzicht + debug bestaande jobs
- `/api-route` — als job een endpoint nodig heeft
- `/edge-fn-build` — voor de Supabase edge fn die geroepen wordt
- `/observability` (TODO) — health-monitoring
