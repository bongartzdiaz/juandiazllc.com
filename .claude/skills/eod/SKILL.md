---
name: eod
description: End-of-day wrap-up — dag samenvatten naar logboek, git commits over alle repos, optioneel Slack-update voor Roy, memory updates. Gebruik aan einde werkdag om sessie netjes af te sluiten.
trigger: /eod
---

# /eod

End-of-day shutdown ritueel.

## Usage

```
/eod                    # full wrap
/eod --quick            # alleen logboek + commit
/eod --slack-roy        # incl. Slack-update voor Roy
```

## Flow

### 1. Verzamel wat is er vandaag gedaan
- Git log (alle repos) — commits door Juan + agents vandaag
- Memory updates vandaag (filenames met datum vandaag)
- Vault notes created/modified vandaag
- Resolved tickets / closed PRs

### 2. Stel logboek voor
Schrijf concept naar `logboek_<YYYY-MM-DD>.md`:

```markdown
---
name: Logboek <datum>
description: <1-zin samenvatting belangrijkste werk vandaag>
type: project
---

# <datum> — <hoofdthema>

## Wat gedaan
- [bullet per concrete actie/output]
- [met file paths waar relevant]

## Beslissingen
- [niet-obvious choices]

## Open
- [wat blijft staan voor morgen]

## Volgende stap
[1-2 zin]
```

Tonen aan Juan voor approval voor save.

### 3. Git commits
Per repo met uncommitted changes:
- `git status` overview
- Vraag: commit message? (suggereer op basis van diff)
- Push? (ja/nee per repo)

NOOIT auto-commit zonder confirm. NOOIT --no-verify.

### 4. Memory cleanup
- Stale items vandaag aangemaakt die obsolete zijn (vraag)
- Update reference_* memories die bewogen zijn (vraag)

### 5. Vault sync
- Indien vault git: status check + voorstel commit
- Indien lokaal: reminder om manueel sync te doen

### 6. Slack update voor Roy (--slack-roy)
Format:
```
EOD <datum>

✓ Done:
- ...

→ Tomorrow:
- ...

⚠ Blocked / wacht op:
- ...
```

In jouw stijl (kort, geen emojis, B1).

### 7. Tomorrow stub
Voorstel: schrijf `daily-2026-MM-DD.md` (volgende dag) met top 3 prio voor `/morning` om op te pikken.

## Output format

```
═══ EOD — vrijdag 2026-05-02 ═══

VERZAMELD
Commits: N over X repos
Memories: N created/updated
Vault notes: N modified
Closed: N PRs, N tickets

LOGBOEK CONCEPT
[volledig concept getoond, vraag approval]

UNCOMMITTED CHANGES
- repo-A: N files (suggested msg: "...")
- repo-B: N files (suggested msg: "...")

MEMORY HOUSEKEEPING
Stale candidates: N (vraag per item)

[indien --slack-roy]
SLACK UPDATE CONCEPT
[concept]

[indien tomorrow stub gewenst]
TOMORROW PRIO
1. ...
2. ...
3. ...
```

## Hard rules
- NOOIT zonder confirm committen
- Logboek altijd absoluut datums
- Slack updates respecteren writing-skill regels (helderheid, geen emojis)
- Memory hooks alleen na approval
