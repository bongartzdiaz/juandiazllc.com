---
name: standup-roy
description: Genereer een korte standup-update voor Roy in Juan's stijl — wat gisteren, wat vandaag, blockers. Pulls van git + memory + ticket activity. Gebruik wanneer Juan snel Roy wil bijpraten.
trigger: /standup-roy
---

# /standup-roy

Korte standup-update voor Roy (operations partner).

## Usage

```
/standup-roy             # gisteren → vandaag → blockers
/standup-roy --since 3d  # langer terug
/standup-roy --slack     # geformatteerd voor Slack DM
```

## Wat Roy nodig heeft

Roy is operations. Hij wil weten:
- Wat moet hij vandaag in het dashboard checken
- Welke escalaties wachten op zijn actie
- Welke handmatige goedkeuringen er liggen (bv. content publish)
- Of er server/infra werk is dat hij moet oppakken

Niet relevant voor Roy:
- Strategische beslissingen (Juan's domein)
- Lead-specifieke content (privacy)
- Investment / persoonlijke zaken

## Flow

### 1. Verzamel
- Git commits Juan laatste 24u (titles, niet diffs)
- Memory updates type project laatste 24u
- Open items uit gisteren's logboek
- Pending review queue count
- Open level-2/3 escalaties

### 2. Categoriseer per actie-eigenaar
- **Voor Roy direct**: dashboard checks, escalaties, approvals
- **Samen**: items die afstemming vereisen
- **Info only**: context, geen actie nodig

### 3. Format

```
GISTEREN (Juan):
- [output 1]
- [output 2]

VANDAAG (Juan):
- [plan top 3]

VOOR JOU (Roy):
- [actiepunt 1] — [waar/hoe]
- [actiepunt 2]

WACHT OP:
- [externe afhankelijkheid]

ALERTS:
- [level-3 escalaties indien aanwezig]
```

Stijl:
- Kort, korte zinnen
- B1, geen vakjargon zonder uitleg
- Geen emojis
- Concrete pointers (file path, dashboard URL, lead naam) waar relevant
- 5-12 regels totaal — niet langer

## Hard rules
- Geen confidential lead data zonder reden
- Geen finance details (Trade Republic etc.)
- Roy heeft geen toegang tot Juan's persoonlijke memory — geen verwijzingen daarnaar
- Bij blockers: noem wie de bal heeft, niet vaag "wachten op iets"

## Memory check
Lees: gisteren's logboek_*, project_status_*, open level-2/3 items
