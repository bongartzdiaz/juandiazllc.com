# Prisma migrations — Philly Dashboard

This project uses **versioned migrations** (`prisma migrate`) rather than schema sync (`prisma db push`). Every schema change lives in `prisma/migrations/` as a numbered folder with an `migration.sql` file. These files are committed to git, reviewed in PRs, and applied in order by `deploy/deploy.sh` on every deploy.

---

## Day-to-day developer workflow

### Changing the schema

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate a migration against your local dev DB
npx prisma migrate dev --name add_thing_to_user

# Prisma:
#   - creates prisma/migrations/<timestamp>_add_thing_to_user/migration.sql
#   - applies it to your local DB
#   - regenerates the Prisma client
# 3. Commit BOTH the schema change AND the migration folder
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add thing to User"
```

### Pulling a colleague's schema change

```bash
git pull
npx prisma migrate dev   # applies any new migration files to your local DB
```

### Resetting your local DB (data loss)

```bash
npx prisma migrate reset
# Wipes the DB, reapplies every migration from scratch, runs seed.
```

---

## Production deploys

`deploy/deploy.sh` runs `npm run db:migrate` (= `prisma migrate deploy`) on every deploy. This:

- Applies **only** migration folders not yet marked as applied in the `_prisma_migrations` table
- Does **not** generate new migrations (safe to run against a DB that's ahead or equal)
- Is idempotent — running it twice is a no-op

If a migration fails, Prisma aborts the deploy and leaves the DB in its previous state (up to the last successful migration). Fix the migration, commit, redeploy.

---

## One-time baseline for an existing (pre-migration) database

If your production DB was created by `prisma db push` before this commit, it **already has every table** from `prisma/schema.prisma`. Running `prisma migrate deploy` against it would try to run `0_init/migration.sql` and fail with "table already exists".

Fix it with a **one-time baseline** that marks `0_init` as applied without executing it:

```bash
# SSH to the VPS, cd to project root, then:
npx prisma migrate resolve --applied 0_init
```

Output should be: `Migration 0_init marked as applied.`

After this, every future `prisma migrate deploy` works normally.

**How to tell if you need this:** SSH to the VPS and run `mariadb -u phily -p phily -e "SHOW TABLES LIKE '_prisma_migrations';"`. If the result is empty, your DB is pre-migration and you need the baseline step. If `_prisma_migrations` exists, you're fine.

---

## Rolling back

Prisma does **not** auto-generate down-migrations. If you need to roll back:

1. Write a new migration that reverses the change:
   ```bash
   npx prisma migrate dev --name revert_thing
   ```
2. Or restore from a backup (`deploy/restore.sh /var/backups/philly/philly-YYYYMMDD-HHMMSS.sql.gz`)

For major schema changes (dropping a column used by prod code), the safe sequence is always:

1. Migration 1: add new column + backfill
2. Ship code that reads the new column, tolerates the old
3. Migration 2: drop the old column once all running instances are on the new code

---

## Troubleshooting

### "Drift detected" in `migrate dev`

Your local DB has changes that aren't in a migration file (usually from an earlier `db push` or manual SQL). Options:
- `prisma migrate reset` — wipes local DB, replays migrations from scratch (safest)
- `prisma db pull` — introspects the live DB into `schema.prisma`, then generate a migration

### "Cannot apply migration 0_init — table `Organization` already exists"

See the baseline section above.

### Migration file became too large to read in a PR

Break it up: instead of one 2000-line file, make several smaller migrations, each focused on a single model or concern. `prisma migrate dev` is usually called per-schema-change anyway, so this happens naturally.

---

## File layout

```
prisma/
  schema.prisma               — source of truth for the data model
  seed.ts                     — idempotent dev/test data
  migrations/
    0_init/
      migration.sql           — initial snapshot generated from empty → schema
    20260420120000_add_x/
      migration.sql           — subsequent migrations
    migration_lock.toml       — pins the provider (do not edit manually)
```

The migrations folder is committed. `migration_lock.toml` is auto-created on first `migrate dev`.
