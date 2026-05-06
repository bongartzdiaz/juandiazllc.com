---
name: vault-check
description: Diepe Obsidian vault integrity audit — broken wikilinks, orphan notes, untagged notes, daily sync status, PARA-violations, frontmatter compleetheid, dode tag-trees, lege notes. Gebruik wanneer Juan vault wil opschonen, structuur wil verifiëren, of zoekt waarom dingen niet meer linken.
trigger: /vault-check
---

# /vault-check

Diepe Obsidian vault audit voor `C:\business\Mr Diaz\`.

## Usage

```
/vault-check                       # full audit
/vault-check --scope links         # alleen broken/orphan
/vault-check --scope structure     # PARA + frontmatter
/vault-check --scope content       # leeg/dun/duplicated
/vault-check --fix                 # met confirm interactief fixen
/vault-check --since 7d            # focus op recent gewijzigde notes
```

## Vault info
- Locatie: `C:\business\Mr Diaz\`
- Structuur: PARA (Projects / Areas / Resources / Archive)
- Stijl: lowercase-hyphen filenames, ISO datums, wikilinks `[[...]]`
- Recent: vault +57 notes op 25 apr (logboek_2026_04_25b)

## Checks (12)

### 1. Inventory
- Total notes per top-level folder
- Total wikilinks
- Total tags
- Total attachments (images, PDFs)
- Vault size (MB)
- Notes added laatste 7d/30d
- Notes gewijzigd laatste 7d/30d

### 2. Broken wikilinks
Voor elke `[[...]]`:
- Bestaat target note?
- Bij ambigue match: report
- Heading-links `[[note#heading]]`: heading bestaat?
- Block-refs `[[note^block]]`: block bestaat?

### 3. Orphan notes
- Notes waar GEEN andere note naar linkt
- Per folder
- Filter: exclude logs/daily notes

### 4. Untagged notes
- Notes zonder enkel tag
- Notes met >10 tags (over-tagged)
- Notes met alleen generieke tags (#note, #idea zonder verdere context)

### 5. PARA-compliance
- Notes in root (zou in P/A/R/A moeten staan)
- Projects folder met notes >6 mnd inactief (kandidaat Archive)
- Areas folder met notes die eigenlijk Project zijn (deadline aanwezig)
- Resources met notes die eigenlijk Project zijn (active work)

### 6. Frontmatter compleetheid
Verwacht (volgens reference_obsidian_vault):
- title
- date (ISO)
- type (log/reference/idea/meeting/decision)
- tags (array)
- status (active/done/parked)

Per note:
- Missing fields
- Date in non-ISO format ("3 mei 2026" → moet "2026-05-03")
- Type-veld onbekende waarde

### 7. Tag tree health
- Onder-gebruikte tags (gebruikt 1x)
- Inconsistente naamgeving (#thuisbatterij vs #thuis-batterij vs #ThuisBatterij)
- Tag hierarchies (#area/business vs platte tags)

### 8. Lege of dunne notes
- Notes <50 woorden (excl. frontmatter)
- Notes alleen titel zonder body
- Notes met alleen TODO checkboxen, nooit bijgewerkt

### 9. Duplicates
- Notes met sterk overlappende titles
- Notes met identieke H1
- Notes met >70% content-overlap

### 10. Daily / log notes
- Daily notes streak (ontbrekende dagen)
- Logboek_*.md die ook in memory bestaan (sync check)

### 11. Attachments
- Orphan attachments (niet meer geref'd)
- Te grote attachments (>10MB)
- Attachments zonder alt-text in markdown

### 12. Sync & backup
- Git repo status (indien vault in git)
- Laatste commit
- Uncommitted changes count
- Conflict markers (`<<<<<<<`)

## Output

```
VAULT CHECK — C:\business\Mr Diaz — 2026-05-02

═══ INVENTORY ═══
Notes total: N
Per folder:
- Projects: N
- Areas: N
- Resources: N
- Archive: N
- (root): N (PARA violation)
Wikilinks: N
Tags: N (unique)
Attachments: N (X MB)
Recent activity: +N created, ±N modified (7d)

═══ LINKS ═══
Broken wikilinks: N
Orphan notes: N (excl. logs)
Top 10 most-linked notes: ...
Top 10 orphans: ...

═══ TAGS ═══
Untagged: N
Over-tagged (>10): N
Naming inconsistencies: N (vb: #thuisbatterij vs #thuis-batterij)
Used 1x only: N

═══ PARA ═══
Root violations: N
Stale Projects (>6 mnd inactive): N
Misclassified: N

═══ FRONTMATTER ═══
Missing title: N
Missing date: N
Missing type: N
Non-ISO date: N
Unknown type values: N

═══ CONTENT ═══
Empty/thin (<50 words): N
TODO-only stale: N
Duplicates suspected: N pairs

═══ DAILY/LOG ═══
Daily streak break: N gaps
Logs in memory but missing in vault: N
Logs in vault but missing in memory: N

═══ ATTACHMENTS ═══
Orphan: N (X MB recoverable)
>10MB: N
Without alt-text: N

═══ SYNC ═══
Git status: clean / N uncommitted
Last commit: [tijd]
Conflicts: N

═══ TOP 15 ACTIES ═══
1. [HIGH] Fix N broken links
2. Move N notes from root to PARA
3. ...

═══ MEMORY UPDATE ═══
project_vault_audit_<datum>.md
```

## Fix mode
Per finding interactive:
- Broken link [a→b]: rename to existing X? Create new note? Skip?
- Orphan [note]: archive? Add to relevant index? Keep?
- Root violation [note]: move to which PARA folder?

## Hard rules
- NOOIT auto-deleten zonder confirm
- NOOIT bulk-rename zonder preview
- Respecteer vault stijl-conventies (reference_obsidian_vault):
  - lowercase-hyphen filenames
  - ISO datums
  - Wikilinks niet markdown links voor interne refs
- Voorzichtig met logboek-notes — deze hoeven geen tags
- Voor lege "stub" notes: vraag of ze placeholder zijn
