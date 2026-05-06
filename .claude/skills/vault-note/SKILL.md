---
name: vault-note
description: Maak Obsidian vault note in PARA-structuur op C:\business\Mr Diaz volgens vault stijl-conventies. Gebruik wanneer Juan iets wil vastleggen, kennis wil opslaan, of een nieuwe note wil aanmaken in zijn vault.
trigger: /vault-note
---

# /vault-note

Obsidian vault note volgens reference_obsidian_vault.

## Usage

```
/vault-note <titel>
/vault-note <titel> --para <Projects|Areas|Resources|Archive>
/vault-note <titel> --type <log|reference|idea|meeting|decision>
```

## Vault locatie
`C:\business\Mr Diaz\` (PARA structuur)

## PARA mapping
- **Projects** — actieve projecten met deadline (HMB, PT, NEXUS BOS releases)
- **Areas** — doorlopende verantwoordelijkheid (sales, content, server-ops)
- **Resources** — referentie materiaal (skills, templates, snippets)
- **Archive** — afgesloten

## Note template

```markdown
---
title: <titel>
date: 2026-05-02
type: <type>
tags: [<tag1>, <tag2>]
status: <active|done|parked>
related: [[<andere-note>]]
---

# <titel>

## Context
<waarom bestaat deze note?>

## Inhoud
<de hoofdinformatie>

## Acties
- [ ] <todo>

## Referenties
- [[<gerelateerde note>]]
- <externe link>
```

## Stijl-conventies (uit reference)
- Lowercase filenames met hyphens: `thuisbatterij-tco.md`
- Datum in YAML: `2026-05-02` (ISO)
- Tags: lowercase, hyphen-separated
- Wikilinks `[[...]]` voor interne refs
- H1 = note titel (zonder #)
- Bullet lists voor opsommingen, geen genummerde tenzij volgorde matters
- Code blocks met taal-tag

## Note types
- `log` — sessie/dag-logboek
- `reference` — feiten, specs, configs
- `idea` — concept, brainstorm
- `meeting` — gesprek aantekeningen
- `decision` — vastgelegde keuze + waarom

## Output
1. Voorgestelde filename + pad
2. Volledige note content (kopieerbaar)
3. Suggested wikilinks naar bestaande notes (via vault-search indien beschikbaar)
