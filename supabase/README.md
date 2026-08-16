# Supabase — `wbgiouuifqhasedncysw`

Deze map bestond hier niet tot 2026-08-16. Migraties op dit project werden
tot dan toe rechtstreeks toegepast, zonder bestand in enige repo. Dat is
precies het patroon dat elders al een keer misging: een commentaarblok dat
een fix beschrijft is geen bewijs dat de fix draait, en andersom draait er
van alles waar geen bestand bij hoort. Vanaf nu landt elke migratie op dit
project ook hier.

## Wat er in dit project woont

Eén Postgres, drie bewoners:

| schema | van wie | opmerking |
|---|---|---|
| `marketing` | juandiazllc.com | `leads`, `subscribers` — de publieke formulieren |
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

## Werkwijze

Migraties worden toegepast via de Supabase-MCP (`apply_migration`) en het
bestand komt hier met dezelfde `version_naam` als in
`supabase_migrations.schema_migrations`. Wijkt de ledger af van deze map,
dan is de ledger de waarheid — en dan is er een bestand zoekgeraakt.
