---
name: handoff
description: Genereer handoff-doc bij overdracht van werk naar Roy, Noah, een adviseur, of vrij contractor. Bevat context, status, openstaande items, credentials-pointers en next steps. Gebruik vóór vakantie, sprint-handoff, of nieuwe teamlid onboarding.
trigger: /handoff
---

# /handoff

Handoff document generator.

## Usage

```
/handoff <project> --to <persoon>
/handoff <project> --to <persoon> --type vacation|onboarding|task|incident
/handoff <project> --duration "2 weken"
```

## Per-type templates

### vacation (Juan weg)
- Wat loopt er
- Wie pakt wat op
- Decision-rights tijdens afwezigheid
- Emergency contact + escalatie
- Geen-go beslissingen ("doe NIET zonder mij")

### onboarding (nieuwe teamlid)
- Project overview + waarom
- Hoe access vragen (1Password / GHL / Supabase)
- Wie is wie
- Eerste week takenlijst
- Documentatie-pointers (CLAUDE.md, vault, repos)

### task (specifiek werk doorgeven)
- Wat moet er gebeuren
- Waarom (business reason)
- Wat is al gedaan
- Wat is volgende stap
- Hoe te valideren
- Deadline + escalatie

### incident (mid-incident handoff)
- Wat is stuk
- Wat is geprobeerd
- Wat lijkt het probleem
- Volgende stappen
- Logs/contexten waar te kijken

## Output structuur

```markdown
# HANDOFF — <project>
Van: Juan
Aan: <persoon>
Type: <type>
Datum: 2026-05-02
Duur: <indien vacation>

## Context (waarom dit nu speelt)
...

## Status nu
- ✓ Gedaan
- 🔄 Loopt
- ⏸ Wacht op
- ✗ Geblokkeerd

## Openstaande items (geprioriteerd)
1. [HIGH] ...
2. [MED] ...
3. [LOW] ...

## Beslissingen die jij mag nemen
- ...

## NIET zonder Juan
- ...

## Toegang
- 1Password: <vault naam>
- GHL: <welke sub-account>
- Supabase: <project ref>
- Repo: <github>

## Wie te contacteren
- Bij A → ...
- Bij B → ...
- Spoed → Juan +316XXXXXXXX

## Memory pointers
- [project_X.md](...)
- [logboek_recent.md](...)

## Eerste actie
**Doe vandaag:** ...
```

## Hard rules
- Bot-regels (geen prijzen, 3x-nee, etc.) ALTIJD documenteren bij sales handoffs
- NIET wachtwoorden plain in doc — alleen 1Password vault verwijzingen
- NIET PII van leads in handoff doc
- Bij /handoff vacation: ook /backup runnen vóór vertrek
- Memory: log naar `project_handoffs_<jaarmaand>.md` (wie kreeg wat, datum)
