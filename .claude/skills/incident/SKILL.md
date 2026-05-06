---
name: incident
description: Incident response workflow — triage scope, communicatie, fix path, postmortem skeleton. Gebruik wanneer iets stuk is in productie (site down, lead pipeline broken, edge function failing, ranking crash).
trigger: /incident
---

# /incident

Gestructureerde incident response. Output: gerichte actie, niet paniek.

## Usage

```
/incident <symptoom>
# vb: /incident helpmijbesparen 500 errors
# vb: /incident DM Champ webhook timeouts
# vb: /incident ranking crash thuisbatterij keywords
```

## Severity classificatie (eerste vraag)

| Sev | Definitie | Response time |
|---|---|---|
| **SEV-1** | Site / pipeline volledig down, leads worden gemist, security breach | Direct actie, alles laten vallen |
| **SEV-2** | Partial outage, conversie significant impact, data integrity risk | Binnen 1 uur |
| **SEV-3** | Degraded performance, fixable workaround beschikbaar | Binnen werkdag |
| **SEV-4** | Cosmetic, klein subset users, geen impact funnel | Backlog |

## Flow

### Fase 1 — Triage (2 min)
Vragen aan Juan:
1. Sinds wanneer? (exact tijdstip indien bekend)
2. Hoeveel users/leads getroffen?
3. Wat is de laatste change? (deploy, schema, config)
4. Reproduceerbaar?

Bepaal severity. Schrijf in incident-status formaat.

### Fase 2 — Containment (parallel)
- **Stop the bleed**: rollback laatste deploy via `/rollback`?
- **Mitigate**: feature flag uit, rate limit aan, scale up?
- **Communicate**: status page update? Slack alert? GHL pause?

### Fase 3 — Diagnose
Diagnostic checklist (parallel uitvoeren):
- Server logs (pm2 logs, journalctl)
- Edge function logs (Supabase)
- Database advisors
- Recente git commits (laatste 4u)
- Recente schema migrations
- pg_cron failed jobs
- Network reachability
- DNS / SSL / WAF

### Fase 4 — Fix
- Quick fix (revert, hotfix, config change) vs root-cause fix
- Test in staging indien mogelijk
- Deploy via `/hotfix` (nieuwe rollback-tag!)
- Verify met smoke test

### Fase 5 — Postmortem
Schrijf concept naar `project_incident_<YYYY-MM-DD>_<topic>.md`:

```markdown
---
name: Incident <datum> <topic>
description: <severity> incident — <1-zin samenvatting wat brak en wat fix was>
type: project
---

# Incident — <datum>

**Severity**: SEV-N
**Duration**: <tijd> (<start> → <end>)
**Impact**: <leads/users/revenue>
**Root cause**: <1-2 zin>

## Timeline
- HH:MM — detected: <hoe>
- HH:MM — confirmed scope
- HH:MM — mitigation: <wat>
- HH:MM — fix deployed
- HH:MM — verified resolved

## Wat ging fout
[technical detail, geen blame]

## Wat ging goed
[snel detected? goede monitoring? rollback werkte?]

## Preventie
- [actie 1] — owner — deadline
- [actie 2] — owner — deadline

## Lessons
[niet-obvious learnings]
```

## Output format

```
═══ INCIDENT — <symptoom> ═══

SEVERITY: SEV-N
Started: <tijd> (<X min ago>)
Impact: <scope>

═ CONTAINMENT ═
[ ] Rollback overwogen
[ ] Communication sent
[ ] Mitigation applied

═ DIAGNOSE ═
Checked: [list]
Findings: [list]
Root cause hypothesis: ...

═ FIX PLAN ═
1. ...
2. ...
3. ...

═ NEXT ═
[wat moet Juan/jij nu doen]
```

## Hard rules
- SEV-1: geen lange diagnose vóór mitigation — eerst stop bleed
- ALTIJD postmortem schrijven, ook bij quick fix
- Geen blame, focus op systemen
- Memory save verplicht na resolve
- Bij security breach: aparte protocol (notify Juan ÉN check secrets rotation)

## Memory check
Lees: project_incident_*, project_pt_security_todo, recente logboek_*
