# ⚠️ Waarschuwing bij alles in deze map

**Datum: 2026-07-26**

## De Hetzner-migratie is nooit doorgegaan

Vijftien bestanden in `_drafts/` beschrijven een infrastructuur die niet
bestaat:

> *"Hetzner Falkenstein, Germany. Backups in Backblaze B2 (Amsterdam).
> We do not transfer Personal Data outside the EEA."*

Die cutover stond gepland voor **2026-05-15** en is niet uitgevoerd. De
werkelijke stack is **Supabase + Vercel**, met MariaDB voor het CRM en een
hostingregio die op dit moment nergens is vastgesteld.

Bovendien is *"geen doorgifte buiten de EER"* onjuist ongeacht de hosting:
`lib/philly/ai/contact-attributes.ts` stuurt naam, e-mail, telefoon,
bedrijf en notities naar **Anthropic in de Verenigde Staten**.

## Wat dat betekent voor deze map

De live site is op 2026-07-26 gecorrigeerd (`lib/i18n/dict.ts`,
`app/[locale]/status/page.tsx`, `lib/philly/help/articles.ts`). De
concepten hier zijn dat **niet allemaal** — alleen `legal/privacy-en.md`
is bijgewerkt.

**Publiceer niets uit deze map zonder eerst te controleren op:**

1. `Hetzner` / `Falkenstein` / `Backblaze` — beschrijft niet-bestaande infra
2. `EEA` / `never leaves` / `no US transfer` — onjuist vanwege Anthropic
3. `no Schrems II concerns` — niet vast te stellen zolang de regio's onbekend zijn

Bestanden met minstens één van deze problemen:

```
launch/hash-update-pre-launch.md      onboarding/customer-prospect-email.md
launch/linkedin-launch-post.md        onboarding/first-questions-customer-en.md
legal/beta-side-letter-en.md          operator/env-vars-walkthrough.md
legal/beta-side-letter-nl.md          operator/support-email-templates.md
legal/dpa-en.md                       operator/support-runbook-first-30d.md
legal/privacy-en.md  ✅ bijgewerkt    pr12-body.md
legal/subprocessors-en.md  ⚠️ heeft   pricing/pricing-tiers-en.md
   al een DO-NOT-PUBLISH-banner       pricing/pricing-tiers.csv
```

## Wat er eerst moet gebeuren

De hostingregio van Supabase, Resend en de MariaDB-host vaststellen in de
vendor-dashboards. Zolang dat niet is gedaan, kan geen enkele uitspraak
over datalocatie worden gepubliceerd — ook geen voorzichtige.

Zie `docs/legal/verwerkingsregister.md` §0 en §4.

## De les die hieronder ligt

Deze concepten zijn geschreven toen de migratie *gepland* was, en nooit
teruggedraaid toen hij niet doorging. Een document dat een toekomstplan in
de tegenwoordige tijd beschrijft, wordt onwaar op het moment dat het plan
wijzigt — en niemand merkt het, want het is een concept.

Schrijf plannen in de toekomende tijd, of zet er een datum en een status
boven.
