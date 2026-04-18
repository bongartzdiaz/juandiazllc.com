-- Newsletter subscribers for juandiazllc.com.
-- Run this in the Supabase SQL editor (brand project) before the
-- /api/newsletter action starts storing signups. Until then the
-- action fails gracefully and the user sees a generic error.

create table if not exists public.newsletter_subs (
  email       text primary key,
  source      text not null default 'unknown',
  created_at  timestamptz not null default now(),
  confirmed_at timestamptz,           -- reserved for later double-opt-in
  unsubscribed_at timestamptz
);

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

-- No select policy — the list is read only via the service role.
