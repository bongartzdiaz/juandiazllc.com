---
name: db-migration
description: Schrijf een Supabase migratie volgens Juan's conventies — idempotent (IF NOT EXISTS), transactioneel (BEGIN/COMMIT), met indexes, RLS, comments, rollback-snippet. Werkt voor alle Supabase projects (HMB pssmedgsbwyggsovpnvg, PT mtzmtfsjietlmvavwowu, etc). Gebruik wanneer Juan vraagt "voeg tabel/kolom toe", "maak een RPC", "RLS-policy aanpassen", of bij schema-evolution.
trigger: /db-migration
---

# /db-migration

Supabase-migratie schrijven met de conventies die Juan gebruikt: idempotent, transactioneel, RLS-aware, met audit-comment + rollback-snippet.

## Usage

```
/db-migration <naam> <doel>
/db-migration <naam> --project <hmb|pt|philly|<ref>>
/db-migration <naam> --type <table|column|rls|index|rpc|view|trigger|seed>
/db-migration <naam> --idempotent                # default true; force CREATE
```

## Hard rules

### Naming
- Filename: `<YYYYMMDD>_<snake_case_doel>.sql` (bv `20260504_otp_consent_telemarketing_2026.sql`)
- Migration name (MCP `apply_migration`): zelfde snake_case zonder datum-prefix

### Structuur
1. **Header-comment** — datum, doel, why, gerelateerde issue/PR/note
2. **`BEGIN;`** voor multi-statement migraties
3. **DDL** — IF NOT EXISTS overal waar mogelijk
4. **Indexes** — partial waar relevant
5. **RLS** — `ENABLE ROW LEVEL SECURITY` + policies
6. **`COMMENT ON`** voor non-trivial objects
7. **`COMMIT;`**
8. **Rollback-snippet** als comment onderaan

### Idempotency (verplicht)
- `CREATE TABLE IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `CREATE OR REPLACE FUNCTION`
- `CREATE OR REPLACE VIEW`
- `DROP POLICY IF EXISTS` voor RLS replace
- Voor data-seed: `ON CONFLICT DO NOTHING`

### RLS-defaults

Elke tabel met persoonsgegevens MOET RLS aan. Nooit `USING (true)` op WRITE/UPDATE/DELETE — alleen op SELECT met goede reden (zie advisor `rls_policy_always_true`).

```sql
-- Pattern: lees-only voor service-role, niets voor anon/authenticated
ALTER TABLE public.foo ENABLE ROW LEVEL SECURITY;
-- (geen policies = volledig dichtgetimmerd voor anon/authenticated)
```

Voor user-scoped data:
```sql
CREATE POLICY foo_select_own ON public.foo
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY foo_insert_own ON public.foo
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

## Standaard kolom-types

| Type | SQL | Notes |
|---|---|---|
| Primary key | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | nooit `SERIAL` (race conditions) |
| Foreign key | `UUID REFERENCES public.parent(id) ON DELETE CASCADE` | of `SET NULL` |
| Text-short | `TEXT` met `CHECK (char_length(...) <= n)` | geen `VARCHAR(n)` |
| Text-vrij | `TEXT` | |
| Email | `TEXT CHECK (... ~ '^[^@]+@[^@]+\.[^@]+$')` | |
| Phone E.164 | `TEXT CHECK (... ~ '^\+\d{10,15}$')` | |
| Created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| Updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` + trigger | trigger via `tg_set_updated_at` |
| JSON | `JSONB` (niet `JSON`) | indexable |
| IP | `INET` | niet TEXT |
| Enum-light | `TEXT CHECK (... IN ('a','b'))` | makkelijk uit te breiden |
| Enum-strict | `CREATE TYPE ... AS ENUM (...)` | breaking change om uit te breiden |

## Indexes

Common patterns:
- `(user_id, created_at DESC)` voor "mijn recente items"
- `(status) WHERE status = 'pending'` partial index voor work-queues
- `(email) WHERE verified_at IS NOT NULL` voor whitelisted-only views
- `USING gin (search_vector)` voor full-text
- `USING btree (lower(email))` voor case-insensitive lookup

NIET:
- Index op elke kolom — overhead bij INSERT/UPDATE
- Composite index in verkeerde volgorde — leftmost-prefix-rule

## RPC-pattern (PostgreSQL function)

```sql
CREATE OR REPLACE FUNCTION public.foo_check(
  p_arg TEXT,
  p_lim INT DEFAULT 10
)
RETURNS TABLE (
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER          -- of INVOKER, afhankelijk van context
SET search_path = public  -- ALTIJD expliciet (advisor warn anders)
AS $$
BEGIN
  -- logica
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- Permission grants — expliciet
REVOKE ALL ON FUNCTION public.foo_check(TEXT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.foo_check(TEXT, INT) TO service_role;
```

## View-pattern

```sql
CREATE OR REPLACE VIEW public.foo_summary AS
SELECT ...
FROM ...
WHERE ...;

REVOKE ALL ON public.foo_summary FROM anon, authenticated;
GRANT SELECT ON public.foo_summary TO service_role;

COMMENT ON VIEW public.foo_summary IS 'Doel + invariants + wanneer up-to-date.';
```

NB: materialized views zijn niet auto-revoked → `REVOKE ALL ON MATERIALIZED VIEW ... FROM anon, authenticated;` expliciet (zie advisor `materialized_view_in_api`).

## Trigger-pattern

```sql
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.foo;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.foo
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
```

## pg_cron-pattern

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('foo_purge') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'foo_purge'
    );
    PERFORM cron.schedule(
      'foo_purge',
      '*/15 * * * *',
      $cron$ DELETE FROM public.foo WHERE expires_at < now() - interval '24 hours'; $cron$
    );
  END IF;
END $$;
```

## Schema-checks vóór schrijven

Run eerst:
```sql
-- Welke kolommen heeft tabel X?
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='<table>';

-- Welke RLS policies zijn er al?
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename='<table>';

-- Welke indexes zijn er al?
SELECT indexname, indexdef FROM pg_indexes WHERE tablename='<table>';
```

Pas dán DDL — voorkom drift met live schema (ervaring 4 mei: ik schreef migratie tegen aangenomen `voornaam`/`telefoon` kolommen die niet bestonden — moest opnieuw).

## Apply-flow

1. Schrijf migratie als `.sql` bestand in `supabase/migrations/`
2. Verifieer schema met `execute_sql` queries hierboven
3. **Vraag Juan om expliciete go** vóór `apply_migration` op productie
4. Apply via MCP `apply_migration` of CLI `supabase db push`
5. Verifieer met test-queries (count, RPC-call, RLS-check)
6. Document in vault `10-Projecten/<project>/` als groot

## Output flow
1. **Brief** — bevestig project, type, doel, blast radius
2. **Schema-check queries** — om aannames te verifiëren
3. **Migratie-file** — header, BEGIN, DDL, indexes, RLS, comments, COMMIT, rollback
4. **Verify-queries** — wat te runnen na apply
5. **Risico-flag** — als deze migratie data verandert / shared state raakt → expliciete user-confirm gevraagd

## Combineer met
- `/audit-db` — review schema voor migratie
- `/api-route` — als migratie nieuwe endpoint mogelijk maakt
- `/migration-fix` — als drift tussen lokaal en remote
- `/security-baseline` — RLS-check na migratie
