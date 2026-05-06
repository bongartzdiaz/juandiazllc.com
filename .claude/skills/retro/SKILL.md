---
name: retro
description: Sprint/sessie retrospective format — wat ging goed, wat niet, wat leren we, actiepunten met owner. Pulls van git/memory/audit voor data. Gebruik aan einde week, na grote release, na incident, of maandelijks.
trigger: /retro
---

# /retro

Retrospective generator.

## Usage

```
/retro                          # week retro
/retro --period sprint          # 2 weken
/retro --period month
/retro --scope project=PT       # 1 project
/retro --post-incident <ref>    # specifiek incident
```

## Inputs (auto-pull)
- Git commits laatste periode (alle repos)
- Logboeken in memory laatste periode
- Audit findings opgelost vs nieuwe
- Deploys (success vs rollbacks)
- Incidents
- Lead pipeline trend
- Ranking trend
- Project_status delta

## Format

```markdown
# RETRO — periode 2026-04-26 tot 2026-05-02

## Wat is er gebeurd (data)
- N commits over N repos
- N deploys (N rollbacks)
- N incidents
- N artikelen gepubliceerd
- Leads: N (±N% vs vorige)
- Avg ranking: X.X (±X.X)

## Wat ging goed (Keep)
- ...

## Wat ging niet goed (Drop / Improve)
- ...

## Wat leren we (Insights)
- ...

## Patterns (recurring issues?)
- ...

## Actiepunten
| Wat | Wie | Deadline | Hoe meetbaar |
| ... | Juan/Roy/Noah | ... | ... |

## Niet doen
- ...

## Memory updates
- Save: feedback_<...> (als nieuwe lessen)
- Save: project_retro_<datum>.md (deze retro zelf)
```

## Hard rules
- Zoek naar PATRONEN (zelfde fout 3x = systemisch, fix proces)
- Geen schuld-gericht — process focus
- Actiepunten ALTIJD met owner + deadline (anders schrap ze)
- ALTIJD naar memory wegschrijven
- Verbind met vorige retro: zijn die acties opgepakt?
