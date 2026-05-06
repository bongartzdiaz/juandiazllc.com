---
name: backup-verify
description: Verifieer dat alle backups recent + restorable zijn — DigitalOcean snapshots, GitHub repo pushes, Supabase DB dumps, vault git status, secrets vault. Niet hetzelfde als /backup (dat is trigger). Gebruik wekelijks of vóór risky operations.
trigger: /backup-verify
---

# /backup-verify

Verificatie dat backups bestaan, recent zijn, en (indien mogelijk) restorable zijn.

## Usage

```
/backup-verify              # alle scopes
/backup-verify --scope db   # alleen database backups
/backup-verify --restore-test  # echte restore test (kost tijd)
```

## Verschil met /backup
- `/backup` = trigger nieuwe backup nu
- `/backup-verify` = check bestaande backups gezond

## Scopes (8)

### 1. DigitalOcean snapshots
Per VPS:
- NEXUS (64.225.74.36)
- HMB site (165.232.82.71)

Check:
- Latest snapshot timestamp (target: <7d oud)
- Snapshot size (≈ verwachte size, geen anomaly)
- Auto-snapshot enabled?
- Retention policy (>= 1 maand)

### 2. GitHub repos
Per repo (bongartzdiaz/* + mistersocial99/*):
- Last push timestamp (target: code <14d, infrastructure <30d)
- Default branch ahead/behind state
- Tags + releases voor rollback-tags
- Branch protection enabled (voorkomt force-push verlies)

### 3. Supabase database dumps
- Daily dump aanwezig in storage / DO?
- Latest dump timestamp + size
- Point-in-time recovery enabled (ja/nee per project)
- Branch databases (van Performance Tracker?) — separate backup?

### 4. Supabase Storage buckets
Per public bucket:
- Mirror naar DO/S3 of equivalent?
- Recent file count delta plausibel?

### 5. Obsidian vault
- Vault folder via git push? (indien ja: laatste commit)
- Lokale backup naar OneDrive / Dropbox / iCloud?
- Conflicts of unsynced changes?

### 6. Secrets vault
- 1Password / Bitwarden / vault tool sync?
- Recente entries gemarkeerd in vault (project_pt_security_todo: hardcoded keys vault → moet rotatie)
- Backup van vault zelf (master password recovery)

### 7. NEXUS BOS agents config
- /root/nexus-bos/agents/<naam>/CLAUDE.md per agent
- /root/.claude/skills/ folder
- Recent push naar GitHub backup?

### 8. Memory + skills
- C:\Users\LENOVO\.claude\projects\<project>\memory\ in git?
- C:\Users\LENOVO\.claude\skills\ in git?
- Auto-sync naar cloud?

## Restore test (optioneel, --restore-test)

Soort smoke test:
1. Pak random recent DB dump
2. Restore naar staging Supabase project
3. Run 5 standaard SELECT queries
4. Vergelijk row counts vs prod
5. Cleanup staging

Doet NIET op productie. Alleen op staging/scratch.

## Output format

```
═══ BACKUP VERIFY — 2026-05-02 ═══

OVERALL: [GREEN | YELLOW | RED]

─ DO SNAPSHOTS ─
NEXUS VPS:
  Last snapshot: 2026-04-30 (2 dagen)  ✓
  Size: X GB (verwacht ±X)
  Auto-snapshot: enabled ✓
  Retention: 30 dagen ✓

HMB VPS:
  Last snapshot: ...

─ GITHUB REPOS ─
| Repo | Last push | Tags | Protected |
| philly-dashboard | <X dagen> | N | ✓ |
| nexus-bos | <X> | N | ✓ |
| ... | | | |

Stale repos (>30d zonder push): N

─ SUPABASE ─
Project A:
  Last DB dump: <tijd>
  Size: X MB
  PITR: enabled ✓
Project B:
  ...

Storage bucket mirrors: N/N OK

─ VAULT ─
Git: clean / N uncommitted
Last commit: <tijd>
Cloud sync: ✓

─ SECRETS VAULT ─
Sync: ✓
Master password backup: <verify zelf, kan ik niet checken>

─ NEXUS BOS AGENTS ─
13 agent dirs aanwezig: ✓
CLAUDE.md per agent: 13/13 ✓
Skills folder: N skills
Last GitHub push: <tijd>

─ MEMORY + SKILLS (lokaal) ─
Memory in git: <ja/nee>
Skills in git: <ja/nee>
Cloud sync: <status>

─ RESTORE TEST (indien gerunde) ─
Project: <X>
Dump used: <tijd>
Result: <X> rows in N tables, alle queries OK ✓
Time: <X min>

═ TOP RISKS ═
[KRITIEK] [items waar geen recente backup]
[HIGH] ...

═ ACTIES ═
[ ] [actie 1]
[ ] [actie 2]

═ MEMORY UPDATE ═
project_backup_verify_<datum>.md
```

## Hard rules
- KRITIEK: ontbrekende backup OF >30d oude backup voor systeem dat actief muteert
- NOOIT productie data restoren naar staging zonder confirm
- NOOIT secrets vault inhoud loggen (alleen sync-status)
- ALTIJD memory updaten met findings + delta vs vorige verify

## Gerelateerd
- `/backup` — trigger nieuwe backup
- `/audit-server` — server-zijde checks
- `/audit-db` — Supabase health (parallel scope)
