# Hetzner-migratie — runbook

Negen stappen voor de overstap van Vercel + Supabase naar een eigen
Hetzner-server met Postgres en Lucia-auth. Opgesteld in de sprint van mei 2026.

**Stand 2026-08-02: nog niet uitgevoerd.** De site draait op Vercel. Het plan
staat wel nog op de rol — vandaar dat dit runbook onderhouden wordt in plaats van
opgeruimd.

## Volgorde

| | Wat |
|---|---|
| `01-bootstrap.sh` | server klaarzetten |
| `02-postgres-init.sql` | database aanmaken |
| `03-lucia-schema.sql` | auth-schema |
| `04-export-supabase-users.ts` | gebruikers uit Supabase halen |
| `05-import-lucia-users.ts` | ze in Postgres zetten |
| `06-caddy-config.example` | reverse proxy |
| `07-pm2-ecosystem.example.js` | procesbeheer |
| `08-backup-cron.sh` | back-ups |
| `09-smoke-test.sh` | controle achteraf |

## Wat er op 2026-08-02 is gerepareerd

`05-import-lucia-users.ts` importeert `pg`. Dat pakket stond **nergens** in
`package.json` — niet als dependency, niet als devDependency.

Het typechheckte al die tijd alleen omdat `@sentry/node` v9 het via
`@opentelemetry/instrumentation-pg` meesleepte. Toen Sentry naar v10 ging viel
die meelifter weg en blokkeerde dit script de typecheck van de hele site
(`tsconfig.json` heeft `include: ["**/*.ts"]`).

Belangrijker dan de typecheck: **het script kon niet draaien.** `pg` was niet
geïnstalleerd, dus `05-import-lucia-users.ts` zou bij de eerste `require` zijn
gestopt. Dat was niet zichtbaar omdat niemand het startte.

`pg` en `@types/pg` staan nu als devDependency in `package.json` — devDependency
omdat dit migratiegereedschap is en niet meedraait in de applicatie. De
tijdelijke uitsluiting uit `tsconfig.json` is weer weg; de map wordt dus
gewoon meegecontroleerd.

## Voor je dit draait

Het is niet beproefd sinds mei. Reken erop dat er meer verouderd is dan alleen
die dependency — controleer minstens:

- of het Supabase-exportformaat in `04-export-supabase-users.ts` nog klopt
- of het Lucia-schema in `03-lucia-schema.sql` overeenkomt met de auth die de
  app vandaag gebruikt
- of `09-smoke-test.sh` de paden test die er nu toe doen

Dat is niet gecontroleerd bij het herstel van vandaag; alleen dat het geheel
weer typechheckt.
