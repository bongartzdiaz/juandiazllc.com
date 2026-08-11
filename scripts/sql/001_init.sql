-- juandiazllc.com — leadopvang. Draai dit één keer op een verse Neon-database.
--
-- Achtergrond: deze twee tabellen stonden tot 2026-08-11 in Supabase, eerst in
-- `public` naast de 95 tabellen van het DEUS-CRM, daarna kort in een eigen
-- schema `marketing`. Ze zijn hierheen verhuisd omdat een opslagquotum van een
-- ánder project in dezelfde organisatie deze site vijf dagen lang plat legde
-- (2026-08-06 tot 2026-08-11, HTTP 402 op de hele REST-laag).
--
-- Wat hier bewust NIET staat:
--
--   RLS en policies. De vorige opzet liet de browser rechtstreeks inserten met
--   een publieke sleutel, en had RLS nodig om dat in te perken. Hier schrijft
--   alleen de server, met een connection string die de browser nooit ziet. Geen
--   policy die stukkan, geen `anon`-rol om te beperken.
--
--   Een trigger voor de meldingen. Die liep via `pg_net`, een Supabase-
--   extensie, en was onzichtbaar vanuit de code. De melding staat nu in
--   app/actions/{contact,subscribe}.ts en app/api/cal/route.ts, naast de
--   handeling die hem veroorzaakt.

create extension if not exists pgcrypto;   -- voor gen_random_uuid()

create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text        not null,
  company    text,
  sector     text,
  message    text,
  source     text        default 'contact_form',
  metadata   jsonb       default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leads_email_idx      on leads (email);
create index if not exists leads_created_at_idx on leads (created_at);

-- De cal.com-webhook zoekt op metadata->>'cal_uid' om herhaalde bezorgingen te
-- herkennen. Zonder deze index is dat een seq scan over de hele tabel.
create index if not exists leads_cal_uid_idx
  on leads ((metadata->>'cal_uid'))
  where metadata ? 'cal_uid';

create table if not exists subscribers (
  id         uuid primary key default gen_random_uuid(),
  -- Uniek: een tweede aanmelding met hetzelfde adres levert 23505 op, en
  -- app/actions/subscribe.ts behandelt dat als bevestiging, niet als fout.
  email      text        not null unique,
  source     text        default 'landing',
  metadata   jsonb       default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists subscribers_created_at_idx on subscribers (created_at);
