---
name: audit-db
description: Diepe Supabase database audit — RLS policies, advisor warnings, slow queries, missing indexes, table bloat, pg_cron jobs, migrations drift. Gebruik wanneer Juan database health wil checken, vóór een release, of bij performance issues.
trigger: /audit-db
---

# /audit-db

Grondige Supabase database audit (alle projecten).

## Usage

```
/audit-db                       # alle projecten
/audit-db --project <ref>       # specifiek project
/audit-db --scope rls,perf      # alleen geselecteerde checks
/audit-db --since 7d            # alleen wijzigingen
```

## Checks (10)

### 1. Supabase advisor warnings
Via `mcp__claude_ai_Supabase__get_advisors`:
- Security advisors (count + lijst per severity)
- Performance advisors (count + top issues)
- Vergelijk met vorige audit (was 120 → 79 op 30 apr)

### 2. RLS policies
```sql
-- USING(true) detection (CRITICAL)
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE qual ~* 'true' AND length(qual) < 20;

-- Tables zonder RLS enabled
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relname = tablename AND c.relrowsecurity = true
  );

-- Policies per tabel (te veel = complex)
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;
```

### 3. Slow queries
Via `pg_stat_statements`:
- Top 20 queries op total_time
- Top 20 op mean_time (consistent slow)
- Queries met lage cache hit ratio

### 4. Missing indexes
- Foreign keys zonder index
- Columns gebruikt in WHERE/JOIN zonder index (top 10)
- Unused indexes (kandidaten voor cleanup)

### 5. Table health
- Bloat (dead tuples per tabel)
- Largest tables (size + row count)
- Vacuum/analyze status (laatste run)
- Tables zonder primary key

### 6. pg_cron jobs
```sql
SELECT jobid, jobname, schedule, command, active, last_run
FROM cron.job
LEFT JOIN cron.job_run_details ON jobid = jobid;
```
- Failed jobs laatste 24u
- Jobs die niet draaien (active=false)
- Cron syntax check (zie project_april24_fix_sweep)
- pg_net headers: jsonb, NIET ARRAY (feedback_pg_net_jsonb_headers)

### 7. Migrations drift
Via `mcp__claude_ai_Supabase__list_migrations`:
- Lokale migrations vs remote
- Pending migrations
- Out-of-order applied

### 8. Edge functions
Via `mcp__claude_ai_Supabase__list_edge_functions`:
- Status per functie
- Failed invocations
- Auth pattern (Type A/B compliance)

### 9. Storage
- Buckets + size + RLS
- Orphan files
- Public buckets check

### 10. Backups & PITR
- Recent backup timestamp
- Point-in-time recovery enabled?
- Branch databases status

## Output

```
DB AUDIT — <project-ref> — 2026-05-02

═══ ADVISORS ═══
Security: N (was N) [DELTA ±N]
Performance: N (was N) [DELTA ±N]
Top 5 critical: ...

═══ RLS ═══
USING(true) policies: N [KRITIEK indien >0]
Tables zonder RLS: N
Lijst: ...

═══ SLOW QUERIES (top 5) ═══
1. <query snippet> — N ms avg, N calls
...

═══ MISSING INDEXES ═══
1. <table>.<col> (FK zonder index)
...

═══ TABLE HEALTH ═══
Bloated tables: N
Largest: <tabel> — N MB, N rows
Never vacuumed: N

═══ PG_CRON ═══
Active jobs: N
Failed last 24h: N
Disabled: N

═══ MIGRATIONS ═══
Pending: N
Applied: N
Drift: ✓/✗

═══ EDGE FUNCTIONS ═══
Live: N | Failing: N
Auth issues: N

═══ STORAGE ═══
Buckets: N | Total size: N MB
Public buckets: N (controleer!)

═══ BACKUPS ═══
Last backup: [tijd]
PITR: enabled/disabled

═══ TOP 10 PRIORITEITEN ═══
1. [KRITIEK] ...
...

═══ MEMORY UPDATE ═══
project_db_audit_<datum>.md
```

## Hard rules
- USING(true) policies = KRITIEK, ALTIJD escaleren
- Failed pg_cron = HIGH priority
- pg_net calls: jsonb headers (zie feedback_pg_net_jsonb_headers)
- ALTIJD memory updaten + vergelijken met vorige audit
