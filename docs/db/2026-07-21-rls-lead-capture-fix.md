# Supabase RLS — lead capture fix + grant lockdown (2026-07-21)

Applied directly to the `wbgiouuifqhasedncysw` Supabase project via
`apply_migration`. Recorded here because this repo has no
`supabase/migrations/` directory, so there is otherwise no trace of
production DDL in version control.

## What was broken

`public.leads` and `public.subscribers` had **RLS enabled with zero
policies**. Both public marketing forms write to them through the
`anon` role:

- `app/actions/contact.ts` → `leads`
- `app/actions/subscribe.ts` → `subscribers`

RLS with no policy denies everything, so every submission failed. The
contact action caught the error and returned *"Something went wrong.
Try again."* to the visitor, which is why this never surfaced as an
exception anywhere — it looked like a user-facing validation blip.

Proven before the fix, running as `anon`:

```
ERROR: 42501: new row violates row-level security policy for table "leads"
```

Evidence of the blast radius: `leads` had 1 lifetime insert (from
before RLS was switched on) and 0 live rows. `subscribers` had **zero
inserts, ever**.

## Migration 1 — `fix_public_form_inserts_leads_subscribers`

Insert-only for the public roles. The anon key ships in the browser
bundle, so it must be able to append and nothing else — never read
back, change or delete what visitors submitted.

```sql
revoke all on public.leads       from anon, authenticated;
revoke all on public.subscribers from anon, authenticated;

grant insert on public.leads       to anon, authenticated;
grant insert on public.subscribers to anon, authenticated;

create policy leads_public_insert on public.leads
  for insert to anon, authenticated with check (true);

create policy subscribers_public_insert on public.subscribers
  for insert to anon, authenticated with check (true);
```

No SELECT/UPDATE/DELETE policy on purpose — server-side reads go
through the service-role client, which bypasses RLS.

Verified after applying:

| Check | Result |
| --- | --- |
| `insert` into `leads` as `anon` | succeeds |
| `select` from `leads` as `anon` | `42501: permission denied for table leads` |
| `insert` into `subscribers` as `anon` | succeeds |

## Migration 2 — `revoke_public_role_grants_on_unpolicied_tables`

Every table in `public` with RLS on and **no** policy had full
`SELECT/INSERT/UPDATE/DELETE/TRUNCATE` granted to `anon` and
`authenticated` — including `User`, `Contact`, `Organization`,
`AuditLog` and `GdprConsentRecord`.

Nothing was exposed, because RLS-without-policies denies those roles
outright. But it meant a single permissive policy added later — or one
`alter table … disable row level security` — would have handed the
public browser key write access to personal data, silently.

The revoke is provably safe *because* RLS already blocks these roles:
nothing can be using grants it cannot exercise. Tables that carry a
policy are skipped — those are in active use.

```sql
do $$
declare r record;
begin
  for r in
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relrowsecurity = true
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  loop
    execute format('revoke all on public.%I from anon, authenticated', r.relname);
  end loop;
end $$;
```

Result: `anon`/`authenticated` grants dropped from ~90 tables to 17 —
the 15 with active policies, plus `leads` and `subscribers` (INSERT
only).

## Still open

- **`newsletter_subs` does not exist.** `app/actions/newsletter.ts`
  inserts into it for the double opt-in flow. The table is absent from
  every schema, so that path fails with "relation does not exist".
  Decide whether to create it or retire the flow in favour of
  `subscribers` — having two subscribe paths is likely why one rotted.
- **Two CRM databases.** This repo's Prisma targets MariaDB
  (`PrismaMariaDb` in `lib/philly/auth.ts`), but the Supabase Postgres
  holds a full copy of the same schema with rows written as recently as
  2026-07-12. Which is authoritative for DEUS is unresolved, and two
  stores of the same personal data is a GDPR problem in its own right —
  a subject access request answered from one would miss the other.
