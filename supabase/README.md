# Supabase — `wbgiouuifqhasedncysw`

De submap `migrations/` bestond hier niet tot 2026-08-16. Migraties op dit
project werden tot dan toe rechtstreeks toegepast, zonder bestand in enige
repo. Dat is precies het patroon dat elders al een keer misging: een
commentaarblok dat een fix beschrijft is geen bewijs dat de fix draait, en
andersom draait er van alles waar geen bestand bij hoort. Vanaf nu landt
elke migratie op dit project ook hier.

**`brand/newsletter_subs.sql` is géén migratie en is nooit toegepast.**
`public.newsletter_subs` bestaat niet in de database; de inschrijvingen
landen in `marketing.subscribers`. Het bestand staat er sinds PR #9 en
beschrijft een ontwerp met dubbele opt-in dat het niet gehaald heeft. Het
draagt een waarschuwingsbanner — laat die staan.

## Wat er in dit project woont

Eén Postgres, drie bewoners:

| schema | van wie | opmerking |
|---|---|---|
| `marketing` | juandiazllc.com | `leads`, `subscribers` — de publieke formulieren; view `lead_response` voor de responstijd |
| `public` | DEUS (`phily_*`, `contacts`, `projects`, …) + PhilanthropyAI (`pai_*`) | 118 tabellen |
| `graphql_public` | Supabase zelf | |

**De naamgeving is geen eigendomsgrens.** Tabellen van drie verschillende
systemen staan door elkaar in `public`; ga er niet vanuit dat iets van jou
is omdat het er zo uitziet.

## Wat PostgREST naar buiten brengt

```
authenticator → pgrst.db_schemas = public, graphql_public, marketing
```

Let op: de rol `postgres` draagt nog een oude waarde met `diaz_editor` erin.
Dat schema bestaat niet meer. De rol die telt voor de API is
`authenticator`.

## Rechtenmodel, zoals het op 2026-08-16 gemeten is

- RLS staat aan op **alle** tabellen in `public`. Dat wordt afgedwongen door
  event trigger `public.rls_auto_enable()`, die het automatisch aanzet bij
  elke nieuwe tabel.
- 104 van die tabellen hebben RLS aan zonder policy. Dat is standaard
  weigeren, dus dicht — maar het is ook de valkuil waar de leadopvang ooit
  op stukliep: alles weigert, niets klaagt. Zet je zo'n tabel in gebruik,
  schrijf dan eerst een policy.
- Elke policy in `public` staat op `TO authenticated`. `anon` heeft op
  vijftien tabellen wel grants maar geen enkele toepasselijke policy, en
  leest dus niets.
- `marketing.leads` en `marketing.subscribers` zijn bewust schrijf-alleen:
  één policy `INSERT TO {anon, authenticated} WITH CHECK (true)`, en geen
  SELECT-recht voor wie dan ook behalve service_role. Een publiek formulier
  mag indienen, niemand mag teruglezen. Houd dat zo.

## De leadketen

Een rij in `marketing.leads` zet twee triggers in beweging, allebei via pg_net:

| trigger | roept aan | voor wie |
|---|---|---|
| `leads_notify_new` | `lead-notify` | Juan — Telegram, en Resend zodra dat kan |
| `leads_acknowledge_new` | `lead-acknowledge` | de aanvrager — ontvangstbevestiging in zijn eigen taal |

Gemeten 2026-08-16: beide vertrekken **34 ms** na de insert.

Er zijn **twee ingangen** naar die tabel, niet één: `components/ContactForm.tsx`
via `app/actions/contact.ts`, en `app/api/cal/route.ts` bij een boeking. Die
tweede is uitgesloten van de bevestiging (`WHEN source NOT LIKE 'cal\_%'`) —
cal.com bevestigt zelf al, en de tekst zou niet kloppen.

Drie kolommen dragen de administratie. `acknowledged_at` betekent **de mail is
echt de deur uit**, niet "geprobeerd": een mislukking laat hem leeg en zet de
reden in `ack_channel`. Anders zou `marketing.lead_response` meten hoe snel we
het proberen. `ack_seconds` is gegenereerd uit het verschil met `created_at`.

De taal komt uit `metadata.locale`, gezet door een verborgen veld in het
formulier en door een whitelist in de server-action. Ontbreekt hij, dan Engels.

### Wat hier nog open staat

- **`lead_notify_secret` staat niet in de vault.** Beide functies draaien met
  `verify_jwt: false` en zonder gedeelde sleutel, dus wie de URL kent mag
  posten. Voor `lead-acknowledge` is dat afgevangen in de code: het
  ontvangeradres komt uitsluitend uit de database en een onbekend id levert
  `skipped:unknown-lead`. Voor `lead-notify` niet — een vreemde kan Juan
  daarmee valse meldingen sturen. Zet de sleutel in de vault én als
  `LEAD_NOTIFY_SECRET` op beide functies; de volgorde maakt niet uit.
- **Er gaat nog geen bevestiging uit.** `RESEND_API_KEY` en `ACK_FROM` zijn
  ongezet. Zie MANUAL_TASKS.md; `ACK_FROM` moet een **geverifieerd domein**
  zijn, want `@resend.dev` levert alleen aan de accounthouder en wordt door de
  functie geweigerd.

## Werkwijze

Migraties worden toegepast via de Supabase-MCP (`apply_migration`) en het
bestand komt hier met dezelfde `version_naam` als in
`supabase_migrations.schema_migrations`. Wijkt de ledger af van deze map,
dan is de ledger de waarheid — en dan is er een bestand zoekgeraakt.

**`apply_migration` kent het versienummer zélf toe**, op servertijd. Wat je
meegeeft als `name` komt ongewijzigd in de naamkolom. Zet er dus géén
tijdstempel in, anders staat hij er dubbel in en wijkt de bestandsnaam af van
de ledger. Op 2026-08-16 is dat één keer misgegaan en rechtgezet.

De ledger bevat ook `20260816152808_outreach_mystery_shop_logger`. Dat bestand
staat hier bewust niet: het hoort bij DEUS-outreach en leeft in
`bongartzdiaz/DEUS-SHARED` onder `outreach/db/`. Eén database, twee repo's.

## Edge functions

`functions/` bevat de broncode van de functies die op dit project draaien.
Uitrollen gaat via de Supabase-MCP (`deploy_edge_function`), niet via GitHub
Actions — die zijn op beide privérepo's geblokkeerd door de facturatie.

Deze map staat in `tsconfig.json` onder `exclude`. Dat moet: het is Deno-code
met eigen globals (`Deno.env`, `Deno.serve`), en de Next-typecheck kent die
niet — zonder uitsluiting valt `npm run typecheck` om op negen `Cannot find
name 'Deno'`. De keerzijde is dat deze bestanden door **geen enkele** poort in
deze repo worden gecontroleerd. Wie ze aanpast, leunt op de verificatie tegen
de draaiende functie, niet op CI.

**De broncode van `lead-notify` staat hier nog niet.** Die functie bestaat
alleen als deployment; wat er draait is op te halen met `get_edge_function`.
Dat is precies het gat waar dit bestand bovenaan voor waarschuwt, en het is
werk dat nog gedaan moet worden.
