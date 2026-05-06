---
name: memory-save
description: Sla expliciet iets op in het auto-memory systeem (user/feedback/project/reference) met juiste structuur en index-update. Gebruik wanneer Juan zegt "onthoud dit", "sla op", "zet in memory", of bij audit-conclusies die persistent moeten zijn.
trigger: /memory-save
---

# /memory-save

Expliciete memory write met type-classificatie en index-update.

## Usage

```
/memory-save <topic>                    # vraag eerst naar inhoud
/memory-save <topic> --type project     # type expliciet
/memory-save <topic> --content "..."    # inhoud direct
/memory-save --from-audit <audit-bestand>  # converteer audit-output naar memory
```

## Memory locatie
`C:\Users\LENOVO\.claude\projects\c--Users-LENOVO-Downloads-Volitfy\memory\`
Index: `MEMORY.md`

## Type beslissingsboom

```
Is het over de gebruiker zelf (Juan)?
├─ Ja → type: user
└─ Nee:
   Is het guidance/correctie/voorkeur ("doe X niet", "altijd Y")?
   ├─ Ja → type: feedback
   └─ Nee:
      Is het over een actief project, beslissing, of state?
      ├─ Ja → type: project
      └─ Nee:
         Is het een pointer naar externe bron (URL, system, tool)?
         └─ Ja → type: reference
```

## Wat NIET opslaan
- Code patterns / conventions / file paths (uit code afleidbaar)
- Git history (gebruik `git log`)
- Debug fixes (zit in commit messages)
- Wat al in CLAUDE.md staat
- Ephemerale taakdetails

Als de gebruiker vraagt om dit toch op te slaan: terugvragen "wat was hieraan SURPRISING/NON-OBVIOUS — dat is het echte memory waard."

## Bestandsstructuur

Bestandsnaam patroon:
- `user_<topic>.md`
- `feedback_<topic>.md`
- `project_<topic>_<datum?>.md`
- `reference_<topic>.md`
- `logboek_<datum>.md` voor sessie-logs

Frontmatter (verplicht):
```markdown
---
name: <korte titel>
description: <1-zin hook voor MEMORY.md, specifiek genoeg om relevant te scoren>
type: <user|feedback|project|reference>
---

<inhoud>
```

## Body structure per type

### feedback
```
<de regel zelf in 1 zin>

**Why:** <reden, vaak een eerder incident of voorkeur>
**How to apply:** <wanneer/waar deze regel kicked in>
```

### project
```
<de feit of beslissing>

**Why:** <motivatie — constraint, deadline, stakeholder>
**How to apply:** <hoe dit suggesties moet vormen>
```

### user / reference
Vrijere body, maar lead met de essentie in 1 zin.

## Datum-conversie
ALTIJD relatieve datums omzetten naar absoluut bij opslag:
- "donderdag" → "2026-05-07"
- "volgende week" → specifieke week
- "morgen" → "2026-05-03"
- "laatst" → exacte datum noemen

## Flow

### 1. Bepaal type
Pas beslissingsboom toe. Bij twijfel: vraag.

### 2. Check duplicates
Lees MEMORY.md. Bestaat al een memory over dit topic?
- Ja → update bestaande in plaats van nieuwe maken
- Nee → ga door

### 3. Bepaal filename
Volg patroon. Geen spaces, lowercase, hyphens.

### 4. Schrijf bestand
Met frontmatter + body conform type-template.

### 5. Update MEMORY.md
Voeg toe in juiste sectie (HMB Dashboard / GitHub Referentie / PT etc.):
```
- [filename.md](filename.md) — <hook van max 150 chars>
```
Houd de lijn ≤150 chars (MEMORY.md truncates na 200 lines).

### 6. Confirm output
```
✓ Memory saved
File: <filename>
Type: <type>
Section: <section in MEMORY.md>
Hook: <line in index>

Stale check: bestaande memories die hieraan gerelateerd zijn maar mogelijk verouderd:
- ...
```

## Hard rules
- NOOIT inhoud direct in MEMORY.md schrijven (alleen pointer)
- ALTIJD frontmatter compleet
- ALTIJD duplicates checken voor save
- Datums absoluut, geen relatieve termen
- Memory in mensentaal, niet in code-jargon

## Gerelateerde skills
- `/memory-audit` — periodieke staleness check
- `/audit-*` — outputs zijn vaak input voor memory-save
