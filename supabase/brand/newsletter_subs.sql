-- ⚠️ NOOIT TOEGEPAST — NIET UITVOEREN. Gemeten op 2026-08-16 tegen
-- Supabase-project wbgiouuifqhasedncysw: `to_regclass('public.newsletter_subs')`
-- geeft NULL. De tabel hieronder bestaat niet en heeft nooit bestaan.
--
-- De nieuwsbriefinschrijvingen zijn ergens anders geland:
-- **`marketing.subscribers`**, met een trigger `subscribers_notify_new` die
-- `public.notify_new_lead()` aanroept. Dat is de tabel die telt.
--
-- Dit bestand staat er sinds PR #9 en beschrijft een ontwerp dat het niet
-- gehaald heeft — inclusief dubbele opt-in via `confirm_token`, wat
-- `marketing.subscribers` niet heeft. Het blijft staan omdat die
-- opt-in-kolommen een bewuste keuze vastleggen die je terug wilt kunnen
-- vinden als de nieuwsbrief ooit echt wordt uitgerold.
--
-- Wil je het alsnog bouwen, doe dat dan als migratie in
-- `supabase/migrations/` tegen `marketing.subscribers`, niet als los script
-- in de SQL-editor. Zie `supabase/README.md`.
--
-- ─────────────────────────────────────────────────────────────────────────
--
-- Newsletter subscribers for juandiazllc.com.
-- Run this in the Supabase SQL editor (brand project) before the
-- /api/newsletter action starts storing signups. Until then the
-- action fails gracefully and the user sees a generic error.

create table if not exists public.newsletter_subs (
  email          text primary key,
  source         text not null default 'unknown',
  locale         text not null default 'en',
  created_at     timestamptz not null default now(),
  confirm_token  uuid,                  -- double-opt-in token, cleared on confirm
  confirmed_at   timestamptz,           -- set when the user clicks the email link
  unsubscribed_at timestamptz
);

-- Add columns if the table already exists from an earlier run.
alter table public.newsletter_subs add column if not exists locale text not null default 'en';
alter table public.newsletter_subs add column if not exists confirm_token uuid;

-- Unique index on confirm_token so lookups are O(1) and collisions impossible.
create unique index if not exists newsletter_subs_confirm_token_idx
  on public.newsletter_subs (confirm_token)
  where confirm_token is not null;

-- Index on source so we can segment by entry point later (insights
-- footer vs landing vs article detail).
create index if not exists newsletter_subs_source_idx
  on public.newsletter_subs (source);

-- RLS: the brand-side signup runs with the anon key (no auth).
-- We only allow insert (upsert target), no select/update/delete,
-- so an attacker can't scrape the list.
alter table public.newsletter_subs enable row level security;

drop policy if exists "anon can subscribe" on public.newsletter_subs;
create policy "anon can subscribe"
  on public.newsletter_subs
  for insert
  to anon
  with check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

-- No anon select/update policies — confirmation and list reads run
-- through the service role (SUPABASE_SERVICE_ROLE_KEY) which bypasses
-- RLS. That keeps the confirmation token from being exposed to the
-- browser and prevents anyone from scraping the list.
