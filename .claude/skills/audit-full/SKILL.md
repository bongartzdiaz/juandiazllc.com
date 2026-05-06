---
name: audit-full
description: Complete 360° audit van alle systemen — sites, server, database, repos, ads, leads, vault, memory. Gebruik wanneer Juan een totaaloverzicht wil, voor een wekelijkse/maandelijkse health-check, of na een incident.
trigger: /audit-full
---

# /audit-full

Complete 360° NEXUS BOS / HMB / PT health audit.

## Usage

```
/audit-full                    # alle scopes
/audit-full --scope sites,db   # alleen geselecteerde scopes
/audit-full --quick            # top-10 issues per scope
/audit-full --since 7d         # alleen wijzigingen laatste N dagen
```

## Scopes (12 totaal)

Run elk in volgorde, rapporteer per scope met `[OK | WARN | FAIL | N findings]`.

### 1. Sites (`/audit-site` per domein)
- helpmijbesparen.nl
- salderingsregeling2027.nl
- voltafy.nl
- performancetracker.nl
- besparenbelgie.online

### 2. Server (`/audit-server`)
- NEXUS BOS VPS (64.225.74.36)
- HMB site VPS (165.232.82.71)

### 3. Database (`/audit-db`)
- Supabase: tables, RLS, advisors, slow queries, missing indexes
- pg_cron jobs status

### 4. Repos (`/audit-repos`)
- bongartzdiaz/* en mistersocial99/*
- Open PRs, stale branches, CI status, vulnerable deps

### 5. Ads & Pipeline (`/audit-ads`)
- Meta Ads account 932039344875575
- DM Champ pipeline conversie
- GHL workflows live

### 6. Content (`/audit-content`)
- Pending review queue
- Recent rankings (Ahrefs)
- Content cannibalization
- Topic cluster gaps

### 7. Leads (`/audit-leads`)
- Stuck leads (>7d geen follow-up)
- Failed sync GHL ↔ Supabase
- WhatsApp gesprekken zonder afsluiting

### 8. Edge functions
- Status van alle edge functions
- Failed invocations laatste 24u
- Auth pattern compliance (Type A/B)

### 9. Vault (`/vault-check`)
- Broken wikilinks
- Orphan notes
- Untagged notes
- Sync status

### 10. Memory (`/memory-audit`)
- Stale memories
- Duplicate entries
- Dead file references in MEMORY.md

### 11. Security
- Hardcoded secrets sweep (alle repos)
- Recent advisor warnings (Supabase)
- USING(true) RLS policies
- Failed auth attempts

### 12. Cost & quota
- Supabase usage vs plan
- Meta Ads spend pace
- Anthropic API usage
- DigitalOcean billing

## Output format

```
═══════════════════════════════════════
  AUDIT FULL — 2026-05-02
═══════════════════════════════════════

OVERALL HEALTH: [GREEN | YELLOW | RED]
Total findings: N (kritiek: N, high: N, med: N, low: N)

┌─ 1. SITES ─────────────── [WARN — 4 findings]
│  helpmijbesparen.nl: ✓ live, 1 SEO issue
│  voltafy.nl: ⚠ 2 broken images
│  ...
├─ 2. SERVER ────────────── [OK]
│  NEXUS VPS: 32% RAM, 67% disk
│  HMB VPS: 18% RAM, 41% disk
├─ 3. DATABASE ──────────── [WARN — 3 findings]
│  79 advisor warnings (was 120)
│  2 USING(true) policies
│  ...
[per scope]

═══ TOP 10 PRIORITEITEN ═══
1. [KRITIEK] ...
2. [KRITIEK] ...
3. [HIGH] ...
...

═══ MEMORY UPDATE VOORSTEL ═══
Sla op als project_audit_<datum>.md:
[summary]

═══ VOLGENDE ACTIES ═══
Nu: ...
Deze week: ...
Backlog: ...
```

## Hard rules
- Schrijf bevindingen ALTIJD weg in memory na voltooiing (`/memory-save`)
- Bij KRITIEK finding: Slack-bericht aan Juan suggereren
- Vergelijk met vorige audit (zoek meest recente `project_audit_*.md` in memory)
- Run scopes parallel waar mogelijk om tijd te besparen

## Memory check
Lees: meest recente project_audit_*, project_pt_security_todo, project_status_*
