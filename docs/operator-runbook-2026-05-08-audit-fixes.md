# Operator runbook — audit-fix deploy (2026-05-08)

Commit `fff8546` op `claude/zen-noyce-f6e719` (juandiazllc.com) en
`7d45a7b` op `sync/2026-05-08-pr12-bundle` (DEUS-SHARED PR #1) shippen
4 audit-fixes als code, maar twee handelingen moet jij zelf doen omdat
de Claude-sessie geen DB-access had:

1. **Migration genereren** voor 5 nieuwe models + 7 nieuwe indexes
2. **Cron entry wire-up** voor `/api/users/cron/hard-purge` (dagelijks)

Volg dit document stap-voor-stap. Verwachte tijd: 30-45 minuten incl.
smoke-tests.

## 1. Pre-checklist

Voor je begint, controleer 5 dingen:

```bash
# 1. gh auth (we pushen straks weer naar bongartzdiaz)
gh auth status
# Verwacht: "Logged in to github.com account bongartzdiaz"

# 2. Prisma versie >= 7.5 (lockfile pinned op 7.5.0+)
npx prisma --version
# Verwacht: prisma 7.x.x

# 3. DATABASE_URL gezet en bereikbaar
echo $DATABASE_URL | head -c 30
# Verwacht: postgresql://... (NIET leeg)

# 4. CRON_SECRET gezet (zelfde voor alle cron routes)
echo $CRON_SECRET | head -c 8
# Verwacht: een random string van >= 16 chars

# 5. Werkmap is de juandiazllc.com source-of-truth, NIET DEUS-SHARED
pwd
# Verwacht: .../juandiazllc.com (niet DEUS-SHARED)
```

Als een van deze faalt: stop, fix eerst, kom dan terug.

## 2. Migration genereren

De code in `prisma/schema.prisma` heeft 5 models (`Subscription`,
`Invite`, `CalendarConnection`, `CalendarChannel`, `SyncedCalendarEvent`)
plus 7 nieuwe `@@index` directives. De huidige `prisma/migrations/0_init/`
dekt alleen 74 van de 79 models. `prisma migrate deploy` op productie
zou momenteel niets nieuws aanmaken.

### Stap 2a: shadow-DB migration genereren

Werk lokaal tegen een dev-DB (NIET productie). Prisma vergelijkt schema
met huidige DB-state en genereert het verschil als nieuwe migration:

```bash
cd .claude/worktrees/zen-noyce-f6e719
git checkout claude/zen-noyce-f6e719
git pull

# Vereist DATABASE_URL pointing naar lokale Postgres of dev-branch
npx prisma migrate dev --name session_2026_05_08_indexes_and_models
```

Verwachte output:
```
Applying migration `<timestamp>_session_2026_05_08_indexes_and_models`
The following migration(s) have been created and applied from new schema changes:
  prisma/migrations/<timestamp>_session_2026_05_08_indexes_and_models/
    └─ migration.sql
```

Inspecteer de gegenereerde SQL:

```bash
ls -la prisma/migrations/
cat prisma/migrations/*session_2026_05_08*/migration.sql | head -60
```

Je verwacht: `CREATE TABLE Subscription`, `CREATE TABLE Invite`,
`CREATE TABLE CalendarConnection`, `CREATE TABLE CalendarChannel`,
`CREATE TABLE SyncedCalendarEvent`, plus 7 `CREATE INDEX` statements.

### Stap 2b: commit migration file

```bash
git add prisma/migrations/
git status
# Verwacht: 1 nieuwe directory met migration.sql

git commit -m "db: migration for 5 new models + 7 indexes (audit fix)"
git push origin claude/zen-noyce-f6e719
```

### Stap 2c: re-sync naar DEUS-SHARED

De migration moet ook op de DEUS-SHARED PR #1. Run:

```bash
cd ../deus-shared-port
mkdir -p prisma/migrations/<timestamp>_session_2026_05_08_indexes_and_models
cp ../zen-noyce-f6e719/prisma/migrations/<timestamp>_*/migration.sql \
   prisma/migrations/<timestamp>_session_2026_05_08_indexes_and_models/

git add prisma/migrations/
git commit -m "Sync migration @ juandiazllc.com <SHA> (audit-fix migration)"
git push origin sync/2026-05-08-pr12-bundle
```

### Stap 2d: deploy op productie

Na merge van PR #1 op DEUS-SHARED `main`:

```bash
# Op de Hetzner deploy-box of Vercel deploy step:
npx prisma migrate deploy
```

Verwachte output:
```
Applying migration `<timestamp>_session_2026_05_08_indexes_and_models`
The following migrations have been applied:
  <timestamp>_session_2026_05_08_indexes_and_models/migration.sql
```

## 3. Cron entry wire-up

`POST /philly/api/users/cron/hard-purge` is geshipped maar moet nog
gescheduled worden. Aanbevolen cadence: dagelijks 04:00 UTC, direct na
de audit-prune van 03:30 UTC.

### Vercel deploy (huidige primary)

Voeg toe aan `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/philly/api/users/cron/hard-purge",
      "schedule": "0 4 * * *"
    }
  ]
}
```

Vercel cron-runner stuurt een POST met header `X-Vercel-Cron: 1`. Het
route-handler checkt `X-Cron-Secret`, dus zet `CRON_SECRET` als env
var en wire de header via Vercel cron-config (of gebruik dedicated
[Cron-Job.org](https://cron-job.org) als Vercel cron headers niet
ondersteunt).

### Hetzner OS-cron (post-cutover)

Op de Hetzner box:

```bash
sudo crontab -e
# Voeg toe:
0 4 * * * curl -fsS -X POST -H "X-Cron-Secret: ${CRON_SECRET}" \
  https://app.lucen.ai/philly/api/users/cron/hard-purge >> \
  /var/log/deus-cron.log 2>&1
```

`CRON_SECRET` moet beschikbaar zijn in de root crontab-omgeving — voeg
toe aan `/etc/environment` of gebruik een wrapper script dat het laadt.

### PM2 ecosystem (alternatief)

Als je `scripts/migrate-to-hetzner/07-pm2-ecosystem.example.js` als
basis gebruikt:

```js
{
  name: 'cron-runner',
  script: './scripts/run-crons.sh',
  cron_restart: '0 4 * * *',
  autorestart: false,
}
```

## 4. Smoke-test commands

Test elke wijziging direct na deploy:

### Hard-purge cron

```bash
# Verwacht: 200 OK met JSON { data: { purged: 0, cutoff: ..., days: 30 } }
# (0 omdat er nog geen 30+ dagen oude soft-deletes zijn)
curl -X POST -H "X-Cron-Secret: ${CRON_SECRET}" \
  https://app.lucen.ai/philly/api/users/cron/hard-purge
```

### Calendar prune (nu uitgebreid met events)

```bash
# Verwacht: 200 OK met JSON { data: { ..., eventsDeleted: N, eventDays: 14 } }
curl -X POST -H "X-Cron-Secret: ${CRON_SECRET}" \
  https://app.lucen.ai/philly/api/calendar/cron/prune-channels
```

### Index hit (na migration)

Als je query-EXPLAIN tegen Postgres draait:

```sql
EXPLAIN (ANALYZE) SELECT * FROM "User" WHERE "organizationId" = 'org_xyz';
-- Verwacht: "Index Scan using User_organizationId_idx" in plan
-- NIET: "Seq Scan on User"
```

## 5. Rollback

Als de migration faalt op productie (DDL-conflict, timeout, etc.):

### Veilige rollback

```bash
# Stap 1: rollback migration via Prisma
npx prisma migrate resolve --rolled-back <migration-name>

# Stap 2: revert de commit op DEUS-SHARED main
cd /path/to/DEUS-SHARED
git revert 7d45a7b   # de sync commit
git push origin main

# Stap 3: redeploy
# Vercel: nieuwe deploy triggered automatisch op push
# Hetzner: pm2 restart deus-app
```

### Wat NIET te doen

- **Nooit** `prisma migrate reset` op productie — wist alle data
- **Nooit** handmatig `DROP TABLE` — Prisma migration history raakt corrupted
- **Nooit** een failed migration negeren en verder pushen — Prisma blokkeert
  toekomstige migrations totdat opgelost

## 6. Verificatie

Run deze queries 1u na deploy om te bevestigen dat alles werkt:

```sql
-- 1. Nieuwe tabellen bestaan
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'Subscription', 'Invite', 'CalendarConnection',
    'CalendarChannel', 'SyncedCalendarEvent'
  );
-- Verwacht: 5 rows

-- 2. Indexes aanwezig
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%organizationId%' OR indexname LIKE '%userId_idx';
-- Verwacht: indexes voor User, Account, Session, Project, KanbanBoard,
-- KanbanColumn, CustomPage

-- 3. Hard-purge cron heeft gedraaid
SELECT MAX(created_at) AS last_run FROM "AuditLog"
WHERE entity = 'user'
  AND changes::text LIKE '%hardPurged%';
-- Verwacht: timestamp van afgelopen 24u (of NULL als nog geen kandidaten)

-- 4. SyncedCalendarEvent retention werkt
SELECT COUNT(*), MIN("endTime") FROM "SyncedCalendarEvent";
-- Verwacht: alle endTime > NOW() - INTERVAL '14 days' (of marginaal ouder
-- als prune-cron deze nacht nog niet draaide)
```

Als één van deze checks rood is: lees `/var/log/deus-cron.log` voor
foutmeldingen, en kijk in Sentry naar `withSpan` traces voor de
betreffende routes.

---

**Vragen?** Notities terug naar `_drafts/operator/` of een nieuwe
Claude-sessie met deze runbook als context.
