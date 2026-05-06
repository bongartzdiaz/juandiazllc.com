---
name: nexus-status
description: NEXUS BOS server health check (pm2 status, 13 agents, 6-uurs cyclus, escalatie level, Supabase queue). Gebruik wanneer Juan wil weten of agents lopen, server gezond is, of na een crash.
trigger: /nexus-status
---

# /nexus-status

NEXUS BOS health-check volgens CLAUDE.md §4 + §11.

## Usage

```
/nexus-status              # full health
/nexus-status --agent <naam>
/nexus-status --quick      # alleen pm2 + Supabase queue
```

## Checks

### 1. Server (DO VPS 64.225.74.36)
```bash
ssh root@64.225.74.36
pm2 status
pm2 logs --lines 50 --nostream
df -h
free -m
```

### 2. Agents (13 totaal)
| Agent | Verwacht actief | Laatste run |
|---|---|---|
| Manager | ✓ | - |
| Strateeg | ✓ | - |
| Speurder | ✓ | - |
| Schrijver | ✓ | - |
| Publisher | ✓ | - |
| Designer | ✓ | - |
| Netwerker | ✓ | - |
| Technicus | ✓ | - |
| Analist | ✓ | - |

### 3. Cyclus tijden (6-uurs: 00/06/12/18)
- Volgende cyclus: [tijd]
- Vorige cyclus: alle 9 voltooid? J/N

### 4. Supabase queue
```sql
SELECT status, COUNT(*) FROM articles GROUP BY status;
SELECT id, title_tag, created_at FROM articles
WHERE status = 'pending_review'
ORDER BY created_at ASC LIMIT 10;
```

### 5. Escalatie level
- Level 1 (normaal): geen actie
- Level 2 (aandacht): ranking -3/-5, deadline gemist <24u
- Level 3 (urgent): ranking <-5, site down, concurrent publiceert
- Level 4 (kritiek): Google penalty, multi-agent failures

## Output

```
NEXUS STATUS — [datum tijd]

═══ SERVER ═══
PM2: N processes, N online
RAM: X MB / 8 GB
Disk: X% used
Last restart: [tijd]

═══ AGENTS ═══
[✓] Manager / [✓] Strateeg / [✓] Speurder / ...
Failed: [lijst indien]

═══ CYCLUS ═══
Vorige (00/06/12/18): [N/9 voltooid]
Volgende: [tijd]

═══ SUPABASE QUEUE ═══
pending_review: N
published_today: N
draft: N

═══ ESCALATIE LEVEL ═══
[1-4] — [reden indien >1]

═══ ACTIEPUNTEN ═══
1. ...
```

## Hard rules
- Bij Level 3+: alert naar Juan suggereren
- Bij Level 4: pause team voorstellen
- Skills installatie check: `ls /root/.claude/skills/` (zie §10 voor verwachte set)
