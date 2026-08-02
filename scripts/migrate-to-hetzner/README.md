# Hetzner-migratie — niet uitgevoerd, en niet uitvoerbaar

> **Stand 2026-08-02.** Deze map staat sinds 2026-08-02 in `tsconfig.json` →
> `exclude`. Hieronder waarom, en welke beslissing er nog open ligt.

## Wat dit is

Een negenstaps runbook uit de sprint van mei 2026 voor de overstap van
Vercel + Supabase naar een eigen Hetzner-server met Postgres en Lucia-auth.

Die overstap is niet gebeurd. De site draait nog op Vercel; de deployments van
vandaag bevestigen dat.

## Waarom de map is uitgesloten van typecheck

`05-import-lucia-users.ts` importeert `pg`. Dat pakket staat **nergens** in
`package.json` — niet als dependency, niet als devDependency.

Het typechheckte tot vandaag alleen omdat `@sentry/node` v9 het via
`@opentelemetry/instrumentation-pg` meesleepte. Sentry v10 laat die afhankelijk-
heid vallen, en daarmee viel `pg` uit de boom.

Belangrijk: **het script kon sowieso al niet draaien.** `pg` is niet
geïnstalleerd, dus `node 05-import-lucia-users.ts` faalt hoe dan ook. De
Sentry-upgrade heeft niets kapotgemaakt; ze maakte alleen zichtbaar dat dit
script al die tijd op een toevallige meelifter leunde.

`tsconfig.json` heeft `include: ["**/*.ts"]`, dus zonder uitsluiting blokkeert
dit dode script de typecheck van de hele site.

## De beslissing die openstaat

Kies er één:

1. **Weggooien.** Als Hetzner van tafel is, hoort dit runbook in de
   git-geschiedenis en niet in de werkmap.
2. **Levend maken.** Voeg `pg` en `@types/pg` toe als devDependency en haal de
   uitsluiting weg. Doe dit alleen als de migratie echt nog op de rol staat —
   anders zijn het dependencies voor code die niemand draait.
3. **Laten staan zoals nu.** Het runbook blijft leesbaar als documentatie, maar
   is geen werkende code en wordt niet gecontroleerd.

Optie 3 is de huidige toestand. Dat is een houdbare tussenstand, geen eindpunt —
de map ziet er nu uit als werkende code terwijl ze dat niet is, en dit bestand
is het enige wat dat tegenspreekt.
