---
name: memory-audit
description: Audit van het auto-memory systeem — stale entries, dead refs in MEMORY.md, duplicates, te lange index, ontbrekende frontmatter, file-existence verificatie van pointers. Gebruik wanneer memory rommelig voelt, voor maandelijkse opschoning, of als index te lang wordt.
trigger: /memory-audit
---

# /memory-audit

Audit en cleanup van het persistent memory systeem.

## Usage

```
/memory-audit               # full sweep
/memory-audit --fix         # voer voorgestelde acties uit (met confirm)
/memory-audit --quick       # alleen index integrity
```

## Locatie
`C:\Users\LENOVO\.claude\projects\c--Users-LENOVO-Downloads-Volitfy\memory\`
Index: `MEMORY.md`

## Checks (10)

### 1. Index integrity
- Elke regel in MEMORY.md verwijst naar bestaand bestand?
- Elk memory file heeft entry in MEMORY.md?
- Geen dubbele entries voor zelfde file?
- Lijnen >150 chars (truncate risk)?
- Totaal >200 lines (truncate point)?

### 2. Frontmatter compleetheid
Per file: `name` + `description` + `type` aanwezig?
Type ∈ {user, feedback, project, reference}?

### 3. Stale memories
Heuristics voor mogelijk verouderd:
- Project memories ouder dan 30 dagen → check of nog relevant
- "open items" / "te doen" / "wacht op" lijstjes — check of inmiddels gefixt
- Memories die file paths noemen die niet meer bestaan
- Memories met datums uit verleden ("doel 2025-Q4", "deadline 1 mei")

### 4. Duplicate detectie
- Memories met sterk overlappende inhoud
- Multiple memories over zelfde topic (consolideer)
- Vergelijk descriptions op semantische overlap

### 5. Code-derivable content (anti-pattern)
Memories die WEL opgeslagen zijn maar NIET hadden gemoeten:
- File paths zonder context
- Code patterns
- Conventies die in CLAUDE.md staan
- Pure git history

### 6. Missing memories
Hot topics in recente conversaties die GEEN memory hebben:
- Suggereer nieuwe memory entries op basis van recurring patterns

### 7. Logboek bloat
Logboeken zijn referentie maar nemen index space:
- Logboeken ouder dan 30 dagen consolideren naar maand-summary?
- Of gewoon laten staan?
- Voorstel: archief sectie in index

### 8. Cross-references
- Memories die verwijzen naar andere memories die niet bestaan
- Verwante memories die naar elkaar zouden moeten linken

### 9. Type misclassificatie
- "feedback" memories die eigenlijk project zijn (of andersom)
- Reference memories met snel-verouderende inhoud (zou project moeten zijn)

### 10. Privacy / sensitive data
- Wachtwoorden, API keys, secrets in memory? KRITIEK
- IP addresses, telefoonnummers van leads (PII)
- Credentials snippets

## Output

```
MEMORY AUDIT — 2026-05-02

═══ INDEX INTEGRITY ═══
Total entries: N (current MEMORY.md)
Total files: N
Dead references: N (entries pointing to non-existent files)
Orphan files: N (files niet in index)
Lijnen >150 chars: N
Totaal lines: N (truncate at 200)

═══ FRONTMATTER ═══
Missing name: N
Missing description: N
Missing type: N
Invalid type values: N

═══ STALE CANDIDATES ═══
Project >30d zonder verwijzing recent: N
"Te doen" lijsten: N
Verlopen datums: N
Top 10 stale: ...

═══ DUPLICATES ═══
Sterk overlappende content: N pairs
Suggested merges: ...

═══ ANTI-PATTERN ═══
Code-derivable content: N
File-path-only memories: N

═══ MISSING MEMORIES ═══
Recurring topics zonder memory:
1. ...
2. ...

═══ LOGBOEKEN ═══
Total: N
Older than 30d: N
Voorstel: archief sectie?

═══ CROSS-REFERENCES ═══
Broken refs: N
Suggested links: N

═══ TYPE FIXES ═══
Misclassified: N
Lijst: ...

═══ PRIVACY ═══
Possible secrets: N (KRITIEK indien >0)
PII exposure: N

═══ ACTIES ═══
[KRITIEK] N
[HIGH] N
[MED] N

Voorstel cleanup batch: N files
```

## Fix mode (--fix)
Per finding interactief:
- "Delete dead reference [filename]? [j/n/skip]"
- "Merge duplicate [a] + [b] into [a]? [j/n/skip]"
- "Move logboek to archive section? [j/n/skip]"

NOOIT auto-delete zonder confirm.

## Hard rules
- Privacy findings = KRITIEK, ALTIJD direct flaggen
- NOOIT auto-deleten zonder confirm
- Bij >200 lines in MEMORY.md: aanbeveling om archief sectie te maken
- Bewaar audit results als project_memory_audit_<datum>.md
