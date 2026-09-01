# Project memory — juandiazllc.com

Next.js 16 + Supabase. **Marketingsite, meer niet.** Negen dependencies,
elf dev. Tests via Vitest: `npm test`. Typecheck: `npm run typecheck`.
Build: `npm run build`.

> ⚠️ **Alles onder "Session log" hieronder is gedateerd en beschrijft voor
> een groot deel het CRM dat op 2026-08-11 uit deze repo is verwijderd.
> Lees het als geschiedenis, niet als beschrijving van de huidige code.**
> Wat er nu staat, staat in de twee secties direct hieronder.

## Wat hier NIET meer woont (2026-08-11)

Vijf PR's hebben het CRM en alles eromheen uit deze repo gehaald. Dit
staat hier zodat een volgende sessie niet opnieuw gaat "bouwen" wat al
verhuisd is.

| weg | waarheen / waarom | PR |
|---|---|---|
| `app/philly/*`, `lib/philly/*`, `components/philly/*`, `hooks/philly/*`, `prisma/` | het CRM leeft in `bongartzdiaz/DEUS-SHARED`, daar op **postgresql** met 95 models | #134 |
| `app/[locale]/{app,dashboard,status}` | ingelogde surface + statuspagina die alleen `/philly/api/health` peilde | #134 |
| 26 npm-pakketten, `scripts/migrate-to-hetzner/`, Tailwind | Tailwind had hier nooit gedraaid — 2483 regels handgeschreven CSS, nul directives | #137 |
| `app/[locale]/login`, `app/auth/`, `app/actions/auth.ts`, `lib/observability.ts` | elke inlogbestemming wees naar iets dat weg was | #138 |
| `lib/supabase/{middleware,client,li-client}.ts` | geen afnemers meer | #138, #140 |

**De SLO-sectie die hier stond is vervallen.** Die beschreef
`SLO.LOGIN`, `SLO.CREATE_DEAL` en `SLO.AI_ACTION` in
`lib/philly/observability.ts`, met `withSpan`-wrappers op `auth.login`,
`POST /api/deals` en `POST /api/ai/score`. Alle vier zijn verwijderd.
Wil je latency-budgetten op de marketingkant, dan is dat nieuw werk, geen
herstel. Sentry draait nog wel (`lib/sentry.ts`, alleen serverfouten;
`sendDefaultPii` staat uit), **maar hij rapporteert niets**: de
`SENTRY_DSN` op productie wordt geweigerd door `dsnLooksUsable()`,
gemeten op 2026-08-26 om 15:33 UTC. Zie de Vercel-sectie op de
operator-lijst.

**DEUS-SHARED is de bron voor alles wat CRM is.** De `sync-deus-shared.yml`
die van die repo ooit een spiegel maakte, heeft nooit op main gestaan; de
twee zijn sindsdien uit elkaar gegroeid en DEUS-SHARED loopt voor.

## Het `li.*`-schema — beslissing bewaard, code weg (2026-08-11)

`lib/supabase/li-client.ts` is verwijderd in #140. Het bestand had geen
afnemers meer nadat `/philly/outreach` en `/api/outreach/*` met #134
verdwenen, maar het droeg een beslissing die het bewaren waard is.

**De beslissing (2026-05-06).** Het `li.*`-schema was bewust
**single-tenant**: het droeg Juans eigen LinkedIn-outreachpijplijn,
binnen DEUS getoond als operator-only dashboardfunctie. Klantorganisaties
lazen of schreven er niet in. De afscherming zat in drie lagen:
`requireRole(['admin','manager'])` op de muterende routes, een sidebar-ingang
die alleen voor bepaalde industrieën verscheen, en een service-role-sleutel
die alleen server-side bestond.

**Alle drie die lagen zijn met #134 verdwenen**, samen met de routes die ze
beschermden. Er is hier niets meer dat `li.*` benadert.

**Het migratieplan, als de surface ooit opengaat voor klantorganisaties:**
1. `organization_id`-kolom op elke `li.*`-tabel
2. bestaande rijen backfillen naar Juans org-id
3. elke query hard filteren op `.eq('organization_id', scope.organizationId)`
4. Postgres-RLS als tweede slot — en let daarbij op
   `feedback_postgrest_rpc_execute_default`: RLS alleen is niet genoeg,
   want PostgreSQL geeft EXECUTE standaard aan PUBLIC.

**Openstaande vraag.** Het `li`-schema bestaat **niet** in Supabase-project
`wbgiouuifqhasedncysw`, terwijl `liClient()` daar wel naartoe wees
(`getSupabaseUrl()` + `{ db: { schema: "li" } }`). Gemeten op 2026-08-11:
alleen `public`, 120 tabellen. Waar de outreachdata werkelijk staat is
**niet vastgesteld** — zie de memory `project_linkedin_outreach`.

## Locales
Four supported: `en`, `nl`, `de`, `es` (see `lib/i18n/dict.ts`).
`translate()` falls back to `en` when a key is missing, so missing keys show
as English — treat that as a translation bug, not a feature. Keep the key
sets identical across all four dictionaries.

When adding public-facing marketing copy, route it through `useT()` from
`@/lib/i18n/useT`. Do NOT hardcode English in `components/sections/*`. If the
string contains `<b>` / `<em>` tags, read it via `t(key)` and render with
`dangerouslySetInnerHTML` (content is author-controlled in `dict.ts`, so this
is safe).

## Test coverage (as of 2026-04-19)
~1% file coverage — only `lib/philly/crypto|two-factor|rate-limit|logger.test.ts`.
Priority gaps: auth-helpers (`requireScope`/`requireRole`), Zod validation
schemas under `lib/philly/validation/`, server actions in `app/actions/*`,
the 120 API routes under `app/philly/api/`, `proxy.ts` middleware (CSRF),
2FA recovery-code flow. Start new tests with validation schemas — highest
ROI, no mocks needed. See commit history on
`claude/analyze-test-coverage-WBVSQ` for the full analysis.
## Wacht op de operator — samengevoegd 2026-08-24

Dit is de enige lijst. Tot vandaag stond hij op vijf plekken in het logboek: een
blok van 20 augustus plus vier appendices "Erbij op de operator-lijst". Alle vijf
verwijzen nu hierheen. **Schrijf aanvullingen in dit blok, niet erachter.**
Aanvullen is goedkoper dan herzien, en zo zijn die vijf ontstaan — waarna de
operator de bovenste las, en dat was de oudste.

Niets hiervan is uit de repo af te leiden, en niets hiervan mag verzonnen worden.

### 2026-08-27 — Supabase weigert het hele datavlak. De leadopvang ligt eruit.

**Dit staat bovenaan omdat het als enige punt op deze lijst nu kapot is in
plaats van open.** Elk verzoek aan REST en aan de edge functions, op **beide**
projecten, antwoordt met 402:

```
Service for this project is restricted due to the following violations:
exceed_storage_size_quota. The project owner must upgrade their plan or
remove spend caps to restore service.
```

Het contactformulier op juandiazllc.com schrijft via precies dat REST-pad. Een
bezoeker die nu het formulier invult krijgt `form.err.generic` terug. De hele
keten erachter — rij in `marketing.leads` → `leads_notify_new` → Telegram —
komt niet op gang, want de rij ontstaat niet.

| gemeten, 2026-08-27 | uitkomst |
|---|---|
| edge functions op **wbgio** (alle 14) | 402 `exceed_storage_size_quota` |
| edge functions op **vbozel** | 402, idem |
| REST met de publishable key, op een echte tabel | **402** |
| `/rest/v1/` zónder sleutel | 401 — de sleutelcontrole vuurt vóór de quotacontrole |
| negatieve controle, slug die niet bestaat | 402 — dus de gateway, niet een functie |
| projectstatus, beide | `ACTIVE_HEALTHY` — de database zelf leeft |
| organisatie | `swlekxkypqmqbmtrfvld` "Juan Diaz", plan **free**, 2 projecten |
| wbgio | 20 MB database · 1 storage-object · 13 kB · grootste tabel 296 kB |
| vbozel | 29 MB database · **0** storage-objecten |
| `pg_replication_slots`, beide | leeg |

**Het gaat niet over datavolume.** Samen 49 MB over de hele organisatie. Geen
replicatieslot dat WAL vasthoudt — dat was de eerste hypothese en hij is
gemeten weerlegd. De boodschap noemt zelf wat het wél is: een plan of een spend
cap. Dat staat op **Billing/Usage van de organisatie**, is een dashboard-pagina
en een betaalhandeling, en is daarmee van jou. Ik heb er niets aan aangeraakt.

Twee dingen om te weten bij het nameten. Die **401 op `/rest/v1/`** leest als
"REST is gezond" en is het niet — hij komt uit de sleutelcontrole, die vóór de
quotacontrole zit; peil een echte tabel mét de publishable key. En het
**managementvlak werkt gewoon door**: `execute_sql`, `list_edge_functions` en
`deploy_edge_function` antwoorden normaal terwijl het datavlak 402 geeft. Wat er
live staat is dus wél te verifiëren, hoe het antwoordt niet.

Dit is dezelfde storing als in de memory `project_supabase_402_blokkade.md`,
inclusief de aanwijzing die daar al stond: kijk op Billing/Usage van de
organisatie, niet in de database.

**Wanneer het begon: binnen een etmaal.** Op 2026-08-26 om 18:15 UTC gaven
dezelfde probes nog 400 en 503 — zie de hermeting hieronder.

### 2026-08-27 — de tien dode `diaz-*` functies zijn onschadelijk, niet weg

Verwijderen kan van deze machine niet. De Supabase-MCP heeft `list`, `get` en
`deploy` voor edge functions en **geen delete**, en de `supabase`-CLI hier is
ingelogd als Roy — die krijgt 403 op wbgio. Op jouw go is er daarom een 410-stub
overheen gezet: geen database, geen netwerk, geen gebruik van de
`SUPABASE_SERVICE_ROLE_KEY` die Supabase in élke functie injecteert.

Alle tien sprongen een versie omhoog met een nieuwe sha256, binnen dezelfde
minuut, met `verify_jwt: false` behouden zodat het antwoord van buitenaf
meetbaar blijft. Elke stub draagt **zijn eigen slug** in het antwoord, zodat een
probe bewijst dát díé slug de stub kreeg. De vier die moesten blijven staan —
`lead-notify`, `lead-acknowledge`, `pai-vapi-webhook`, `pai-weekly-digest` —
dragen nog hun oude `updated_at`. Nog steeds veertien functies.

**De 410 zelf is niet waargenomen**, want het datavlak geeft 402 (zie hierboven).
Wat er live staat is teruggelezen uit de bron via het managementvlak; hoe het
antwoordt niet. Zodra de restrictie eraf is: `scripts/probe-supabase-402.sh` draait de
tien plus een negatieve controle plus de vier die moesten blijven.

**Wat er open blijft, en waarom het op deze lijst hoort.** De tien functies staan
er nog, elk met een service-role-sleutel erin. Weghalen gaat via het dashboard,
of via een PAT als `SUPABASE_ACCESS_TOKEN=` bij een CLI-aanroep — dat laatste
vervangt Roy's opgeslagen login niet.

**Eén vondst die niet op de lijst stond.** `diaz-affiliate-activate` had
**geen enkele authenticatie**: geen sleutel, geen handtekening. Een POST met een
leeg object leegde de activatiewachtrij, gaf gratis Pro-licenties uit en
verstuurde mail. Op wbgio was dat onschadelijk omdat `diaz_editor` daar gedropt
is. **Op vbozel staat diezelfde functie nog, en daar bestaat het schema wel.**

### Hermeten op 2026-08-26 om 18:15 UTC — niets is afgevallen, één meting is scherper

Alles wat van buitenaf meetbaar is, is opnieuw gemeten in plaats van uit dit
logboek overgeschreven. **Geen enkel item is afgevallen.** Wat er wél bij komt:
van de twee Stripe-accounts is nu bekend **welk** het lege is, en de
`SENTRY_DSN` is opnieuw geweigerd — nu op een deployment die nóg nieuwer is dan
die in de Vercel-sectie hieronder staat.

| gemeten | uitkomst |
|---|---|
| `lead-notify`, ongeldige JSON zonder auth | **400 `invalid-json`** — nog steeds fail-open, `LEAD_NOTIFY_SECRET` staat niet |
| `lead-acknowledge`, idem | **503 `not-configured`** — fail-closed, v3 uitgerold 2026-08-26 16:08:20 UTC |
| negatieve controle, functie die niet bestaat | 404 `NOT_FOUND` — die twee antwoorden zijn dus echt |
| `POST /api/cal` op productie | 503 `not-configured`; het runtime-log zegt woordelijk `[cal] CAL_WEBHOOK_SECRET niet gezet` |
| `SENTRY_DSN` op productie | **nog steeds geweigerd**. `[sentry] SENTRY_DSN is set but is not a usable DSN` op deployment `dpl_4ipHxtnbVQ7iXZRa7TnxCELBFSbE`, om 18:05:38, 18:05:39 en 18:12:39 |
| `marketing.leads` · `marketing.subscribers` | 0 rijen, ooit — allebei |
| advisors op wbgio | 116: 0 ERROR, **9 WARN**, 107 INFO. `auth_leaked_password_protection` staat er nog |
| PUBLIC-grant op `handle_new_user`, `notify_new_lead`, `rls_auto_enable` | alle drie **ja**; `current_org_id` correct **nee** |
| `pgrst.db_schemas` van `authenticator` | `public, graphql_public, marketing` — ongewijzigd |
| edge functions op wbgio | 14 stuks: de **tien dode `diaz-*`** staan er nog ACTIVE, plus 2× `pai-*` en de twee `lead-*` |
| Ahrefs `subscription-info-limits-and-usage` (gratis endpoint) | `{"error":"Insufficient plan"}` — onveranderd |
| DNS TXT `juandiazllc.com` | `google-site-verification=ABrD7ZNd…` staat er, naast SPF |
| `/_vercel/insights/script.js` | 200, wordt door het platform geserveerd |
| Stripe, twee accounts | **`acct_1T294dIhZuGx1GTG` is de levende** (laatste sessie 22 augustus, `unpaid`/`expired`); **`acct_1TPPJzS0eZH82rBo` is de lege** — nul checkout-sessies, ooit. Dat tweede is het account dat dicht of gelabeld moet |
| `supabase projects list` | nog steeds Roy's account: 16 projecten, **noch wbgio noch vbozel** ertussen |
| `lucenai.eu/about` | 200, **0 verwijzingen** naar `juandiazllc.com` (positieve controle: het woord "Juan" staat er 5×) |
| `DATAFORSEO_LOGIN` / `_PASSWORD` | staan in `.env.example`, **0 regels** in de lokale `.env.local` |
| `lib/plausible-doelen.test.ts` | groen — code, `MANUAL_TASKS.md` en dit bestand noemen dezelfde vijf doelen. De taggingkant is dus af; het dashboard blijft de open stap |

De probe op de twee meldingsfuncties raakt niets: de auth-controle staat vóór de
JSON-parse en het versturen erna, dus `400`/`503` scheidt open van dicht zonder
één bericht te versturen. Zie [[feedback_poort_testen_zonder_bijwerking]].

**Wat er niet gemeten is, en waarom.** Het Plausible-bezoekcijfer (geen sleutel),
of de Search-Console-property werkelijk geverifieerd is (alleen ingelogd te
zien), en of Web Analytics in het dashboard data ontvangt — de Web-Analytics-API
geeft op het Hobby-plan 404 op élk project, ook op één met aantoonbare bezoekers,
dus die 404 is het plan en geen meting.

**Twee waarnemingen die niet op de lijst staan.** De verzoeken naar
`/en/__sentry-probe` in het log van 18:05 en 18:12 komen **niet van mij**; ik heb
alleen één synthetisch CSP-rapport, één `POST /api/cal`, één `HEAD /en` en het
insights-script aangeraakt. En `origin` draagt **57 takken** — geen verweesde tak
maar een bosje; opruimen is eigen werk en staat hier alleen genoteerd.

### Hermeten op 2026-08-25 — niets is afgevallen, twee dingen zijn scherper

Elk punt hieronder dat van buitenaf meetbaar is, is op 25 augustus opnieuw
gemeten. **Geen enkel item is afgevallen.** Deze tabel staat bovenaan omdat de
operator de bovenste leest; de lijst zelf begint eronder.

| gemeten | uitkomst |
|---|---|
| `POST /api/cal` op productie | 503 `{"ok":false,"error":"not-configured"}` — `CAL_WEBHOOK_SECRET` staat nog niet |
| `lead-notify`, ongeldige JSON zonder auth | **400 `invalid-json`** — nog steeds fail-open |
| `lead-acknowledge`, idem | 400 `invalid-json` — idem, dus `LEAD_NOTIFY_SECRET` staat niet. **Achterhaald op 2026-08-26: de fail-closed code is uitgerold en hij geeft nu 503 `not-configured` — zie stap 3 van de meetketen** |
| `marketing.leads` en `marketing.subscribers` | 0 rijen, ooit |
| DNS TXT `juandiazllc.com` | `google-site-verification=ABrD7ZNd…` staat er, naast SPF |
| Ahrefs `subscription-info-limits-and-usage` (gratis endpoint) | `{"error":"Insufficient plan"}` |
| `diaz-appsumo-redeem`, code zonder dev-formaat, beide projecten | `invalid-code-format`, waaruit ik las dat dev-mode aanstond. **Dat klopte niet** — zie de correctie hieronder. Na de uitrol van 2026-08-26: 503 `service-unavailable` |
| Vercel Web-Analytics-API, beide projecten | 404 `Web Analytics not found` — ook op `diaz-atlas-editor`, dat aantoonbaar 137 bezoekers over 30 dagen heeft. De 404 is het Hobby-plan, geen meting |
| Vercel runtime-log `juandiazllc-com` | `Invalid Sentry Dsn: optional` — `SENTRY_DSN` staat op productie op de letterlijke tekst `optional`. **Bijgesteld op 2026-08-26: er staat sindsdien een andere waarde, en die wordt nog steeds geweigerd — zie de Vercel-sectie hieronder** |

De probe op de twee meldingsfuncties raakt niets: de auth-controle staat vóór de
JSON-parse en het versturen staat erna, dus `400 invalid-json` scheidt "open" van
"dicht" zonder één bericht te versturen. Zie [[feedback_poort_testen_zonder_bijwerking]].

**De advisors tellen nu negen WARN's, niet één — en dat is geen regressie.**
De lijst hieronder zegt dat leaked-password de enige WARN is die actie vergt.
Dat klopt nog steeds, maar wie de advisors opnieuw draait ziet er negen en moet
weten waarom de andere acht kunnen wachten:

| WARN | n | stand |
|---|---|---|
| `auth_leaked_password_protection` | 1 | **de enige die actie vergt** — staat hieronder op de lijst |
| `*_security_definer_function_executable` | 7 | `handle_new_user`, `notify_new_lead` en `rls_auto_enable` geven `trigger` of `event_trigger` terug en zijn daarmee niet via RPC aanroepbaar; ze dragen wél de PUBLIC-grant, dus het `revoke` hieronder is opruimen. De vierde, `current_org_id()`, is echt aanroepbaar maar heeft **geen** PUBLIC-grant en geeft een ingelogde gebruiker uitsluitend zijn eigen org-id terug |
| `extension_in_public` (`pg_net`) | 1 | de functies staan in schema `net`, en `net` staat **niet** in `pgrst.db_schemas` van de rol `authenticator` (`public, graphql_public, marketing`). `net.http_post` is dus niet via PostgREST bereikbaar en dit is geen SSRF-gat |

Let op bij het zelf nameten: `current_setting('pgrst.db_schemas')` geeft de
instelling van de rol waarmee je verbinding maakt. Via de MCP is dat `postgres`,
en die zegt hier nog `diaz_editor` — een schema dat op 11 augustus is gedropt.
Lees `rolconfig` van `authenticator`, niet `current_setting`. Zie
[[feedback_drop_schema_breekt_postgrest]].

**De tien dode `diaz-*` functies op wbgio: de schrijver is gevonden, en er
schrijft niets meer.** Dit vervangt de regel die hier stond — *eerst uitzoeken
wát er nog naartoe schrijft* — want dat is uitgezocht.

De twee `updated_at`-stempels van 2026-08-11 komen niet van buiten. Ze komen uit
een Claude-sessie in deze repo, die via de Supabase-MCP `diaz-trial-init`
(17:43:08 UTC) en `diaz-affiliate-activate` (17:48:00 en 17:57:57) naar wbgio
uitrolde, als uitvoering van de opdracht *diaz editor er nu op zetten* van
16:47. Om 18:11 bleek dat het verkeerde project: wbgio droeg een verlaten kopie
(10 tabellen, 2 licenties) tegen de levende database op vbozel (22 tabellen, 25
views, 6 licenties, 3 klanten). Het schema eronder is diezelfde avond gedropt;
de functies bleven staan omdat de MCP ze niet kan verwijderen. Ze wijzen
sindsdien naar een schema dat er niet meer is.

Gemeten over alle 2158 lokale sessies: **264 uitrollen, waarvan 6 naar wbgio**,
alle zes uit datzelfde transcript. Twee daarvan zijn positieve controles op
bekend eigen werk — `lead-notify` (21 juli 16:36) en `lead-acknowledge` (16
augustus 15:55 en 15:58) — en alle vier de stempels vallen op de seconde samen
met de `updated_at` op de functies zelf.

Drie andere kandidaten vielen af, elk op eigen bewijs. **CI:**
`deploy-edge-functions.yml` deployt naar `SUPABASE_PROJECT_REF`, in zijn eigen
kop gedocumenteerd als vbozel, en de vier runs van 11 augustus draaiden twee
seconden met **nul stappen** en zonder log, tegen acht stappen bij een geslaagde
run. **Een script over beide projecten:** vbozel kreeg op 11 augustus niets — de
buren daar zijn 4, 12, 15 en 17 augustus. **De dashboard-editor:** de
transcript-stempels op de seconde maken die lezing overbodig.

**Wat vóór verwijderen nog moet, is kleiner geworden.** Gemeten op 2026-08-25:

| provider | wijst naar | bewijs |
|---|---|---|
| Stripe | **vbozel** | 19 rijen in `diaz_editor.processed_events`, de laatste van **23 augustus** — alle negentien `checkout.session.expired`, nul `completed` |
| Lemon | **vbozel** | `LEMON-SQUEEZY.md` op `origin/main` noemt het endpoint tweemaal, beide keren vbozel |
| AppSumo | **vbozel** — en de vraag was verkeerd gesteld | de koppeling is *pull*: onze functie belt AppSumo, AppSumo belt ons nooit. De twee bestanden die het endpoint wél dragen noemen allebei vbozel |

Alle zes licenties op vbozel zijn met de hand uitgegeven: nul `stacked_codes`,
nul die AppSumo of Lemon noemen, nul met een Stripe-payment-intent. Geen enkele
provider heeft dus ooit een licentie laten uitgeven.

**De AppSumo-vraag is op 2026-08-25 beantwoord, en hij was verkeerd gesteld.**
Er ís geen AppSumo-instelling die ergens naartoe wijst, want de koppeling loopt
de andere kant op: `diaz-appsumo-redeem/index.ts:73` belt `api.appsumo.com`, en
AppSumo belt ons nooit. Wat het endpoint wél draagt zijn twee bestanden, en die
noemen allebei vbozel — `landing/redeem.html:169` en `index.live-test.ts:25`,
met **nul** wbgio-verwijzingen. De pagina staat publiek: `diazatlas.com/redeem`
geeft 200. Ingewisseld is er nooit iets, en de deal is nooit ingediend —
`docs/APPSUMO-INDIENEN.md` is een leeg invulblad en de marktplaats-audit zet
AppSumo op *Draft compleet, wacht op screenshots*. **Daarmee houdt niets de tien
dode functies meer tegen.**

**Maar dezelfde meting legde iets anders bloot, en dat is dringender.** Het
endpoint antwoordde op beide projecten met `invalid-code-format`, en die reden
komt uit precies één tak (regel 100): de dev-mode. Dus `APPSUMO_API_KEY` en
`APPSUMO_API_SECRET` staan niet gezet en `APPSUMO_DEV_MODE=true` wél — op het
levende project. De toelichting drie regels erboven benoemt precies dit gevaar:
*nooit fail-open in productie — zonder deze vlag weigeren we (503), anders zou
iedereen een gratis (enterprise-)lifetime-key kunnen minten*. De vlag staat aan.
Een POST met een zelfverzonnen code in het dev-formaat, zonder enige
authenticatie, komt daarmee langs de codecontrole en loopt door naar de uitgifte.

**Dat is niet gedemonstreerd, en dat hoefde ook niet.** De drie takken geven drie
verschillende antwoorden — `invalid-code` bij gezette sleutels,
`invalid-code-format` in dev-mode, 503 `service-unavailable` als beide ontbreken
— dus de gemeten reden identificeert de tak zonder dat er ooit een geldige code
aan te pas komt. Zie [[feedback_poort_testen_zonder_bijwerking]]: kies een invoer
die ná de controle maar vóór de bijwerking faalt.

Op wbgio is het gat toevallig onschadelijk — daar is `diaz_editor` gedropt, dus
een geldige dev-code loopt stuk op de database. Op **vbozel** niet.

**De gevolgtrekking hierboven was fout, en is op 2026-08-26 gecorrigeerd.** De
meting klopte — het endpoint gaf `invalid-code-format` — maar wat ik eruit
las niet. Die drie-takken-redenering leest de bron in de repo, en op vbozel stond
die bron sinds **9 mei** niet meer uitgerold: versie 22, één bestand,
`updated_at` gelijk aan `created_at`. De gedeployde functie had **helemaal geen**
dev-mode-controle; haar `else` was onvoorwaardelijk. Daar kwam
`invalid-code-format` dus altijd uit, met de vlag aan of uit.

Wat de twee gevallen wél scheidde was een tweede slug op hetzelfde project.
`appsumo-redeem` — zonder voorvoegsel, v1, 4 augustus, geen map in de repo,
door niets aangeroepen — draagt de drie-takken-versie en gaf 503
`service-unavailable`. Daarmee stond de vlag aantoonbaar **uit**, terwijl het
endpoint dat `landing/redeem.html` werkelijk belt onvoorwaardelijk openstond.
Twee slugs, twee versies, één naam die op de ander lijkt.

**De les: bron in de repo bewijst niets over gedeployde code.**
`updated_at == created_at` op een edge function zegt dat hij nooit is
heruitgerold, en dat signaal stond er de hele tijd. Het staat ook al opgeschreven
— zie [[project_diaz_editor_repo_prod_drift]], dat precies dit voor deze repo
vastlegt — en ik ben er alsnog in getrapt door de bron te lezen in plaats van
het levende object.

**Eén val staat er nog wél, en die is scherper dan de tien dode functies.**
`supabase/README.md` in `bongartzdiaz/diaz-editor` instrueert nog steeds om de
Stripe-webhook te zetten op
`https://wbgiouuifqhasedncysw.supabase.co/functions/v1/diaz-stripe-webhook`
— het dode project. Twee bestanden verderop staat het goed
(`scripts/README-stripe-setup.md:105`: *already done — vbozelswveaxsyccvaac*).
Twee documenten die één feit dragen en uit elkaar zijn gelopen zonder dat iets
dat zag.

**Twee dingen die hierboven stonden, klopten niet.** Ze zijn op 2026-08-25
nagemeten in plaats van overgeschreven, en dit is de correctie erop.

*Het is geen één regel.* Gemeten op `origin/main` (`918c2268`) draagt die repo
elf wbgio-verwijzingen die het als het levende project presenteren: acht in
`supabase/README.md` — waaronder de kop, het projectref en de publishable key
— en drie in `supabase/ADMIN-QUERIES.md`, waarvan de SQL-editor-link. Wat er
óók staat en juist mag blijven: vijf in `scripts/MIGRATION-new-supabase.md`
(dat beschrijft wbgio als bron), één historische regel in een handoff, en drie
in scripts die wbgio juist als waarschuwing noemen.

*En “geeft 500 bij elke aanroep” is te grof.* De functies daar **draaien**; ze
weigeren netjes op hun eigen invoercontrole en lopen pas stuk zodra een
aanroep de databaselaag bereikt. Gemeten met dezelfde aanroep op beide
projecten, met een negatieve controle erbij zodat een lege uitkomst niet als
schone meting kan lezen:

```
wbgio    POST /diaz-license-validate   ->  500  server-error / Invalid schema: diaz_editor
vbozel   POST /diaz-license-validate   ->  200  unknown-key
wbgio    POST /diaz-stripe-webhook     ->  400  missing signature
wbgio    POST /diaz-bestaat-niet-xyz   ->  404  NOT_FOUND   (negatieve controle)
```

Dat maakt de val eerder erger dan milder: geen 404 die meteen opvalt, maar een
endpoint dat er wél is, netjes antwoordt op alles wat de database niet raakt,
en geen licentie uitgeeft.

**Gesloten op 2026-08-25 met `bongartzdiaz/diaz-editor#640`** (gemerged als
`208192b`). Die zet een waarschuwingskop op beide bestanden plus een inline
waarschuwing bij de webhook-stap — die tweede omdat een kop bovenaan wordt
overgeslagen door wie ctrl-F't naar “webhook”, en dat is de stap met de
duurste gevolgen.

**Er is bewust geen enkele waarde vervangen.** Elk projectref, elke URL en de
publishable key staan er nog zoals ze stonden. Of de overige stappen (secrets,
payment-links, metadata-keys) op vbozel nog kloppen is niet nagemeten, en een
ongemeten waarde invullen leest als een meting. De val is dus gemarkeerd, niet
gerepareerd — wie dat document ooit werkelijk wil bijwerken, moet die stappen
eerst tegen vbozel nameten.

De vijf dubbele slugs op vbozel staan er nog en zijn alle vijf op
**2026-08-04** aangemaakt vanaf een CI-runner
(`/home/runner/work/diaz-editor/…`).

**Eén datum hierboven is bijgewerkt, en het waren nooit twee gebeurtenissen.**
De WARN-tabel zei dat `diaz_editor` op 1 augustus was gedropt; op wbgio was dat
**11 augustus 18:19:56 UTC**. De migratiehistorie van dat project kent geen
enkele migratie op 1 augustus — de reeks springt van 29 juli naar
`20260811181956 verwijder_dode_diaz_editor_kopie`, dezelfde seconde als in het
transcript.

Het PGRST002-incident dat het logboek van 21 augustus op 1 augustus zet, is
**dezelfde drop**: zelfde project, zelfde schema, zelfde aanleiding (*de dode
kopie weghalen*). De hele REST-API gaf daarna 503 omdat `diaz_editor` in
`pgrst.db_schemas` bleef staan, en dat kwam de 12e boven — vandaar die datum in
[[feedback_drop_schema_breekt_postgrest]]. Er staat dus niets open; er stond
één gebeurtenis onder drie data. De 1-augustusvermelding in het logboek van 21
augustus blijft staan zoals hij is: logboekgeschiedenis wordt hier niet
herschreven, en deze notitie is de correctie erop.


### De meetketen — in blokkerende volgorde

1. **Zes Plausible-doelen aanmaken** in het dashboard: `Boeking 15min`,
   `Pricing CTA`, `Sector CTA`, `Tool CTA`, `Contact Submitted` en
   `Scan Voltooid`, plus de vier custom properties (`tier`, `sector`, `tool`,
   `lekken`). Taggen is af en op productie
   geverifieerd; zonder de doelen worden de kliks binnengehaald en weggegooid.
   **`Contact Submitted` stond tot 2026-08-24 op geen enkele lijst**, en het is
   het enige doel dat een conversie meet in plaats van een klik — precies het
   cijfer dat stap 2 hieronder moet beantwoorden. Exacte namen en de meting
   staan in `MANUAL_TASKS.md`; `lib/plausible-doelen.test.ts` houdt de lijst
   voortaan gelijk aan de code.
2. **Plausible-cijfer**: bezoekers over 30 dagen. Zonder dat blijft "0 rijen in
   `marketing.leads`" onbeslist tussen geen-verkeer en geen-conversie, en die
   vraag ligt onder alle andere.
3. **`LEAD_NOTIFY_SECRET`** in Supabase → Edge Functions → Secrets, met dezelfde
   waarde als `lead_notify_secret` in Database → Vault. Die vault-sleutel staat
   er sinds 2026-08-16 16:22:38 UTC (44 tekens, base64url), dus de triggerkant
   is klaar — wat ontbreekt is de functiekant. Dit sluit `lead-notify`, dat nog
   fail-open is. **Vóór stap 4.**

   Voor `lead-acknowledge` is die volgorde op 2026-08-26 bewust omgedraaid:
   de fail-closed code van 25 augustus is uitgerold (v3) terwijl de sleutel
   nog niet stond. **Die functie weigert nu alles**, de trigger inbegrepen.
   Gemeten direct na de uitrol sloeg een POST met ongeldige JSON en zonder
   auth-header om van `400 invalid-json` naar `503 not-configured`, met 404
   op een niet-bestaande slug als negatieve controle en `lead-notify`
   onveranderd op 400.
   Vandaag kost dat niets (nul leads ooit, geen Resend-sleutel). Wat het
   verandert: waar de functie eerst `ack_channel = 'skipped:no-api-key'`
   wegschreef, schrijft hij nu niets en houdt `net._http_response` een 503
   vast. Deze stap is daarmee geen opruimwerk meer maar de knop die de
   bevestigingsketen aanzet — en hij sluit `lead-notify` in
   dezelfde handeling, want beide lezen dezelfde sleutel.
4. **`RESEND_API_KEY` + `ACK_FROM`** op een geverifieerd domein. Zonder die twee
   gaat er bij een echte lead geen enkele mail de deur uit — gemeten, niet
   vermoed. Pas ná stap 3, anders geef je een publiek aanroepbaar endpoint een
   mailkanaal op je eigen domein.
5. **`CAL_WEBHOOK_SECRET` in Vercel-productie**, en daarna nakijken of cal.com de
   webhook werkelijk aanroept. Gemeten 2026-08-24: `POST /api/cal` antwoordt
   `{"ok":false,"error":"not-configured"}`. Zolang dat zo is levert een boeking
   geen rij op, dus geen Telegram en geen bevestiging — terwijl "Boeking 15min"
   de hoofd-CTA van de site is.

### SEO-instrumenten

- **DataForSEO-inloggegevens** (open sinds 2026-08-03). Zonder die twee waarden
  levert elke SEO-route niets. De plek staat klaar in `.env.example`.
- **Kiezen: gehost of self-host** voor OpenSEO. Aanbeveling en onderbouwing staan
  in `MANUAL_TASKS.md`; het kost geld, dus de keuze is aan jou.
- **Ahrefs-connector loskoppelen** via claude.ai, zodra OpenSEO antwoordt. Hij
  staat op `✓ Connected` en geeft op élke aanroep "Insufficient plan" — de
  gezondheidscontrole test de verbinding, niet de toegang.
- **Search Console**: alleen nog nakijken of de property daadwerkelijk
  geverifieerd is. Het DNS TXT-record staat er.

### Vercel

- **`SENTRY_DSN` in Vercel-productie wordt geweigerd. Serverfouten worden
  niet gerapporteerd.** Juan zette op 2026-08-26 een nieuwe waarde; die
  is de letterlijke tekst `optional` niet meer, maar hij komt nog steeds
  niet door `dsnLooksUsable()`.
  Gemeten op deployment `dpl_4RT1ddsgE6tKW45xH7A6TvGuafn9`, aangemaakt om
  **14:35:25 UTC** uit de merge van #279 — dus ruim ná het zetten.
  Zijn **eerste** verzoeken (14:36:51, 14:37:04, 14:37:29, 14:38:30)
  dragen alle vier de regel `[sentry] SENTRY_DSN is set but is not a
  usable DSN`, en om 15:33:29 deed hij het opnieuw. Een verse deployment
  is bij zijn eerste invocatie per definitie koud, dus hier is geen
  warme-lambda-uitleg meer voor.
  **De keten eromheen is in orde, en dat is met dezelfde probe gemeten.**
  Eén synthetisch CSP-rapport naar `/api/csp-report` gaf 204 en logde
  `[csp] script-src blocked https://probe.invalid/...` — de regel die
  vlak vóór `captureMessage()` staat. De code bereikt Sentry dus; alleen
  de waarde deugt niet.
  **Wat er moet staan:** `https://<publicKey>@<host>/<projectId>`, precies
  zoals Sentry hem toont onder Project Settings — Client Keys (DSN).
  Drie dingen laten `dsnLooksUsable()` afgaan: geen `https://` ervoor,
  geen `@` (dus geen publieke sleutel), of niets achter de laatste `/`
  (dus geen projectnummer). Een auth-token (`sntrys_...`) en een
  dashboard-URL zijn allebei geen DSN. Zet je hem bewust niet aan, maak
  de variabele dan **leeg** — dan is de no-op stil in plaats van luid.
  **Mijn verificatie van 14:20 was fout, en #279 (`0294b35`) heeft die
  onwaarheid gemergd.** Ik las de stilte van zes gelijktijdige verzoeken
  als bewijs dat de DSN was aangeslagen. Gelijktijdigheid dwingt
  **parallelle** instanties af, geen **koude**: de pool droeg al warme
  instanties uit de reeksen van 14:13:29 en 14:13:43, en `initSentry()`
  opent met `if (initialized) return`. Die zwegen hoe dan ook.
  **Een verse deployment is de enige betrouwbare koude probe**, want die
  draait `register()` gegarandeerd vanaf nul. Zie
  [[feedback_verify_the_measuring_stick]].
- **Nakijken of Web Analytics aan staat op `juandiazllc-com`** (Project
  Settings → Analytics). Het script staat er sinds #267 en wordt door het
  platform geserveerd (`/_vercel/insights/script.js` → 200 op productie), maar
  of de data in het dashboard landt is van buitenaf niet te zien. **Let op bij
  het nameten:** de Web-Analytics-API geeft op het Hobby-plan 404 op élk
  project, ook op één met aantoonbare bezoekers. Die 404 is het plan en geen
  meting — lees het dashboard, niet de API.
- ~~**`NEXT_PUBLIC_GA4_ID` zetten in Vercel-productie op `G-JL21TDX7QB`.**~~
  **Gesloten op 2026-09-01, en niet door de variabele te zetten.** Juan zette
  hem wel, maar de Redeploy-knop leverde geen deployment op — driemaal
  gemeten via de Vercel-API, met een controle op het filter zelf
  (`since = aangemaakt−1ms` gaf precies één rij, `+1ms` nul, dus het filter
  filterde werkelijk). Nul nieuwe deployments, 119 minuten na de laatste.
  Op zijn aanwijzing staat de tag nu in de code: `Toestemming.tsx` doet
  `process.env.NEXT_PUBLIC_GA4_ID || "G-JL21TDX7QB"`. De variabele wint nog
  steeds als hij ooit wél doorkomt, en de tag gaat mee met de eerstvolgende
  build vanaf `main`. **Wat openblijft is de knop, niet de tag** — dat een
  Redeploy geen deployment-object oplevert is niet verklaard. Zolang dat zo
  is, is een push naar `main` de enige deploy-route met bewijs dat hij werkt.
  **Twee dingen in de vorige versie van dit blok klopten niet.** Er stond dat
  `class="toestemming"` in de geserveerde HTML het faalsignaal is. Dat kán
  niet: de component start op `useState(undefined)` en rendert `null` zolang
  de keuze `undefined` is, en op de server draaien effects niet — de banner
  staat dus in **geen enkele** geserveerde HTML, ook niet als alles werkt.
  Wie daarop meet, leest een terechte nul als een mislukte deploy. Meet in de
  **DOM** na hydratie, of op buildniveau met een grep op het tag-id in
  `/_next/static/chunks/*.js`. En "van deze machine kan het niet, in twee
  onafhankelijke richtingen nagetrokken" was te smal: er waren meer paden dan
  die twee, en de Vercel-MCP stond er niet bij. Die heeft géén
  redeploy-gereedschap — `deploy_to_vercel` vraagt om een `files`-boom en is
  bedoeld voor wanneer er géén bruikbare git-remote is; hem gebruiken zou de
  wérkkopie uploaden als productie-deployment, los van de commit.

### Supabase en Stripe

- ~~**`APPSUMO_DEV_MODE` uitzetten op `vbozelswveaxsyccvaac`**~~ — **gesloten op
  2026-08-26, en de reparatie was een andere dan hier stond.** De vlag stond al
  uit; wat openstond was de gedeployde functie zelf, die sinds 9 mei op versie 22
  hing en geen dev-mode-controle kende. `bongartzdiaz/diaz-editor#645`
  (`22bf2b8f`) is uitgerold naar versie 23, en de probe sloeg om van 200
  `invalid-code-format` naar 503 `service-unavailable`, met 404 op een
  niet-bestaande slug als negatieve controle. Nul licenties uitgegeven: zes op
  vbozel, nul van appsumo, laatste uitgifte 22 mei. **De vlag hoeft nu nergens
  meer voor** — zet iemand hem terug aan zonder `APPSUMO_DEV_SECRET`, dan weigert
  die tak met 503 `auth-not-configured`.
- **Leaked-password protection** aanzetten op `wbgiouuifqhasedncysw` — de enige
  WARN uit de advisors die actie vergt.
- **Tien dode `diaz-*` edge functions** op wbgio — **onschadelijk sinds
  2026-08-27, maar nog niet verwijderd.** Er staat een 410-stub overheen zonder
  database, netwerk of service-role-gebruik; de tien functies zelf staan er nog,
  elk met die sleutel erin. Weghalen kan van deze machine niet: de MCP heeft geen
  delete en de CLI hier is Roy. Zie het blok bovenaan deze lijst. **En vijf
  dubbele slugs op vbozel**, waarvan er één is benoemd: `appsumo-redeem` — v1,
  4 augustus, geen map in de repo, door niets aangeroepen, draagt wél een
  service-role-sleutel. Die kan weg zodra jij dat zegt; verwijderen is
  onomkeerbaar en naar buiten gericht.
- **`diaz-affiliate-activate` op vbozel heeft geen authenticatie.** Geen sleutel,
  geen handtekening: een POST met een leeg object leegt de activatiewachtrij,
  geeft gratis Pro-licenties uit en verstuurt mail. Gevonden op 2026-08-27 bij
  het lezen van de wbgio-kopie, waar het onschadelijk is omdat `diaz_editor`
  daar gedropt is. Op vbozel bestaat dat schema wél. Niet gedemonstreerd — dat
  zou een licentie uitgeven.
- ~~De README in `bongartzdiaz/diaz-editor` wijst de Stripe-webhook naar het
  dode project.~~ **Gemarkeerd op 2026-08-25** met #640 (`208192b`): elf
  verwijzingen over twee bestanden, allemaal voorzien van een waarschuwing.
  Geen waarde vervangen — zie hierboven wat er daarvoor eerst gemeten moet
  worden.
- **Het tweede, lege Stripe-account** sluiten of labelen.
- Optioneel, hygiëne: `revoke execute on function public.handle_new_user(),
  public.notify_new_lead(), public.rls_auto_enable() from public, anon,
  authenticated;` — alle drie meetbaar niet aanroepbaar via RPC, dus dit is
  opruimen en geen reparatie.

### Philly of DEUS — drie naamsbeslissingen

Het CRM heet op de site sinds 2026-08-28 overal DEUS (de naam die `/pricing`
al verkocht). Drie plekken dragen nog Philly en zijn niet door een sessie te
beslissen — ze staan vastgepind in `lib/deus-naam.test.ts` tot jij kiest:

- **De signals-zin voert Philly op als gelevérd product.** "Every product
  I've shipped ... Voltafy. Performance Tracker. Philly." — terwijl
  `work.page.lede` in vier talen zegt dat Philly nog gebouwd wordt (#188).
  Wordt dat DEUS, vervalt de naam uit het rijtje, of klopt de zin niet meer?
- **`/now` claimt "Philly CRM v1.2"** (`now.ship.1`). Naam en versienummer
  zijn allebei niet uit de repo af te leiden; het CRM leeft in DEUS-SHARED.
- **Blijft de US-venture zelf Philly heten?** `ventures.v5.title`, de
  `/work/philly`-URL en `uses.op.philly` hangen aan elkaar; hernoemen kost
  een redirect en is naar buiten gericht.

### DEUS — het prijsmodel

- **Welke van de zestien mogelijkheden worden prijsrijen, en op welk niveau?** De
  tabel met bewijs staat in `docs/claims.md`. Acht dragen een niveau uit DEUS'
  eigen code; de vertaling van drie DEUS-niveaus naar vier pagina-niveaus is een
  commerciële keuze.
- **De IP-allowlist: naar Business op de pagina, of in `PLANS` naar alle
  niveaus?** Nu verkoopt de pagina hem aan Starter terwijl het product hem alleen
  aan business geeft.
- **Voert DEUS-SHARED de beslissing van 15 augustus alsnog uit?** Zolang dat niet
  gebeurt staan er twee prijsmodellen klaar die verschillende bedragen aannemen.

### DEUS — AI-providers en AVG

- **Welke AI-providers mogen persoonsgegevens ontvangen?** Vier kunnen het; vijf
  juridische documenten noemen alleen Anthropic. Volgen de documenten de code, of
  beperkt de code zich tot de documenten? Beide zijn verdedigbaar.
- **Mag een platformsleutel automatisch failoverdoel worden** voor een organisatie
  die een andere voorkeur uitsprak? Nu wel, met opzet, maar het staat nergens als
  keuze opgeschreven — en er is een derde optie: alleen aanvullen met providers
  die de organisatie zelf configureerde.
- **Houdt de nul-retentiebelofte stand?** Anthropic-specifiek, en de enige
  mitigatie die de DPIA noemt voor retentie bij de verwerker. Volgt uit de eerste
  vraag; beslis die eerst.

### Buiten deze repo

- **Zeven stappen voor lucenai.eu** in `docs/lucenai-backlinks.md` §3, waarvan zes
  operator-werk in WordPress. De belangrijkste kost een minuut: op
  `lucenai.eu/about` de naam van Juan linken naar `juandiazllc.com/en/about`.
  Backlinks bouwen heeft pas zin als stap 1 tot en met 3 gedaan zijn.
- **De R2-poort in `~/.claude/hooks/` slaat te breed toe.** Hij blokkeerde een
  read-only `curl` naar een LinkedIn-profielpagina, omdat hij matcht op
  netwerkcliënt plus het woord "linkedin" in plaats van op netwerkcliënt plus een
  berichten-endpoint. De regel die hij bewaakt — geen geautomatiseerde
  connectieverzoeken of DM's — is ongewijzigd juist. Het bestand staat buiten elke
  repo en wordt niet aangeraakt zonder jouw expliciete go.
- **De `supabase`-CLI op deze machine is ingelogd als
  `roy.raainvestments@gmail.com`.** Gemeten op 2026-08-26 via `supabase projects
  list`: zestien projecten over vijf organisaties, en **noch `vbozelswveaxsyccvaac`
  noch `wbgiouuifqhasedncysw` zit ertussen**. Vandaar dat een uitrol via de CLI
  faalt met 403 *"account does not have the necessary privileges"* — dat is geen
  defect maar een verkeerd account. De MCP-verbinding heeft die rechten wél, dus
  uitrollen kan daarlangs. Wil je het zelf via de CLI doen, dan moet je eerst als
  jezelf inloggen, en dat **vervangt Roy's opgeslagen token** op deze machine.

### LinkedIn — het kanaal is gekozen, het profiel wacht

Beslist op 2026-08-25: **één kanaal, LinkedIn, persoonlijk profiel.** De
onderbouwing staat in `docs/bereik-plan.md` §6, het uitvoerbare deel in
`docs/social-linkedin.md`. Kop, Over-tekst en de eerste zes posts staan daar
plak-klaar; er is geen regel code voor nodig.

- **Kop en Over op het persoonlijke profiel plakken.** Tien minuten.
- **De bedrijfspagina zichtbaar maken op de site, ja of nee.**
  `linkedin.com/company/juandiazllc` staat alleen in JSON-LD, dus een bezoeker
  kan hem niet vinden. Het is één regel in `components/sections/Contact.tsx`.
- **De Instagram-link op `/contact` laten staan, ja of nee.**
  `@diazelcazador` draagt een andere belofte dan het domein.

De vijf Plausible-doelen hierboven blokkeren dit ook: zonder die doelen is een
klik vanaf LinkedIn niet te onderscheiden van geen verkeer.

### Nog te beslissen, uit `docs/bereik-plan.md` §7

De enquête en de rekenmachine-route. Beslissing 1 en 2 uit dat hoofdstuk zijn
genomen en uitgevoerd, en het social-kanaal is op 2026-08-25 gekozen — zie het
blok hierboven.

### Afgevoerd — niet opnieuw opvoeren

| stond op de lijst als open vraag | werkelijke stand |
|---|---|
| Wat kost de sprint van 30 dagen? | **€2.500 excl. btw** · beslist 2026-08-22 |
| Wat ligt er na die dertig dagen op tafel? | het bouwplan **plus het eerste onderdeel dat al draait** · 2026-08-22 |
| Draag je een garantie, en welke? | **geen** op de uitkomst; wél op de levering · 2026-08-22 |
| Hoeveel trajecten draag je tegelijk? | **drie** · 2026-08-22 |
| Akkoord voor een end-to-end leadketen-test | gelopen op 2026-08-20, via het echte formulier |
| DNS TXT voor Search Console | het record staat er; alleen de property nog nakijken |
| `SUPABASE_ANON_KEY` als repo-secret | gezet 2026-08-24 12:29. `Lead-pad` daarna groen op run 32727411192 — status 401, code 42501, en dat ís de gezonde uitkomst: schema geserveerd, tabel bestaat, `anon` mag niet lezen. Eerste groene run van eenentwintig |

De vier aanbod-beslissingen staan met datum in `docs/claims.md`. Ze stonden op 24
augustus nog als open vraag in de lijst — twee dagen nadat je ze had genomen.


## Session log

### 2026-04-19 — `claude/analyze-test-coverage-WBVSQ`
- Audited test coverage (findings above).
- Replaced the Hero WebGL scene with a clean earth-globe look: solid sphere
  core with Fresnel rim, lat/long wireframe grid, back-face atmospheric halo,
  three inclined orbital rings with satellite nodes, sparse ambient data
  points. Same green palette (`#0B3D2E`, `#0E6B44`, `#1F8F5C`, `#2EC489`).
  Previous noise-displaced icosahedron looked organic/virus-like.
- Fixed i18n leaks: `Story.tsx` and `Chapters.tsx` had hardcoded English
  copy that leaked through NL/DE/ES pages. Added `story.tl.*`, `story.body.p*`,
  `story.sign.role`, `ch.word`, `ch.N.{eyebrow,title,body,meta}` keys in all
  four locales. Added missing `nav.insights` to NL and DE.
- Opened PR #3 against main. Vercel Git integration picks up the branch
  push as a preview deploy; merging to main ships production.
- Device optimization pass in `app/globals.css` (appended block):
  - tablet (641-1024) gets proper 2-col grids for signals + ventures +
    insights-related + dashboard stat-strip (previously jumped 3→1 / 6→12)
  - `(hover: none) and (pointer: coarse)` block strips lift/glow/translate
    hover effects that were sticking after tap; enforces ≥44px touch
    targets (WCAG 2.5.5) for `.btn` and nav links
  - `100dvh` fallback for hero/auth/philly-hero on browsers that support
    dynamic viewport units (fixes iOS URL-bar collapse jank)
  - large-screen cap (≥1680px) so display type doesn't run away on 4K
  - landscape-phone guard (`max-height: 560px`) reclaims vertical space
  - print stylesheet hides all animated chrome
- **Globe reliability rebuild.** WebGL globe was invisible on every device
  tested (suspected: fingerprinting shields + some mobile GPUs silently
  dropping the context). Rebuilt as a pure CSS-3D globe — no WebGL, no
  Three.js, no canvas. Hero.tsx now generates 12 meridians (pre-rotated on
  Y) and 7 parallels (rotateX 90° + translateY sin(lat)·50% + scale cos(lat))
  inside a `transform-style: preserve-3d` rotor. Rotation is genuine 3D
  via a single `rotateY` animation on the rotor, so every ring rotates
  with it correctly. Works on every browser, every device, regardless of
  fingerprinting/battery/reduced-motion settings. Reduced-motion users
  get a still globe. Classes: `.hero-stage .hero-starfield .hero-globe3d
  .globe-rotor .globe-core .globe-atmosphere .globe-meridian .globe-parallel
  .globe-specular .globe-orbit .orbit-sat`.
- **"Stunning" polish pass on the hero.** Nebula background (layered
  radial gradients + aurora wash), multi-layer starfield (bright + fine
  dust) with twinkle, two shooting stars sweeping diagonally, pulsing
  aurora halo around the globe, atmospheric rim glow that breathes
  (4s), gentle float (9s), satellites get a radial highlight, a comet
  trail and richer drop-shadows, specular highlight uses
  `mix-blend-mode: screen` for a genuine lit-from-above feel.
- **Interactive earth + Milky Way rebuild.** Replaced the decorative
  CSS-3D wireframe with a real interactive globe: SVG orthographic
  projection via `d3-geo`, a 110m-resolution world-atlas TopoJSON
  (`public/world-110m.json`, ~108 KB fetched on mount) decoded with
  `topojson-client`. Every country renders as its own `<path>` with
  hover + click handlers. Auto-rotates gently; pointer-drag lets users
  free-rotate; clicking a country animates `projection.rotate()` +
  `projection.scale()` (easeInOutQuad, ~1.1s) to the `geoCentroid()`
  and slides in an info panel. Featured copy for NL/US/DE/ES, generic
  placeholder otherwise — extend `FEATURED` in `components/sections/Globe.tsx`
  as real content lands. Background: layered Milky Way — slowly-rotating
  `conic-gradient` galactic arms (180s), pulsing core, dark dust lanes
  via `mix-blend-mode: multiply`, drifting nebula cloud. Still pure
  CSS + SVG, no WebGL. `prefers-reduced-motion` disables animations.
  New deps: `d3-geo`, `topojson-client`, `world-atlas` + types.
- **Lighthouse CI fix.** The workflow was failing on PR #3 (timeout
  waiting for Vercel preview) because Vercel Preview Protection
  auth-walls previews. Changed `.github/workflows/lighthouse.yml` to
  run only on pushes to `main`, so Lighthouse audits production
  (publicly reachable). PR runs no longer false-fail.

### 2026-04-19 (cont'd) — upgrade bundles 1–3

Three shipped bundles on the same branch, each typechecked + tested
(124 Vitest tests green) before push.

**Bundle 1 — `57067aa` — FAQ/Service schema, rate limits, a11y, log hygiene**
- `lib/seo/schema.ts` + `lib/seo/faqs.ts` (NEW). `faqSchema`, `serviceSchema`,
  `contactPointSchema` helpers. `HOME_FAQ`, `BRAND_FAQ`, `CONTACT_FAQ`,
  `SECTOR_FAQ` data (answers <300 chars, definitive first sentence — AI
  Overview-ready).
- `components/FaqSection.tsx` (NEW) — accessible `<details>`/`<summary>`
  accordion, CSS-only toggle, crawlable without JS.
- `app/[locale]/page.tsx` + `/contact` + `/sectors/[slug]` render FAQPage
  JSON-LD and mount `<FaqSection />`. `/sectors/[slug]` also emits
  `serviceSchema`. `contactPointSchema` on `/contact`.
- `app/globals.css` added `.faq-section` styles (rotating `+` → `×` on
  open, border-bottom list, expanding accordion). Also added
  `.ia-toc`/`.ia-toc-label` + `counter(toc, decimal-leading-zero)` and
  h2 `scroll-margin-top: 96px` for insight-article anchor nav.
- `app/[locale]/insights/[slug]/page.tsx` now auto-generates a TOC from
  h2 blocks (only when ≥2 headings). Slugs disambiguated via a Map
  counter. Helpers live in `lib/insights.ts` as `headingSlug()` and
  `tocFromBody()` with tests in `lib/insights.test.ts` (8 new tests).
- `app/philly/audit/page.tsx` — expandable audit rows with per-row
  Before/After field diff (`ChangesDiff` subcomponent using
  `Fragment key={k}`), entity dropdown grew from 6 → 37 options,
  date-range dropdown (1d/7d/30d) hits `app/philly/api/audit/route.ts`'s
  new `range` param.
- Rate limits: `enforceRateLimit(`<scope>:${scope.userId}`, PRESET_MUTATION)`
  added to `app/philly/api/contacts/bulk/route.ts`,
  `projects/bulk/route.ts`, `documents/upload/route.ts`, `ai/score/route.ts`
  (capacity 10, refill 0.166/s for expensive LLM calls), `ai/insights/route.ts`
  (`PRESET_READ` since it's rule-based, not LLM).
- Log hygiene: replaced `console.log` with `logger.debug(...)` in
  `lib/philly/email/providers.ts` and `lib/philly/sms/twilio.ts` so prod
  stops leaking null-dispatch payloads.
- A11y: `aria-label` on Topbar icon buttons (hamburger, language,
  theme). Topbar at `components/philly/layout/Topbar.tsx`.
- Declined two "gaps" that turned out to be already done: command
  palette (`components/philly/ui/CommandPalette.tsx` is a 490-line cmdk
  equivalent, not worth bolt-on migration) and sitemap hreflang
  (`app/sitemap.ts` already emits `alternates.languages` per URL).

**Bundle 2 — `ccfd30d` — cookieless analytics, Turbopack prod**
- `components/Analytics.tsx` rewritten to load Plausible unconditionally.
  Only suppresses when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is unset or
  `localStorage.analytics-opt-out === "1"`.
- `components/CookieConsent.tsx` DELETED; `app/layout.tsx` unmounts it.
  Plausible is cookieless → EU DPAs (incl. Dutch AP) confirm no consent
  is required, so the banner was legal theatre.
- `components/AnalyticsOptOut.tsx` (NEW) — toggle button on `/privacy`
  that reads/writes `localStorage.analytics-opt-out`. `aria-pressed` for
  screen readers. Loading-state guard prevents SSR hydration mismatch.
- `lib/i18n/dict.ts`: rewrote `priv.p.cookies` and `priv.p.analytics`
  in en/nl/de/es to reflect cookieless reality (was "if you accept
  cookies, we load…").
- `package.json`: `next build --turbopack` + `next dev --turbopack`.
  Turbopack is stable for prod in Next 16 — builds are ~30% faster.

**Bundle 3 — `1f28427` — i18n parity on public pages**
User reported "different languages on the website, work page for
example". Explore agent found ~85 hardcoded English strings leaking
through NL/DE/ES on `/work`, `/insights`, `/sectors`, `/signals`,
`Ventures`, `Stats`, `ResultsStrip`, `InsightsList`, `Footer`.
- Added ~55 new dict keys × 4 locales = 220 entries in `lib/i18n/dict.ts`
  (namespaces: `work.page.*`, `work.d.*`, `work.status.*`, `sectors.page.*`,
  `insights.page.*`, `insights.d.*`, `insights.filter.*`, `insights.search.*`,
  `insights.card.*`, `insights.empty*`, `signals.page.*`, `ventures.v{1..5}.*`,
  `stats.l.*`, `results.*`, `footer.copyright`, `footer.tz`).
- Page refactors: `/work`, `/work/[slug]`, `/insights`, `/insights/[slug]`,
  `/sectors`, `/signals` all now pull copy via `translate(l, key)` on
  the server or `useT()` on the client.
- Section refactors: `Ventures.tsx` — venture cards (title + body +
  category label) read from dict, titles contain `<em>` so rendered via
  `dangerouslySetInnerHTML` (content is author-controlled); `Stats.tsx`
  — 4 labels via `useT()`; `ResultsStrip.tsx` converted to a client
  component with `useT()` and 4 context/sector/window strings per card
  (numeric metrics stay hardcoded — they're data, not copy);
  `InsightsList.tsx` — "All" pill, search placeholder/aria, empty
  state, reset CTA; `Footer.tsx` — copyright + timezone.
- `Testimonials.tsx` left alone: the `TESTIMONIALS` array is empty so
  the component renders null (no runtime leak); fix when real quotes
  land.

**`590bf07` — EnergyRoi calculator (not yet routed)**
- `components/calculators/EnergyRoi.tsx` (NEW) — self-contained client
  component modeling the Dutch salderingsregeling phase-out (abolition
  on 1 Jan 2027). Three scenarios: pre-2027 baseline, post-2027 no
  battery, post-2027 with battery. Formulas: `production = kWp * yield`,
  `directUse = min(production * selfConsumption, consumption)`,
  `feedIn = max(production - directUse, 0)`, savings = directUse*retail +
  feedIn*feedInPrice. Currency via `Intl.NumberFormat('nl-NL')`.
- Dict keys `roi.*` for all four locales already live in
  `lib/i18n/dict.ts`; the component takes a `labels: RoiLabels` prop
  so a server wrapper can pass translated strings.
- **Not yet routed** — needs `app/[locale]/tools/energy-roi/page.tsx`
  (server component that reads labels via `translate(l, key)` and passes
  them into the client component, plus hero + outro blocks using
  `roi.eyebrow`/`roi.title`/`roi.lede` and `roi.outro.*`). That's the
  next ship.

### Pending for the next session

> ⚠️ **This list is historical (April 2026) and items 1, 2 and 4 were
> already shipped long before they were struck through here.** It has
> misled two separate sessions into "building" finished features.
> **Verify against the code before acting on anything in this block.**

**Top of queue (already authorized by the user with "Lets go and do it all"):**
1. ~~Wire up `/tools/energy-roi` page~~ — **DONE**, shipped in PR #9
   (`9038b9e`) with sitemap entry + two CTAs from `/sectors/energy`.
   Confirmed 2026-05-07.
2. ~~**Vercel AI SDK v5 — Attio-style AI Attributes on contacts.**~~ —
   **DONE**, also shipped in PR #9. `lib/philly/ai/contact-attributes.ts`,
   `POST /philly/api/contacts/[id]/ai-attributes`,
   `components/philly/contacts/AiAttributesCard.tsx`, schema fields
   `aiIndustry` / `aiIcpFit` / `aiSummary` / `aiAttributesStatus`.
   Built as an API route, not a server action. Confirmed 2026-07-21.
3. **SWR rollout across dashboard pages.** Currently most /philly pages
   do `async` server fetches on every nav. Wrap list queries in SWR so
   navigation feels instant + background revalidates. ~56 pages touched.
   *(Not verified — check before starting.)*
4. ~~**`@vercel/otel` + Sentry SLOs** on login, create-deal, AI-action.~~
   — **DONE**; all three paths wrapped in `withSpan`. The `@vercel/otel`
   half was deliberately dropped (peer-dep conflict with Sentry 9); see
   the SLO section at the top of this file.

**Deferred (Bundle 4+, flagged but not scheduled):**
- CopilotKit inline-generative-UI
- Liveblocks presence on deal pages
- EU AI Act Art. 50 transparency + DPIA (compliance work)
- Housekeeping: empty Testimonials.tsx, missing `/public/me/portrait.jpg`
  + `/public/hero.jpg`, `SEO.md:128` TODO

### i18n discipline — lessons learned this session

- Running an Explore-agent audit ("find hardcoded English in public
  pages") took ~90 seconds and caught ~85 leaks a regex wouldn't have.
  Do this periodically, not just when the user reports a leak.
- The `translate()` fallback silently hides missing keys as English.
  Treat every "English leaked through NL" user report as a translation
  bug, and check the key exists in ALL FOUR locales.
- Marketing-component arrays (`Ventures`, `ResultsStrip`) should read
  copy from `dict.ts` keyed by an `id`, not hardcoded in the array.
  The data model is `{ id, ...structuralProps }`; the copy comes from
  `t(`namespace.${id}.field`)`.
- Section components that are data-driven should become client
  components if they need `useT()` — `ResultsStrip` was a server
  component with hardcoded English; converted to `"use client"` +
  `useT()`. Cheap, no observable perf impact.

### 2026-05-06 — DEUS / LucenAI multi-tenant readiness sprint (`claude/zen-noyce-f6e719`)

7-bundle session shipping the readiness layer for first-customer
go-live (target 2026-05-13). All commits typecheck-clean, 195 vitest
tests passing, dev-server smoke-tested.

**Branding** (memory: `project_naming.md`): Product = **DEUS**, brand
= **LucenAI**. Folder `app/philly/*` stays mid-sprint to avoid a
49-module rename.

**Security baseline** (memory: `feedback_security_baseline.md`):
every DEUS commit hits bank-grade + GDPR-grade — `requireRole` on
mutations, PRESET_MUTATION rate-limit, Zod validation, atomic
transactions, generic 500s, audit row on privileged writes, no
cross-tenant leaks.

#### Bundles shipped

1. **`d42b3f4`** — DEUS rebrand. Browser title, sidebar logo, PDF
   footer, seed welcome notif all say "DEUS". Industry switcher
   filters out 'philanthropy'. Hospitality nav expanded 1→7 items.

2. **`268358c`** — Seats + invites + accept. New Prisma models:
   `Subscription`, `Invite`; `Organization.seatLimit` + `deletedAt`.
   `lib/philly/seats.ts` (getSeatStatus, assertSeatAvailable),
   `lib/philly/invites.ts` (token gen, Resend email).
   `POST/GET /api/organizations/invites`,
   `DELETE /api/organizations/invites/[id]`,
   public `POST /api/invites/accept` (IP-rate-limited, atomic
   create-user + claim-invite tx, generic error for all token-fail
   reasons). bcrypt(12) password hash. Migration:
   `npx prisma migrate dev --name seats_and_invites`.

3. **`b27e3b8`** — DSAR + erasure (AVG Art. 15 + 17). `User.deletedAt`
   soft-delete (30d window). `lib/philly/auth-helpers.ts` throws
   `UserDeletedError` → 410 Gone via `requireScope`. `lib/philly/dsar.ts`
   versioned export shape v1.0.0 — single source of truth for "what
   data leaves"; sensitive creds (passwordHash, 2FA secret, invite
   tokens) explicitly stripped. `GET /api/me/export?scope=user|org`,
   `DELETE /api/me` typed-DELETE confirmation + last-admin guardrail
   + atomic session purge, `DELETE /api/users/[id]` admin-removes-
   teammate (cross-tenant 404). Migration: `npx prisma migrate dev
   --name user_soft_delete`.

4. **`9e43ee4`** — Settings UIs.
   `app/philly/settings/team/page.tsx` (member list, pending invites
   with revoke, invite form, seat indicator),
   `app/philly/settings/privacy/page.tsx` (Export my data via
   Blob+URL.createObjectURL, Delete my account with typed-DELETE
   modal + last-admin warning).

5. **`bad59b2`** — Contacts CSV import.
   `lib/philly/import/csv-parse.ts` — RFC-flavored CSV parser (quoted
   fields, escaped quotes, embedded commas/newlines), **formula-
   injection neutralization** (=/+/-/@ → `'…`) for OWASP CSV
   injection defense on re-export. `suggestMapping()` auto-maps
   common headers; unknowns fall to 'skip'. `POST /api/contacts/import`
   admin/manager + Zod + 10k row cap + intra+cross-org email dedupe
   + atomic createMany batched at 500/tx. 4-stage UI: pick → preview
   → submitting → done; drag-drop, 5MB cap, live mapping preview.

6. **`3521cc5`** — Security hardening.
   `lib/philly/industry-gate.ts` `requireIndustry(allowed)` — DB
   column is canonical, localStorage useIndustry is UI-preference
   not security boundary. Layouts in `grants/`, `volunteers/`,
   `philanthropy/` redirect non-matching industries to /philly
   (404-equivalent, no module-existence leak). **Health endpoint
   upgrade**: 4 parallel checks (database [critical], supabase_auth
   [reachability <500=ok], stripe, email_provider); distinguishes
   "down" (503) from "degraded" (200 + body); 2s timeouts. **Middleware
   fix**: `/philly/api/health` was being auth-redirected, breaking
   uptime monitors — added `PUBLIC_PHILLY_PATHS` allowlist in
   `lib/supabase/middleware.ts`. **`li.*` decision** memo'd in
   `lib/supabase/li-client.ts`: intentionally single-tenant; 4-step
   migration plan when surface opens. **SLO span audit** — finding
   withdrawn, all 3 critical paths already wrapped in `withSpan`
   (`auth.login`, `POST /deals`, `POST /ai/score`).

7. **`ef48986`** — DEUS-SHARED sync workflow.
   `.github/workflows/sync-deus-shared.yml` — one-way force-push
   mirror to `bongartzdiaz/DEUS-SHARED` on push:main +
   workflow_dispatch. Fine-grained PAT (`DEUS_SHARED_PAT`) with
   Contents:Read+Write scope. Secret-presence guard with helpful
   error, 10-min timeout, deus-shared-sync concurrency queue.
   Operator setup steps in MANUAL_TASKS.md. Workflow dormant until
   secret is set.

8. **`<bundle 6 commit>`** — Onboarding + Deploy docs.
   New `ONBOARDING.md` (developer-side: clone → install → daily
   commands + bank-grade checklist + new-route templates). Updated
   `DEPLOY.md` to reflect the unified codebase (Root dir is `./`,
   not `philly/` — surface lives at `/philly/*` URL prefix), new
   env vars, May 2026 migrations, DEUS-SHARED mirror reference,
   post-MVP brand-split plan. Updated CLAUDE.md session log (this
   block).

#### `/writing` drafts in `_drafts/` (publish after legal-entity confirm)

- `legal/privacy-en.md` — AVG/GDPR Art. 13-14
- `legal/dpa-en.md` — Art. 28 processor agreement, signable
- `legal/tos-en.md` — Dutch governing law, Amsterdam disputes
- `legal/subprocessors-en.md` — 6 sub-processors, EU-only
- `onboarding/welcome-email.md` — EN+NL, 150 words
- `onboarding/first-day-deus.md` — 5-page customer walkthrough
- `pricing/pricing-en.md` — 3 tiers (Starter €49 / Pro €79 /
  Enterprise custom), beta 50%-off offer for first 3 customers

#### Pending for next session

1. **Confirm legal entity** ("Juan Diaz LLC" reads US-style — confirm
   actually-NL-BV vs actually-US, fill `[KvK TBD]` + `[address TBD]`
   placeholders, publish drafts to live paths under `app/[locale]/legal/*`)
2. **Operator-side setup** — see `MANUAL_TASKS.md`: Prisma migrate,
   env vars (RESEND_API_KEY, INVITE_FROM_EMAIL, etc.), Resend SPF/DKIM,
   DEUS-SHARED PAT
3. **Hetzner cutover** per the May 2026 sprint plan — GEX44 ordered,
   Postgres + Lucia auth POC, Friday cutover, B2 EU backups
4. **Customer prospect onboarding** — pick the vertical (RE or
   hospitality), seed Organization, send welcome email

#### Open architectural decisions

- **Brand split** (post-MVP): `juandiazllc.com → lucen.ai`,
  `philly.juandiazllc.com → app.lucen.ai`, eventually folder rename
  `app/philly/* → app/deus/*`. Not blocking week-1.
- **Auth migration**: Supabase Auth → Lucia on self-hosted Postgres,
  mid-week-1 per sprint plan; current code works on either.
- **`li.*` multi-tenancy**: single-tenant today (operator only);
  4-step migration plan documented when surface opens to customers.

### 2026-05-06 (cont'd) — Bundle C: housekeeping + memory hygiene

Small deck-clear bundle while picking up after the 10-bundle DEUS sprint.

- **`lib/seo/branding.ts`** (NEW) — single source of truth for
  `AUTHOR_IMAGE_URL`, `AUTHOR_IMAGE_PATH`, `AUTHOR_IMAGE_FALLBACK_URL`,
  `ORG_LOGO_URL`. Replaced 3 callsites (`app/[locale]/layout.tsx`,
  `app/[locale]/about/page.tsx`, `lib/seo/article.ts`) that hardcoded
  `${SITE}/me/portrait.jpg`. Until the operator drops a real portrait,
  the URL still 404s — but now there's one constant to flip to the
  fallback (`/icon-512.svg` exists today) without grepping.
  `MANUAL_TASKS.md` brand-assets entry expanded to point at the
  constant.
- **`docs/pitch-template.md`** (NEW) — replaces the
  `SEO.md:128` "TODO — not yet written" placeholder for the Tier-1
  outreach pitch template (Solar Magazine NL, PV Magazine DE,
  Tweakers, El Confidencial). Includes per-publication editor notes,
  word-count targets, follow-up cadence, anti-pattern list. Used as
  the operator playbook for backlinks → DA growth.
- **`SEO.md`** — TODO marker removed, link points at the new doc.
- **Memory hygiene** — extracted the LinkedIn-Outreach session block
  from `~/.claude/projects/.../memory/MEMORY.md` (lines 7–41) into
  its own `project_linkedin_outreach.md`. MEMORY.md is now a clean
  index file (6 entries, all one-liners pointing at separate memory
  files). Standard pattern going forward.

Touched 7 files. Typecheck clean. 222/222 vitest still green (no
test changes — pure rename + new docs). No new migrations, no env
vars, no breaking changes.

### 2026-05-06 (cont'd) — Bundle A: Calendar OAuth (Google + Microsoft)

Replaces the wizard Step 5 placeholder with a real OAuth flow. Single
biggest customer-facing feature gap from the DEUS readiness sprint.

**New schema:** `CalendarConnection` (per-user, encrypted tokens via
existing `lib/philly/crypto.ts` AES-256-GCM, scopes, status, last error,
soft-revoke). Uniqueness on `(userId, provider)` so a user has at most
one Google + one Microsoft connection. Operator runs
`prisma migrate dev --name calendar_connections`.

**New library** under `lib/philly/calendar/`:
- `state.ts` — HMAC-signed CSRF state token (10-min TTL, version-pinned,
  payload binds userId + orgId + provider + redirect, prevents OAuth
  callback hijacking)
- `providers.ts` — Google + Microsoft config (auth URL, token URL,
  scope list, env-var names). `isProviderConfigured()` gracefully
  reports "not configured" when CLIENT_ID env vars are missing —
  503 with a clear operator message instead of a confusing OAuth error.
- `connection.ts` — encrypted CRUD + lazy access-token refresh on
  read (refresh-leeway 30s before expiry), soft-revoke, error marking.
  Tokens never leave this module — the encrypted bytes are never
  returned over the wire.
- `token-exchange.ts` — code-for-tokens swap + provider profile
  fetch, normalised to `{ providerAccountId, providerEmail }`.
- `events.ts` — provider-aware list-events with normalised event
  shape (id, title, start, end, allDay, location, attendees,
  htmlLink, provider). Google + MS Graph param differences (`timeMin`
  vs `$filter`, `maxResults` vs `$top`, `singleEvents` vs `$orderby`)
  centralised in `buildEventsUrl`.

**New API routes:**
- `GET /philly/api/calendar/oauth/start?provider=google|microsoft&redirect=<path>`
  — signs state, 302 to provider authorise URL. Open-redirect-safe
  (only same-origin paths accepted).
- `GET /philly/api/calendar/oauth/callback?code=…&state=…`
  — verifies state HMAC + freshness + subject-match-current-user
  (defends against state-replay across users), exchanges code,
  fetches profile, upserts connection. Errors render as redirects
  with `?error=<reason>` so users see a coherent UI mid-flow.
- `GET /philly/api/calendar/connections` — user's own connections,
  no secrets exposed.
- `DELETE /philly/api/calendar/connections/[id]` — soft-revoke,
  rate-limited (PRESET_MUTATION).
- `GET /philly/api/calendar/external-events?provider=…&from=…&to=…&limit=…`
  — normalised event list, rate-limited (PRESET_READ).

**Wizard Step 5 rewrite** (`app/philly/onboarding/calendar/page.tsx`):
- Polls `/api/calendar/connections` on mount
- Shows connect-button or connected-as-email + Disconnect inline
- Handles `?error=…` and `?connected=…` query-param feedback from
  the OAuth callback
- "What we read, what we don't" details panel for trust + clarity
- All copy hardcoded English for now (pre-i18n; existing wizard
  steps are also English-only — i18n pass is separate work)

**Tests** (37 new, total now 259/259):
- `state.test.ts` — round-trip, nonce uniqueness, malformed/tampered
  payloads, tampered signatures, expiry, edge-of-TTL freshness, forged
  signatures
- `providers.test.ts` — config shape, MS_OAUTH_TENANT override,
  Microsoft offline_access scope assertion, env-var-driven
  configuration check, redirect-URI builder
- `events.test.ts` — Google + Microsoft URL param construction,
  event normalisation including all-day, missing-summary, missing
  attendees/webLink fallbacks
- `token-exchange.test.ts` — happy-path Google + Microsoft, all 5
  failure modes (provider_not_configured, token_request_failed,
  token_response_invalid, profile_request_failed,
  profile_response_invalid), MS userPrincipalName fallback when
  mail is null, missing expires_in handling

**Operator-side setup** documented in `MANUAL_TASKS.md`:
- Google: GCP Console → Enable Calendar API → OAuth client ID →
  set GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET
- Microsoft: Entra ID → App registration → API permissions
  (User.Read, Calendars.Read, offline_access) → client secret →
  set MS_OAUTH_CLIENT_ID / MS_OAUTH_CLIENT_SECRET / MS_OAUTH_TENANT
- DB: `npx prisma migrate dev --name calendar_connections`

**Architecture decisions baked in:**
- Read-only scope MVP — adding events.create later requires re-consent
  (Google forces incremental scope grants). Acceptable trade-off for
  clarity; we'll bump scope when we ship two-way sync.
- No webhook subscriptions yet (Google `watch`, Microsoft `subscriptions`).
  Polling-based via `/external-events`. Push-sync is a follow-up bundle
  when calendar drives in-app notifications.
- Single primary calendar per provider per user. Multi-calendar
  selection (e.g. "sync my work + personal") deferred — adding a
  `calendars` JSON column to `CalendarConnection` is a forward-compatible
  migration when we need it.
- Refresh-on-401 is intentionally NOT done. MS rotates refresh tokens
  on security events; auto-retry masks revocation. Surface as
  "reconnect" in UI instead — already wired.

11 files added (5 lib, 5 routes, 1 schema diff, wizard rewrite, 4 test
files), 1 migration pending operator-side. Bundle: `<commit-sha>`.

### 2026-05-06 (cont'd) — Bundle B: Stripe billing (Checkout + Portal + webhooks)

Unlocks paid trials → revenue gate for first customers. Builds on the
existing `Subscription` schema (already shipped in the readiness sprint)
and the `seats.ts` helper (which already reads `Subscription.seatCount`
when status is `active` or `trialing`). My job was just keeping the
`Subscription` row fresh via webhooks.

**New library** under `lib/philly/stripe/`:
- `client.ts` — lazy Stripe singleton, env-var-driven, `isStripeConfigured()`
  graceful-fail (Resend pattern). API version pinned to `2025-02-24.acacia`
  (matches installed SDK 17.7's `LatestApiVersion`).
- `plans.ts` — plan catalogue (Starter / Professional). Price IDs live
  in env vars (`STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`),
  not in code — Stripe is source-of-truth for pricing. `planKeyFromPriceId()`
  reverse-maps for the webhook handler.
- `customer.ts` — `ensureStripeCustomer(org, billingEmail)` lazy creates
  a Stripe Customer per Organization, idempotent.
- `subscriptions.ts` — `upsertFromStripe(orgId, sub)` mirrors a Stripe
  Subscription into our DB. Status mapping: trialing/active = honour
  seatCount; past_due/unpaid = revert to free-tier (seats.ts handles
  the fallback so customer doesn't get locked out mid-failure);
  canceled/incomplete = audit row stays, free-tier seats. Defensive
  read of `current_period_end` (Stripe API version drift — top-level
  vs items[0]).
- `webhook.ts` — `verifyWebhook(rawBody, sig, secret)` (HMAC + 5-min
  replay-window via Stripe SDK), `dispatchEvent(event)` routes 5
  critical events. Idempotent — Stripe retries are safe replays.
  Soft-fail on missing metadata (return ok:true so Stripe stops
  retrying), 500 only on real DB failures (Stripe SHOULD retry).

**New API routes:**
- `POST /philly/api/billing/checkout` — admin-only, rate-limited.
  Creates Customer (lazy) → Checkout Session with 14-day trial,
  EU VAT collection, billing-address-required. Returns `{ url }` for
  client redirect.
- `POST /philly/api/billing/portal` — Customer Portal session for
  self-service plan/payment/invoice management.
- `POST /philly/api/billing/webhook` — Stripe receiver, signature
  verified, no-session bypass via `PUBLIC_PHILLY_PATHS` allowlist
  in `lib/supabase/middleware.ts`.
- `GET  /philly/api/billing/subscription` — current sub status + seat
  usage for the UI. Anyone signed-in can read (no card data exposed).

**Settings UI** at `app/philly/settings/billing/page.tsx`:
- Polls `/api/billing/subscription` on mount
- "Current plan" panel: plan name, seat usage (used/limit + active/pending),
  next renewal date OR "no subscription" for free tier
- "Manage subscription" button (admin-only) opens Stripe Portal
- "Upgrade" panel (only visible on free / canceled / expired tiers):
  side-by-side Starter / Professional cards with feature lists + "Start
  free trial" CTAs
- Surfaces `?session_id=…` (success) and `?canceled=1` (canceled at
  Stripe) query params from the Checkout redirect
- "Cancels on …" notice when `cancelAt` is set

**Tests** (30 new, total now 289/289):
- `plans.test.ts` — `planFromKey` happy + unknown, `getPriceId` env
  var driven, `planKeyFromPriceId` reverse mapping, TRIAL_DAYS = 14
- `webhook.test.ts` — `HANDLED_EVENTS` shape, `isHandledEvent` narrowing,
  `verifyWebhook` 6 cases (valid, missing signature, missing secret,
  wrong-secret, tampered body, expired timestamp), `resolveOrganizationId`
  + `invoiceSubscriptionId` polymorphism
- `subscriptions.test.ts` — `isHandledStatus`, `subscriptionPeriodEnd`
  defensive read across API versions

**Architecture decisions baked in:**
- 14-day trial, no card-up-front. Anti-abuse mitigation deferred —
  if it becomes a problem, flip via `subscription_data.trial_settings`.
- Single line item per subscription (seats × price). Add-ons / metered
  usage deferred. The webhook reads `items.data[0]` so multi-item
  subs would silently use only the first — fine for now, noted for
  when we ship usage-based billing.
- EU VAT via `tax_id_collection: { enabled: true }` — Stripe handles
  reverse-charge mechanics. Fine for B2B-only customers.
- `PUBLIC_PHILLY_PATHS` allowlist gets a 2nd entry (was just `/health`).
  Every public path is a hole — both are minimal-risk (signature-verified
  inputs, no PII in response).
- Refresh-after-failed-payment NOT auto-retried — Stripe's dunning emails
  handle it. We just mirror the past_due state so the customer sees
  it in `/settings/billing`.

**Operator-side setup** documented in `MANUAL_TASKS.md`:
- Stripe Dashboard: create Starter + Professional products
- Webhook endpoint subscribed to 5 events, copy `whsec_…`
- Vercel env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`
- Local dev: `stripe listen --forward-to localhost:3000/...`

15 files added (6 lib including 3 test files, 4 routes, 1 settings UI,
1 middleware diff, 1 webhook handler). NO new schema migrations
needed — Subscription model was already shipped.

### 2026-05-07 — Bundle F: per-user integrations settings surface

Closes the gap between the onboarding wizard (one-time, per-user calendar
connect) and post-onboarding management. Yesterday's Bundle A wired
calendar OAuth through `/philly/onboarding/calendar`, which users only
see during initial setup — nowhere to manage connections after that.

- **`app/philly/settings/integrations/page.tsx`** (NEW) — dedicated
  per-user settings surface. Polls `/api/calendar/connections`, shows
  Google + Microsoft rows with Connect / Disconnect, surfaces `?error=`
  / `?connected=` query-param feedback from the OAuth callback. Same
  trust panel ("what we read, what we don't") as the wizard so the
  promise stays consistent across surfaces.
- **`app/philly/settings/page.tsx`** — replaced the integrations tab
  kitchen-sink stub (which had hardcoded fake `GoHighLevel/Supabase/
  Slack/GA` rows) with two cards: "Personal — calendar" links to
  `/philly/settings/integrations`, "Workspace — org-wide tools" links
  to the existing `/philly/integrations`. No more fake data.

**Architecture decision**: kept the per-user surface (`/settings/integrations`)
distinct from the per-org surface (`/philly/integrations`) because the
underlying data models are different — `CalendarConnection` is per-user
(every teammate connects their own calendar) while the workspace
`Integration` model is per-org (one Stripe key, one Slack workspace).
Forcing them onto a single page would have required either:
- Tagging each row "personal vs workspace" — confusing UX
- Or merging the data models — would have broken per-user calendar isolation

Two surfaces, clearly labelled, is honest.

**No new schema, no new API routes, no new lib code.** Pure UI completion
on top of yesterday's Bundle A. Typecheck clean. 289/289 vitest still
green (no tests for UI-only changes; the API was test-covered in Bundle A).

### 2026-05-07 — Bundle E: confirmed already shipped

Earlier session log claimed `/tools/energy-roi` was "not yet routed" —
verified incorrect. The page (`app/[locale]/tools/energy-roi/page.tsx`)
shipped in PR #9 (`9038b9e`), with sitemap entry + two CTAs from
`/sectors/energy` (anchor callout + dedicated card). No work needed.

### 2026-05-07 — Bundle G: audit log on billing + calendar mutations

Wired the existing `logAudit` helper (`lib/philly/audit.ts`) into the
three new user-initiated mutation paths from yesterday's bundles:

- **`POST /api/billing/checkout`** — audits the *intent* (entity=subscription,
  action=create, entityId=null). The actual Subscription row gets created
  later via `customer.subscription.created` webhook. Capturing the intent
  here gives auditors a who-clicked-what trail even when the customer
  drops off mid-Checkout (declines card, abandons tab).
- **`GET /api/calendar/oauth/callback`** — audits the connection
  (entity=integration, action=create). Records `{provider, providerEmail,
  kind: 'calendar'}` in changes. We deliberately do NOT log providerAccountId,
  scopes, or any token/refresh material — those are sensitive enough to
  keep out of permanent record.
- **`DELETE /api/calendar/connections/[id]`** — audits revocation
  (entity=integration, action=delete, entityId=connection.id). Status
  flip recorded as `{old: 'active', new: 'revoked'}`.

**What's NOT audited here**: the Stripe webhook handler. Webhook events
are server-to-server (no Supabase session, no `scope.userId`) — `AuditLog.userId`
is required by schema. Webhook events stay in `logger.info` instead.
If future compliance review demands user-traceable audit on webhook
state changes, the right move is to add a synthetic system-user row
+ FK relaxation, not roll-our-own around it.

3 files changed (3 routes + 1 doc). Typecheck clean. 289/289 still
green. No new schema, no new env vars, no breaking changes.

### 2026-05-07 — Bundle D: calendar push-sync (Google `watch` + MS Graph subscriptions)

Replaces poll-only calendar reads (`/api/calendar/external-events`) with
provider-pushed notifications. Calendar changes propagate to DEUS in
seconds instead of waiting for the next poll. Builds on Bundle A's
OAuth foundation; uses the same `CalendarConnection` rows for tokens.

**Research first** (used `/research` skill — findings persisted to
`docs/calendar-push-sync.md` for future contributors). Key APIs +
gotchas:
- Google `watch`: TTL up to 7 days, no auto-renewal — must create new
  + stop old. Webhook is push-then-pull (empty body, headers carry
  channel id + token). `X-Goog-Resource-State='sync'` is the bootstrap
  notification — ignore.
- MS Graph subscriptions: TTL **4230 minutes (~70 hours)** — much
  shorter. Renew via PATCH. Validation handshake on first contact:
  POST `?validationToken=…` with `text/plain`, must respond plain text
  + 200 within **10 seconds**. Notifications: 3-second hard SLA, queue
  + 202 immediately.

**New schema**: `CalendarChannel` (per-CalendarConnection, encrypted
authSecret, externalId, expiresAt, lastMessageNum, syncToken, status).
`@@unique([provider, externalId])` so the webhook can look up the
right channel by what the provider sends. `@@index([expiresAt, status])`
for the renewal cron's selector. Run `prisma migrate dev --name
calendar_push_sync` to apply.

**New library** (`lib/philly/calendar/push-sync.ts`):
- `subscribe()` — provider-aware. Generates a 32-byte random authSecret,
  calls Google `events.watch` or MS `POST /subscriptions`, persists a
  `CalendarChannel` row. Idempotent — returns the existing active
  channel if one exists.
- `renew()` — Google: new `watch` + stop old (overlap intentional, per
  Google's docs). MS: `PATCH /subscriptions/{id}` with new
  `expirationDateTime`.
- `unsubscribe()` — best-effort tear-down. Tells the provider to stop
  via Google's `/channels/stop` or MS's `DELETE /subscriptions/{id}`.
  Marks the row `expired` regardless of provider response — the
  channel will time out upstream within its TTL anyway.
- `listDueForRenewal()` — selector for the cron, returns channels with
  `expiresAt < NOW + 12h` and `status='active'`.

**New webhook receiver** (`app/philly/api/calendar/webhook/[provider]/route.ts`):
- Single route, dynamic param distinguishes Google vs MS.
- MS validation handshake is the FIRST branch (text/plain query-param
  echo). Must precede the JSON body parse — handshake requests don't
  have JSON.
- Google handler: verify `X-Goog-Channel-Token` against decrypted
  authSecret using `crypto.timingSafeEqual`, ignore bootstrap `sync`
  state, dedupe via `lastMessageNum` (refuse `<= stored`).
- MS handler: `value` array can batch notifications across DIFFERENT
  subscriptions in one POST — group by `subscriptionId`, verify
  `clientState` per group via timing-safe compare.
- Both return 2xx fast. Today the actual delta-fetch is just a TODO
  marker — proves the round-trip works without committing to a sync
  implementation. Event-fetch worker is a follow-up bundle.

**Wired into existing flows**:
- `app/philly/api/calendar/oauth/callback/route.ts` — after
  `upsertConnection`, calls `subscribePushSync()` best-effort. Failure
  is non-fatal (user still gets a working OAuth connection).
- `app/philly/api/calendar/connections/[id]/route.ts` DELETE — tears
  down active channels FIRST (while OAuth tokens are still valid),
  then revokes the connection. Channel stops happen synchronously
  before the row flip.

**Middleware allowlist** — added two paths to `PUBLIC_PHILLY_PATHS`
(`/philly/api/calendar/webhook/google`, `/philly/api/calendar/webhook/microsoft`).
Joins `/health` and `/billing/webhook` as the only auth-exempt /philly
paths. Per-channel encrypted authSecret is the auth.

**Tests**: 13 new in `push-sync.test.ts` covering TTL constants vs
provider docs, URL builders, base64url-secret length + uniqueness +
provider-limit fits. **289 → 302/302 green.** Also fixed a flaky test
inherited from Bundle A's `state.test.ts` — the tampered-signature
assertions had a 1/64 collision when the random sig already ended in
'X'. Replaced with a guaranteed-different replacement char.

**Architecture decisions baked in**:
- Schema: separate `CalendarChannel` table (not extending `CalendarConnection`)
  so OAuth state and push-sync state have independent lifecycles. A
  channel can fail without invalidating tokens, and vice versa.
- TTL choices: 6 days (Google) and 4200 minutes (MS) — both leave
  buffer vs the documented caps for clock skew + retry on transient
  failure.
- Renewal buffer: 12 hours — comfortably ahead of MS's 70-hour TTL,
  reasonable for daily Google renewals.
- AuthSecret: 32-byte base64url → 43 chars. Fits within Google's 256
  and MS's 128 character limits with room.
- Bootstrap "sync" notification: ignore via early return — only `exists`
  state triggers downstream.
- MS 3-second SLA: handler does verify + bookkeeping, returns 202
  Accepted. Actual sync work is a TODO — no synchronous work in the
  handler.
- Webhook deduplication: at-the-edge via `lastMessageNum` (Google
  only — MS doesn't expose an equivalent). Sync-level idempotency
  (event upsert by external id) is the second layer when the actual
  fetch lands.

**Operator setup** documented in `MANUAL_TASKS.md`:
- `prisma migrate dev --name calendar_push_sync`
- `NEXT_PUBLIC_APP_URL` must be set (otherwise subscribe is no-op)
- Renewal cron job (deferred — `listDueForRenewal()` selector is ready)

8 files added (1 schema diff, 1 lib, 1 lib test, 2 routes, 1 middleware
diff, 1 oauth-callback diff, 1 connection-delete diff, 1 docs file +
1 docs update). Typecheck clean.

### 2026-05-07 — Bundle D2: renewal cron + push-sync status badge

Closes the production gap from Bundle D — `CalendarChannel` rows expire
after 7 days (Google) or ~70 hours (Microsoft); without a renewal cron,
push-sync stops working silently. This bundle ships the renewal path
plus a UX touch so users can see the sync is healthy.

- **`POST /api/calendar/cron/renew-channels`** — same auth shape as
  the existing `/api/audit/prune` cron (`X-Cron-Secret` header OR admin
  session). Calls `listDueForRenewal()` + per-channel `renew()` loop
  with a 200-channel batch cap so a single sweep can't go runaway.
  Returns `{ dueTotal, processed, renewed, failed, results[] }` —
  enough for an operator to debug a sweep without dumping per-channel
  secrets.
- **`GET /api/calendar/connections` extended** — adds a `channel`
  field per connection: `{ id, status, expiresAt, lastRenewedAt }` or
  `null`. The query joins `CalendarConnection.channels` (filtered to
  `status='active'`, ordered desc, take 1) so the front-end gets a
  single round-trip per render.
- **`/philly/settings/integrations` UX** — adds a green "Real-time sync ·
  renews in 6d" badge next to the connected-as-email row when a healthy
  channel exists. When a connection is active but no channel is healthy
  (subscribe failed, channel expired without renewal), shows "Read-only
  — push-sync not active" so the user can tell what's happening
  without reading docs. Helper `formatRelativeFuture` keeps the
  copy short ("in 5h" → "in 3d" → absolute date if >7 days).

**No new schema, no new env vars** beyond the already-existing
`CRON_SECRET`. Cadence + cron entry documented in `MANUAL_TASKS.md`.

302/302 tests still green (no new tests this bundle — the cron route
delegates to `push-sync.ts` which is already test-covered, and the UI
addition is pure rendering on top of the typed response). Typecheck
clean.

### 2026-05-07 — middleware fix surfaced by preview verification

While verifying Bundle D2 in a local preview I tried to call
`POST /api/calendar/cron/renew-channels` without a session and got
`opaqueredirect` (302 to /login) instead of the expected 401 from the
route handler. Realised the middleware redirect happens BEFORE the
route's own `X-Cron-Secret` check, so any external scheduler hitting
this endpoint gets bounced. Same architectural shape as `/api/health`
hit earlier in PR #12.

This was also a latent bug in `/api/audit/prune` (shipped weeks ago,
documented as cron-callable in its header comment, but actually
unreachable from any non-session caller). Both routes now in
`PUBLIC_PHILLY_PATHS`. The route-level auth check (X-Cron-Secret OR
admin session) is unchanged — the allowlist entry just lets the
request reach the handler.

Verified post-fix: all three previously-broken endpoints now return
401 from `requireRole` instead of 302 from middleware. 302/302 tests
still green; no test code touched.

Lesson: spin up a preview EARLIER when shipping cron-style routes —
unit tests don't catch middleware-shape bugs because they don't
exercise the middleware path.

### 2026-05-07 — Bundle AF: audit fixes (HIGH × 2, MEDIUM × 4, LOW × 2)

Followup to `/audit-full` — addressed 8 of 11 findings. The remaining
3 (lastUsedAt schema-drift, CalendarConnection.organization onDelete,
lastError UI rendering) are LOW-impact follow-ups documented in the
audit report; not blocking.

**HIGH severity (cross-tenant safety in renew-channels):**
- F1: `cron/renew-channels` admin path was processing channels across
  ALL organizations because `listDueForRenewal()` had no scope filter.
  Added optional `organizationId` parameter; admin path passes
  `scope.organizationId`, cron path omits to process all orgs.
- F2: Same route had no rate limit on the admin path. Added
  `PRESET_MUTATION` for the admin trigger; cron skips (secret implies
  trust). Plus self-audit for admin runs (mirrors /api/audit/prune).

**MEDIUM (compliance + contracts):**
- F3: Stripe Customer Portal access now writes an audit row. The portal
  enables cancel/payment-method/tax-id changes; downstream Stripe
  webhooks fire as `customer.subscription.deleted` etc. but those are
  server-to-server with no userId. This row ties the resulting state
  changes back to the admin who clicked the button.
- F4: Admin-triggered renew-channels sweep now writes an audit row
  (renewedCount, failedCount, processed). Mirrors prune route's pattern.
- F6: Hoisted `ConnectionDTO` / `ChannelDTO` / `ConnectionsResponse`
  into `lib/philly/calendar/types.ts`. Both UIs that consume the
  endpoint (wizard + integrations settings) now import from there
  instead of declaring their own inline interfaces. The wizard had
  drifted (missing `channel` field added in Bundle D2) — fixed.
- F7: Created `lib/philly/app-url.ts → getAppBaseUrl()` helper. Stripe
  checkout, Stripe portal, and calendar OAuth subscribe all use it
  now. Portal route gained the missing fail-fast on missing env (was
  silently composing a relative URL Stripe rejected with an opaque
  error) and the missing `session.url` null-check.

**LOW (polish):**
- F9: Removed duplicate `'user'` from `AuditEntity` union.
- F10: Gated `access_type=offline` and `prompt=consent` behind
  `provider === 'google'` check. They were unconditionally set for
  both providers; harmless on MS but misleading to read.

**Skipped this round (LOW, follow-up):**
- F5 (lastUsedAt soft-promise — needs throttled write logic)
- F8 (CalendarConnection.organization missing onDelete)
- F11 (lastError declared but never rendered)

7 files touched: 5 routes, 2 new lib helpers, 1 audit-helper diff,
1 Prisma-schema-comment will be addressed in F8 follow-up. Typecheck
clean. Tests: 301 pass + 1 pre-existing flake in crypto.test.ts
(documented in readiness-sprint session log; passes in isolation,
fails when interleaved — not introduced by this work).

### 2026-07-20 — SEO: new NL energy insight (dynamisch energiecontract)

Restarted the insights cadence (last post was 2026-04-15 — ~3 months
stale) by shipping the highest-ROI piece from an SEO content audit:
deepen the NL post-salderingsregeling energy cluster, which is the
site's only realistic ranking wedge on a DR-0 domain (urgent 2027
deadline, high commercial intent, thin Dutch competition).

- **New insight** `dynamisch-energiecontract-na-de-salderingsregeling`
  in `lib/insights.ts`. `markets: ["nl"]`, tag `Energy`, Dutch body —
  matches the convention of its two siblings (`salderingsregeling-2027`,
  `thuisbatterij-verkoop-na-2027`), which are NL-only with no i18n.
  Deliberately did NOT add en/de/es i18n: salderingsregeling is a
  Dutch-regulatory topic, and CLAUDE.md's own rule is that
  market-specific posts stay `["nl"]` "so they don't surface as thin
  content under /en,/de,/es". (My earlier pitch loosely said "+ i18n";
  corrected to match the repo convention.)
- **New `InsightBlock` variant** `{ type: "cta"; text; href }`. The
  existing `p` renderer emits plain text (`<p>{text}</p>`) — no inline
  links — so an internal link to the ROI calculator wasn't expressible.
  The `cta` block renders as a `.btn.primary` link in
  `app/[locale]/insights/[slug]/page.tsx`. The article uses it once to
  link `/tools/energy-roi` mid-body (the internal-link SEO value + a
  natural funnel step from "reken het door" to the calculator).
- **feed.json** (`app/feed.json/route.ts`) — added `cta` to the
  body-flattening branch (returns `b.text`). Harmless for this post
  (NL-only, never in the EN feed) but keeps the mapper correct if an
  all-market post ever uses `cta`. `tocFromBody` ignores non-h2 blocks;
  `rss.xml` uses `summary` only — both unaffected.
- **globals.css** — one rule `.ia-body .ia-inline-cta { margin: … }`
  for CTA spacing; reuses existing `.btn.primary` styling.

Auto-wiring already in place: the detail page's related-posts + the
`Energy`-tag → Voltafy venture cross-link surface automatically. Follow-
ups (not in this PR): cross-link the new article from `/sectors/energy`
and the calculator page; Tier-1 #2/#3 (thuisbatterij terugverdientijd,
installateur-angle) to complete the cluster.

4 files touched (insights data + type, detail renderer, feed mapper,
css). Typecheck clean. 417 pass + the same documented crypto flake.
Production build green — new `/nl` page generates, no route errors.

### 2026-07-20 (cont'd) — SEO Tier-1 #2: thuisbatterij terugverdientijd

Second piece of the NL energy cluster, riding on the `cta` infra merged
in #82 (so this PR is content-only — one file).

- **New insight** `thuisbatterij-terugverdientijd-2027` in
  `lib/insights.ts`. `markets: ["nl"]`, tag `Energy`, Dutch body, one
  `cta` block → `/tools/energy-roi`. Consumer/installer search-intent
  counterpart to the operator-angle `thuisbatterij-verkoop-na-2027`:
  that post is about *how installers sell* batteries; this one is the
  honest *terugverdientijd rekensom* (what actually determines payback,
  why brochure numbers mislead, how to compute it for your own profile).
  Distinct angle + target term ("thuisbatterij terugverdientijd"), no
  overlap with the three existing saldering/battery posts.
- 1 file changed. Typecheck clean. 417 pass + the same documented
  crypto flake (green in isolation). Build green — 241 static pages,
  new `/nl` page generates.

Cluster now: dynamisch-energiecontract + thuisbatterij-terugverdientijd
shipped; Tier-1 #3 (installateur-angle "salderen stopt") + the
`/sectors/energy`/calculator cross-links remain as follow-ups.

### 2026-07-20 (cont'd) — SEO Tier-1 #3 + cluster cross-links

Completes the NL post-salderingsregeling energy cluster: the last
article plus the internal cross-linking that ties the four pieces to
the two highest-intent surfaces.

- **New insight** `salderen-stopt-wat-installateurs-nu-moeten-vertellen`
  in `lib/insights.ts`. `markets: ["nl"]`, tag `Energy`, Dutch body,
  one `cta` → `/tools/energy-roi`. Installer *customer-communication*
  angle — which existing/prospect customers to reach before 2027 and a
  three-sentence honest script — distinct from the other four
  saldering/battery posts (funnel / sales / contract-math / payback).
- **New shared component** `components/EnergyInsightLinks.tsx`. Server
  component, **self-gates to `locale === "nl"`** (returns null otherwise)
  because the cluster is `markets:["nl"]` — mounting it on the
  all-locale sector/tool pages would otherwise emit links that 404 on
  /en,/de,/es. Renders `getAllInsights("nl").filter(tag === "Energy")`
  as a linked "Verder lezen" list. Inline-styled to match the
  surrounding pages (no globals.css churn). Copy hardcoded Dutch since
  it only ever renders on /nl.
- **Cross-links wired**: mounted on `app/[locale]/sectors/[slug]/page.tsx`
  (energy slug only, after the ROI-calculator link) and
  `app/[locale]/tools/energy-roi/page.tsx` (after the calculator, before
  the outro CTA). Internal-link equity now flows from the two
  high-intent energy surfaces into the whole cluster, and both
  directions are covered (articles → calculator via `cta`; calculator +
  sector → articles via the new block).

Cluster complete (5 NL energy posts: whatsapp-funnel is Growth, the
other four are the saldering set) + bidirectional internal links.
Follow-ups exhausted for this cluster; next SEO move would be a new
cluster (DE Heimspeicher / ES autoconsumo) or the orphan sector pages
(real-estate, hospitality) per the earlier audit.

4 files touched (insights data, new component, 2 page mounts) + CLAUDE.md.
Typecheck clean. 418/418 tests pass (crypto flake didn't fire this run).
Build green — 242 static pages, new `/nl` page generates, no route errors.

### 2026-07-20 (cont'd) — SEO: DE Heimspeicher cluster (new market)

Opened a second market cluster after finishing the NL saldering set:
three `markets: ["de"]` energy insights anchored in **German** regulatory
reality, plus the plumbing to cross-link and surface them correctly.

**Key content decision — NOT a translation of the NL cluster.** Germany
has no salderingsregeling. The DE articles are written to the real
German market: sinking Einspeisevergütung (halbjährliche Degression),
§14a EnWG (reduzierte Netzentgelte für steuerbare Verbrauchseinrichtungen),
§41a EnWG dynamic-tariff mandate (2025), Smart-Meter-Rollout, negative
Börsenpreise. Translating the Dutch saldering posts would have been
factually wrong for a German reader.

- **Three new insights** in `lib/insights.ts`, all `markets: ["de"]`,
  tag `Energy`, German bodies (Sie-form, matching existing DE i18n):
  - `heimspeicher-wirtschaftlichkeit-2026` — honest Amortisationsrechnung
    (payback; parallels the NL terugverdientijd piece but framed on the
    Einspeisevergütung↔Strompreis spread, not saldering).
  - `dynamische-stromtarife-wann-lohnt-es-sich` — when a dynamic tariff
    actually pays (§14a/§41a, Smart Meter, battery arbitrage).
  - `sinkende-einspeiseverguetung-was-installateure-sagen-muessen` —
    installer customer-communication angle.
- **No `cta` to `/tools/energy-roi`.** That calculator is explicitly
  Dutch-saldering-modelling — even its German copy says "die
  niederländische Salderingsregeling … 1. Januar 2027". Linking German
  Heimspeicher articles to it would confuse the reader, so the DE
  cluster relies on related-posts + the sector/tool cross-link block
  instead. (A German-market ROI calculator would be its own build.)
- **Generalised `components/EnergyInsightLinks.tsx`** from NL-only to a
  per-locale copy map (`nl` + `de`; en/es → null). Now renders the
  current locale's Energy cluster: NL saldering posts on `/nl`, DE
  Heimspeicher posts on `/de`, on both the energy sector page and the
  ROI calculator page (mounts already pass `locale={l}`, no page edits).
- **Fixed a latent related-posts bug** in
  `app/[locale]/insights/[slug]/page.tsx`: "read next" used
  `getAllInsights()` (all markets), so on non-NL locales it could link
  to NL-only posts that 404. Switched to `getAllInsights(l)` — in-market
  only, and it also applies localized titles. Pure improvement; needed
  so the DE cluster cross-links to its own siblings, not NL 404s.

Auto-wiring: sitemap (per-locale), `/de/insights` listing, and a new
`/de/insights/tag/energy` page all pick the cluster up. Verified all 3
DE slugs land in the generated sitemap under `/de/insights/`.

3 files touched (insights data, generalised component, related-posts
fix) + CLAUDE.md. Typecheck clean. 418/418 tests pass. Build green —
246 static pages (+3 articles +1 new DE energy-tag page), all 3 `/de`
pages generate, no route errors.

Next SEO move: ES autoconsumo cluster (same pattern, Spanish market:
autoconsumo, batería virtual, compensación de excedentes) or the orphan
real-estate/hospitality sector pages.

### 2026-07-20 (cont'd) — SEO: ES autoconsumo cluster (third market)

Third market cluster, completing NL + DE + ES energy coverage. Three
`markets: ["es"]` energy insights anchored in **Spanish** regulatory
reality — again NOT a translation of the NL/DE clusters.

**Market specifics baked in:** Spain has neither salderingsregeling nor
Einspeisevergütung. It has **compensación de excedentes** (RD 244/2019):
surplus is valued and subtracted from the month's término de energía but
**capped at that term — it is NOT balance neto (net metering)**, never
offsets the power term/taxes, and doesn't roll over. Plus **batería
virtual** (a commercial € -credit product, not net metering), **PVPC /
tarifa por horas**, and the retail↔compensation spread (~0.20-0.25 vs
~0.05-0.10 €/kWh, topado). Copy is informal "tú" to match existing ES
i18n voice.

- **Three new insights** in `lib/insights.ts`:
  - `autoconsumo-con-bateria-rentabilidad-2026` — honest payback (parallels
    the DE Heimspeicher / NL terugverdientijd piece, framed on the capped
    compensación, not saldering/Einspeisevergütung).
  - `compensacion-de-excedentes-no-es-balance-neto` — the distinctly-Spanish
    misconception correction + sizing implications + where batería virtual
    fits. High-intent, corrects a real and costly error.
  - `autoconsumo-lo-que-los-instaladores-deben-explicar` — installer
    customer-communication angle.
- **No `cta` to `/tools/energy-roi`** — same reasoning as the DE cluster;
  the calculator models Dutch saldering, wrong for a Spanish reader.
- **Added `es` to the `EnergyInsightLinks` COPY map** (nl + de + es now;
  en → null). The ES cluster now surfaces on `/es/sectors/energy` and
  `/es/tools/energy-roi` via the existing `locale={l}` mounts — no page
  edits. Related-posts already market-aware (`getAllInsights(l)`, shipped
  in the DE PR), so the ES articles cross-link to their own siblings.

Auto-wiring verified: all 3 ES slugs land in the generated sitemap under
`/es/insights/`; new `/es/insights/tag/energy` page generates.

2 files touched (insights data, component copy-map entry) + CLAUDE.md.
Typecheck clean. 418/418 tests pass. Build green — 250 static pages
(+3 articles +1 new ES energy-tag page), no route errors.

Energy content now spans all three EU markets: NL (saldering, 5 posts),
DE (Einspeisevergütung/Heimspeicher, 3), ES (autoconsumo, 3). Next:
orphan real-estate/hospitality sector pages, or per-market ROI
calculators (the current one is Dutch-saldering-only).

### 2026-07-20 (cont'd) — SEO: feed the orphan real-estate + hospitality sectors

The `real-estate` and `hospitality` sector pages existed but had zero
supporting insight articles — topical dead-ends with no cluster. Unlike
the energy clusters, these topics aren't tied to one country's
regulation, so they're **all-market operator articles** (EN base + de/es
i18n, NL falls back to EN base — matching the existing all-market
operator-article convention).

- **Two new insights** in `lib/insights.ts`, no `markets` field (all
  four locales), full en/de/es i18n:
  - `the-esg-number-your-asset-manager-cant-defend` — tag **"Real
    estate"**. Real-estate ESG reporting is assembled once a year from
    inconsistent per-property-manager data and can't survive investor
    due diligence; make it reproducible from the meter. (Draws on the
    sector page's own "ESG as a scramble" / "portfolio blindness" leaks.)
  - `the-ten-minutes-before-check-in` — tag **"Hospitality"**. The
    highest-margin moment (pre-check-in upsell / room assignment / rate)
    is decided on gut feel with no instrument; build the instrument, not
    another dashboard.
- **New component `components/SectorInsightLinks.tsx`** — general
  "Further reading" block for a sector page. Maps sectorSlug → insight
  tag (`real-estate`→"Real estate", `hospitality`→"Hospitality"),
  renders `getAllInsights(locale).filter(tag)` with a 4-locale heading,
  self-gates to null when a sector has no matching in-market posts (e.g.
  `adjacent`). Mounted on the sector page for every sector; only the two
  fed sectors render anything today. Energy keeps its own
  `EnergyInsightLinks` (market-scoped, topic-specific copy) — this
  component handles the all-market operator sectors.
- Tag pages (`/insights/tag/real-estate`, `/insights/tag/hospitality`)
  auto-generate per locale from the new tags; venture cross-link is
  undefined for these tags (no card, graceful).

Verified: all 2 articles + 2 tag pages generate in **all four locales**
and land in the sitemap. Typecheck clean. 418/418 tests. Build green —
266 static pages (+16: 2 articles ×4 + 2 tag pages ×4).

3 files touched (insights data, new component, sector-page mount) +
CLAUDE.md. Follow-ups: a 2nd article per sector would deepen each
cluster; per-market ROI calculators remain the bigger energy-funnel play.

### 2026-07-20 (cont'd) — real-estate + hospitality round 2 (clusters, not orphans)

Second article for each sector, turning the two single-article sectors
into real 2-article clusters. Content-only — rides on the
`SectorInsightLinks` infra + tags from the previous PR (no component or
page changes; both blocks auto-append the new posts by tag).

- **`the-retrofit-roi-model-that-doesnt-survive-the-building`** — tag
  "Real estate". Retrofit (insulation/heat-pump/solar) payback models
  built on regional averages break against the specific asset; model
  from the meter. Distinct from the ESG-due-diligence piece.
- **`what-your-channel-mix-hides-about-your-best-guests`** — tag
  "Hospitality". OTA-vs-direct true contribution (net of commission,
  cancellation, ancillary, repeat) lives across five dashboards that
  never reconcile; price the channel by contribution, not rate. Distinct
  from the check-in-margin piece.
- Both all-market (EN base + de/es i18n), same convention as round 1.

**Calculator decision (deferred, needs a steer):** considered building
per-market ROI calculators (the DE/ES energy clusters have no tool to
funnel into) but the existing `EnergyRoi` is a Dutch-saldering *model*
(its reference scenario values every kWh at retail = "what you lose when
saldering ends"). DE/ES never had net metering, so an honest calculator
there needs a *different scenario model* (self-consumption vs feed-in),
plus route-structure + default-value decisions. That's an
architecturally significant modeling call — left for an explicit steer
rather than guessed at. Flagged as the next big energy-funnel play.

1 file touched (insights data) + CLAUDE.md. Typecheck clean. 418/418
tests. Build green — 274 static pages (+8: 2 articles ×4 locales),
both land in the sitemap across all four locales.

Sector clusters now: real-estate (2), hospitality (2), each surfaced via
SectorInsightLinks + tag pages.

### 2026-07-20 — end-of-day handoff / queued for next session

Big content day: 7 PRs merged (#82–#88), 15 fresh insights across NL/DE/ES
+ EN, restarting a ~3-month-stale blog. State on `main` @ `e9a61f2`,
working tree clean, all preview builds green.

**Content footprint now:**
- Energy: NL saldering (5), DE Heimspeicher (3), ES autoconsumo (3) — each
  market-authentic (not translated), cross-linked, surfaced on its
  sector + calculator pages via `EnergyInsightLinks` (per-locale copy map).
- Operator sectors: real-estate (2), hospitality (2) — all-market
  (EN+de+es i18n), surfaced via `SectorInsightLinks` (tag-driven) + tag
  pages.
- Infra shipped: `cta` InsightBlock type, related-posts market-fix
  (`getAllInsights(l)`), two cross-link components.

**Queued for next session (in priority order):**
1. **Per-market ROI calculators — NEEDS A PRODUCT STEER, don't build blind.**
   The current `EnergyRoi` is a Dutch-*saldering model* (reference scenario
   values every kWh at retail = "what you lose when net-metering ends"),
   which is why NL articles funnel into it and DE/ES can't. DE/ES never had
   net metering → they need a *different scenario model* (self-consumption
   vs feed-in: DE Einspeisevergütung, ES capped compensación). Open
   question for the operator: **one calculator that adapts per locale, or
   separate tools** (`/tools/heimspeicher-rechner`, `/tools/autoconsumo`)?
   Highest-leverage remaining energy-funnel move once decided.
2. **Ahrefs — see MANUAL_TASKS.md** (added this session): free DR key
   migration by **2026-08-01** (hard deadline), and the plan gates GSC +
   keyword data so the pulse's Part C can't run. Decide: upgrade plan or
   wire GSC directly.

   > ⚠️ **Achterhaald. Beslist op 2026-08-03, afgesloten op 2026-08-11:
   > Ahrefs gaat eruit, DataForSEO komt ervoor in de plaats.** Vraag geen
   > Ahrefs-sleutel meer aan. Sinds 2026-08-19 loopt de MCP-kant via OpenSEO
   > (MIT, zelf te hosten), dat op dezelfde DataForSEO-data draait en
   > Search Console meebrengt — zie route 3 in MANUAL_TASKS.md.
3. Optional content: a 3rd article to deepen any sector; or a 4th EU market
   only if there's a real regulatory hook (there isn't an obvious one).

**Daily-pulse notes for tomorrow's run:** Supabase MCP works (leads query
is reliable). Site-health curl/WebFetch from the headless env is blocked
by Cloudflare — the UptimeRobot task in MANUAL_TASKS.md is the fix; until
it's set up, report the health checks as "can't verify from headless env,"
not as failures. Ahrefs Part C = "plan insufficient / GSC not wired."

> ⚠️ **Deel C draait pas als DataForSEO-inloggegevens gezet zijn.** De
> Ahrefs-MCP antwoordt inmiddels op élke aanroep met "Insufficient plan";
> behandel dat niet als een meting maar als een losgekoppeld instrument.
> `npm run seo:report:dry` laat gratis zien wat een rapport zou opvragen.

### 2026-07-21 — AI contact attributes: web enrichment + compliance correction

Started as "build the AI Attributes feature" from the stale pending
list above. **It was already shipped in PR #9.** Verified before
writing code; the pending list is now annotated so this stops
happening. Real work became the one genuine gap (optional website
enrichment) plus two compliance defects found on the way.

**Feature — optional company-homepage enrichment (off by default)**
- `lib/philly/ai/company-domain.ts` (NEW) — pure derivation of a
  company URL from an email address. Refuses consumer mailboxes
  (~45 domains incl. NL/BE/DE/ES ISPs), disposable/relay domains,
  and bare public suffixes; strips subdomains and paths so only a
  bare `https://<registrable-domain>` can ever be produced. This is
  the gate that decides whether third-party data is fetched at all,
  so it carries the heaviest test coverage.
- `lib/philly/ai/scrape-contact-site.ts` (NEW) — Firecrawl v1 client.
  Single homepage, `onlyMainContent`, 8k-char cap, 8s abort (inside
  the 15s AI_ACTION SLO). Never throws; every failure returns a typed
  `reason` and the caller falls back to CRM-only.
- `contact-attributes.ts` — `GenerateInput` gains `websiteContent` /
  `websiteUrl`; `runAndPersistContactAttributes` gains
  `enrichFromWeb?: boolean`. Scrape is best-effort and non-fatal.
- **Prompt-injection hardening.** Scraped pages are third-party
  controlled, so this is a real vector, not a theoretical one.
  Defence in depth: untrusted-content fences + a system-prompt clause
  telling the model to ignore embedded directives (and to treat one
  as evidence the source is untrustworthy); forged fence markers
  stripped from the body before wrapping; Zod schema caps what any
  successful injection could emit; 8k truncation. `systemPrompt` and
  `userPrompt` exported specifically so these assertions are direct.
- Schema: `Contact.aiAttributesSources` (`"crm"` | `"crm+web:<host>"`).
  Migration pending operator-side (`ai_attributes_sources`).
- UI: `AiAttributesCard` shows "From CRM data only" / "From CRM data
  + acmesolar.nl" next to the timestamp.

**Compliance — two defects found, neither introduced by this work**
1. **The DPIA lived only in the `deus-shared-port` worktree**, never
   in the source-of-truth repo. Copied to `docs/legal/` and revised:
   new §1.2a (external source + enforced-constraint table mapping
   each promise to the code that keeps it), reworked §2.2 LIA and
   §2.3 minimisation to distinguish the default config from the
   enriched one, new risks 9-11 (prompt injection, sub-processor
   exposure, sole-trader conflation), §5 now records that **§1.2a is
   not signed off** and web enrichment must not be enabled until a
   DPO reviews it, plus a new §6 open-items list.
2. **`_drafts/legal/subprocessors-en.md` was factually wrong.** It
   stated DEUS uses no third-party AI APIs and transfers no data
   outside the EEA, while the code has called Anthropic's hosted API
   since PR #9 — and the DPIA's own risk 5 assumes an Anthropic DPA.
   That document is destined for `/legal/subprocessors`, so publishing
   it would have been a false statement to customers. Added a
   DO-NOT-PUBLISH banner explaining the discrepancy, corrected rows
   with `[VERIFY]` markers for entity/region/DPA (not invented), and
   a conditional-sub-processor table for Firecrawl.

**Deliberately NOT done**: enabling `FIRECRAWL_API_KEY` anywhere.
The feature is dark until legal sign-off — see MANUAL_TASKS.md.

483/483 tests green (65 new), typecheck clean. ~~Note `npm test`
without exclusions also picks up `diaz-editor-gtm/` and other
untracked scratch dirs' node_modules and reports 3 spurious file
failures; the real suite is clean.~~

> ⚠️ **Opgelost aan de bron op 2026-08-19 (PR #176).** `vitest.config.ts`
> sloot uit met `node_modules/**`, en die glob is aan de wortel verankerd —
> vandaar dat een scratch-map met eigen dependencies meeliep. Nu
> `**/node_modules/**`. **Het was niet alleen ruis:** zod's hele suite telde
> mee als de onze, dus elk testaantal in dit logboek vanaf ongeveer dit punt
> is te hoog. Gemeten na de fix: 23 bestanden, 708 tests, nul rood.

### 2026-08-03 — SEO fase 1 + zichtbare UI-fouten + de crypto-"flake" was geen flake

**PR #108 (gemerged).** Metadata per taal op alle publieke pagina's. Op
productie serveerden ~127 van de 136 niet-Engelse URL's een Engelse `<title>`
en `<meta description>` achter een vertaalde pagina. Nieuw: `metadata-locales.test.ts`
(roept `generateMetadata` rechtstreeks aan, draait mee in de test-job),
`TITLE_SUFFIX` + `TITLE_BUDGET` in `lib/seo/branding.ts`, en `meta.<route>.{title,description}`
in `dict.ts` voor 14 paginatypes × 4 talen. Het achtervoegsel ging van
" · Juan Diaz, LLC" (17 tekens) naar " · Juan Diaz" (12) — met 43 tekens over
paste geen Duitse of Spaanse titel binnen de 60 die Google toont.

**Twee zichtbare fouten, alle vier de talen.** `overflow-x: hidden` op
html/body maakte van body een scroll-container, waardoor `position: sticky`
nergens meer werkte: `.chapters` reserveerde 3200px voor een paneel dat
wegscrolde, dus 1600px zwart scherm. Nu `overflow-x: clip` — knipt net zo
goed, maakt géén scroll-container. **Zet dit nooit terug op `hidden`.**
Daarnaast rende `fomo.proof.title` (bevat `<em>`) via `{t(...)}`, dus stond
de tag als tekst op de homepage.

**Fase 2, responsive.** `nav.top` is een flexbox waarin `.nav-right` niet
krimpt; tussen 861 en 1024px werd het logo platgedrukt en wikkelde
"Juan Diaz, LLC" naar 2 regels (EN) of 3 (DE). Opgelost met compactere nav in
die band plus `flex: 0 0 auto; white-space: nowrap` op `.brand`. Ook 18 links
onder de 24px van WCAG 2.2 SC 2.5.8 opgehoogd (footer, sociale links,
taalschakelaar) — die vielen buiten de bestaande `pointer: coarse`-regel.

> ⚠️ **Onder 860px is er geen hamburgermenu.** Zes pagina's (about, story,
> services, sectors, insights, signals) zijn dan alleen via de footer
> bereikbaar. Bestaand gat, niet in deze sessie opgelost — dat is een
> ontwerpkeuze. Verberg dus geen navlinks verder als oplossing voor krapte.
>
> **Achterhaald op 2026-08-05 door PR #126.** Onder 860px verdwijnt nu de hele
> balk en toont een hamburgerknop alle negen links; `.hide-mobile` en
> `.hide-tiny` bestaan niet meer. De instructie hierboven is daarmee omgekeerd
> geldig geworden: navlinks verbergen mág onder 860px, juist omdat er een
> paneel achter zit.
>
> Wat wél blijft gelden: verberg nooit een navlink zonder plek waar hij
> terugkomt. `NAV_LINKS` in `components/Nav.tsx` is de enige lijst en voedt
> zowel de balk als het paneel, zodat die twee niet uiteen kunnen lopen — de
> dubbele lijst in de markup was precies hoe dit gat ontstond.

**De crypto-"flake" bestond niet.** Bovenstaande logs noemen een
"pre-existing flake in crypto.test.ts" die "green in isolation" zou zijn.
Dat klopt niet: hij faalde óók in isolatie, ongeveer één op de vier runs. De
test manipuleerde het láátste base64-teken ('A'↔'B'), en dat verschilt alleen
in opvulbits — de gedecodeerde bytes waren dan identiek, er was niets
gemanipuleerd, en decryptie hoorde gewoon te slagen. De code was in orde, de
test niet. Nu wordt een echte byte omgeklapt; 6 van de 6 runs groen.

**Meetmethode die zich terugbetaalde.** Een scriptje dat alle 176
sitemap-URL's ophaalt uit de draaiende productiebuild en controleert op
zichtbare HTML-tags, lege titels/beschrijvingen, placeholders en
hreflang-dekking. Drie keer voorkwam het een verkeerde conclusie: een
statische codescan meldde 11 mogelijke `<em>`-lekken waarvan er 10 vals waren,
de preloader leek schuldig maar is `opacity: 0`, en een "horizontale
scrollbalk" op 768px bleek de statusbalk. **Alleen wat de geserveerde HTML en
de gerenderde layout laten zien telt.**

### 2026-08-03 (vervolg) — de contentlaag viertalig, en zes gates die het zo houden

Tien PR's (#115 t/m #124). De aanleiding was PR #108 van eerder die dag, die
de metadata per taal repareerde. Bij het nameten bleek dat een symptoom van
iets groters.

**De vondst.** De navigatie was vertaald, de inhoud niet. De vier
sectorpagina's, vijf ventures, drie signals-essays en negen artikelen
serveerden onder `/nl`, `/de` en `/es` dezelfde Engelse tekst als onder
`/en` — terwijl die 85 URL's in de sitemap staan en via hreflang naar elkaar
wijzen. De negen operator-artikelen hadden al Duits en Spaans; Nederlands
ontbrak, dus de thuismarkt was de enige taal die terugviel op Engels.

**Het patroon dat nu overal geldt.** `Sector`, `Venture` en `Signal` hebben
een `i18n`-veld met per taal een `…L10n`, gespiegeld naar wat `Insight` al
deed. Die typen dragen bewust alleen kopij: `slug`, `gradient`, `proof[].href`,
`phases[].title`, het bloktype van een signal en `Signal.tag` staan er niet
in, want dat is structuur of een routeersleutel. `lib/i18n/merge.ts` bevat
`defined()` en `mergeByIndex()`; die laatste houdt de basislengte aan.

**Zes gates, elk bewezen door hem opzettelijk te breken:**

| gate | bewaakt |
|---|---|
| `sectors.test.ts` · `ventures.test.ts` · `signals.test.ts` | vier talen af, titels verschillen, binnen `TITLE_BUDGET`, lijstlengtes gelijk |
| `insights.i18n.test.ts` | blokstructuur van vertalingen (Insight vervangt de body in zijn geheel, dus geen merge bewaakt hem) |
| `insights.seo.test.ts` | zoektitel en -beschrijving per markt binnen wat Google toont |
| `lib/i18n/link-conventie.test.ts` | marketingcode importeert `next/link` niet rechtstreeks |
| `lib/i18n/tags.test.ts` | elke tag in gebruik heeft een label in vier woordenboeken |
| `scripts/seo-audit.ts` | dubbele/te lange titels en beschrijvingen, h1's, taalloze links — draait tegen een server |

**Auditstand:** dubbele-titel 26→0, dubbele-description 26→0, meerdere-h1
4→0, link-zonder-taal 176→0, titel-te-lang 42→0, description-te-lang 54→0.
De lengtecontroles zijn in #122 aan de audit toegevoegd; daarvóór was dat
probleem onzichtbaar.

**Drie regels die deze sessie hard heeft gemaakt.**

1. *Assert niet door het vangnet.* Drie keer bleek een test van mijzelf niet
   te kúnnen falen. `mergeByIndex` vult korte vertalingen aan vanuit de
   basis, dus een lengtecontrole op de uitvoer slaagt altijd — assert op
   `post.i18n[taal]`. `translate()` valt terug op Engels, dus een
   sleutelcontrole via die functie ziet een ontbrekend Duits label niet —
   assert op `DICT[l]`.
2. *Hermeet de hele lijst, niet je doelcijfer.* Bij het inkorten van
   beschrijvingen zette ik Nederlandse tekst in het Engelse vak:
   `description-te-lang` naar 0, `dubbele-description` van 0 naar 1.
3. *Plaatsaanduidingen en verbuigende talen botsen.* `Einblicke zu {tag}`
   levert met `tag=Systeme` de verkeerde naamval op, terwijl hetzelfde label
   in de h1 correct staat. Eén label, twee naamvallen — de oplossing is een
   sjabloon waarin de tag géén naamval draagt: `{tag} — Einblicke für
   Betreiber`.

**Meetopstelling.** Alles gemeten op `next start` (poort 3200) ná herstart,
want een draaiende server blijft de vorige build serveren. Let op: de lokale
build heeft `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, dus een crawl op
3200 meldt 176× `canonical-wijkt-af`. Dat is een meetartefact, geen defect —
productie geeft `https://juandiazllc.com/nl`.

**Blijft staan.** Geen hamburgermenu onder 860px (bestaand, ontwerpkeuze).
Operator-acties: DNS TXT voor Search Console, Plausible-goal `Boeking 15min`,
branch protection op main met de vier CI-jobs.

> **Bijgewerkt 2026-08-05.** Het hamburgermenu is er (PR #126). De
> operator-acties staan nog open, maar twee tellingen klopten niet: het zijn
> vier Plausible-doelen — `Boeking 15min`, `Pricing CTA`, `Sector CTA` en
> `Tool CTA`, alle vier al getagd in de code — en vijf CI-jobs sinds `audit`
> erbij kwam (PR #127). Daar hoort ook de gratis Ahrefs-sleutel bij, met een
> harde deadline op 2026-08-10.

> **Bijgewerkt 2026-08-19 — branch protection staat aan, deze actie is klaar.**
> Op `main`: force-push en verwijderen geblokkeerd, PR verplicht met nul
> goedkeuringen (solo-repo, je kunt je eigen PR niet goedkeuren), en vijf
> verplichte checks — `typecheck`, `test`, `i18n`, `audit`, `deps`. Admins zijn
> niet gebonden; dat is het ontsnappingsluik als een check buiten je schuld
> breekt. "Branch up-to-date vereist" staat uit, anders moet je voor elke merge
> eerst rebasen.
>
> **Twee checks zijn bewust níet verplicht.** `audit-productie` staat wel op
> elke PR maar wordt altijd overgeslagen, en een check die nooit rapporteert
> laat een PR eeuwig op "expected" staan in plaats van rood te worden. `Vercel`
> ook niet: die deploy gaat pas ná de merge naar productie, dus een hapering
> daar zou je merge blokkeren zonder dat er iets mis is. De vijf namen komen
> uit drie werkelijk gedraaide PR's, niet uit de workflow-bestanden — en geen
> van de vijf workflows heeft een `paths`-filter, dus ze draaien ook op een
> PR die alleen een `.md` aanraakt.
>
> Tegelijk staat `delete_branch_on_merge` aan en zijn 88 gemergede takken
> opgeruimd (130 → 38). Wat blijft staan is werk achter een gesloten,
> nooit-gemergede PR.
>
> **Nog wél open van de operator-acties hierboven:** DNS TXT voor Search
> Console en de vier Plausible-doelen.

> De dekkingsnotitie bovenaan dit bestand ("~1% file coverage", april 2026)
> gaat over `lib/philly/*` en klopt daar nog grotendeels. De marketingkant
> staat inmiddels op ~~989 tests~~; verwar die twee niet.
>
> ⚠️ **Dat getal was opgeblazen** door de vitest-exclude hierboven (PR #176).
> Gemeten op main na de fix, 2026-08-19: **708 tests in 23 bestanden**. Het
> verschil is zod, niet ons werk.

### 2026-08-19 — /services, 88 takken opgeruimd, en drie poorten die niet deden wat ze beloofden

Vier PR's (#182 t/m #184 plus repo-instellingen). De rode draad was het hermeten: elke poort die deze sessie is aangeraakt bleek iets
anders te bewaken dan er op stond.

#### PR #182 — het aanbod stond dichtgeklapt onder de knop

`/services` beschreef vier diensten en beantwoordde geen koopvraag. Het antwoord
stónd er al, in de FAQ ónder de CTA: gratis blueprint-gesprek, diagnose van één
pagina, sprint tegen vaste prijs, scope pas daarna. Wie dat las boekte; wie het
niet zag, boekte niet.

Nu staat het symptoom vóór de dienstnaam (in de woorden van de bezoeker) en de
drietrapsladder vóór de CTA. 13 nieuwe sleutels × 4 talen = 52 dict-entries,
per taal afgeleid uit de bestaande native FAQ in `lib/seo/faqs.ts`. **Geen
bedrag** — `docs/claims.md` heeft er geen voor dit traject, en dat is de enige
bron.

Verder in dezelfde PR: de SEO-instrumenten wezen nog naar de Ahrefs-MCP, die op
elke aanroep "Insufficient plan" antwoordt. Route 3 in `MANUAL_TASKS.md` wijst
nu naar OpenSEO (MIT, zelf te hosten, draait op dezelfde DataForSEO-data en
brengt Search Console mee).

#### De metadatapoort viel om op zijn eigen importkosten

Met een koude vite-cache viel `/ — titel en beschrijving verschillen per taal`
om op `Test timed out in 5000ms`. Warm en in CI liep dezelfde test in
milliseconden. Er was niets mis met de metadata: de test mat zijn eigen
opstartkosten. Elke route wordt door drie `describe`-blokken gebruikt, twaalf
dynamische imports per route, dus de assertie die toevallig eerst draaide
betaalde de volledige transformkosten van dat paginamoduul — de homepage sleept
de Globe met d3-geo en topojson mee.

`testTimeout` verhogen zou het rood hebben weggenomen zonder de oorzaak, en
daarna ook een échte vertraging verbergen. De routemodules worden nu eenmalig
parallel ingeladen in een `beforeAll`. **In twee richtingen bewezen:** met
`meta.services.title` in `nl` opzettelijk gelijkgetrokken aan `en` faalt de
poort binnen 5 ms met een `AssertionError`, niet met een time-out.

#### Takken: 130 → 38

`delete_branch_on_merge` stond uit, dus elke gemergede PR liet zijn tak staan.
Nu aan, en 88 takken opgeruimd. Elke tak moest twee onafhankelijke bewijzen
leveren: er zit een gemergede PR achter, én main draagt de inhoud aantoonbaar
al. Waar die twee elkaar tegenspraken is niets verwijderd tot duidelijk was
waarom.

**Dat gebeurde twaalf keer, en mijn meetlat had ongelijk.** De cherry-test
(die squash-merges wél aankan) merkte ze aan als "inhoud niet in main". Tien
ervan waren juist het eenvoudigste geval: gewone voorouders van main via een
merge-commit. Bij zo'n tak ís de merge-base de tak zelf, dus de synthetische
commit heeft een lege diff — en een lege patch-id matcht nergens op. **Test
eerst afstamming, pas daarna patch-gelijkheid.**

Wat blijft staan is werk achter een gesloten, nooit-gemergede PR (31 takken),
vier takken zonder PR, `philly-mariadb-port`, en
`claude/analyze-test-coverage-WBVSQ` — die PR is gemerged maar de tak liep
daarna nog 32 commits door.

#### De deny-lijst matchte op tokengrens, en dat gold voor het hele cluster

`.claude/settings.local.json` had een deny op `Bash(git push --delete:*)`. Die
blokkeerde `git push --delete X` maar niet `git push origin --delete X`: het
woord `origin` breekt het voorvoegsel. Alle 88 verwijderingen zijn er langs
gegaan. Wat halverwege alsnog ingreep was de auto-mode-classifier, een andere
laag — verwar die twee niet.

De drie buren in datzelfde cluster hadden **exact dezelfde lek**, en twee vormen
waren nooit gedekt:

| kwam door | reden |
|---|---|
| `git push origin --force main` | `origin` breekt het voorvoegsel |
| `git push origin -f main` | idem |
| `git push origin --mirror` | idem |
| `git push --force-with-lease …` | eigen vlag, stond er niet in |
| `git push deus-shared --force` | tweede remote, kwam in geen enkele regel voor |

Alles gedicht behalve `git push origin +main:main`: force-pushen via refspec
zonder vlag, en een voorvoegselregel kan een refspec niet lezen. **Repareer je
één regel in een cluster, test dan de buren** — ze zijn met hetzelfde verkeerde
model geschreven.

#### PR #183 — branch protection op main

Dat laatste gat hoort aan de GitHub-kant dicht, niet in de permissielijst.

| regel | stand |
|---|---|
| force-push / verwijderen van `main` | geblokkeerd |
| PR verplicht | ja, 0 goedkeuringen (solo-repo) |
| verplichte checks | `typecheck`, `test`, `i18n`, `audit`, `deps`, `docs-sync` |
| branch up-to-date vereist | nee |
| admins gebonden | nee (ontsnappingsluik) |

**Twee checks bewust niet verplicht.** `audit-productie` staat op elke PR maar
wordt altijd overgeslagen; zo'n check rapporteert nooit en laat de PR op
"expected" hangen in plaats van rood te worden. `Vercel` deployt pas ná de
merge, dus een hapering daar zou merges blokkeren zonder defect.

De namen komen uit drie werkelijk gedraaide PR's, niet uit de workflow-bestanden.
Gecontroleerd op de val die dit gevaarlijk maakt: geen van de vijf workflows
heeft een `paths`-filter, dus ze draaien ook op een PR die alleen een `.md`
aanraakt. PR #183 was daar zelf het bewijs van.

#### PR #184 — AGENTS.md stond buiten git en beschreef verwijderde code

Het bestand was een afsplitsing van dit bestand van vóór 11 augustus. Het opende
met "Next.js 16 + Prisma 7 + Supabase marketing site + Philly CRM app" en
documenteerde de SLO-sectie (`lib/philly/observability.ts`, `withSpan`, drie
budgetten) als actueel. Beide zijn met #134-#140 verwijderd. 144 regels verschil,
en precies die 144 waren de verkeerde.

Untracked zijn was de oorzaak: het kwam in geen diff, geen review, geen CI. Omdat verschillende harnassen verschillende bestanden lezen, kreeg een
deel van de tooling maandenlang projectkennis over code die hier niet staat.

`AGENTS.md` is nu een byte-identieke kopie, bewaakt door de `docs-sync`-job in
`ci.yml` (sinds deze sessie een verplichte check). **Wijzig je er één, kopieer
hem dan over de ander heen: `cp CLAUDE.md AGENTS.md`.**

#### Meting

726 tests in 25 bestanden, groen op main na #184. Dat vervangt de 708/23
hierboven.

#### Wacht op de operator

> **Achterhaald.** Samengevoegd in "Wacht op de operator" bovenaan dit
> bestand (2026-08-24). Schrijf aanvullingen daar, niet hier.

- **Plausible-cijfer**: bezoekers over 30 dagen plus de vier doelen. Zonder dat
  blijft "0 leads in `marketing.leads`" onbeslist tussen geen-verkeer en
  geen-conversie.
- **Akkoord voor één end-to-end test van de leadketen**: één rij in
  `marketing.leads`, Telegram + ontvangstbevestiging, daarna de rij weg. De
  keten is nog nooit in zijn geheel gelopen.
- **Vier OpenSEO-taken** in `MANUAL_TASKS.md`: DataForSEO-inloggegevens (open
  sinds 2026-08-03), self-host vs gehost kiezen, Search Console via DNS TXT
  verifiëren, Ahrefs-MCP loskoppelen.
- **DNS TXT voor Search Console** en de vier Plausible-doelen taggen.

### 2026-08-20 — een adres dat niet bestond, 56 dode sleutels, en een poort die op één platform niet kon meten

Vier PR's (#188 t/m #191). Wat ze bindt: elke controle die deze dag is aangeraakt
mat iets anders dan er op stond.

#### PR #188 — Philly droeg een adres dat niet bestaat

`philly.juandiazllc.com` stond als `domain` in `lib/ventures.ts` en werd op drie
plekken gerenderd. Die hostnaam staat niet in DNS, en niets in deze repo bedient
hem — het CRM leeft sinds #134 in `bongartzdiaz/DEUS-SHARED`. Tegelijk beweerde
`work.page.lede` in vier talen dat er vijf producten live staan. Vier staan er
live; Philly wordt gebouwd.

`domain` en `external` zijn nu nullable, en `lib/ventures.test.ts` draagt een
poort die het telwoord in de lede vergelijkt met `VENTURES.filter(status ===
"live").length`.

**Die poort moest twee keer geschreven worden.** De eerste versie zocht het
telwoord in de hele lede. Elke lede eindigt op de vijf-fase-methode, dus het
woord "vijf" staat er altijd in en de assertie kon niet falen bij vijf live
ventures. Nu leest hij alleen de eerste zin, en eist bovendien dat er géén ander
telwoord in die zin staat. **Scope een assertie op de zin die de claim draagt.**

Bereikbaarheid wordt DNS-first gecontroleerd (`lib/seo/venture-adressen.ts`),
alleen in de productie-audit. Op productie geverifieerd: hostnaam 0×, de valse
claim 0×, `href="#"` 0×.

#### PR #189 + #190 — 56 sleutels vertaalden kopij die niemand rendert

Negentien `dash.*` beschreven `/dashboard` (weg met #134), twintig `app.*` de
operator-hub, vier `cookie.*` een banner die verdween toen Plausible cookieloos
werd, zes `contact.*` het formulier van vóór de meerstapsversie, en `nav.login`
een inlog die met #138 vertrok. Dood gewicht in een woordenboek is niet neutraal:
`cookie.body` beloofde in vier talen "a session cookie for sign-in" voor een
sessie die niet meer bestaat, en `dash.footer` noemde het subdomein hierboven.

`lib/i18n/wees-sleutels.test.ts` houdt dat voortaan tegen. Hij scant `app`,
`components`, `lib` en `scripts` op letterlijke aanroepen én op samengestelde
(`t(\`process.${i}.name\`)` → `/^process\.[^.]+\.name$/`); deze repo heeft 49 van
de tweede soort.

**Drie keer bleek de meetlat zelf stuk, en telkens werd dat zichtbaar door twee
tellers naast elkaar te leggen.**

| symptoom | oorzaak |
|---|---|
| poort verklaarde `nav.login` levend | haar eigen toelichting noemde de sleutel; testbestanden telden mee als afnemer |
| 709 sleutels tegen 714 | `[a-zA-Z0-9._]` zat in de extractie én in de scan naar afnemers — het ontbrekende koppelteken hief zichzelf op |
| 677 sleutels tegen 692 | `check-i18n-parity.mjs` las één sleutel per regel; de procesfases staan met vier op één regel |

Die laatste betekent dat een ontbrekende Duitse `process.3.body` jarenlang
onzichtbaar was voor de controle die daarvoor bestaat. Gefixt; het script leest
nu ook sleutels achter een komma.

**Een testbestand is geen afnemer.** Een sleutel die alleen nog in een test
voorkomt rendert nergens. En een controle die zichzelf als bewijs accepteert is
geen controle.

#### PR #191 — de prijspoort kon op Windows niet groen worden

`npm run regen:pricing:check` stond permanent rood op deze machine. Er liep
niets uit de pas: de generator schreef zijn blokken met LF terwijl de
doelbestanden CRLF dragen (`.gitattributes` heeft `* text=auto`,
`core.autocrlf=true`), dus elke vergelijking meldde verschil. Draaide je de
generator "om het te repareren", dan kreeg je gemengde regeleinden die git bij de
volgende vergelijking weer gelijktrok.

Gemeten met de oude versie uit `HEAD` naast de nieuwe: CRLF-checkout oud rood /
nieuw groen, LF-checkout oud groen / nieuw groen. Windows-specifiek dus — op een
runner was de oude check ook groen geweest.

**Het werkelijke gat was dat hij nergens draaide.** Geen van de vijf workflows
riep hem aan. De check hangt nu aan de bestaande `docs-sync`-job, die al in de
branch-protection-lijst staat; een nieuwe job zou daar eerst met de hand bij
moeten en tot dat moment niets bewaken. Wijzigt iemand een bedrag in de
gegenereerde TS in plaats van in de CSV, dan is de CSV geen bron meer — en
`docs/claims.md` verwijst naar prijzen die dan nergens één herkomst hebben.

**Een instrument dat op één platform altijd rood staat, wordt daar niet
gedraaid.** Het gat en de kapotte meter hielden elkaar in stand.

#### De vier OpenSEO-taken nagetrokken

Van de vier taken in `MANUAL_TASKS.md` bleek er één al gedaan en stonden er twee
verkeerd beschreven.

**Search Console — het TXT-record staat er al.** Gemeten via `dns.google`:
`google-site-verification=ABrD7ZNd...` naast de SPF-regel. Wat daarmee níet
vaststaat is of de property in Search Console ook als geverifieerd staat; dat is
alleen ingelogd te zien. `nslookup -type=TXT` gaf hier stil niets terug en had de
conclusie "geen record" opgeleverd — het derde instrument deze dag dat faalde
zonder te klagen.

**Ahrefs staat op `✓ Connected` en is dood.** De gezondheidscontrole van
`claude mcp list` test de verbinding, niet de toegang. Gemeten op
`subscription-info-limits-and-usage`, een endpoint dat volgens zijn eigen
beschrijving gratis is en geen units verbruikt: `{"error": "Insufficient plan"}`.
Het is bovendien een claude.ai-connector, geen lokale MCP — `claude mcp remove`
raakt hem niet, loskoppelen gaat via de connector-instellingen op claude.ai.

**Self-host vs gehost: gehost, tenzij het volume groeit.** De 28%-opslag klopt
woordelijk. Twee dingen die het document niet noemde en de keuze bepalen:
self-host als MCP-endpoint is nergens gedocumenteerd (`openseo.so/docs/mcp` kent
alleen de gehoste URL), en Search Console vergt bij self-host een eigen
Google-OAuth-app met drie extra variabelen. Bij vier verzoeken per rapportrun is
28% een rondingsverschil; bij honderden per dag keert die rekensom om.

**`.env.example` noemde `DATAFORSEO_LOGIN` en `DATAFORSEO_PASSWORD` niet**,
terwijl `lib/seo/dataforseo.ts` en `scripts/seo-report.ts` ze allebei lezen. Staat
er nu in, met de waarschuwing dat OpenSEO dezelfde inloggegevens in een ándere
vorm wil (`DATAFORSEO_API_KEY`, base64 van `email:wachtwoord`).

#### De vier Plausible-doelen: de code is af, het dashboard niet

Het logboek zei dat de vier doelen "alle vier al getagd in de code" waren. Dat
klopt, en het is nu ook end-to-end op **productie** nagelopen in plaats van in de
broncode. Per pagina één getagde knop aangeklikt met de uitgaande call
onderschept en geblokkeerd, zodat er geen testdata in de echte cijfers belandt:

| doel | pagina | eigenschappen |
|---|---|---|
| `Boeking 15min` | /contact, insight-detail, `Capacity.tsx` (2×) | `url` |
| `Pricing CTA` | /pricing | `tier`, `url` |
| `Sector CTA` | /sectors/[slug] | `sector`, `url` |
| `Tool CTA` | /tools/energy-roi | `tool`, `url` |

Alle vier vuren naar `plausible.io/api/event` met `d: juandiazllc.com`. Er is
niets meer aan de code te doen; de kliks worden nu al verstuurd en door Plausible
weggegooid omdat de doelen daar niet bestaan.

Nieuw ten opzichte van de notitie: drie van de vier sturen **custom properties**
mee, en die zijn in Plausible pas zichtbaar na aparte aanmelding. Zonder die stap
zie je het aantal kliks wel, maar niet welke tier of sector ze opleverde.

**Twee instrumenten faalden hier, allebei stil.** In de geserveerde HTML is
`data-domain` niet te vinden — Next injecteert het script client-side, dus alleen
de preload-link staat in de bron. Een grep leverde dus "Plausible is verkeerd
geconfigureerd" op, terwijl de gerenderde DOM gewoon
`data-domain="juandiazllc.com"` draagt. En de netwerk-opname van de browser-pane
registreert alleen same-origin verzoeken, dus die toont een event naar
`plausible.io` nooit. Meet dit in de DOM met een onderschepte `fetch`.

#### De leadketen is voor het eerst in zijn geheel gelopen

Via het **echte meerstapsformulier op productie**, niet via een SQL-insert — dat
laatste had alleen het staartstuk getest. Testinzending daarna verwijderd;
`marketing.leads` stond op 0 rijen vóór en na.

| schakel | uitkomst |
|---|---|
| rij in `marketing.leads` | aangekomen — anon-INSERT komt door RLS heen |
| `leads_notify_new` → `lead-notify` | 200, `{"telegram":"sent","resend":"skipped: RESEND_API_KEY unset"}` |
| `leads_acknowledge_new` → `lead-acknowledge` | 200, `{"sent":false,"channel":"skipped:no-api-key"}` |

Beide dispatches binnen 135 ms na de insert. **Telegram werkt. E-mail werkt
nergens**, en beide helften melden dezelfde reden: de `RESEND_API_KEY` op de
edge functions is niet gezet. Dat is één operator-actie, geen defect.

De keten registreert haar eigen storing: `ack_channel` droeg `skipped:no-api-key`
precies zoals de kolomtoelichting belooft. Daardoor was de diagnose één query in
plaats van speurwerk. Zo hoort een schakel te falen.

**Twee instrumenten faalden ook hier.** `read_page` gaf een lege boom met
viewport 0×0 terwijl de pagina gewoon geladen was; `javascript_tool` zag alles.
En het formulier reageerde niet op klikken — de oorzaak was mijn eigen globale
`preventDefault` uit de Plausible-meting op dezelfde tab, die een client-side
navigatie overleeft. Bij SPA-navigatie blijft een listener op `document` leven;
alleen een harde reload ruimt hem op.

#### De tweede meldingslaag was geen ontbrekende meting maar een duplicaat

De meting hierboven liet één schakel open: kwam de interne melding vanuit Vercel
aan? Naast de edge function stuurde `lib/notify.ts` bij elke inzending zélf ook
een Telegram en een e-mail. Het plan was die schakel meetbaar te maken — dezelfde
reden laten teruggeven als de edge function, en wegschrijven in `metadata`.

Bij het openen van `lead-notify` bleek dat het verkeerde antwoord. Die functie
doet **beide** kanalen al, geeft per kanaal een reden terug en logt. `notify.ts`
stuurde dezelfde twee kanalen naar dezelfde ontvanger, over dezelfde rij. Bij
goede configuratie kreeg Juan alles dubbel; bij slechte hoorde hij van deze helft
niets, want hij sloeg stil over (`if (!key) return`) en faalde stil (lege
`catch`). Meetbaar maken zou een tweede, zwakkere meting hebben opgeleverd naast
een sterkere die er al was.

`lib/notify.ts` is daarom verwijderd. Beide afnemers — `app/actions/contact.ts`
en `app/api/cal/route.ts` — schreven de rij toch al weg, dus trigger
`leads_notify_new` vuurde in beide gevallen al. Er valt niets weg, alleen het
duplicaat. `app/api/cal/route.ts` droeg het `LeadNotification`-type; dat is nu
een lokaal `LeadRij`-type in dat bestand, want het is de enige lezer.

**De bezoeker merkt het ook.** Beide meldingen stonden met een `await` in het
request-pad van de server action, zonder timeout. Twee externe HTTP-aanroepen
minder tussen "verzenden" en het bevestigingsscherm.

**En het haalt een strik uit de operator-taak.** `RESEND_API_KEY` moest op twee
plekken staan, met twee verschillende gevolgen bij ontbreken. Nu is er één
plek — de edge-function-secrets — en één plek waar je kunt zien of het werkte.

#### De duurste knop op de site ging langs de leadketen heen

Drie CTA's op `/pricing` wezen naar `hello@lucen.ai`: de Enterprise-tier, de
migratiedienst en "praat met sales". Live in vier talen, op een pagina die in de
topnav staat en in de sitemap op prioriteit 0,9.

**`lucen.ai` is een geparkeerd domein.** `https://` geeft een SSL connect error
(curl exit 35); `http://` geeft 302 met `X-Served-By: Namecheap URL Forward` naar
`www.lucen.ai`, en dat is een parking-lander die zichzelf beschrijft als *"the
parked domain's origin … so the market can attribute the visit"*. Er staat wel
een MX (Namecheap-forwarding), dus post kán aankomen — of `hello@` een
doorstuurregel heeft is van buitenaf niet vast te stellen.

**De echte kosten zaten in de omleiding, niet in het adres.** Een `mailto:` slaat
alles over wat er deze twee dagen aan de leadketen is gebouwd: geen rij in
`marketing.leads`, dus geen `leads_notify_new`, dus geen Telegram en geen
ontvangstbevestiging. Het spoor houdt op bij de Plausible-klik. Dat trof
uitgerekend de lead die vanaf vijftien zitplaatsen begint.

De vier tier-knoppen deden het al goed — `/contact?interest=<slug>`, uitgelezen
door `ContactForm.tsx` en weggeschreven in `source` als
`contact_page:interest=pro:stage=3`. De drie afwijkers volgen dat patroon nu ook
(`enterprise`, `migration`, `sales`). Op de lokale productiebuild gemeten: nul
mailto's, zeven formulierlinks per taal, alle vier de talen correct van
taalprefix voorzien.

**Twee poorten deden hier hun werk, en één daarvan was niet van mij.**

`lib/contactadressen.test.ts` (nieuw) eist dat elk e-mailadres in geleverde code
op juandiazllc.com staat. De strenge helft — geen `mailto:` buiten het domein —
kent geen uitzonderingen, en die viel meteen op mijn eigen toelichting, omdat ik
daarin `mailto:hello@lucen.ai` letterlijk had opgeschreven. De comment is
herschreven; de poort niet verzwakt. Uitzonderingen dragen een **aantal**, zodat
een tweede, échte vermelding in hetzelfde bestand niet stil meelift. In drie
richtingen gebroken: mailto teruggezet, vreemd adres zonder uitzondering,
uitzondering achterhaald — alle drie rood, daarna weer groen.

`lib/i18n/eerste-stap.test.ts` (uit #187) ving de wijziging zelf op: twee knoppen
die nu naar `/contact` wijzen droegen niet `cta.book`. Die poort voorkomt dat
dezelfde stap opnieuw elf namen krijgt. Hier was hernoemen fout — `cta.book` is
het blueprint-gesprek, en een migratievraag over DEUS is dat niet; de FAQ zegt in
vier talen dat die twee verschillen. Ze staan dus in `NIET_HET_AANBOD` met reden,
naast het precedent dat er al stond (`pricing.outro.cta`, om exact dezelfde
reden).

**Twee vragen die hierdoor open kwamen te liggen, en die van de operator zijn.**
Er staat geen koopweg meer in deze repo — Stripe vertrok met #134, en de drie
grep-treffers op "stripe/checkout" zijn alle drie vals (een CSS-klasse
`.philly-stripe`, een comment, en "checkout" in een hotelcontext). En de vier
bedragen op die pagina staan niet in `docs/claims.md`; ze komen uit
`_drafts/pricing/pricing-tiers.csv`, wat ze afgeleid maakt, niet geverifieerd.

**Mutatietesten met ongestaged werk:** hersteld uit een kopie in de scratchpad,
niet met `git checkout --`. Die laatste herstelt vanuit de index en had het werk
van deze sessie teruggezet naar HEAD.

#### PR #197 — een plan voor de naamzoekopdrachten, en wat er niet in staat

`docs/seo-geo-plan.md`. De aanleiding was een vraag met een harde eis erin: alles
wat met de naam te maken heeft moet op pagina 1. Dat is een entiteitsprobleem,
geen rankingprobleem — er lopen naamgenoten rond (voetballers, een bokser) met
decennia aan autoriteit.

**§0 gaat over de instrumenten, niet over de site.** Vijf meters staan stuk of
uit: Vercel Analytics geeft 404, er is geen Plausible-sleutel, Search Console is
niet uitgelezen, DataForSEO heeft geen inloggegevens en Ahrefs antwoordt
"Insufficient plan". Zolang die vijf zo staan is elke uitspraak over verkeer een
schatting. Dat staat als stap nul in het plan en niet als voetnoot.

§5 is een geordende lijst van negen punten met per punt een eigenaar. Zes zijn
van de operator, twee zijn beslissingen, één is code — dat laatste is dit werk.
§6 zegt wat er níet beloofd wordt: geen termijn op een SERP die door
naamgenoten wordt bezet, geen belofte over AI-citaties, en geen cijfer zolang
§0 openstaat.

#### PR #198 — vier personen werden één

De JSON-LD beschreef dezelfde mens op vier plekken en was het oneens met
zichzelf. Gemeten, niet vermoed:

| bestand | naam | url |
|---|---|---|
| `app/layout.tsx` | Juan Stefan Bongartz Diaz | geen |
| `app/[locale]/layout.tsx` | Juan Stefan Diaz | /{l}/about |
| `app/[locale]/about/page.tsx` | Juan Stefan Bongartz Diaz | /about → 307 |
| `lib/seo/article.ts` | Juan Stefan Bongartz Diaz | /about → 307 |

Geen van de vier droeg een `@id`. Zonder dat mag een crawler ze als vier losse
personen lezen, en dan verdeelt elk signaal zich over vier knopen — precies het
omgekeerde van wat je wilt op een naam die al verzadigd is met naamgenoten.

Nu één knoop: `PERSON_ID` in `lib/seo/branding.ts`, met `name` plus
`alternateName[]` zodat alle drie de naamvormen op dezelfde entiteit uitkomen.
`PERSON_URL` wijst op `/en/about` en niet meer op `/about`, want dat laatste
geeft 307 en een `url` die op een redirect uitkomt is een zwakker signaal.
`twitter.com/juandiazllc` is uit `sameAs` gehaald: 404 via x.com, en `sameAs` is
een verificatieveld — een dood adres daarin is een gefaalde controle, geen
ontbrekend signaal.

`lib/seo/persoon-entiteit.test.ts` telt per bestand de `Person`-knopen en eist
evenveel verwijzingen naar `PERSON_ID`. Een nieuwe knoop zonder gedeelde `@id`
is hoe dit gat is ontstaan en hoe het terugkomt.

#### PR #199 — llms.txt droeg de claim die #188 er net had uitgehaald

`public/llms.txt` is het bestand waarvan het hele doel is dat AI-assistenten het
citeren. Er stond in:

> Five active ventures — Voltafy, Performance Tracker, Help Mij Besparen,
> Salderingsregeling 2027, Philly/DEUS CRM.

Vier staan er live; Philly wordt gebouwd. PR #188 heeft die claim eerder dezelfde
dag uit `work.page.lede` gehaald en er in vier talen een poort omheen gezet.
**Die poort leest `dict.ts`.** Dit bestand stond in `public/`, werd door geen
enkele test aangeraakt, en overleefde de reparatie.

Daarnaast stond er `Last updated: 2026-08-03`, zeventien dagen oud.

**Het is nu een route, geen bestand.** `app/llms.txt/route.ts` leest
`lib/seo/llms.ts`, en daar komen de feiten uit de bron: de venture-regel uit
`VENTURES`, de talen uit `LOCALES`, de naamvormen en het GitHub-adres uit
`branding.ts`. `public/llms.txt` is verwijderd, en dat moest ook — Next serveert
statische bestanden vóór routes met dezelfde naam, dus met allebei had de route
nooit iets gedaan. Een van de elf poorten bewaakt precies dat, want een
teruggezet bestand schakelt de generator uit zonder één foutmelding.

**Geen telwoord meer in die regel.** Er staat nu "Live products — " plus de
lijst. Een getal naast een lijst is een tweede bron voor hetzelfde feit, en dat
was letterlijk het defect. Een poort houdt tegen dat het terugkomt.

**De afgeleide datum bleek ouder dan de ingetypte.** Nieuwste artikel:
2026-07-20; er stond 2026-08-03. Die datum was de dag dat iemand het bestand
bewerkte, niet de dag van de nieuwste inhoud — de handmatige versie overdreef
dus de versheid. Daarmee klopte mijn eigen kop ook niet: "Last updated" belooft
iets over het hele bestand, terwijl de datum alleen artikelen meet en een
venture-wijziging hem niet verschuift. De kop zegt nu wat hij meet.

**`/llms-full.txt` is nieuw** — de volledige tekst van elk Engelstalig artikel en
elke marktnotitie, 28 KB, zodat een assistent de bron kan lezen in plaats van
ernaar te raden. Alleen Engels: de markt-specifieke clusters staan niet onder
`/en` en zouden 404-URL's opleveren, dezelfde keuze als in `feed.json`.

**Eén afvlakker voor twee afnemers.** Toen `cta` als bloktype werd toegevoegd
(#82) moest `feed.json` met de hand mee. Dat werkte omdat er één afnemer was.
`lib/seo/plattetekst.ts` is nu de enige plek die de bloktypes kent, met een
`never`-tak die een zesde type tot compileerfout maakt in plaats van een stille
lege string. Twee vormen uit één switch: platte tekst voor JSON Feed, waar dat
per specificatie hoort, en markdown voor llms-full, waar de koppen blijven staan
en de href van een `cta` overleeft — die viel in de platte vorm helemaal weg.

**Zes mutaties, zes keer rood.** De onwaarheid terugzetten, de datum intypen,
`public/llms.txt` terugzetten, een `cta` stil laten vallen, de href weghalen, en
de dekkingscontrole een bloktype laten eisen dat niet bestaat.

#### De meetlat brak twee keer, op dezelfde manier, één laag uit elkaar

De telwoord-poort stond eerst als:

    new RegExp(`\b${w}\b`)

Dat matcht niets. In een template literal is `\b` het backspace-teken, geen
woordgrens — de test kon per definitie niet falen, en de mutatie met "Five
active ventures" er letterlijk in liep er groen doorheen. Alleen omdat er twee
tests op dezelfde mutatie hoorden af te gaan en er maar één afging, viel het op.

Toen ik het wilde repareren met een Python-script trapte ik in exact dezelfde
val: `\b` in een gewone Python-string is óók een backspace. De reparatie kon de
regel niet vinden.

De oorzaak eronder is het opschrijven, niet het denken: **de heredoc halveert een
dubbele backslash.** Wat ik als `\b` typte werd `\b` in het bestand. Enkele
backslashes overleven; dubbele niet. De poort is daarom herschreven zonder
escapes — `regel.split(/[^a-z]+/)` en een `Set` — en waar een letterlijke
backslash nodig is, gaat het via een raw string.

**Regel: bouw geen regex uit een template literal.** Een regex-literal
(`/[^a-z]+/`) gaat niet door string-escaping heen en is daarmee immuun voor deze
hele klasse. Zie ook [[feedback_verify_the_measuring_stick]] — dit is hetzelfde
mechanisme als de shell-expansie in `"…|\$1,200"`, één laag verder naar binnen.

#### Meting

796 tests in 31 bestanden, 692 dict-sleutels × 4 talen. Dat vervangt de 780/29
van een uur eerder, en die weer de 776/28 en de 726/25. De verwijdering van `lib/notify.ts` verandert
dat aantal niet: er was geen test die het bestand aanraakte, en dat is precies
wat een ongeobserveerde schakel is.

### 2026-08-20 (vervolg) — het bewijs lag op de pagina waar niemand koopt

Aanleiding was een aanbod-diagnose met de offer-skills (`docs/aanbod.md`, #200).
Die kwam op één bindende beperking uit, en het was niet de prijs: **geloofwaardigheid**.
Iemand die overweegt te boeken moet geloven dat het werkt, en het bewijs dáárvoor
bestond al — vier bevestigde klantuitkomsten in `docs/claims.md`, in vier talen
gepubliceerd, sinds #185 met een poort eromheen. Ze stonden alleen op de
homepage. `/services` en `/contact` droegen samen nul cijfers, terwijl dat de
twee pagina's zijn waar de beslissing valt.

#### Drie wijzigingen, waarvan er één iets meetbaars oplevert

| | wat | gevolg |
|---|---|---|
| A | `ResultsStrip` gemonteerd op `/services` (tussen de ladder en de CTA) en `/contact` (ná het formulier, vóór de FAQ) | geen nieuwe claim — een montage van iets dat al goedgekeurd is |
| B | de slot-CTA van `/services` wijst naar `/contact?interest=services` | vanaf nu is een lead vanaf deze pagina te onderscheiden van een lead vanaf de homepage |
| C | `services.how.s1.note` × 4 talen | legt uit dat "Blueprint" twee dingen heet: fase 02 van de methode én dit gratis gesprek |

B is het enige punt met een meetbaar gevolg. Op de draaiende build end-to-end
nagelopen: klik op de CTA, drie stappen door het formulier, en het verborgen
`source`-veld draagt `contact_page:interest=services:stage=blueprint`. Niets
ingezonden — alleen de wizard doorlopen.

C werd bijna het omgekeerde van wat het nu is. Mijn eerste lezing was dat
"blueprint call" hernoemd moest worden omdat de naam dubbel bezet was.
Hertellen draaide dat om: de term staat **7 keer in de Engelse FAQ alleen**
(≈28 over vier talen) tegen **4** voor `process.2.name`. Hernoemen zou de
grootste vindplaats hebben gesloopt om de kleinste te redden. Eén sleutel die
de relatie uitlegt is goedkoper en eerlijker.

#### De montagepoort noemt de pagina's, niet het aantal

`ResultsStrip.test.ts` had al een poort die elk gepubliceerd cijfer tegen
`docs/claims.md` legt. Daar staat nu `HOORT_TE_STAAN` naast: een expliciete
lijst van drie paden, elk met de reden waarom het blok daar hoort. Verdwijnt een
montage, dan valt de poort om; komt er een vierde bij zonder reden, ook.

Dat is niet symmetrisch met "alleen op de homepage", en dat is het punt. Die
situatie is nooit als besluit genomen — het was de plek waar het blok geboren
werd, en daarna heeft niemand er meer naar gekeken. In twee richtingen bewezen:
de `/contact`-montage weggehaald (rood op `ontbreekt`), en een pad uit de
verwachtingslijst gehaald (rood op `onverwacht`).

#### Twee keer had mijn eigen document ongelijk, allebei gevangen door hermeten

Bijlage B beweerde dat vier dienst-CTA's naar `/contact` wijzen. Ze wijzen naar
`/work`, `/sectors`, `/insights/the-build-vs-buy-trap` en
`/signals/instruments-not-saas`; alleen de slot-CTA gaat naar `/contact`. Vandaar
één pagina-brede `?interest=services` en geen vier. Per dienst zou beter zijn,
maar de vier kaarten zíjn zelf al links — een tweede anchor daarin is ongeldige
HTML, dus dat is een ontwerpwijziging en geen parameter.

En het document telde vier NL saldering-artikelen waar er vijf staan
(`getAllInsights("nl")` gefilterd op tag `Energy`).

**Bijna een niet-defect gerapporteerd.** Ik vermoedde dat stap 2 van het
formulier de bezoeker in verkoperstaal laat zelf-diagnosticeren. De gemeten
labels doen precies het tegenovergestelde: "Revenue is leaking — not sure where."
Symptoomtaal, al sinds de meerstapsversie. Eerst kijken, dan melden.

#### Wat blijft liggen, en om een betere reden dan ik eerst opschreef

Bijlage D — de uitleg van wat de sprint van 30 dagen oplevert — staat niet in
deze PR. Het document zei dat die op de prijs wacht. Dat klopt niet: de blokkade
is dat **ik niet weet wat die 30 dagen opleveren**. Dat is Juans kennis, en een
deliverable verzinnen is dezelfde fout als een prijs verzinnen. D is daarom
verhuisd van §4 naar §5, bij de beslissingen.

#### Meting

Op de draaiende build in alle vier de talen nagelopen: het blok rendert op
`/services` en `/contact`, de DOM-volgorde is ladder → bewijs → CTA op services
en formulier → bewijs → FAQ op contact, de notitie staat vertaald (geen Engelse
terugval), en de CTA draagt per taal het juiste voorvoegsel. Geen console-fouten,
geen horizontale overloop op 375 px. Een screenshot lukte niet — de browser-pane
compositeert hier geen frames — dus dit is in de DOM gemeten, niet op het oog.

797 tests in 31 bestanden, 693 dict-sleutels × 4 talen. Dat vervangt de 796/31
en de 692 hierboven.

### 2026-08-20 (vervolg) — twee adressen met één merknaam, en twee kapotte Duitse woorden

De vraag was backlinks te maken naar "de lucenai site". Het antwoord veranderde
twee keer tijdens het meten.

#### Ik mat eerst het verkeerde domein, en dat was de repo's schuld

`lucen.ai` is wat híer staat — tot #196 wezen drie CTA's op `/pricing` naar een
mailadres op dat domein. Gemeten: geen https (geen certificaat), `http://` 302
naar een CNAME op `parkingpage.namecheap.com`. Geparkeerd.

`lucenai.eu` is de echte site: 200 over TLS, `www` 301 naar de apex, WordPress
op LiteSpeed, Yoast, Google Workspace-mail, en er staat al een
`google-site-verification`-TXT. Twee adressen, één merknaam, en deze repo kende
alleen de dode.

#### Elf van de zestien URL's in die sitemap zijn demo-inhoud

| soort | n | wat |
|---|---|---|
| echte pagina's | 3 | `/`, `/about/`, `/contact/` |
| demo-artikelen | 9 | alle negen met de titel "Blog Post Title" en als tekst `Blog post excerpt [1-2 lines]` |
| thema-restanten | 2 | WordPress' "Sample Page" en `/global-styles/` |
| archieven daarvan | 2 | `/category/blog/`, `/author/hashadmin/` |

Plus: de homepage noemt in het feature-blok **"Philanthropy AI"** — kopij van
een ander product, één keer in de zichtbare tekst tegen vier keer "Lucen AI".
Er is geen `meta name="description"`; de `og:description` bevat de volledige
paginatekst. En de negen artikeltitels eindigen op een losse `%`, een kapot
Yoast-sjabloon.

Backlinks bouwen naar een site waar tweederde placeholder is, is een stem die
je niet terugkrijgt. Opruimen kost een uur, links verdienen kost maanden. De
volgorde staat in `docs/lucenai-backlinks.md`; zes van de zeven stappen zijn
operator-werk in WordPress.

#### Wat er wél in code kon, en wat het waard is

`lucenai.eu/about` noemt **"Juan Stefan Bongartz Diaz — Co-Founder | CTO"**
voluit, met exact de naamvorm waar `PERSON_NAME` op leunt, en linkt niet terug.
Deze kant kende Lucen AI helemaal niet. Die rand ligt er nu: `affiliation` in
het `Person`-schema op `/about`, plus een zichtbare link in vier talen.

**Niet in `sameAs`** — dat veld zegt "dit adres beschrijft dezelfde entiteit",
en `lucenai.eu` beschrijft een bedrijf met drie oprichters. `worksFor` was al
bezet door de rechtspersoon van deze site; twee werkgevers in dat veld maakt
geen van beide sterker.

Eerlijk over de waarde: **één link vanaf een domein zonder autoriteit.** De
SEO-waarde is bijna nul, de entiteitswaarde echt maar bescheiden.
`controleerEntiteitsAdressen` in `lib/seo/venture-adressen.ts` bewaakt de
bereikbaarheid in de dagelijkse productie-audit, om dezelfde reden als bij de
dode X-handle en `philly.juandiazllc.com`: een adres in een schemaveld dat 404
geeft is geen ontbrekend signaal maar een mislukte controle.

#### Onderweg: het Duitse woord voor "bouwer" is niet "Bauer"

Twee vondsten in de tien sleutels die ik toevallig opensloeg, allebei op de
oppervlakken die de naamzoekopdracht beslissen:

| sleutel | stond er | betekent |
|---|---|---|
| `about.title.b` (de) | "— Betreiber, Bauer, Gründer." | boer |
| `meta.home.description` (de) | "Bauerprobt, operator-built." | geen woord |

De H1 van de Duitse `/about` noemde hem dus operator, **boer**, oprichter. En de
Duitse homepage-description — de meest geserveerde Duitse zin van de site —
droeg een niet-bestaand woord waar "Construction-trained" (en) / "Bouwkundig
getraind" (nl) staat. Nu "Erbauer" en "Bautechnisch geschult"; die laatste komt
op 158 tekens, onder de `DESC_MAX` van 160.

**Hier past geen poort.** Een test kan niet zien of Duits klopt. Wat de
trefkans zegt is wel iets: twee fouten in tien willekeurig gelezen sleutels, in
een woordenboek van 696 dat niemand ooit uitgelezen heeft. Een Duitse
leesbeurt over de meta- en about-sleutels is werk dat er nog ligt.

#### Twee poorten gingen af op mijn eigen toelichting

`contactadressen.test.ts` viel op `hello@lucen.ai` in een nieuwe comment in
`branding.ts` — de uitzondering draagt een **aantal** per bestand, dus een
tweede vermelding elders lift niet stil mee. En `persoon-entiteit.test.ts` viel
op de volle naam die ik in een comment in `about/page.tsx` had overgeschreven.
Beide keren was de comment fout, niet de poort. Herschreven, poorten ongemoeid.

#### En één keer sloeg mijn eigen gereedschap te breed

Een `.replace('--', '—')` over een heel commentaarblok raakte ook de
streepjeslijnen eronder, en maakte er em-dash-linialen van. Zelfde familie als
de backslash-halvering van gisteren: een vervanging die wijder toesloeg dan
bedoeld. Regel-voor-regel herschreven, met een assertie dat er geen
em-dash-liniaal overbleef.

#### Meting

803 tests in 31 bestanden, 696 dict-sleutels × 4 talen. Zes nieuwe tests voor
`controleerEntiteitsAdressen`, in twee richtingen gebroken: het adres op het
eigen domein gezet (rood) en ENOTFOUND gedegradeerd tot waarschuwing (rood).
Op de draaiende build in vier talen nagelopen: link, `rel`, `affiliation`,
Duitse H1 en Duitse description.

### 2026-08-20 (vervolg) — de Duitse leesbeurt: veertien zinnen, en een test die het defect verdedigde

De vorige PR vond bij toeval twee kapotte Duitse woorden. Twee fouten in tien
willekeurig gelezen sleutels is geen toeval maar een steekproef, dus is het hele
Duitse blok uitgelezen — 696 sleutels, regel voor regel, met en/nl ernaast waar
de bedoeling onduidelijk was.

**Veertien zinnen aangepast, in drie klassen.**

*Woorden die iets anders betekenen.* `Bauingenieurlich` staat op geen enkele
woordenlijst, en `Bauingenieur` is bovendien een ander vak dan bouwmanagement —
het stond drie keer, waaronder in de H2 van de methode-sectie op de homepage en
in de lede van `/about`. `Produkte im Versand` en `Wir versenden bereits` gaan
over pakketpost, niet over software uitleveren. Let op: `Versand` blijft wél
staan in `pricing.feat.email.customSmtp`, want dáár betekent het precies wat er
staat. Een verbod op het woord zou dat kapot hebben gemaakt.

*Eén begrip, meerdere woorden.* `tag.label.hospitality` zei **Hotellerie** — een
derde Duits woord voor dezelfde sector naast Hospitality (13×) en Gastgewerbe
(3×), uitgerekend in de H1 en de titel van de tagpagina, terwijl de sectorpagina
ernaast Hospitality zegt. En `Operatoren` (5×) leest in het Duits als
wiskundige of machine-operatoren, terwijl het publiek overal elders `Betreiber`
heet (25×). De meta-description die in #108 geschreven werd, deed het al goed;
de pagina-lede ernaast niet.

*Aanspreekvorm.* Het Duitse blok is Sie — 122 keer gemeten — met drie du-vormen
ertussen. Dat leest als drie verschillende schrijvers.

**De poort bewaakt wat mechanisch is, niet wat een lezer moet doen.**
`lib/i18n/duits.test.ts` heeft twee regels: geen du-vormen, en geen van de vijf
woorden die zijn teruggedraaid — elk met de reden erbij, want een verbod zonder
reden wordt over een jaar weggehaald door iemand die niet weet waarom het er
stond. Hij leest `DICT.de` en niet de bestanden, zodat het testbestand zichzelf
niet laat struikelen over de woorden die het beschrijft. In drie richtingen
gebroken: `Bauer` terug, een du-vorm terug, `Hotellerie` terug.

Wat een test hier níet kan is zien of Duits klópt. Daar was de leesbeurt voor,
en die is nu gedaan.

#### Een bestaande test hield het defect op zijn plek

`tags.test.ts` asserteerde `tagLabel("de","hospitality") === "Hotellerie"`. De
poort die moest bewijzen dát er vertaald wordt, legde precies de verkeerde
vertaling vast. Hij is niet aangepast aan het nieuwe antwoord maar verplaatst
naar een tag die in het Duits écht anders luidt (`real-estate` → Immobilien) —
met "Hospitality" als verwachting zou de assertie ook zijn geslaagd op een
terugval naar het Engels, en dan bewijst hij niets meer.

**Een test die de fout vastlegt, verdedigt hem.** Bij elke gele vlag hoort dus
de vraag welke test hem tot nu toe groen hield.

#### Meting

807 tests in 32 bestanden, 696 dict-sleutels × 4 talen. Op de draaiende build in
de geserveerde HTML nagelopen: `Bauingenieurlich` 0×, `Hotellerie` 0×,
`Operatoren` 0×, `Produkte im Versand` 0×, du-vormen 0×, en de vervangingen
staan op `/de`, `/de/about`, `/de/services`, `/de/sectors/hospitality`,
`/de/sectors/adjacent` en `/de/insights/tag/hospitality`.

**Wat blijft staan.** `priv.p.contact` belooft in vier talen dat een inzending
"sofort als E-Mail (über Resend)" aankomt. Gemeten op 2026-08-20 doet hij dat
niet: de edge function meldt `resend: skipped: RESEND_API_KEY unset`. Dat is
geen vertaalfout maar een operator-actie die al op de lijst staat — tot die
sleutel gezet is, staat er in een privacyverklaring iets dat niet gebeurt.

#### Wacht op de operator — bijgewerkt 2026-08-20

> **Achterhaald.** Samengevoegd in "Wacht op de operator" bovenaan dit
> bestand (2026-08-24). Schrijf aanvullingen daar, niet hier.

Dit vervangt de lijst van 19 augustus hierboven.

- **Vier Plausible-doelen aanmaken** in het dashboard — `Boeking 15min`,
  `Pricing CTA`, `Sector CTA`, `Tool CTA` — plus de drie custom properties
  (`tier`, `sector`, `tool`). Taggen is af en geverifieerd; zonder de doelen
  worden de kliks binnengehaald en weggegooid. Exacte namen en de meting staan
  in `MANUAL_TASKS.md`.
- **Plausible-cijfer**: bezoekers over 30 dagen. Zonder dat blijft "0 leads in
  `marketing.leads`" onbeslist tussen geen-verkeer en geen-conversie.
- **`RESEND_API_KEY` op de edge functions** (Supabase → Edge Functions →
  Secrets), plus `ACK_FROM` op een geverifieerd domein. Zonder die twee gaat er
  bij een echte lead geen enkele mail de deur uit — gemeten, niet vermoed. De
  leadketen-test hoeft niet meer; die is gelopen.
- **DataForSEO-inloggegevens** (open sinds 2026-08-03). Zonder die twee waarden
  levert elke SEO-route niets. Zet ze zelf; de plek staat klaar in
  `.env.example`.
- **Kiezen: gehost of self-host** voor OpenSEO. Aanbeveling en onderbouwing
  staan in `MANUAL_TASKS.md`; de keuze kost geld, dus die is aan jou.
- **Ahrefs-connector loskoppelen** via claude.ai — zodra OpenSEO antwoordt.
- **Search Console**: alleen nog nakijken of de property daadwerkelijk
  geverifieerd is. Het DNS-record is er.

Vier daarbij uit `docs/aanbod.md` §5. Geen ervan is uit de repo af te leiden, en
geen ervan mag verzonnen worden.

- **Wat kost de diagnostische sprint van 30 dagen?** Eén bedrag, eerst in
  `docs/claims.md`, daarna pas in kopij. Zolang dit open staat blijft "vaste
  prijs" een belofte zonder inhoud.
- **Wat ligt er na die dertig dagen op tafel?** Eén zin. Stap 1 van de ladder
  noemt een tastbaar ding (een diagnose van één pagina), stap 2 noemt alleen een
  toestand. Hierop wacht de laatste tekstwijziging in vier talen.
- **Draag je een garantie, en welke?** De vorm die bij dit aanbod past raakt de
  levering van stap 2, niet de uitkomst. Jouw risico, jouw keuze; ik kan de
  gangbare vormen naast elkaar zetten met wat elk kost als het misgaat.
- **Hoeveel trajecten draag je tegelijk?** Een getal maakt schaarste echt en
  controleerbaar. Zonder getal is elke urgentie-zin een constructie, en dan hoort
  hij er niet te staan.

- **Zeven stappen voor lucenai.eu** in `docs/lucenai-backlinks.md` §3, waarvan
  zes operator-werk in WordPress. De belangrijkste kost een minuut: op
  `lucenai.eu/about` de naam van Juan linken naar `juandiazllc.com/en/about`.
  Backlinks bouwen heeft pas zin als stap 1 t/m 3 gedaan zijn.

### 2026-08-20 (vervolg) — DEUS, de tweede pass: twee prijslijsten die elkaar tegenspreken

`docs/aanbod.md` §6 zette de volgorde: eerst punt 3 — welke van de ontbrekende
mogelijkheden prijsrijen worden en op welk niveau — omdat dat "aanbodwerk is en
het kan nu". Bij het meten bleek die aanname niet te houden, en niet omdat de
mogelijkheden ontbreken.

#### Meet tegen `origin/main`, niet tegen de werkkopie

De lokale checkout van DEUS-SHARED stond op `efdf7da` van **18 mei**, 333
commits achter. Daar tellen 165 routes; op `origin/main` (`5f95d90`,
2026-08-19) zijn het er 201 — precies het getal dat `claims.md` op 15 augustus
noteerde. Een `git ls-tree`/`git grep` tegen `origin/main` meet zonder de
werkkopie aan te raken, en dat is hier het verschil tussen een meting en een
misverstand van drie maanden oud.

#### De beslissing van 15 augustus is niet uitgevoerd

`claims.md` legde die dag Juans keuze vast: per zitplaats wint, en DEUS-SHARED
volgt — slugs hernoemen, Stripe-`quantity` aan de zitplaatsen koppelen,
`maxUsers` van plafond naar ondergrens. Vijf dagen later staat er in
`lib/philly/billing/plans.ts` nog steeds `operator/team/business` op
€49/€199/€599 vast, met `maxUsers` als plafond en `quantity: 1` in de
checkout-route.

| | de pagina | DEUS-SHARED |
|---|---|---|
| niveaus | vier | drie |
| model | per zitplaats | vast per maand |
| gebruikers | **minimum** 3/5/10/15 | **maximum** 3/10/onbeperkt |

Starter kost op de pagina €40 × 3 = €120 als vloer; `operator` kost €49 met een
plafond van drie. Business: €990 tegen €599. Beide kunnen niet waar zijn.

**En de code denkt dat ze overeenkomen.** De kop van `plans.ts` zegt "matching
`pricing.tier.<slug>.*` in `/lib/i18n/dict.ts` on the marketing side". Die
sleutelruimte bestaat hier niet; het is `pricing.t.{starter,pro,business,
enterprise}.*`. Niet de naamruimte klopt en niet de slugs. Een commentaar dat
een voornemen als toestand opschrijft is erger dan geen commentaar — het
beantwoordt de vraag die je had moeten stellen.

#### Zestien mogelijkheden gemeten, acht met een niveau uit de code

De tabel staat in `docs/claims.md`, met per rij het bewijs (`app/api/**` en de
`PlanFeature` die hem afschermt). Twee dingen die er niet in stonden:

**De rij die "dialer" heette bestaat niet zoals hij klinkt.** Er is geen
telefonieprovider in de repo. Wat er staat is een bellijst met klik-om-te-bellen
en registratie van uitkomst; de eigen gebruikersdocumentatie opent met "Call
list management". Dat is dezelfde fout als de twee agenda-synchronisatierijen
die er in augustus afgingen — een naam aanzien voor een mogelijkheid — en
`claims.md` had de les er zelf al bij geschreven.

**De IP-allowlist staat nu al verkeerd op de pagina.** Vier vinkjes, terwijl
`PLANS` hem uitsluitend aan `business` geeft. Dat is geen rij die erbij moet,
maar een rij die nu iets verkoopt dat Starter niet krijgt.

Welke rijen erbij komen en op welk niveau blijft aan Juan: DEUS heeft drie
niveaus en de pagina vier, en welke van de vier het bovenste DEUS-niveau draagt
bepaalt wat er bij €69 en wat er bij €99 hoort. De drie verticale modules (35
routes samen) stel ik bewust niet voor — een module op een prijslijst zetten
beantwoordt de ICP-vraag stilzwijgend.

#### De knop beloofde een stap die er niet is

Drie knoppen zeiden in vier talen dat ze een proefperiode starten. Alle drie
gaan naar `/contact`. Er valt niets te starten; er staat een formulier — en de
pagina schrijft dat zelf op, in een commentaar boven `TIERS`.

Het aanbod was niet het probleem; het werkwoord was het. De knoppen vragen nu om
de proefperiode, en `pricing.outro.body` zegt erbij dat het opzetten met de hand
gaat.

`lib/prijsknoppen.test.ts` **schakelt zichzelf uit zodra de belofte waar wordt**:
de regel geldt alleen voor een knop waarvan de `ctaHref` naar `/contact` wijst.
Wijst hij naar `/signup`, dan mag het label weer zeggen dat het iets start. Dat
is opzet — een verbod dat blijft staan nadat de reden verdween, wordt over een
jaar weggehaald door iemand die niet weet waarom het er stond.

In drie richtingen gebroken: belofte terug bij een formulierknop (rood), belofte
terug bij een `/signup`-knop (groen, de regel vervalt), en het veld `ctaHref`
hernoemd (rood op de lege lijst, niet stil groen).

Drie FAQ-antwoorden zijn **niet** aangeraakt: naar rato opwaarderen, een
terugbetaaltermijn van 30 dagen, een factuur die de zitplaatsen volgt. Geen van
drieën wordt door enig systeem uitgevoerd, maar het zijn toezeggingen zoals de
migratiebelofte — bijstellen verandert het aanbod, en dat is niet aan mij.

#### Meting

811 tests in 33 bestanden, 696 sleutels × 4 talen (waardes gewijzigd, geen
sleutels). Dat vervangt de 807/32. Typecheck schoon, `regen:pricing:check`
groen. Op de productiebuild in vier talen nagelopen: de oude labels 0×, de
nieuwe 6× per taal, en de nieuwe zin in `outro.body` staat vertaald op alle vier
— geen Engelse terugval op `/de` en `/es`.

**Eén ding om te onthouden over het schrijven zelf.** De heredoc brak voor de
vierde keer deze sessie op inhoud met aanhalingstekens. Lange tekst gaat via het
Write-gereedschap naar de scratchpad en daarna met Python op zijn plaats; niet
via `<<'EOF'`.

#### Erbij op de operator-lijst

> **Achterhaald.** Samengevoegd in "Wacht op de operator" bovenaan dit
> bestand (2026-08-24). Schrijf aanvullingen daar, niet hier.

- **Welke van de zestien mogelijkheden worden prijsrijen, en op welk niveau?**
  De tabel met bewijs staat in `docs/claims.md`. Acht dragen een niveau uit
  DEUS' eigen code; de vertaling van drie DEUS-niveaus naar vier pagina-niveaus
  is een commerciële keuze.
- **De IP-allowlist: naar Business op de pagina, of in `PLANS` naar alle
  niveaus?** Nu verkoopt de pagina hem aan Starter en geeft het product hem
  alleen aan business.
- **Voert DEUS-SHARED de beslissing van 15 augustus alsnog uit?** Zolang dat
  niet gebeurt staan er twee prijsmodellen klaar die verschillende bedragen
  zouden aannemen.

### 2026-08-21 — DEUS-SHARED: de provider die bediende stond nergens

Twee PR's in `bongartzdiaz/DEUS-SHARED` (#99 en #100), na een auditronde over
`origin/main` (`5f95d90`). Geen code in deze repo aangeraakt; het staat hier
omdat de drie openstaande vragen bij de operator-lijst hieronder horen.

**Meet tegen `origin/main`, en let op wélke werkkopie.** Er staan er twee:
`C:/business/DEUS-SHARED` liep 333 commits achter (18 mei, 165 routes) en
`C:/business/deus-shared-tmp` is de canonieke — die stond 2 commits achter en
telt 201 routes. Ik heb de eerste in een eerder verslag als "de" checkout
genoemd; dat klopte niet. De gepubliceerde cijfers kwamen uit `origin/main` en
staan wel.

#### Vijf bevindingen, twee gerepareerd

`ResolvedChainEntry` draagt een `providerId` met het commentaar dat hij er voor
logging staat. Er logde niets. De failoverketen wordt opgebouwd, er wordt
gefailoverd, het antwoord komt terug — en welke verwerker de prompt heeft
gezien verliet de resolver nooit. Een prompt draagt naam, e-mail, telefoon,
bedrijf, notities en de tekst die een burger zelf instuurde. Bij een
inzageverzoek is "welke partij heeft dit gezien" precies de vraag, en die was
niet te beantwoorden — ook niet achteraf, want er was geen spoor.

`logProvenance()` schrijft nu één regel per bediend verzoek. **De inhoud gaat
er niet in**: een logregel met de prompt zou een tweede kopie van de
persoonsgegevens zijn op een plek met een andere bewaartermijn, een groter
defect dan wat het sluit. De test hanteert daarom een uitputtende lijst
toegestane velden — een nieuw veld laat de poort omvallen, ook als het
onschuldig lijkt.

De tweede: `2.envExampleDrift` in `check-launch-readiness.ts` matchte op
`process.env.X`, terwijl de providercatalogus `envVar: 'MISTRAL_API_KEY'`
declareert en later via `env[field.envVar]` leest. **Zeven van de achttien**
catalogusvariabelen ontbraken in `.env.example` zonder dat de poort iets
meldde. Met de oude scanner en een verwijderde sleutel gaf hij een groen
vinkje. Dat groene vinkje wás de blinde vlek — dezelfde soort als de
telwoord-regex van gisteren, één laag naar buiten.

#### Drie blijven liggen, en dat is opzet

Welke providers persoonsgegevens mogen ontvangen; of de failover-aanvulling een
uitgesproken voorkeur mag overrulen; en of de nul-retentiebelofte standhoudt
bij een tweede provider. Alle drie wijzigen een toezegging aan een klant.
Zelfde grens als bij de drie FAQ-antwoorden op `/pricing`: bijstellen verandert
het aanbod.

Ze staan met bewijs en regelnummers in
`docs/audit/AI-PROVIDER-AUDIT-2026-08-21.md` in DEUS-SHARED, naast de vier
eerdere ronden.

**Bij het opschrijven bleek de oplossingsweg al te bestaan.**
`SUB-PROCESSORS.md:57` draagt een checklistregel die zegt dat je bij een nieuwe
provider éérst zijn retentiegedrag bevestigt. Hij is nooit gelopen, want er is
nooit een tweede provider geconfigureerd. Dat kwam boven bij het hertellen: zes
treffers op de term, vijf beloftes en één instructie. Ik had eerst vijf
geschreven zonder het onderscheid te zien.

#### Meting

Alle zeven poorten lokaal, want de Actions-facturering staat stil en de
`gates`-workflow faalt zonder te draaien. tsc 0 · i18n PASS, 4010 sleutels × 5
talen · vitest **2607/2607** in 186 bestanden (was 2603) · launch:check 22 pass
· 0 fail · audit:tenant schoon · be:check PASS · build groen. Na de merge de
boom van main vergeleken met die van de tak: identiek.

#### Erbij op de operator-lijst

> **Achterhaald.** Samengevoegd in "Wacht op de operator" bovenaan dit
> bestand (2026-08-24). Schrijf aanvullingen daar, niet hier.

- **Welke AI-providers mogen persoonsgegevens ontvangen?** Vier kunnen het;
  vijf juridische documenten noemen alleen Anthropic. Volgen de documenten de
  code, of beperkt de code zich tot de documenten? Beide zijn verdedigbaar, en
  P3 hangt aan het antwoord.
- **Mag een platformsleutel automatisch failoverdoel worden** voor een
  organisatie die een andere voorkeur uitsprak? Nu wel, met opzet — maar het
  staat nergens opgeschreven als keuze, en een derde optie bestaat: alleen
  aanvullen met providers die de organisatie zelf configureerde.
- **Houdt de nul-retentiebelofte stand?** Hij is Anthropic-specifiek en is de
  enige mitigatie die de DPIA noemt voor retentie bij de verwerker. Beslis
  eerst de eerste vraag; deze volgt eruit.

### 2026-08-21 (vervolg) — vier baseline-bevindingen nagemeten, en drie ervan klopten niet

De opvolging van de security-baseline van gisteren. Vier punten stonden op de
lijst; bij het hermeten bleek van drie de premisse fout. Dat is het patroon van
deze dag: niet één van de vier is uitgevoerd zoals hij was opgeschreven.

#### PostgREST gaf vier functies weg via PUBLIC, niet via anon

De baseline noemde "zes ongethrottelde anon-RPC's in `diaz_editor`". De ACL's
lazen anders: twee functies droegen `anon=X`, maar álle vier droegen `=X` — en
dat is de PUBLIC-grant, die elke rol erft. Dit is precies
[[feedback_postgrest_rpc_execute_default]], nu ook in
`vbozelswveaxsyccvaac`, waar `diaz_editor` in `db_schemas` staat.

Gemeten vóór het intrekken, met `set role anon`: `validate_license('zzzz')` gaf
netjes `unknown-key` terug. Een werkend orakel dat zonder limiet vertelt of een
licentiesleutel geldig is.

| functie | anon nodig? | gedaan |
|---|---|---|
| `validate_license` | nee — `license-validate/index.ts:108` draait op service_role | ingetrokken |
| `capture_quiz_lead` | nee — nul client-aanroepers | ingetrokken |
| `log_update_event` | **ja** — `electron/main.js:537` | laten staan |
| `capture_newsletter_email` ×2 | **ja** — drie levende clients | laten staan |

**De maatregel die op de lijst stond was rate limiting; de juiste maatregel was
intrekken.** Een limiet op een endpoint dat niemand nodig heeft is een rem op een
deur die dicht kan.

#### De "dubbele" overload was geen duplicaat

De lijst zei: zoek uit welke van de twee `capture_newsletter_email` live is en
drop de andere. Beide zijn live, door verschillende clients — de 8-arg door
`landing/_exit-intent.js` en `_tool-capture.js`, de 4-arg door
`apps/editor/components/TradePicker.tsx`. Droppen had een echte aanroeper
gebroken.

Wat er wél mis was: van de drie plekken die één contract uitdrukken, deed er één
niet mee. De partiële index
(`UNIQUE (lower(email)) WHERE drip_state <> 'unsubscribed'`) en de 8-arg
overload zijn het eens — een afgemelde rij gaat bewust met pensioen. De 4-arg
zocht zonder dat filter, had geen e-mailvorm-controle en geen taalcorrectie,
terwijl `newsletter_subscribers_lang_check` alleen en/nl/es/de accepteert.
Willekeurige tekst kon dus als "adres" de drip-wachtrij in met
`drip_state='day_0'` en `next_send_at=now()`.

Bewezen in een blok dat zichzelf terugdraaide: onzin → `invalid` zonder rij,
`lang=fr` → opgeslagen als `en`, herhaling → `already_subscribed`. Nul rijen
vóór en na.

**Bijna het omgekeerde gedaan.** Mijn eerste migratie voegde een unieke index
toe en haalde het unsubscribed-filter uit de 8-arg, omdat ik dacht een
afmelding-die-zichzelf-terugdraait te zien. Beide fout: de index bestónd al —
ik had alleen `pg_constraint` bekeken, en een los unieke *index* is geen
constraint — en hij is partieel, wat het gedrag tot ontwerp maakt in plaats van
defect. Mijn `ON CONFLICT (lower(email))` zou bovendien gefaald hebben, want die
matcht geen partiële index. **Kijk in de juiste catalogus voordat je "bestaat
niet" concludeert.**

Postgres weigerde de migratie zelf ook, op iets anders: de bestaande functie had
parameter-defaults die ik niet had overgenomen. Vandaar `pg_get_function_arguments`
in plaats van de handtekening reconstrueren.

**Wat er open blijft, en van Juan is:** er is geen double-opt-in, en het ontwerp
staat opnieuw-aanmelden na een afmelding toe. Iemand anders kan dus een afgemeld
adres terugzetten op de lijst. Dat bijstellen verandert een toezegging.

#### Twee routes zonder rem, en één die per verzoek onbeperkt kon fanout'en

De baseline zei "vier van de vijf publieke routes ongethrottled". Het waren er
twee: `log-error` en `vitals` droegen elk hun eigen kopie van een token-bucket.

Het werkelijke gat zat niet in de verzoeken maar per verzoek. De Reporting API
stuurt een array, en `csp-report` deed één `captureMessage()` per element — één
POST met vierhonderd elementen was vierhonderd Sentry-berichten. Een limiet per
IP doet daar niets tegen, want het blijft één verzoek. Zie #206.

#### Een verouderde `.next` laat bestaande API-routes 404'en en nieuwe werken

Kostte de meeste tijd van de dag. Alle vijf de routes gaven 404, inclusief `cal`
die niet was aangeraakt — dus makkelijk te lezen als "mijn wijziging breekt het".
Een verse `app/api/ping/route.ts` gaf 200. Dat verschil is de diagnose: de
dev-server bedient API-routes prima, hij kende alleen deze vijf niet. `.next`
dateerde van de dag ervoor; na `rm -rf .next` gaf csp-report 204 en cal 503.

**Maak een verse route aan voordat je concludeert dat je wijziging iets brak.**
Een 404 op ál je routes is eerder cache dan code.

#### Meting

828 tests in 34 bestanden, was 811 in 33. Typecheck schoon. De vier routes ook
tegen een draaiende server gemeten, niet alleen in tests — `proxy.ts` draait op
`/api/*` en dat is precies de laag die unit-tests niet zien.

### 2026-08-21 (vervolg) — een poort die tool-aanroepen kan weigeren, en het contract dat niemand had opgeschreven

Op alle drie de oppervlakken stonden nul PreToolUse-hooks. Dat is geen
Website-code — de bestanden staan in `~/.claude/hooks/` en de instelling in
`~/.claude/settings.json`, dus buiten elke repo. **Het staat hier omdat een
volgende sessie die een weigering krijgt anders alleen de foutmelding heeft en
geen idee waar hij vandaan komt.**

#### Eerst gemeten, want vier van de zes aannames waren fout

Een sonde die niets blokkeerde en alleen opschreef wat hij binnenkreeg. Wat er
uit kwam:

| aspect | gemeten |
|---|---|
| activering | direct, **geen sessieherstart** |
| matcher | regex met alternatie; raakt ingebouwde tools **én** `mcp__<ref>__<naam>` |
| stdin | `tool_name`, `tool_input`, `cwd`, `permission_mode`, `session_id`, `tool_use_id` |
| weigeren | stdout-JSON `permissionDecision="deny"` → komt binnen als `<error>reden</error>` |
| exitcode 2 | weigert óók, maar komt binnen als **"hook error"** — leest als een kapotte poort in plaats van een besluit |
| crash (exit 1) | **laat het commando doorgaan, volkomen stil** |

Die laatste regel is de reden dat er een hartslag in zit. Een gecrashte poort
meldt niets, dus **geen weigeringen zien bewijst niet dat er bewaakt wordt** —
dezelfde familie als [[feedback_rood_dat_altijd_rood_staat]], maar dan
omgekeerd: niet een alarm dat altijd afgaat, maar een alarm dat stil is
omdat het stuk is. `echo POORT-HARTSLAG` weigert altijd; komt er niets terug,
dan draait de poort niet.

#### Drie regels, elk gekozen omdat een deny-regel hem níét kan uitdrukken

Een hook die de deny-lijst nabouwt is de fout van twee lijsten die hetzelfde
bewaken: ze lopen uit elkaar en dan bewaakt de zwakste. Deze drie passen daar
aantoonbaar niet in.

| | wat | waarom de deny-lijst hem mist |
|---|---|---|
| R1 | `git push … +src:dst` | force-push via refspec draagt geen vlag; een voorvoegselregel kan een refspec niet lezen. Dit is het enige gat dat 19 augustus open bleef staan toen de rest van dat cluster dichtging. |
| R2 | outreach-automatisering | een afspraak, geen commandovorm. Juans woorden: bouw dit als harde code, niet als documentatie — tot nu toe stond het alleen in documentatie. |
| R3 | `drop schema` / `drop database` via `execute_sql` of `apply_migration` | vergt de toolnaam én de inhoud van een parameter tegelijk |

R3 is niet theoretisch. Op 1 augustus is `diaz_editor` gedropt zonder hem uit
Exposed Schemas te halen; PostgREST gaf daarna op de hele REST-API 503
PGRST002 en de leadopvang lag plat.

#### Match op de handeling, niet op het zelfstandig naamwoord

Twee keer ging mijn eigen poort af op mijn eigen werk, en beide keren was dat
leerzaam.

De sonde blokkeerde de bewerking van de sonde, omdat de heredoc die hem schreef
de sentinel letterlijk droeg. **Bewerk de poort met het Write-gereedschap, niet
met een Bash-heredoc.** Dat staat ook in de kop van het bestand zelf.

En de eerste opzet van R2 matchte op het woord `linkedin`. Die zou
`cat project_linkedin_outreach.md` en `grep -ril linkedin` hebben geblokkeerd —
lezen, geen versturen. De werkende vorm eist twee dingen tegelijk: een
netwerkcliënt **én** een berichten-endpoint. Zelfde vorm als R1: `git push`
**én** een refspec, niet het plusteken alleen. Beide valse-treffergevallen
staan als test in de suite, en `grep -ril linkedin` is ook live nagelopen.

#### Bewezen, in beide richtingen, twee keer

23 gevallen in `veiligheidspoort.test.py` — elke regel weigert zijn eigen geval
en laat het buurgeval door — plus dezelfde drie regels nog eens **door het
harnas heen**, want een suite bewijst de logica en niet de bedrading.

Bij de live-proef heb ik voor elke regel een variant gekozen die de poort raakt
maar onschadelijk is als hij faalt: een refspec-push naar een niet-bestaande
remote, een `echo` die het curl-patroon draagt, en een `select` met de woorden
erin. Een echte force-push testen zou precies het ding doen dat de regel moet
voorkomen.

Andere richting ook live: `grep -ril linkedin` gaat door, en
`select count(*) from marketing.leads` gaf gewoon 0.

#### Wat de poort níét dekt, en dat is opzet

- **Koud van warm onderscheiden kan hij niet.** R2 blokkeert en legt uit; de
  afweging blijft bij Juan. Koude e-mail naar Duitsland is alleen gedekt via de
  bulk-verzendtools; één handgeschreven mail is niet als vorm herkenbaar.
- **R3 dekt alleen het MCP-pad.** Een `drop schema` via `psql` vanuit Bash valt
  erbuiten — er staan hier geen inloggegevens voor, dus dat pad bestaat niet.
- **Geen secret-scan op Write/Edit.** Bewust weggelaten: die zou op élke
  bewerking draaien en de valse treffers van deze zomer
  (`YOUR_..._KEY_HERE`, `${...}`) waren talrijker dan de echte.
- **Hij matcht op tekst**, dus hij gaat ook af op een commando dat het patroon
  alleen noemt. Dat is de prijs van deze vorm en hij staat opgeschreven.

De poort staat globaal ingehaakt en de matcher raakt alleen Bash en drie
MCP-toolvormen — niet elke aanroep, dus geen procesopstart per tool. Geen van
de vier oppervlakken had een botsende project-lokale hook;
`diaz-editor-work` heeft project-lokaal `deny=0` en leunt volledig op deze laag.

### 2026-08-21 (vervolg) — de allow-lijst was nog nooit bekeken, en daar zat het echte gat

De deny-lijst is dit jaar drie keer onderzocht: het cluster van 19 augustus, de
tokengrens-les, en vandaag de hook eromheen. De **allow**-lijst nooit, terwijl
die groter is — 131 regels globaal tegen 52 deny. Een te ruime allow-regel is
bovendien stiller dan een ontbrekende deny-regel: er komt geen prompt, dus je
merkt niet dat er iets langsging.

#### Eerst het geruststellende deel

Van de 203 allow-regels over vier oppervlakken zijn er **190 letterlijke
commando's**. Maar dertien dragen een wildcard. Dat is strakker dan de omvang
suggereert.

#### `gh` had nul dekking, op alle vier de oppervlakken

Geen enkele deny-regel noemt `gh`. Tegelijk staat `Bash(gh api:*)` in de
globale allow, en de sleutel draagt `repo` + `workflow`. Geen `delete_repo`,
dus de repo zelf kan niet weg — dat begrenst het. Maar `repo` alleen is genoeg
voor vier dingen die **geen enkele git-regel raakt**:

| via `gh api` | gevolg |
|---|---|
| `PATCH …/git/refs/{ref}` met `force=true` | force-push zónder één `git push` |
| `DELETE …/git/refs/{ref}` | tak weg, `main` inbegrepen |
| `DELETE …/branches/main/protection` | het vangnet uit #183 eraf |
| `PATCH /repos/{o}/{r}` met `private=false` | private repo publiek — geïndexeerd is geïndexeerd |

Alle 22 git-deny-regels én hookregel R1 kijken hier langs, want er komt geen
`git push` aan te pas. En admins zijn niet gebonden aan branch protection, dus
de eerste werkt ook op `main`.

Een deny-regel kan dit niet uitdrukken: `gh api -X DELETE <pad>` en
`gh api <pad> -X DELETE` zijn dezelfde handeling in een andere volgorde, en een
voorvoegselregel ziet alleen de eerste. Het staat nu als **R4** in de poort,
met GET expliciet doorgelaten — `gh api` lezend is dagelijks werk, en zeven van
de dertien nieuwe testgevallen gaan daarover.

#### Drie deny-regels suggereren dekking en doen niets

Onderweg bleek dat er inmiddels drie regels staan die het refspec-gat lijken te
dichten: `Bash(git push origin +:*)` plus dezelfde voor `deus-shared` en
`upstream`. Twee onschadelijke commando's lieten zien dat ze leeg zijn:

```
git push origin +      -> GEWEIGERD  (losse `+`-token, matcht het voorvoegsel)
git push origin +++    -> LIEP GEWOON (token is `+++`, matcht niet)
```

Een echte refspec is één token — `+main:main` — dus zo'n regel raakt hem nooit.
**Dat is erger dan geen regel:** wie de lijst leest ziet `git push origin +:*`
staan en concludeert dat het dicht is. R1 in de poort is de werkelijke
afscherming, en die dekt bovendien elke remotenaam in plaats van de drie die
toevallig zijn opgeschreven.

Ze zijn blijven staan. Een deny-regel weghalen op Juans machine is een
subtractieve wijziging aan zijn instellingen; de vondst hoort in het memo, niet
in een stille verwijdering.

#### Twee wildcards die aandacht verdienen maar geen regel krijgen

- `Bash(npm install:*)` — installeert willekeurige pakketten met
  postinstall-scripts, dus willekeurige code-uitvoering. Het is ook dagelijks
  werk; een verbod zou alles breken en binnen een dag worden uitgezet.
- `Bash(ssh root@skalo-ai.com '…:*)` — een rootshell met wildcard, op een host
  die niet in de GROEN-lijst van `SCOPE.md` staat.

Beide zijn een afweging voor Juan, geen defect dat ik kan repareren.

#### Meting

38 gevallen in de suite, was 23. R4 ook door het harnas heen bewezen: de
weigering tegen een repo die niet bestáát, zodat er niets kon gebeuren als de
poort zou falen, en de doorlaat op een GET die en passant bevestigde dat de
branch protection intact is — zes verplichte checks, force-push uit,
verwijderen uit, PR vereist.

**De les erbovenop:** kijk niet alleen naar wat de deny-lijst verbiedt, maar
naar wat de allow-lijst binnenlaat.

### 2026-08-21 (vervolg) — drie beweringen in één commentaarblok, geen van drieën waar

Verder met de baseline: dependencies en security headers, de twee hoeken die
nog niet waren aangeraakt. De eerste bleek in orde, de tweede leverde de
grootste vondst van de dag op — en die zat niet in de headers maar in de
toelichting erboven.

#### De deps-poort meet wat zijn naam belooft

Nagelopen omdat een groen vinkje dat niemand ooit heeft opengeslagen precies
het soort ding is dat deze week drie keer stuk bleek. Hier niet:
`npm audit` staat op **nul advisories op elk ernstniveau**, productie én dev, en
`security/geaccepteerde-advisories.json` heeft nul uitzonderingen. De poort
draait bovendien in een eigen workflow met een `schedule`, zodat een advisory
die zónder codewijziging verschijnt ook afgaat. Goed gebouwd.

Wel achterhaald: de memory-notitie van 20 juli meldt "27 npm-vulns (4 high)" als
open punt. Dat klopt niet meer; die notitie is bijgewerkt.

#### De headers zijn sterk, en toen viel de toelichting op

HSTS twee jaar met `includeSubDomains` (geen `preload` — een bewuste keuze
waard, geen defect), CSP met `frame-ancestors 'none'`, `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'`, plus een **report-only-policy die
strenger is dan de afgedwongen**.

De toelichting in `proxy.ts` legde uit waarom die twee uit elkaar liggen. Drie
beweringen, alle drie nagemeten op productie, alle drie onjuist.

**1. "`'unsafe-inline'` blijft, want onze JSON-LD hangt ervan af."** Nee. Een
`<script type="application/ld+json">` is een *datablok*: de browser voert hem
nooit uit, dus `script-src` raakt hem niet. Gemeten: vijf blokken zonder nonce,
alle vijf gewoon in de DOM en parsebaar, terwijl de nonce-policy actief was.

**2. `'unsafe-inline'` deed sowieso niets.** Zodra een directive een nonce
draagt negeert de browser hem (CSP2+). Chrome zegt het woordelijk in de
console: *"'unsafe-inline' is ignored if either a hash or nonce value is present
in the source list."* Bewezen met een inline script zonder nonce: geblokkeerd.

De inline-comment bij de nonce zei het omgekeerde — "noop when unsafe-inline is
present". Dat is de zwaarste van de drie, want wie dat leest concludeert dat de
afgedwongen policy nog niets doet, terwijl hij al volledig nonce-gestuurd is.

**3. "Weghalen zou elke pagina dynamisch maken — een grote SSG-regressie."**
Die regressie is er al, om een andere reden. De nonce wordt per verzoek
gegenereerd, dus Next rendert deze pagina's dynamisch: `Cache-Control: private,
no-store` en `x-vercel-cache: MISS` op drie opeenvolgende verzoeken aan dezelfde
pagina. Ook lokaal, dus het is Next en niet Vercel — ter vergelijking geeft
`/llms.txt`, een route zonder nonce-injectie, netjes `x-nextjs-cache: HIT`.

#### Wat er gewijzigd is

`'unsafe-inline'` is uit `script-src` gehaald: hij veranderde niets aan het
gedrag en liet elke scanner terecht afgaan op een policy die in werkelijkheid al
nonce-gestuurd was. `style-src` houdt hem — daar staat géén nonce tegenover en
React zet inline styles. Die asymmetrie is nu opzet in plaats van toeval.

**Er stond geen enkele test op `unsafe-inline`.** Dat is hoe een omgekeerde
toelichting jaren kan blijven staan. Er staan er nu drie, elk met de reden
erbij, en de style-src-poort is er expliciet om te voorkomen dat iemand hem
"opruimt" omdat script-src hem kwijt is — dat sloopt de opmaak van de hele site.

#### Bewezen, niet aangenomen

Twee mutaties, twee keer rood: `unsafe-inline` terug in script-src, en weg bij
style-src. Daarna hersteld uit een kopie in de scratchpad, niet met
`git checkout --` — die herstelt vanuit de index en had het werk teruggezet.

Daarna tegen een echte productiebuild op poort 3200, want een unittest op de
middleware bewijst niet dat de browser het accepteert en de fout-kosten hier
zijn "alle JS dood". `window.next` bestaat, styles toegepast, vijf JSON-LD-
blokken parsebaar, nul console-fouten. Plus een positieve controle: een inline
script zónder nonce werd geblokkeerd, één mét de juiste nonce draaide.

Die controle was nodig omdat mijn eerste poging — een `securitypolicyviolation`-
listener — niets ving. Niet omdat er niets was: het event vuurt asynchroon en ik
haalde de listener synchroon weer weg. **Een lege lijst uit een kapot instrument
leest hetzelfde als een schone meting.**

#### Drie meetvallen onderweg

- De console-buffer van de browser-pane wordt **niet geleegd bij navigatie**. Ik
  las een CSP-fout op twee verschillende pagina's en dacht even dat de site zelf
  een script blokkeerde. Het discriminerende detail: de nonce in beide
  meldingen was identiek, en een nonce hoort per verzoek te verschillen. Het was
  mijn eigen experiment van een pagina eerder.
- Python op Windows opent `/tmp/...` niet, en zijn stdout is cp1252 — allebei
  vandaag opnieuw ingelopen. `C:/...`-paden en `PYTHONIOENCODING=utf-8`.
- Een patch die een heel commentaarblok letterlijk matcht, brak op de
  streepjeslijn in de kop: ik had er drie te weinig overgenomen. Anker op
  inhoud en werk op regelbereik; tekens tellen is hoe je een patch schrijft die
  op de volgende machine weer stukloopt.

#### Wat dit voor Juan open laat

De afweging zelf, en die is echt: een nonce-CSP kost alle HTML-caching. Elke
paginaweergave is een functie-aanroep in plaats van een CDN-hit, op een site
waarvan het hele werk SEO en snelle eerste weergave is. Het alternatief is een
hash-gebaseerde CSP (cachebaar én streng, maar per pagina te berekenen) of de
nonce laten vallen (cachebaar, zwakker). Dat is een architectuurkeuze, geen
defect — hij staat nu in de code opgeschreven met de meting erbij, zodat niemand
hem opnieuw op de verkeerde gronden afweegt.

#### Meting

831 tests in 34 bestanden, was 828. Typecheck schoon, `regen:pricing:check`
groen, productiebuild groen.


### 2026-08-21 (vervolg) — mijn eigen uitzondering van drie dagen oud, en vijf vrijstellingen voor routes die er niet zijn

Twee PR's (#210 en #211). Ze horen bij elkaar: de eerste kwam voort uit het
natrekken van een claim die ik zélf bij #206 had opgeschreven, de tweede uit het
nalopen van de middlewarekant van diezelfde route.

#### De helft van mijn onderbouwing klopte niet

Bij #206 zette ik `/api/cal` op de uitzonderingslijst voor de rem, met als reden
dat "een vreemde niet verder komt dan een vergelijking". `handtekeningKlopt` is
inderdaad in orde — HMAC-SHA256 over de rauwe body, hex, `timingSafeEqual` met
een lengtecontrole ervoor, uitputtend gedekt.

Maar `await req.text()` las de hele body in het geheugen **vóór** die
vergelijking. Een vreemde kwam dus wel verder: hij kreeg een onbegrensde lezing,
op het enige publieke endpoint zonder rem ervoor. Nu `leesBegrensd(req, 256 KB)`
met 413 daarvoor.

#### Eén uitzonderingslijst deed twee dingen

Dit is de vondst die het waard is te onthouden. In `verzoeklimiet.test.ts` stond
in de test *geen route leest de body meer onbegrensd in*:

    if (ZONDER_REM[pad]) return false

`ZONDER_REM` is de lijst voor de **rem**. Hij ontsloeg de route stilzwijgend óók
van de **body-plafondcontrole** — twee verschillende zorgen op één lijst,
waardoor de tweede controle uitstond voor precies de ene route die erop stond.
De poort die het defect had moeten zien was door de uitzondering zelf
uitgeschakeld.

`ZONDER_REM` en `ONBEGRENSDE_BODY` staan nu los. Die tweede is leeg, en dat hoort
zo: hij bestaat zodat een toekomstige uitzondering niet opnieuw meelift.

#### Twee meetlatten die zelf stuk waren

De rem-poort matchte op de module-import `@/lib/verzoeklimiet`. Zodra cal
`leesBegrensd` uit diezelfde module haalt, zou hij als geremd gelden terwijl hij
dat bewust niet is — de poort zou precies de route missen waar hij over gaat. Nu
matcht hij op `maakLimiet`, de rem zelf.

De body-poort ging af op mijn eigen commentaarregel die uitlegt waarom
`req.json()` daar niet gebruikt wordt. **Derde keer deze sessie dat een tekstscan
op prose viel** (na `contactadressen` en `persoon-entiteit`), maar de eerste keer
dat de comment juist was en de meetlat niet. Er staat nu een commentaarstrip
voor, met een eigen test die bewijst dat hij geen echte aanroep verbergt — anders
is een lege overtreedslijst niet te onderscheiden van een kapot instrument. De
strip raakt bewust geen inline `//`-staarten: een `'https://…'` in een
stringliteral zou dan de rest van de regel wegknippen, en dát is een gemiste
aanroep.

#### De route had helemaal geen test

`cal-webhook.test.ts` test de helper, niet de handler. Daarom kon de claim uit
#206 ongemeten blijven staan: de vólgorde in de route was door niets gedekt.
`app/api/cal/route.test.ts` roept `POST` nu rechtstreeks aan, met een
Supabase-client die gooit — elk pad hoort te eindigen vóór de database, dus een
pad dat er toch komt is luid in plaats van stil.

Twee gevallen dragen het bewijs. Een te grote body met een **geldige**
handtekening geeft 413 (stond het plafond ná de HMAC, dan kwam dit verzoek door
en was de test groen om de verkeerde reden), en van 64 stukjes worden er hooguit
5 opgehaald. Plus een geldig ondertekende body die tot 400 komt, want een route
die álles met 413 beantwoordt zou alle andere tests halen.

#### PR #211 — vijf vrijstellingen voor routes die er niet zijn

Bij het nalopen van `proxy.ts` bleek de CSRF-vrijstellingslijst negen regels te
tellen. Gemeten tegen de bestandsboom staan er onder `app/api` nog vijf routes;
vijf lijstregels wezen naar niets:

| pad | stand |
|---|---|
| `/api/sms/webhook` | weg met #134 |
| `/api/webhooks/inbound/` | weg met #134 |
| `/api/v1/` | weg met #134 |
| `/api/auth/` | weg met #138 |
| `/api/health` | weg met #134 |

De middelste vier waren **naamruimtes**, en dat is het vervelendste soort dode
uitzondering: hij doet vandaag niets en morgen te veel. Een toekomstige
`/api/auth/…` zou vanaf zijn eerste dag de Origin-controle overslaan zonder dat
iemand die keuze maakte — en de site hád auth-routes tot #138, dus dat is
concreet en niet theoretisch.

**En de match was een voorvoegselmatch**: `pathname === p || pathname.startsWith(p)`.
Daarmee dekte `/api/cal` ook `/api/calculator` en `/api/calendar`. Op een site
met `/tools/energy-roi` is dat geen gezochte naam. Dezelfde klasse als de
deny-regels van 19 augustus — zie [[feedback_deny_matcht_op_tokengrens]].

Nu exact, in een eigen module (`lib/csrf-vrijstelling.ts`), want een
middlewarebestand in Next hoort alleen `default` en `config` te exporteren en een
lijst die een poort moet uitlezen kan daar dus niet staan. Zelfde reden waarom
`MAX_BYTES` niet uit de route te exporteren was.

#### Opnieuw hield een test het defect op zijn plek

`proxy.test.ts:186` asserteerde dat juist die vijf paden CSRF-vrijgesteld
**waren**. De routes waren al maanden weg; de test verdedigde hun vrijstelling.
Dezelfde vorm als de `Hotellerie`-assertie in `tags.test.ts` van gisteren. Hij is
niet aangepast maar omgekeerd: de routes die er nog zijn blijven vrijgesteld, de
vertrokken vrijstellingen geven 403, en een naam die alleen een voorvoegsel deelt
lift niet mee.

#### Een mutatie die stil niet landde

Negen mutaties over de twee PR's, elke verwachte kleur vooraf vastgelegd. Dat
laatste betaalde zich uit: de mutatie die de commentaarstrip moest slopen liep
**groen**, en dat las als een zwakke poort. Het was iets anders — het patroon
overspande een regeleinde en dit is een CRLF-repo, dus de vervanging deed niets.
Met een enkelregelig anker alsnog rood.

**Een mutatie die stil niet landt leest exact hetzelfde als een poort die niet
afgaat.** Sindsdien eist het mutatiescript dat het bestand aantoonbaar verandert.

Beslissend was de mutatie die met `req.text()` terug én de oude vermenging terug
volledig groen liep: dat reproduceert het defect precies zoals het bestond.

#### En de meter had een vaste offset

De nieuwe route-test telt hoeveel stukjes van de body werkelijk worden opgehaald.
Hij stond op 1 terwijl de route nog niets had gelezen — een `ReadableStream`
trekt bij aanmaak zelf al één stuk binnen om zijn buffer te vullen
(highWaterMark 1). Ik las dat bijna als een defect in de route. `highWaterMark: 0`
haalt de offset weg.

#### Gemeten op productie, ná controle van de deploy-SHA

De eerste peiling gaf "success" bij de eerste poging, en dat was de deploy van
#210 — niet die van #211. Bijna de verkeerde build gemeten. Pas doorgemeten toen
de productie-SHA gelijk was aan `main`:

| verzoek | uitkomst |
|---|---|
| `POST /api/cal`, `Origin: https://cal.com` | **503**, niet 403 — vrijstelling werkt nog |
| `POST /api/health`, vreemde Origin | 403 |
| `POST /api/v1/contacts`, vreemde Origin | 403 |
| `POST /api/auth/callback`, vreemde Origin | 403 |
| `POST /api/calculator`, vreemde Origin | 403 — voorvoegsel-lek dicht |
| `POST /api/newsletter/confirm`, vreemde Origin | 403 — controle |

#### Wat die 503 betekent, en dat is geen defect van deze PR

De body is `{"ok":false,"error":"not-configured"}`. Dat is de tak voor een
ontbrekende `CAL_WEBHOOK_SECRET`, dus die staat niet in Vercel-productie. **Als
cal.com een boeking post, krijgt hij 503 en komt er geen rij in
`marketing.leads`** — geen Telegram, geen ontvangstbevestiging. De boeking zelf
staat wel gewoon in cal.com, dus er gaat geen afspraak verloren; het spoor gaat
verloren.

Wat hier níet uit volgt: of cal.com de webhook überhaupt aanroept. Dat is van
buitenaf niet te zien. De leadketen-test van 20 augustus liep via het
**contactformulier**, niet via dit pad — de boekingsweg is nog nooit
end-to-end gelopen.

#### Meting

845 tests in 36 bestanden, was 831 in 34. tsc schoon, `regen:pricing:check`
groen, productiebuild groen.

#### Niet meegenomen

`lib/sentry.ts:59` filtert nog verzoeken aan `/api/health` uit de rapportage.
Die route bestaat niet meer, dus die tak is dood — maar het is een
rapportagefilter en geen beveiligingsregel, en hoorde niet in een CSRF-PR.

#### Erbij op de operator-lijst

> **Achterhaald.** Samengevoegd in "Wacht op de operator" bovenaan dit
> bestand (2026-08-24). Schrijf aanvullingen daar, niet hier.

- **`CAL_WEBHOOK_SECRET` in Vercel-productie zetten**, en daarna nakijken of
  cal.com de webhook werkelijk aanroept. Gemeten op 2026-08-21: het endpoint
  antwoordt `{"ok":false,"error":"not-configured"}`. Zolang dat zo is levert een
  boeking geen rij in `marketing.leads` op, en dus geen Telegram en geen
  ontvangstbevestiging — terwijl "Boeking 15min" de hoofd-CTA van de site is.
  Dezelfde vorm als de ontbrekende `RESEND_API_KEY`: de keten is gebouwd,
  getest en donker door één ontbrekende waarde.


#### PR #213 — het voorbeeldbestand beschreef het CRM, en miste de sleutel die donker stond

Nagelopen omdat de vorige meting één vraag openliet: waarom is
`CAL_WEBHOOK_SECRET` nooit gezet? Het antwoord staat niet in Vercel maar in de
repo — hij stond niet in `.env.example`, het bestand dat je erbij pakt.

Gemeten klopte dat bestand in geen van beide richtingen:

| | aantal |
|---|---|
| gelezen door code, niet gedocumenteerd | 13 |
| gedocumenteerd, nergens gelezen | 27 |

Die 27 zijn het CRM dat met #134/#138 vertrok: Prisma's `DATABASE_URL`,
`NEXTAUTH_*`, vier `STRIPE_*`, vier `TWILIO_*`, vijf agenda-OAuth-variabelen,
`CRON_SECRET`, `FIRECRAWL_API_KEY` en de rest. Geen ruis: wie de lijst afwerkt
zet sleutels voor een systeem dat hier niet meer woont, en `NEXT_PUBLIC_CAL_URL`
beloofde een terugval op mailto die niet bestaat — de boekingslink is een
constante in `lib/booking.ts`.

**Waarom geen scanner de sleutel zag.** De route las hem als
`process.env[SECRET_ENV]`. Dat compileert prima, werkt prima, en draagt geen
naam die een tekstscan kan vinden. Exact dezelfde blinde vlek als
`2.envExampleDrift` in DEUS-SHARED, die ik een dag eerder repareerde: die
matchte op `process.env.X` terwijl de providercatalogus `envVar: '…'`
declareert, en zeven van achttien variabelen ontbraken zonder één melding.
Twee repo's, dezelfde dag, hetzelfde mechanisme.

De indirectie is weg. Voor `NEXT_PUBLIC_*` zou hij bovendien een echt defect
zijn — Next vervangt alleen letterlijke uitdrukkingen bij het bouwen, en de kop
van `lib/supabase/keys.ts` waarschuwde daar al voor.

**De poort** (`lib/env-voorbeeld.test.ts`) bewaakt beide richtingen plus de
indirectie: elke gelezen variabele staat gedocumenteerd, elke gedocumenteerde
wordt gelezen, en niets leest via `process.env[…]`. Platform-variabelen
(`NODE_ENV`, `NEXT_RUNTIME`) staan met reden op een uitzonderingslijst — ze
horen niet in het bestand, want een lezer die ze daar ziet gaat ze zetten.
Testbestanden tellen niet als afnemer.

**De commentaarstrip is verhuisd** naar `lib/bronscan.ts`. Ik schreef hem
diezelfde middag voor de body-poort; deze poort heeft hem ook nodig, want de kop
van `keys.ts` noemt `process.env.NEXT_PUBLIC_X` als voorbeeld. Twee kopieën van
dezelfde strip lopen uiteen en dan bewaakt de zwakste.

**Vier mutaties, vier keer rood.** De sprekendste is bracket-toegang terugzetten:
de sleutel is dan meteen weer onzichtbaar en geldt als "gedocumenteerd maar
nergens gelezen" — precies de staat waarin hij maanden stond.

854 tests in 38 bestanden, was 845/36.

**En de leadtabel is leeg.** `marketing.leads` telt nul rijen, ook historisch,
en nul met `source like 'cal%'`. Daarmee is niet te onderscheiden of er geen
boekingen waren of dat er wel geboekt is en de webhook 503 gaf. Dat onderscheid
kopen kost één omgevingsvariabele.

### 2026-08-21 (vervolg) — de sweep over twee databases, een endpoint dat openstond, en vijftien runs rood die niemand las

De baseline afgemaakt over beide Supabase-projecten in scope, plus PR #215. De
rode draad is dezelfde als de rest van de week: bijna elk instrument dat ik
aanraakte gaf eerst een schoon ogende nul, en vier keer was die nul een defect
in de meter.

#### De database-kant: veel goed, en één ding dat verkeerd gelezen werd

`get_advisors` op `wbgiouuifqhasedncysw` gaf 116 bevindingen: 0 ERROR, 9 WARN,
107 INFO. Die 107 zijn allemaal `rls_enabled_no_policy`, en dat leest als een
waarschuwing terwijl het een slot is — RLS aan zonder policy weigert alles
behalve voor rollen met BYPASSRLS.

| schema | tabellen | RLS aan | zonder policy | bereikbaar via PostgREST |
|---|---|---|---|---|
| `public` | 118 | 118 | 104 | ja |
| `marketing` | 2 | 2 | 0 | ja |
| `outreach` | 3 | 3 | 3 | **nee** |

Nul tabellen met RLS uit. De 104 in `public` zijn de DEUS-tabellen (PascalCase,
Prisma) en staan dus dicht; de 3 in `outreach` zijn helemaal onbereikbaar.

**`anon` heeft in de hele blootgestelde oppervlakte precies twee rechten:**
INSERT op `marketing.leads` en op `marketing.subscribers`, elk met één
bijpassende policy, allebei INSERT-only met `WITH CHECK (true)` en géén
`USING`. Wie de publishable key uit de bron plukt kan een lead indienen en zich
inschrijven, meer niet. Geen SELECT, nergens.

`current_org_id()` is nagelopen omdat vijftien `phily`-policies er volledig op
leunen: hij leidt af uit `auth.uid()`, heeft een vastgezet `search_path` en is
`STABLE`, waardoor de `WITH CHECK` bij een UPDATE tegen de oude waarde
vergelijkt en een gebruiker zichzelf niet naar een andere organisatie kan
schrijven. Niet door de client te beïnvloeden.

**Storage:** `uploads` op wbgio staat **privé** met nul policies — alleen
service_role. Dat sluit een operatoritem dat sinds 2026-08-12 openstond. Op
vbozel staan twee publieke buckets (`content-vault` leeg, `yt-shorts` 62
objecten, geen limiet, geen mime-beperking); publiek lezen is voor uitgaande
video verdedigbaar, publiek schrijven kan niet omdat `storage.objects` RLS aan
heeft met nul policies. Wel dit weten: de standaard Supabase-grants geven `anon`
TRUNCATE op `storage.objects`, en **RLS dekt TRUNCATE niet**. Onbereikbaar hier
omdat `storage` in geen van beide projecten in `db_schemas` staat — maar het is
de vorm die elders wél bijt.

#### PR #215 — de kaart zonder bestemming bleef een link

Lighthouse CI stond op main vijftien runs achter elkaar rood, altijd hetzelfde:
SEO 0,92 op `/en` tegen een drempel van 0,95, drie runs per keer alle drie
0,92. Deterministisch, en niemand las het meer.

Bisect gaf een exacte grens:

    2026-08-19T12:14  SUCCESS  fix(sec): de afweer tegen null-bytes en zijn test
    2026-08-20T11:27  FAILURE  fix(ventures): Philly droeg een adres dat niet bestaat

PR #188 haalde terecht `philly.juandiazllc.com` weg en maakte `href` nullable,
maar liet `<a href={v.href ?? undefined}>` staan. React laat het attribuut dan
weg en er blijft een kale `<a>` over — Lighthouse' `crawlable-anchors`.

Het SEO-effect is klein; het toegankelijkheidseffect is groter. Een anchor
zonder href krijgt geen linkrol en is niet met het toetsenbord bereikbaar,
terwijl hij er identiek uitziet als zijn vier buren. Nu is het een `<div>`; de
CSS hangt aan `.v-card` als klasse en niet aan `a.v-card`, dus visueel
verandert er niets (gemeten: 1185×420, gelijk aan de brede Voltafy-kaart).

De poort is `controleerAnkers` in `lib/seo/audit.ts`, aangesloten in
`auditPagina`, zodat hij de hele site dekt in plaats van deze component.
**Fragmentlinks tellen bewust niet mee** — de skip-link `<a href="#main">` staat
op elke pagina en is een geldige, bereikbare link; zou die meetellen, dan meldt
de audit 176 valse treffers en wordt de controle binnen een week uitgezet. Eén
van de vijf tests eist dat de controle daadwerkelijk in `auditPagina` zit,
anders kan hij bestaan en nergens worden aangeroepen.

Gemeten op een productiebuild in vier talen: 45 anchors, **0 zonder href**, vier
v-cards als `<a>`, de vijfde als `<div>`. Daarna groen op main —
**de eerste geslaagde Lighthouse-run in zestien pogingen.**

#### Het endpoint dat openstond

Tweeënvijftig edge functions over de twee projecten, en op één na staan ze
allemaal op `verify_jwt: false`. Dat is grotendeels terecht — een Stripe-webhook
kan geen Supabase-JWT dragen — maar het betekent dat de poort per functie in de
code moet zitten. Dus gelezen in plaats van geteld.

`lead-notify` is **fail-open**:

```js
if (LEAD_NOTIFY_SECRET) { ...401... } else { console.warn('endpoint is open') }
```

`diaz-release-blast` doet het omgekeerde en valt dicht bij een ontbrekende env.
Beide zijn drie regels. Het verschil is of een ontbrekende configuratie leidt
tot "niemand mag" of "iedereen mag".

**Bewezen zonder één bericht te versturen.** De auth-controle staat vóór de
JSON-parse en de verzendingen staan erna, dus een POST met ongeldige JSON en
zonder auth-header scheidt de gevallen: `401` = dicht, `400 invalid-json` =
open. Gemeten: 400.

Vandaag kost dat Telegram-spam. Zodra `RESEND_API_KEY` gezet wordt — dat staat
op de operatorlijst — wordt het een mailkanaal vanaf het eigen domein. **Zet
`LEAD_NOTIFY_SECRET` dus eerst.**

`lead-acknowledge` is juist voorbeeldig: die wist dat de poort openstond en is
eromheen gebouwd — ontvangeradres uitsluitend uit de database, onbekend id
verstuurt niets, al bevestigde rij idempotent overgeslagen, `@resend.dev` als
afzender geweigerd. Was het adres uit de envelop gekomen, dan was dit een open
mailrelay geweest.

**Twee commentaren klopten niet**, allebei van de klasse die hier het meest
oplevert. `notify_new_lead()` beweert dat de twee sleutels "in either order"
aan kunnen; zet je de functiesleutel eerst, dan stuurt de trigger nog niets mee
en valt élke melding op 401 — stil, want `net.http_post` is asynchroon en de
fout landt in `net._http_response`. En de kop van `lead-acknowledge` zegt dat de
sleutel niet in de vault staat, terwijl `lead_notify_secret` er sinds
2026-08-16 wél in staat. Dat laatste maakt de reparatie triviaal: de
triggerkant is al klaar.

#### Tien dode functies op het verkeerde project

`diaz_editor` bestaat niet meer op `wbgiouuifqhasedncysw` — gedropt op 1
augustus. Toch staan er tien `diaz-*` edge functions ACTIVE en publiek die naar
dat schema wijzen, op versie 4–11, terwijl de onderhouden versies op vbozel op
27–36 staan. Supabase injecteert `SUPABASE_SERVICE_ROLE_KEY` in élke functie
van een project, dus dat zijn tien onbeheerde publieke endpoints met een sleutel
die RLS omzeilt — op het project dat `marketing.leads` en de 118 CRM-tabellen
draagt.

Binnen vbozel staat het bovendien nog vijf keer dubbel (`diaz-license-issue`
naast `license-issue`, enzovoort), alle vijf op 3 augustus vanaf een
CI-runner uitgerold. Exact de vorm uit `feedback_documentatie_is_de_aanroeper`:
een webhook wordt van buiten de repo gebeld, dus een slug-mismatch is
onzichtbaar voor elke controle die alleen eigen code leest.

**Niets verwijderd.** Een uitgerolde functie weghalen is onomkeerbaar en naar
buiten gericht, en de Lemon- en AppSumo-configuratie is van hieruit niet te
lezen.

#### Stripe: twee accounts, 25 sessies, nul betaald

Twee accounts, allebei "Juan Diaz, LLC". Het gebruikte account wijst zijn
webhook **correct** naar vbozel/`diaz-stripe-webhook`; het tweede heeft nul
webhooks en nul sessies en slikt dus geen betalingen stil op.

De betaalketen opnieuw aan de bron gemeten: **25 checkout-sessies tussen 9 mei
en 20 augustus, nul betaald** — zes open, negentien verlopen, allemaal
`unpaid`. Elf meer dan bij de meting van 1 augustus. De melding is niet het
probleem; de betaalstap zelf is het.

#### Vier keer brak de meetlat

1. De regex over de advisor-details matchte niets van 107, omdat het detail een
   **geëscapete backtick** draagt. Eerst 0 treffers, na een halve reparatie 12,
   pas de derde versie gaf 107.
2. `current_setting('pgrst.db_schemas')` gaf `public, graphql_public,
   diaz_editor` — de instelling van de **postgres**-rol, want `execute_sql`
   verbindt als postgres. PostgREST leest die van `authenticator`, en daar staat
   `public, graphql_public, marketing`. Dat draaide de conclusie volledig om.
   **Deze stond al correct in `feedback_drop_schema_breekt_postgrest`**, sinds
   16 augustus; ik ben er alsnog in getrapt door `current_setting()` te
   vertrouwen.
3. Een grep op `USING(true)` gaf achttien treffers in diaz_editor, alle achttien
   op `service_role` — een rol die al BYPASSRLS heeft, dus die policies openen
   niets. Niet de expressie is het signaal maar het paar (rol, expressie).
4. Twee lege uitkomsten waren pas een meting nadat de omgekeerde query bewees
   dat het instrument kón vinden (118 rijen).

#### Meting

859 tests in 38 bestanden, was 854/38. Zes verplichte checks groen, Lighthouse
groen. Eén hapering: `lib/contactadressen.test.ts` valt op een **koude**
vite-cache om met `Test timed out in 5000ms` (108 s transformkosten koud tegen
13 s warm) en loopt los in 776 ms. Zelfde klasse als de metadatapoort in #182 —
de assertie meet wachttijd in de worker-pool, niet wat hij hoort te meten. In
CI vuurde hij niet (24 s). Niet gerepareerd, wel echt.

#### Erbij op de operator-lijst

> **Achterhaald.** Samengevoegd in "Wacht op de operator" bovenaan dit
> bestand (2026-08-24). Schrijf aanvullingen daar, niet hier.

- **`LEAD_NOTIFY_SECRET`** zetten in Supabase → Edge Functions → Secrets, met
  dezelfde waarde als `lead_notify_secret` in Database → Vault. Dat sluit
  `lead-notify` én `lead-acknowledge`. **Doe dit vóór `RESEND_API_KEY`.**
- **Leaked-password protection** aanzetten op `wbgiouuifqhasedncysw` — de enige
  WARN uit de advisors die actie vergt.
- **Beslissen over de tien dode `diaz-*` functies** op wbgio en de vijf dubbele
  slugs op vbozel. Controleer eerst of Lemon/AppSumo er niet nog op wijzen.
- **Het tweede, lege Stripe-account** sluiten of labelen.
- Optioneel, hygiëne: `revoke execute on function public.handle_new_user(),
  public.notify_new_lead(), public.rls_auto_enable() from public, anon,
  authenticated;` — de drie zijn meetbaar niet aanroepbaar via RPC
  (`0A000: trigger functions can only be called as triggers`), dus dit is
  opruimen en geen reparatie.

#### Twee stukken schuld die vandaag zichtbaar werden

1. **`components/sections/Ventures.tsx` draagt een eigen VENTURES-array** naast
   `lib/ventures.ts`. De poort `lib/ventures.test.ts` leest de tweede en dekt
   dus niet wat de homepage werkelijk toont. Dezelfde vorm als #199, waar
   `llms.txt` de claim nog droeg die #188 net had weggehaald. Zolang dat zo is
   kan de homepage opnieuw iets beweren wat een gate elders al verboden heeft.
2. **`ventures.status.soon` luidt in het Nederlands "In productie".** Dat leest
   even goed als "draait live" en staat op de kaart die juist zegt dat er nog
   niets te bezoeken is. Kopij-vraag, raakt vier talen, niet in deze PR
   meegenomen.
> **Bijgewerkt 2026-08-21 — beide gesloten in #217.** De dubbele lijst is weg
> (de kaarten komen nu als prop vanaf de servercomponent, met een tekstscan-poort
> eromheen) en het Nederlandse label luidt "In aanbouw". Zie de sessie hieronder;
> daar staat ook waarom de voor de hand liggende reparatie van de eerste 40 KB
> proza naar de browser zou hebben gestuurd.

### 2026-08-21 (vervolg) — de twee stukken schuld hierboven, en een meter die CR niet ziet

PR #217 sluit de drie punten die aan het eind van de vorige sessie gemarkeerd
stonden. Ze bleken één patroon te delen: elk is een plek waar de code iets
beweert dat ergens anders al weerlegd is.

#### De naïeve fix zou 40 KB proza naar de browser hebben gestuurd

`components/sections/Ventures.tsx` droeg zijn eigen VENTURES-array naast die in
`lib/ventures.ts`, met adres en statusvlag erin. De voor de hand liggende
reparatie — importeer gewoon `VENTURES` — is fout, en niet op een subtiele
manier: dat component draagt `"use client"`, dus het hele bestand reist mee in
de homepage-bundel. 654 regels verhaal, fases en metrics in vier talen, voor
vier velden per kaart. Tree-shaking helpt niet, want `VENTURES` is één
aaneengesloten literal.

**Gemeten met twee volledige builds, niet aangenomen:**

| variant | client-chunks | venture-proza in client |
|---|---|---|
| prop vanaf de server | 1.134.682 B | nee |
| de naïeve import | 1.174.365 B | ja, `chunks/0ajm89qakwrdi.js` |

+39.683 bytes ongecomprimeerd, ~3,5% van alle client-chunks. **De absentie is
bewezen vindbaar**: dezelfde grep op dezelfde marker vindt hem wel in
`.next/server/`. Zonder die positieve controle is "niet gevonden" niet te
onderscheiden van een kapot zoekcommando.

Het loopt nu via de server. `ventureKaarten()` levert `{slug, live, domain,
external}`; `app/[locale]/page.tsx` is een servercomponent en geeft dat door als
prop. Het component importeert alleen het type, en dat is bij het compileren
weg. Wat er blijft staan is opmaak — onder welke dict-sleutel de kopij hangt en
of de kaart over twee kolommen loopt. Geen feit over het product.

#### "In productie" betekende het omgekeerde

Op de Philly-kaart stond in het Nederlands "In productie". In softwarecontext
leest dat als "draait in productie" — precies wat die kaart ontkent, en het
stond naast vier kaarten die "Live" zeggen. Nu "In aanbouw". De andere drie
talen deden het al goed: Shipping, Kommt, Próximamente.

**Een test kan niet zien of Nederlands klopt**; dat was de leesbeurt van
gisteren. Wat hij wél mechanisch bewaakt is deze ene klasse — een status-badge
die het tegenovergestelde belooft van de status die hij draagt — via een
woordenlijst per taal met de reden erbij. De lijst draagt een positieve
controle: het live-label moet er in elke taal wél op vallen, anders is de lijst
vacuüm en slaagt de poort altijd.

Blijft staan als observatie, niet als defect: het Duitse "Kommt" is als
status-badge ongebruikelijk Duits (`Demnächst` of `In Arbeit` ligt meer voor de
hand), maar het is niet misleidend — het zegt niet dat het ding draait. Buiten
de klasse die deze poort bewaakt.

#### Sentry filterde een route die niet bestaat

`beforeSend` gooide meldingen weg voor `/api/health`, vertrokken met #134.
Nagetrokken over álle getrackte bestanden: dit was de laatste levende
verwijzing. De rest is historische documentatie plus de gate uit #211, die juist
bewaakt dát de route 403 geeft.

#### De poort leest tekst, geen module — en dat is het hele punt

`components/sections/Ventures.test.ts` is een tekstscan, net als
`ResultsStrip.test.ts`. Een module-import zou een tweede lijst die ernáást staat
niet eens kunnen zien, en dat was nu juist het defect. Hij eist: geen URL of
domeinnaam in het component, geen eigen statusvlag, geen runtime-import van
VENTURES, een opmaaktabel die exact de slugs uit `VENTURES` dekt, en dat de
pagina de kaarten ook werkelijk doorgeeft. Die laatste koppelt de poort aan de
echte pagina in plaats van aan een component dat los van alles correct is.

Zes mutaties, zes keer rood, elk met precies één falende assertie. Elke mutatie
eiste dat het bestand aantoonbaar veranderde — een mutatie die stil niet landt
leest exact hetzelfde als een poort die niet afgaat.

#### grep is hier geen CR-detector

`grep -c $'\r$'` meldde **0** CR voor `lib/ventures.ts`, een bestand met 691
CRLF. Eerder diezelfde sessie meldde hij **102** CR voor `app/[locale]/page.tsx`,
een bestand met nul. Twee keer fout, in beide richtingen; `sed | cat -A` toont
om dezelfde reden geen `^M`. De MSYS-tools normaliseren regeleinden vóór het
matchen.

Op dat verkeerde cijfer schreef ik op dat `page.tsx` gemengde regeleinden droeg.
Python op de rauwe bytes zei het tegendeel: puur LF.

**Dat is geen cosmetiek.** PR #191 ging over `regen:pricing:check`, die op
Windows permanent rood stond op precies deze klasse. Die beoordelen met een
CR-blinde meter is hoe je een verkeerde fix scheept. Meet regeleinden met
`d.count(b'\r\n')` tegen `d.count(b'\n')`, en met niets anders.

Bijvangst: `git checkout --` schrijft bij `core.autocrlf=true` een LF-bestand
als CRLF terug. Een mutatiepatroon met `\n` dat de eerste ronde matchte, matcht
de tweede niet meer. Maak vervangingen regeleinde-agnostisch.

#### En `git add -A` is te grof in deze repo

Er staan drie langlopende ongetrackte scratch-mappen (`_3dcap/`,
`diaz-editor-gtm/`, `migrations-review/`). `git add -A` vóór de mutatieronde
stageerde ze in één klap mee, inclusief zeven PNG's en een map met eigen
`node_modules`. Teruggedraaid met `git reset -- <map>`; stage expliciete paden,
of controleer direct `git diff --cached --name-only`.

#### Meting

871 tests in 39 bestanden, was 859/38. tsc schoon, `regen:pricing:check` groen,
productiebuild groen en de chunks byte-identiek aan de basislijn na herstel.

Op een productiebuild in alle vier de talen, in de geserveerde HTML én in de
DOM: 5 kaarten, `A,A,A,A,DIV`, 45 ankers waarvan 0 zonder href, vier domeinen en
Philly zonder, statuslabels Live×4 plus per taal Shipping / In aanbouw / Kommt /
Próximamente. De Philly-`<div>` meet 1185×420, gelijk aan de brede
Voltafy-kaart, dus de opmaak is ongewijzigd. Geen horizontale overloop.

Eén CSP-fout in de console kwam van mijn eigen injectie, niet van de site: alle
vijf de nonce-loze inline scripts zijn `application/ld+json` — datablokken die
de browser nooit uitvoert — en elk uitvoerbaar script draagt een nonce. Zelfde
conclusie als #209, en opnieuw pas getrokken ná meten in plaats van ervoor.

### 2026-08-22 — nul opvang met het aas al op de plank, en drie meters die iets anders zeiden dan er op stond

PR #221, plus #220 die er als losse taak uitrolde. De aanleiding was een vraag om
een leadmagneet. Bij het meten bleek dat de verkeerde vraag: er is geen
leadmagneet-probleem maar een opvang-probleem.

#### Het aas lag er al, de fuik niet

| | stand, gemeten 2026-08-22 |
|---|---|
| nieuwsbriefformulier | bestaat, staat op **één** pagina (`/insights`) |
| `marketing.subscribers` | **0 rijen, ooit** |
| `marketing.leads` | **0 rijen, ooit** |
| dubbele opt-in (`app/actions/newsletter.ts`) | dood — `newsletter_subs` bestaat in geen schema, én geen Resend-sleutel |
| `/tools/energy-roi` | bestaat, **ongegate**, vangt niets |
| artikelen | 21, waarvan 13 op 2026-07-20 |
| bezoekerscijfer | onbekend — geen Plausible-doelen, geen sleutel |

Dat laatste is geen detail: **nul opvang is niet te onderscheiden van nul
bezoek.** Elke uitspraak over conversie in `docs/lead-magnet.md` staat daarom
als verwachting opgeschreven, niet als voorspelling.

#### Wat er gebouwd is, en wat er bewust niet in zit

`/nl/tools/lekkage-scan` — vijftien ja/nee-vragen in vier blokken, elk blok
gespiegeld aan een bevestigde uitkomst uit `docs/claims.md`. De uitslag is geen
cijfer op tien maar de drie dingen die het eerst lekken, in volgorde.

**Geen e-mailveld.** Een leadmagneet is een belofte die per e-mail wordt
ingelost, en `RESEND_API_KEY` staat niet gezet. Een veld dat vandaag een PDF
belooft levert iedereen die converteert niets — dat is slechter dan geen
leadmagneet, want je verbrandt precies het publiek dat je net verdiende en je
ziet het niet gebeuren. De opvang loopt via `/contact?interest=lekkage-scan`,
en die keten is getest.

**Geen bedrag.** Een voorspelde besparing kent het bedrijf niet. Een gate scant
wat de bezoeker leest, mét een positieve controle dat het patroon werkelijk
afgaat — anders is een lege overtreedslijst niet te onderscheiden van een kapot
instrument.

**Eén vraag staat omgekeerd.** Bij D2 telt *ja* als lek. Vijftien vragen waarbij
nee altijd slecht is vult iemand op de automatische piloot in; dan meet je
aandacht en niet de stack.

#### `ENKELE_TAAL` — het begrip dat ontbrak

De pagina bestaat alleen op `/nl`; alle vier de bevestigde engagements zijn
NL/BE, dezelfde keuze als bij het saldering-cluster. Twee poorten hebben dat
feit nodig: `app/sitemap.ts` (die had het begrip al, als `locales?: Locale[]`)
en `metadata-locales.test.ts` (die het niet had, en eist dat titel en
beschrijving per taal verschillen — onmogelijk bij een pagina die in de andere
drie talen 404't).

Die twee als losse lijsten opschrijven is de bugklasse die dit logboek het
vaakst raakt. Vandaar `lib/i18n/enkele-taal.ts` als enige bron, en een gate die
drie dingen eist: de pagina bestaat, hij **404't werkelijk** buiten zijn taal,
en de sitemap zegt precies hetzelfde. Zonder die 404-eis is de lijst een
achterdeur om een onvertaalde vierstalige pagina te verstoppen.

**De uitzondering in de metadata-poort is smal, en dat is te meten.** Die
overslaat één assertie; de twee andere lussen in dat bestand (titellengte,
og:image) dekken de nieuwe pagina gewoon. Dat verklaart waarom de telling met 26
steeg en niet met de 24 die ik schreef — en dat verschil natrekken was het waard,
want een onverklaarde plus is net zo goed een signaal als een onverklaarde min.

#### De poort verdiende zich terug vóór hij bestond

A3 stond in `docs/lead-magnet.md` als een óf-vraag ("op één plek, óf in meerdere
systemen") en is zo niet met ja/nee te beantwoorden. Dat viel op bij het
schrijven van de test die eist dat elke vraag **woordelijk** in dat document
staat. Zelfde vorm als #199, waar `public/llms.txt` een bewering bleef dragen
die de code al had ingetrokken — een document en een implementatie die dezelfde
tekst dragen lopen uit elkaar zonder dat iemand het merkt.

#### De scan was een wees, en dat meldde de audit

`scripts/seo-audit.ts`: *staat in de sitemap maar wordt nergens vandaan
gelinkt*. Een pagina waar niets naartoe wijst is geparkeerd, niet gebouwd.

Daaruit komt `components/ScanCallout.tsx`, gemonteerd op `/nl/services` en
`/nl/tools/energy-roi`. Die poortert op `ENKELE_TAAL` en niet op een eigen
`locale === "nl"` — dezelfde bron waaruit de pagina zijn talen haalt, dus de
knop kán per constructie geen 404 opleveren. Een eigen check zou een tweede
lijst zijn geweest, en dat is precies de vorm waarin dit soort gaten ontstaat.

In de audit is dit een **waarschuwing**; in `lib/lekkage-scan.test.ts` is het
een fout. Een waarschuwing komt stilletjes terug.

#### Drie meters zeiden iets anders dan er op stond

**Elf HTTP 500's die er niet waren.** De eerste auditrun liep tegen de
dev-server en meldde 500 op `/nl/about`, `/es/pricing` en negen andere pagina's
die ik niet had aangeraakt. Tegen `next start` waren ze weg: Turbopack die onder
de crawler stond te compileren. Dit logboek schrijft die meetopstelling al voor,
en dit is de derde keer dat het uitmaakte.

**Drie 404's in de console na een schone herlading.** Uit het netwerklog bleken
het mijn eigen sondes naar `/en`, `/de` en `/es` — die hóren te 404'en. De
consolebuffer van de browser-pane wordt bij navigatie niet geleegd; dat stond al
in het logboek van 21 augustus en ik trapte er opnieuw bijna in.

**De aanspreekvorm meten mislukte stil.** Een blok-extractie op `dict.ts` gaf
nul treffers voor élke vorm — `je`, `jij`, `u`, `uw`. Dat leest als een leeg
woordenboek. Het was een kapotte extractie; op regelnummers gemeten staat er
87× `je` en 0× `u`. Vierde keer deze week dat een lege uitkomst uit een stuk
instrument hetzelfde leest als een schone meting.

#### Gemeten

Alles op de productiebuild (`next start`, poort 3200), niet op de dev-server.

| | uitkomst |
|---|---|
| `/nl` | 200 · 1× h1 · 4 blokken · 15 vragen · 30 radio's |
| `/en`, `/de`, `/es` | 404 |
| hreflang | alleen `nl` + `x-default=nl` |
| sitemap | 176 → 177 URL's, alleen `/nl` |
| knop op `/nl/services` + `/nl/tools/energy-roi` | 1×, met taalprefix |
| dezelfde pagina's op `/en`, `/de` | 0× |
| mobiel 375px | geen overloop, raakdoelen 44px (WCAG 2.5.5) |
| `seo-audit` | waarschuwingen: **0** |

De uitslagvolgorde vooraf voorspeld en daarna gemeten: bij B=3, A=1 en D=1 hoort
B → A → D, met het gelijkspel gebroken op A. Dat kwam er precies zo uit.

De 177× `canonical-wijkt-af` is het bekende meetartefact — de lokale build
draagt `NEXT_PUBLIC_SITE_URL` op poort 3000 terwijl de crawl op 3200 loopt.
176 in het logboek, nu 177: exact +1 voor deze pagina.

**899 tests in 41 bestanden**, was 871/39. Dat vervangt de 871 hierboven.
Typecheck schoon, i18n 696 × 4, prijsgenerator groen, build groen met 207
statische pagina's.

Mutatietest op de wees-gate in twee richtingen: beide montages weg → rood op
`expected 0 to be greater than 0`, hersteld → groen. Hersteld uit een kopie in
de scratchpad, niet met `git checkout --` — die herstelt vanuit de index.

**Geen screenshot.** De browser-pane compositeert hier geen frames, dus alles
hierboven is in de DOM en in de geserveerde HTML gemeten, niet op het oog.

#### PR #220 — het commentaar noemde een tabel die in geen schema bestaat

Onderweg gevonden en als losse taak weggezet, want het was een codewijziging in
een documentatie-PR. `components/NewsletterForm.tsx:7` zei "Writes to Supabase
`newsletter_subs`", terwijl het formulier sinds 2026-07-21 via
`app/actions/subscribe.ts` naar `subscribers` schrijft. De kop van
`newsletter.ts` legt die verhuizing correct uit; de kop van het formulier is
meeverhuisd zonder bijgewerkt te worden.

Wie dat leest zoekt de opvang in de verkeerde tabel — en die tabel bestaat niet,
dus hij vindt niets en concludeert dat er niets binnenkomt. Precies de klasse
waar dit logboek het meest aan overhoudt.

#### Voor de operator: niets nieuws, wel een volgorde

`docs/lead-magnet.md` §7 voegt geen taken toe aan de lijst hieronder, maar zet
er drie in volgorde omdat ze elkaar blokkeren:

1. **De vier Plausible-doelen aanmaken.** Zonder dit is elke uitspraak over deze
   scan een gok — de kliks worden nu binnengehaald en weggegooid.
2. **`LEAD_NOTIFY_SECRET`.**
3. **`RESEND_API_KEY` + `ACK_FROM`** — pas ná 2, anders geef je een publiek
   aanroepbaar endpoint een mailkanaal vanaf het eigen domein. De scan werkt
   zonder; de PDF-variant wacht hierop.

En de beslissing die er hoe dan ook ligt: **wat ligt er na de sprint van dertig
dagen op tafel?** De scan eindigt in een uitnodiging, en die moet een tastbaar
ding noemen. Stap 1 van de ladder doet dat al; stap 2 noemt alleen een toestand.
Dezelfde vraag als `docs/aanbod.md` §5, en hij komt hier terug omdat elke
leadmagneet ergens naartoe moet leiden.

#### PR #222 — de scan onder de energie-artikelen, en het waren er vijf

Punt 1 uit het distributieplan. `ScanCallout` hangt nu ook onder de
insight-detailpagina, achter `post.tag === "Energy"`, tussen het boekblok en de
venture-kaart: wie het artikel uit heeft krijgt eerst een stap van vier minuten,
daarna pas een van een kwartier.

**Het plan telde elf energie-artikelen; het zijn er vijf.** Dat getal telde de
DE- en ES-clusters mee, maar de scan bestaat daar niet — `ScanCallout` poortert
op dezelfde `ENKELE_TAAL` waaruit de pagina zijn talen haalt, dus daar rendert
hij niets. Dat is precies waarom die gedeelde bron er staat: de knop kan niet
verwijzen naar een pagina die in die taal 404't, ook niet als iemand hem op een
vertaalde post monteert. Het document is bijgewerkt naar wat gemeten is.

**De poort noemt nu de plekken in plaats van het aantal.** De eerste versie eiste
“minstens één montage”, en dan mag er stilletjes één verdwijnen zolang er nog
één overblijft — precies de staat waarin de homepage jarenlang de enige plek was
voor `ResultsStrip` zonder dat dat ooit besloten was. Nu een expliciete lijst met
per plek de reden, plus een tweede assertie dat de artikelmontage achter de
Energy-tag hangt. Zonder die voorwaarde staat de scan onder élk artikel, ook
onder de real-estate- en hospitality-stukken die een ander publiek hebben.

Twee mutaties, twee keer rood: montage weg uit `/services` →
`expected [ …(2) ] to deeply equal [ …(3) ]`, en de Energy-voorwaarde weg → rood
op de tweede assertie.

**`grep -c` loog voor de derde keer deze sessie.** De ruwe HTML toont twee
treffers op de knoptekst; één daarvan zit in de RSC-payload
(`self.__next_f.push`). Geteld op gerénderde anchors is het er één. En de
metingen op `/nl/services` van een uur eerder telden regels in plaats van
treffers — geminificeerde HTML is één regel, dus die “1” zei niets. Opnieuw
gemeten met `grep -o | wc -l`: 1 anchor per NL-energiepost, 0 op de twee
NL-niet-energieposts, 0 op de DE- en ES-posts, 0 op elke `/en`- en `/de`-variant.

**Op productie nagemeten, ná de deploy.** De eerste probe gaf nul anchors op
élke URL, ook op `/nl/services`, dat de knop sinds #221 al droeg. Dat was geen
defect maar een te vroege meting: de productie-deploy van `3e4efc3` was net
aangemaakt en stond nog te bouwen. Pas met de uitgeleverde SHA gelijk aan `main`:

    vijf NL-energieposts       1 anchor elk
    twee NL-niet-energieposts  0
    DE- en ES-energieposts     0 — ook de kale tekst `lekkage-scan` staat er niet
    /en                        0
    /nl/tools/lekkage-scan     200 · canonical op juandiazllc.com · hreflang nl + x-default
    /de/tools/lekkage-scan     404
    sitemap                    177 URL's, de scan alleen onder /nl

**Twee slugs in die eerste probe bestonden niet.** Ik typte ze uit het hoofd in
plaats van ze uit `getAllInsights("nl")` te lezen, en kreeg twee keer 404 terug.
In een dekkingsmeting leest een 404 precies hetzelfde als een ontbrekende
montage. Lees de lijst uit de bron waar de poort hem ook uit leest.

900 tests in 41 bestanden, was 899/41. `seo-audit` waarschuwingen: 0.

#### PR #224 — wat de sprint oplevert stond al op de homepage, alleen niet aan de sprint geknoopt

Het laatste openstaande punt uit `docs/aanbod.md` §5: stap 2 van de ladder noemde
geen tastbaar ding. Wat de vraag kleiner maakte dan hij leek, is dat het antwoord
al in de repo stond.

| waar | wat er stond |
|---|---|
| `services.how.s1.body` | stap 1 levert "een diagnose van één pagina" — tastbaar |
| `services.how.s1.note` | dat gratis gesprek is "de Blueprint-fase van de methode in het klein" |
| `process.2.body` (homepage, 4 talen) | "Elke fase heeft een getal. Geen vage strategie-deck — een bouwplan dat een aannemer kan lezen." |

Is het gratis gesprek fase 2 *in het klein*, dan is de sprint diezelfde fase op
ware grootte. Het bouwplan was dus geen nieuwe belofte maar een ontbrekende
verbinding. Wat er stond was telkens een **toestand** ("beide kanten beperken
het risico"), in vier talen en in acht FAQ-antwoorden. Waar, maar niet vast te
houden.

**Beslist door Juan op 2026-08-22**, drie punten, eerst in `docs/claims.md` en
pas daarna in kopij: het bouwplan **plus het eerste onderdeel dat al draait**;
allebei volledig eigendom van de klant, ook als een ander het uitvoert; en de
sprintprijs gaat er volledig vanaf als de bouw volgt.

**Wat er bewust niet in staat is een bedrag.** De vaste prijs is nog onbeslist
(`docs/aanbod.md` §5.1), en dat is nu de enige blokkade voor een getal in kopij.
"Vaste prijs" mag wel: dat beschrijft een vorm. Wat het werkende onderdeel ís,
wisselt per traject en mag daarom nergens ingevuld worden — de belofte is dat er
na dertig dagen iets draait, niet wát er draait.

#### De poort noemt de voorwaarde, niet de formulering

`lib/seo/faqs.belofte.test.ts` bewaakte al één belofte over het blueprint-gesprek
(één pagina, niet twee). Daar staat nu een tweede blok naast met vier eisen:
een antwoord dat de sprint van dertig dagen noemt, noemt ook wat hij oplevert;
de ladder draagt in vier talen de deliverable plus beide toezeggingen; nergens
staat een bedrag; en `docs/claims.md` draagt de beslissing nog. Die laatste is
de `ResultsStrip`-vorm: kopij mag zijn bron niet overleven.

Twee dingen zitten er bewust in. De sprint-regex is **smal** — alleen de
volledige aanduiding telt, zodat een prijszin als "de diagnosesprint heeft een
vaste prijs" de deliverable niet hoeft te herhalen. En de bedrag-regex draagt
vier positieve proeven, want een lege overtreedslijst uit een kapotte regex leest
hetzelfde als een schone meting.

**Vijf mutaties, vijf keer rood, elk met een andere assertie:** deliverable weg
uit een NL-antwoord, `s2.note` weg voor Duits, een bedrag in de Engelse
`s2.body`, de beslissing weg uit `claims.md`, en de sprint-regex stuk (die ging
af op de positieve controle, `expected 6 to be 8`). Elke mutatie eiste dat het
bestand aantoonbaar veranderde; hersteld uit een kopie in de scratchpad.

#### De ladder rendert notities nu uit een verzameling, niet uit een gelijkheid

`s === "s1"` is `MET_NOTITIE.has(s)` geworden. Expliciete verzameling en geen
opzoeking-met-terugval, want `translate()` valt bij een ontbrekende sleutel terug
op Engels en ontbreekt hij daar ook, dan rendert de sleutelnaam zelf op de
pagina. Staat s3 niet in de verzameling, dan wordt er nooit naar een s3-notitie
gezocht. Gemeten in de DOM: kaart 1 en 2 dragen twee alinea's, kaart 3 één, en
`services.how.s*.note` komt 0× als kale tekst voor.

#### Er luisterde al iets op 3200

De eerste meting gaf nul treffers op de nieuwe kopij terwijl de bron hem wel
droeg. Niet de build was stuk: `next start -p 3200` kreeg `EADDRINUSE`
(errno −4091) omdat er nog een server van eerder die sessie op die poort stond,
en mijn `until curl`-lus slaagde meteen — op de oude server. Ik mat dus een
build van uren eerder.

Dat is dezelfde klasse als de verouderde `.next`, maar één laag naar buiten: niet
de cache was oud, de **luisteraar** was oud. Een `curl` die slaagt bewijst dat er
iets antwoordt, niet dat jóuw proces antwoordt. Lees het startlog, of kies een
vrije poort — ik nam 3211 in plaats van een proces te doden dat ik niet volledig
kon toeschrijven.

#### Meting

904 tests in 41 bestanden, was 900/41. i18n 697 sleutels × 4, was 696 — de plus is
`services.how.s2.note`. Typecheck schoon, prijsgenerator groen, build groen.
`seo-audit` tegen die build: **waarschuwingen 0, notities 0**; de 177
canonical-fouten zijn het bekende meetartefact.

Op de productiebuild in vier talen gemeten: de deliverable staat in
`services.how.s2.body`, beide toezeggingen in `s2.note`, geen kale sleutels, en
op 375 px geen horizontale overloop (kaarten 295 px breed, kaart 2 nu 308 px hoog
tegen 306 voor kaart 1). Geen console-fouten.

#### PR #225 — de prijs, en een poort die van richting omdraaide

De sprint kost **€2.500**, beslist door Juan op 2026-08-22. Daarmee is
`docs/aanbod.md` §5.1 dicht en staat het bedrag op `/services` in vier talen: in
de titel van stap 2 en in de drie FAQ-antwoorden die de sprint noemen.

**De poort van een uur eerder moest omkeren.** Die verbood *elk* bedrag in de
sprintkopij, omdat de prijs nog niet beslist was. Nu eist hij het omgekeerde:
elk bedrag dat bij de sprint staat is precies het bedrag uit `docs/claims.md`,
in de opmaak van zijn eigen taal, en er moet er één staan. Dat is strikt sterker
dan het verbod, want het dekt ook de stille variant — een prijs die in één taal
achterblijft bij een wijziging.

**Het getal wordt geparst, niet overgeschreven.** De poort leest de rij
`| vaste prijs sprint | **€2.500** |` uit `claims.md` en leidt daar de vier
taalvormen uit af. Een constante in het testbestand zou een tweede kopie van
hetzelfde getal zijn geweest, en dat is precies de bugklasse waarvoor
`claims.md` bestaat. Verdwijnt de rij, dan gooit de poort met een zin die zegt
wat te doen, in plaats van stil een verouderd getal te bewaken.

**Opmaak per taal was geen detail.** `pricing.migration.title` deed het al voor:
`€1,500` (en) · `€1.500` (nl) · `1.500 €` (de) · `1.500 €` (es). In het Duits en
Spaans staat het teken achter het getal. Eén van de vijf mutaties zet daarom de
Nederlandse vorm in de Duitse titel; die gaat af.

#### De poort ving zijn eigen regex

Eerste run rood op `expected '€2,500.' to be '€2,500'`. `[\d.,]*` at de punt aan
het eind van de zin mee, dus "€2,500." las als een ánder bedrag dan "€2,500". Een
bedrag moet op een cijfer eindigen: `\d(?:[\d.,]*\d)?`. Dat geval staat nu als
proef in de poort, want het is precies het soort verschil dat een prijscontrole
waardeloos maakt zonder dat iemand het merkt.

**Vijf mutaties, vijf keer rood:** prijs alleen in `claims.md` gewijzigd, prijs
alleen in de NL-titel gewijzigd, bedrag weg uit een NL FAQ-antwoord, de rij weg
uit `claims.md`, en de Nederlandse opmaak in de Duitse titel. De eerste twee zijn
elkaars spiegelbeeld en dat is opzet: de poort moet drift in beide richtingen
zien, niet alleen kopij die achterloopt.

#### De btw-behandeling staat nergens, en dat is een keuze die nog niet gemaakt is

Gemeten over `pricing.*` in vier talen: **geen enkele prijs op deze site draagt
een incl./excl.-vermelding.** €2.500 volgt die conventie. Verdedigbaar voor een
zakelijke koper, maar het is 21% verschil — €2.500 tegen €3.025 — en de keuze is
niet gemaakt. Dat staat als open punt in `claims.md`, niet als aanname in kopij.

Dit is niet theoretisch. De Educational-tier van Diaz Editor stond als €500 op
de pagina terwijl Stripe hem exclusief afrekende, dus een school betaalde €605
aan de kassa. Eén woord van Juan sluit het.

#### Twee meters braken, allebei stil

**Een raw string in Python at de escape niet af.** `r'...€...'` bevat
letterlijk backslash-u, geen euroteken, dus de vervanging vond zijn anker niet en
meldde `regex-anker 0x`. Luid, want de assertie stond er — zonder die assertie was
het een stille no-op geweest. Euroteken sindsdien via `chr(0x20AC)` buiten de raw
string gehouden.

**`sed 's/<script[^>]*>.*<\/script>//g'` at de hele pagina op.** Geminificeerde
HTML is één regel, dus `.*` liep van het eerste script-tag tot het laatste — dat
is vrijwel het hele document. De uitkomst was "nul bedragen op de pagina", wat
identiek leest aan een schone meting. Gemeten in de DOM met `innerText` staat er
wat er hoort te staan.

#### Meting

904 tests in 41 bestanden en 697 sleutels × 4 — beide onveranderd, want dit zijn
gewijzigde waardes en geen nieuwe sleutels. Typecheck schoon, prijsgenerator
groen, build groen.

In de DOM op 375 px, na het openvouwen van de FAQ:

    /nl/services   €2.500  ·  kaart 02: "Diagnosesprint — 30 dagen, €2.500"
    /de/services   2.500 € (3x)  ·  kaart 02: "Diagnose-Sprint — 30 Tage, 2.500 €"
    beide          geen horizontale overloop, geen console-fouten

Het enige andere bedrag in de zichtbare tekst is `€0`, de vierde bevestigde
klantuitkomst uit `claims.md` ("additional SaaS spend; retired tools funded the
rebuild"), al gedekt door `ResultsStrip.test.ts`.

#### En de btw-grondslag, in dezelfde PR

Juan antwoordde tijdens de CI-run: **exclusief btw.** Dat is in #225 zelf
meegenomen en niet in een volg-PR, want anders serveert productie een tijdje een
bedrag zonder grondslag — precies de toestand die de Educational-tier van Diaz
Editor €105 per verkoop kostte.

**De vorm verschilt per taal en dat is geen stijlkwestie.** `excl. VAT` (en) ·
`excl. btw` (nl) · `zzgl. MwSt.` (de) · `más IVA` (es). Het Duits gebruikt
bewust niet "excl.", want dat is geen Duits; `zzgl.` is de zakelijke
standaardafkorting. Eén van de vier mutaties zet de Nederlandse afkorting in de
Duitse titel, en die gaat af.

**Zestien plekken, niet één.** De grondslag staat naast élk bedrag en niet
alleen in de titel van de ladder, want `/contact` draagt hetzelfde
FAQ-antwoord zonder die titel ernaast. Een bedrag dat op één pagina zijn
grondslag heeft en op een andere niet, is op die tweede pagina misleidend.

Het Duits vroeg punctuatie-zorg: `zzgl. MwSt.` eindigt zelf op een punt, dus
"…für 2.500 € zzgl. MwSt.. Am Ende" moest "…zzgl. MwSt. Am Ende" worden. Op de
gerenderde build gemeten: `MwSt..` komt 0× voor.

**Vier mutaties, vier keer rood:** grondslag weg uit de NL-titel, grondslag weg
uit een DE FAQ-antwoord, de Nederlandse afkorting in het Duits, en grondslag weg
uit een ES FAQ-antwoord.

Gemeten op de productiebuild, over beide pagina's die het bedrag dragen:

    /en /nl /de /es  services   10 bedragen, 0 zonder grondslag
    /en /nl /de /es  contact     4 bedragen, 0 zonder grondslag

**Dit is de eerste prijs op deze site met een grondslag ernaast.** Geen enkele
prijs op `/pricing` draagt er een, gemeten over `pricing.*` in vier talen. Dat
staat als open punt in `docs/claims.md` — het is geen reden om het hier ook weg
te laten, maar het is wel een inconsistentie die iemand een keer moet wegnemen.

#### Na de merge: wat "10 bedragen" telt, en twee meters die stil het verkeerde zeiden

#225 is gemerged als `0473095`. De squash-boom is byte-identiek aan die van de
tak (`0d893ebd`), alle poorten groen op gemergede main: tsc 0 · 904 tests in 41
bestanden · i18n 697 × 4 · prijsgenerator groen · `CLAUDE.md` == `AGENTS.md`.

**Op productie gemeten, alle vier de talen, over de hele HTML** — zichtbare
tekst, JSON-LD én RSC-payload:

    /{en,nl,de,es}/services   sprintprijs 10x per taal, 0 zonder grondslag
    /{en,nl,de,es}/contact    sprintprijs  4x per taal, 0 zonder grondslag

`MwSt..` komt 0× voor. De JSON-LD is apart nagelopen, want dat is wat Google
leest: 6 blokken per taal, 2 bedragen, in alle vier de talen nul zonder
grondslag.

#### Het getal 10 telt de sprintprijs, niet de bedragen op de pagina

De meting in het blok hierboven noteert "10 bedragen" op `/services`. Bij het
hermeten op productie kwam daar 4 uit, en dat leest als drift terwijl er niets
gedreven was. Het waren twee meetlatten:

| | telt | uitkomst |
|---|---|---|
| vóór de merge | de sprintprijs, in de rauwe HTML | 10 |
| ná de merge | elk bedrag, in de zichtbare tekst | 4 |

Gelaagd uitgesplitst staat er per taal 11 in de rauwe HTML: 4 zichtbaar, 2 in de
JSON-LD, 5 in de RSC-payload. Strikt op de sprintprijs geteld is het 10 — exact
gelijk aan de oude meting. Het verschil van één is `€0`, dat de oude regex stil
uitsloot omdat hij twee cijfers eiste.

**Noteer dus wát je telt, niet alleen hoeveel.** Een kaal getal in een logboek
wordt over een maand gelezen als het antwoord op de vraag die de lezer dán heeft.

Het enige bedrag op die pagina's zonder grondslag is `€0`, de vierde bevestigde
klantuitkomst uit `docs/claims.md`. Dat is een uitkomstcijfer en geen prijs; het
hoort er geen te dragen, en `ResultsStrip.test.ts` dekt het al.

#### Vercel post een commit-status, geen check-run

De poller die op de deploy wachtte vroeg `commits/<sha>/check-runs` en kreeg
niets terug voor de naam `Vercel`, terwijl `commits/<sha>/status` op `success`
stond. Twee verschillende API's:

| endpoint | draagt |
|---|---|
| `/check-runs` | `i18n`, `docs-sync`, `typecheck`, `deps`, `test`, `lighthouse` |
| `/status` | **`Vercel`** |

Een poller op alleen de eerste wacht eeuwig op een deploy die al klaar is, en
meldt niets — hij blijft gewoon draaien. Dat leest hetzelfde als een deploy die
hangt. Enumereer bij een lege uitkomst eerst beide lijsten voordat je concludeert
dat er iets niet af is; dat kostte hier één aanroep.

**Dat is gemeten, niet beredeneerd.** De poller liep door tot zijn eigen lusgrens:

| | |
|---|---|
| pogingen | 40, over ~13 minuten |
| `vercel=` uit `/check-runs` | **leeg, alle 40 keer** |
| `combined=` uit `/status` | `success`, vanaf poging 1 |
| exitcode | **0** |

Geen foutmelding, geen rood, exitcode 0 — alleen een antwoord dat nooit kwam,
terwijl de deploy die hele dertien minuten live was. Vanaf de kant van de poller
is "nog niet klaar" niet te onderscheiden van "ik kijk op de verkeerde plek":
allebei zien eruit als een lege uitkomst.

Wat het onderscheid hier wél droeg was een tweede signaal dat aantoonbaar bewoog.
`combined=success` stond naast een lege `vercel=`, en die twee spraken elkaar
vanaf poging 1 tegen. Een poller die één veld leest kan niet merken dat hij het
verkeerde veld leest.

Dit is de reden dat `audit-productie` en `Vercel` bewust niet in de
branch-protection-lijst staan — zie de sessie van 19 augustus. De twee gaten
hangen samen: een check die via een ander endpoint rapporteert dan waar je naar
kijkt, is voor jouw instrument onzichtbaar.

#### De prijsregex hechtte over een knoopgrens

De productie-sonde meldde in het Spaans een bedrag van `1 €` dat nergens op de
pagina staat. De regex moet voor Duits en Spaans een euroteken *achter* het getal
toestaan, en precies die losheid liet hem over een DOM-grens hechten:

    ...|Despliegue Q1|€0|Gasto adicional en SaaS...

Twee losse knopen, platgeslagen tot "Q1 €0", en daar matcht `1 €`. In het Engels
en Duits staat er een woord tussen (`Q1 rollout`, `Q1-Rollout`), dus daar viel het
niet op — de fout was er wel, hij had alleen geen aanleiding.

De poort in `lib/seo/faqs.belofte.test.ts` kán dit niet krijgen: die leest losse
waardes uit `DICT`, niet platgeslagen paginatekst. **Een regex die op een hele
pagina losgelaten wordt heeft een andere foutklasse dan dezelfde regex op één
veld.** Meet je op de pagina, meet dan per element of anker op de exacte
prijsvorm, zoals de tweede ronde hier deed.

#### Twee valkuilen die deze sessie voor de zoveelste keer terugkwamen

`sed 's/<script[^>]*>.*<\/script>//g'` eet op geminificeerde HTML het hele
document, want dat is één regel en `.*` is hebzuchtig. De sonde gebruikt daarom
`re.S` met `.*?` per script-tag. En Python op Windows opent geen `/tmp/...` —
git-bash zet dat op `C:/Users/LENOVO/AppData/Local/Temp`, te vinden met
`pwd -W`. Allebei staan ze al eerder in dit logboek; allebei kostten ze opnieuw
een ronde.

### 2026-08-22 (vervolg) — de laatste twee aanbodbeslissingen, en een poort die twee keer te zwak bleek

Juan besliste §5.2 en §5.3 van `docs/aanbod.md`: **geen garantie op de uitkomst**,
en **drie trajecten tegelijk**. Daarmee staan alle vier de beslissingen uit dat
hoofdstuk dicht. Vastgelegd in `docs/claims.md` onder "Garantie en capaciteit";
`aanbod.md` verwijst er alleen naar.

#### Geen uitkomstgarantie was een registratie, geen reparatie

Eerst gemeten of de site al ergens een resultaat belooft. Over `lib/i18n/dict.ts`
en `lib/seo/faqs.ts` in vier talen: **nul treffers** op garantie-, terugbetaal- of
resultaattaal in de sprintkopij. Er stond dus niets dat teruggedraaid moest
worden — het antwoord legt een regel vast in plaats van een fout te herstellen.

De enige terugbetaal-belofte op de site is `pricing.faq.a3`: een venster van 30
dagen op een DEUS-**jaarcontract**. Ander product, andere toezegging. Die staat nu
expliciet als uitzondering in de poort, mét reden en aantal, zodat een volgende
sessie hem niet als tegenstrijdigheid leest en er ook geen tweede belofte
stilzwijgend onder hetzelfde voorvoegsel meelift.

Wat wél blijft is de risico-omkering op de **levering**: het bouwplan blijft van
de klant ook als een ander het uitvoert, en de sprintprijs gaat volledig van de
bouw af. Dat is een andere belofte dan een resultaat, en dat onderscheid is de
reden dat dit apart beslist moest worden.

#### Drie trajecten maakt een schaarste-zin toelaatbaar, niet verplicht

Het getal is een echte capaciteitsgrens, dus controleerbaar. Twee grenzen staan
in `claims.md`:

1. **"Nog N plekken vrij" mag niet.** Dat vergt een levende telling van lopende
   trajecten, en die bestaat nergens in deze repo. Een getal zonder bron is
   verzonnen, ook als het toevallig klopt.
2. **De grens knelt vandaag niet.** Gemeten 2026-08-22 op Supabase-project
   `wbgiouuifqhasedncysw`: `marketing.leads` nul rijen, `marketing.subscribers`
   nul rijen — beide ooit. Een capaciteitszin is dan positionering en geen
   urgentie. Als urgentie geframed zou hij druk suggereren die er niet is.

Er is daarom **geen kopij geschreven**. De beslissing staat vast; of hij de site
op gaat is een aparte keuze.

#### De poort ging twee keer nét niet ver genoeg, en de mutatietest wees allebei aan

`lib/seo/faqs.belofte.test.ts` scant nu het hele woordenboek op resultaattaal.
Twee keer bleek de eerste versie te zwak, en geen van beide was aan de assertie te
zien — alleen aan een mutatie die groen bleef.

**Eerst: de positieve controles dekten maar de helft van het patroon.** Een term
uit de garantie-helft schrappen veranderde niets aan de uitkomst, want alle vier
de controles gebruikten terugbetaal-woorden. Het patroon wordt nu uit een
**termenlijst** gebouwd, en de poort eist dat élke term afgaat op zijn eigen
bewijstekst. Een term die stukgaat is daarmee zichtbaar in plaats van stil.

**Daarna: geen test kan zien dat je een controle wéghaalt die hij niet verwacht.**
De hele term uit de lijst schrappen bleef groen — er was geen verwachting om
tegen af te zetten. Dat vraagt een vastgelegde inventaris: 16 termen, minstens 4
per taal. Een term schrappen dwingt nu een zichtbare bewerking van dat getal af.

Acht mutaties, acht keer rood, elk met een ándere assertie: belofte in een
FAQ-antwoord, belofte in een dict-sleutel, de DEUS-uitzondering weg (telt dan 0),
een term uit de lijst, een bewijs losgekoppeld van zijn term, een taal-tag
verschoven, de kop weg uit `claims.md`, en de rij "trajecten tegelijk" gewijzigd.

#### Drie keer brak mijn eigen gereedschap, en één keer op de bekendste manier

**Het tagging-script matchte op substring.** Bij het labelen van elke term met
zijn taal koos ik de eerste treffer uit een lijst — en `"garantie"` zit ín
`"garantiert"`, dus het Duitse woord kreeg het Nederlandse label. Duits hield
daardoor drie termen over in plaats van vier. De inventaris-assertie die ik net
had geschreven ving het meteen: `expected 3 to be greater than or equal to 4`.
Een poort die zijn eigen invoer controleert, betaalt zich binnen de minuut terug.

**Twee mutaties waren stuk in plaats van de poort.** `GARANTIETAAL_UIT = /zzz/i`
tóevoegen laat `GARANTIETAAL` gewoon staan, en `"Garantie en capaciteitXX"` bevat
nog steeds `"Garantie en capaciteit"`, dus de substring-check haalde het terecht.
Allebei zagen ze eruit als een zwakke poort. **Leg de verwachte kleur vooraf vast
en verklaar elke afwijking** — anders repareer je het verkeerde ding.

**En de heredoc halveerde opnieuw een dubbele backslash.** Wat ik als `\\n` typte
bereikte Python als `\n` en werd een echte newline, waardoor het mutatiescript
niet meer compileerde. Dat staat al in dit logboek van 20 augustus; het kostte
opnieuw een ronde. De uitweg is dezelfde: geen escapes gebruiken — hier werd de
term simpelweg door een lege regel vervangen, wat geldige TypeScript is.

#### Meting

905 tests in 41 bestanden, was 904. tsc schoon, i18n 697 × 4, prijsgenerator
groen, `CLAUDE.md` == `AGENTS.md`. Drie bestanden geraakt plus dit logboek; de
drie langlopende scratch-mappen staan bewust buiten de commit.

### 2026-08-22 (vervolg) — de capaciteitszin, en een telling die al bestond op de pagina ernaast

PR #227 legde een dag eerder vast dat er drie trajecten tegelijk lopen, zonder
kopij te schrijven: of dat de site op moest was een aparte keuze. Die keuze is nu
gemaakt, en bij het monteren bleek de belangrijkste aanname eronder niet te
kloppen.

#### De zin

`services.how.capaciteit`, vier talen, direct na de ladder-notitie op
`/services`. Hij beschrijft de werkwijze en verder niets — geen aftellend getal,
geen deadline. Wat er staat is dat de grens Juans eigen uren zijn en dat een
startdatum afhangt van wat er al draait.

Het getal wordt niet overgeschreven maar uit `docs/claims.md` geparst; het
testbestand kent alleen de vertaling van cijfer naar woord per taal. Een tweede
kopie van dat getal is precies de bugklasse waarvoor `claims.md` bestaat.

#### Mijn eigen document had ongelijk, en dat was de grootste vondst

`claims.md` zei op mijn gezag dat "een levende telling van lopende trajecten
nergens in deze repo bestaat". Bij het monteren bleek `components/Capacity.tsx`
op `/contact` er al een te tonen: vier blueprint-trajecten per kwartaal, twee
over. Met `LAST_VERIFIED = "2026-08-19"`, `MAX_AGE_DAYS = 30` en een eigen poort
in `components/capacity.test.ts` — het blok verbergt zichzelf zodra de telling
verouderd is.

Dat is goed gebouwd, en het weerlegde de premisse waarop ik een verbod had
geschreven. De keuze was dus: de site buigen naar een regel die op een onwaarheid
stond, of het document corrigeren. Het document is gecorrigeerd en de regel
herschreven naar wat hij werkelijk hoort te zijn — **geen aftellend getal zonder
onderhouden bron**.

**De uitzondering in de poort hangt daarom aan het feit, niet aan de naam.**
`fomo.capacity.*` is vrijgesteld met een aantal en een reden, én met een assertie
dat `LAST_VERIFIED` niet ouder is dan `MAX_AGE_DAYS`. Verjaart de telling, dan
verbergt `Capacity.tsx` zich én valt de poort om. De vrijstelling overleeft het
feit niet.

**Twee getallen, twee eenheden, twee pagina's.** `/contact` zegt vier
blueprint-trajecten per kwartaal, `/services` zegt drie opdrachten tegelijk. Ze
staan niet op dezelfde pagina en de nieuwe zin is verankerd op "na het
blueprint-gesprek", dus ze lezen als opeenvolgende stappen. Of ze naast elkaar
horen te bestaan is een aanbodvraag; die staat als open punt in `claims.md` en is
niet aan mij.

#### De uitzondering telde 0 in het Engels

De vrijstelling eist per taal een exact aantal treffers. In `en` kwam hij op 0
tegen 1 in `nl`: het Engelse label "slots remaining" viel op geen enkele term uit
de druktaal-lijst. Zonder die telling was het patroon in het Engels stil lek
geweest — een vrijstelling die nul keer matcht ziet er hetzelfde uit als een
patroon dat niets te vinden had. Elf termen werden er twaalf.

#### Het mutatieharnas liet drie bestanden beschadigd achter

Mijn uitbreiding van de `BESTANDEN`-lijst matchte niet, dus drie gemuteerde
bestanden hadden geen back-up en bleven na afloop staan. Het enige signaal was
"na herstel: ROOD" — wat ook een echte regressie had kunnen zijn. Gediagnosticeerd
met `git status` plus gerichte greps, per bestand precies hersteld, daarna het
harnas herschreven met een poort die dit onmogelijk maakt:

    ongedekt = sorted({m[1] for m in MUTATIES} - set(BESTANDEN))
    if ongedekt:
        sys.exit("MUTEERT ZONDER BACKUP: %s" % ", ".join(ongedekt))

Een harnas dat moet bewijzen dat een poort afgaat, heeft zelf ook een poort
nodig.

#### En het pad zat twee keer verkeerd

`lib/capaciteit.test.ts` staat één niveau diep, niet twee zoals
`lib/seo/*.test.ts`, dus `join(WORTEL, "..", …)` wees boven de repo uit. De
tweede keer schreef ik hetzelfde foute model opnieuw in nieuwe code, omdat ik de
padberekening van een buurbestand overnam. Tel de diepte, kopieer hem niet.

#### Meting

909 tests in 42 bestanden, was 905/41. i18n 698 × 4, was 697 — de plus is de
nieuwe sleutel. Typecheck schoon, prijsgenerator groen, build groen.

Zeven mutaties, zeven keer rood met elk een andere assertie, groen na herstel,
nul mutatiesporen achtergebleven (gecontroleerd op alle zeven ankers).

Op de productiebuild in vier talen: 1 treffer per taal, in de eigen taal, direct
na de ladder-notitie. Op 375 px meet de alinea 295 × 120 px, dezelfde kleur als
de notitie erboven, geen horizontale overloop, geen kale sleutel op de pagina. En
op `/nl/contact` staat het bestaande capaciteitsblok ongewijzigd — "2/4 plekken
over · Vier blueprint-trajecten per kwartaal" — zoals bedoeld.

### 2026-08-23 — twee capaciteitsgetallen tot één teruggebracht, en twee gaten die daarbij opvielen

PR #228 liet een openstaande vraag achter: `/contact` zei vier
blueprint-gesprekken per kwartaal, `/services` drie trajecten tegelijk. Juan
heeft ze gelijkgetrokken. De uitvoering was klein; wat eronder zat niet.

#### Wat er stond

| | `/contact` (`Capacity.tsx`) | `/services` (`services.how.capaciteit`) |
|---|---|---|
| getal | `TOTAL_SLOTS = 4`, `SLOTS_REMAINING = 2` | drie |
| eenheid | gratis gesprekken **per kwartaal** | betaalde trajecten **tegelijk** |
| bron | met de hand tegen de agenda, `LAST_VERIFIED` | `docs/claims.md` |

Alleen de tweede stond als beslissing in `claims.md`. De vier was een
componentconstante die daar nooit is beland. Gelijk zetten betekent dus niet
"maak de cijfers hetzelfde" maar **één feit, één eenheid, één bron** — anders
delen twee metingen een cijfer en blijft het twee metingen.

Juan koos de nieuwe stand: drie trajecten tegelijk, alle drie op dit moment
vrij. De keten loopt nu van `docs/claims.md` naar `TOTAL_SLOTS` naar
`fomo.capacity.note`, en van `docs/claims.md` naar `services.how.capaciteit`.

**De oude verificatie is mét de eenheid vervallen**, en dat is geen formaliteit.
Die 2 was op 2026-08-19 tegen de agenda gehouden, maar hij telde geboekte
gesprekken — niet lopende trajecten. Een verificatie geldt voor de grootheid die
je gemeten hebt, niet voor het vakje waar het getal in staat. Vandaar een nieuw
getal én een nieuwe datum, allebei van Juan.

#### De mutatietest vond een defect in mijn eigen werk

De mutatie "claims.md zegt vier" kon niet landen: **twee treffers op het anker**.
Mijn nieuwe tabel in `claims.md` herhaalde de rij `| trajecten tegelijk |
**drie** |` die vier regels hoger al stond. Ik had, in de commit die twee lijsten
tot één terugbracht, een tweede lijst geschreven.

Eronder zat het echte gat. De parser las met `.match()` zonder `/g`, dus hij
pakt de **eerste** treffer en zwijgt over de rest. Vandaag klopte het toevallig
nog omdat beide rijen hetzelfde getal droegen. Met een afwijkend getal in de
tweede rij was het een stille leugen geweest: de poort leest er één, publiceert
die, en meldt niets over de andere.

Allebei gerepareerd — de dubbele rij eruit, en `capaciteitUitClaims()` gooit nu
op méér dan één treffer. **Een parser die de eerste treffer pakt, moet zeggen
hoeveel het er waren.**

#### Het getal was gedekt, het woord niet

Bij het nameten op de draaiende build vond ik nul treffers op "drie trajecten
tegelijk" op `/services`. Geen meetfout: die pagina zei "drie **opdrachten**
tegelijk", `/contact` zei "drie **trajecten** tegelijk". Hetzelfde getal, twee
woorden, op precies de twee pagina's die één feit moesten dragen.

Engels, Duits en Spaans liepen al gelijk (engagements, Mandate, encargos) —
alleen het Nederlands week af. `claims.md` schrijft 5× "trajecten" en 0×
"opdrachten", dus de bron besliste het.

Er staat nu een poort met vier literals, één per taal. Bewust geen taalregel:
de drift kan in elke taal ontstaan en is alleen per taal te zien. En bewust een
positieve controle erbij, want een substringcheck die altijd waar is meet niets.

#### Bewijs dat de nieuwe assertie dekking toevoegt

`TOTAL_SLOTS` naar 4 zetten werd rood op de bestaande bijschrift-test, niet op
de nieuwe. Dat leest als dubbeling. De realistische drift is anders: iemand
verzet het getal én werkt netjes de kopij bij, maar vergeet `claims.md`.

Zo gemeten, met `TOTAL_SLOTS = 4` en "vier/four/vier/cuatro" in alle vier de
talen:

| | |
|---|---|
| `components/capacity.test.ts` | **13/13 groen** |
| `lib/capaciteit.test.ts` | rood — `tekent 4 plekken terwijl docs/claims.md 3 vastlegt` |

De bestaande poort hield het getal alleen tegen de kopij ernáást; intern
consistent, extern in strijd met de beslissing. **Een poort die naast zich kijkt
in plaats van naar boven, kan niet zien dat de hele pagina afwijkt van de bron.**

#### Onderweg

De escape-laag brak voor de zoveelste keer: `\r\n` in een mutatie-entry
overleefde de shell niet en leverde een `SyntaxError`. Opgelost door élke escape
te vermijden — `chr(13) + chr(10)` en een losse constante voor de tabelrij. Dat
is dezelfde uitweg als op 20 en 22 augustus; het patroon is inmiddels: **gaat er
tekst met escapes door een shell-laag, schrijf hem dan zonder escapes.**

En het oude slotparagraaf van `claims.md` sprak zichzelf tegen. Bovenaan stond
de regel "geen aftellend getal zonder onderhouden bron", onderaan "wat niet mag:
een teller". Die twee zijn niet te verenigen; de tweede is herschreven naar wat
de sectie werkelijk bedoelt.

#### Meting

911 tests in 42 bestanden, was 909/42. i18n 698 × 4, ongewijzigd (alleen
waardes). tsc schoon, prijsgenerator groen, build groen.

Negen mutaties, negen keer rood met elk een andere assertie, groen na herstel,
nul mutatiesporen achtergebleven.

Op de productiebuild in vier talen, in de DOM gemeten:

    /contact   balk van 3, alle drie open, "3/3 plekken over" (per taal vertaald)
    /services  "Na het blueprint-gesprek lopen er drie trajecten tegelijk."
    beide      zelfde telwoord, zelfde zelfstandig naamwoord, per taal
    oude eenheid ("per kwartaal", "pro Quartal", "por trimestre")  0x
    375 px     capaciteitsblok 295x271, zin 295x120, geen overloop, geen kale sleutel

De server draaide op een poort die vooraf aantoonbaar vrij was, en het startlog
is gelezen om te bevestigen dat het mijn eigen proces was — na de meting van 22
augustus waar een oude luisteraar een uur oude build serveerde.

### 2026-08-23 (vervolg) — zeven PR's die het logboek niet haalden, en een tweede haak die geen sector bleek

Het logboek stopte bij #229. Daarna landden er zeven PR's — #230, #231, #232,
#234, #235, #236 en #237 — die het bestand nooit hebben gehaald. Dat is precies
de vorm die dit logboek zelf het vaakst noteert: werk dat gebeurd is en nergens
staat, waardoor een volgende sessie het opnieuw gaat "bouwen". De inhaalslag
staat hieronder, in de volgorde waarin het gebeurde.

#### #230 en #231 — de niche stond er al, en energie was de steekproef

Drie vragen op één dag: de link-buildingprompts implementeren, verder nichen,
meer leadmagneten. Ze hangen aan elkaar, dus werd het `docs/bereik-plan.md`.

**De promptpakketten blijven waar ze zijn.** Het zijn commerciële bestanden van
derden en deze repo is publiek. Er komt niets van in code, ze kunnen niet als
leadmagneet weg, en ze worden nergens geciteerd. Wat er wél uit mag zijn de
uitkomsten.

Het bewijs zei dat er al genicht wás en dat de positionering achterliep: drie
van de vier bevestigde klantuitkomsten zijn energie, elf van de artikelen dragen
die tag, en de enige werkende trechter is NL-energie.

**Juans tegenwerping — hij kan meer dan energie — bleek te kloppen om een reden
die in de repo staat.** De dienst beschrijft zichzelf in vier talen als "een
diagnose van één pagina: waar je operatie en je cijfers uit elkaar lopen". Dat
is geen sector maar een vorm, en alle vier de sectorpagina's beschrijven
hetzelfde defect met een andere sector eromheen. Energie werkte niet omdát het
energie is, maar omdat er vier dingen tegelijk waar zijn: een harde datum, een
getal van een partij met een belang, een operatie op spreadsheets, en
NL-specifieke regelgeving. **De datum is de motor.** De vraag is dus niet welke
sector, maar welke markt binnenkort een datum krijgt die de rekensom breekt.

Drie haken nagetrokken. ETS2 en EPBD IV hielden stand; **Wkb gevolgklasse 2 is
uitgesteld zonder nieuwe datum** — dat was mijn eerste gok, juist omdat Juan
bouwkundig getraind is, en de meting sloopte hem als urgentiehaak.

**Vier claims sneuvelden bij het nameten, alle vier van mijzelf.** De scherpste:
ik had "DR 0" vier keer als feit opgeschreven. Het is niet meetbaar — Ahrefs
weigert óók zijn eigen gratis endpoint (`public-domain-rating-free`,
"Insufficient plan"). Het staat nu als expliciete aanname met de reden erbij.

En de lektabel citeerde **mijn eigen vertalingen alsof het de site-strings
waren**. Nu woordelijk uit `lib/sectors.ts`, met een controle die alle tien
citaten terugvindt. Zelfde klasse als de DR-0-aanname een uur eerder: **een
citaat dat je zelf hebt geschreven is geen bron.**

#### #232 — vastgoed, en twee percentages die op geen enkele overheidsbron staan

Van twee naar vier artikelen, met beide haken bij de uitvoerder nagetrokken in
plaats van bij een samenvatting. Dat verschil was niet cosmetisch:

- **"slechtste 16% per 2030, 26% per 2033" staat op geen van beide
  overheidsbronnen.** Het kwam uit een samenvatting van derden. De Nederlandse
  uitvoering drukt de eis uit in een label — D per 1-1-2030 — en dat is
  bovendien bruikbaarder: een eigenaar kan zijn eigen label opzoeken, een
  landelijke rangorde niet.
- **ETS2 stond op "hard, januari 2027".** De NEa zegt dat de veiling *gepland*
  is en dat de eerste inlevering in 2029 valt, over 2028. Richting vast, moment
  niet.

Ook gevonden en **bewust niet gladgestreken**: RVO schrijft "A+ tot en met
A++++", Rijksoverheid "A+ tot en met A+++++". Twee overheidsbronnen, een
verschillend aantal plussen. `docs/claims.md` verbiedt daarom het tellen, en de
kopij zegt alleen dát de plus-labels vervallen.

#### #234 — het social-pakket, en de helft van de kanalen bestaat niet

Tweede promptpakket, 27 prompts. Eerst gemeten welke kanalen er zijn: het pakket
richt zich op Instagram, TikTok, X en LinkedIn, en daarvan bestaan er hier
anderhalf. LinkedIn echt, Instagram onder een handle die als persoonlijk account
leest, **X bestaat niet** — die is in #198 juist uit `sameAs` gehaald omdat hij
404 gaf — en TikTok en YouTube komen in de hele codebase niet voor.

Zes van de 27 kunnen vandaag. Tien wachten op meting, tien op een publiek dat er
niet is. **Bijna exact dezelfde uitkomst als bij het linkpakket, en die
herhaling is zelf het signaal:** beide pakketten veronderstellen een
distributiemachine die draait.

**De grens staat er expliciet in.** Posten op je eigen tijdlijn is geen koude
benadering; connectieverzoeken en DM's blijven verboden, en enkele prompts in
dit pakket schuiven daarheen.

Onderweg drie tellingen hersteld die door mijn eigen vorige PR waren verlopen:
21 artikelen waren er 23, vastgoed stond op vier en niet op twee, en optie B in
§2 stond nog als open keuze terwijl hij net was uitgevoerd. **Binnen één dag.**

#### #235 — logistiek, en een sector die nergens naar wees

Twee NL-only artikelen onder een nieuwe tag `Logistics`: ETS2 op de kostprijs per
kilometer, en WPM — de rapportageplicht die sinds 1 juli 2024 geldt, waarbij het
toezicht niet alleen kijkt óf je rapporteert maar ook naar de **kwaliteit van je
gegevens**. Dat laatste is de scherpste rij in `claims.md` en de reden dat het
artikel bestaat.

`claims.md` draagt per rij ook wat er **niet** gepubliceerd mag worden: geen
indieningsdeadline, geen sanctie, geen bedrag per liter, en nergens de suggestie
dat de drempel al 250 werknemers is — van dat ontwerp-wijzigingsbesluit is het
moment van inwerkingtreding niet bekend. De poort in
`lib/seo/faqs.belofte.test.ts` raakt deze kopij niet, dus de zelfbeperking staat
in het artikel zelf.

**Bewust geen nieuwe sectorpagina.** Er is geen enkele bevestigde klantuitkomst
in transport, dus een sectorpagina zou een claim zijn die `docs/claims.md` niet
draagt. Inhoud eerst, positionering later.

Wat er onderweg opviel: **`/sectors/adjacent` wees nergens naar.** `SECTOR_TAG`
kende alleen `real-estate` en `hospitality`, terwijl de eigen samenvatting van
die pagina logistiek als eerste noemt. Die staat er nu in, en het blok poortert
op `getAllInsights(locale)` — dus op `/en`, `/de` en `/es` levert het niets op
en valt het vanzelf weg.

#### #236 — horeca van twee naar vier, afgelezen in plaats van verzonnen

`docs/seo-geo-plan.md` noemt twee artikelen per sector zelf "de slechtste" stand.
Welke twee erbij komen is niet bedacht maar **afgelezen van de sectorpagina**:
die noemt vier lekken en de twee bestaande artikelen dekten er twee. "Tooling
voor de vloer" en "Gastdata blijft liggen" stonden er wel, zonder artikel
erachter. Vandaar een artikel over de invoerweg — de housekeeper ziet een gebrek
uren voordat een systeem het ziet — en een over identiteit: dezelfde gast zit als
vier verschillende mensen in vier systemen.

Beide all-market volgens de bestaande conventie. **Ik had Duits en Spaans eerst
zonder diakrieten geschreven**, uit misplaatste voorzichtigheid over
shell-encoding. De bestaande vertalingen dragen ze wel; gecorrigeerd vóór het
landde.

#### #237 — vier artikelen spraken de lezer met u aan, en die vier waren van mij

Van de negentien Nederlandse artikelen gebruikten er vijftien "je" en vier "u",
en die vier waren allemaal in twee dagen geschreven, door mij, in #232 en #235.
`DICT.nl` is "je" — 87× je, nul "u" — en de sectorpagina's ook. Een lezer die
binnen het energiecluster doorklikte werd halverwege anders aangesproken.

**De mechanische pas maakte vijf grammaticafouten, en die zijn gevonden door de
uitkomst te lézen in plaats van het scriptresultaat te vertrouwen.** Het script
meldde netjes "55 regels aangepast, u/uw=0", en dat was waar en zei niets over
of het Nederlands klopte:

| stond er na de pas | moet zijn | waarom |
|---|---|---|
| `verkoop je iets` | `verkoopt je iets` | "u" was hier lijdend voorwerp, geen onderwerp |
| `die je nodig heeft` | `… hebt` | bijzin met "u heeft" wordt "je hebt" |
| `dat je vorig jaar heeft getekend` | `… hebt` | idem |
| `basislijn niet scherp heeft` (2×) | `… hebt` | idem |

**En eronder zat hetzelfde diakriet-defect als in #236**, nu in gepubliceerde
Nederlandse kopij: `commerciele`, `drieen`, `discussieren`, `contra-intuitief`.
Zeven plekken, alle zeven binnen mijn eigen vier artikelen; de vijftien oudere
waren schoon.

**Het aantal-anker in het correctiescript ving mijn eigen telling.** Ik
verwachtte `commerciele` twee keer; het waren er drie. Het script stopte met
`ANKER 'commerciele' komt 3x voor, verwacht 2` in plaats van door te gaan met een
verkeerd wereldbeeld.

**De slugs blijven staan.** Twee dragen "u"/"uw" in de URL. Een slug is geen
proza, en `next.config` heeft geen `redirects()` — geverifieerd, niet aangenomen
— dus omzetten kost twee 404's op URL's die diezelfde dag live gingen.

`lib/i18n/nederlands.test.ts` bewaakt het voortaan, in dezelfde vorm als
`duits.test.ts`: aanspreekvorm, ASCII-vormen, en een positieve controle die
éérst bewijst dat de splitser "u" als los woord vindt maar niet in "uur" of
"duurt". Hij leest `getAllInsights("nl")` en niet het bestand, zodat het
testbestand zichzelf niet laat struikelen over de vormen die het beschrijft.

Vijf mutaties, vijf keer rood met elk een andere assertie. Twee ervan richten
zich op de poort zelf — hem naar `getAllInsights("en")` laten kijken en de
splitser slopen — en beide vallen om op de je-controle, wat bewijst dat die
controle niet leeg is.

#### Drie patronen die deze dag meer dan eens terugkwamen

1. **Een citaat dat je zelf hebt geschreven is geen bron.** Drie keer: de
   DR-0-aanname, de lektabel met mijn eigen vertalingen, en de 16%/26% uit een
   samenvatting van derden.
2. **Mijn eigen tellingen verlopen binnen een dag.** 21 artikelen waren er 23,
   vastgoed stond op twee en was al vier, "vier van die twaalf regels" waren er
   elf. Machinaal hertellen kost seconden en is de enige manier die werkt.
3. **ASCII in plaats van diakrieten, twee dagen achter elkaar.** Duits en Spaans
   in #236, Nederlands in #237. De oorzaak is telkens dezelfde misplaatste
   voorzichtigheid over shell-encoding, terwijl kopij hier via het
   Write-gereedschap en een UTF-8-splice loopt en accenten gewoon overleven.
   Er staat nu een poort op het Nederlands; Duits had er al een.

#### Meting

**985 tests in 43 bestanden** (was 911/42 bij #229), i18n **699 sleutels × 4**
(was 698), tsc schoon, build groen met **220 statische pagina's**, sitemap 190.
`CLAUDE.md` == `AGENTS.md`.

Artikelen: **27**, gemeten per markt en tag in plaats van geschat.

| | Energy | Real estate | Hospitality | Logistics | Systems | Strategy | Growth |
|---|---|---|---|---|---|---|---|
| alle markten (EN + de/es) | — | 2 | 4 | — | 4 | 1 | — |
| alleen `/nl` | 5 | 2 | — | 2 | — | — | 1 |
| alleen `/de` | 3 | — | — | — | — | — | — |
| alleen `/es` | 3 | — | — | — | — | — | — |
| **totaal** | **11** | **4** | **4** | **2** | **4** | **1** | **1** |

Op productie na de merge van #237: de vier omgezette artikelen dragen 0× u/uw en
samen 131× je, geen ASCII-vorm meer, beide "u"-slugs geven 200. Tegenproef op de
zeventien andere NL-artikelen: samen 0× u/uw — er is dus niets omgeslagen dat
niet omgeslagen hoorde te worden.

#### Wat er open blijft

**Twee beslissingen uit `docs/bereik-plan.md` §7 zijn inmiddels genomen én
uitgevoerd** (beslissing 1 werd C — allebei de haken, met transport eerst;
beslissing 2 werd horeca naar vier). Die zijn in deze PR uit de lijst gehaald;
wat overblijft zijn de enquête, het social-kanaal en de rekenmachine-route.

Verder ligt er één ding buiten deze repo. **De R2-poort in
`~/.claude/hooks/` slaat te breed toe:** hij blokkeerde een read-only `curl` naar
een LinkedIn-profielpagina, omdat hij matcht op netwerkcliënt plus het
zelfstandig naamwoord "linkedin" in plaats van op netwerkcliënt plus een
berichten-endpoint. De regel die hij moet bewaken — geen geautomatiseerde
connectieverzoeken of DM's — is ongewijzigd juist. Het bestand staat buiten elke
repo, dus het wordt niet aangeraakt zonder Juans expliciete go.

### 2026-08-24 (vervolg) — de server-actions antwoordden in het Engels, en geen enkele i18n-poort kon dat zien

Gevonden tijdens de hermeting van de leadketen, niet bij het lezen van code. Na
een geslaagde inzending op `/nl` stond er: *"Got it. I'll come back to you within
24 hours."* De kop erboven was wél vertaald — `contact.sent` → "✓ Verzonden" —
en de zin eronder niet. Engels op precies het moment dat een bezoeker converteert,
en hetzelfde op `/de` en `/es`.

#### Waarom vijf bestaande i18n-poorten hier langs keken

Ze lezen allemaal `dict.ts` en de componenten. Een server action geeft zijn tekst
terug als **returnwaarde**, dus die string reist als data en niet als kopij:
`return { status: "ok", message: "Got it…" }`. Syntactisch onvindbaar voor elke
scanner die naar `t(...)` of naar het woordenboek kijkt.

Dat is dezelfde vorm als het `plausible-event-name=`-vs-`window.plausible(...)`-gat
van een uur eerder en als `process.env[SECRET_ENV]` dat `CAL_WEBHOOK_SECRET`
maandenlang uit `.env.example` hield: **functioneel identiek, syntactisch
onzichtbaar voor het instrument dat je erop loslaat.** Derde keer deze week.

**De actie kende de taal trouwens al.** `readLocale()` stond er, alleen ging die
waarde uitsluitend naar `metadata.locale` voor de bevestigingsmail. Elf regels
verderop werd de bezoeker in het Engels toegesproken.

#### Elf zinnen, vier talen, en één formulier dat de taal nooit stuurde

Zeven sleutels × vier talen: `form.ok.{lead,already,subscribed}` en
`form.err.{email,message,generic,network}`. Duits in de Sie-vorm, Spaans in tú,
Nederlands in je — conform het bestaande woordenboek.

Onderweg bleek er een tweede defect, en een groter. `components/sections/CtaBig.tsx`
stuurde **geen `locale`** mee. Een actie die perfect vertaalt maar een formulier
dat de taal niet meestuurt, valt terug op `"en"` en meldt daar niets over — geen
fout, geen log. `NewsletterForm.tsx` deed het al goed met dezelfde actie, dus de
twee afnemers van `subscribe` liepen uiteen zonder dat iets dat zag.

**En er stond een tweede `LOCALES`-lijst.** `app/actions/contact.ts` droeg zijn
eigen `["en","nl","de","es"]` naast de canonieke in `dict.ts`, met een eigen
`readLocale`. Toen `subscribe.ts` diezelfde functie nodig had zou dat een derde
kopie zijn geworden. Nu één `lib/i18n/form-locale.ts` die `LOCALES` uit `dict.ts`
importeert.

#### De poort, en welke assertie er werkelijk toe doet

`lib/i18n/server-acties.test.ts`, acht tests. De belangrijkste is niet de scan op
kale tekst maar deze: **elk formulier dat een taalbewuste actie aanroept, stuurt
de taal mee.** Welke acties taalbewust zijn wordt afgeleid uit de code — wie roept
`readLocale(formData.get("locale"))` aan — en niet ingetypt, want een tweede lijst
naast de eerste is precies de bugklasse waarover het bestand gaat.

De vrijstelling voor `app/actions/newsletter.ts` (dood: schrijft naar
`newsletter_subs`, een tabel die in geen schema bestaat) **draagt zijn eigen
voorwaarde**: een assertie dat het bestand nul importeurs heeft. Krijgt het er weer
één, dan valt de vrijstelling om in plaats van stil te blijven staan.

#### De poort viel meteen om, op proza

Eerste run rood op `components/NewsletterForm.tsx`. Geen importeur: regel 9 is een
**comment** — uitgerekend de comment die PR #220 repareerde — die
`app/actions/newsletter.ts` noemt om uit te leggen waarom het formulier hem *niet*
gebruikt. Vierde keer deze maand dat een tekstscan op proza valt, na
`contactadressen`, `persoon-entiteit` en `verzoeklimiet`.

Twee verdedigingen naast elkaar, omdat elk een geval dekt dat de ander mist:
commentaar strippen (vangt een comment die een importregel citeert) en op
**importsyntaxis** matchen in plaats van op het kale woord (vangt een los woord in
echte code). Plus een positieve controle: de scanner moet aantoonbaar de twee
levende importeurs van `subscribe` vinden — anders is zijn lege uitkomst voor een
vrijgesteld bestand geen meting maar een kapot instrument.

#### Zeven mutaties, zeven keer rood

Elk op een andere assertie, groen na herstel, nul sporen achtergebleven.

| mutatie | assertie die afging |
|---|---|
| kale tekst terug in een levende actie | geen kale gebruikerstekst |
| Duitse sleutel weg uit `dict.ts` | sleutel in alle vier de woordenboeken |
| Duits draagt de Engelse zin | de vier talen geven elk een eigen tekst |
| tekstscanner gesloopt | positieve controle op kale tekst |
| afnemer-scanner gesloopt | positieve controle op een levende import |
| `locale`-veld weg uit `CtaBig` | elk formulier stuurt de taal mee |
| dode actie krijgt weer een afnemer | vrijstelling heeft nul afnemers |

De eerste sloeg over op een **dubbel anker**: `form.ok.lead` staat twee keer in
`contact.ts` — de honeypot-tak en de succes-tak keren allebei met dezelfde zin
terug. Geen defect, wel een anker dat de omliggende regel nodig had.

#### Gemeten in de DOM, met een probe die niets wegschrijft

De bevestigingszin testen zou een echte rij in `marketing.leads` schrijven en de
Telegram-trigger laten vuren. De **foutzin** niet: de e-mailcontrole
(`isPlausibleEmail`, eist een punt in het domein) ligt vóór elke databaseaanroep,
en `a@b` komt wél door de browser en niet door de server. Dezelfde vorm als de
401/400-probe op `lead-notify` van 21 augustus: kies een invoer die ná de controle
maar vóór de bijwerking faalt.

| | `locale`-veld | antwoord van de actie |
|---|---|---|
| `/nl/contact` | `nl` | Vul een geldig e-mailadres in. |
| `/de/contact` | `de` | Bitte geben Sie eine gültige E-Mail-Adresse ein. |
| `/es/contact` | `es` | Introduce un correo electrónico válido. |
| `/nl` (CtaBig) | `nl` | Vul een geldig e-mailadres in. |
| `/en` (CtaBig) | `en` | Enter a valid email. |

Nagemeten op `wbgiouuifqhasedncysw`: `marketing.leads` en `marketing.subscribers`
allebei **0 rijen, ook in de laatste twee uur**. De probe schreef niets weg.

#### Twee meters die eerst het verkeerde zeiden

**De geserveerde HTML draagt het formulier niet.** Een `curl | grep` op
`name="locale"` gaf 0 in alle vier de talen — wat leest als "het veld ontbreekt".
De positieve controle draaide dat om: `name="email"` gaf óók 0, en dat veld bestaat
zeker. Beide formulieren zijn client-componenten die pas na hydratie mounten. Ik mat
het verkeerde oppervlak, niet een defect. Dit staat al in het logboek van 20
augustus voor `read_page`; het geldt net zo goed voor `curl`.

**"No console logs" is pas een meting na een hartslag.** De lezer gaf leeg, ook
zonder foutfilter. Met een eigen `console.warn` erdoorheen bleek hij te werken —
dus die nul wás echt: nul console-fouten over de hele doorloop.

Verder: twee kliks in dezelfde tick werken niet op een React-wizard (de "Verder"-knop
is dan nog niet vrijgegeven), en de escape-laag brak opnieuw twee keer — een em-dash
als `—` in een gewone python-string, en gehalveerde backslashes in een
regexpatroon. Uitweg is dezelfde als op 20 en 22 augustus: **anker op regels zonder
speciale tekens, en gebruik raw strings.**

#### Meting

1021 tests in 46 bestanden, was 1013/45. i18n 706 sleutels × 4, was 699 — precies
+7 voor de nieuwe sleutels. tsc schoon, `regen:pricing:check` groen, build groen,
`CLAUDE.md` byte-identiek aan `AGENTS.md`.

### 2026-08-24 (vervolg) — zeventien Engelse zinnen op de sectorpagina's, en een poort die parseert in plaats van grept

Vervolg op de vorige PR. Die repareerde één plek waar geen poort keek; deze zoekt
de rest van die klasse en zet er wél een poort op.

#### Wat er stond

`app/[locale]/sectors/[slug]/page.tsx` droeg zestien JSX-tekstknopen met Engels
erin — de koppen "Where <em>revenue leaks</em> in this sector.", "The
<em>playbook</em>, applied to…", "<em>Proof</em> points.", de lede's eronder en
drie CTA's. Woordelijk hetzelfde op `/nl`, `/de` en `/es`. Vier sectoren maal
vier talen is zestien URL's, alle zestien in de sitemap, alle zestien met
hreflang naar elkaar.

Onderweg kwam er een zeventiende bij, drie regels onder de laatste: de FAQ-kop
stond als **prop**, `title={\`${s.name} — common questions\`}`. Die zag de
nieuwe poort in zijn eerste vorm niet — daarover verderop.

**Waarom vijf i18n-poorten hier langs keken.** `metadata-locales` leest
`generateMetadata`, `wees-sleutels` en `duits`/`nederlands` lezen `DICT`, en
`check-i18n-parity` legt de vier woordenboeken naast elkaar. Alle vijf gaan over
**sleutels**. Een zin die nooit een sleutel kreeg heeft niets om uit de pas mee
te lopen; hij is per constructie in evenwicht met zichzelf. Zelfde vorm als de
server-actions een uur eerder, en als `process.env[SECRET_ENV]` dat
`CAL_WEBHOOK_SECRET` maandenlang uit `.env.example` hield.

#### Een tweede defect in dezelfde regel

De playbook-kop deed `{s.name.toLowerCase()}`. Op `/de` maakte dat van
`Immobilien` het woord `immobilien` — Duitse zelfstandige naamwoorden houden hun
hoofdletter. Engelse zin plus verkeerd geschreven Duits zelfstandig naamwoord,
in één kop. De `.toLowerCase()` is weg; de sleutel draagt nu een `{sector}`-plek
en elke taal zet die op een naamvalsneutrale positie — dezelfde les als
`Einblicke zu {tag}` van 3 augustus.

#### De poort parseert, en dat sluit een hele klasse

De eerste opzet was een regex op `>tekst<`. Die gaf **339 treffers** waarvan de
meeste JS waren: `useRef<X>(null)`, pijlfuncties en vergelijkingen dragen
allemaal `<` en `>`. Een regex kan TSX niet lezen. Met de TypeScript-parser en
`ts.SyntaxKind.JsxText` zijn het er **86**.

Dat sluit meteen de klasse die deze repo deze maand vier keer raakte: een
tekstscan die op zijn eigen toelichting valt (`contactadressen`,
`persoon-entiteit`, `verzoeklimiet`, `server-acties`). Een parser ziet een
comment niet als JSX-tekst, dus er is geen commentaarstrip nodig — en dat wordt
in twee richtingen bewezen in plaats van aangenomen: een synthetische assertie én
een mutatie die dezelfde zin als comment in een écht bestand zet en groen moet
blijven.

#### Twee lijsten, en waarom de tweede een teller draagt

`TOEGESTAAN` is structureel en permanent: eigennamen (merk, domein, adres,
persoon, platform — op **exacte** gelijkheid, niet op substring, anders glipt
"Juan Diaz, LLC builds systems that make operators more money" er als eigennaam
doorheen), de root error boundary, de twee honeypots, de NL-only lekkage-scan,
`Testimonials` dat met een lege lijst `null` teruggeeft, en de `<em>`-splitsing
in `Story.tsx` die juist vertaalde kopij opdeelt.

`ACHTERSTAND` is gemeten en niet gerepareerd, met een teller die mag krimpen en
niet groeien. Het alternatief was ze in `TOEGESTAAN` zetten, en dat is precies
hoe "alleen op de homepage" bij `ResultsStrip` een besluit werd dat niemand ooit
nam: het was de plek waar het blok geboren werd en daarna keek er niemand meer
naar.

**Vier vrijstellingen dragen hun eigen voorwaarde**, zodat ze omvallen zodra het
feit eronder verandert: `lekkage-scan` moet in `ENKELE_TAAL` staan, `TESTIMONIALS`
moet leeg blijven, de honeypots moeten hun `aria-hidden` houden, en
`global-error.tsx` mag `LocaleProvider` niet importeren — want dan is Engels daar
een keuze in plaats van een gegeven.

#### De preloader is niet onzichtbaar, en het logboek zei van wel

Het logboek van 3 augustus noteerde dat de preloader "opacity: 0" is. Dat geldt
voor `.preload.done`, ná de dismissal. `.preload` zelf staat
`position: fixed; inset: 0; z-index: 300` en is tot 1,2 s zichtbaar voor élke
bezoeker. "Booting interface" is dus een echt lek en geen vrijstelling. Het staat
in de achterstand, samen met de skip-link — allebei in `app/layout.tsx`, buiten
het `[locale]`-segment, dus ze vergen een andere reparatie dan `translate(l, …)`.

**De verkeerde selector lezen is hetzelfde soort fout als de verkeerde catalogus
raadplegen.** Zie de partiële index van 21 augustus.

#### De deelkaart van elke taal is Engels

`app/opengraph-image.tsx` leek een vrijstelling: root-scope, geen taal
beschikbaar. Gemeten klopt dat niet. `app/[locale]/layout.tsx` zet
`images: OG_IMAGES`, en die wijst naar `/opengraph-image` — de **root**-kaart.
Wie `/nl` op LinkedIn deelt krijgt dus "I build the systems that make operators
more money." Achterstand, geen vrijstelling.

#### De poort miste zijn eigen pagina, drie regels lager

Bij de DOM-controle stond er een vijfde h2: **"Immobilien — common questions"**.
Een template literal als **prop**, geen tekstknoop. De blinde vlek die ik in de
kop van de poort had opgeschreven, op precies de pagina die de poort net schoon
had verklaard.

Voor uitbreiden eerst gemeten hoe groot die klasse is. De volle attribuutscan gaf
**53 treffers**, waarvan 16 `aria-hidden="true"`, acht `aria-labelledby` en zeven
`htmlFor` — verwijzingen en vlaggen. Wat werkelijk kopij draagt zijn **elf
waarden** over vier attributen (`aria-label`, `placeholder`, `title`, `alt`).
Klein genoeg voor een poort die niet binnen een week wordt uitgezet.

Wat daaruit kwam: `aria-label="Footer"` en `aria-label="Call +31 6 5314 2656"`
staan in vier talen in het Engels. Die hoort alleen een schermlezer — precies
waar toegankelijkheid en vertaling elkaar raken.

De attribuutscanner leest **alleen letterlijke waarden**. Komt de waarde uit
`translate(l, …)` of uit een variabele, dan is er niets letterlijks te vinden en
hoort deze poort er ook niets over te zeggen. Dat is met een groene mutatie
bewezen, niet aangenomen.

#### Zeventien mutaties, zeventien keer de voorspelde kleur

Vijftien rood op vijftien verschillende asserties, twee groen als controle. De
twee groene dragen het bewijs dat de poort niet grept: dezelfde zin als comment
in een echt bestand blijft onzichtbaar, en een attribuut uit `translate()` ook.

Het harnas weigert te draaien als een mutatie een bestand raakt dat niet in de
back-uplijst staat — die poort komt uit de ronde van 23 augustus, waar drie
bestanden beschadigd achterbleven en het enige signaal "na herstel: ROOD" was.

#### Drie keer was de meetlat stuk, en één keer mijn eigen transcriptie

**De sonde kapt af op 90 tekens.** Ik typte de lange vrijgestelde zinnen over uit
haar uitvoer en vulde de staarten zelf aan. Vier ervan waren fout — waar ik
"mail" schreef staat er "drop a line to". De classificatie per bestand is
handwerk en blijft dat; de letterlijke zinnen komen sindsdien uit de scanner.
**Een citaat dat je zelf hebt geschreven is geen bron, ook niet als het bijna
klopt.** Derde keer deze week.

**Veertien van de zestien pagina's "faalden" bij de eerste meting**, en alle
veertien zaten in de meetlat. De Engelse zinnen zochten ook op `/en`, waar ze de
nieuwe waarde zijn. De tag-stripper zette een spatie op de plek van elke tag, dus
`versickert</em>.` werd `versickert .` en matchte niet. En de sectornamen waren
overgetypt: `Hostelería` werd `Hostería`. Die laatste komt nu uit
`lib/sectors.ts` in plaats van uit mijn hoofd.

**Daarna nog vier**, allemaal `P&amp;L` in de bron tegen `P&L` in mijn
verwachting: de extractie decodeerde geen HTML-entities.

**En de Duitse FAQ-kop meldde "NIET GEVONDEN"** omdat mijn `ä` door de shell-laag
ging in een inline `python -c`. Vijfde escape-incident deze sessie. Op de pagina
stond gewoon "Immobilien — häufige Fragen".

#### Gemeten

Zestien sectorpagina's op een productiebuild, met de server-pid tegen de starttijd
gecontroleerd — een `curl` die slaagt bewijst dat er iets antwoordt, niet dat het
jouw proces is.

| | uitkomst |
|---|---|
| oude Engelse zinnen op nl/de/es | **0** over alle twaalf pagina's |
| nieuwe kopij, zichtbare tekst | 4/4 per pagina, plus de ROI-CTA alleen op energy |
| kale sleutelnaam op de pagina | 0 |
| playbook-kop met de sectornaam, eigen hoofdletters | 16/16 |
| FAQ-kop vertaald | 16/16 |
| 375 px | geen horizontale overloop |
| console | nul fouten — na een hartslag door de lezer |

1034 tests in 47 bestanden, was 1021/46. i18n **718** sleutels × 4, was 706 —
precies +12 voor de elf zinnen plus de FAQ-kop. tsc schoon,
`regen:pricing:check` groen, build groen.

#### Wat deze poort niet ziet

Een Engelse zin in `DICT.nl` (daar is de leesbeurt voor), kopij die via een
gewone prop van een oudercomponent binnenkomt, en attributen buiten de vier
genoemde. Dat staat in de kop van het bestand, zodat de volgende sessie niet
denkt dat een groen vinkje hier "alle kopij is vertaald" betekent.

#### Erbij op de operator-lijst

Niets. Dit is code, geen configuratie.

#### Twee dingen die opvielen en buiten deze PR blijven

- **`lib/sectors.ts:328` zegt "Hotellerie & Revenue".** `lib/i18n/duits.test.ts`
  verbiedt "Hotellerie" sinds 20 augustus — met reden: het was een derde Duits
  woord voor dezelfde sector naast Hospitality en Gastgewerbe. Die poort leest
  `DICT.de` en niet de bestanden, dus `lib/sectors.ts` glipte erlangs. Zelfde
  vorm als deze hele PR, één laag verder.
- **De achterstand van 22 regels is een echte lijst met echt werk**, geen
  formaliteit: de skip-link, de Engelse deelkaart van elke taal, de
  signals-tagpagina, het commandopalet, en drie `aria-label`s die alleen een
  schermlezer hoort.

### 2026-08-24 (vervolg) — vier treffers bleken er elf, en de poort die ze had moeten zien las het verkeerde bestand

De vorige sessie noteerde `lib/sectors.ts:328` als losse observatie: daar stond
"Hotellerie & Revenue", terwijl `lib/i18n/duits.test.ts` dat woord sinds 20
augustus verbiedt. Het repareren van die ene regel bleek de kleinste helft van
het werk.

#### Het defect was scherper dan "een derde woord"

De reden achter het verbod luidde dat Hotellerie een derde Duits woord was naast
Hospitality en Gastgewerbe. Bij het hertellen — mijn eigen tellingen uit augustus
verlopen, en dat is in dit logboek al drie keer misgegaan — bleek de rolverdeling
in `DICT.de` volstrekt vast:

| rol | woord | waar |
|---|---|---|
| **label** van de sector | Hospitality (14×) | `tag.label.hospitality`, `sectors.h.title.a` = **"Hospitality &"**, `sectors.h.ix`, contactformulier, hero, marquee |
| **proza**, sector in een lopende zin | Gastgewerbe (3×) | "Betreiber in Energie, Immobilien und Gastgewerbe" |

Daarmee is het geen smaakkwestie. De sectorkaart op `/de/sectors` zei
**"Hospitality &"** en de detailpagina waar hij naartoe linkt zei **"Hotellerie &
Revenue"**. Twee namen voor één sector, op twee pagina's die naar elkaar wijzen.
De reparatie van 20 augustus raakte `tag.label.hospitality` en niets anders,
omdat de poort `DICT.de` leest.

#### Vier werden er elf, en het tweede woord was erger

Een voormeting die de kopijmodules las in plaats van het woordenboek, gaf niet
vier treffers maar **elf**:

| bestand | woord | n |
|---|---|---|
| `lib/sectors.ts` (de) | Hotellerie | 4 |
| `lib/insights.ts` (de) | Hotellerie | 1 |
| `lib/insights.ts` (de) | **Operatoren** | **6** |

Die zes staan onder hetzelfde verbod van 20 augustus — Operatoren leest in het
Duits als wiskundige of machine-operatoren, terwijl het publiek overal elders
Betreiber heet (25×). Twee ervan zijn de **titel en de samenvatting** van een
Duits artikel, dus de `<title>` en de meta-description van een levende pagina.

Het artikel over de tien minuten voor check-in droeg het bewijs zelf: de eerste
alinea zegt "Hospitality ist eine der letzten Branchen", en drie blokken later
zegt het citaat "In der Hotellerie". Eén artikel, twee woorden.

#### De naamval was de val, niet het woord

`Operatoren → Betreiber` is geen zoek-en-vervang. Vijf van de zes staan in de
nominatief en houden hun vorm; **één staat in de datief**, en daar wordt het
`Betreibern`:

    ...ein Entscheidungsrahmen, der zur Realität von Betreibern passt.

Dat is dezelfde klasse als de `u → je`-pas van #237, die vijf grammaticafouten
maakte terwijl het script netjes "55 regels aangepast" meldde. De naamvallen zijn
daarom niet bedacht maar afgelezen uit `DICT.de`, waar één zin ze allebei draagt:
*"von Betreibern für Betreiber gebaut"*. Ook het citaat schoof mee — *in der*
Hotellerie (vrouwelijk) werd *im* Gastgewerbe (onzijdig).

Elke vervanging kreeg een eigen anker met een eigen aantal, en het patchscript
weigert te schrijven als één anker niet landt. Een half toegepaste patch is
erger dan geen patch.

#### De derde poort, en waarom hij data leest

`duits.test.ts` heeft er een blok bij dat dezelfde twee regels — aanspreekvorm en
teruggedraaide woorden — over `sectors.ts`, `ventures.ts` en `insights.ts` legt.
Hij leest de **geëxporteerde data** en niet de bestandstekst, om precies dezelfde
reden als de twee poorten erboven: anders struikelt het testbestand over zijn
eigen toelichting, waarin die woorden nu eenmaal moeten staan. Twee groene
mutaties bewijzen dat in plaats van het aan te nemen.

Twee dingen die er bewust in zitten:

- **De basis-tak voor `markets: ["de"]`-artikelen.** De drie Heimspeicher-stukken
  dragen hun Duits in de basisvelden en niet in `i18n.de`. Zonder die tak scant
  de poort de helft van de Duitse artikelen niet, en dat zou hem stil half zo
  sterk maken. Bewezen met een discriminerend paar: dezelfde overtreding is rood
  mét de tak en groen zonder.
- **Een aparte assertie die de kaart naast de pagina legt.** Die had het defect
  van vandaag rechtstreeks gevangen; de woordenlijst deed dat alleen omdat het
  woord toevallig ook verboden was. Een sectornaam die afwijkt zónder verboden
  woord is nu ook rood.

Vier vangnet-asserties per bron: elke bron levert aantoonbaar strings op en
draagt aantoonbaar Sie-vormen. Zonder die twee slaagt alles op een lege lijst —
een accessor die per ongeluk niets teruggeeft leest dan als schone kopij.

#### Het mutatieharnas vond een fout in mijn eigen poort

Eén mutatie werd **overgeslagen** met de melding "anker 2×". Dat was geen
harnasfout: ik had de woordenlijst-controle in de nieuwe describe overgeschreven
in plaats van gedeeld. Twee kopieën van dezelfde controle lopen uiteen en dan
bewaakt de zwakste — dezelfde klasse als de rest van deze PR, één laag hoger. Nu
staan `duTreffers()` en `verbodenTreffers()` er één keer en roepen beide poorten
ze aan.

**Een anker dat plotseling twee keer staat, is een dubbeling die je nog niet
gezien had.**

#### Twee keer voorspelde ik de verkeerde kleur, en dat was allebei leerzaam

*"Zet de controle uit"* op schone kopij bleef groen, waar ik rood verwachtte. Dat
is geen zwakke poort maar een onmogelijke mutatie: een vinder die niets zoekt
vindt niets, en een lege lijst slaagt. De geldige vorm is tweeledig — zet de
controle uit **én** breng de overtreding terug. Blijft dat groen, dan kwam het
rood van die controle.

Bij de tweede poging bleef één van die paren toch rood, opnieuw tegen de
verwachting in. Reden: de sectornaam is **dubbel bewaakt**, door de woordenlijst
én door de nieuwe naam-consistentietest. Het discriminerende paar draait daarom
op het citaat in `insights.ts`, dat maar één controle raakt — en de dubbele
bewaking staat er nu als eigen mutatie in, met rood als verwachte kleur.

Dertien mutaties, dertien keer de voorspelde kleur, groen na herstel, nul sporen
achtergebleven.

#### Gemeten

Na de reparatie leverde de voormeting over de drie kopijmodules **0
teruggedraaide woorden en 0 du-vormen** op, met de Sie-controle op 8, 4 en 91.
Wat er in de repo aan treffers overblijft staat uitsluitend in de toelichting van
de poorten zelf.

Op een productiebuild, met de pid van de server tegen de starttijd gecontroleerd:

    /de/sectors                     "Hospitality" 14x
    /de/sectors/hospitality         Hotellerie 0x · Operatoren 0x
      <title>   Revenue- und Operations-Consultant Hospitality · Juan Diaz
                58 tekens (46 + achtervoegsel, budget 48)
      h1        Hospitality & Revenue
      lede      Hospitality ist eine der wenigen Branchen, ...
    /de/insights/the-ten-minutes-before-check-in    0x / 0x
    /de/insights/the-build-vs-buy-trap              0x / 0x
    /de/insights/the-automation-roi-myth            0x / 0x
    /de/insights/why-operator-crms-fail             0x / 0x

Zes positieve controles ernaast, want nul is pas een meting nadat het instrument
bewees te kunnen vinden: de teller vindt Gastgewerbe op de sectorpagina,
Betreiber in het artikel, de datiefvorm Betreibern in de meta-description, en een
verzonnen woord niet.

In de DOM op 375 px: geen horizontale overloop, geen element buiten beeld, h1 335
× 83 px, en nul console-fouten — dat laatste ná een hartslag door de lezer, want
een lege lijst uit een kapotte lezer leest hetzelfde als een schone meting. Een
screenshot lukte niet; de browser-pane compositeert hier geen frames, dus dit is
in de DOM gemeten en niet op het oog.

**1047 tests in 47 bestanden**, was 1034/47 — precies +13 voor de nieuwe poort.
tsc schoon, i18n 718 × 4 (ongewijzigd: alleen waardes), prijsgenerator groen,
build groen.

#### Wat deze poort niet ziet

Of het Duits klópt — daar is een lezer voor, en die leesbeurt is op 20 augustus
gedaan. En kopij die in een component staat in plaats van in een module; die
klasse is van `lib/i18n/kale-tekst.test.ts`.

#### Onderweg

Het zevende escape-incident van deze sessie: een patchscript met backticks,
dollartekens en backslashes in het anker ging door de shell-laag en kwam er
ongelijk uit. Het harnas is daarna niet gepatcht maar herschreven via het
Write-gereedschap. Anker op regels zonder speciale tekens, of schrijf het
bestand opnieuw.

### 2026-08-24 (vervolg) — dezelfde sector onder twee namen, nu in het Nederlands

De vorige PR repareerde het Duits en liet één vraag open: staat deze klasse ook
in de andere talen? Ja, en de Nederlandse versie was erger dan de Duitse.

#### Wat er stond

| | kaart (`DICT`) | pagina (`lib/sectors.ts`) |
|---|---|---|
| nl | Hospitality **& omzet** | **Horeca** & revenue |
| de | Hospitality **& Umsatz** | Hospitality & **Revenue** |

Het Nederlands week op allebei de helften af, het Duits alleen op de tweede. Dat
verschil is verklaarbaar en het is een les over de poort zelf: de assertie uit
#248 stond in `lib/i18n/duits.test.ts`, keek dus alleen naar Duits, en knipte
bovendien met `replace(/\s*[&·—-]\s*.*$/, "")` alles weg vanaf de `&`. **De helft
die hij las was toevallig de helft die klopte.**

Er is een derde naamdrager, en die stond er ook naast: `tag.label.hospitality`
(nl) luidde "Horeca" en is de H1 én de `<title>` van
`/nl/insights/tag/hospitality`.

#### De beslissing, en wat er bewust níét is aangeraakt

Juan koos het Duitse precedent: **het label wint, het moedertaalwoord blijft voor
proza.** Drie strings om — de Nederlandse en Duitse sectornaam en het Nederlandse
taglabel.

`horeca` blijft staan in `seoTitle` en `seoDescription`, en dat is geen slordigheid
maar het punt: een Nederlandse operator zoekt op *horeca*, niet op *hospitality*.
Dat is zoekkopij en geen merklabel. De Duitse tegenhanger ging in #248 wél om
(`…Consultant Hotellerie` → `…Consultant Hospitality`), omdat "Hotellerie" daar
één van drie concurrerende woorden was; "horeca" is in het Nederlands de enige
gangbare term.

**Zichtbaar gevolg, en het staat hier zodat niemand het voor een defect aanziet:**
op `/nl/sectors/hospitality` luidt de H1 nu "Hospitality & omzet" en opent de zin
eronder met "Horeca is een van de weinige sectoren…". Duits doet dat inmiddels
anders ("Hospitality ist eine der wenigen Branchen"). Die lede omzetten is één
string en is bewust niet meegenomen — het is een aanbodkeuze, geen reparatie.

#### De poort is verhuisd, verbreed en verdrievoudigd

`lib/sectornamen.test.ts` (nieuw) vervangt de Duits-only assertie. Hij leest
**alle sectoren in alle vier de talen** en vergelijkt de **hele** naam. Drie
dingen zitten er met opzet in:

- **Een normalisator met eigen tests.** Hij plakt een afbreking aan elkaar
  (`"Vast-"` + `"goed"` = Vastgoed — de kaart rendert over twee regels) en negeert
  het voegwoord, zodat de Spaanse pagina's `y`/`e` mogen gebruiken waar de kaarten
  `&` schrijven. Dat is beter Spaans en geen naamverschil. Zonder de drie tests op
  de normalisator zelf is elke groene uitkomst ook te verklaren door een
  normalisator die alles gelijkmaakt.
- **Een uitzondering die zijn eigen voorwaarde draagt.** `adjacent` mág afwijken
  (de kaart is een uitnodiging — "Ergens anders" — de pagina de formele naam), en
  de test eist dat hij in **álle** talen afwijkt. Repareert iemand hem in één
  taal, dan is de uitzondering niet meer waar en valt de poort om in plaats van
  stil te blijven staan.
- **Een dekkingsassertie op de slug→voorvoegsel-tabel.** `real-estate` heet
  `sectors.re` en `adjacent` heet `sectors.adj`; dat is niet af te leiden. Zonder
  die assertie ontsnapt een vijfde sector stilzwijgend aan deze hele poort.

De derde naamdrager is er ook bij: **het taglabel is telkens het eerste deel van
de sectornaam.** Gemeten klopt dat in alle twaalf sector-taalcombinaties —
Energie/Energie & zon, Vastgoed/Vastgoed, Hostelería/Hostelería e ingresos. Het is
dus een echte regel en geen toeval, en nu een assertie.

#### `lib/signals.ts` stond in geen enkele poort

53 strings per taal, 159 in totaal, gelezen door niets — ook niet door de Duitse
poort van gisteren. Erbij gezet, en het was gratis: 0 du-vormen, 0 teruggedraaide
woorden, 12 Sie-strings als positieve controle.

Het gat kon bestaan omdat `KOPIJ` zijn bronnen nergens bij naam noemde. Dat doet
hij nu wel, met een assertie erop — **een bron kan alleen nog verdwijnen met een
zichtbare bewerking.** Dezelfde vorm als `HOORT_TE_STAAN` in `ResultsStrip.test.ts`.
En de gedeelde ondergrens `> 50` is een ondergrens per bron geworden: signals heeft
er 53 en zou er nét langs zijn gekomen, om vervolgens bij het schrappen van één
signal om de verkeerde reden om te vallen.

#### Twaalf mutaties, twaalf keer de voorspelde kleur

Elf rood op elf verschillende asserties, één groen als controle. De groene is de
belangrijkste: het woord "Horeca" in een **toelichting** zetten blijft onzichtbaar,
want deze poorten lezen de geëxporteerde data en niet de bestandstekst. Dat is
precies waar `contactadressen.test.ts`, `persoon-entiteit.test.ts` en
`verzoeklimiet.test.ts` eerder wél over struikelden.

De sprekendste rode is de Duitse tweede helft: die mutatie zou onder de poort van
#248 groen zijn gebleven.

#### Vier meetlatten braken, allemaal op een woordgrens die de taal niet kent

1. **`/\bpida\b/` matchte in `rápida`.** In JS is `\b` ASCII-gebaseerd: `á` telt
   niet als woordkarakter, dus staat er een grens vóór `pida`. **De `u`-vlag
   repareert dat niet en er is geen vlag die het wel doet.** De gemergede poorten
   gebruiken `split(/[^a-zà-ÿ]+/)` en zijn immuun; mijn sonde niet. Daardoor
   telde ik twee Spaanse usted-vormen die er niet stonden.
2. **Een Nederlandse scan op `u` als los woord valt op "24u responstijd"** — de
   afkorting voor *uur*, in `pricing.feat.support.*`. Dezelfde vorm, ander alfabet.
3. **Een strikte scan op het voornaamwoord `usted` telt er vijf**, terwijl Spaans
   het voornaamwoord meestal weglaat en het register in de werkwoordsuitgang
   draagt. `Deje sus datos y cuénteme` bevat geen `usted` en is het wel.
4. **De drie Spaanse `estas` waren alle drie correct.** Zonder accent is het het
   aanwijzende "deze" ("Estas son las notas", "ninguna de estas cuatro"); de RAE
   schrapte dat accent in 2010.

Dat is de les die overblijft: **een tekstscan erft de aannames van de taal waarin
hij geschreven is.** Elke telling is met de hand nagelezen voordat hij hier staat.

#### Achtste escape-incident, en de vorm ervan is nu bekend

Een heredoc halveerde `\\r\\n` tot `\r\n`, waarna Python een echte newline in een
stringliteral zag en met een `SyntaxError` viel. Daarnaast miste een patch-anker
met een ingebedde `\n` op een CRLF-bestand — twee keer, allebei **luid**, omdat
elk anker een aantal draagt en het script pas aan het eind schrijft.

De uitweg is inmiddels routine: het script via het Write-gereedschap, regeleinden
via `chr(13) + chr(10)`, en lezen met genormaliseerde newlines en terugschrijven in
het regeleinde dat het bestand had.

Onderweg sloeg ook mijn eigen nacontrole aan: `"tag.label.hospitality":
"Hospitality"` bestónd al, bij Engels en Duits. De controle eiste nul voorkomens
waar hij een **toename van precies één** had moeten eisen. Een taallabel dat in
vier woordenboeken staat mag in meerdere ervan dezelfde waarde dragen.

#### Meting

1090 tests in 48 bestanden, was 1047/47 — en de +43 is uitgesplitst: −1 verhuisde
assertie, +4 voor signals in de Duitse poort, +1 KOPIJ-dekking, +39 in het nieuwe
bestand. i18n 718 × 4 ongewijzigd (alleen waardes). tsc schoon, prijsgenerator
groen, build groen.

Op een productiebuild, met de pid van de server tegen het startlog gecontroleerd,
zeven pagina's en drie positieve controles:

```
/nl/sectors                    "Hospitality & omzet" aanwezig · "Horeca &" 0x
/nl/sectors/hospitality        h1 Hospitality & omzet
                               title Revenue- en operations consultant horeca
/nl/insights/tag/hospitality   h1 Schrijven over Hospitality.   (was: over Horeca)
/de/sectors/hospitality        h1 Hospitality & Umsatz
/en/sectors/hospitality        h1 Hospitality & revenue         (ongewijzigd)
/es/sectors/hospitality        h1 Hostelería e ingresos         (ongewijzigd)
```

Nul afwijkingen. De teller vindt "Hospitality" 10×, "horeca" 10× en een verzonnen
woord 0× — want nul is pas een meting nadat het instrument bewees te kunnen vinden.

#### Wat hierna nog open staat

- **Het Spaanse register.** Acht strings in `DICT.es` spreken de bezoeker met
  *usted* aan, tegen 36+ met *tú*, en de kopijmodules (632 strings) dragen er nul.
  De discriminerende meting: nl en de houden hun register vast op de
  privacypagina, Spaans is de enige taal die daar omslaat. Het scherpste bewijs
  staat in twee zinnen die elkaar tegenspreken — `cta.lede` zegt "Si no, **te**
  digo quién puede", `contact.page.lede` zegt "Si no, **le** digo quién sí puede".
  Beslist op 24 augustus: omzetten naar tú. Eigen PR.
- **`nederlands.test.ts` leest alleen `getAllInsights("nl")`** — 283 Nederlandse
  strings in dict, sectors, ventures en signals staan in geen poort. Verbreden is
  bijna gratis: twee treffers, allebei de `uur`-afkorting hierboven.
- **Er is geen Spaanse poort.**
- **De Nederlandse lede** opent met "Horeca" onder een H1 die "Hospitality" zegt.
  Eén string, aanbodkeuze.

### 2026-08-24 (vervolg) — het Spaanse register, en een regel die twee talen tegen elkaar houdt

Derde en laatste ronde in dezelfde klasse: kopij die buiten `dict.ts` woont, of
een register dat geen enkele poort las. Het Duits was #248, de sectornamen #249,
en dit is het Spaans.

#### Wat er stond, en waarom mijn eerste twee tellingen te laag waren

De Spaanse site is tú. Vierentwintig strings zeiden usted. Het scherpste bewijs
stonden twee zinnen die elkaar tegenspraken:

| sleutel | es |
|---|---|
| `cta.lede` | "Si no, **te** digo quién puede" |
| `contact.page.lede` | "Si no, **le** digo quién sí puede" |
| `cta.title.b` | "los ingresos que **estás** dejando sobre la mesa" |
| `contact.page.title` | "los ingresos que **está** dejando sobre la mesa" |

**Ik heb er eerst acht gemeld, daarna tweeëntwintig, en het zijn er
vierentwintig.** Elke telling was met een breder instrument dan de vorige, en dat
is precies de reden dat het getal steeg — niet omdat er iets veranderde.

Waarom dit lastiger meet dan Duits: **Spaans laat het voornaamwoord meestal weg
en draagt het register in de werkwoordsuitgang.** `Deje sus datos y cuénteme`
bevat het woord `usted` niet en is het wel. Een scan op het voornaamwoord telde
er vijf van de vierentwintig. En `su`/`sus` is geen bruikbaar signaal: dat is óók
derde persoon ("su factura" van de klant), dus verbieden levert tientallen valse
treffers op.

#### De regel die het wél zag: houd het Nederlands ernaast

De twee laatste vondsten — `contact.page.title` en `priv.optout.body` ("Si aun
así **prefiere** salir, **use** el interruptor") — dragen geen `usted`, geen
`su`, en geen werkwoordsvorm die in mijn handmatige lijst stond. Ze kwamen boven
door een andere vraag te stellen:

> waar het Nederlands de lezer informeel aanspreekt, moet het Spaans dat ook doen

Dat werkt omdat het Nederlands **onafhankelijk vastlegt dát de zin de lezer
aanspreekt**. Gemeten over het woordenboek: 72 sleutels waar nl "je/jij/jouw"
zegt, 39 waar es geen tú-vorm draagt, en na aftrek van de al gevonden gevallen
tien om met de hand te lezen. Zeven daarvan zijn onpersoonlijk Spaans
(`antes de firmar`, `Ver lo que está pasando`, `No se le puede mentir a un
edificio`), één was een gat in mijn markerlijst, en twee waren echt.

#### Twee ontwerpen naast elkaar, en de strengere was de slechtere

Met alleen voornaamwoorden als tú-marker bleven er 19 uitzonderingen over, met
een werkwoordslijst erbij 8. Dat leest als "strenger is beter", en dat is het
niet: **elf van die negentien spreken de lezer wél in tú aan, via de
werkwoordsuitgang.** Ze op een lijst zetten met als reden "Spaans is hier
onpersoonlijk" zou een onwaarheid vastleggen op precies de plek waar een
volgende sessie hem vertrouwt. Een uitzonderingslijst met een onware reden is
erger dan geen uitzonderingslijst.

De prijs van de andere kant is echt en staat opgeschreven: schrijft iemand
nieuwe tú-kopij met een werkwoord dat niet in `TU_MARKERS` staat, dan gaat de
poort af. Dat is **luid** en heeft twee geldige oplossingen, en de foutmelding
noemt ze allebei — de zin is usted (herschrijf hem), of de zin is tú met een
nieuwe vorm (zet hem erbij).

#### `lib/i18n/spaans.test.ts` — drie lagen die elkaar niet overlappen

1. **Het voornaamwoord en tien ondubbelzinnige usted-vormen**, elk met de reden
   en de tú-vorm die ervoor in de plaats kwam. Alleen imperatieven met een
   aangehecht voornaamwoord (`sáltese`, `cuénteme`, `pregúntele`) — die hebben
   geen tweede lezing.
2. **Een expliciete lijst van vormen die BEWUST niet verboden zijn.** `quiere`
   staat nog 5× in de kopij, `vea` 2×, `prefiere` 1×, alle drie als derde
   persoon. Een assertie eist dat geen van deze acht in de verbodslijst
   belandt — anders slaat de poort alarm op correcte zinnen en wordt hij binnen
   een week uitgezet.
3. **De gekoppelde regel** met 13 uitzonderingen, elk met de constructie erbij.
   Plus een assertie dat een uitzondering die niet meer waar is omvalt in plaats
   van te blijven staan.

De poort valt op zijn eigen aanleiding: mijn eerste versie had bij één verboden
vorm `"idem."` als reden staan, en de lengtecontrole op redenen gooide hem eruit.

#### De Nederlandse poort las 1001 strings niet

`nederlands.test.ts` las alleen `getAllInsights("nl")`. Dict, sectors, ventures
en signals stonden in geen enkele Nederlandse poort — dezelfde vorm als
`lib/signals.ts` gisteren. Verbreed naar alle vijf de bronnen, met per bron twee
ondergrenzen: op het aantal strings, én op het aantal met "je" erin, zodat een
bron die per ongeluk Engels serveert niet langs de eerste komt.

**Nul te repareren, twee valse treffers.** `pricing.feat.support.*` zegt "24u
responstijd" en "4u tijdens werkuren", en de splitser zag cijfers als
scheidingsteken — dus "24u" werd "24" plus "u", het voornaamwoord. Cijfers horen
bij het woord. Dat is dezelfde klasse als de accenten in de Spaanse splitser:
**een tekstscan erft de aannames van de taal waarin hij geschreven is.**

#### Vijftien mutaties, vijftien keer de voorspelde kleur

Veertien rood op twaalf verschillende asserties, één groen als controle. De twee
sprekendste zijn `contact.page.title` en `priv.optout.body` terugzetten: die
vallen op laag 3 en zouden onder laag 1 én onder een handmatige werkwoordssweep
groen zijn gebleven. De groene controle zet een usted-zin in een **toelichting**
in `dict.ts` en hoort onzichtbaar te blijven, want deze poorten lezen de
geëxporteerde data en niet de bestandstekst.

#### Vier keer mat ik het verkeerde oppervlak

De eerste productiemeting gaf negen missers terwijl álle "mag niet"-controles
slaagden. Dat is intern tegenstrijdig, en dus zat de fout in de naald:

1. **Ik gokte HTML-entities** (`&#225;`) waar Next rauwe UTF-8 uitlevert. Alleen
   de accentloze naalden matchten, wat het patroon precies verborg.
2. **`work.d.want.*` staat op `/es/work/[slug]`**, niet op de index.
3. **`insights.d.want.*` staat op `/es/insights/[slug]`.**
4. **`priv.optout.body` staat achter een laadwacht in een clientcomponent** en
   zit dus helemaal niet in de geserveerde HTML — daar staat
   `priv.optout.loading`. Alleen in de DOM te meten, ná hydratie.

De vierde is de vierde keer deze maand dat het geserveerde oppervlak niet is waar
de string staat. Het formulier op `/contact` deed het op 24 augustus ook al.

#### Meting

Op een productiebuild, met de poort vooraf aantoonbaar vrij en het startlog
gelezen om te bevestigen dat het mijn eigen proces was. Tien pagina's, 34
verwachte vormen aanwezig, 37 oude vormen verdwenen, drie positieve controles:

```
/es/privacy      /es/contact      /es/insights      /es/tools/energy-roi
/es/work/voltafy /es/insights/…   /es              /es/story
/nl/privacy      /en/privacy      (controles, ongewijzigd)

AFWIJKINGEN: 0
```

In de DOM op `/es/privacy`: de opt-out-alinea rendert in tú, `usted` 0×, geen
horizontale overloop, en nul consolefouten — gemeten ná een hartslag door de
lezer, want een lege lijst uit een kapot instrument leest hetzelfde als een
schone meting.

Over alle vijf de Spaanse bronnen samen — 1328 strings — staat het
voornaamwoord `usted` nul keer, met 116 tú-strings als positieve controle.

```
tsc --noEmit             exit 0
vitest run               1127 tests in 49 bestanden (was 1090/48)
i18n:check               718 sleutels × 4 (ongewijzigd: alleen waardes)
regen:pricing:check      groen
next build               groen
```

De +37 is uitgesplitst: 22 in de nieuwe Spaanse poort, 15 door de verbreding van
de Nederlandse (4 → 19).

#### Wat hierna nog open staat

- **Er is geen Engelse poort**, en die is ook niet in deze vorm te bouwen: het
  Engels kent het onderscheid niet dat de andere drie talen bewaken.
- **Zeven Spaanse sleutels waar het Nederlands de lezer aanspreekt en het Spaans
  onpersoonlijk blijft.** Dat is verdedigbaar Spaans en geen defect, maar het is
  wel een keuze die niemand bewust heeft gemaakt.
- **De Nederlandse lede** op `/nl/sectors/hospitality` opent nog met "Horeca"
  onder een H1 die "Hospitality" zegt. Eén string, aanbodkeuze.

### 2026-08-24 (vervolg) — de kop zei Hospitality, de zin eronder zei Horeca

Het laatste openstaande punt uit #250, en het was geen aanbodkeuze meer zodra
#249 de naam had vastgezet. Op `/nl/sectors/hospitality` luidde de H1
"Hospitality & omzet" en opende de zin er direct onder met "Horeca is een van de
weinige sectoren…". Twee namen voor één sector, met één regel wit ertussen.

**Eén string, drie oppervlakken.** `SECTORS[…].i18n.nl.summary` voedt de
zichtbare lede, de kaart op `/nl/sectors` (afgekapt op 180 tekens) en
`description` in de JSON-LD. Het stond dus ook op de index en in wat Google
leest.

**Alleen het Nederlands week af.** Duits was in #248 al omgezet ("Hospitality ist
eine der wenigen Branchen"), Engels en Spaans waren het altijd met hun eigen kop
eens. Dat maakt het geen smaakkwestie: drie talen deden hetzelfde en één niet.

#### De poort van gisteren las de helft die toevallig klopte

#249 zette een naam-consistentietest neer, en die had dit moeten zien. Twee
redenen waarom niet. Hij stond in `lib/i18n/duits.test.ts` en las dus alleen
Duits. En hij knipte met `replace(/\s*[&·—-]\s*.*$/, "")` alles weg vanaf de `&`,
zodat van "Hospitality & omzet" alleen "Hospitality" overbleef — precies de helft
die al goed was. De helft die fout was, las hij niet.

#### Bijna een verzonnen regel

De voor de hand liggende poort is "de sectornaam staat in de eerste zin van de
samenvatting". Gemeten klopt dat niet: `energy` en `adjacent` benoemen zichzelf
in **geen enkele** taal, `real-estate` in alle vier. Zo'n eis zou twee sectoren
rood maken op kopij waar niets mis mee is.

Wat wél een regel is, en gemeten: **binnen één sector doen de vier talen
hetzelfde.** hospitality stond 3-om-1, en die 1 was het defect.
`lib/sectornamen.test.ts` eist die overeenstemming en niet de uitkomst, zodat een
bewuste herschrijving in alle vier de talen gewoon mag.

Vier zelftests eronder, want zonder die vier is elke groene uitkomst ook te
verklaren door een lezer die overal hetzelfde antwoord geeft. De scherpste is
woordelijk het defect: `noemtDeSector("Hospitality & omzet", "Horeca is een van
de weinige sectoren.")` moet `false` zijn.

**Drie keer blijft "horeca" staan**, met opzet: in `seoTitle`, `seoDescription`
en `proof[0].body`. De eerste twee zijn zoekkopij — een Nederlandse operator
zoekt op *horeca*, niet op *hospitality* — en de derde is het woord in lopende
tekst. Zelfde precedent als het Duits, waar `de.proof[0].body` "Hotelbetrieb"
houdt. Het Duits ging in #248 wél om in `seoTitle`, omdat "Hotellerie" daar één
van drie concurrerende woorden was; "horeca" is in het Nederlands de enige
gangbare term.

#### Zes mutaties, zes keer de voorspelde kleur

Vijf rood, één groen als controle. Mutatie 1 (nl terug naar Horeca) en mutatie 2
(de weg van Hospitality) vallen **op dezelfde assertie vanaf tegenovergestelde
kanten** — dat is wat "eis overeenstemming, niet de uitkomst" in de praktijk
betekent. De groene controle zet de oude opening in een **toelichting** en hoort
onzichtbaar te blijven, want de poort leest de geëxporteerde data.

Die groene controle sloeg eerst over op `anker 0x`: mijn anker gebruikte LF
tussen `summary:` en de string, en dit is een CRLF-repo. **Luid gefaald in plaats
van stil groen** — daar staat die ankertelling voor.

#### De meetlat brak op het spiegelbeeld van gisteren

Drie van de vier talen meldden `MIS` op de H1 terwijl de lede en de JSON-LD
klopten. Intern tegenstrijdig, dus de fout zat in de naald: de pagina levert
`Hospitality &amp; omzet` en mijn anker droeg `&`.

Gisteren gokte ik HTML-entiteiten waar Next rauwe UTF-8 levert; vandaag gokte ik
rauw waar HTML de entiteit verplicht. De regel die beide gevallen dekt is niet
"Next levert rauwe UTF-8", maar **HTML escapet de vijf markup-tekens (`& < > " '`)
en verder niets** — accenten niet, een ampersand wel. Het Spaans slaagde alleen
omdat "Hostelería e ingresos" geen `&` draagt. Decodeer dus voordat je
vergelijkt.

#### Meting

Op een productiebuild, met de poort vooraf aantoonbaar vrij (`netstat` 0) en het
startlog gelezen om te bevestigen dat het mijn eigen proces was.

```
                       h1                      openingszin        jsonld-description
/nl/sectors/hospitality  Hospitality & omzet     Hospitality …      OK
/de/sectors/hospitality  Hospitality & Umsatz    Hospitality …      OK
/en/sectors/hospitality  Hospitality & revenue   Hospitality …      OK
/es/sectors/hospitality  Hostelería e ingresos   La hostelería …    OK

/nl/sectors   Hospitality 2x · Horeca 0x
/de/sectors   Hospitality 4x · Gastgewerbe 0x

AFWIJKINGEN: 0
```

Drie positieve controles ernaast, want nul is pas een meting nadat het instrument
bewees te kunnen vinden. In de DOM op 375 px: h1 335 × 83 px, horizontale
overloop 0, nul elementen buiten beeld, nul kale sleutels, en nul consolefouten —
dat laatste ná een hartslag door de lezer.

```
tsc --noEmit             exit 0
vitest run               1135 tests in 49 bestanden (was 1127/49)
i18n:check               718 sleutels × 4 (ongewijzigd: alleen een waarde)
regen:pricing:check      groen
next build               groen
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +8 is vier zelftests plus vier sectoren.

#### Wat hierna nog open staat

Ongewijzigd ten opzichte van #250, min de Nederlandse lede: er is geen Engelse
poort en die is in deze vorm ook niet te bouwen, en zeven Spaanse sleutels blijven
onpersoonlijk waar het Nederlands de lezer aanspreekt.

### 2026-08-24 (vervolg) — zeven Spaanse sleutels werden er dertien, en het bestand eronder stond in geen enkele poort

De vorige ronde liet zeven Spaanse sleutels open staan: plekken waar het
Nederlands de lezer aanspreekt en het Spaans onpersoonlijk blijft, genoteerd als
"verdedigbaar Spaans en geen defect, maar wel een keuze die niemand bewust heeft
gemaakt". Bij het meten groeide dat twee keer, allebei omdat de meting iets
liet zien wat de aanname niet droeg.

#### De zeven waren er dertien, en vier ervan waren nooit onpersoonlijk

`ONPERSOONLIJK` in de Spaanse poort telde er dertien, niet zeven. Mijn eigen
telling van een dag eerder was te laag — het derde geval deze maand dat een
cijfer uit dit logboek binnen een etmaal verliep.

Met het Nederlands en Engels ernaast gelegd viel de lijst in drie stukken:

| | n | wat |
|---|---|---|
| omgezet | 6 | het Spaans was de afwijkende taal van de vier |
| behouden | 1 | `process.1.body` — en en es hebben géén onderwerp ("before touching anything" / "antes de tocar nada"), **nl** is hier de afwijkende |
| stond er ten onrechte op | 4 | ze spreken de lezer wél aan, met `ves`, `uses`, `superas`, `sáltate` |

Die laatste vier zaten op de uitzonderingslijst omdat hun werkwoord niet in
`TU_MARKERS` stond, en elk droeg een reden die een ándere zinsnede citeerde dan
die waar het om ging. Dat is nu een assertie: **elke uitzondering citeert een
fragment dat werkelijk in de Spaanse waarde staat.** Hij ging meteen af op mijn
eigen tekst — de reden bij `process.1.body` schreef "Ver lo que está pasando"
terwijl er "Ver lo que **realmente** está pasando" staat. Een parafrase die zich
voordoet als citaat is precies het soort uitzondering dat een jaar later
niemand meer kan controleren.

`ONPERSOONLIJK` ging van dertien naar drie.

#### De drift die ik zelf maakte, en die de productiemeting terugvond

Na de zes omzettingen gaf de productiesonde `AFWIJKINGEN: 1`. "Un contrato de
proveedor sobre la mesa" stond er nog één keer — in `lib/seo/faqs.ts`, een
tweede kopie van een zin die ik net in `dict.ts` had veranderd.

#### `lib/seo/faqs.ts` stond in geen enkele taalpoort

58 strings per taal, gelezen door niets. De drie taalpoorten lezen `dict.ts`,
`sectors.ts`, `ventures.ts`, `signals.ts` en `insights.ts`; dit bestand kwam in
geen van die vijf lijsten voor.

Het kostte wat je verwacht. De drie lagen er met de hand overheen gelegd gaven
nul `usted`, maar **zeven echte registerdefecten**: de vier sector-FAQ's spreken
het bedrijf met `ustedes`/`su` aan terwijl HOME, CONTACT en SERVICES in
hetzelfde bestand `vosotros`/`tú` zeggen.

| stond er | werd | precedent in ditzelfde bestand |
|---|---|---|
| ¿Trabajan con instaladores…? | ¿Trabajáis…? | HOME: "¿Con qué sectores trabajáis?" |
| ¿Pueden integrarse con ERP…? | ¿Podéis integraros…? | idem |
| ¿Integran con Idealista…? | ¿Integráis…? | idem |
| ¿Construyen sistemas PMS? | ¿Construís…? | HOME: "¿Construís desde cero…?" |
| ¿Pueden cubrir F&B…? | ¿Podéis cubrir…? | idem |
| ¿Pueden ayudar con operaciones…? | ¿Podéis ayudar…? | idem |
| Su funnel necesita… | Tu funnel necesita… | adjacent: "Si tu negocio es…" |

Geen dialectkeuze dus, maar drift binnen één bestand. De site schrijft
schiereiland-Spaans (`más IVA`, Idealista, Fotocasa), en daar is `vosotros` de
informele meervoudsvorm en `ustedes` juist de formele — precies het register dat
de rest van de site niet gebruikt.

Daarbovenop drie losse dingen: de drift van hierboven, een taalfout die bij het
lezen opviel (`se beneficien` → `se benefician`, aanvoegende wijs waar de
aantonende hoort), en één echte afwijkende (`SERVICES[2].a`: en "You get the
number", de "bekommen Sie", nl "krijg je", es onpersoonlijk → "Recibes la
cifra").

Duits en Nederlands zijn in ditzelfde bestand nagemeten en waren schoon: 0
du-vormen, 0 teruggedraaide woorden, 28 Sie-vormen als controle; 0 u/uw, 0
ASCII-vormen, 23 je-vormen als controle. Het gat bestond in alle drie de
poorten, maar beet alleen in het Spaans.

#### Twee nieuwe poorten, en waarom de ene een tekstscan is

`faqStrings(locale)` platslaat de vier FAQ-exports tot paden met waarden, en
hangt het bestand daarmee in alle drie de taalpoorten. De koppeling in de
Spaanse poort gaat **op pad en niet op index**: een sector die in één taal een
vraag mist, verschuift dan niet stilzwijgend alle antwoorden erachter.

`lib/seo/faq-dekking.test.ts` bewaakt de uitlezer zelf. `faqStrings` noemt zijn
bronnen met de hand, dus een vijfde `*_BY_LOCALE`-export die iemand vergeet toe
te voegen laat de poort stil mínder lezen. **Een module-import kan dat per
definitie niet zien** — hij kent alleen wat er geïmporteerd wordt; de
bestandstekst kent de export wél. Zelfde reden als bij
`components/sections/Ventures.test.ts`, waar een tweede lijst náást de eerste
stond.

#### De symptoomzinnen staan op twee plekken — nu met een poort eromheen

De drift hierboven was geen incident maar een klasse. `/services` toont per
dienst één symptoom uit `dict.ts`; het routeringsantwoord in de SERVICES-FAQ
citeert diezelfde vier zinnen. Gemeten over vier talen × vier diensten klopt dat
in **16 van de 16** — na normalisatie van de apostrof, want `dict.ts` schrijft
`don’t` met een krul waar `faqs.ts` `don't` recht schrijft.

Die normalisatie is opgeschreven met de meting erbij (`faqs.ts` 9× recht en 0×
krul, `dict.ts` 94× recht en 11× krul) en met wat ze níét doet: welke van de
twee vormen huisstijl is, is een vraag over de hele codebase en wordt hier niet
stilzwijgend beantwoord.

Twee dingen zitten er met opzet in. De poort eist **niet** dat één bepaald
antwoord alle vier draagt — splitst iemand het routeringsantwoord in vieren,
dan is dat geen defect. En de slugs worden **afgeleid** uit `dict.ts` in plaats
van ingetypt, met een ondergrens erop, zodat een vijfde dienst niet
stilzwijgend aan de poort ontsnapt en een kapotte afleiding niet slaagt op een
lege lijst.

#### Tien mutaties, tien keer de voorspelde kleur

Negen rood op negen verschillende asserties, één groen als controle, groen na
herstel, nul sporen achtergebleven.

De sprekendste is **"Engelse symptoomzin uit de pas"**: `services.advisory.symptom`
(en) veranderd zonder de FAQ. Die viel alleen op de nieuwe poort — Engels heeft
geen taalpoort en kan er in deze vorm ook geen krijgen, dus niets anders had hem
kunnen zien. Dat is het bewijs dat de poort dekking toevoegt in plaats van te
dubbelen.

De groene controle zet `usted` in een **toelichting** en hoort onzichtbaar te
blijven, want deze poorten lezen de geëxporteerde data en niet de bestandstekst.
Dat is waar `contactadressen.test.ts`, `persoon-entiteit.test.ts` en
`verzoeklimiet.test.ts` eerder wél over struikelden.

En de kapotte apostrof-normalisator vuurde op twee asserties tegelijk — de
zelftest én de invariant. Dat is het executeerbare bewijs dat hij dragend is.

#### `vitest` groen is geen `tsc` groen

De volle suite liep 1152/1152 groen terwijl `tsc` twee fouten gaf in het nieuwe
bestand: `LOCALES` is een readonly tuple en de cast naar `Locale[]` mag niet.
Vitest transpileert zonder te typechecken, dus een testbestand kan compleet
groen draaien en toch niet compileren. **Draai beide, altijd, en lees niet één
van de twee als bewijs voor de ander.**

#### Onderweg

Achtste escape-incident van deze sessie: een patch met `\n`-ankers vond zijn
doel niet in een CRLF-repo, en het patchscript kwam er door de shell-laag
ongelijk uit. Het harnas is daarna niet gepatcht maar herschreven met het
Write-gereedschap, en het weigert nu te draaien als een anker een regeleinde
draagt.

De eerste `next build` viel om op een mislukte Google-Fonts-fetch. Dat was een
netwerkhapering en geen defect: de tweede run gaf exit 0. Ik had de eerste keer
alleen de staart van de uitvoer gelezen en niet de exitcode — **een foutmelding
in de uitvoer is geen exitcode.**

En de productiesonde zoekt elke zin over álle opgehaalde pagina's in plaats van
hem vooraf aan een pagina toe te wijzen. Dat betaalde zich meteen terug:
"Tu funnel necesita" staat op `/es/sectors/energy` en niet op real-estate, waar
ik hem verwachtte.

#### Meting

Op een productiebuild, met de oude luisteraar op 3271 eerst gestopt (die
serveerde een build van vóór deze wijzigingen), een poort die vooraf aantoonbaar
vrij was, en het startlog gelezen om te bevestigen dat het mijn eigen proces was.

Dertien pagina's, alle 200:

```
nieuwe kopij, moet ergens staan      15 van de 15 aanwezig
oude kopij, mag nergens meer staan   14 van de 14 verdwenen
positieve controles                   5 van de 5
AFWIJKINGEN                           0

/es + 8 Spaanse pagina's   usted = 0   ·   tú-vormen = 136 (positieve controle)
```

```
tsc --noEmit             exit 0
vitest run               1152 tests in 51 bestanden (was 1135/49)
i18n:check               718 sleutels × 4 (ongewijzigd: alleen waardes)
regen:pricing:check      groen
next build               groen, 220 statische pagina's
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +17 is uitgesplitst: 7 in de twee nieuwe bestanden (dekking 3, symptomen 4)
en 10 in de drie taalpoorten, die er elk een bron bij kregen. Per bestand:
spaans 25, nederlands 22, duits 25.

Vijf bestanden gewijzigd, twee nieuw. Geen Duitse of Nederlandse kopij geraakt —
die twee poorten kregen alleen de nieuwe bron erbij.

#### Wat hierna nog open staat

- **Er is geen Engelse poort**, en die is in deze vorm ook niet te bouwen: het
  Engels kent het onderscheid niet dat de andere drie bewaken. De
  symptoom-poort van vandaag is het eerste net dat wél over het Engels ligt,
  maar hij bewaakt gelijkheid tussen twee bestanden en geen register.
- **De apostrof.** `dict.ts` staat op 94 recht tegen 11 krul; de rest van de
  kopijmodules schrijft uitsluitend recht. Welke vorm huisstijl is, is nooit
  beslist. Kleine vraag, hele codebase.
- **Zeven Spaanse sleutels blijven onpersoonlijk** waar het Nederlands de lezer
  aanspreekt. Dat is verdedigbaar Spaans; het staat als waarneming en niet als
  defect.

### 2026-08-25 — de apostrof recht, en een poort die zichzelf niet hoeft uit te zonderen

Het laatste openstaande punt uit #252: `dict.ts` schreef 94 keer een rechte
apostrof en elf keer een gekrulde, de andere kopijmodules uitsluitend recht.
Welke vorm huisstijl is, was nooit beslist. **Beslist door Juan op 2026-08-25:
recht, overal.**

#### Eerst geteld, omdat één positie het gevaarlijk maakt

Twintig gekrulde apostroffen in de getrackte broncode. De verdeling telde
minder dan de vraag waarin ze stonden:

| afbakening | n | risico |
|---|---|---|
| dubbele aanhalingstekens | 12 | geen |
| backtick | 4 | geen |
| geen (tekst, JSX, commentaar) | 4 | geen |
| **enkele aanhalingstekens** | **0** | zou de string breken |

Die laatste rij is de hele reden dat er geteld is voordat er iets veranderde.
Een rechte apostrof binnen een single-quoted TS-string sluit de string; nul
treffers daar maakt de omzetting een tekstvervanging in plaats van een
herschrijving. De byte-rekensom bevestigde elke stap: een krul is 3 bytes UTF-8
en een rechte 1, dus elf omzettingen moeten een bestand precies 22 bytes kleiner
maken. `dict.ts` ging van 247.948 naar 247.926.

#### De normalisator kon weg, en dat is een strengere poort

`lib/seo/faq-symptomen.test.ts` uit #252 bewaakt dat de vier symptoomzinnen op
`/services` woordelijk in de SERVICES-FAQ terugkomen. Hij droeg een
normalisator die beide apostrofvormen gelijkstelde, omdat `dict.ts` de gekrulde
schreef waar `faqs.ts` de rechte schreef.

Die is niet weggehaald op vertrouwen. Eerst is gemeten dat de invariant
**woordelijk** standhoudt — 16 van de 16 over vier talen en vier diensten —
en pas daarna is de normalisator geschrapt. Zo is het een strikt strengere
vergelijking geworden in plaats van een stille verzwakking. Vier tests werden
er drie.

#### De poort heeft geen uitzonderingslijst, en dat is een constructie

Dit logboek telt vier poorten die op hun eigen toelichting struikelden:
`contactadressen`, `persoon-entiteit`, `verzoeklimiet` en `server-acties`. De
standaardreparatie is een commentaarstrip of een uitzondering voor het
testbestand zelf. Allebei verzwakken de poort.

Hier kon het anders. Een poort die een teken verbiedt moet dat teken normaal
gesproken zelf dragen om te kunnen bewijzen dat hij werkt.
`String.fromCharCode(0x2019)` bouwt het uit zijn codepunt op, dus
`lib/typografie.test.ts` is zelf schoon en wordt gewoon meegescand. **Nul
uitzonderingen betekent hier ook werkelijk nul** — geen lijst, geen strip, geen
zelfvrijstelling.

De prijs is dat de uitleg het teken niet mag tonen, en die prijs is meteen
betaald: bij de eerste run viel de poort om op drie regels commentaar waarin ik
het verschil had willen demonstreren. Dat was terecht en niet lastig — de
oplossing is het teken benoemen (U+2019) in plaats van het te zetten. Vier keer
eerder was zo'n treffer een defect in de meetlat; deze keer was het de meetlat
die zijn werk deed op de auteur.

#### Acht mutaties, acht keer de voorspelde kleur

Zeven rood op vijf verschillende asserties, één groen als controle, groen na
herstel, nul sporen achtergebleven.

De sprekendste is een krul in een **commentaar** in `lib/booking.ts`. Die valt
om, en dat is het executeerbare bewijs dat er geen commentaarstrip in zit — de
poort ziet elke regel, ook de uitleg. De groene controle zet er juist een
rechte apostrof bij en hoort onzichtbaar te blijven.

Drie mutaties richten zich op de poort zelf in plaats van op de kopij: het
codepunt verkeerd opbouwen, de bronboom leegmaken, en de bestandswandeling
alleen nog `.tsx` laten zien. Alle drie rood, elk op een andere assertie. Zonder
die drie zou een groene uitkomst ook te verklaren zijn door een scanner die
niets leest.

#### Wat er bewust níét is omgezet

- **Zestien gekrulde dubbele aanhalingstekens** (acht in `.ts`/`.tsx`, acht in
  de logboeken). Juan zei apostrof; dubbele aanhalingstekens zijn een aparte
  vraag en die is niet gesteld. Ze zijn geteld en genoteerd, niet stilzwijgend
  meegenomen.
- **Twee logboekregels in `CLAUDE.md` en `AGENTS.md`.** Die beschrijven juist
  dit verschil en hebben de krul nodig om hem te kunnen tonen. Markdown rendert
  bovendien geen sitekopij, en logboekgeschiedenis wordt hier niet herschreven.
  De derde markdown-treffer stond in `docs/claims.md` en was gewone kopij in een
  levend document — die is wel omgezet.

Dat markdown erbuiten valt staat in de kop van de poort, met de meting erbij,
zodat een volgende sessie niet denkt dat een groen vinkje hier "de hele repo"
betekent.

#### Onderweg braken twee meters

**Negende escape-incident, en de eerste in de andere richting.** Het
mutatie-anker voor de slug-regex droeg een verdubbelde backslash waar het
bestand er één heeft — ik overcompenseerde voor een escaping-laag die er niet
was. Het harnas meldde `ANKER 0x` en sloeg de mutatie over in plaats van
stilzwijgend niets te doen. Acht van de acht eerdere incidenten waren
halveringen; deze was een verdubbeling. De uitweg is dezelfde: tel wat er in het
bestand staat, niet wat je denkt te typen.

**`netstat | grep -c ':3291 '` telt sockets, geen luisteraars.** Na het stoppen
van de meetserver gaf die telling 44, wat leest als "de server draait nog". Het
waren 43 TIME_WAIT-verbindingen van mijn eigen 23 curls plus één rest; LISTENING
stond op 0. Dezelfde check gaf vóór het starten 0 en klopte toen toevallig.
**Splits op verbindingstoestand** — anders is een poort na een meetronde altijd
"bezet" en ga je een proces zoeken dat niet bestaat.

En de productiesonde raadde opnieuw de verkeerde pagina: `sectors.d.others.body`
staat op de vier sector-**detail**pagina's en niet op de index, dus meldde hij
"ONTBREEKT" voor kopij die er gewoon stond. Derde keer deze maand. De sonde
zoekt elke zin over álle opgehaalde pagina's; wat hier miste was de pagina zelf.

#### Meting

Op een productiebuild, met de poort vooraf aantoonbaar vrij en het startlog
gelezen om te bevestigen dat het mijn eigen proces was.

```
23 pagina's, vier talen
  gekrulde apostrof in de geserveerde HTML      0
  omgezette kopij, recht en aanwezig            3 van de 3
  positieve controles                           4 van de 4
AFWIJKINGEN                                     0
```

De vier positieve controles staan er omdat nul pas een meting is nadat het
instrument bewees te kunnen vinden: de teller vindt een krul als die er is,
vindt er geen in rechte tekst, kan de doelzin op `/en/services` bereiken, en de
entiteit-decodering werkt.

```
tsc --noEmit             exit 0
vitest run               1154 tests in 52 bestanden (was 1152/51)
i18n:check               718 sleutels x 4 (ongewijzigd: alleen waardes)
regen:pricing:check      groen
next build               groen
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +2 is uitgesplitst: +3 in de nieuwe typografiepoort, -1 in `faq-symptomen`
doordat de normalisator en zijn zelftest samen vervielen.

Gekrulde apostroffen in de repo: **0 in `.ts` en `.tsx`**, 2 in markdown (de
twee logboekregels hierboven).

#### Wat hierna nog open staat

Ongewijzigd ten opzichte van #252, plus één nieuw punt.

- **Er is geen Engelse poort**, en die is in deze vorm ook niet te bouwen. De
  typografiepoort is wel het tweede net dat over het Engels ligt, maar hij
  bewaakt een teken en geen register.
- **Zeven Spaanse sleutels blijven onpersoonlijk** waar het Nederlands de lezer
  aanspreekt. Verdedigbaar Spaans; waarneming, geen defect.
- **Zestien gekrulde dubbele aanhalingstekens.** Dezelfde vraag als de apostrof,
  nooit gesteld. Acht ervan staan in geleverde code
  (`app/[locale]/services/page.tsx`, `lib/lekkage-scan.ts` en twee testbestanden).


### 2026-08-25 (vervolg) — de dubbele aanhalingstekens, en waarom "recht, overal" hier het verkeerde antwoord was

Het punt dat #253 open liet: zestien gekrulde dubbele aanhalingstekens, waarvan
acht in `.ts`/`.tsx`. De apostrof was net beslist met één regel — recht, overal —
en de verleiding was die regel hier door te trekken. Dat zou twee bestanden
hebben gesloopt.

#### Dit is niet dezelfde klasse als de apostrof

Bij de apostrof is elk voorkomen inwisselbaar: een krul eruit, een rechte erin,
klaar. Bij de dubbele hangt de juiste vervanging af van **waar het teken staat**,
en de codebase had daar al twee antwoorden op — allebei gemeten, geen van beide
door mij bedacht:

| positie | vorm | gemeten |
|---|---|---|
| citaat ín kopij die de bezoeker leest | de rechte, geëscaped | `dict.ts`, **38×** |
| sier-aanhalingstekens róndom een JSX-blok | `&ldquo;` / `&rdquo;` | `Story.tsx`, `Testimonials.tsx` |

Die twee zijn **niet uitwisselbaar**. In een React-tekstknoop rendert `&ldquo;`
als letterlijke tekst; in JSX-markup rendert hij als het teken. Eén regel "alles
recht" maakt de tweede categorie stuk, en één regel "overal entiteiten" de
eerste. Beide overtreders waren dus uitschieters tegen een bestaande conventie,
niet een open vraag — er viel niets te beslissen, alleen aan te sluiten.

#### Vier van de zestien stonden op een plek waar een rechte de string sluit

Eerst geteld per afbakening, precies zoals bij de apostrof, en die telling was
hier niet academisch:

| afbakening | n | risico |
|---|---|---|
| **dubbele aanhalingstekens** | **4** | een rechte `"` sluit de string |
| enkele aanhalingstekens | 2 | geen |
| backtick / JSX / commentaar | 2 | geen |

Die vier — twee in `lib/lekkage-scan.ts`, twee in `lib/i18n/duits.test.ts` —
konden dus niet met een tekstvervanging. `lekkage-scan.ts` draagt nu de
geëscapete vorm (het is kopij die de bezoeker leest), `duits.test.ts` is
overgegaan op enkele buitenquotes met rechte dubbele erin — precies wat de regel
drie regels erboven in datzelfde bestand al deed.

#### De poort dekt beide soorten, en de foutmelding wijst niet de verkeerde aan

`lib/typografie.test.ts` heeft er een vierde test bij. Twee dingen zitten er met
opzet in.

**De foutmelding noemt beide vervangingen**, met de conditie erbij. Een poort die
"gebruik de rechte" zegt, laat de volgende sessie de entiteiten in `Story.tsx`
opruimen — en dan staat er `&ldquo;` als tekst op de homepage.

**Een assertie dat de twee verzamelingen elkaar niet raken.** Zonder die kan een
apostrof-treffer als dubbele gelden, en dan wijst de melding de verkeerde
vervanging aan op precies het moment dat iemand hem volgt. Twee regels code, en
ze dekken de duurste manier waarop deze poort schade kan doen.

De poort heeft nog steeds **nul uitzonderingen**: `DUBBEL` wordt net als `ENKEL`
uit codepunten opgebouwd, dus het bestand blijft zelf schoon en wordt gewoon
meegescand. `U+201E` staat er ook in — het Duitse openende onderaanhalingsteken,
dat `DICT.de` vandaag nul keer gebruikt. Wil iemand ooit echte Duitse
aanhalingstekens, dan is dat een beslissing over vier talen en wordt de poort
aangepast, niet omzeild.

#### Veertien mutaties, veertien keer de voorspelde kleur

Twaalf rood op zeven verschillende asserties, twee groen als controle, groen na
herstel, nul sporen achtergebleven.

Vijf mutaties richten zich op de **poort zelf**: beide codepunten verkeerd
opbouwen, de twee verzamelingen door elkaar halen, de bronboom leegmaken, en de
wandeling alleen nog `.tsx` laten zien. Zonder die vijf is een groene uitkomst
ook te verklaren door een scanner die niets leest.

De sprekendste rode is het **Duitse lage aanhalingsteken** in een commentaar in
`lib/booking.ts`: die valt om, en bewijst dat de derde vorm werkelijk gedekt is
en niet alleen de twee gangbare. De twee groene controles zetten er juist een
rechte apostrof en een geëscapete rechte dubbele bij, en horen onzichtbaar te
blijven.

#### De meting mat eerst het scheidingsteken in plaats van de typografie

De eerste productieronde meldde vier keer `MIS` op `/services` terwijl het
faalsignaal nul was — intern tegenstrijdig, dus zat de fout in de naald. In de
geserveerde HTML staat:

```
…margin-bottom:10px">“<!-- -->Numbers you don&#x27;t trust<!-- -->”</div>
```

**React zet bij server-rendering een leeg HTML-commentaar tussen twee
aangrenzende tekstknopen**, om de hydratiegrens te markeren. `&ldquo;` en
`{t(...)}` zijn precies zulke buren. Het is serialisatie en geen inhoud —
`innerText` geeft de zin zonder — maar zonder die strip meet je het
scheidingsteken. De strip draagt daarom een eigen positieve controle: hij moet
aantoonbaar iets vinden, en gewone tekst ongemoeid laten.

#### De verwachting is hier omgekeerd aan die van de apostrof

Bij de apostrof moest de krul óók uit de geserveerde HTML verdwijnen. Hier niet,
en dat is het hele punt: `&ldquo;` in JSX is bedoeld om als teken te renderen.
**De bron draagt geen krul, de pagina wel.** De uitvoer is karakter-identiek aan
vóór deze wijziging; wat verandert is uitsluitend hoe de bron hem opschrijft.

Wat hier fout kán gaan is het omgekeerde — dat de entiteit als letterlijke tekst
rendert en er `&ldquo;Numbers you…` op een verkooppagina staat, in vier talen.
Het faalsignaal daarvoor is `&amp;ldquo;` in de rauwe HTML: dat is wat React
uitstuurt zodra die tekst als gewone tekst wordt gerenderd.

De twee gekrulde dubbele die de **clientbundel** wél draagt, komen uit
`Story.tsx` — dezelfde entiteiten, door de compiler naar het teken opgelost. Bron
nul, uitvoer het teken. Dat is het ontwerp, geen lek.

#### Gemeten

Op een productiebuild, poort vooraf aantoonbaar vrij (LISTENING 0) en het
startlog gelezen om te bevestigen dat het mijn eigen proces was. De vier
symptoomzinnen komen uit `DICT` en de vier dienst-id's uit `DELIVERABLES` in de
pagina zelf — mijn eerste sonde gokte die id's en viel om op een sleutel die niet
bestaat.

```
/{en,nl,de,es}/services   entiteit-als-tekst 0  ·  omsloten symptomen 4/4
U+201E over alle 5 pagina's                     0
positieve controles                             7/7
AFWIJKINGEN                                     0

client-chunks   de kost-zin: rechte quotes, 0 krul
                gekrulde dubbele over alle 29 chunks: 2 (beide uit Story.tsx)
```

In de DOM op `/en/services`, ná hydratie: vier kaarten, alle vier omsloten door
het echte teken, `&ldquo;` als tekst 0×, horizontale overloop 0, en nul
consolemeldingen — dat laatste ná een hartslag door de lezer, want een lege lijst
uit een kapotte lezer leest hetzelfde als een schone meting. Geen
hydratiewaarschuwing, dus server en client zijn het eens.

```
tsc --noEmit             exit 0
vitest run               1155 tests in 52 bestanden (was 1154/52)
i18n:check               718 sleutels × 4 (ongewijzigd: geen sleutel geraakt)
regen:pricing:check      groen
next build               exit 0
cmp CLAUDE.md AGENTS.md  byte-identiek
```

Gekrulde dubbele in de repo: **0 in `.ts` en `.tsx`** (was 8), 13 in markdown.

#### Wat er bewust níét is omgezet

- **Twaalf in `CLAUDE.md` en `AGENTS.md`** — drie logboekregels, gespiegeld over de
  twee bestanden. Twee zijn citaten uit oudere sessieverslagen; de derde is het
  HTML-fragment hierboven, dat het scheidingsteken alleen kan tonen door het te
  dragen. Logboekgeschiedenis wordt hier niet herschreven.
- **Eén U+201E in `_drafts/outreach/tier1-pitches-2026-07.md`** — de correcte
  Duitse openingsvorm in een Duitse pitch, in een ongepubliceerde draft, en
  buiten het `.ts`/`.tsx`-bereik van de poort.

#### Tiende regeleinde-incident, en de eerste zonder shell

De negen eerdere gingen over escapes die door een shell-laag halveerden of
verdubbelden. Deze zat een laag dieper en had geen shell nodig.

Bij het bijwerken van een getal in dit logboek deed ik:

```python
t = io.open('CLAUDE.md', encoding='utf-8').read()
io.open('CLAUDE.md', 'wb').write(t.replace(oud, nieuw).encode('utf-8'))
```

`io.open` met een encoding doet **universal-newline-vertaling bij het lezen**:
CRLF wordt LF in het geheugen. Terugschrijven in binaire modus maakt daar een
bestandsbrede omzetting van. Gemeten na afloop: CRLF 0, LF 6084 — een diff van
6084 regels waar er drie bedoeld waren, in een bestand dat byte-identiek moet
blijven aan `AGENTS.md` voor een verplichte CI-check.

Het viel alleen op doordat de vólgende patch een anker met een CRLF erin
gebruikte en niet matchte. Zonder die tweede patch was het stil doorgegaan.

**Lees met `newline=''` zodra je van plan bent terug te schrijven**, of blijf
volledig in bytes. En een vervanging die geen regeleinde raakt, is geen bewijs
dat het bestand zijn regeleinden houdt — dat bepaalt de leeslaag, niet de patch.

#### Wat hierna nog open staat

- **Er is geen Engelse poort**, en die is in deze vorm ook niet te bouwen. De
  typografiepoort ligt wel over het Engels, maar bewaakt tekens en geen register.
- **Zeven Spaanse sleutels blijven onpersoonlijk** waar het Nederlands de lezer
  aanspreekt. Verdedigbaar Spaans; waarneming, geen defect.

### 2026-08-25 (vervolg) — de zeven Spaanse sleutels waren er drie, en de imperatief was voor elke laag onzichtbaar

Het laatste openstaande punt uit #252, dat via #253 en #254 was meegesleept:
"zeven Spaanse sleutels blijven onpersoonlijk waar het Nederlands de lezer
aanspreekt". Bij het hermeten hield de premisse geen stand, en wat eronder lag
was groter dan de vraag.

#### Het getal zeven verliep zonder dat iemand hem hertelde

`ONPERSOONLIJK` droeg er **drie**, niet zeven, en alle drie hielden stand. Het
getal is drie PR's lang overgeschreven in plaats van gemeten — het vierde geval
deze maand dat een cijfer uit dit logboek binnen dagen veroudert.

Met een **Engelse getuige** gemeten leverde de brede sweep vijf kandidaten op,
geen van alle bruikbaar: in alle vijf spreken nl én de de lezer óók niet aan.
Engels is simpel gulzig met "you". Met een **Duitse getuige** kwamen er 22
kandidaten uit, waarvan er 4 vals waren en 18 echt:

| categorie | n |
|---|---|
| Spaans spreekt de lezer al aan met een tú-imperatief | 13 |
| `nosotros`-vorm die de lezer insluit (`Dibujemos`, `empecemos`) | 3 |
| bewust onpersoonlijk, al vrijgesteld (`process.1.body`) | 1 |
| **echt uit de pas** | **1** |

Die ene is `about.pr.1`: en, nl en de dragen daar een imperatief
("skip a phase", "sla een fase over", "überspringen Sie eine Phase") en het
Spaans een infinitief ("saltarse una fase"). Nu `sáltate una fase`.

#### Het werkelijke gat: dertien sleutels die geen enkele laag kon zien

Die dertien uit de eerste rij zijn geen ruis maar het defect. **Laag 1** verbiedt
`elija`, `haga`, `traiga`, `salga`, `toque` en `cierre` niet — nagemeten, want ze
zijn allemaal óók aanvoegende wijs, dezelfde dubbelzinnigheidsklasse als de al
gedocumenteerde `quiere` en `vea`. **Laag 3** bekijkt die sleutels niet eens,
omdat het Nederlands er imperatieven zonder voornaamwoord gebruikt: "Kies een
tijdslot" spreekt de lezer aan zonder je/jij/jouw, dus de gekoppelde regel komt
er niet aan toe.

Schreef iemand `Elige` om naar `Elija`, dan meldde niets iets. Dertien sleutels,
op de oppervlakken waar een bezoeker converteert.

#### De Duitse getuige, en waarom de zinsgrens hem bruikbaar maakt

Duits legt onafhankelijk vast **dát** een zin de lezer aanspreekt, want de
beleefdheidsvorm draagt een hoofdletter: `Sie`, `Ihnen`, `Ihr(e)`. De
dubbelzinnigheid is dat `Sie`/`Ihnen` ook "zij/hen" betekenen — en die is precies
met de zinsgrens op te lossen, omdat aan het begin van een zin élk woord een
hoofdletter draagt. Alleen een treffer **midden in** een zin telt.

Dat is geen aanname: van de 22 treffers waren er precies 4 zinsbeginnend, en
alle vier betekenden ze "zij/hen". De grensregel haalt die vier eruit **zonder
één uitzondering** — een uitzonderingslijst met vier namen erin zou dezelfde
uitkomst geven en niets verklaren.

#### De markerlijst en de verbodslijst zijn asymmetrisch

Dit stond impliciet in het bestand (bij `pruebas`) en staat er nu uitgeschreven,
want het bepaalt waar dubbelzinnigheid mag zitten:

- een woord bij **TU_MARKERS** maakt de poort **toegeeflijker** — het ergste
  geval is een gemiste treffer;
- een woord bij **NIET_MEER** maakt hem **strenger** — het ergste geval is vals
  alarm op correcte kopij, en dan wordt de poort binnen een week uitgezet.

Vandaar dat `elige`, `trae`, `toca` en `cierra` wél markers mogen zijn terwijl
ze ook derde persoon zijn, en dat alleen ondubbelzinnige vormen erbij komen in
de verbodslijst: `inténtelo` en `contáctenos`, allebei imperatief met aangehecht
voornaamwoord.

`Dibujemos` en `empecemos` staan in een **eigen** verzameling `WIJ_INCLUSIEF`.
Ze werken hetzelfde — de zin betrekt de lezer erbij — maar het zijn geen
tú-vormen, en ze tussen de tú-markers zetten legt een onwaarheid vast op precies
de plek waar een volgende sessie hem vertrouwt. Een poort eist dat de twee
verzamelingen elkaar niet raken.

#### De poort vond zelf de veertiende sleutel, en meteen daarna mijn fout

Na het toevoegen van de markers bleef er één over die ik niet had geclassificeerd:
`five-phases.body[9].text`. Alle vier de talen dragen daar een imperatief — en
"Ship", nl "Lever", de "Liefern **Sie**", es "Entrega" — dus `entrega` hoorde bij
de markers.

**En dat brak meteen iets anders.** De verouderingscontrole meldde binnen één run
dat `five-phases.excerpt` "niet meer onpersoonlijk" was. Terecht: die zin luidt
*"un edificio no se **entrega** a ojo"* — de onpersoonlijke passieve constructie,
en mijn nieuwe marker liet hem als aanspreking gelden. Precies de prijs die ik in
de toelichting bij de asymmetrie had opgeschreven, één minuut na het opschrijven.

De reparatie is niet de marker schrappen maar de constructie uitsluiten: `se` +
derde persoon is nooit een imperatief, want een tú-imperatief neemt `-te`. Eén
regel, en beide detecties blijven kloppen.

**Een verouderingscontrole is geen formaliteit.** Deze ving een zelfgemaakt
gat in de run waarin het ontstond.

#### De onderbouwing bij `process.1.body` klopte niet

Die zei: "en zegt 'before touching anything' en es 'antes de tocar nada', allebei
zonder onderwerp, en **alleen nl** voegt 'je' toe." Het Duits zegt daar *"bevor
**Sie** etwas anfassen"* en spreekt de lezer dus net zo goed aan. Twee getuigen,
niet één.

Die fout was ook niet te controleren zolang er geen Duitse laag was — de
uitzondering verdedigde zichzelf met een taal die niemand naast de zin legde.

#### Eén opbouw voor drie talen

Laag 3 leest de Nederlandse kant, laag 4 de Duitse. Twee eigen opbouwen zouden
uiteenlopen en dan bewaakt de zwakste — de bugklasse waar dit logboek het vaakst
op terugkomt. Er is nu één `kopij(taal)` waar beide uit worden afgeleid, en één
`esSpreektAan` dat beide lagen delen.

Ook de verouderingscontrole leest nu **beide** lagen. Alleen laag 3 lezen zou
`process.1.body` als "niet meer waar" hebben aangemerkt en juist de vrijstelling
weghalen die hem overeind houdt.

#### Veertien mutaties, veertien keer de voorspelde kleur

Twaalf rood, twee groen als controle, groen na herstel, nul sporen.

De twee sprekendste zijn `about.pr.1` en `five-phases.body[9].text` terugzetten
naar usted: **allebei vallen ze uitsluitend op laag 4**, want het Nederlands
draagt er geen je/jij en laag 3 kan ze per constructie niet bereiken. Dat is het
executeerbare bewijs dat de nieuwe laag dekking toevoegt in plaats van te
dubbelen.

Zes mutaties richten zich op de **poort zelf**: de getuige blind maken, de
zinsgrens weghalen, de `se`-regel slopen, een wij-vorm tussen de tú-markers
zetten, laag 4 de Nederlandse kopij laten lezen, en een marker uit de lijst
halen. Zonder die zes is een groene uitkomst ook te verklaren door een getuige
die niets ziet.

De groene controle zet `usted` en `inténtelo` in een **commentaar** in
`lib/signals.ts` en hoort onzichtbaar te blijven — deze poorten lezen de
geëxporteerde data en niet de bestandstekst.

Het harnas meldde één "spoor" dat er geen was: de vervanging
`koppel(kopij("nl"))` is óók de legitieme regel voor `GEKOPPELD`. Per anker
nagemeten in plaats van op de melding afgegaan.

#### Gemeten

Op een productiebuild, met de poort vooraf aantoonbaar vrij (nul sockets, niet
alleen nul luisteraars) en het startlog gelezen om te bevestigen dat het mijn
eigen proces was.

```
/{en,nl,de,es}/about   status 200 · eigen vorm 1x · infinitiefvorm 0x
"saltarse una fase" over vijf /es-pagina's        0x
positieve controles                               6/6
AFWIJKINGEN                                       0
```

```
tsc --noEmit             exit 0
vitest run               1163 tests in 52 bestanden (was 1155/52)
i18n:check               718 sleutels × 4 (ongewijzigd: alleen een waarde)
regen:pricing:check      groen
next build               exit 0
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +8 is uitgesplitst: 4 in laag 4, 3 in de nieuwe overlap-poort, 1 zelftest op
de `se`-regel.

#### Wat hierna nog open staat

- **Er is geen Engelse poort**, en die is in deze vorm ook niet te bouwen: het
  Engels kent het register-onderscheid niet dat de andere drie bewaken. Wel
  ligt de symptoom-poort van #252 en de typografiepoort van #253/#254 over het
  Engels — die bewaken gelijkheid en tekens, geen register.
- **Zeven Spaanse sleutels blijven onpersoonlijk** — dat punt is hiermee
  gesloten en vervalt. Het waren er drie, ze zijn alle drie onderbouwd, en de
  onderbouwing is nu ook controleerbaar.
- **Het omgekeerde net bestaat niet, en is ook niet gemeten.** Deze vier lagen
  vinden Spaans dat de lezer níét aanspreekt terwijl een andere taal dat wel
  doet. De andere richting — Spaans dat aanspreekt waar nl en de dat allebei
  niet doen — ziet niemand. Of dat een defect zou zijn is bovendien de vraag;
  het is eerder stijlverschil dan registerfout.

### 2026-08-25 (vervolg) — de dertien nagemeten op productie, en het waren er veertien

#255 sloot een detectiegat: dertien Spaanse sleutels spraken de lezer aan met
een tú-imperatief en waren voor élke laag van de registerpoort onzichtbaar. De
poort dekt ze sindsdien, maar ze waren nooit op de geserveerde pagina's
nagemeten — een poort bewijst dat de bron klopt, niet dat de bezoeker het ziet.

#### De sleutels komen uit de poort, niet uit het geheugen

De classificatielogica is met `sed` uit `lib/i18n/spaans.test.ts` geknipt en in
een tijdelijke sonde geplakt, niet overgetypt. Twee kopieën van dezelfde
controle lopen uiteen en dan bewaakt de zwakste; dat is in dit logboek de
vaakst terugkerende bugklasse.

**Het zijn er veertien.** De afleiding: treffers van de Duitse getuige waarvan
élke gematchte marker uit het imperatief-blok van #255 komt. Het logboek droeg
beide getallen zonder ze op te tellen — de tabel telde er dertien, en een
sectie verderop staat dat de poort "zelf de veertiende sleutel vond"
(`five-phases.body[9].text`). Die veertiende kwam pas boven ná het toevoegen
van de markers en is nooit bij de dertien opgeteld. De toelichting in de poort
is gecorrigeerd; dat is de enige codewijziging in deze PR.

Mijn eerste classificatie gaf 31 en dat was fout: ik telde elke zin mét een
imperatief, ook zinnen die al een gewoon tú-woord dragen en dus nooit
onzichtbaar waren. De vraag is niet "bevat een imperatief" maar "raakt
uitsluitend door een nieuwe imperatief gepaard".

#### Negen renderen in de geserveerde HTML

46 Spaanse pagina's uit de sitemap opgehaald, en elke zin over álle pagina's
gezocht in plaats van de pagina te raden — drie keer eerder deze maand leverde
een geraden pagina een valse "ONTBREEKT" op.

| sleutel | pagina |
|---|---|
| `CONTACT[1].a` | /es/contact |
| `about.pr.2` (beide helften) | /es/about |
| `contact.book.lede` | /es/contact |
| `five-phases.body[9].text` | /es/signals/five-phases |
| `form.step1.sub` | /es/contact |
| `pricing.label.contactUs` | /es/pricing |
| `sectors.d.roi.cta` | /es/sectors/energy |
| `services.symptom.lead` | /es/services |
| `uses.outro.link` | /es/uses, /es/privacy |

Usted-tegenhangers over alle 46 pagina's: **0**. Zes positieve controles groen.

#### De bundel bewijst hier minder dan het lijkt

De vijf overige staan in de uitgeleverde client-chunk met nul usted-vormen.
Dat is zwakker bewijs dan het oogt: `form.err.*` zijn **returnwaarden van een
server action** via `translate()`, dus hun aanwezigheid in de chunk zegt alleen
dat het woordenboek meegaat naar de client — wat voor alle 718 sleutels geldt.

Vandaar de DOM-meting op productie, met de takken die aantoonbaar vóór de
database terugkeren (`app/actions/contact.ts`: e-mail op regel 61, berichtlengte
op 65, insert pas op 71):

| tak | gemeten |
|---|---|
| `form.err.email` | "Introduce un correo electrónico válido." |
| `form.err.message` | "Cuéntame un poco más — al menos una frase." |
| `form.err.generic` | niet getriggerd — vergt een DB-fout |
| `form.err.network` | niet getriggerd — vergt een netwerkfout server-side |

De drempel is niet gegokt maar gelezen (`message.length < 10`); een bericht van
twee tekens keert gegarandeerd terug vóór de insert. Nagemeten op
`wbgiouuifqhasedncysw`: `marketing.leads` op 0 rijen totaal, 0 in het laatste
half uur, 0 sonde-rijen.

#### De globe is door de meetomgeving geblokkeerd, en dat is gemeten

`globe.body.fallback` rendert alleen na een klik op een land zonder eigen kopij.
De landen worden per animatieframe opgebouwd, en de browser-pane compositeert
hier niet: `document.visibilityState` staat op `hidden` en er vuurden **nul**
`requestAnimationFrame`-frames in 2,5 seconde, ook na fronting. `globe-countries`
blijft daardoor leeg en er valt niets aan te klikken.

Dat is het instrument en niet de site: `/world-110m.json` antwoordt met 200 en
levert een Topology met `countries`, en er staat geen enkele consolefout — dat
laatste gemeten ná een hartslag door de lezer, want een lege lijst uit een
kapotte lezer leest hetzelfde als een schone meting.

#### Drie keer brak het instrument

1. **Vitest slikte `console.log`.** De sonde draaide, gaf exit 0 en produceerde
   niets — identiek aan een sonde die niets vond. Uitvoer gaat sindsdien via
   `writeFileSync` naar een bestand in plaats van via de reporter.
2. **Een positieve controle stond omgekeerd.** `"zzqq" in _z` waar `not in`
   hoort: de controle die moest bewijzen dat de teller niet álles vindt, testte
   het tegendeel. Hij meldde zichzelf als STUK.
3. **Elfde escape-incident.** De heredoc halveerde een dubbele backslash, waarop
   Python op regel 2 viel. De backslash wordt nu via `chr(92)` opgebouwd. Zelfde
   familie als 20, 22, 23 en 24 augustus; de uitweg is telkens dezelfde —
   schrijf geen escape die door een shell-laag moet.

Onderweg schreef ik in de nieuwe toelichting "voor" waar "vóór" hoort. Derde
keer deze week dat misplaatste voorzichtigheid over shell-encoding een diakriet
kostte, terwijl het bestand er in dezelfde alinea al drie draagt.

#### Wat deze meting niet dekt

`form.err.generic` en `form.err.network` zijn alleen bereikbaar bij een echte
storing; hun bewijs is het uitgeleverde woordenboek en het feit dat ze langs
dezelfde `translate(locale, ...)` lopen als de twee takken die wél end-to-end
zijn nagelopen. En `globe.body.fallback` is in de bron en in de bundel
geverifieerd, niet in de DOM.

### 2026-08-25 (vervolg) — de tak die "netwerkfout" heet, vuurt niet op een netwerkfout

De vorige meting liet twee takken van `submitLead` ongetriggerd: `form.err.generic`
en `form.err.network`. Ze zijn allebei bereikt op een lokale productiebuild, met
alleen de omgeving gewijzigd en verder niets, en het antwoord was omgekeerd aan
wat de namen beloven.

| build | `NEXT_PUBLIC_SUPABASE_URL` | tak die vuurde |
|---|---|---|
| A | een host die niet bestaat | **`form.err.generic`** — "Algo ha salido mal." |
| B | leeg | **`form.err.network`** — "Error de red." |

De naam `network` hoort bij de `catch`, en daar komt een netwerkstoring nooit:
**supabase-js vangt een fetch-fout zelf op en geeft hem terug als `{ error }`**,
dus die landt in de tak erboven. De `catch` is alleen bereikbaar als
`createClient()` gooit, en dat doet hij op een ontbrekende
`NEXT_PUBLIC_SUPABASE_URL` of publishable key — `lib/supabase/keys.ts` gooit daar
expliciet. Configuratie dus, geen storing bij de bezoeker.

Dezelfde vorm als `process.env[SECRET_ENV]` dat `CAL_WEBHOOK_SECRET` maandenlang
uit `.env.example` hield, en als de server-actions van gisteren: iets dat
functioneel doet wat het doet, met een naam die iets anders beschrijft. De
naamgeving is hier de enige documentatie die er was.

#### De kopij loog niet alleen over de oorzaak, hij stuurde de bezoeker in een lus

Wat er in vier talen stond was "Netwerkfout. Probeer het opnieuw." — en dat
tweede deel is het schadelijke deel. Een ontbrekende omgevingsvariabele lost niet
op door opnieuw te verzenden; de bezoeker kan blijven klikken zonder dat het ooit
lukt. Bij `form.err.generic` klopt dezelfde zin wél: een databasefout of een
echte netwerkstoring kan voorbijgaan.

De sleutel heet nu `form.err.unavailable` en de kopij noemt geen netwerk en
belooft geen nieuwe poging:

    en  Something is wrong on our end — it didn't go through.
    nl  Er is iets mis aan onze kant — het is niet doorgekomen.
    de  Auf unserer Seite stimmt etwas nicht — es ist nicht durchgekommen.
    es  Algo va mal por nuestro lado — no se ha enviado.

**Bewust geen belofte dát opnieuw proberen zinloos is.** Gemeten is dat
configuratie de tak bereikt en netwerk niet; dat élke denkbare worp een
configuratiefout is, is niet gemeten. De zin zegt daarom wat wél vaststaat: het
zit aan onze kant en het is niet aangekomen.

`app/actions/subscribe.ts` droeg exact dezelfde tak en is meegegaan.

#### `form.err.generic` is van buitenaf niet te bereiken op productie

Nagemeten op `wbgiouuifqhasedncysw` voordat ik de tak op een build ging forceren:
`marketing.leads` draagt alleen `leads_pkey PRIMARY KEY (id)`, elke kolom is
ongelimiteerd `text`, en `capField` strookt precies de null-bytes weg die een
insert zouden breken. Er is dus geen invoer waarmee een bezoeker die tak haalt —
vandaar de omgeving als hefboom in plaats van het formulier.

#### De poort roept de acties werkelijk aan

`app/actions/foutpaden.test.ts` (nieuw) mockt `@/lib/supabase/server` met een
client die op commando gooit, een `{ error }` teruggeeft, of slaagt, en legt vast
welke storing in welke tak landt — voor beide acties, in vier talen. Daarnaast
drie asserties op de kopij zelf: de twee meldingen verschillen per taal, de
nieuwe noemt geen netwerkstoring, en die controle gaat aantoonbaar wél af op de
kopij zoals hij was.

Waarom geen bestaande poort dit ving: de i18n-poorten controleren dat een sleutel
bestaat, in vier talen staat en vertaald is. Of de sleutel het júiste geval
beschrijft is met een woordenboek niet te zien. Daar is een test voor nodig die
de actie aanroept met een falende client.

Wat de poort **niet** bewaakt staat in zijn eigen kop: het gedrag van supabase-js.
Dat een fetch-fout als `{ error }` terugkomt is hierboven gemeten, niet hier
afgedwongen. Verandert die bibliotheek, dan wisselen de twee takken stil van
betekenis.

#### Mijn positieve controle slaagde op niets

Negen mutaties met de kleur vooraf vastgelegd; acht klopten. De negende was de
leerzame: **`NETWERKTAAL.nl` leegmaken liep groen door**, terwijl juist die lijst
de controle draagt. De assertie luidde `expect(treffers).toHaveLength(NETWERKTAAL[l].length)`,
en met nul termen is dat `expect([]).toHaveLength(0)` — waar, en over niets.

Dat is dezelfde klasse als de garantie-poort van 22 augustus, waar een term uit
de lijst schrappen groen bleef omdat er geen verwachting was om tegen af te
zetten. Er staat nu een ondergrens vóór de vergelijking, en met die regel erbij
gaat de mutatie af op `expected 0 to be greater than 0`.

**Een positieve controle die uit een lijst wordt afgeleid, moet eerst eisen dat
die lijst niet leeg is.** Anders is hij precies zo sterk als de lijst die iemand
kan weghalen.

De twee groene controles zijn de scope: de oude sleutelnaam in een *toelichting*
in `lib/booking.ts` blijft onzichtbaar (deze poort leest `DICT`, niet de
bestandstekst), en netwerktaal in `form.err.generic` mag gewoon — die tak vángt
een netwerkstoring.

#### Twee sporen die er geen waren

Het harnas meldde na afloop twee achtergebleven mutaties in `contact.ts` en
`subscribe.ts`. Mijn spoorcontrole matchte op `return { status: "err", message:
translate(locale,` — de regel die de gezonde code óók draagt. Per bestand
nageteld: contact 1× `unavailable`, 2× `generic` (één in de nieuwe toelichting),
subscribe 1× en 1×. Tweede keer deze week dat een spoorcontrole op een prefix
matcht die legitiem is; tel per bestand na in plaats van op de melding af te gaan.

#### Meting

Op productiebuilds, met de poort vooraf aantoonbaar vrij (nul sockets, gesplitst
op verbindingstoestand) en het startlog gelezen om te bevestigen dat het mijn
eigen proces was.

```
tsc --noEmit             exit 0
vitest run               1174 tests in 53 bestanden (was 1163/52)
i18n:check               718 sleutels x 4 (ongewijzigd: hernoemd, niet toegevoegd)
regen:pricing:check      groen
next build               exit 0
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +11 is de nieuwe poort. Het sleutelaantal blijft 718 omdat `form.err.network`
niet verdween maar van naam veranderde.

### 2026-08-25 (vervolg) — de aanname onder de vorige poort, en het woord dat de takken kan omdraaien

De poort van een uur eerder legt vast welke storing in welke tak van onze server
actions landt. Hij rust op één aanname over een bibliotheek die wij niet
schrijven: **een fetch-fout komt terug als `{ error }` en wordt niet gegooid.**
Die aanname stond alleen als meting in dit logboek en als opmerking in de kop van
die poort. Verandert supabase-js van gedrag, dan wisselen `form.err.generic` en
`form.err.unavailable` stil van betekenis — geen regel code verandert, de melding
aan de bezoeker wel.

#### Gemeten met een geïnjecteerde fetch, dus zonder netwerk en zonder DNS

`lib/supabase/foutdoorgifte.test.ts` bouwt de client zoals `lib/supabase/server.ts`
hem bouwt — `createServerClient` uit @supabase/ssr, hetzelfde schema — en geeft
hem een eigen `fetch` mee. Die functie zélf aanroepen kan niet: hij leest
`cookies()` uit next/headers en dat vergt een request-context. Vandaar een
cookie-adapter die niets doet.

Op @supabase/ssr 0.6.1, supabase-js 2.103.3 en postgrest-js 2.103.3:

| invoer | uitkomst |
|---|---|
| fetch weigert met `TypeError('fetch failed')` | **resolve**, `error.message` = "TypeError: fetch failed" |
| HTTP 500 met `{"message":"geweigerd"}` | resolve, `error.message` = "geweigerd" |
| HTTP 201 | resolve, `error` = null |
| client bouwen op een onbereikbaar adres | gooit niet |

Die laatste hoort erbij en is niet decoratief: hij bewijst dat de `catch` in onze
acties niet door supabase wordt gevuld maar door onze eigen
`lib/supabase/keys.ts`. Zonder die regel is "de catch betekent configuratie" een
gevolgtrekking; mét die regel is het gemeten.

**De teller is de positieve controle.** "Hij gooide niet" bewijst niets: een
client die vóór de fetch al terugkeert gooit óók niet. De geïnjecteerde fetch
telt daarom zijn aanroepen, en de poort eist dat hij bereikt is. Eén mutatie doet
precies dat — het antwoord veinzen zonder fetch — en die valt om op
`expected 0 to be greater than 0`.

#### Geen versiepin, en dat is opzet

De voor de hand liggende toevoeging is een assertie op het major-versienummer,
zodat een sprong naar v3 om een herlezing vraagt. Die staat er bewust niet in:
**de gedragstests vangen de verandering zelf.** Gaat v3 gooien, dan valt de
eerste test om. Blijft het gedrag gelijk over een major bump, dan is rood daar
ruis — en een poort die ruis maakt wordt uitgezet. De gemeten versies staan in de
kop als herkomst, niet als eis.

#### Het woord dat de takken kan omdraaien

postgrest-js kent `.throwOnError()`. Staat dat achter een insert, dan wordt een
databasefout wél gegooid en landt hij in de `catch` — de twee takken wisselen van
betekenis zonder dat er één regel aan die takken verandert. Dat is de goedkoopste
manier om de reparatie van een uur eerder ongedaan te maken, en niets hield het
tegen. Nu wel, met een tekstscan over beide acties.

**Die scan draait door `zonderCommentaar`**, en de mutaties bewijzen dat dat
dragend is in plaats van decoratief. Twee mutaties vormen een discriminerend
paar: dezelfde overtreding in een *commentaar* blijft groen, en dezelfde
overtreding mét de strip uitgezet wordt rood. Zonder dat paar is groen ook te
verklaren door een scanner die niets leest — precies de vorm waarop
`contactadressen`, `persoon-entiteit`, `verzoeklimiet` en `server-acties` eerder
struikelden.

#### En de kop van de vorige poort klopte niet meer

Daar stond: "Wat deze poort NIET bewaakt: het gedrag van supabase-js zelf."
Dat was waar tot deze commit en is nu onwaar. Die zin laten staan is de klasse
waar dit logboek het meest aan overhoudt — een toelichting die een toestand
beschrijft die niet meer bestaat. Hij verwijst nu naar de nieuwe poort.

#### Meting

Negen mutaties, negen keer de voorspelde kleur, elk rood op een ándere assertie,
groen na herstel, nul sporen achtergebleven. Het harnas weigert te draaien als
een mutatie een bestand raakt dat niet in de back-uplijst staat, en als een anker
een regeleinde draagt.

```
tsc --noEmit             exit 0
vitest run               1180 tests in 54 bestanden (was 1174/53)
i18n:check               718 sleutels x 4 (ongewijzigd: geen sleutel geraakt)
regen:pricing:check      groen
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +6 is de nieuwe poort. Geen productiecode geraakt — dit is uitsluitend een
poort plus één gecorrigeerde toelichting, dus er valt hier niets op productie na
te meten.

### 2026-08-25 (vervolg) — LinkedIn opgezet, en de bedrijfspagina die geen mens kan vinden

De vraag was "de socials van juandiazllc opzetten". De keuze zelf stond al
onderbouwd in `docs/bereik-plan.md` §6 en is niet overgedaan: **één kanaal,
LinkedIn, persoonlijk profiel.** Dit is het uitvoerbare deel, in
`docs/social-linkedin.md`.

**Geen code geraakt.** Eén nieuw document. 1180 tests in 54 bestanden groen, tsc
schoon, allebei ongewijzigd ten opzichte van de vorige sessie — precies wat een
docs-only toevoeging hoort te doen.

#### Wat er gemeten is, en twee dingen die van Juan zijn

| kanaal | stand 2026-08-25 |
|---|---|
| LinkedIn `/in/juanstefan` | bestaat, in `PERSON_SAME_AS` én zichtbaar op `/contact` |
| LinkedIn `/company/juandiazllc` | bestaat, in `ORG_SAME_AS`, **nergens zichtbaar voor een mens** |
| Instagram `@diazelcazador` | bestaat, zichtbaar op `/contact` |
| X / TikTok / YouTube | bestaan niet; X is in #198 uit `sameAs` gehaald wegens 404 |

De bedrijfspagina staat alleen in JSON-LD. Wie je bedrijf op LinkedIn zoekt
vindt hem via Google en niet via je eigen site. Dat is één regel in
`components/sections/Contact.tsx`, maar of hij daar hoort is een merkkeuze en
geen defect — net als de vraag of `@diazelcazador` als kanaal op de site hoort
te staan naast een domein dat een andere belofte draagt.

**Voorraad: 21 artikelen in de Nederlandse markt**, over zeven onderwerpen
(Energy 5, Real estate 4, Hospitality 4, Systems 4, Logistics 2, Strategy 1,
Growth 1). Dat is geen zes weken maar ruim een half jaar, want een artikel
draagt meerdere observaties en een post draagt er één.

#### De posts zijn geschreven ná het lezen van de artikelen

Zes uitgeschreven posts, en ze staan er pas nadat de bodies van die zes
artikelen gelezen waren. Een post die specifieker is dan zijn artikel is
verzonnen, en dat is in dit dossier de duurste fout: twee van die artikelen
dragen zelf een kop **"Wat ik hier niet beweer"** waarin ze expliciet weigeren
een bedrag of een datum te noemen die niet is nagetrokken.

Elk cijfer in de profieltekst komt woordelijk uit `docs/claims.md` en uit de
gepubliceerde Nederlandse kopij (`results.r1..r4` in `dict.ts`). Er staat geen
enkel getal in dat niet al ergens gepubliceerd is.

#### Wat ik niet gedaan heb, en dat is opzet

Accounts aanmaken en posten namens Juan. Het eerste is een harde grens, het
tweede vergt zijn akkoord per bericht. De grens uit §6 blijft ongewijzigd:
posten op je eigen tijdlijn valt buiten het verbod, **connectieverzoeken en DM's
worden nooit geautomatiseerd** — ook niet als een prompt uit een pakket erom
vraagt.

#### Onderweg: "Philly" staat nog 63 keer in geleverde kopij, en dat is twee dingen

`lib/insights.ts` noemt in drie artikelen, in alle vier de talen, "Philly" als de
naam van het CRM dat Juan levert. Die naam is sinds de rebrand DEUS.

**De valstrik zit in de telling.** Van de 63 treffers is een deel de stad:
`hero.chip.status` zegt "Amsterdam ↔ Philly" en `marquee.full` doet hetzelfde.
Een blinde zoek-en-vervang maakt van de stad een product. Het zijn twee
verschillende woorden die toevallig gelijk klinken, en ze staan in hetzelfde
bestand.

Daarnaast is `uses.data.prisma` achterhaald: het zegt dat het CRM op MariaDB via
de Prisma-adapter draait, terwijl DEUS-SHARED op postgresql staat en Prisma met
#134 uit deze repo vertrok.

Niet gerepareerd in deze PR. Het is een eigen sweep met een eigen poort, en die
poort moet het onderscheid stad/product dragen of hij richt schade aan.

#### De meetlat brak, en luid

Mijn eerste inventarisatiescript las `p.date` en kreeg voor alle 21 artikelen
`undefined` terug. Het veld heet `publishedAt`; `date` bestaat niet op het
`Insight`-type. Dat is de goede soort storing: hij was zichtbaar in elke regel
uitvoer in plaats van stil een lege lijst op te leveren.

Verder brak een heredoc voor de **twaalfde keer deze sessie**, deze keer op
327 regels markdown met codeblokken erin. Niet gedebugd: de uitweg staat al vier
keer in dit logboek. Schrijven met het Write-gereedschap naar de scratchpad,
daarna aanhechten. Het bestand kwam op pure LF terwijl `claims.md`,
`bereik-plan.md` en `lead-magnet.md` alle drie CRLF dragen, dus omgezet in bytes
met een assertie ervoor en erna.

#### Wacht op de operator

Toegevoegd aan de lijst bovenaan dit bestand, in blokkerende volgorde:

1. **De vijf Plausible-doelen** staan er al op en blokkeren dit ook. Zonder die
   doelen is een klik vanaf LinkedIn niet te onderscheiden van geen verkeer.
2. **Kop en Over op het profiel plakken.** Tien minuten, staat plak-klaar.
3. **Bedrijfspagina zichtbaar maken op de site, ja of nee.**
4. **Instagram-link op `/contact` laten staan, ja of nee.**

### 2026-08-25 (vervolg) — de foutrapportage stond niet uit, hij stond te liegen

De opdracht was de systemen klaarzetten voordat er iets naar buiten gaat. Bij
het hermeten van de keten bleek één regel op de operator-lijst een grotere
lading te dragen dan hij aankondigde.

#### Wat er gemeten is, voordat er iets veranderde

Alles opnieuw gemeten in plaats van uit dit logboek overgeschreven:

| systeem | stand 2026-08-25 |
|---|---|
| `POST /api/cal` op productie | 503 `{"ok":false,"error":"not-configured"}` |
| `lead-notify`, ongeldige JSON zonder auth | 400 `invalid-json` — nog steeds fail-open |
| `lead-acknowledge`, idem | 400 `invalid-json` |
| negatieve controle, functie die niet bestaat | 404 `NOT_FOUND` |
| `marketing.leads` · `marketing.subscribers` | **0 rijen, ooit** — beide |
| advisors `wbgiouuifqhasedncysw` | 116: 0 ERROR · 9 WARN · 107 INFO, gelijk aan vanochtend |
| `diaz-appsumo-redeem` op **vbozel** (levend) | `invalid-code-format` → **dev-mode staat nog aan** |

De vier probes op de edge functions raken niets: de auth-controle staat vóór de
JSON-parse en het versturen erna, dus `400 invalid-json` scheidt open van dicht
zonder één bericht te versturen. De 404 op een niet-bestaande functie is de
negatieve controle die bewijst dat die 400's echte antwoorden zijn en geen
generiek edge-antwoord. Zie [[feedback_poort_testen_zonder_bijwerking]].

Voor AppSumo geldt hetzelfde principe één laag dieper. De functie heeft drie
takken die elk een andere reden teruggeven — `invalid-code` met sleutels,
`invalid-code-format` in dev-mode, 503 zonder allebei — dus een code die het
dev-formaat níét haalt identificeert de configuratie zonder dat er ooit een
licentie ontstaat. De eerste probe gaf `missing-fields`: ik had de veldnamen
geraden. Ze heten `appsumo_code` en `customer_email`, en dat staat in de bron.
**Lees de veldnamen, raad ze niet** — een probe die op de verkeerde laag faalt
meet niets.

#### De vondst: een guard die vroeg of de variabele gezet was

Op de operator-lijst stond dat `SENTRY_DSN` op productie de letterlijke tekst
`optional` draagt en dat serverfouten daardoor niet gerapporteerd worden. Dat
klopt. Wat er niet stond is dat de code eromheen het probleem verdubbelde.

`initSentry()` ving de worp van `mod.init()` op en waarschuwde. Daarna
controleerde **elke** capture-functie alleen `!process.env.SENTRY_DSN`, en
`"optional"` is truthy. Die guard liet ze dus door naar een
**niet-geïnitialiseerde** client, waar hun eigen lege `catch` ze opslokte. Vijf
keer dezelfde omgekeerde vraag: *is de variabele gezet* in plaats van *is de
init geslaagd*.

**Drie toestanden, en de derde is de gevaarlijke.** DSN leeg is een schone
no-op. DSN geldig werkt. DSN onzin ziet er geconfigureerd uit, rapporteert
niets, en zegt het niet — `isSentryEnabled()` gaf al die tijd `true` terug. Een
gezondheidsindicator die liegt is erger dan geen indicator.

**De omvang is de hele foutenweg.** `instrumentation.ts:onRequestError` is Next
16's foutenhaak: elke onafgevangen render- of routefout op de Node-runtime gaat
naar `captureException`. Die weg lag stil.

#### De reparatie, en waarom de vormcontrole structureel is

De guard is nu `active` — of de init werkelijk slaagde — op alle vijf de
plekken, en `isSentryEnabled()` geeft datzelfde terug. Een DSN die gezet maar
onbruikbaar is gedraagt zich voortaan exact als een ongezette: uit, en luid.

`dsnLooksUsable()` controleert de **vorm** en niet één regex over de hele
string, want een zelfgehoste Sentry kan achter een padvoorvoegsel zitten en de
oude vorm draagt een secret na de publieke sleutel. Allebei moeten blijven
werken; het enige dat moet falen is een waarde die nooit een ingest-endpoint kan
adresseren. **Dat was de echte klem:** een te strenge validator zou Sentry
uitzetten op het moment dat Juan er een geldige DSN in zet, en dat is een
ergere fout dan de fout die gerepareerd wordt. Vandaar vier accepteer-gevallen
naast de zes weiger-gevallen in de poort.

De DSN zelf komt niet in het foutlog. Een van de mutaties zet hem er juist wél
in, en die gaat af.

#### De poort, en wat er niet was

Er stond **geen enkele test** op `lib/sentry.ts`. Dat is hoe een omgekeerde
guard hier maanden kon blijven staan.

`initSentry(injected?)` heeft een injectie-naad gekregen zodat de
toestandsmachine te meten is zonder `@sentry/node` te laden. Zonder die naad zou
een test die "er is niets verstuurd" beweert net zo goed kunnen slagen doordat
de module niet resolvet — **een lege uitkomst uit een kapot instrument leest
hetzelfde als een schone meting.** De teller op de nepclient is de positieve
controle: bij een geldige DSN moet er wél iets aankomen, in de goede volgorde.

Acht mutaties, acht keer de voorspelde kleur. Zeven rood op zeven verschillende
asserties; de achtste is de controle en blijft groen — hij verandert de
`environment`-terugval, iets wat de poort bewust niet vastpint. Zonder die
controle is niet te zien of de poort overgespecificeerd is.

#### Twee instrumenten braken

**De Vercel-log-API haalde zijn tijdbudget niet**, twee keer, ook op een venster
van 45 minuten. Daarmee is de `Invalid Sentry Dsn: optional` van vanochtend
**niet opnieuw bevestigd**. Dat staat hier als kapot instrument en niet als
herbevestigde meting; de reparatie hierboven hangt er ook niet van af, want die
volgt uit de code en niet uit het log.

**En mijn eigen grep-glob verborg de beslissende vraag.** De eerste scan zocht
in `{app,lib,components,scripts}/**` en vond `initSentry` alleen als definitie,
nergens als aanroep — waaruit zou volgen dat de module dood is en ik de
verkeerde repareerde. De aanroep staat in `instrumentation.ts`, in de
repo-wortel, buiten mijn glob. **Scope een zoekopdracht nooit smaller dan de
vraag die je stelt**, en trek geen "bestaat niet" uit een lijst die je zelf hebt
ingeperkt.

Verder liep een recursieve `grep` vanaf `.` de drie langlopende scratch-mappen
in (`_3dcap/`, `diaz-editor-gtm/` met eigen `node_modules`, `migrations-review/`)
en tikte zijn timeout aan — dezelfde val als `git add -A` in deze repo.

#### Meting

```
tsc --noEmit             exit 0
vitest run               1196 tests in 55 bestanden (was 1180/54)
i18n:check               718 sleutels x 4 (ongewijzigd: geen sleutel geraakt)
regen:pricing:check      groen
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +16 is de nieuwe poort. Geen kopij geraakt, dus er valt hier niets in de
browser na te meten — dit is serverpad.

#### Wat dit niet oplost

De rapportage staat hierna nog steeds **uit**. Wat verandert is dat hij het nu
zegt in plaats van te doen alsof. `SENTRY_DSN` leegmaken (bewust uit) of een
echte DSN zetten (aan) blijft operator-werk, en de rest van de keten — cal,
lead-notify, Resend, de vijf Plausible-doelen, de AppSumo-vlag — is
onveranderd wat het was.

### 2026-08-25 (vervolg) — lead-acknowledge fail-closed, en mijn eigen waarschuwing sloeg op de andere functie

De vorige sessie bood dit aan als volgende stap en zette er meteen een rem op:
*fail-closed vóór het secret bestaat breekt de werkende Telegram-melding.* Die
zin klopte niet, en dat bleek pas bij het nameten.

**Telegram hoort bij `lead-notify`. Die functie woont niet in deze repo.**
`lead-acknowledge` doet alleen de ontvangstbevestiging per e-mail, en die is
dood zolang `RESEND_API_KEY` niet gezet is — gemeten op 20 augustus als
`{"sent":false,"channel":"skipped:no-api-key"}`. Ik had twee functies met
dezelfde poortvorm tot één samengevat en de eigenschap van de ene op de andere
geplakt.

#### Wat er gemeten is voordat er iets veranderde

| | stand 2026-08-25 |
|---|---|
| vault `lead_notify_secret` op wbgio | **staat er**, sinds 16 aug 16:22:38 UTC · 44 tekens · base64url · geen witruimte |
| trigger `leads_acknowledge_new` stuurt `Authorization: Bearer` | ja, zodra de vault leesbaar is |
| functie-env `LEAD_NOTIFY_SECRET` | **niet gezet** — bewezen door de 400-probe |
| aanroepers buiten de trigger | **geen**. CI raakt hem niet, `check-lead-path.sh` doet bewust alleen GET |
| auto-deploy van edge functions in deze repo | **geen workflow** |

Van de vault is alleen de **lengte en de tekenset** opgevraagd, nooit de waarde.

Die laatste twee rijen maken de afweging rond: fail-closed kan vandaag niets
breken dat werkt, want het enige dat belt is de trigger — en die draagt de
sleutel al.

#### De kopnotitie droeg een feit dat een paar uur na het schrijven verliep

Punt 3 van `index.ts` zei dat `lead_notify_secret` *op 2026-08-16 niet in de
vault staat, dus iedereen die de URL kent mag posten*. Die sleutel is diezelfde
dag om 16:22:38 UTC alsnog toegevoegd. De regel was waar toen hij geschreven
werd en een paar uur later niet meer — en op die achterhaalde regel rustte de
onderbouwing van de fail-open.

Wat er wél bleef staan was de functiekant. Dit is dezelfde klasse als de
Sentry-guard van eerder vandaag: **de code vroeg of de variabele gezet was, niet
of hij bruikbaar was.**

```js
if (LEAD_NOTIFY_SECRET) { ...401... } else { console.warn('endpoint staat open') }
```

Twee gaten in vier regels. De `else` liet dóór in plaats van te weigeren. En
`auth.includes(SECRET)` is een substring-vergelijking: met een sleutel van één
teken komt elke header die dat teken bevat erdoor — set-but-unusable, precies
een `SENTRY_DSN` die op de tekst `optional` staat.

#### Drie uitkomsten, en dat is opzet

```
sleutel onbruikbaar               -> 503 not-configured
sleutel goed, header fout/afwezig -> 401 unauthorized
beide goed                        -> door
```

Eén blanco 401 op de eerste twee is goedkoper te schrijven en duurder te
diagnosticeren: dan is *de functie staat niet ingesteld* niet te scheiden van
*jij stuurde de verkeerde sleutel*, en juist dat onderscheid moet met een
onschadelijke probe te meten zijn. Zie
[[feedback_poort_testen_zonder_bijwerking]]. Het huis doet dit al zo —
`/api/cal` antwoordt 503 `not-configured`, `diaz-appsumo-redeem` 503
`service-unavailable`.

De ondergrens op de sleutel is 16 tekens tegen 44 in de vault. Bewust ruim
eronder: een te strenge controle zet de keten uit op het moment dat hij aan
hoort te gaan, en dat is een ergere fout dan de fout die gerepareerd wordt.
Dezelfde klem als bij `dsnLooksUsable()` een paar uur eerder.

#### `exclude` in tsconfig is een filter, geen muur

`index.ts` opent met `Deno.serve(...)` op moduleniveau, en `tsconfig.json`
sluit `supabase/functions` uit omdat tsc `Deno` niet kent. Daarmee lag de hele
functie buiten élke poort in deze repo — en dat is precies waar het defect zat.

De beslissing staat nu in `supabase/functions/lead-acknowledge/auth.ts`: geen
enkele Deno-global, geen env-lezing, sleutel als parameter. Dezelfde naad als
`initSentry(injected?)`. En omdat `lib/lead-acknowledge-auth.test.ts` hem
importeert, **typecheckt tsc hem alsnog** — `exclude` filtert de wortelset, maar
een geïmporteerd bestand wordt gewoon meegenomen. Stond de test naast de
functie, dan draaide hij wel onder vitest en typecheckte niets hem: `vitest
groen` is geen `tsc groen`, zoals #252 liet zien.

#### De poort heeft twee lagen die elkaar niet overlappen

De beslissing is echt uitvoerbaar getest. Maar het defect zat in de
**bedrading**, niet in de logica — een `else`-tak die dóórliet — en een
module-import kan die per definitie niet zien. Daarom er een tekstscan op
`index.ts` naast, via de gedeelde `zonderCommentaar` uit `lib/bronscan.ts`.

Mijn eerste versie van die scan was te zwak, en dat was aan de asserties niet te
zien: hij pinde de **vorm van het oude defect** (`console.warn`,
`.includes`), zodat een nieuwe fail-open met andere woorden erlangs glipte. Er
staat nu ook een assertie op de bewaking zelf (`if (!oordeel.ok)` gevolgd door
een `return`). Control-flow verifiëren kan een tekstscan niet — dat is zijn
grens en die staat opgeschreven — maar de bewaking verdwijnt nu alleen nog met
een zichtbare bewerking.

#### Elf mutaties, elf keer de voorspelde kleur

Tien rood op negen verschillende asserties, één groen als controle. Het
discriminerende paar draagt het bewijs dat de strip dragend is: dezelfde
defecttekst als **commentaar** blijft groen (10), en met de strip uitgezet wordt
hij rood (11). Zonder dat paar is groen ook te verklaren door een scanner die
niets leest.

#### Meting

```
tsc --noEmit             exit 0
vitest run               1213 tests in 56 bestanden (was 1196/55)
i18n:check               718 sleutels x 4 (ongewijzigd: geen sleutel geraakt)
regen:pricing:check      groen
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +17 is de nieuwe poort. Geen kopij geraakt en geen route: dit is een edge
function plus een poort, dus er valt hier niets in de browser na te meten.

#### Wat dit niet doet

**Het rolt niets uit.** Er staat geen deploy-workflow voor edge functions in
deze repo, en uitrollen is een productieschrijfactie op het leadpad — dat blijft
operator-werk. De code is fail-closed; de functie op Supabase draait tot die
uitrol nog de oude, open versie.

En één claim in de kop van `index.ts` is **niet** nagemeten: dat een non-2xx
pg_net laat hertrylen. Die zin is gescopet naar het zakelijke pad in plaats van
weggehaald, want de poort gaf al 405 en 401 — dat de regel daar niet gold is uit
de code zelf af te lezen, los van de vraag of de premisse klopt.

### 2026-08-26 — de achterstandslijst van 22 naar 0, in drie PR's

`lib/i18n/kale-tekst.test.ts` droeg een ratel: 22 regels kopij die in vier talen
Engels bleven, met `ACHTERSTAND_MAX` als plafond. Die lijst is nu leeg — PR #273
haalde er vijftien af, #274 nog drie, en #275 de laatste vier. Gemeten na afloop:
`ACHTERSTAND` en `ATTR_ACHTERSTAND` allebei `{}`, en de ratel telt ze **allebei**
tegen `ACHTERSTAND_MAX = 0`, dus die nul dekt zowel JSX-tekst als attributen.

**Wat de drie bindt is niet het onderwerp maar de blinde vlek.** Elk defect was
functioneel gewoon aanwezig en syntactisch onzichtbaar voor het instrument dat
ernaar keek. De vijf i18n-poorten lezen `DICT` of `generateMetadata`; een zin die
nooit een sleutel kreeg heeft niets om uit de pas mee te lopen. Dezelfde vorm als
de server-actions van 24 augustus en als `process.env[SECRET_ENV]`, dat
`CAL_WEBHOOK_SECRET` maandenlang uit `.env.example` hield.

#### PR #273 — vijftien regels die in de wortel-layout woonden

De skip-link, de preloader, het commandopalet en twee `aria-label`s in de
voettekst staan in `app/layout.tsx` of in clientcomponenten zonder
`params.locale`. Daarom was er niets om te vertalen: ze hadden geen sleutel.

`LocaleProvider` maakte het goedkoop. Die staat al in de wortel-layout en leidt de
taal af uit `useParams()`, dus een clientcomponent kan hem daar consumeren.
Vandaar `components/SkipLink.tsx`, een `"use client"` op de preloader, en `t` erbij
in het palet — dat had `useLocale` al staan.

**Onderweg een tweede defect dat niet op de lijst stond.** De signals-tagpagina
noemt zich in haar eigen kop een spiegel van `insights/tag`, maar die tweede is
ooit geïnternationaliseerd en deze niet. Ze rendeerde `canonical.toLowerCase()` —
de rauwe Engelse tag, kleingemaakt, wat Duitse zelfstandige naamwoorden sloopt —
waar de tweeling `tagLabel(l, tag, canonical)` gebruikt. Precies de klasse uit
20 augustus, waar `.toLowerCase()` van `Immobilien` het woord `immobilien` maakte.

Twaalf sleutels × vier talen, 718 → 730. Duits in de Sie-vorm, Spaans in tú,
Nederlands in je; geen verboden woord, geen krul-apostrof.

Gemeten op een productiebuild: 78 controles, **afwijkingen 0**, zes positieve
controles waaronder een 404 op een verzonnen tagslug. Het palet rendert pas na een
echte toetsaanslag — een synthetisch `KeyboardEvent` opent hem niet — dus die vier
strings zijn ná ctrl+k in de DOM gemeten.

#### PR #274 — `params` is een Promise, en het faalde stil

De drie `opengraph-image`-routes typeerden `params` als gewoon object en lazen
`.locale` en `.slug` er rechtstreeks vanaf. In Next 16 is `params` een Promise:
die velden bestaan daar niet, dus beide waren `undefined`. `assertLocale` viel
terug op `"en"`, de opzoeking gaf niets, en wat LinkedIn en Slack toonden was de
generieke terugval.

**Niet dezelfde taal — dezelfde kaart.** Gemeten op een productiebuild waren vier
talen van hetzelfde artikel byte-identiek (54285), en twee verschillende artikelen
in dezelfde taal ook. Na de reparatie geeft alleen nog een slug die niet bestaat
die 54285 terug.

Geen enkele poort kon dit zien, en dat is uit te schrijven: **Next genereert geen
typevalidators voor metadata-routes** — gemeten, nul bestanden onder `.next/types`
die `opengraph-image` noemen, terwijl 23 bestanden in `app/` `params: Promise<`
correct typeren. Die 23 staan goed omdat iemand ze goed schreef, niet omdat een
poort het afdwong. En de route antwoordde gewoon 200 met een geldige PNG, dus er
ging ook niets stuk. Precies daarom stond het er zo lang.

`app/og-deelkaart.test.ts` bewaakt sindsdien de bedrading en niet de logica: elke
deelkaart-route die `params` neemt typeert hem als Promise, await hem, en leest
geen veld rechtstreeks. **Een tekstscan en geen module-import**, want het defect
zát in de bedrading — de default-export aanroepen slaagt bij beide vormen en
bewijst dus niets. Zelfde afweging als bij de poort op `lead-acknowledge`.

#### PR #275 — de deelkaart per taal, en twee rollen op één constante

`OG_IMAGES` was een constante die naar `/opengraph-image` wees: de wortelkaart,
met Engelse kopij. Twintig pagina's gebruikten hem, in vier talen. Wie `/nl/services`
deelde kreeg daar de Engelse tagline. Het is nu `ogImages(l)` en wijst naar
`/{taal}/opengraph-image`; alle twintig afnemers hadden `l` al in scope. Het was
een constante waar een functie hoorde.

De nieuwe route trekt vier regels die al in vier talen bestonden —
`hero.title.1/2/3` en `hero.chip.sectors`. **Nul nieuwe dict-sleutels.**

**Het tweede defect zat een laag dieper.** `/about` gaf `AUTHOR_IMAGE_PATH` door
als `og:image`, terwijl die constante de entiteitsafbeelding van de JSON-LD draagt.
Twee rollen met tegengestelde eisen:

| | deelkaart | entiteitsafbeelding |
|---|---|---|
| per taal | moet verschillen | moet **niet** verschillen |
| afnemer | `openGraph.images[]` | `Person.image`, `Organization.image` |
| waarom | een Duitse lezer deelt een Duitse kaart | #198 bracht vier `Person`-knopen terug tot één `@id` |

De doc-comment bij `AUTHOR_IMAGE_PATH` zei letterlijk dat hij voor
`openGraph.images[].url` was. Na de reparatie had hij nul afnemers en is hij weg.

**De vrijstelling van de Engelse wortelkaart draagt nu haar eigen voorwaarde.** Ze
hangt aan `AUTHOR_IMAGE_URL`, die vier levende JSON-LD-afnemers heeft. Ze is
bewust van de dode constante naar de levende verplaatst: anders was de assertie
vacuüm geworden op precies het moment dat ze ging tellen.

`metadata-locales.test.ts` eiste alleen dat de lijst niet leeg was; hij eist nu per
afbeelding dat het pad met `/{taal}/` opent. **Die poort vond het `/about`-defect** —
ik was er zelf overheen gelezen.

De nieuwe scan viel eerst vals op twee correcte pagina's:
`includes("/opengraph-image")` matcht ook de **staart** van
`` `/${l}/insights/${post.slug}/opengraph-image` ``, een pad dat de taal juist wél
draagt. Het anker is nu het aanhalingsteken ervóór, met een test in twee richtingen
zodat groen niet ook te verklaren is door een regex die niets vindt.

Acht mutaties, acht keer de voorspelde kleur. Het paar dat telt is M6/M7: hetzelfde
pad in een **toelichting** blijft groen, in echte code wordt het rood — het
executeerbare bewijs dat `zonderCommentaar` dragend is en niet decoratief. Vier
eerdere tekstscans in deze repo vielen om op hun eigen proza.

#### Drie instrumenten braken in #275, alle drie gevangen door een positieve controle

1. **De eerste sitemap-scan gaf nul kale wortelkaarten, en dat was geen meting.**
   Geneste `sh -c`-quoting verminkte `tr` en produceerde 570 regels uit 190 URL's.
   Herschreven in Python om die laag weg te halen.
2. **De tweede gaf 190 ophaalfouten.** De sitemap van een lokale build draagt
   `localhost:3000`, en mijn regex knipte alleen de productiehost weg. De nullen
   waren nep — de positieve controles gebruikten een vast pad en vuurden gewoon
   `True`, en dát was het verschil.
3. **"92 og:image met verkeerde taal" was mijn eigen controle.** Die wees de
   artikelkaarten uit #274 af omdat ze niet op `/en/opengraph-image` eindigen,
   terwijl ze de taal correct dragen. Met de juiste logica: 190/190.

Daarnaast, bij de productiemeting: één 404 op `/nl/insights/salderingsregeling-2027`.
Die slug bestaat niet — ik typte hem uit het hoofd in plaats van hem uit
`getAllInsights("nl")` te lezen, exact de fout die op 22 augustus al is
opgeschreven. En een lege uitkomst op een derde artikel was mijn grep, niet de
pagina: de attribuutvolgorde verschilt daar, en `property="og:image"[^>]*content=`
matcht dan niet.

#### Meting

Op productie ná de merge, met de uitgeleverde SHA gelijk aan main. Gerichte losse
verzoeken, geen sweep — `SCOPE.md` verbiedt fuzzen op de Vercel-laag.

```
/opengraph-image      200   88301 bytes  ed2a058b5556
/en/opengraph-image   200   88301 bytes  ed2a058b5556   <- gelijk, en dat hoort
/nl/opengraph-image   200   95920 bytes  136d4367d10b
/de/opengraph-image   200   94674 bytes  6a59fcfc6ade
/es/opengraph-image   200  104494 bytes  1b6569bd2228
/fr/opengraph-image   307  (negatieve controle)
determinisme /nl 2x   identiek

20 pagina's over vier talen en vier kaartsoorten:
  og:image n != 1            0
  twitter:image n != 1       0
  wijst naar de kale wortel  0
  draagt zijn eigen taal     20 / 20
```

Op de lokale productiebuild dekte dezelfde meting alle 190 sitemap-URL's: 190/190,
nul ophaalfouten. Verdeling 98 taalkaarten + 60 artikel + 12 signal + 20 werk.

```
tsc --noEmit             exit 0
vitest run               1225 tests in 57 bestanden (was 1213/56 bij #273)
i18n:check               730 sleutels x 4 (was 718 vóór #273)
regen:pricing:check      groen
next build               exit 0
cmp CLAUDE.md AGENTS.md  byte-identiek
```

**Let op bij het lezen van de Vercel-status.** De poller gaf `success` bij de
eerste poging, en dat is precies de vorm die op 22 augustus misleidde. Verifieer
wát die status aanwijst: `/status` draagt de context `Vercel` met een `target_url`,
`/check-runs` draagt de zes verplichte checks. Een poller die één van beide leest
kan niet merken dat hij het verkeerde veld leest.

#### Wat er níét is gebeurd

Er is geen enkele operator-taak mee opgelost. `SENTRY_DSN`, de vijf
Plausible-doelen, `LEAD_NOTIFY_SECRET`, `RESEND_API_KEY`, `CAL_WEBHOOK_SECRET` en
de rest van de lijst bovenaan dit bestand staan onveranderd open. Dit was code.

### 2026-08-26 (vervolg) — Sentry gaat aan, en de melding droeg geen versie

Juan besliste dat de foutrapportage aan gaat. De reparatie van 25 augustus maakte
hem eerlijk — een DSN die gezet maar onbruikbaar is gedraagt zich sindsdien als
een ongezette, uit en luid — maar liet één ding staan dat pas bijt zodra er
werkelijk meldingen binnenkomen.

#### Twee namen voor hetzelfde feit, en niets ertussen

`lib/sentry.ts` las `SENTRY_RELEASE ?? GIT_COMMIT_SHA`. Vercel zet
`VERCEL_GIT_COMMIT_SHA`. Gemeten over `app`, `lib`, `scripts`, `.github`,
`next.config.ts` en `package.json`: **nul treffers** op die naam. Zonder een
handmatige toewijzing blijven allebei de terugvallen leeg, dus elke melding komt
zonder versie binnen — en dan is *in welke deploy ging dit stuk* niet te
beantwoorden op precies het moment dat je het vraagt.

Dat is dezelfde vorm als `process.env[SECRET_ENV]`, dat `CAL_WEBHOOK_SECRET`
maandenlang uit `.env.example` hield: functioneel werkt alles, er gaat niets
stuk, en het instrument dat ernaar kijkt kan het niet zien.

#### `??` is hier de verkeerde operator, en dat is te meten

`??` valt alleen terug op `null` of `undefined`. Een omgevingsvariabele die je in
een dashboard aanmaakt maar leeg laat, komt binnen als **lege string** en wint
daarmee van élke terugval erachter — stil. Dezelfde klasse als een `SENTRY_DSN`
op de tekst `optional`: gezet, en onbruikbaar.

`eersteGevulde()` behandelt leeg en witruimte als niet-gezet en trimt wat het
teruggeeft. De volgorde is expliciet eerst, platform laatst:

    release: eersteGevulde(
      process.env.SENTRY_RELEASE,
      process.env.GIT_COMMIT_SHA,
      process.env.VERCEL_GIT_COMMIT_SHA,
    )

**`environment` ging mee, en dat was iets meer dan de vraag.** Dezelfde
defectklasse stond één regel hoger in dezelfde objectliteral. Repareer je één
regel in een cluster, test dan de buren — ze zijn met hetzelfde verkeerde model
geschreven. Dat staat sinds 19 augustus in dit logboek en het gold hier weer.

#### De variabele hoort níét in `.env.example`, en dat werd door niets afgedwongen

`VERCEL_GIT_COMMIT_SHA` staat in `DOOR_PLATFORM`, met reden: het platform zet
hem, en wie hem in het voorbeeldbestand ziet gaat hem invullen — waarna het
versielabel liegt over welke commit draait.

Die regel stond alleen in de toelichting bij die lijst. **Niets controleerde
hem**, en de twee bestaande asserties kunnen dat ook niet: een platformvariabele
*wordt* gelezen, dus "gedocumenteerd maar nergens gelezen" blijft groen terwijl
een lezer hem invult. Precies de klasse *een toelichting beschrijft een controle
die niet bestaat*, die dit logboek het vaakst noteert.

**Het gat is gemeten en niet aangenomen.** Met de variabele in `.env.example` en
de nieuwe assertie eruit is die poort **6/6 groen**. Daarna rood.

#### Tien mutaties, tien keer de voorspelde kleur

| | mutatie | verwacht |
|---|---|---|
| M1 | `release` verliest de platformterugval | ROOD |
| M2 | lege string telt weer als gezet | ROOD |
| M3 | `environment` terug naar de `??`-keten | ROOD |
| M4 | er wordt niet meer getrimd | ROOD |
| M5 | volgorde omgekeerd, platform eerst | ROOD |
| M6 | uitzondering weg uit `DOOR_PLATFORM` | ROOD |
| M7 | platformvariabele in `.env.example` | ROOD |
| M8 | de positieve controle zoekt de verkeerde aanroep | ROOD |
| **M9** | **dezelfde onbekende variabele in een TOELICHTING** | **GROEN** |
| **M10** | **dezelfde naam in ECHTE code** | **ROOD** |

M9/M10 is het paar dat telt: het bewijst dat `zonderCommentaar` in die poort
dragend is en niet decoratief. Vier eerdere tekstscans in deze repo vielen om op
hun eigen proza.

M8 richt zich op de nieuwe poort zelf. Zonder die positieve controle slaagt elke
assertie over de `init`-argumenten ook op een `init` die nooit is aangeroepen —
een lege uitkomst uit een kapot instrument leest hetzelfde als een schone meting.

#### Wat de poort niet bewaakt

Dát Vercel die naam zet. Dat is een platformfeit; verandert het, dan valt de
terugval stil terug op `undefined` en is dat exact de toestand van vóór deze PR.
Staat in de kop van het testbestand, zodat een groen vinkje hier niet gelezen
wordt als "de versie komt altijd mee".

#### Het tweede punt op mijn eigen lijst bestond niet

Ik meldde erbij dat `lib/sentry.ts:59` nog verzoeken aan `/api/health` uit de
rapportage filtert — een route die met #134 vertrok. Nagemeten: die tak is er
niet. **`630de98` (#217, 21 augustus) heeft hem al weggehaald**, en het logboek
zegt dat ook, in het blok van diezelfde dag.

Waar ik naar keek was de regel *Niet meegenomen* in het blok van #211, vier PR's
eerder. Ik heb die als openstaand overgenomen zonder verder te lezen en zonder
het bestand te openen. Dat is de fout die hier het vaakst terugkomt, nu op het
logboek zelf: **een notitie beschrijft de toestand van het moment waarop hij
geschreven werd, niet die van vandaag.** Grep in het levende bestand kostte één
aanroep.

Wat er nog wél staat zijn twee bewuste verwijzingen: de assertie in
`lib/csrf-vrijstelling.test.ts` die eist dat `/api/health` **403** geeft, en de
toelichting in `lib/csrf-vrijstelling.ts` die uitlegt waarom die vrijstelling
verviel. Allebei uit #211, allebei terecht.

#### Meting

```
tsc --noEmit             exit 0
vitest run               1235 tests in 57 bestanden (was 1225/57)
i18n:check               730 sleutels x 4 (ongewijzigd: geen sleutel geraakt)
regen:pricing:check      groen
next build               exit 0
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +10 is negen in het nieuwe release-blok plus één in de env-poort. Geen kopij
geraakt en geen route: dit is serverpad, dus er valt niets in de browser na te
meten.

Zes verplichte checks groen op de PR, en de Vercel-status apart nagekeken — die
komt via `/status` en niet via `/check-runs`, de val van 22 augustus. Squashboom
identiek aan die van de tak.

#### Wat dit niet doet

**De rapportage staat hierna nog steeds uit.** Wat er verandert is dat een
melding straks zijn commit draagt. `SENTRY_DSN` op productie zetten blijft
operator-werk; die waarde is van Juan.

### 2026-08-28 - de LinkedIn-wachtrij, en een poort op een document

Twaalf posts staan plak-klaar in `docs/linkedin-posts.md`. Zes stonden er al
(uit #256), zes zijn nieuw geschreven. Ze zijn pas geschreven nadat de bodies
van hun artikelen gelezen waren: een post die specifieker is dan zijn artikel
is verzonnen, en twee van de gelinkte artikelen dragen zelf een kop **"Wat ik
hier niet beweer"**.

#### De posts stonden op twee plekken, en dat is de vaakst terugkerende bugklasse hier

`docs/social-linkedin.md` droeg de eerste zes posts, de vorm-regels en de
kalender. Twee documenten die een tekst dragen lopen uit elkaar, en dan bewaakt
de zwakste. Het uitvoerbare deel woont nu in de wachtrij; `social-linkedin.md`
houdt de redenering - welk kanaal, welk profiel, waarom de inhoud die er al ligt
eerst aan de beurt is - en draagt **nul** artikel-URL's. Van 327 naar 166 regels.

#### Twaalf URL's gemeten, met een negatieve controle ernaast

Gerichte losse verzoeken op productie, geen sweep (`SCOPE.md` verbiedt fuzzen op
de Vercel-laag). Alle twaalf **200**; `/nl/insights/deze-slug-bestaat-niet-xyz`
gaf **404**. Zonder die 404 is een reeks 200's niet te onderscheiden van een
catch-all.

Alle twaalf lezen ook werkelijk Nederlands op `/nl`. Drie ervan zijn
all-market-artikelen (`why-operator-crms-fail`,
`the-esg-number-your-asset-manager-cant-defend`,
`your-returning-guest-looks-new-to-every-system`) en die dragen hun Nederlands
in `i18n.nl` in plaats van in de basisvelden - dus er is geen Nederlandse post
die naar een Engels artikel linkt.

#### `lib/linkedin-posts.test.ts` - een poort op een document

Een dode link in een geplaatste post zie je pas nadat een lezer geklikt heeft,
dus nooit. De poort leest de URL's uit de wachtrij en legt ze tegen
`getAllInsights("nl")`. Verder: hooguit 3.000 tekens per post, precies een link
per post en die op de laatste regel, geen bedrag in een post, en `social-linkedin.md`
draagt er nul.

Twee asserties zijn er alleen om de rest te kunnen vertrouwen - twaalf blokken
gevonden, en de NL-slugverzameling is niet leeg en weigert een verzonnen slug.
Zonder die twee slaagt elke andere assertie ook op een lege lijst.

**Het getal in de kop wordt geparst, niet overgeschreven.** Ik had "1.318 tekens"
opgeschreven voordat ik iets gemeten had; het waren er 1.232, na de vouw-reparatie
1.233. Een meetscript ving dat. Nu eist de poort dat de kop gelijk is aan de
gemeten maximumlengte. Zelfde klasse als de DR-0-aanname van 23 augustus: **een
citaat dat je zelf hebt geschreven is geen bron.**

#### Drie openingsregels liepen over de mobiele vouw

De vorm-regel in het document zegt dat de eerste twee regels de hele post zijn.
Post 8 opende op 154 tekens, post 9 op 145 en post 11 op 168 - alle drie
halverwege afgekapt op een telefoon. De punchline van post 8 staat nu vooraan,
post 9 opent met de vraag, en de eerste regel van post 11 is in tweeen gesplitst.
Alle twaalf openen nu op maximaal 137 tekens. De vouw is **niet** op een exact
getal gepind: LinkedIn publiceert die niet en hij verschilt per apparaat.

#### Een post die bewust minder zegt dan zijn artikel

Post 10 gaat over `why-operator-crms-fail`, en de slotzin van dat artikel noemt
"het CRM dat ik aan operators lever". Philly staat in aanbouw, en #188 heeft
precies die claim uit `work.page.lede` gehaald met een poort eromheen. De post
noemt het product dus niet.

#### Negen mutaties, negen keer de voorspelde kleur

Acht rood op zeven verschillende asserties, een groen als controle. Die groene is
de belangrijkste: hetzelfde bedrag in de **toelichting** van het document, buiten
elk fenced blok, blijft onzichtbaar. Dat is het uitvoerbare bewijs dat de poort
de posts leest en niet het hele bestand - vier eerdere tekstscans in deze repo
vielen juist om op hun eigen proza.

#### Onderweg

Het eerste dump-script sloeg **alle `ul`-items over**, dus de lijst met vier
dingen in het thuisbatterij-artikel was onzichtbaar en een post die daaruit was
geschreven had de kern van het artikel gemist. Nu wandelt het elke stringliteral
in bronvolgorde af. En de heredoc halveerde opnieuw een regex-escape (`[^"\\]`
werd `[^"\]`, `re.PatternError`) - dat is inmiddels de twaalfde keer; scripts
gaan via het Write-gereedschap.

#### Meting

```
tsc --noEmit             exit 0
vitest run               1243 tests in 58 bestanden (was 1235/57)
i18n:check               730 sleutels x 4 (ongewijzigd: geen sleutel geraakt)
regen:pricing:check      groen
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +8 is de nieuwe poort. Geen code geraakt: dit is een document plus een poort
erop, dus er valt niets in de browser na te meten.

#### Wat dit niet doet

**Er is niets geplaatst.** De posts staan klaar; plaatsen is Juans handeling.
En de vier LinkedIn-beslissingen op de operator-lijst staan onveranderd open -
Kop en Over plakken, de bedrijfspagina zichtbaar maken of niet, de Instagram-link
laten staan of niet. De vijf Plausible-doelen blokkeren de meting: zonder die
doelen is een klik vanaf LinkedIn niet te onderscheiden van geen verkeer.

### 2026-08-28 (vervolg) — de kanaalkeuze, en een poort die mijn eigen telfout ving

`docs/kanalen.md`. De vraag was om marketingideeën; de ideeën waren het
makkelijke deel. Wat het document draagt is de volgorde, en die volgt uit twee
cijfers die niets met marketing te maken hebben.

#### De beperking is opvang en capaciteit

**Drie trajecten tegelijk** (`docs/claims.md`, beslist 2026-08-22) bij €2.500
excl. btw per sprint. Een volle agenda is drie tot vijf gesprekken. Elk idee dat
volume levert lost daarmee een probleem op dat niet bestaat — dat schrapt zes van
de negen categorieën uit de bibliotheek waar de vraag uit kwam, inclusief
advertenties, Product Hunt en lifetime deals.

**En de opvang staat uit.** Het contactformulier schrijft niets weg (Supabase
402), `marketing.leads` en `marketing.subscribers` staan op nul rijen ooit, de
vijf Plausible-doelen bestaan niet, en `RESEND_API_KEY` en `CAL_WEBHOOK_SECRET`
zijn niet gezet. Verkeer sturen naar een site die niets vangt en niets meet
levert niets op waar je later iets van leert.

Van de vijf ideeën werkt er daarom **precies één vandaag volledig**: de vier
bevestigde klanten om een introductie vragen. Niet omdat het het slimste idee is,
maar omdat het als enige de kapotte keten niet raakt — een introductie loopt over
e-mail of telefoon en komt het formulier niet tegen. De andere vier staan met hun
blokkade erbij in een tabel, en drie van die vier blokkades zijn van de operator.

#### De poort ving twee fouten, allebei van mijzelf

`lib/kanalen.test.ts` bewaakt de vijf cijfers die het document draagt maar niet
bezit: artikelaantallen (`getAllInsights`), de capaciteitsgrens en de prijs
(`docs/claims.md`), de vier klantuitkomsten (`results.r1..r4` in `dict.ts`) en
het aantal posts in de wachtrij (`docs/linkedin-posts.md`).

**Ik schreef "elf artikelen" waar er vijf staan.** Dat is woordelijk de fout die
`docs/bereik-plan.md` op 2026-08-23 maakte en die het logboek al beschrijft: elf
telt de DE- en ES-clusters mee, terwijl een Nederlandse introductie op de
NL-markt binnenkomt en daar vijf energie-artikelen staan. Gevonden bij het
nameten, niet bij het schrijven. De eerste mutatie in het harnas zet hem terug.

**En de poort viel bij zijn eerste run om op mijn proza.** Ik schreef
"NL/BE-energiemakelaar", `dict.ts` schrijft "NL/BE energiemakelaar". Eén
koppelteken, en het is precies de dimensie waarin een verwijzing wegdrijft van
zijn bron. Het document is aangepast, de poort niet verzwakt — normaliseren op
koppeltekens zou drift toestaan in de enige dimensie waarin drift hier ontstaat.

#### Tien mutaties, tien keer de voorspelde kleur

Acht rood op zes verschillende asserties, twee groen als controle. De twee groene
dragen het bewijs dat de poort gescoped is: een fout artikelaantal in **een ander
document** blijft onzichtbaar, en een bedrag in de **proza** van `claims.md` ook
— de prijs wordt uit de tabelrij geparst, niet uit het bestand. Zonder dat tweede
paar is groen ook te verklaren door een parser die het hele bestand leest en
toevallig het goede getal tegenkomt.

Het parsen zelf is opzet en geen stijl: een tweede kopie van hetzelfde getal is
precies waarvoor `claims.md` bestaat. De capaciteitsparser gooit bovendien op
**meer dan één** treffer. Dat is de les van #229, waar `.match()` zonder `/g`
stil de eerste rij pakte terwijl er twee stonden — vandaag klopte het toevallig
omdat beide rijen hetzelfde getal droegen.

#### Wat de poort niet ziet

Of §1 nog klopt. De 402, de ontbrekende doelen en de niet-gezette secrets zijn
metingen van buitenaf met een datum erbij; een groen vinkje hier betekent niet
dat de stand nog geldt. Dat staat in de kop van het testbestand en in §5 van het
document, met de verwijzing naar `scripts/probe-supabase-402.sh`.

#### Meting

```
tsc --noEmit             exit 0
vitest run               1251 tests in 59 bestanden (was 1243/58)
i18n:check               730 sleutels x 4 (ongewijzigd: geen sleutel geraakt)
regen:pricing:check      groen
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +8 is de nieuwe poort. Geen code geraakt: dit is een document plus een poort
erop, dus er valt niets in de browser na te meten.

#### Wat dit niet doet

**Er is niets uitgevoerd.** De vijf ideeën staan op volgorde met hun eerste
stappen erbij; uitvoeren is Juans handeling. En er is geen enkele operator-taak
mee opgelost — de 402, de vijf Plausible-doelen, `LEAD_NOTIFY_SECRET`,
`RESEND_API_KEY` en `CAL_WEBHOOK_SECRET` staan onveranderd open, en idee 5 wacht
expliciet op de eerste drie daarvan.

### 2026-08-28 (vervolg) — verse meting, een schone SEO-audit, en de vier introductieberichten

Drie vragen in één: een verse blik op de stand, het marketingplan verder, en
SEO-checks. Alles is gemeten in plaats van uit dit logboek overgeschreven.

#### De verse meting

| | uitkomst |
|---|---|
| git | schoon op `f93ffe4` (#286) |
| Supabase-datavlak, beide projecten | **nog steeds 402** — de leadopvang ligt er nog uit |
| productie, zes kern-URL's | 200, alle zes |
| Ahrefs `public-domain-rating-free` | `Insufficient plan` — DR blijft onmeetbaar, ongewijzigd sinds 2026-08-23 |

#### De SEO-audit: nul over de hele linie

`scripts/seo-audit.ts` tegen productie: **190 pagina's, 0 fouten, 0
waarschuwingen, 0 notities.** Dat is een uitkomst en geen kapot instrument —
de controles zijn getest in `lib/seo/audit.test.ts`, en het rapport zegt dat
zelf ook. Er ligt aan de technische SEO-kant niets te repareren; wat de
zoekkant blokkeert is meten (Search Console-property nakijken, de vijf
Plausible-doelen), en dat is operator-werk dat al op de lijst staat.

#### docs/introducties.md — idee 1 uitvoerbaar gemaakt

Idee 1 uit `docs/kanalen.md` (het enige dat vandaag volledig werkt) had nog
geen teksten. Nu wel: vier plak-klare berichten, één per bevestigde klant,
gekoppeld op sector plus venster omdat de namen bewust niet in deze repo
staan. Elk bericht draagt het cijfer dat die klant zelf haalde — woordelijk
uit de uitkomstentabel in `docs/claims.md` — plus precies één vraag, en geen
aanbod, geen link, geen bijlage. Erachter staat de reageer-routine van idee 2
als werkwijze: selectiecriteria in plaats van een verzonnen accountlijst,
want een lijst die ik verzin is geen bron.

`lib/introducties.test.ts` bewaakt het: de vier metrics worden uit de tabel
in `claims.md` **geparst**, niet overgeschreven, en elk bericht draagt er
precies één (bijectie, beide richtingen). Verder: geen URL in een bericht,
precies één vraagteken, geen enkel bedrag behalve de euro-uitkomst die zelf
in de tabel staat — dat dekt de sprintprijs zonder hem te dupliceren — de
sectornamen zoals `results.r1..r4.sector` in `dict.ts` ze schrijft, en het
automatiseringsverbod woordelijk aanwezig.

**Zeven mutaties, zeven keer de voorspelde kleur**, groen na herstel, nul
sporen. De groene controle is de scope-drager: een metric in de toelichting
buiten de fenced blokken blijft onzichtbaar, want de bijectie leest de
berichten en niet het hele bestand.

#### Meting

```
tsc --noEmit             exit 0
vitest run               1259 tests in 60 bestanden (was 1251/59)
seo-audit (productie)    190 pagina's · 0 / 0 / 0
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +8 is de nieuwe poort. Beide nieuwe bestanden puur CRLF, in bytes
gecontroleerd.

#### Wat dit niet doet

**Er is niets verstuurd.** Versturen is Juans handeling, per bericht, en het
document zegt dat zelf. Geen operator-taak opgelost: de 402, de vijf
Plausible-doelen, `LEAD_NOTIFY_SECRET`, `RESEND_API_KEY`, `CAL_WEBHOOK_SECRET`
en de vier LinkedIn-beslissingen staan onveranderd open.

### 2026-08-28 (vervolg) — de partnerteksten, en een parser die verhuisde voordat hij kon dubbelen

Verder met `docs/kanalen.md`: idee 3 — doorverwijspartners, geen affiliate —
is nu uitvoerbaar. `docs/partners.md` draagt drie berichten (installateur,
boekhouder, energie-adviseur, de drie soorten uit §2.3) plus één
doorstuurtekst die de partner zelf kan doorsturen. Elke tekst: één zin over
wanneer ze aan Juan moeten denken, de lekkage-scan als enige link, en
expliciet geen vergoeding — de beslissing uit kanalen §2.3, woordelijk.

**Eerst gemeten, toen geschreven.** De 402 staat er nog (herprobe), de
scanpagina antwoordt 200 op `/nl` en 404 op `/en` — precies wat `ENKELE_TAAL`
belooft — en de claims in de doorstuurtekst ("vier minuten", "geen
e-mailadres nodig", "gratis") zijn nagelezen tegen `ScanCallout.tsx` en het
ontwerp van de scan zelf. Het document zegt er ook eerlijk bij dat het
formulier áchter de scan nu niets wegschrijft (402) en dat bellen/mailen tot
die tijd de vangnetroute is.

#### De parser verhuisde vóórdat er een tweede kopie ontstond

`lib/partners.test.ts` moet kunnen bewijzen dat er géén klantuitkomst in een
partnertekst staat; `lib/introducties.test.ts` bewijst het omgekeerde. Beide
hebben daarvoor de metric-parser op de uitkomstentabel in `docs/claims.md`
nodig. Die parser stond als lokale functie in de introductiepoort — hem
overschrijven naar de nieuwe poort zou de bugklasse zijn die dit logboek het
vaakst noteert. Hij woont nu in `lib/claims-uitkomsten.ts`, met twee
afnemers. Zelfde vorm als `enkele-taal.ts` en `csrf-vrijstelling.ts`.

#### De poort, en twee dingen die hij afleidt in plaats van overtypt

- **De scan-URL komt uit `ENKELE_TAAL`** (`lib/i18n/enkele-taal.ts`), dezelfde
  bron als de sitemap en `ScanCallout`. Verdwijnt de route daar, dan valt de
  poort om — een link naar een 404 kan per constructie niet ontstaan.
- **De bronbeslissing wordt genormaliseerd gelezen.** "Geen contract en geen
  percentage om mee te beginnen" vouwt in `kanalen.md` over een regeleinde;
  mijn eerste grep op één regel miste hem en las als "de zin staat er niet".
  De poort normaliseert witruimte vóór het vergelijken, met die meting als
  reden in de comment.

Verder: precies één link per blok en die is de scan; nergens een bedrag;
nergens een van de vier metrics uit `claims.md` (die horen in
`docs/introducties.md`); drie van de vier blokken dragen "geen vergoeding" en
het ene blok zonder is aantoonbaar de doorstuurtekst.

#### Acht mutaties, acht keer de voorspelde kleur

Zeven rood op zes verschillende asserties, één groen als controle, groen na
herstel, nul sporen. De twee die het vermelden waard zijn:

- **M7 (groen)**: de scan-URL in de toelichting buiten de blokken blijft
  onzichtbaar — de linkcontrole leest de blokken, niet het bestand.
- **M8 (rood)**: de puntstrip uit de URL-detector slopen laat de correcte
  link in de doorstuurtekst ("…lekkage-scan. Niets aan vast") als afwijkend
  lezen — dezelfde val als de prijsregex van #225, en nu met een mutatie die
  bewijst dat de strip dragend is.

M6 muteert `docs/kanalen.md` in plaats van het eigen document: de beslissing
verschuiven bij de bron maakt de partnerpoort rood. Kopij mag zijn bron niet
overleven — de `ResultsStrip`-vorm, nu over twee documenten.

#### Meting

```
tsc --noEmit             exit 0
vitest run               1267 tests in 61 bestanden (was 1259/60)
i18n:check               730 sleutels x 4 (ongewijzigd: geen sleutel geraakt)
regen:pricing:check      groen
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +8 is de nieuwe poort; `introducties.test.ts` bleef op 8 tests, alleen
zijn parser importeert hij nu. Alle drie de nieuwe/geraakte bestanden puur
CRLF, in bytes gecontroleerd.

#### Wat dit niet doet

**Er is niets verstuurd en niemand benaderd.** De vier gesprekken zijn Juans
handeling, en het document zegt dat zelf. Geen operator-taak opgelost: de
402, de vijf Plausible-doelen, `LEAD_NOTIFY_SECRET`, `RESEND_API_KEY`,
`CAL_WEBHOOK_SECRET` en de vier LinkedIn-beslissingen staan onveranderd open.
Van de vijf kanalen-ideeën resteert alleen idee 4 (het eigen data-stuk) als
onuitgevoerd schrijfwerk — en dat wacht op gegevens die alleen Juan heeft:
`claims.md` draagt de vier eindcijfers, niet het onderliggende verloop per
traject, en een datastuk zonder die data zou verzonnen zijn.

### 2026-08-28 (vervolg) — het datastuk: de intake die het gat precies maakt

Idee 4 uit `docs/kanalen.md` — één stuk eigen data over wat vier operators
kwijt waren tussen intake en offerte — stond genoteerd als "wacht op gegevens
die alleen jij hebt". Dat bleek half waar: het artikel wacht daarop, maar het
gat zelf was nooit precies gemaakt. `docs/datastuk.md` doet dat nu.

#### Waarom er geen artikel geschreven is

`docs/claims.md` draagt de vier eindcijfers (+38% · 3.2x · −61% · €0,
bevestigd 2026-08-19) en verder niets: geen beginwaarden, geen meetbron, geen
volumes, geen verloop per stap. Een datastuk uit alleen eindcijfers schrijven
is het verhaal eronder verzinnen, en dat is hier de hoofdzonde. Het document
zegt dat zelf: "Ik publiceer niets. Het stuk wordt pas geschreven nadat jouw
antwoorden in `docs/claims.md` staan."

#### Eén intake, twee doelen

De 27 vragen — vijf vaste per traject (beginwaarde, eindwaarde, meetbron,
periode, volume) plus één traject-specifieke, plus drie over de meterdata —
zijn zo geformuleerd dat de antwoorden éérst de uitkomstentabel in
`claims.md` in gaan. Dat is regel 1 uit kanalen §2.4, en het sluit en passant
het open punt dat `claims.md` zelf sinds 2026-08-19 noteert: de
per-traject-details horen daar te staan, ook al bereiken ze nooit een pagina.

De kernvraag is die van traject 3: het verloop per stap — intake, schouw,
offerte — in dagen, vóór en na. Dat is letterlijk het stuk dat kanalen §2.4
beschrijft; zonder die rij is het niet te schrijven. "Niet meer te
achterhalen" geldt expliciet als eerlijk antwoord.

Het skelet ligt klaar met vijf koppen en `[ANTWOORD n]`-slots, en draagt
bewust geen enkele meetwaarde. Twee verplichtingen staan er al woordelijk in:
"vier is geen steekproef" en de kop "Wat ik hier niet beweer" — die kop
dragen drie bestaande NL-artikelen al (kanalen zei twee; hermeten gaf drie:
de twee ETS2-stukken plus het WPM-stuk).

#### De poort parseert zijn bronnen, drie stuks

`lib/datastuk.test.ts` (7 tests) leest de vier metrics via `metricsUitClaims()`
uit `lib/claims-uitkomsten.ts` — derde afnemer van dezelfde parser, na
introducties en partners — de sectornamen uit `results.r1..r4.sector` in
`dict.ts`, en de grens-regel woordelijk uit `docs/kanalen.md` (genormaliseerd
op witruimte, want die zin vouwt daar over een regeleinde — dezelfde les als
bij de partnerpoort, gemeten 2026-08-28).

Drie eisen die het document zelf niet kan bewaken: elke metric staat er
precies één keer (een tweede voorkomen is een cijfer dat de tabel uit kroop),
geen bedrag dat geen uitkomst is (dekt de sprintprijs zonder hem te
dupliceren), en de intake telt 27 checkboxes — aangevinkt telt mee, want
invullen is het doel.

#### Tien mutaties, tien keer de voorspelde kleur

Acht rood op acht verschillende asserties, twee groen als controle, groen na
herstel, nul sporen. De sprekendste rode is M8: alleen het `- [ ] `-voorvoegsel
van een vraag weghalen — de tekst blijft staan, het document oogt compleet, en
alleen de teller ziet 26 in plaats van 27. Dat is precies de "vraag die
stilletjes verdwijnt"-klasse.

De twee groene dragen de grenzen: M9 zet een vóluit geschreven metric ("plus
achtendertig procent") in de toelichting en blijft onzichtbaar — de
vergelijking is letterlijk, en dat staat als bekende grens in de kop van de
poort. M10 vinkt een checkbox aan en blijft groen: het bedoelde gebruik laat
de poort niet afgaan.

Onderweg één correctie op mijn eigen tekst: het skelet claimde "geen enkel
cijfer" terwijl de paragraafnummers en `[ANTWOORD 3]` cijfers zijn. Nu "geen
enkele meetwaarde" — een claim hoort niet breder te zijn dan wat waar is, ook
niet in een toelichting.

#### Meting

```
tsc --noEmit             exit 0
vitest run               1274 tests in 62 bestanden (was 1267/61)
i18n:check               730 sleutels x 4 (ongewijzigd: geen sleutel geraakt)
regen:pricing:check      groen
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +7 is de nieuwe poort. Beide nieuwe bestanden puur CRLF, in bytes
gecontroleerd. Geen code geraakt: dit is een document plus een poort erop,
dus er valt niets in de browser na te meten.

#### Wat dit niet doet

**Het artikel is niet geschreven.** Het kan pas nadat Juan de 27 vragen
beantwoordt en de antwoorden in `claims.md` staan — die volgorde is de regel,
geen vertraging. Er is niets gepubliceerd en niets verstuurd. En er is geen
operator-taak mee opgelost: de 402, de vijf Plausible-doelen,
`LEAD_NOTIFY_SECRET`, `RESEND_API_KEY`, `CAL_WEBHOOK_SECRET` en de vier
LinkedIn-beslissingen staan onveranderd open.

Daarmee is het marketingplan uit `docs/kanalen.md` zo ver uitgevoerd als het
zonder Juan kan: idee 1 (introducties, #287), idee 3 (partners, #288) en nu
idee 4 als intake. Idee 2 is een routine zonder bouwwerk, idee 5 wacht op de
opvang. De volgende stappen zijn versturen, gesprekken voeren en vragen
beantwoorden — en dat is allemaal van Juan.

### 2026-08-31 — diazatlas-SEO gerepareerd, en een dagelijkse content-machine op twee rails

Drie stukken werk, waarvan één buiten deze repo leeft en daarom hier
genoteerd staat.

**bongartzdiaz/diaz-editor#651 — open, mergen is aan Juan.** De drie
diazatlas-defecten uit de meting van vandaag: 7 og-deelkaarten van SVG naar
PNG (LinkedIn/WhatsApp/Facebook renderen geen SVG — elke share toonde géén
beeld), 26 canonical/hreflang/og:url-verwijzingen weg van `/index`-redirects,
en 22 meta's waarvan de prijs niet op de eigen pagina stond (Founding-restje:
meta zei het ene bedrag, de zichtbare pagina 15× het andere). Plus een
blijvende poort: `landing/_check-seo-consistency.py` — drie controles met
zelftests, 820 pagina's, 0 schendingen; hij ving op zijn eerste run 4
affiliates-pagina's die mijn greps hadden gemist. **De merge is door de
permissie-classifier geweigerd** — de PR staat klaar, Juan merget, daarna
live nameten. De prijspariteit-invariant beslist bewust níét welk bedrag
juist is; dat is een productkeuze en die staat in de PR-body benoemd.

**PR #291 (gemerged, `739d418`) — `docs/content-kalender.md` + poort.** De
enige bron waar de dagelijkse machine uit mag werken: 16 rijen over twee
sites, statussen klaar/wacht/wachtrij/live, refresh-terugval J2/J5/J6/D1.
`lib/content-kalender.test.ts` (10 tests) leidt de tags af uit
`lib/insights.ts`, eist een bron per rij en verbiedt bedragen in de
kalender. Vijf mutaties, vijf keer de voorspelde kleur; de poort ving bij
zijn eerste run een bedrag in mijn eigen D1-omschrijving. 1289 tests in 64
bestanden, was 1279/63.

**De machine zelf staat búiten de repo**: scheduled task
`content-machine-dagelijks` op Juans machine
(`~/.claude/scheduled-tasks/content-machine-dagelijks/SKILL.md`), dagelijks
~08:15, draait alleen als de app open staat. Eén stuk per run, uitsluitend
uit de kalender, schrijf-stack verplicht (copywriting + seo-specialist;
NL → stop-slop-nl, EN → ai-check + humanizer), publicatie via PR —
zelf-mergen mag alleen in déze repo bij groene checks, in diaz-editor nooit.
Wil je de machine stoppen of verzetten: de Scheduled-sectie in de sidebar,
niet dit bestand. **Belangrijk voor een volgende sessie: er bestaat dus al
een dagelijkse contentrail — bouw er geen tweede naast.**

### 2026-08-28 (vervolg) — het CRM heette op de site nog Philly, en de helft van de vervangen claims was aantoonbaar onwaar

Het logboek van 25 augustus noteerde "Philly staat nog 63 keer in geleverde
kopij" als eigen sweep met eigen poort. Hermeten gaf **93** voorkomens over elf
bestanden — het vierde cijfer uit dit logboek dat binnen dagen verliep — en
de sweep bleek geen hernoemklus maar een ontwarring: één naam droeg drie
identiteiten tegelijk.

#### Drie identiteiten, en een levende tegenspraak

| identiteit | waar | stand |
|---|---|---|
| het CRM dat Juan levert | drie artikelen, sector-FAQ's, `about.p.do1`, `/uses` | **hernoemd naar DEUS** |
| de US-venture in aanbouw | `ventures.v5`, `work.page.lede`, sectorkaarten, story-tijdlijn | blijft Philly |
| de stad | `hero.chip.status` "Amsterdam <-> Philly", `marquee.full` | blijft Philly |

En `/pricing` verkocht ondertussen al "DEUS CRM, EU-hosted, GDPR-clean" — de
site gebruikte dus twee namen voor één product, op pagina's die naar elkaar
linken. Dezelfde vorm als Hospitality/Horeca (#248/#249): het label wint.
Daarbovenop een directe tegenspraak: signals zegt "Every product I've
**shipped** ... Philly" terwijl `work.page.lede` zegt dat Philly nog gebouwd
wordt — en #188 heeft precies die claim met een poort afgedwongen.

#### Eerst gemeten of de claims onder de nieuwe naam waar zijn

Hernoemen maakt een claim niet waar, dus elke FAQ-claim is nagemeten op
DEUS-SHARED `origin/main` (`964888e`, 2026-08-27), in de canonieke checkout
`C:/business/deus-shared-tmp` — niet de verouderde werkkopie ernaast:

| claim in de kopij | bewijs |
|---|---|
| MLS/Funda-feeds | `app/api/mls-feeds/route.ts` bestaat |
| SOI-module | `app/api/soi/route.ts` + `app/soi/page.tsx` |
| filantropie / donor scoring | `app/api/philanthropy/donor-scores/route.ts` + `app/philanthropy/donors/page.tsx` |
| "runs on MariaDB via the Prisma adapter" | **onwaar** — `prisma/schema.prisma` zegt `provider = "postgresql"` |
| "Prisma 7 + MariaDB" op `/uses` | half onwaar — Prisma `^7.5.0` klopt, MariaDB niet |

De MariaDB-claim stond in vier talen in `uses.data.prisma`, met als
onderbouwing "gekozen voor compatibiliteit met het ops-team" — een reden voor
een keuze die niet meer bestaat. Nu: "DEUS CRM draait op PostgreSQL via
Prisma. Bewezen techniek, niet voor trends."

**48 regels gewijzigd over zes bestanden**: 12 in de drie artikelen, 16 in de
FAQ's, 16 dict-waardes (`about.p.do1`, `about.focus.re.body`,
`uses.data.prisma`, `uses.hw.mbp` × 4 talen), één op de `/uses`-pagina, en
twee comments die nog naar `app/philly/*` wezen — paden die met #134
verdwenen. De toelichting beschreef verwijderde code, de bekende klasse.

#### Wat er bewust blijft staan, en waarom dat drie beslissingen zijn

De stad en de venture zijn geen drift. Maar drie plekken zijn niet door mij te
beslissen, en die staan nu op de operator-lijst: de signals-zin die Philly als
*geleverd* opvoert, `now.ship.1` dat "Philly CRM v1.2" claimt (naam én
versheid), en de vraag of de US-venture zelf Philly blijft heten — de
`/work/philly`-URL en `uses.op.philly` hangen daaraan.

#### De poort leest data, en de vrijstellingen dragen hun voorwaarde

`lib/deus-naam.test.ts` (5 tests) leest de geëxporteerde data — een "Philly"
in een toelichting is geen kopij en blijft onzichtbaar. Vier lagen:

1. **artikelen**: 0× Philly per taal, met DEUS >= 3 als positieve controle —
   anders is nul ook te verklaren door een lege lijst;
2. **FAQ's** via `faqStrings(l)`: 0× Philly, DEUS aanwezig;
3. **dict**: de sleutels waarvan de wáárde Philly draagt zijn per taal exact
   de zes toegestane, elk met reden — een zevende valt om, en een sleutel die
   zijn Philly verliest ook, want dan is de vrijstelling niet meer waar;
4. **signals**: exact 1 per taal — vrijstelling met voorwaarde, tot Juan de
   geleverd-claim beslist. Groei en stille verwijdering vergen allebei een
   zichtbare bewerking.

Plus: MariaDB 0× in dict en 0× op de `/uses`-pagina, met PostgreSQL als
positieve controle.

**De signals-laag moest één keer om.** `localizeSignal` spreidt de basis
inclusief het `i18n`-veld, dus `JSON.stringify(getSignals(l))` draagt álle
vertalingen mee en telt altijd 4, ongeacht de taal. De poort stript `i18n`
vóór het tellen en meet daarmee het gerenderde oppervlak per taal — de eerste
versie mat de opslagvorm.

#### Tien mutaties, tien keer de voorspelde kleur — nadat het harnas zelf brak

Negen rood op vijf verschillende asserties, één groen als controle
(Philly in een toelichting in `insights.ts` blijft onzichtbaar), groen na
herstel, nul sporen. De sprekendste rode zijn M4 en M6: een toegestane sleutel
die zijn Philly verliest en een signals-Philly die stil verdwijnt — allebei
gevallen waarin de site júist schoner lijkt, en de poort toch omvalt omdat de
vrijstelling dan niet meer waar is.

**Eerst meldden alle negen rood-mutaties STUK.** `subprocess.run(text=True)`
decodeert op Windows met cp1252, en juist de fálende vitest-uitvoer draagt
UTF-8-bytes — de em-dashes uit mijn eigen Nederlandse assertieberichten. Een
groene run is kort en ASCII-veilig; een rode gooide een `UnicodeDecodeError`
ín de capture, leverde lege uitvoer op, en las als kapotte poort. Het
instrument brak uitsluitend op de uitkomst die het moest detecteren.
`encoding="utf-8", errors="replace"` op de capture. Verwant aan de
cp1252-stdout-val die hier al vaker stond, maar dit is de leesrichting.

#### Gemeten

Op een productiebuild (poort vooraf 0 LISTENING, startlog gelezen):

```
/en/about   'DEUS for operator CRM' aanwezig · oude frase 0x
/nl/about   'DEUS voor operator-CRM' aanwezig
/en/uses    PostgreSQL aanwezig · MariaDB 0x · 'DEUS DB' aanwezig
            en de venture-link heet er nog Philly — dat hoort
/de/uses    MariaDB 0x · 'DEUS-DB' aanwezig
/en/sectors/real-estate   'DEUS ingests MLS' · Philly 0x
artikel why-operator-crms-fail, 4 talen   oude CRM-frase 0x
/en · /en/work   stad en venture dragen Philly nog — dat hoort
positieve controles   2/2
```

Eén meetles onderweg: de eerste sonde eiste "Philly 0×" op de artikelpagina's
en viel op de **venture-kruiskaart** (`/work/philly`, "The US ops dashboard")
die onder elk artikel met de juiste tag rendert. Hermeten per bron: oude
CRM-frase 0×, en de 2 overgebleven Philly's zijn exact de 2
venture-kaart-verwijzingen (zichtbare HTML + RSC-payload), in alle vier de
talen. Een telling zonder toeschrijving leest een terechte vermelding als lek.

```
tsc --noEmit             exit 0
vitest run               1279 tests in 63 bestanden (was 1274/62)
i18n:check               730 sleutels x 4 (ongewijzigd: alleen waardes)
regen:pricing:check      groen
next build               exit 0
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +5 is de nieuwe poort.

#### Wat dit niet doet

De drie naamsbeslissingen hierboven zijn niet genomen — ze staan op de
operator-lijst. En er is geen operator-taak mee opgelost: de 402, de vijf
Plausible-doelen, `LEAD_NOTIFY_SECRET`, `RESEND_API_KEY`,
`CAL_WEBHOOK_SECRET` en de vier LinkedIn-beslissingen staan onveranderd open.

### 2026-08-31 (vervolg) — de eerste volle dag van de contentmachine, en drie rijen waarvan de premisse niet klopte

Twaalf PR's (#293 t/m #304) die het logboek nog niet hadden gehaald. Vier
daarvan zijn inhoud, één is een refresh-ronde, de rest zet kalenderrijen om.
Wat ze bindt is niet het onderwerp: **bij drie van de vier is het onderwerp
tijdens het natrekken bijgesteld**, omdat de rij een premisse droeg die bij de
uitvoerder niet standhield.

Dat is geen toeval maar het ontwerp. `docs/content-kalender.md` schrijft voor
dat regelgeving bij de uitvoerder wordt geverifieerd en niet bij een
samenvatting, en een kalenderrij is bedacht vóórdat die verificatie plaatsvond.

#### Wat er is uitgeleverd

| rij | PR | wat |
|---|---|---|
| J1 | #293, #294 | netcongestie voor installatiebedrijven — NL, Energy |
| D1 | #295 | refresh-ronde over de diazatlas-landing: 820 pagina's, 0 schendingen |
| D2·D3·D4·D6 | #296–#299 | vier rijen naar `wachtrij`; het werk staat in `bongartzdiaz/diaz-editor` |
| J2 | #300 | refresh van het saldering-cluster, vijf artikelen |
| J3 | #301, #302 | WPM jaar twee — NL, Logistics |
| J4 | #303, #304 | Solarpflicht, bondsrecht bovenop landesrecht — DE, Energy |

#### Drie keer sloeg het natrekken de rij om

**J2 — het woord dat in elke samenvatting staat en niet in de wet.** Het
oudste artikel opende met "de afbouw van de salderingsregeling in 2027". De
Rijksoverheid spreekt dat woordelijk tegen: het kabinet besloot de regeling in
2027 *helemaal te stoppen en niet eerder af te bouwen*. De wet heet
beëindiging (36.611, Staatsblad 29 januari 2025); het afbouwvoorstel (35.594)
is een ander traject dat niet is doorgegaan. Het woord komt terug zodra iemand
uit een samenvatting overschrijft, en daarom staat er nu een poort op.

Zwaarder was wat er níét stond. **Geen van de vijf artikelen noemde de
wettelijke ondergrens onder de terugleververgoeding**, terwijl drie ervan de
lezer vragen een som te maken. Tot 1 januari 2030 is dat minstens 50% van het
kale leveringstarief. Dat getal is kenbaar — het staat in de wet — en zonder
die bodem komt elke som te laag uit. Een installateur die te laag rekent,
verkoopt een batterij op een argument dat de klant later zelf kan weerleggen.

**J3 — twee rijen die op "niet nagetrokken" stonden, waren wel kenbaar.** De
indieningsdatum voor WPM is uiterlijk 30 juni over het voorgaande kalenderjaar,
op twee RVO-oppervlakken bevestigd, en de peildatum voor de drempel is
jaarlijks op 1 januari in plaats van eenmalig. Daardoor beloofde het eerste
WPM-artikel iets dat niet meer klopte: géén indieningsdatum te noemen. Die
disclaimer is bijgewerkt en verwijst nu naar het vervolgstuk.

Een ❌ in `docs/claims.md` betekent *vandaag niet nagetrokken*, niet *niet
natrekbaar*. Dat onderscheid is het verschil tussen een rij die je overneemt en
een rij die je opnieuw meet.

**J4 — een hele wetslaag erbij.** De rij beschreef Solarpflicht als een puur
landesrechtelijk lappendeken. Sinds BGBl. 2026 I Nr. 226 ligt daar een
bondslaag overheen. Zie het blok hierboven.

Alleen **J1** hield stand zoals bedacht. Daar zat de correctie in de andere
richting: de circulerende cijfers over wachtenden en wachttijden zijn bewust
niet overgenomen, want ze waren bij ACM noch bij Netbeheer Nederland
terug te vinden.

#### De derde kopie die niet is ontstaan

`kopij()` — de functie die titel, samenvatting, meta en alle bloktekst van een
artikel platslaat — stond in twee poorten in dubbel en zou bij J3 een derde
kopie krijgen. Verhuisd naar `lib/insight-kopij.ts`, met `ctaHrefs()` ernaast
voor de kruislinkcontrole. `lib/i18n/nederlands.test.ts` en
`lib/saldering.test.ts` verloren er samen 41 regels door en kregen er 4 terug.

Bij J4 bleek die verhuizing meteen een grens te trekken: `kopij()` neemt het
**label** van een cta mee en de **href** niet. Daardoor draagt het buurartikel
het woord *Solarpflicht* zodra de kruislink erin staat, en moest de clusterregel
op `§ 106` matchen in plaats van op dat woord. Een eigen test houdt die grens
vast.

#### Een refresh-rij is geen artikel, en de poort wist dat beter dan ik

Mijn eerste poging zette J2 op `wachtrij`, alsof het een eenmalige publicatie
was. `lib/content-kalender.test.ts` viel om: J2 zit in de terugvalpool
J2/J5/J6/D1, en die pool leegtrekken is precies wat de poort verhindert. Een
refresh-rij blijft `klaar` en noteert zijn ronde in de bron-cel — zelfde vorm
als D1 in #295.

**De poort is niet aangepast.** Hij had gelijk.

#### De Diaz Editor-kant

`bongartzdiaz/diaz-editor#651` is gemerged (de deelkaarten naar PNG, de
`/index`-canonicals eruit, de meta-prijzen gelijk aan de pagina). Daarna gaf
`landing/_check-seo-consistency.py` 820 pagina's en 0 schendingen — dat is de
D1-ronde.

**Vijf PR's staan daar open en wachten op Juan:** #647 (klantenservice,
prijsconsistentie, zetelbeheer) plus #652, #653, #654 en #655 uit de
D-rijen. In die repo merget Juan; deze sessie doet dat niet.

#### Meting

Per PR gemeten, niet achteraf gereconstrueerd:

| na | bestanden | tests |
|---|---|---|
| J1 (#293) | 64 | 1294 |
| J2 (#300) | 65 | 1306 |
| J3 (#301) | 66 | 1333 |
| J4 (#303) | 67 | 1351 |

Drie nieuwe poorten: `lib/saldering.test.ts`, `lib/wpm.test.ts`,
`lib/solarpflicht.test.ts`. Alle drie parseren hun getallen uit
`docs/claims.md` in plaats van ze over te schrijven, en alle drie lezen de
geëxporteerde data en niet de bestandstekst — dezelfde term in een toelichting
blijft onzichtbaar, en dat is per poort met een groene mutatie bewezen.

Mutaties over de drie: negen, dertien en twaalf, elke keer de voorspelde kleur.

`tsc` 0 · i18n 730 × 4 · prijsgenerator groen · build groen ·
`CLAUDE.md` == `AGENTS.md`, op elke PR.

#### Twee dingen over het gereedschap

**MSYS `sed -i` is hier geen optie op een CRLF-bestand.** Bij J4 zette één
`sed -i` twee bestanden om van CRLF naar LF: beide kwamen op nul CRLF uit,
`docs/kanalen.md` met 202 regels en `lib/kanalen.test.ts` met 163. Een diff
van 202 regels waar er één bedoeld was. Het viel alleen op doordat ik bytes
vóór en ná mat —
`git diff --stat` had "2 files changed" gemeld en verder niets. Dit is dezelfde
familie als het `io.open(..., encoding=...)`-incident van 25 augustus, één
gereedschapslaag naar buiten: het lezen gebeurt in tekstmodus en het schrijven
normaliseert.

**Een anker dat vijftien keer voorkomt, moet luid overgeslagen worden.** Het
mutatieharnas bij J4 wilde `readingMinutes: 6` muteren; dat staat vijftien keer
in `lib/insights.ts`. Het harnas meldde `anker 15x` en sloeg over in plaats van
de eerste treffer te pakken. Een mutatie die stil de verkeerde plek raakt, leest
hetzelfde als een poort die niet afgaat.

#### Wat dit niet doet

Er is geen operator-taak mee opgelost. De Supabase-402 staat er nog — de
leadopvang schrijft dus niets weg — en de vijf Plausible-doelen,
`LEAD_NOTIFY_SECRET`, `RESEND_API_KEY`, `CAL_WEBHOOK_SECRET`, `SENTRY_DSN` en
de vier LinkedIn-beslissingen staan onveranderd open. Elk artikel van vandaag
leidt naar een formulier dat vandaag niets opvangt.

Van de kalender staan **J5, J6 en J7** nog op `klaar`. J5 (DE
Einspeisevergütung-degressie) en J6 (ES autoconsumo) zijn refreshes die eerst
bij Bundesnetzagentur en BOE nagemeten moeten worden; J7 (ETS2) is een nieuw
artikel met NEa als bron. J8, J9 en J10 staan op `wacht`, en J10 is expliciet
geblokkeerd tot de 27 intakevragen uit `docs/datastuk.md` beantwoord zijn.

**Eén waarneming over dit bestand zelf.** De koppen staan aan het eind niet
chronologisch: het blok van 2026-08-31 over de contentmachine zit vóór het
blok van 2026-08-28 over de DEUS-naamgeving. Dat is zo ontstaan doordat de
laatste toevoeging onderaan werd geplakt terwijl de vorige ertussen was gezet.
Niet rechtgetrokken — logboekgeschiedenis wordt hier niet herschreven — maar
wie hierna aanvult, plakt onderaan en niet op datum.

### 2026-09-01 — J7, en een contactadres dat op drieëndertig plekken stond

Drie PR's: #306 en #307 zetten kalenderrij J7 om, #308 verving het
contactadres. Wat ze bindt is dat in beide gevallen niet de wijziging het werk
was maar het meten eromheen — en dat in beide gevallen de meetlat als eerste
brak.

#### J7 — het enige onderwerp dat stand hield zoals het bedacht was

Bij J2, J3 en J4 sloeg het natrekken de rij om. Hier niet: de NEa-rijen in
`docs/claims.md` stonden er sinds 2026-08-23 en het artikel publiceert wat daar
geverifieerd staat. Twee van die rijen worden in het bestaande ETS2-cluster
nergens uitgesproken — dat de eerste veiling **gepland** is, en dat de eerste
inlevering pas in **2029** valt, over de emissies van 2028. Wie alleen de
samenvattingen leest houdt 2027 over als het jaar waarin er wordt afgerekend.
Dat scheelt twee jaar voorbereidingstijd.

Wat er níét in staat: geen bedrag, geen dag in januari, geen sanctie. Alle drie
staan als verbod in `claims.md`, en alle drie worden nu ook door een poort
tegengehouden.

#### Een cta-label trok bijna een ander artikel kapot

Twee cta's uit het nieuwe artikel plus een wederkerige terug vanuit het
bestaande kostprijs-artikel. Het label van die terugverwijzing noemt bewust
**geen WPM**.

`kopij()` telt het **label** van een cta mee en de **href** niet. Had er "WPM"
in gestaan, dan was het oude ETS2-artikel het WPM-cluster in getrokken — en
daar valt het om op de percentageregel, want het noemt "vijf, tien of twintig
procent". Een artikel dat niemand had aangeraakt, kapot door een linktekst.

Diezelfde asymmetrie kwam bij J4 al voor: het buurartikel draagt het woord
*Solarpflicht* zodra de kruislink erin staat, dus die clusterregel matcht op
`§ 106`. **Een cta-label is inhoud, een href niet** — en dat verschil bepaalt
welke artikelen in een cluster vallen.

#### `lib/ets2.test.ts` leidt zijn cluster af uit de inhoud, niet uit de tag

Er is een derde ETS2-artikel (`ets2-de-gasrekening-krijgt-een-component-erbij`)
onder tag *Real estate*. Een tagfilter had dat gemist. De poort test daarom
`IS_ETS2` tegen `kopij(p)`, parseert zijn jaartallen uit `claims.md` in plaats
van ze over te schrijven, en gooit als een rij niet precies één keer voorkomt.

Eén regel is één keer omgekeerd na een valse treffer op mijn eigen
samenvattingszin: "…in 2029 afgerekend, over de emissies van 2028" leest élk
jaartal. Hij eist nu positief dat 2029 genoemd wordt.

#### De probe was grover dan de poort, en meldde daarom een defect dat er niet was

De productieprobe vlagde "per liter" als overtreding. Onderzocht in plaats van
gemeld: de zin luidt *"…dus iedere tabel met eurocijfers per liter of per
kubieke meter extrapoleert een aanname"* — ontkennend, precies wat de poort
toestaat. Mijn probe gebruikte een kale substring; de poort gebruikt
`PER_EENHEID` samen met `ONTKENNING`. Hermeten met de regexes van de poort zelf,
plus zelftests: nul afwijkingen.

Een tweede vermeende afwijking — twee verwijzingen naar het nieuwe artikel in
het derde ETS2-artikel waar ik nul verwachtte — waren de automatische
"Lees verder"-blokken. Geen bewerking, en het geeft dat ctaloze artikel juist
een inkomend pad. **Mijn verwachting was fout, niet de pagina.**

#### Het contactadres: drieëndertig plekken, en geen enkele poort zag het

Juan zette het zichtbare adres om naar `info@juandiazllc.com`. Gemeten vóór er
iets veranderde: zestien in `dict.ts` (`priv.p.rights` en `impressum.p.contact`,
vier talen), drie op `/contact`, en de rest verspreid over het JSON-LD
`contactPoint`, `/llms.txt`, het commandopalet, twee formulieren en de foutgrens.

Mijn eerste telling zei 28. `grep -c` telt **regels**, en
`impressum.p.contact` draagt het adres tweemaal per regel — href plus zichtbare
tekst. Vijfde keer deze zomer dat een cijfer uit een eerste telling te laag was.

**`lib/contactadressen.test.ts` bewaakt het domein en kon dit per constructie
niet zien.** Die eist dat elk adres op juandiazllc.com staat, en `info@` en
`juan@` staan daar allebei op. Zestien waardes konden dus stil uiteenlopen
zonder één rood vinkje. De nieuwe poort bewaakt het **lokale deel** en is de
aanvulling, niet de vervanger.

#### Twee bestanden houden de literal, en dat is geen slordigheid

| bestand | waarom niet importeren |
|---|---|
| `lib/i18n/dict.ts` | `branding.ts` haalt zijn `Locale`-**type** daar vandaan. Dat is een type-import en verdwijnt bij het compileren; een waarde-import terug is een echte runtime-cyclus. |
| `app/global-error.tsx` | de kop van dat bestand eist minimale afhankelijkheden. Het is de grens die rendert als de rest stuk is, en een import erbij is een import die dán kan falen. |

`lib/contactadres.test.ts` pint die twee met een **verwacht aantal** aan
`CONTACT_EMAIL` vast. Zonder dat aantal is de pinning vacuüm: een bestand dat
zijn adres kwijtraakt zou dan gewoon slagen. Eén mutatie zet het aantal op 15 en
gaat af.

#### De bestaande poort ging af, en dat was terecht

`contactadressen.test.ts` had als positieve controle `> 20` eigen adressen. Die
telling zakte van 29 naar 20 doordat tien literals een constante werden.

De drempel is niet alleen verlaagd. **Een kaal getal als ondergrens moet je bij
elke refactor bijstellen zonder dat het iets zegt**; de controle noemt nu de
twee bestanden die het adres per constructie dragen. Dat is strenger in de
dimensie die telt — een regex die maar één bestandsvorm matcht faalt nu — en
losser in de dimensie die dreef.

#### Twaalf mutaties per PR, en één die luid oversloeg

Bij #308: tien rood op zeven verschillende asserties, twee groen als controle,
groen na herstel, nul sporen. Het paar dat telt is M10/M11 — hetzelfde oude
adres in een **toelichting** in `branding.ts`, rood met de commentaar-strip uit
en groen met hem aan. Dat is het uitvoerbare bewijs dat `zonderCommentaar`
dragend is en niet decoratief; vier eerdere tekstscans in deze repo vielen juist
om op hun eigen proza.

Eén mutatie sloeg **luid** over voordat hij landde: mijn comment-anker was een
coderegel en geen commentaarregel. Dat is de goede uitkomst — een mutatie die
stil niet landt leest exact hetzelfde als een poort die niet afgaat.

#### Wat bewust niet is omgezet

`_drafts/outreach/tier1-pitches-2026-07.md` noemt het oude adres als
**afzender**-identiteit: *"Verstuurd vanaf …, persoonlijk, geen
nieuwsbrief-tool"*. Dat omzetten zou het punt van die zin slopen. Om dezelfde
reden is `noreply@` in de dode nieuwsbriefactie vrijgesteld in plaats van
omgezet — met een vrijstelling die **haar eigen voorwaarde draagt**: nul
afnemers. Krijgt `app/actions/newsletter.ts` weer een importeur, dan is het geen
dode actie meer en valt de poort om in plaats van stil te blijven staan.

#### Twee dingen over het gereedschap

**Een recursieve `grep` vanaf `.` tikt hier zijn timeout aan.** De drie
langlopende scratch-mappen (`_3dcap/`, `diaz-editor-gtm/` met eigen
`node_modules`, `migrations-review/`) worden meegelopen. `git grep` leest alleen
getrackte bestanden en was meteen klaar. Dezelfde val als `git add -A` in deze
repo, en de reden dat elke commit hier expliciete paden staged.

**Een nieuw bestand via het Write-gereedschap komt op pure LF.** Deze repo
draagt CRLF (`* text=auto`, `core.autocrlf=true`). `lib/contactadres.test.ts`
stond op 0 CRLF en 174 kale LF; omgezet in bytes met een assertie ervoor en
erna. Verwant aan het `io.open(..., encoding=...)`-incident van 25 augustus,
maar één laag eerder: daar normaliseerde het terugschrijven, hier het
aanmaken.

#### Gemeten

Per PR gemeten, niet achteraf gereconstrueerd.

| na | bestanden | tests |
|---|---|---|
| J7 (#306) | 68 | 1376 |
| contactadres (#308) | 69 | 1382 |

De +6 bij #308 is de nieuwe poort; `contactadressen.test.ts` kreeg een
strengere assertie in een bestaande test en geen nieuwe.

`tsc` 0 · i18n 730 × 4, ongewijzigd — alleen waardes geraakt · prijsgenerator
groen · build groen · `CLAUDE.md` == `AGENTS.md` · squash-boom identiek aan de
tak-boom, op beide PR's.

Op productie ná de merge, met de uitgeleverde build eerst bevestigd — `/llms.txt`
sloeg om van het oude naar het nieuwe adres, en die overgang is zelf het
versheidsbewijs:

```
16 pagina's (contact · home · privacy · impressum × 4 talen)   afwijkingen 0
/contact, alle vier: mailto-href 2x · aria-label 1x · oud 0x
JSON-LD contactPoint, alle vier: 5 blokken, nieuw 1x, oud 0x
/llms.txt: "- Email: info@juandiazllc.com"
homepage mail-link, gerenderde tekst: 'info@juandiazllc.com'
positieve controles 4/4, waaronder 404 op een verzonnen route
```

Die voorlaatste regel is niet decoratief. `components/sections/Contact.tsx`
splitst het adres om de `@` eigen opmaak te geven, en dat deel wordt nu uit de
constante afgeleid. De probe strippt het lege HTML-commentaar dat React tussen
twee aangrenzende tekstknopen zet — zonder die strip meet je de serialisatie in
plaats van de inhoud.

#### Eén waarneming, niet gerepareerd

`contactPointSchema()` in `lib/seo/schema.ts` draagt **geen** e-mailadres,
terwijl het `contactPoint` in `app/[locale]/layout.tsx` er wel een heeft. Beide
staan als JSON-LD op `/contact`. Geen defect van deze wijziging; het viel op bij
het meten en staat hier genoteerd in plaats van stilzwijgend meegenomen.

#### Wat dit niet doet

Er is geen operator-taak mee opgelost. De Supabase-402 staat er nog, dus het
contactformulier op `/contact` schrijft niets weg — het nieuwe adres is vandaag
de enige weg die wél aankomt. Verder onveranderd open: de vijf Plausible-doelen,
`LEAD_NOTIFY_SECRET`, `RESEND_API_KEY`, `CAL_WEBHOOK_SECRET`, `SENTRY_DSN`, de
vier LinkedIn-beslissingen, en in `bongartzdiaz/diaz-editor` de PR's #647, #652,
#653, #654 en #655.

Van de kalender staan **J5, J6 en J8 t/m J10** nog open. J5 (DE
Einspeisevergütung-degressie) en J6 (ES autoconsumo) zijn refreshes die eerst
bij Bundesnetzagentur en BOE nagemeten moeten worden en blijven daarom op
`klaar`; J10 is geblokkeerd tot de 27 intakevragen uit `docs/datastuk.md`
beantwoord zijn.

### 2026-09-01 (vervolg) — GA4 achter een toestemmingspoort, en de banner die in april bewust wegging

PR #311, gemerged als `c41223d`. De aanleiding was één zin: dezelfde tag als op
diazatlas mag ook hier, ze horen bij elkaar. Het werk zat niet in de tag maar in
wat eromheen moest.

#### De banner is in april met opzet verwijderd, en die reden vervalt hier

Bundle 2 van 19 april haalde `components/CookieConsent.tsx` weg en herschreef
`priv.p.cookies` en `priv.p.analytics` in vier talen, omdat Plausible cookieloos
is en de banner daarmee juridisch theater was. Dat klopte, en het klopt niet
meer zodra GA4 erbij komt: die zet `_ga` en `_ga_<container>`, en dat is precies
wat ePrivacy 5(3) raakt.

**Alleen het ding met de cookie zit achter de poort.** Die bepaling gaat over
opslaan op of uitlezen van het apparaat, niet over "analytics" als categorie.
Plausible (cookieloos, EU-gehost) en Vercel blijven daarom ongepoortd — de
bestaande opt-out op `/privacy` staat er nog naast. Wat wél moest wijzigen is
de belofte: twee dict-sleutels beloofden in vier talen dat er geen
toestemmingsbanner is, en dat is nu onwaar.

#### Drie keuzes met een reden

**`createElement`, geen `next/script`.** De twee policies in `proxy.ts` stellen
tegengestelde eisen. De afgedwongen variant is een host-allowlist en heeft
`www.googletagmanager.com` letterlijk nodig; de strikte report-only draait op
`'strict-dynamic'` en negeert host-allowlists juist. Injectie vanuit een
Next-chunk die zijn nonce al droeg voldoet aan allebei. Met `next/script` zou de
afgedwongen policy het toelaten en de strikte erover klagen — permanente ruis in
de canary, via `/api/csp-report` door naar Sentry. **`connect-src` valt níét
onder strict-dynamic**, dus beide beacon-hosts staan in beide varianten.

**De uitschakelaar vóór het laden.** Google leest `ga-disable-<ID>` bij het
*verzenden* en niet bij het laden. Daardoor werkt intrekken terwijl het script
al draait, en dat is precies het geval dat telt — AVG art. 7 lid 3 eist dat
intrekken net zo makkelijk is als geven. Andersom zetten kon een eerste
`page_view` laten vertrekken voordat de vlag stond.

**De versie zit in de sleutel.** `jd-toestemming-v1`. `allow_google_signals` en
`allow_ad_personalization_signals` staan uit; gaan die ooit aan, dan is dat een
nieuw doel en moet `TOESTEMMING_VERSIE` omhoog. Een poort legt dat vast.

#### Twee lagen die elkaar niet overlappen

`lib/toestemming.test.ts` doet de opslagbeslissingen via module-import en de
bedrading via een tekstscan. Dat is geen dubbeling: het gevaarlijke defect zit
in de **bedrading** — een `laadGa4()` die niet meer achter zijn `=== "ja"` staat,
of een uitschakelaar die ná het laden wordt gezet — en dat is voor een import per
definitie onzichtbaar. Vandaar ook de volgorde-assertie op de posities van beide
aanroepen in de bron.

De intrekknop op `/privacy` staat in een eigen component en **raakt het script
niet aan**. Hij schrijft alleen de keuze weg; `Toestemming.tsx` luistert op
hetzelfde event. Een tweede plek die gtag aanraakt zou een tweede lijst zijn die
uit elkaar loopt, en een van de mutaties dwingt dat af.

#### Gemeten met een placeholder, en dat was niet overdreven

De eerste productiebuild had `G-JL21TDX7QB` ingebakken. Toestemming geven had
daar een levende `page_view` naar de echte property gestuurd vanaf localhost —
dus server gestopt, opnieuw gebouwd met `G-TESTONLY000`, en pas daarna gemeten.

| pad | uitkomst |
|---|---|
| vóór elke keuze | vlag staat al op `true` (fail-closed), nul gtag-scripts, nul verzoeken naar Google |
| weigeren | opslag `"nee"`, banner weg, `gtag` undefined, nog steeds nul GA-verzoeken |
| toestaan | opslag `"ja"`, vlag naar `false`, één async gtag.js, nul geblokkeerde beacons |
| intrekken | vlag terug op `true`, **zonder herlading** |
| 375 px | horizontale overloop 0, beide knoppen 162×46 (boven de 44 van WCAG 2.5.5) |
| console | nul CSP-fouten, nul hydratiewaarschuwingen — ná een hartslag door de lezer |

Twee dingen dragen het bewijs. Dat gtag.js **werkelijk uitvoerde** blijkt uit
`window.google_tag_manager["G-TESTONLY000"]` plus `gtm.dom`/`gtm.load` in de
dataLayer — die duwt gtag.js zelf, niet onze stub. En dat er bij intrekken
**geen herlading** tussen zat blijkt uit diezelfde container, die de klik
overleefde: was er herladen, dan had het effect met opslag `"nee"` gedraaid en
was gtag niet geladen, dus was de container weg geweest.

**Die laatste meting moest over.** De eerste poging klikte de anchor op
`/nl/privacy` aan, dat is een volledige page reload, en de `gaDisable: false`
die eruit kwam was gewoon herinitialisatie ná die herlading. Een meting die
niet kan onderscheiden wat hij moet onderscheiden, leest hetzelfde als een
geslaagde meting.

#### Twee mutaties waren stuk vóórdat ze iets bewezen

Twintig mutaties, twintig keer de voorspelde kleur — maar pas na reparatie van
twee die over niets maten. M18 moest de scripthost óók in de strikte tak zetten
en voegde een **ongebruikte const** toe; die raakt die tak niet. En M2 moest de
volgorde omkeren en **verwijderde** de uitschakelaar, wat een andere assertie
test dan de volgorde-assertie. Allebei zagen ze eruit als een zwakke poort.
Leg de verwachte kleur vooraf vast en verklaar elke afwijking — anders repareer
je het verkeerde ding.

#### Merge zonder de deploystatus te vertrouwen

`Vercel=success` bij de eerste peiling is precies de vorm die op 22 augustus
misleidde. Het versheidsbewijs kwam daarom uit de uitgeleverde CSP-header zelf:
`www.googletagmanager.com` in de afgedwongen `script-src` bestaat alleen in
deze commit. Gemeten op productie staat de asymmetrie er zoals bedoeld — de
scripthost in de afgedwongen policy, niet in de strikte report-only, en beide
beacon-hosts in allebei.

En de feature is dark zoals ontworpen: `class="toestemming"` komt 0× voor.
De ene treffer op het **woord** `toestemming` is de componentverwijzing in de
RSC-payload, geen gerenderde banner — toegeschreven in plaats van aangenomen.

#### Meting

```
tsc --noEmit             exit 0
vitest run               1419 tests in 70 bestanden (was 1390/69)
i18n:check               741 sleutels x 4 (was 730)
regen:pricing:check      groen
next build               exit 0
cmp CLAUDE.md AGENTS.md  byte-identiek
```

De +29 is toegeschreven: `lib/toestemming.test.ts` 25 nieuw, `proxy.test.ts` van
32 naar 36. De +11 sleutels zijn de bannerkopij plus de toestand-teksten van de
intrekknop; de twee herschreven privacy-alinea's zijn waardes en geen nieuwe
sleutels. Squash-boom byte-identiek aan die van de tak.

#### Wat dit niet doet

**De tag staat hierna nog uit**, en dat is de bedoeling tot Juan hem aanzet:
`NEXT_PUBLIC_GA4_ID` is niet gezet in Vercel. Dat zetten kan van deze machine
niet — geen CLI, en de MCP heeft geen gereedschap voor omgevingsvariabelen — en
het vergt bovendien een redeploy, want `NEXT_PUBLIC_*` wordt bij het bouwen
ingebakken. De taak staat met alle drie de stappen op de operator-lijst
bovenaan dit bestand.

Geen enkele andere operator-taak is hiermee opgelost: de Supabase-402 (dus het
contactformulier schrijft nog steeds niets weg), de zes Plausible-doelen,
`LEAD_NOTIFY_SECRET`, `RESEND_API_KEY`, `ACK_FROM`, `CAL_WEBHOOK_SECRET`,
`SENTRY_DSN` en de vier LinkedIn-beslissingen staan onveranderd open.
