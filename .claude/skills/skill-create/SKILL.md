---
name: skill-create
description: Meta-skill — bouwt nieuwe Claude Code skills volgens Juan's conventies (frontmatter, hard rules, memory hooks, output format). Voorkomt inconsistente skills en versnelt skill-bouw. Gebruik wanneer je een nieuwe skill wilt toevoegen aan de collectie.
trigger: /skill-create
---

# /skill-create

Bouw nieuwe skills consistent met de bestaande ~80-skills collectie.

## Usage

```
/skill-create <naam> <doel>
# vb: /skill-create video-edit "Knip en edit video clips voor social"
# vb: /skill-create roy-onboard "Onboarding flow voor nieuwe adviseurs"
# vb: /skill-create xyz "..."
```

## Locatie

Skills wonen in: `C:\Users\LENOVO\.claude\skills\<naam>\SKILL.md`

Naam-conventies:
- lowercase
- kebab-case (geen underscores)
- max 25 chars
- start met categorie indien meerdere: `audit-X`, `design-X`, `vault-X`

## Verplichte structuur

```markdown
---
name: <naam>
description: <1 zin wat skill doet> + <wanneer gebruiken>. <Wat het NIET is> indien overlap-risk.
trigger: /<naam>
---

# /<naam>

<1-2 zin doel statement>

## Usage

\`\`\`
/<naam> <args>
# vb: ...
# vb: ...
\`\`\`

## <Hoofd-secties>

[content]

## Output format

\`\`\`
[concrete output template]
\`\`\`

## Hard rules
- [non-negotiable 1]
- [non-negotiable 2]
- [memory hook indien van toepassing]

## Memory check
Lees: <relevante memory files>
```

## Frontmatter regels

### `name`
Same als folder naam. Lowercase kebab-case.

### `description`
Critische — hier bepaalt Claude of skill triggert.
Format:
```
<wat het doet — actief, concrete output>. <Wanneer gebruiken — concrete situatie/trigger>. <Wat het NIET is, indien overlap-risk met bestaande skill>.
```

Voorbeelden van goede descriptions (uit bestaande):
- "Diepe Supabase database audit — RLS policies, advisor warnings, slow queries, missing indexes, table bloat, pg_cron jobs, migrations drift. Gebruik wanneer Juan database health wil checken, vóór een release, of bij performance issues."
- "Re-engagement WhatsApp messaging voor stuck leads volgens NEXUS BOS bot regels (3x-nee, geen AI onthullen, geen prijzen, alleen call verkopen). Output is messages voor DM Champ — Juan triggert de send. Gebruik bij batch stuck leads of na audit-leads."

Slechte descriptions:
- "Helpful skill" — te vaag
- "Generates content" — overlap met 10 anderen
- "Use when needed" — wanneer dan

### `trigger`
Slash-command equivalent: `/<naam>`. Optioneel — wordt automatisch afgeleid van name.

## Hard rules per skill (verplicht checken)

### Compliance hooks (HMB-content skills)
Als skill content genereert voor publicatie:
- [ ] Geen prijsgaranties regel ergens in skill
- [ ] Geen concurrent-namen regel (CLAUDE.md §2)
- [ ] Geen emojis regel
- [ ] B1 niveau requirement
- [ ] Bron-vereiste voor data-claims
- [ ] Pending_review status default (geen direct publish)

### Sales funnel respect
Als skill lead-touchpoints raakt:
- [ ] 3-stappen funnel (CLAUDE.md §5) — geen skip
- [ ] 3x-nee regel
- [ ] Geen AI-onthulling voor bot
- [ ] Geen direct buitendienst-aanbod

### Memory hooks
- [ ] Output schrijft naar memory waar relevant (`project_*` of `logboek_*`)
- [ ] Read relevante memory bij start
- [ ] Datums absoluut, niet relatief

### Privacy / security
- [ ] Geen PII in algemene memories (alleen specifieke debug)
- [ ] Geen secrets in skill body
- [ ] Geen download-instructies zonder confirm

## Output format regels

Elke skill heeft een **vast output format** zodat outputs herkenbaar zijn:

```
═══ <SKILL-NAME> — <subject> ═══

[secties met ═ separators]

═ TOP X ACTIES ═
1. ...
2. ...

═ MEMORY UPDATE ═
[wat naar memory schrijven]
```

Inconsistente outputs = lastig te scannen.

## Decision tree: nieuwe skill of bestaande?

```
Wil je iets bouwen?
├─ Bestaat er een skill die dit raakt?
│   ├─ Ja → kan ik description aanpassen om deze use case te dekken?
│   │   ├─ Ja → update bestaande skill ipv nieuwe
│   │   └─ Nee → maar overlap is groot → overweeg flag/arg toevoegen
│   └─ Nee → ga door
├─ Is dit recurring? (>3x per maand verwacht)
│   ├─ Nee → handmatig vragen, geen skill nodig
│   └─ Ja → ga door
├─ Is de output gestructureerd / herhaalbaar?
│   ├─ Nee → geen goede skill (te free-form) → use general writing/brainstorm
│   └─ Ja → BOUW SKILL
```

## Flow

### 1. Validate
- Naam beschikbaar (geen bestaande)?
- Description triggert duidelijk (geen overlap)?
- Doel is gestructureerd (niet free-form)?
- Hard rules + compliance gates duidelijk?

### 2. Genereer SKILL.md
Volgens template + skill-specifieke content.

### 3. Voeg toe aan reference_skills_built.md
```
- `/<naam>` — <korte one-liner>
```

### 4. Update MEMORY.md indien nodig
Skill is nieuw → mogelijk reference memory update.

### 5. Test
Roep skill aan met dummy input. Werkt trigger? Werkt output?

### 6. Commit
Memory + SKILL.md naar git (indien skills dir in repo).

## Output format

```
═══ SKILL CREATE — /<naam> ═══

VALIDATIE
- Naam: <beschikbaar / conflicts>
- Description trigger: <strong / vaag>
- Overlap-check: <geen / overlapt met X — voorstel update X>
- Categorie: <audit/design/content/sales/ops/algemeen>

SKILL.md GEGENEREERD
Path: C:\Users\LENOVO\.claude\skills\<naam>\SKILL.md

CONTENT PREVIEW
[eerste 30 regels]

HARD RULES TOEGEPAST
[ ] Compliance hooks (indien content)
[ ] Sales funnel respect (indien lead-touchpoint)
[ ] Memory hooks
[ ] Privacy guards

NEXT
[ ] Test trigger met: /<naam> <test args>
[ ] Update reference_skills_built.md
[ ] Commit naar repo

MEMORY
project_skill_<naam>.md (1 zin: doel + maker + datum)
```

## Anti-patterns te vermijden

❌ **Skill explosion**: 5 nieuwe skills voor 1 workflow → liever 1 met flags
❌ **Vague descriptions**: "Helps with marketing" → won't trigger correct
❌ **No memory hooks**: skill draait, wordt niets geleerd
❌ **Free-form output**: skill voegt geen structuur toe → gewoon /writing
❌ **Brand-voice drift**: skill negeert HMB compliance regels
❌ **Geen examples**: usage section zonder concrete vbs

## Hard rules
- Volg template exact (frontmatter + structuur)
- Description triggert specifiek (anders niet useful)
- Compliance hooks WAAR VAN TOEPASSING
- Memory hooks waar output reusable is
- Update reference_skills_built.md
- NIET 50 skills bouwen die 1 wrapper-skill zou kunnen doen — consolideer

## Memory check
Lees: reference_skills_built (current inventory om overlap te zien), CLAUDE.md (algemene regels), gerelateerde feedback_*
