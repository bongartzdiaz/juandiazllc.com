---
name: morning
description: Start-of-day briefing voor Juan — pm2 status + Ahrefs deltas + pending review queue + stuck leads + level-3 escalaties + agenda. Gebruik 's ochtends rond 08:30 om de dag te starten zonder handmatig rondje langs systemen.
trigger: /morning
---

# /morning

Start-of-day briefing. Vervangt het handmatige rondje langs alle systemen.

## Usage

```
/morning              # volledige briefing
/morning --quick      # alleen rode/oranje items
/morning --slack      # output formatted voor Slack post
```

## Flow (parallel waar mogelijk)

### 1. Server health (10s)
- `pm2 status` op NEXUS VPS (64.225.74.36)
- Failed processes? Restart counts hoog?
- Disk + RAM headline

### 2. Agent cyclus (5s)
- Laatste 6-uurs cyclus tijd (00/06/12/18)
- 13 agents allemaal gerunned in laatste cyclus?
- Manager-rapport van vannacht aanwezig?

### 3. Content queue (5s)
```sql
SELECT COUNT(*) FROM articles WHERE status = 'pending_review';
```
- Aantal artikelen wachtend op review
- Oudste pending (review backlog?)

### 4. Ahrefs deltas (15s)
Via `mcp__claude_ai_Ahrefs__rank-tracker-overview`:
- Top 5 stijgers laatste 24u (>3 posities)
- Top 5 dalers laatste 24u (<-3 posities)
- Level 2/3 escalatie triggers

### 5. Stuck leads (10s)
- Bot >48u stil
- Terugbellen overdue
- Buitendienst <24u zonder confirm
- Top 3 lijst met telefoon + naam

### 6. Yesterday's spend (5s)
- Meta Ads spend gisteren (account 932039344875575)
- vs daggemiddelde week
- Top campaign

### 7. Open PRs / commits gisteren
- Open PRs over alle bongartzdiaz/* repos
- Commits gisteren (Juan + agents)

### 8. Vandaag op agenda
- Vault: zoek `daily-2026-05-02.md` of agenda note
- Geen agenda? Voorstel doe `/vault-note daily`

## Output format

```
═══════════════════════════════════════
  MORNING BRIEFING — vrijdag 2026-05-02
═══════════════════════════════════════

OVERALL: [GREEN | YELLOW | RED]

─ SERVER ─
NEXUS VPS: pm2 N online | RAM X% | Disk X%
[issues if any]

─ AGENT CYCLE ─
Laatste cyclus: HH:00 ✓ (N/13 agents OK)
Manager-rapport: ✓ aanwezig / ✗ ontbreekt

─ CONTENT ─
Pending review: N (oudste: N dagen)
Vandaag te publiceren als goedgekeurd: N

─ RANKINGS (24u) ─
Stijgers: <kw> +N | <kw> +N
Dalers:   <kw> -N | <kw> -N
[escalatie level 3 indien dalingen >5]

─ LEADS ─
Stuck: N totaal
1. <naam> <tel> — bot stil sinds <tijd>
2. ...

─ ADS ─
Spend gisteren: €X (avg €Y)
Top campaign: <naam>

─ REPOS ─
Open PRs: N (oldest <repo> N dagen)
Commits gisteren: N

─ AGENDA VANDAAG ─
[vanuit vault daily note of agenda]

═══ TOP 3 ACTIES VANDAAG ═══
1. ...
2. ...
3. ...
```

## Hard rules
- Snel — onder 30 seconden total
- Bij level-3 escalatie: highlight rood + Slack-suggestie
- Lees altijd: meest recente logboek_*, project_status_*
- Bij geen agenda: doe NIET zelf de planning, vraag Juan
