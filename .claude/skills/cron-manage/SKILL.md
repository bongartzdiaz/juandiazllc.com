---
name: cron-manage
description: Beheer alle scheduled jobs over systemen (pg_cron, system cron, GitHub Actions, GHL workflows, Supabase scheduled fns) — list, add, remove, debug. Gebruik wanneer Juan iets wil schedulen of crons wil debuggen.
trigger: /cron-manage
---

# /cron-manage

Unified cron management across systemen.

## Usage

```
/cron-manage list                          # alles
/cron-manage list --system pg              # pg_cron only
/cron-manage add <naam> <schedule> <action>
/cron-manage remove <naam>
/cron-manage debug <naam>                  # last runs + errors
/cron-manage test <naam>                   # trigger now
```

## Systemen

### 1. pg_cron (Supabase)
```sql
SELECT jobid, jobname, schedule, command, active
FROM cron.job ORDER BY jobname;
```
Hard rule: pg_net `http_post` MOET jsonb headers, NIET `ARRAY::net.http_header` (feedback_pg_net_jsonb_headers).
Hard rule: cron syntax check (project_april24_fix_sweep had cron syntax fix).

### 2. System cron (NEXUS VPS, HMB VPS)
- `crontab -l`
- `/etc/cron.d/`, `/etc/cron.daily/`, etc.

### 3. GitHub Actions (scheduled workflows)
- `.github/workflows/*.yml` met `schedule:` trigger
- Beware: project_daily_seo_publisher geblokkeerd op billing

### 4. NEXUS BOS 6-uurs cyclus
- 00/06/12/18 (CLAUDE.md §4)
- per agent

### 5. Supabase Edge Functions met schedule
- `mcp__claude_ai_Supabase__list_edge_functions`

### 6. GHL workflows (time-based triggers)
- Via /ghl-sync-check

## Output (list)

```
SCHEDULED JOBS — 2026-05-02

═══ PG_CRON (PT, HMB, NEXUS) ═══
| Job | Schedule | Last run | Active |
| quality-scorer | */15 * * * * | 14:30 ✓ | yes |
| evaluate-canaries | 0 9 * * * | 09:00 ✓ | yes |
| prompt-optimizer | 0 3 * * 0 | sun ✓ | yes |
| daily-health-check | 30 8 * * * | 08:30 ✓ | yes |
...

═══ SYSTEM CRON (NEXUS VPS) ═══
| Schedule | Command | Last |
...

═══ GH ACTIONS ═══
| Repo / Workflow | Schedule | Last status |
| daily-seo-publisher | 0 5 * * * | BLOCKED (billing) |
...

═══ NEXUS AGENTS ═══
00:00 ✓ | 06:00 ✓ | 12:00 ✓ | 18:00 ✓
Volgende: 18:00

═══ ISSUES ═══
- daily-seo-publisher: GitHub Actions billing
- ...
```

## Add (vereist confirm)
- Valideer cron syntax (5 vs 6 fields, NL timezone DST)
- Voor pg_cron: jsonb headers in pg_net calls
- Memory: log naar `project_crons_<jaarmaand>.md`

## Hard rules
- NOOIT cron remove zonder confirm
- pg_net altijd jsonb headers
- DST awareness (project_robustness_setup heeft DST routine)
- Bij nieuwe cron: voeg toe aan documentation
