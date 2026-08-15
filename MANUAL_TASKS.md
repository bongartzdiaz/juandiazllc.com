# Manual tasks — things Claude can't do from the repo

Every item here is a one-time human action that unblocks code that's
already shipped. Strike through (`~~...~~`) when done.

## AI contact attributes — web enrichment (2026-07-21)

### 1. Database migration (required — the code expects the column)

```bash
npx prisma migrate dev --name ai_attributes_sources
```

Adds `Contact.aiAttributesSources` — records whether an enrichment run
used CRM data only or also read a company homepage. Needed for GDPR
Art. 15 ("which sources did you use about me").

### 2. Web enrichment — LEGAL GATE, do not enable yet

`FIRECRAWL_API_KEY` is **deliberately left unset**. The code ships
safe-by-default: with no key, enrichment behaves exactly as before
(CRM data only) and never makes an external request.

**Before setting it in any environment with real contact data:**

- [ ] Read `docs/legal/DPIA-AI-ATTRIBUTES.md` §1.2a and risks 9-11
- [ ] Get DPO/legal sign-off on §1.2a — §5 records that this is **not
      yet obtained**, and residual risk 11 (sole-trader/personal-domain
      conflation) is accepted rather than eliminated
- [ ] Sign a DPA with Firecrawl and confirm their region + transfer
      mechanism
- [ ] Update `_drafts/legal/subprocessors-en.md` (Firecrawl row has
      `[VERIFY]` placeholders) and notify customers 30 days ahead, as
      that document promises

Only then:

```bash
npx vercel env add FIRECRAWL_API_KEY production
```

### 3. Sub-processor list is factually wrong — fix independently

`_drafts/legal/subprocessors-en.md` claimed DEUS uses no third-party AI
APIs and transfers no data outside the EEA. The shipped code calls
Anthropic's hosted API. The draft now carries a DO-NOT-PUBLISH banner
and corrected rows with `[VERIFY]` markers.

- [ ] Confirm the Anthropic legal entity, region, and transfer
      mechanism; fill the placeholders
- [ ] Confirm an Anthropic DPA + SCCs actually exist (the DPIA's
      risk-5 mitigation assumes they do)
- [ ] Decide: correct the public claim, or finish the Hetzner
      self-hosting cutover so the original claim becomes true

**This blocks publishing `/legal/subprocessors`.** It is independent of
the web-enrichment feature — it was already inaccurate.

## UptimeRobot monitoring — site health checks (2026-07-18)

The daily SEO pulse cron can't reach juandiazllc.com directly (Cloudflare
blocks the headless execution environment's IPs). UptimeRobot runs from
its own trusted IPs and is whitelisted by Cloudflare's bot rules by default.

Setup takes ~5 minutes:

- [ ] Create a free UptimeRobot account at https://uptimerobot.com (50 monitors,
      5-min intervals, no card required).
- [ ] Go to **Dashboard → My Settings → API Settings** → generate a
      **read-write API key** (starts with `ur`).
- [ ] Run the setup script from the repo root:
      ```bash
      UPTIMEROBOT_API_KEY=ur... bash scripts/setup-uptimerobot.sh
      ```
      This creates 5 monitors:
      - `/en` homepage
      - `/sitemap.xml`
      - `/robots.txt`
      - `/de/insights/the-build-vs-buy-trap` (DE content / i18n routing)
      - `/en/tools/energy-roi` (high-value conversion page)
- [ ] Confirm all 5 appear green in the dashboard within ~1 minute.
- [ ] (Optional) Add a Slack alert contact in Dashboard → Alert Contacts so
      downtime pings #ops or similar, rather than only emailing.

## Cal.com — verplichte vragen + webhook (2026-08-02)

De ontvanger staat klaar op `POST /api/cal`. Hij doet **niets** zolang deze twee
stappen niet zijn gezet: zonder `CAL_WEBHOOK_SECRET` antwoordt hij 503, en zonder
webhook in cal.com komt er niets binnen.

**1. Verplichte booking-vragen** — cal.com → Event Types → *15 min* → Advanced →
Booking questions.

Nu vraagt het formulier alleen naam, e-mail en een **optionele** notitie. Je gaat
een gesprek in zonder te weten wie er zit of wat hij wil.

| Vraag | Type | Verplicht | Identifier (moet exact) |
|---|---|---|---|
| Bedrijf | text | ja | `company` |
| Website | text | nee | `website` |
| Sector | select: energie / vastgoed / hospitality / anders | ja | `sector` |
| Welk probleem wil je in 15 minuten oplossen? | textarea | **ja** | `probleem` |

De route leest die identifiers. Wijk je ervan af, dan komt het antwoord wel
binnen maar landt het niet in de juiste kolom — de lead wordt dan aangemaakt met
lege velden, zonder foutmelding.

> Verplichte vragen **blokkeren de boeking**. Er ontstaat dus geen afspraak die
> je daarna moet afzeggen. Annuleren blijft nuttig voor no-shows, niet voor
> ontbrekende gegevens.

**2. Webhook** — cal.com → Settings → Developer → Webhooks → *New*.

- [ ] Subscriber URL: `https://juandiazllc.com/api/cal`
- [ ] Event triggers: **Booking Created** en **Booking Cancelled**
- [ ] Secret: genereer een lange willekeurige waarde en vul die in
- [ ] Zet diezelfde waarde in Vercel als `CAL_WEBHOOK_SECRET` (Production +
      Preview) en redeploy
- [ ] Doe één testboeking en controleer: rij in `leads` met `source='cal_15min'`,
      Telegram-push aangekomen, en `metadata->>cal_uid` gevuld

**3. Aanbevolen hardening (nog niet gedaan).** De idempotentie zit nu alleen in
de applicatie: de route kijkt of er al een lead met dezelfde `cal_uid` bestaat.
Bij twee gelijktijdige leveringen kan dat een race verliezen. Een index maakt het
een garantie:

```sql
create unique index concurrently if not exists leads_cal_uid_uniek
  on public.leads ((metadata->>'cal_uid'))
  where metadata ? 'cal_uid';
```

Dit is een schemawijziging op productie — bewust niet zelf uitgevoerd.

## Plausible — doel "Boeking 15min" aanmaken (2026-08-02)

De boekknop op `/contact` is getagd met `plausible-event-name=Boeking+15min`.
De `tagged-events`-variant van het script staat al aan
(`components/Analytics.tsx`), dus de klik wordt verstuurd zodra de knop live is.

**Maar Plausible telt een custom event pas als het doel bestaat.** Zonder deze
stap komen de kliks binnen en worden ze weggegooid — je ziet niets, en dat is
niet te onderscheiden van "niemand klikt".

- [ ] Plausible → Site Settings → **Goals** → *Add goal* → **Custom event**
- [ ] Naam exact: `Boeking 15min` (de `+` in de class is een spatie)
- [ ] Na de eerste echte klik controleren of hij in het dashboard verschijnt

## DataForSEO — vervangt Ahrefs (client staat klaar, 2026-08-03)

Ahrefs gaat eruit. `lib/seo/dataforseo.ts` is de vervanger; hij is geschreven
tegen de API-vorm zoals die op 2026-08-03 in de documentatie stond en heeft
18 tests. Wat nog ontbreekt zijn de inloggegevens.

**Wat DataForSEO NIET doet:** jouw clicks en vertoningen. Die staan alleen in
Search Console en zijn privé voor de eigenaar van de property — geen enkele
derde partij komt erbij. DataForSEO ziet de buitenkant (posities, volumes,
backlinks, concurrenten) en schat die. Je hebt ze allebei nodig.

**Route 1 — client in de repo (voor de dagelijkse pulse en CI)**

- [ ] Haal de API-inloggegevens op bij https://app.dataforseo.com/api-access.
      Dat is **niet** je accountwachtwoord maar een apart, gegenereerd
      wachtwoord.
- [ ] Zet ze als `DATAFORSEO_LOGIN` en `DATAFORSEO_PASSWORD` — lokaal in
      `.env.local`, en in Vercel als de pulse daar moet draaien.
- [ ] Eerst kijken wat het zou opvragen, gratis:
      `npm run seo:report:dry`
- [ ] Daarna echt (dit kost geld; het script drukt de kosten per onderdeel en
      het totaal af): `npm run seo:report` — of `npx tsx scripts/seo-report.ts
      --markt=de` voor een andere markt.

**Route 2 — MCP-server (voor ad-hoc onderzoek tijdens een sessie)**

Toevoegen aan de Claude-configuratie. De officiële server draait via npx:

```json
{
  "mcpServers": {
    "dataforseo": {
      "command": "npx",
      "args": ["-y", "dataforseo-mcp-server"],
      "env": {
        "DATAFORSEO_USERNAME": "<login>",
        "DATAFORSEO_PASSWORD": "<api-wachtwoord>"
      }
    }
  }
}
```

> **Pakketnaam geverifieerd op 2026-08-11:** `dataforseo-mcp-server` bestaat,
> versie 2.9.13, beschreven als "A Model Context Protocol (MCP) server for the
> DataForSEO API". Dat deel klopt dus.
>
> Wat nog steeds **niet** geverifieerd is: of de server met deze env-namen
> daadwerkelijk start. Zonder inloggegevens kon ik hem niet draaien, en
> `DATAFORSEO_USERNAME` versus `DATAFORSEO_LOGIN` is precies het soort verschil
> dat pas bij de eerste run opvalt. Houd de README ernaast.

**Let op de kosten.** Elk verzoek wordt afgerekend. De client geeft `cost` per
antwoord terug en het rapport telt op; laat dat staan. De limiet is 12
verzoeken per minuut, dus de client houdt vijf seconden tussen aanroepen aan.

## Ahrefs API — VERVALLEN. Niets meer doen (afgesloten 2026-08-11)

> ## ⛔ Deze hele sectie is historie. Vraag geen sleutel meer aan.
>
> **De deadline van 10 augustus is verstreken en het endpoint is nu dood.**
> Opnieuw gemeten op 2026-08-11:
>
> | endpoint | 2026-08-03 | 2026-08-11 |
> |---|---|---|
> | `public-domain-rating-free` | werkte, DR = 0.0 | `Insufficient plan` |
> | `subscription-info-limits-and-usage` | `Insufficient plan` | `Insufficient plan` |
>
> De sleutel authenticeert nog wél — anders was het een auth-fout geweest, geen
> plan-fout — maar hij levert niets meer op. Een nieuwe gratis sleutel aanvragen
> lost dus ook niets op.
>
> **En dat hoeft ook niet.** De keuze uit het lijstje hieronder is op
> 2026-08-03 al gemaakt: Ahrefs gaat eruit, DataForSEO komt ervoor in de
> plaats. Zie de sectie "DataForSEO — vervangt Ahrefs" hierboven. De client
> `lib/seo/dataforseo.ts` is af met 18 groene tests; alleen de inloggegevens
> ontbreken nog.
>
> Wat hieronder staat blijft staan omdat het uitlegt hóé dit zo gekomen is, en
> omdat de Search-Console-route eronder nog steeds geldt — GSC is de enige bron
> voor je eigen clicks en vertoningen, en die vervangt DataForSEO niet.

> **Correctie op de regel hieronder.** De vorige versie van dit blok zei dat de
> deadline verstreken was en dat **élk** endpoint `Insufficient plan` gaf.
> Allebei niet waar, opnieuw gemeten op 2026-08-03:
>
> | endpoint | uitkomst vandaag |
> |---|---|
> | `public-domain-rating-free` | **werkt** — DR = 0.0 |
> | `subscription-info-limits-and-usage` | `Insufficient plan` |
> | alle `gsc-*` | `Insufficient plan` |
>
> De waarschuwing die het DR-endpoint zelf meestuurt noemt **2026-08-10**, niet
> 2026-08-01. Er is dus nog een week om de gratis sleutel te regelen, geen
> gemiste deadline.
>
> Wat wél klopt: er komt geen zoekdata uit Ahrefs. Geen keywords, geen
> verkeer, geen GSC.
>
> Dat betekent dat de site op dit moment **blind publiceert**. Er is geen manier
> om te zien of een artikel iets doet, welke zoekopdrachten binnenkomen, of een
> nieuwe pagina wordt geïndexeerd.
>
> **Beslis één van beide en doe het ook:**
>
> - [ ] Ahrefs vervangen — een betaald plan dat de GSC- en keyword-API's bevat
> - [ ] Ahrefs laten vallen en **Google Search Console rechtstreeks koppelen**.
>       Gratis, en het is de bron waar de pulse eigenlijk om vraagt; Ahrefs was
>       er alleen een doorgeefluik voor. Aanbevolen.
>
> Zolang geen van beide is gebeurd, hoort de pulse "geen SEO-data beschikbaar"
> te melden — niet een leeg resultaat dat op nul lijkt.

**Google Search Console koppelen (aanbevolen route, ~20 min)**

> **Vooraf gecontroleerd op 2026-08-03**, zodat deze twintig minuten niet
> stuklopen op iets wat vooraf te meten was:
>
> - `https://juandiazllc.com/sitemap.xml` geeft 200 en staat op het juiste
>   domein (lokaal staat er `localhost:3000` in — dat is de dev-waarde van
>   `NEXT_PUBLIC_SITE_URL` en raakt productie niet).
> - 176 `<url>`-blokken, alle met `hreflang` én `lastmod`.
> - hreflang is wederkerig: geen enkele annotatie wijst naar een URL die
>   zelf niet terugverwijst. Google negeert eenzijdige annotaties, dus dit
>   is de fout die het vaakst stilletjes misgaat.
> - Steekproef van 15 URL's: allemaal 200, canonical gelijk aan de
>   sitemap-URL.
>
> Kortom: de sitemap is klaar om ingediend te worden. Het script staat in de
> sessie-scratchpad (`sitemap-check.mjs`) als je het wilt herhalen.

- [ ] Property aanmaken voor `juandiazllc.com` op
      https://search.google.com/search-console — kies **Domain**, niet
      URL-prefix, anders mis je de subdomeinen.
- [ ] Verifiëren via DNS-TXT bij de registrar.
      *Kies je toch URL-prefix, dan geeft Google een meta-tag in plaats van een
      DNS-record. Zet de waarde daarvan als `GOOGLE_SITE_VERIFICATION` in
      Vercel — `app/layout.tsx` rendert de tag dan op elke pagina, in alle vier
      de talen. Zonder die variabele wordt er niets gerenderd, dus er hoeft
      geen code te wijzigen.*
      *Beide richtingen gemeten op 2026-08-03. Let op: de metadata wordt bij het
      verzoek berekend, niet bij de build — een dráaiende server pikt een nieuwe
      variabele dus niet op. Op Vercel is dat vanzelf goed (nieuwe deploy =
      nieuw proces); lokaal moet je `next start` herstarten, anders test je een
      oude toestand. Daar liep ik zelf eerst in.*
- [ ] Sitemap indienen: `https://juandiazllc.com/sitemap.xml`.
- [ ] Voor geautomatiseerd uitlezen: service-account aanmaken in Google Cloud,
      Search Console API aanzetten, het service-account-e-mailadres als
      gebruiker toevoegen in Search Console.

**Historische context — free Domain-Rating endpoint, deadline 2026-08-01.**
De pulse gebruikte Ahrefs' gratis publieke Domain-Rating-endpoint. Ahrefs
verwijderde *niet-geauthenticeerde* toegang daarop per **2026-08-01**; daarna
geeft het een fout zonder sleutel.

- [ ] Generate a free Ahrefs API key (~5 min):
      https://docs.ahrefs.com/en/api/reference/public/get-domain-rating-free
- [ ] Set it where the Ahrefs MCP / pulse reads it (e.g. `AHREFS_API_KEY`).
- [ ] Re-run the pulse and confirm the DR number returns without the
      "unauthenticated access will be removed" warning.

**2. Ahrefs plan gates the useful SEO data.**
The attached Ahrefs MCP connector returns `Insufficient plan` for every
GSC (`gsc-*`), keyword (`keywords-explorer-*`), rank-tracker, and
site-explorer endpoint. Only the free public DR endpoint works today, so
Part C of the daily pulse (top queries, clicks/impressions, indexing
errors on new pages) **cannot run**. Decide one:

- [ ] Upgrade the Ahrefs plan to a tier that includes GSC + keyword APIs, **or**
- [ ] Wire Google Search Console directly (GSC API / service account) for the
      pulse instead of going through Ahrefs. GSC is free and is the actual
      source the pulse wants; Ahrefs was only a proxy for it.

Until one of these lands, the pulse should keep reporting "GSC not wired /
plan insufficient" for Part C rather than implying it ran.

## Outreach operator allowlist — REQUIRED before onboarding customer #2 (A-13, 2026-05-30)

The `li.*` LinkedIn-outreach surface (`/philly/outreach/*` + `/api/outreach/*`)
is single-tenant — it holds the operator's own outreach pipeline and has no
`organization_id` column, so it cannot be org-scoped. A new guard
(`lib/philly/outreach-guard.ts`) protects it:

- **Today (single org):** nothing to do. With one organization in the DB the
  guard allows access — there is no other tenant to leak to.
- **Before a SECOND organization exists:** set the Vercel env var
  `OUTREACH_OPERATOR_ORG_IDS` to the operator org id(s) (comma-separated).
  Only those orgs may then reach the outreach surface; every other org gets a
  404. If you skip this, the guard fails safe — once a 2nd org exists with no
  allowlist configured it denies the outreach surface to everyone (and logs a
  warning) rather than leak the operator's data.

- [ ] (at customer #2) Set `OUTREACH_OPERATOR_ORG_IDS=<operator-org-id>` in
      Vercel (production + preview).

## Supabase `wbgiouuifqhasedncysw` — tien dode edge functions weghalen (2026-08-15)

Gemeten 2026-08-15. Dit project draagt **dertien** edge functions. Tien ervan
horen bij Diaz Editor en zijn de verlaten kopie uit mei; de levende versies
draaien in `vbozelswveaxsyccvaac` en worden daar door GitHub Actions uitgerold
vanuit `bongartzdiaz/diaz-editor`.

**Weg (tien):** `diaz-affiliate-activate`, `diaz-affiliate-apply`,
`diaz-appsumo-redeem`, `diaz-beta-checkout`, `diaz-lemon-webhook`,
`diaz-license-issue`, `diaz-license-validate`, `diaz-release-blast`,
`diaz-stripe-webhook`, `diaz-trial-init`.

**Blijven (drie):** `lead-notify` — die stuurt de Telegram-melding bij elke
lead. Plus `pai-vapi-webhook` en `pai-weekly-digest` voor PhilanthropyAI.

**Waarom dit meer is dan opruimen.** Alle tien staan op `status: ACTIVE` met
`verify_jwt: false`, dus ze zijn over HTTPS aan te roepen door iedereen die de
slug raadt. Twee geven licenties uit (`diaz-license-issue`,
`diaz-appsumo-redeem`) en drie nemen betaal-callbacks aan
(`diaz-stripe-webhook`, `diaz-lemon-webhook`, `diaz-beta-checkout`). Ze draaien
mei-code tegen een schema dat niet meer bestaat — `diaz_editor` is op
2026-08-12 uit dit project gedropt — dus ze zullen eerder falen dan schade
doen. "Faalt luid" is alleen geen beveiligingsmaatregel.

Er is ook een terugkerende kostenpost. `docs/claims.md` legt vast dat een
prijssweep in augustus €1.000 corrigeerde in twee van deze functies, in de
kopie die niemand aanroept. Elke volgende sweep betaalt die tol opnieuw zolang
ze er staan.

**Hoe dood is dood.** Nul aanroepen van welke functie dan ook in dit project in
de afgelopen 24 uur (`edge_logs`, het volledige venster dat de log-API geeft).
Dat is het sterkste beschikbare bewijs, geen sluitend bewijs: 24 uur is kort,
en `lead-notify` wordt vanuit een database-trigger via pg_net aangeroepen, wat
mogelijk helemaal niet in het gateway-log verschijnt. Lees het als "vandaag
heeft niets van buiten deze functies aangeroepen".

**Waarom ik het niet zelf doe.** De Supabase-MCP heeft geen tool om een functie
te verwijderen, en de lokale `supabase`-CLI is ingelogd op een ander account
(403 op dit project). Het is een dashboard-handeling.

**Doen:** Supabase-dashboard → project `wbgiouuifqhasedncysw` → Edge Functions →
per functie → Delete. Tien keer. Geen enkele regel code in deze repo verwijst
naar een van de tien (gecontroleerd); alleen `docs/claims.md` en
`docs/legal/verwerkingsregister.md` noemen ze in tekst.

- [ ] tien `diaz-*`-functies verwijderd uit `wbgiouuifqhasedncysw`

**Los daarvan, voor als je toch in dat register kijkt.**
`docs/legal/verwerkingsregister.md` verwijst voor deze verwerkingen naar
`supabase/functions/…` — de broncode in de diaz-editor-repo, dus het register
beschrijft de levende functies en blijft na het opruimen kloppen. Het noemt
alleen **geen projectref**. Dat is precies de verwarring die dit probleem heeft
gemaakt: twee projecten, één naam. Eén regel `vbozelswveaxsyccvaac` erbij maakt
het register bestand tegen dezelfde fout. Niet door mij gedaan, want het is een
juridisch document.

## Repo strategy — DEUS-SHARED is now primary for CRM (2026-05-07)

Decision: future CRM (DEUS) work moves to `bongartzdiaz/DEUS-SHARED`.
The unified `bongartzdiaz/juandiazllc.com` repo continues as the home
of the brand site (`app/[locale]/*`, marketing pages). The two
codebases are no longer mirrored — DEUS-SHARED is the source of truth
for the CRM.

**What changed:**
- `.github/workflows/sync-deus-shared.yml` (the auto-mirror we shipped
  in `f51057b`) has been removed. It never had its `DEUS_SHARED_PAT`
  secret set, so it never ran — but it would have force-pushed
  juandiazllc.com over DEUS-SHARED's distinct CRM-only structure,
  which is now wrong.
- The pre-existing "Sync Bot" mechanism that was extracting
  philly-standalone into DEUS-SHARED (last sync 2026-04-29) is
  separate from our workflow. It's externally managed; turn it off
  outside this repo if it's still active.

**Next session: clone DEUS-SHARED.**
```
git clone https://github.com/bongartzdiaz/DEUS-SHARED.git
```
The structure is flat (`app/`, `components/`, `prisma/`, `lib/` at
root — no `/philly/` prefix). Today's CRM-side code in PR #12 will
need to be either ported into the DEUS-SHARED structure manually, or
a cross-repo cherry-pick — not addressed in this PR since PR #12 also
contains brand-site bundles that belong on juandiazllc.com.

## Hetzner cutover — pre-flight (Friday 2026-05-15 target)

Runbook: [`docs/hetzner-cutover-runbook.md`](docs/hetzner-cutover-runbook.md).
Migration scripts: [`scripts/migrate-to-hetzner/`](scripts/migrate-to-hetzner/)
(01-bootstrap → 09-smoke-test, run in order).

The runbook covers the full ceremony but these three items have to be
done **at least 24 hours before** the cutover ceremony or the box
locks us out / DNS doesn't propagate / OAuth callbacks 4xx for
in-flight customers. Treat as blocking gates.

- [ ] **DNS TTL drop — 24h before flip.** Confirm registrar (Cloudflare?
      Namecheap?) and lower TTL to 60s on `app.juandiazllc.com` (and
      `juandiazllc.com` if we're flipping the brand site at the same
      time). If we forget this, we sit on a stale `A` record for the
      rest of the day post-cutover and the rollback window narrows.
- [ ] **Operator SSH key uploaded to Hetzner Robot BEFORE bootstrap.**
      `01-bootstrap.sh` writes the key as the only `authorized_keys`
      entry for `deus` and immediately disables `PasswordAuthentication`.
      If the key isn't on the box at that point, the script locks us
      out — no recovery short of Hetzner KVM. Generate locally
      (`ssh-keygen -t ed25519 -f ~/.ssh/deus_operator -C "deus@<laptop>"`),
      paste the public key into Hetzner Robot → Server → Rescue tab
      → Activate → upload, AND export it as `DEUS_OPERATOR_KEY` for
      the script.
- [ ] **B2 EU bucket + OAuth callback co-existence — created before
      Friday.** Three sub-steps that all need to land before the
      cutover so the new box has somewhere to back up to and OAuth
      keeps working for any user mid-session during the flip:
  - Create Backblaze B2 bucket (region: `eu-central-003`) named
    `deus-backups-eu`. 30-day lifecycle rule for `postgres/*` and
    `mariadb/*` prefixes.
  - Create scoped Application Key — bucket-only, list+read+write,
    no master-key reuse. Stash `B2_KEY_ID` + `B2_APPLICATION_KEY`
    for `08-backup-cron.sh`'s `/home/deus/.deus-backup-env`.
  - Add the new Hetzner callback URLs to the existing OAuth
    registrations (Google Cloud Console + Entra ID) AS ADDITIONAL
    URLs — keep the Vercel/Supabase ones until cutover Monday-after.
    Concretely, both apps need both:
    - `https://app.juandiazllc.com/philly/api/calendar/oauth/callback`
      (production target — the one we cut TO)
    - `https://app.lucen.ai/philly/api/calendar/oauth/callback`
      (whatever's currently live — the one we cut FROM)
    Removing the old URL pre-cutover would 4xx every in-flight OAuth
    callback for active customers.

## Calendar push-sync (Bundle D, 2026-05-07)

Adds `CalendarChannel` table + provider webhooks for real-time event
notifications. Builds on Bundle A's OAuth integration.

- [ ] Run `npx prisma migrate dev --name calendar_push_sync` (creates
      the `CalendarChannel` table). Idempotent — safe to re-run.
- [ ] Run `npx prisma migrate dev --name synced_calendar_events`
      (creates `SyncedCalendarEvent` table + `Organization.redactSyncedTitles`
      column). Bundle D4 — actual event persistence. Without this
      migration, push-sync runs but events never appear on contact
      pages.
- [ ] Schedule TWO calendar crons. Both use the `X-Cron-Secret: $CRON_SECRET`
      header (same env var as `/api/audit/prune`). Vercel Cron entry:
      ```json
      {
        "crons": [
          { "path": "/philly/api/calendar/cron/renew-channels", "schedule": "0 * * * *" },
          { "path": "/philly/api/calendar/cron/prune-channels", "schedule": "30 3 * * *" }
        ]
      }
      ```
      - **renew-channels** (hourly): refreshes Google watch channels +
        MS subscriptions before they expire (Google 7d / MS ~70h TTL).
      - **prune-channels** (daily, 03:30 UTC): hard-deletes `expired`/
        `error` `CalendarChannel` rows older than 90 days. Closes the
        Art. 5(1)(e) storage-limitation gap on residual push-sync
        metadata. Override the retention with env
        `CALENDAR_CHANNEL_PRUNE_DAYS=N` (floor 30 days).

      External schedulers (Hetzner systemd timer, GitHub Action) work
      identically — just send the header.
- [ ] Verify `NEXT_PUBLIC_APP_URL` is set in Vercel — this is the base
      URL we hand to providers as the webhook target. Without it,
      push-sync subscribe is a no-op (the OAuth callback logs a warning
      but doesn't fail).
- [ ] Microsoft only: register `notificationUrl` and (optionally)
      `lifecycleNotificationUrl` in your Entra app's Authentication
      panel if your tenant policy requires explicit URL allowlisting.
      Most tenants don't.
- [ ] Smoke test: connect a calendar via the wizard, verify a
      `CalendarChannel` row appears with `status='active'`. Add an event
      in your provider's UI and watch logs for
      `[calendar webhook google] notification accepted` or
      `[calendar webhook ms] batch processed`.



## Stripe billing — Checkout + Customer Portal + webhooks (Bundle B, 2026-05-06)

The billing routes + settings UI are wired but no charge can be
created until Stripe products + webhook are configured. The checkout
route returns 503 with a clear message until env vars land.

### Stripe dashboard setup

- [ ] Create / open a Stripe account (use Test mode while staging).
- [ ] Products → New product. Recommended catalogue:
  - **Starter** — €49/seat/month recurring (EUR). Note the Price ID
    (`price_…`).
  - **Professional** — €79/seat/month recurring (EUR). Note the Price ID.
  - Quantity-based — leave price as "per unit" and let Checkout
    multiply by `quantity` from the API call.
- [ ] Customer Portal → enable: Subscriptions cancellation, Subscription
      update (allow plan switching + quantity), Invoice history,
      Payment method.

### Webhook setup

- [ ] Webhooks → Add endpoint:
      `https://app.lucen.ai/philly/api/billing/webhook` (replace with
      production domain).
- [ ] Subscribe to events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.paid`
- [ ] Copy the signing secret (`whsec_…`).

### Vercel env vars

- [ ] `STRIPE_SECRET_KEY` — Live or Test secret key (sk_live_… / sk_test_…)
- [ ] `STRIPE_WEBHOOK_SECRET` — `whsec_…` from the endpoint above
- [ ] `STRIPE_PRICE_STARTER` — Price ID for Starter
- [ ] `STRIPE_PRICE_PROFESSIONAL` — Price ID for Professional
- [ ] `NEXT_PUBLIC_APP_URL` — needed for Stripe success/cancel URLs

### Local dev

- [ ] Install Stripe CLI: <https://docs.stripe.com/stripe-cli>
- [ ] `stripe login` (one-time)
- [ ] `stripe listen --forward-to http://localhost:3000/philly/api/billing/webhook`
      — outputs a temporary webhook secret. Use it in `.env.local` as
      `STRIPE_WEBHOOK_SECRET` while developing.

### Smoke test

1. Visit `/philly/settings/billing` while signed in as admin.
2. Click "Start free trial" on Professional → land on Stripe Checkout.
3. Use card `4242 4242 4242 4242` (test mode) → submit.
4. Land back on `/settings/billing?session_id=…` with success banner.
5. Verify webhook fired by checking the `Subscription` row appeared in
   the DB with `status='trialing'`.
6. Click "Manage subscription" → land on Stripe Customer Portal.

## Calendar OAuth — Google + Microsoft (Bundle A, 2026-05-06)

The wizard Step 5 + connection routes are wired but no provider can
actually authorise until you register the OAuth app and set credentials.
The start route returns 503 with a clear message until the env vars
land.

### Google Calendar

- [ ] Create / open a project at <https://console.cloud.google.com>.
- [ ] APIs & Services → Library → enable **Google Calendar API**.
- [ ] Credentials → Create credentials → **OAuth client ID** → Web
      application. Add authorised redirect URI:
      `https://app.lucen.ai/philly/api/calendar/oauth/callback`
      (replace with your production domain; add `http://localhost:3000/...`
      for local dev).
- [ ] OAuth consent screen → set User Type to External (or Internal
      if Workspace). Scopes:
      `openid email profile https://www.googleapis.com/auth/calendar.readonly`.
      Add test users until verification is complete.
- [ ] Set Vercel env vars:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`

### Microsoft / Outlook

- [ ] Register an app at <https://entra.microsoft.com> → Identity →
      Applications → App registrations → New registration.
- [ ] Supported account types: choose "Accounts in any organizational
      directory and personal Microsoft accounts" for the broadest
      audience (matches `MS_OAUTH_TENANT=common` default), or pin to
      a single tenant for SSO-only flows.
- [ ] Redirect URI: Web →
      `https://app.lucen.ai/philly/api/calendar/oauth/callback`
- [ ] API permissions → Microsoft Graph → Delegated:
      `User.Read`, `Calendars.Read`, `offline_access`, `openid`,
      `profile`, `email`. Grant admin consent.
- [ ] Certificates & secrets → New client secret. Copy the value
      (only shown once).
- [ ] Set Vercel env vars:
  - `MS_OAUTH_CLIENT_ID`
  - `MS_OAUTH_CLIENT_SECRET`
  - `MS_OAUTH_TENANT` (optional — defaults to `common`)

### Database

- [ ] Run `npx prisma migrate deploy` after pulling — adds the
      `CalendarConnection` table. Or for first-time on a live DB:
      `npx prisma migrate dev --name calendar_connections` to create
      the migration folder, then commit it.

### Smoke test

1. Visit `/philly/onboarding/calendar` while signed in.
2. Click "Connect Google Calendar" → consent at Google → land back on
   the wizard with a green "Google Calendar connected." badge.
3. Click "Disconnect" → confirm → row flips to status='revoked'.
4. Reconnect — should re-bind cleanly (upsert by `(userId, provider)`).

## Newsletter double opt-in (PR 715d102)

- [ ] Run the updated migration in Supabase SQL editor (brand project):
      `supabase/brand/newsletter_subs.sql`. Safe to re-run —
      alter-if-not-exists handles the existing table.
- [ ] Add Vercel env vars (production + preview):
  - `RESEND_API_KEY` — from resend.com dashboard
  - `NEWSLETTER_FROM` — e.g. `noreply@juandiazllc.com`
  - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings
    (the service role, NOT the anon key — keep it out of the browser)
- [ ] Verify the `noreply@juandiazllc.com` sender domain in Resend
      (SPF + DKIM records on the DNS zone).
- [ ] Smoke test: subscribe with a real address, click the link,
      verify `confirmed_at` is stamped and `confirm_token` is null in
      the `newsletter_subs` row.

## Cookie consent + analytics (PR f1b4a4a / earlier)

- [ ] Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to `juandiazllc.com` in Vercel.
      Optional: `NEXT_PUBLIC_PLAUSIBLE_HOST` if self-hosting.
- [ ] Create the Plausible site (plausible.io or self-host) so the
      domain matches the env var.

## Impressum content (PR f1b4a4a)

- [ ] Confirm the Impressum copy is legally sufficient for your DE
      audience. Current content uses "address on written request" —
      some lawyers prefer a concrete registered agent street address.
      If needed, add to `lib/i18n/dict.ts` under `impressum.p.company`
      in all 4 locales.

## Brand assets (from earlier sessions)

- [ ] Drop real portrait at `/public/me/portrait.jpg`. Used in `Person`
      and `Organization` JSON-LD on every page, plus the OG card on
      `/about`. The path is centralised in `lib/seo/branding.ts`
      (`AUTHOR_IMAGE_URL` / `AUTHOR_IMAGE_PATH`). Until the file lands,
      the URL 404s — Google Search will skip the image but won't error;
      OG cards on socials will render without a preview image. To
      activate the SVG fallback (`/icon-512.svg`) in the meantime, swap
      `AUTHOR_IMAGE_URL` to `AUTHOR_IMAGE_FALLBACK_URL` in
      `lib/seo/branding.ts`.
- [ ] Drop real hero image at `/public/hero.jpg` (used on home hero
      fallback layer).

## Translation retry (rate-limited)

- [ ] After 10pm UTC reset, re-run the chrome-translation agent for
      `/login`, `/work` (index + slug), `/insights` (index + slug +
      tag), `/sectors` (index + slug), `/signals` (index + slug).

## Lighthouse CI

- [ ] Confirm `.github/workflows/lighthouse.yml` runs on production
      pushes to main (Vercel Preview Protection auth-walls previews,
      so PR runs were moved to main-only).

## DEUS / LucenAI — multi-tenant readiness (May 2026 sprint)

Pre-deploy actions for the seats / invites / GDPR / CSV-import bundles.

- [ ] Run Prisma migrations against the production DB:
  ```
  npx prisma migrate dev --name seats_and_invites
  npx prisma migrate dev --name user_soft_delete
  ```
  Or in production, `npx prisma migrate deploy` after the schema is on the production branch.
- [ ] Add Vercel env vars (production + preview) for the philly project:
  - `RESEND_API_KEY` — invite emails. Without this, invites are created
    but no email is sent (UI flash banner explains the fallback).
  - `INVITE_FROM_EMAIL` — defaults to `noreply@lucen.ai`. Verify the
    sender domain in Resend (SPF + DKIM on the lucen.ai DNS zone).
  - `NEXT_PUBLIC_APP_URL` — defaults to `https://app.lucen.ai`.
    Set to whatever the live customer URL is so accept-invite links
    resolve correctly.
  - `STRIPE_SECRET_KEY` — health-endpoint check + future billing webhook.
    Optional; absence is reported as "not configured", not "down".
- [ ] Confirm legal entity for the DPA / ToS / Privacy Policy. Drafts
      live in `_drafts/legal/*.md` with `[KvK TBD]` and `[address TBD]`
      placeholders. "Juan Diaz LLC" reads as US-style; if it's actually
      an NL BV / eenmanszaak, fill in the correct entity + KvK number.
- [ ] Smoke test on staging: invite teammate → accept → seat counter
      ticks → DSAR export downloads → soft-delete → 410 on next login.

## DEUS-SHARED mirror setup

`bongartzdiaz/DEUS-SHARED` is the mirror target for downstream
distribution. Source of truth stays in `bongartzdiaz/juandiazllc.com`.
Sync workflow lives at `.github/workflows/sync-deus-shared.yml`.

- [ ] Create the target repo `bongartzdiaz/DEUS-SHARED` (private,
      empty — no README/license/.gitignore so the first push isn't
      a non-fast-forward conflict).
- [ ] Generate a fine-grained PAT at
      [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):
  - Resource owner: `bongartzdiaz`
  - Repository access: only select `bongartzdiaz/DEUS-SHARED`
  - Permissions → Repository: `Contents: Read and write`
  - Expiration: 90 days (set a calendar reminder to rotate)
- [ ] Add the PAT as a repo secret named `DEUS_SHARED_PAT` at
      `Settings → Secrets and variables → Actions → New repository secret`
      in `bongartzdiaz/juandiazllc.com`.
- [ ] Trigger the workflow manually the first time:
      `Actions → Sync to DEUS-SHARED → Run workflow → main`.
      Confirm `bongartzdiaz/DEUS-SHARED` now mirrors this repo.
- [ ] Future syncs run automatically on every push to `main`.

**Rotation note:** when the PAT expires, the workflow fails with
"DEUS_SHARED_PAT secret is not set" (or a 401 from GitHub). Generate
a new fine-grained PAT and update the secret — same scope as above.

## Testing gaps (CLAUDE.md priority)

- [ ] Zod validation schemas under `lib/philly/validation/` —
      highest ROI, no mocks needed.
- [ ] Dict key parity test — catches locales that silently fall
      back to English.
- [ ] `proxy.ts` CSRF tests — security-critical, untested.
- [ ] `lib/i18n/metadata.ts` tests — `buildAlternates`, `ogLocale`,
      `alternateOgLocales`.
