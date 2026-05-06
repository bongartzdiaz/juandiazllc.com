---
name: migration-fix
description: Resolve Supabase migration drift tussen lokaal en remote — detecteer mismatch, voorstel reconciliation plan (rebase / squash / manual sync), dry-run voor apply. Gebruik bij "migration X niet toegepast" of "schema verschilt staging vs prod".
trigger: /migration-fix
---

# /migration-fix

Supabase migration drift resolve. Veilig (dry-run first).

## Usage

```
/migration-fix
/migration-fix --project <ref>
/migration-fix --dry-run        # default
/migration-fix --apply          # echt uitvoeren (na review)
```

## Wanneer drift?

Drift = lokale `supabase/migrations/` folder ≠ remote `schema_migrations` table.

Oorzaken:
- Iemand heeft direct in dashboard SQL gerund
- Migration toegepast op staging maar niet op prod
- Out-of-order applies (collega 1 vs collega 2 branch)
- Lokale folder corrupt na bad rebase
- `db push` ipv proper migration → state drift

## Flow

### 1. Inventory
- `mcp__claude_ai_Supabase__list_migrations` → remote applied
- Lokale `supabase/migrations/*.sql` → bestaande files
- Vergelijk timestamps + checksums

### 2. Classify per migration
Per file:
- **Synced**: zelfde versie + checksum
- **Local only**: bestaat lokaal, niet remote applied
- **Remote only**: applied remote maar geen lokaal bestand
- **Drift**: zelfde id, verschillende inhoud (DANGER)

### 3. Drift severity
- N=0 → all good, klaar
- N=1-3 lokaal-only → straightforward apply
- N=1+ remote-only → recover lost migration files
- N=1+ drift met inhoudsverschil → DANGER, manual review

### 4. Plan per scenario

#### A. Lokaal-only (niet applied)
- Review SQL: idempotent? destructive?
- Test op branch / staging eerst
- Apply via `mcp__claude_ai_Supabase__apply_migration`
- Verify schema match daarna

#### B. Remote-only (no local file)
- Dump applied SQL via `select_query` op `schema_migrations` indien bewaard
- Of: reverse-engineer schema diff
- Schrijf migration file lokaal met juiste timestamp prefix
- Mark as applied lokaal (niet re-runnen)

#### C. Drift (zelfde id verschillende SQL)
KRITIEK. Stop hier. Vraag Juan:
- Welke versie is canonical (lokaal of remote)?
- Was er een schema-fix manueel gedaan?
- Forward-fix migration nodig?

NOOIT auto-resolven.

#### D. Out-of-order
- Migration X (timestamp T) niet applied
- Migration Y (timestamp T+1) WEL applied
- Risk: X depends op Y of andersom

Plan:
- Read X content
- Bepaal of X nog relevant is
- Zo nee: rename met latere timestamp + apply
- Zo ja: drop Y, run X, re-apply Y (DANGER, eerst staging)

### 5. Dry-run output
ALTIJD eerst:
- Print elke migration die uitgevoerd zou worden
- Print SQL
- Print verwachte schema impact (DDL nieuwe tabel? alter? data wipe?)

### 6. Apply (alleen na confirm)
- Per migration: apply, verify, log
- Bij failure: stop, rollback indien transactioneel mogelijk

### 7. Post-fix verify
- Run advisors check (extra warnings?)
- Run lokaal `supabase db diff` als beschikbaar
- Smoke queries op kritieke tabellen
- Compare schema hashes

### 8. Memory + log
- project_migration_fix_<datum>.md
- Lessons: hoe is drift ontstaan? (preventie volgende keer)

## Output format

```
═══ MIGRATION FIX — <project-ref> ═══

INVENTORY
Lokaal: N files
Remote applied: N migrations
Status:
- Synced: N
- Lokaal-only: N
- Remote-only: N
- Drift: N [KRITIEK indien >0]

DRIFT DETAIL
[per drift item: id, lokaal SQL hash, remote SQL hash, diff samenvatting]

LOKAAL-ONLY TE APPLYEN
1. <timestamp>_<naam>.sql — <X regels SQL>
   Idempotent: ja/nee
   Destructive: ja/nee
2. ...

REMOTE-ONLY TE RECOVEREN
1. Migration <id> — geen lokaal file
   Voorstel: extract SQL, schrijf <new-filename>.sql

PLAN
1. ...
2. ...
3. ...

═ DRY-RUN ═
[per migration: SQL preview + impact]

═ CONFIRM REQUIRED ═
[ ] Bekijk SQL hierboven
[ ] Backup laatst <X dagen> bevestigd
[ ] Staging eerst (indien beschikbaar)

[ja/nee om door te gaan met --apply]

═ POST-FIX VERIFY ═
[ ] Advisors recheck
[ ] Schema hash match
[ ] Smoke queries pass

═ MEMORY ═
project_migration_fix_<datum>.md
Preventie: ...
```

## Hard rules
- ALTIJD dry-run voor apply
- DRIFT (zelfde id verschillende inhoud) = STOP, manual review
- NOOIT destructive migration zonder backup-verify <24u
- NOOIT skip versioned migration approach permanently — als `db push` is gebruikt, restore proper migration discipline
- Memory hook verplicht (drift-oorzaak documenteren)

## Memory check
Lees: meest recente project_migration_*, project_db_audit_*, feedback_pg_net_jsonb_headers
