---
name: backup
description: Manueel backup-trigger over alle systemen — Supabase DB dump, vault git push, repo backups, server snapshots, secrets vault export. Gebruik vóór risicovolle actie of wekelijkse safety net.
trigger: /backup
---

# /backup

Multi-system backup trigger.

## Usage

```
/backup                            # alles
/backup --target db,vault          # selectief
/backup --target server-snapshot
/backup --verify                   # ook restore test
```

## Targets

### `db` — Supabase
- `pg_dump` per project (PT, HMB, NEXUS)
- Save naar `C:\backups\supabase\<project>\<datum>.sql.gz`
- Verify: file size > 0, gzip integriteit
- Optioneel: upload naar S3/storage bucket

### `vault` — Obsidian
- `cd C:\business\Mr Diaz && git add -A && git commit -m "Backup <datum>" && git push`
- Verify: GitHub remote ahead

### `repos` — GitHub
- Voor elke bongartzdiaz/* en mistersocial99/*: ensure pushed
- Local mirror clone: `C:\backups\repos\<owner>-<name>.git` (bare clone)

### `server-snapshot` — DigitalOcean
- API call: snapshot beide droplets (64.225.74.36 NEXUS + 165.232.82.71 HMB)
- Tag: `manual-<datum>`
- Cost waarschuwing: $0.05/GB/maand

### `secrets` — Vault export
- Supabase Vault keys lijst (NIET waarden — alleen namen voor reconstruction guide)
- GHL/Meta/Anthropic API keys notities (encrypted in 1Password ref)

### `memory` — Auto-memory
- `C:\Users\LENOVO\.claude\projects\c--Users-LENOVO-Downloads-Volitfy\memory\` → ZIP naar backups
- Vergelijk met vorige backup — diff summary

### `bot-conversations` — DM Champ / WhatsApp
- Export Supabase `conversations` tabel laatste 30d
- Compliance: leads-data, behandel als PII (encrypted backup)

## Output

```
BACKUP — 2026-05-02 14:32

[✓] db        — pt:42MB, hmb:18MB, nexus:8MB
[✓] vault     — 23 commits ahead pushed
[✓] repos     — 18/18 mirrors updated
[✓] server    — snapshots queued (DO API)
[✓] secrets   — 14 keys catalogged
[✓] memory    — 87 files (12 new sinds vorige)
[✓] bot       — 2.341 conversations exported (encrypted)

Total: 421 MB
Storage: C:\backups\
Verify: PASS

Volgende geplande backup: <indien cron>
```

## Hard rules
- DB dumps NOOIT plain in git (PII)
- Bot-conversations encrypted of weglaten
- Server snapshots = $$, vraag confirm bij meer dan 1/dag
- Bij verify FAIL op DB: KRITIEK — restore test runnen
- Memory updaten: `project_backups_<jaarmaand>.md` met log

## Memory check
Lees: project_backups_<jaarmaand> indien bestaat
