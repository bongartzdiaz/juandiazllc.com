---
name: log-analysis
description: Mine logs voor patterns — Supabase edge-fn logs, Vercel function logs, Sentry events, browser console errors, nginx access/error logs. Output is gerangschikte top-issues + frequency + impact. Gebruik wanneer Juan vraagt "wat faalt er", bij incident-debug, of voor weekly health-review.
trigger: /log-analysis
---

# /log-analysis

Logs-as-data. Vind patterns, niet 1-off errors.

## Usage
```
/log-analysis <bron>
/log-analysis <bron> --window <1h|24h|7d|30d>
/log-analysis <bron> --filter <error|warn|info|all>
/log-analysis <bron> --top <n>
```

## Bronnen

| Bron | Toegang | Wat erin |
|---|---|---|
| Supabase edge-fn | Dashboard → Logs Explorer of `mcp get_logs` | function-name, status, latency, error |
| Supabase Postgres | `cron.job_run_details`, `pg_stat_statements` | cron failures, slow queries |
| Vercel | `vercel logs <deployment>` of dashboard | function errors, build issues |
| Nginx (DO VPS) | `/var/log/nginx/{access,error}.log` | HTTP-traffic, 5xx, slow |
| Sentry | API of dashboard | grouped errors, sessions |
| Browser console | Geen — gebruik Sentry/beacon | client errors |
| Application code | `console.log` → server log capture | custom events |

## Supabase logs analyse

### Top error edge-functions (24u)
```sql
-- via mcp_get_logs of dashboard query
-- Gebruik service: edge-function-logs
SELECT
  function_id,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status_code >= 500) as errors_5xx,
  AVG(execution_time_ms) as avg_latency,
  MAX(execution_time_ms) as max_latency
FROM edge_logs
WHERE timestamp > now() - interval '24 hours'
GROUP BY function_id
ORDER BY errors_5xx DESC
LIMIT 10;
```

### Slow Postgres queries
```sql
SELECT
  query,
  calls,
  total_exec_time / calls as avg_ms,
  total_exec_time as total_ms,
  rows / calls as avg_rows
FROM pg_stat_statements
WHERE total_exec_time / calls > 100  -- >100ms gemiddeld
ORDER BY total_exec_time DESC
LIMIT 20;
```

### Failed cron jobs
```sql
SELECT
  job_name,
  COUNT(*) FILTER (WHERE status = 'failed') as failures,
  COUNT(*) as total,
  MAX(start_time) FILTER (WHERE status = 'failed') as last_failure
FROM cron.job_run_details
WHERE start_time > now() - interval '7 days'
GROUP BY job_name
HAVING COUNT(*) FILTER (WHERE status = 'failed') > 0
ORDER BY failures DESC;
```

## Nginx logs analyse (DO VPS)

```bash
# Top 10 5xx-paths (laatste 1000 requests)
tail -1000 /var/log/nginx/access.log | \
  awk '$9 ~ /^5/ {print $7, $9}' | \
  sort | uniq -c | sort -rn | head -10

# Top 10 slowest endpoints (>1s)
tail -1000 /var/log/nginx/access.log | \
  awk '$NF > 1.0 {print $NF, $7}' | \
  sort -rn | head -10

# Suspicious 4xx clusters (potentiële probing)
tail -10000 /var/log/nginx/access.log | \
  awk '$9 == "404" {print $1, $7}' | \
  sort | uniq -c | sort -rn | head -20
```

## Patterns om naar te zoeken

### Edge function patterns

| Pattern | Diagnose |
|---|---|
| `UNAUTHORIZED_NO_AUTH_HEADER` 401's | Type A fn aangeroepen zonder Bearer JWT |
| `x-api-key === expected` mismatch | Type B fn met stale env-var (zie [[project_pt_auth_audit_april30]]) |
| `Function execution timeout` | Heavy work in fn — verplaats naar `/queue-job` |
| `JWT expired` consistent op 1 user | Refresh-token pipeline kapot |
| Sudden spike na deploy | Recente change brak iets — check git log |

### Postgres patterns

| Pattern | Diagnose |
|---|---|
| `RLS policy violation` | User probeert row die ze niet mogen — kan legit (probing) of bug |
| `lock not available` | Lange transactions blokkeren — check `pg_stat_activity` |
| `out of shared memory` | Te veel concurrent locks of subscriptions — schaal connection-pool |
| Same slow query, varying params | Missing index — voeg toe (zie `/audit-db`) |

### Browser/client patterns

| Pattern | Diagnose |
|---|---|
| `Failed to fetch` clusters | Network-issue specifieke ISP, of CORS |
| `ChunkLoadError` | Deploy invalidated bundle — gebruiker had oude versie open |
| `TypeError: x is undefined` | Race condition tussen render en data-load |
| `Quota exceeded` | localStorage vol — clear-strategy |

## Output structure

```markdown
# Log-analyse — <bron> — laatste 24u

## Volume
- Total events: 12,847
- Errors (5xx): 234 (1.8%)
- Avg latency: 187ms

## Top issues (frequency × impact)

### #1 — sync-ghl-sales: 89 × 401 (gateway-block)
- File: `supabase/functions/sync-ghl-sales/index.ts`
- Root cause: Type A fn, n8n-webhook caller stuurt geen Bearer
- Impact: lead-data niet gesync'd 24u
- Fix: voeg Authorization Bearer in n8n webhook config OF zet verify_jwt=false
- Effort: S

### #2 — POST /api/offerte-check/submit: 12 × 500 (server_misconfigured)
- ...

## Patterns
- 5xx-spike om 03:14 → correleert met cron `daily-publisher`
- Same lead-id retried 7× → idempotency niet werkend?

## Suggested action
1. Fix #1 nu (impact hoog)
2. Onderzoek #2 — niet kritiek maar storend
3. Audit cron `daily-publisher` retry-logica
```

## Tools

### Supabase MCP
```bash
# Via Claude Code MCP
mcp__claude_ai_Supabase__get_logs <project_id> --service edge-function
```

### Real-time tail
```bash
# Vercel
vercel logs --follow

# DO VPS
ssh root@165.232.82.71 "tail -f /var/log/nginx/error.log"

# Supabase
# Dashboard → Logs Explorer (geen CLI alternative)
```

### Long-tail aggregation

Voor patronen over 7-30d: dump logs naar BigQuery / DuckDB / lokaal SQLite, query daar.

## Combineer met
- `/incident` — bij actuele uitval
- `/audit-db` — voor performance-pattern in slow queries
- `/audit-server` — voor VPS-niveau logs
- `/error-boundary` — fix root cause client-side
