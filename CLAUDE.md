# Project memory — juandiazllc.com

Next.js 16 + Supabase. **Marketingsite, meer niet.** Negen dependencies,
elf dev. Tests via Vitest: `npm test`. Typecheck: `npm run typecheck`.
Build: `npm run build`.

> ⚠️ **Het sessielogboek staat in `docs/logboek.md` en is gedateerd**: het
> beschrijft voor een groot deel het CRM dat op 2026-08-11 uit deze repo is
> verwijderd. Lees het als geschiedenis, niet als beschrijving van de huidige
> code. Wat er nu staat, staat in de secties hieronder.

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

### ~~2026-08-27 — Supabase weigert het hele datavlak~~ — gesloten 2026-09-20

**De 402 is weg.** Juan heeft de facturatie van de organisatie in orde gemaakt
(*usage billing van supabase is gewoon goed*, 2026-09-20). Gemeten diezelfde
avond met `scripts/probe-supabase-402.sh`, dat nergens naartoe schrijft:

| gemeten, 2026-09-20 | 27 aug | nu |
|---|---|---|
| slug die niet bestaat, beide projecten | 402 | **404** |
| REST `marketing.leads` met de publishable key | 402 | **401 `42501`** — gezond: schema geserveerd, `anon` mag niet lezen |
| `lead-notify` / `lead-acknowledge`, ongeldige JSON zonder header | 402 | **401 / 401** |
| de tien `diaz-*`-stubs op wbgio | 402 | **410, elk met zijn eigen slug** |
| vbozel `diaz-license-validate` | 402 | 400 `missing-license-key` |

Wat er van dat blok blijft staan, staat op zijn eigen plek: de leadketen in de
meetketen hieronder (stap 3 is dicht), de stubs in het `diaz-*`-blok, en de
Atlas-tellingen in het Atlas-blok — alle drie op 2026-09-20 hermeten. Eén lead
is er inmiddels: 2026-09-19 17:22, `contact_page:stage=survey`, Juans eigen
test, `ack_channel = 'skipped:no-api-key'` na 104 ms. De keten loopt tot aan
de Brevo-sleutel. De volledige meting staat in het logboek van 2026-09-20 (5).

De twee meetvallen uit het oude blok blijven waar: `/rest/v1/` zónder sleutel
geeft 401 en leest als gezond terwijl het dat niet bewijst — peil een echte
tabel mét de publishable key — en het managementvlak (`execute_sql`,
`deploy_edge_function`) werkt door terwijl het datavlak weigert. Zie de memory
`project_supabase_402_blokkade.md`.


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

**De 410 is op 2026-09-20 waargenomen**, zodra de 402 eraf was:
`scripts/probe-supabase-402.sh` gaf op alle tien `410` met de eigen slug in het
antwoord, `404` op de negatieve controle, en de vier blijvers antwoordden als
zichzelf (`pai-vapi-webhook` 400 `invalid json`, `pai-weekly-digest` 200,
`lead-notify` en `lead-acknowledge` 401). Tot die dag was wat er live stond
alleen teruggelezen uit de bron via het managementvlak.

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


### ~~2026-09-22 — de capaciteitspoort is verlopen~~ — gesloten dezelfde dag

De poort stond op `LAST_VERIFIED = "2026-08-23"` en was die ochtend verlopen
(30,4 dagen), waardoor `npm test` op `main` en op elke PR faalde. **Gesloten met
#406 (`a3d703c`): Juan bevestigde "3 vrij", dus `SLOTS_REMAINING` bleef 3 en
`LAST_VERIFIED` ging naar `2026-09-22`.** Gemeten op 2026-09-22: beide poorten
groen (19 tests), de datum is nul dagen oud en het venster loopt tot
**2026-10-22**.

Dit blok bleef staan nadat het al gesloten was, en dat is precies het risico dat
bovenaan deze lijst beschreven staat — de operator leest de bovenste regel en
handelt ernaar. De poort zelf is ongewijzigd: hij vraagt één ding, namelijk of
"3 van 3 vrij" nog tegen de agenda klopt. Een datum bijwerken zónder dat
antwoord is exact de fout die hij moet vangen; dat staat ook in de toelichting
bij `LAST_VERIFIED` zelf.

### 2026-09-22 — GEO: het product was onvindbaar; twee PR's, één hermeting

Citatie-nulmeting in `docs/geo-citatie-nulmeting.md` (tien vaste vragen,
Perplexity zonder login): **2 van 10 geciteerd, precies de twee
entiteitsvragen.** "What is DEUS CRM by Juan Diaz LLC and what does it cost
per seat?" gaf *"I can't find any reliable information"*. Daaruit #403
(`/pricing.md`) en #404 (definitiezin als eerste alinea op `/pricing`).

- ~~**Mergen: #403 en #404.**~~ **Allebei gemerged op 2026-09-22**, `5a16e13`
  (10:38 UTC) en `c135a8b` (10:40 UTC).
- **Hermeting van de tien vragen in de eerste week van december 2026**,
  dezelfde vragen, dezelfde notatie. Niet eerder: een week na een
  herindexering zegt niets.
- ChatGPT, Claude en AI Overview zijn niet gemeten (login). Wil je die
  kolommen, dan zijn het dezelfde tien vragen; het document zegt hoe.

### 2026-09-22 — backlinks: acht eigen domeinen, nul links

`docs/backlink-strategie.md` + `scripts/backlink-inventory.sh` (alleen GET).
Geen extern nulpunt: Ahrefs "Insufficient plan" ook op het gratis
DR-endpoint, Search Console niet geverifieerd. Wat wél gemeten is: **geen
van Juans acht sites linkt naar juandiazllc.com**; twee noemen hem zonder
link. De twee stappen die vandaag iets meetbaars veranderen, samen vijf
minuten:

- **`lucenai.eu/about`**: de naam "Juan Stefan Bongartz Diaz" (6× op de
  pagina) linken naar `https://juandiazllc.com/en/about`. Stond al als stap 4
  in `docs/lucenai-backlinks.md`. **Juan meldde dit gezet op 2026-09-22; de
  gerenderde pagina draagt de link niet**, ook niet bij een verzoek dat de
  LiteSpeed-cache mist. Publiceren, cache legen, dan
  `bash scripts/backlink-inventory.sh`.
  **Hermeten 2026-09-22 om 14:14 UTC: nog steeds nul.** De pagina geeft 200 en
  draagt **0** links naar `juandiazllc.com`. Let op de positieve controle: het
  woord "Juan" staat er nu **3×** tegen 5× op 26 augustus, dus de pagina is
  wél gewijzigd — alleen niet met de link erin. Dit is dus geen cache die
  achterloopt maar een publicatie die de link niet draagt.
- ~~**`diazatlas.com/about`**~~ **gesloten 2026-09-22**: `diaz-editor#687`
  gemerged (`8de26388`) en live. De vier about-pagina's linken "Juan Diaz LLC"
  naar `juandiazllc.com/<taal>/about` en dragen `founder.sameAs`; gemeten met
  `scripts/backlink-inventory.sh` (0 → 2). **De eerste backlink ooit.** De
  sitebrede voet in `_compliance.js` blijft bewust zonder link.
- ~~Daarna, per site één redactionele plek op de overige eigen domeinen.~~
  **Vervallen 2026-09-22 — Juan: "only juandiazllc and diazatlas.com".**
  `salderingsregeling2027.nl`, `besparenbelgie.online`, `voltafy.nl`,
  `performancetracker.nl` en `helpmijbesparen.nl` vallen buiten scope; stel ze
  niet opnieuw voor. Wat blijft is het paar, en dat staat: **`#409` gemerged
  (`64360c2`)**, dus `/about` linkt in vier talen naar Diaz Atlas en het
  Organization-schema draagt `brand` met `diazatlas.com#organization`. Gemeten
  op productie: diazatlas→jdllc 2×, jdllc→diazatlas 6× per taal, negatieve
  controle schoon.
- Search Console verifiëren (TXT staat er) — zonder Links-rapport is er geen
  scorebord voor wat niet van Juan is.

### 2026-09-21 — alle funnels gemeten: opvang werkt, opvolging niet

Gemeten 13:27 UTC zonder bijwerking (logboek 2026-09-21 (5)). Elke funnel
schrijft zijn rij weg (RLS-insert-policies op `marketing.leads` en
`marketing.subscribers` staan goed) en `lead-notify` geeft een Telegram.
Wat de lead terugkrijgt is nergens iets. Drie knoppen, in deze volgorde:

| knop | wat het aanzet | stand |
|---|---|---|
| **Brevo SMTP-activatie** (bij Brevo, stap 4 hieronder) | contact-, scan- en ROI-bevestiging, nieuwsbrief-opt-in, scan-reeks | 403, geparkeerd |
| **`CAL_WEBHOOK_SECRET`** in Vercel-productie (stap 5) | boeking → rij → Telegram; de hoofd-CTA meet nu niets | **gezet door Juan op 2026-09-21 ná de build van 13:31 UTC** (`dpl_M57r24Xy…`, #394). Gemeten 13:34 en 13:35: nog 503, en dat is verwacht — Vercel bakt env-vars in bij de build. Build `dpl_4gsmznm5…` (#395, 13:38) zei zelf `[cal] CAL_WEBHOOK_SECRET niet gezet`: **de variabele stond op Preview, niet Production**. Op Production gezet, build `dpl_993vKG9W…` (#396, 13:50) zei wéér `niet gezet`: **de waarde was leeg**. Waarde gezet ~14:0x; derde build `dpl_SvWFmquu…` (#397, 14:02) zei wéér `niet gezet`. Via het browserpaneel gemeten op het account `bongartzdiaz@gmail.com` (team `bongartzdiaz-2377s-projects`, het project met het domein): 12 variabelen, geen van de vier, op geen van de drie projecten. Juan: *ingesteld en werkt* — vierde build `dpl_4wtB7cDh…` (#398, 15:25) op zijn woord; **15:33:52 UTC: 503**. Vier builds, vier keer 503; oorzaak buiten de repo. **Dit is de enige stap die de boeking-CTA laat meten.** **Geparkeerd 2026-09-21 18:1x UTC** (logboek 8) na nog drie keer "gezet" zonder dat de API iets zag. Hervatten: URL van de pagina waar de vier gezet worden vergelijken met `bongartzdiaz-2377s-projects/juandiazllc-com`, dan één build en meten |
| **Cron nakijken** in Vercel → Settings → Cron Jobs, plus `BREVO_API_KEY`, `CAMPAGNE_FROM`, `SUPABASE_SECRET_KEY` | scan-reeks en ROI-mail | `CRON_SECRET` stáát (route geeft 401, geen 503 meer); de andere drie zijn van buiten niet te zien en het MCP-token mag env-vars niet lezen (403). **Cron staat aan** (`disabledAt` null, definitie in de live deployment, gemeten 2026-09-21 15:4x via de API); afgaan pas bewijsbaar met de variabelen én een subscriber — logboek (7) |

Cijfers: 1 lead ooit (Juans test), 0 subscribers ooit. Of dat geen verkeer
of geen conversie is, beslissen de Plausible-doelen van stap 1.

### De meetketen — in blokkerende volgorde

1. **Acht Plausible-doelen aanmaken** in het dashboard: `Boeking 15min`,
   `Pricing CTA`, `Sector CTA`, `Tool CTA`, `Contact Submitted`,
   `Scan Voltooid`, `Uitslag Aangevraagd` en `Berekening Aangevraagd`
   (2026-09-20, de ROI-opvang), plus de vier custom properties (`tier`,
   `sector`, `tool`, `lekken`). Taggen is af en op productie
   geverifieerd; zonder de doelen worden de kliks binnengehaald en weggegooid.
   **`Contact Submitted` stond tot 2026-08-24 op geen enkele lijst**, en het is
   het enige doel dat een conversie meet in plaats van een klik — precies het
   cijfer dat stap 2 hieronder moet beantwoorden. Exacte namen en de meting
   staan in `MANUAL_TASKS.md`; `lib/plausible-doelen.test.ts` houdt de lijst
   voortaan gelijk aan de code.
2. **Plausible-cijfer**: bezoekers over 30 dagen. Zonder dat blijft "0 rijen in
   `marketing.leads`" onbeslist tussen geen-verkeer en geen-conversie, en die
   vraag ligt onder alle andere.
3. ~~**`LEAD_NOTIFY_SECRET`** in Supabase → Edge Functions → Secrets, met dezelfde
   waarde als `lead_notify_secret` in Database → Vault.~~ **Sinds 2026-09-20
   geen dashboardstap meer.** `lead-notify` en `lead-acknowledge` lezen
   `lead_notify_secret` zelf uit Vault via `public.geheim_uit_vault()` —
   SECURITY DEFINER, EXECUTE alleen voor `service_role` (migratie
   `20260920150000`, helper `supabase/functions/_shared/geheim.ts`). Een
   env-var wint nog als hij staat, maar er hoeft er geen te staan.
   **Gemeten 2026-09-20 avond: de env-var stáát.** De live `lead-notify` v6 en
   `lead-acknowledge` v3 kennen geen Vault en geven allebei 401 op ongeldige
   JSON zonder header — dat kan alleen uit `LEAD_NOTIFY_SECRET`. **Deze stap
   is dicht.** De migratie staat op wbgio. ~~Wat nog open is, is de uitrol van
   beide functies via de Supabase-MCP in een verse sessie met alleen Supabase
   aan (geen PAT, geen CLI — beslist 2026-09-20).~~ **Uitgerold op
   2026-09-21**, vanaf `b0e868a`, via `deploy_edge_function` met de volledige
   bestandslijst (`index.ts`, `auth.ts`, `../_shared/{brevo,geheim,huisstijl}.ts`):
   `lead-acknowledge` v7 sha `f1e1c6be…2897c3` (10:42:25 UTC),
   `lead-notify` v9 sha `c9e96ba8…f6f34d` (10:44:36 UTC). Inhoud
   teruggelezen met `get_edge_function` (`SCAN_BRON`, `_shared/geheim.ts` in
   de bundel), daarna de probe: ongeldige JSON zonder header geeft op beide
   **401**, met 404 op een verzonnen slug als negatieve controle. 401 en geen
   503 betekent: `geheim()` had een bruikbare sleutel — uit de env-var, want
   die wint; de Vault-tak is pas bewezen als de env-var ooit weggaat. Die
   vault-sleutel staat er sinds 2026-08-16 16:22:38 UTC (44 tekens). Wat er
   hier eerder stond, "v6 en v3", waren stempels van vóór de secret-wijzigingen
   die elke versie ophogen; vlak vóór de uitrol stonden ze op v8 en v6.
   **Stap 3 is dicht, in code én in de uitrol. Vóór stap 4.**

   Voor `lead-acknowledge` is die volgorde op 2026-08-26 bewust omgedraaid:
   de fail-closed code van 25 augustus is uitgerold (v3) terwijl de sleutel
   nog niet stond. **Die functie weigert nu alles**, de trigger inbegrepen.
   Gemeten direct na de uitrol sloeg een POST met ongeldige JSON en zonder
   auth-header om van `400 invalid-json` naar `503 not-configured`, met 404
   op een niet-bestaande slug als negatieve controle en `lead-notify`
   onveranderd op 400.
   Vandaag kost dat niets (nul leads ooit, geen Brevo-sleutel). Wat het
   verandert: waar de functie eerst `ack_channel = 'skipped:no-api-key'`
   wegschreef, schrijft hij nu niets en houdt `net._http_response` een 503
   vast. Deze stap is daarmee geen opruimwerk meer maar de knop die de
   bevestigingsketen aanzet — en hij sluit `lead-notify` in
   dezelfde handeling, want beide lezen dezelfde sleutel.
4. ~~**`brevo_api_key` in Vault** (SQL-editor: `select vault.create_secret('<sleutel>', 'brevo_api_key')`, dezelfde route als stap 3) **+ `ACK_FROM` + `NOTIFY_FROM`** als Edge-Function-secrets, op een in Brevo geauthenticeerd domein~~ (Resend is sinds 2026-09-20 uit de code; zie `MANUAL_TASKS.md`, bovenste blok). Zonder die twee
   gaat er bij een echte lead geen enkele mail de deur uit — gemeten, niet
   vermoed. Pas ná stap 3, anders geef je een publiek aanroepbaar endpoint een
   mailkanaal op je eigen domein.
   **Aan onze kant dicht op 2026-09-21, en de stap was te klein
   opgeschreven.** Gemeten met de echte rij (Juans test van 19 september)
   door `lead-acknowledge` v7, via `net.http_post` vanuit Postgres zoals de
   trigger het doet: `brevo_api_key` stond in Vault (10:23 UTC, 89 tekens,
   `xkeysib-`-vorm, leesbaar via `geheim_uit_vault`, EXECUTE alleen
   postgres + service_role), `ACK_FROM` stáát (anders `skipped:no-from-address`).
   Daarna weigerde **Brevo** drie keer op rij, elk om een andere reden die
   niet in de repo zichtbaar is: (a) IP-allowlist op de **sleutel** én op het
   **account** — Supabase heeft geen vaste IP's, beide moesten uit; (b) het
   domein was nooit geauthenticeerd — `juandiazllc.com` staat sinds 11:2x UTC
   op *Authenticated* met Brevo-code-TXT, twee DKIM-CNAME's
   (`brevo1/2._domainkey`) en `_dmarc` `p=none` in Namecheap; (c) **het
   SMTP-account is niet geactiveerd**: `403 permission_denied — Your SMTP
   account is not yet activated. Please contact us at contact@brevo.com`.
   Dat laatste is een handmatige vrijgave door Brevo. **Dit is de enige
   resterende blokkade**, en hij is niet van ons. Zodra Brevo activeert:
   dezelfde POST opnieuw (rij `0c2e53dc…`, `acknowledged_at` nog leeg, dus
   geen idempotentie-blokkade) en het antwoord moet `sent:true,
   channel:email` zijn. `ack_channel` op die rij draagt nu `failed:http-403`.
   Logboek 2026-09-21 (2). **Hermeten 11:38 UTC na Juans "activatie is
   binnen": nog steeds dezelfde 403.** Wat Brevo vrijgaf was de
   accountvalidatie; de SMTP/transactional-activatie is een tweede,
   handmatige vrijgave die het dashboard nergens toont (de
   Transactional-wizard kent alleen *Configuration* en *Verification*).
   Juan heeft `contact@brevo.com` op 2026-09-21 expliciet om
   *transactional email sending (SMTP/API)* gevraagd, met de 403-tekst
   erbij. **Wacht op Brevo's antwoord; meet daarna de API, niet het
   dashboard.** Logboek 2026-09-21 (3). **Geparkeerd 2026-09-21 13:00 UTC.**
   Brevo bevestigde drie keer ("gevalideerd", "gevalideerd", "SMTP
   geactiveerd"); de API gaf om 11:58, 12:22, 12:25 en 12:55 UTC telkens
   dezelfde 403. Dertig minuten na de laatste bevestiging ook, dus geen
   propagatie. De sleutel hoort bij `organization_id 6a1841a36b61a0b9a405832a`,
   `user_id 11325829` — pin dat in de volgende mail, want support kan een
   andere organisatie hebben geactiveerd. Uitweg als het blijft hangen:
   nieuw Brevo-account op `juan@juandiazllc.com` (de vier DNS-records
   blijven geldig) met een nieuwe sleutel via `vault.update_secret`. Hervatten:
   eerst `/v3/smtp/email` vanuit Postgres, bij 201 de POST op rij
   `0c2e53dc…`. Logboek 2026-09-21 (4).
5. **`CAL_WEBHOOK_SECRET` in Vercel-productie**, en daarna nakijken of cal.com de
   webhook werkelijk aanroept. Gemeten 2026-08-24: `POST /api/cal` antwoordt
   `{"ok":false,"error":"not-configured"}`. Zolang dat zo is levert een boeking
   geen rij op, dus geen Telegram en geen bevestiging — terwijl "Boeking 15min"
   de hoofd-CTA van de site is.

### Diaz Atlas — de betaalketen is nooit gelopen

**Eén echte aankoop van €197 op diazatlas.com, met een echte kaart, tot en met
de sleutel in de inbox.** Geen blokkade: dit is jouw handeling, en hij is de
enige stap in dat dossier die vandaag kan.

Waarom hij bovenaan staat. Er zijn **25 checkout-sessies en nul betaald, ooit**
(gemeten 2026-08-25 op `vbozelswveaxsyccvaac`: 19 verlopen, 6 open, alle 25
`unpaid`), en alle bestaande licenties zijn met de hand uitgegeven — nul
`stacked_codes`, nul die AppSumo of Lemon noemen, nul met een
Stripe-payment-intent. Geen enkele provider heeft dus ooit een licentie laten
uitgeven. Dat maakt de keten van kassa tot sleutel **onbewezen**, niet kapot;
het verschil daartussen is één transactie.

Wat het afsluit: elke euro die daarna in distributie gaat, loopt door precies
die keten. Verkeer sturen naar een kassa die je nooit hebt zien werken is de
duurste volgorde die er is.

De drie stappen erná — ondertekenen, het EULA-forum, en pas dan distributie —
staan met hun eigen blokkade in `docs/diaz-atlas-volgorde.md`, bewaakt door
`lib/diaz-atlas.test.ts`. Ze staan **bewust niet hier**: twee lijsten die één
volgorde dragen lopen uit elkaar, en dan bewaakt de zwakste.

**Hermeten op 2026-09-20, nadat de 402 eraf was.** `diaz_editor.checkout_session`
op vbozel telt **11 rijen, alle `expired`**, laatste 2026-08-22 12:53 UTC,
**nul sinds 25 augustus**. Licenties: nog steeds 6, laatste 2026-05-22, nul met
een Stripe-payment-intent. Er is dus niets bij gekomen en niets veranderd. Let
op: de "25 sessies, 19 verlopen, 6 open" hierboven zijn Stripe-statussen
(`unpaid`/`expired`) en komen van de Stripe-kant; de tabel draagt er 11. Welke
van de twee de andere mist is niet uitgezocht — het antwoord op de vraag die
hier stond is hoe dan ook *nee*.

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

- **Vier variabelen voor de drie scan-mails** (toegevoegd 2026-09-19): `CRON_SECRET`, `BREVO_API_KEY`, `CAMPAGNE_FROM`, `SUPABASE_SECRET_KEY` in
  Vercel-productie. Volledige uitleg, probe en controlequery in
  `MANUAL_TASKS.md`. Sinds 2026-09-20 ook de enige blokkade voor de ROI-mail
  van #378 (`source=energy-roi`, zelfde cron).
  **Er staat er inmiddels één.** Deze regel zei dat de route 503
  `not-configured` geeft zolang alle vier ontbreken; gemeten op 2026-09-22 om
  14:14 UTC geeft `GET /api/campagne/scan-reeks` **401 `unauthorized`**, en dat
  kan alleen als `CRON_SECRET` gezet is. De funnel-tabel van 2026-09-21 zei dat
  al; deze regel liep erachteraan. De andere drie zijn van buitenaf niet te
  zien — 401 bewijst de sleutel, niet de mailconfiguratie.
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
- **`pai-weekly-digest` op wbgio antwoordt 200 op een POST zonder enige
  header** (`{"ok":true,"calls":0,"email_sent":false}`, gemeten 2026-09-20 door
  de 402-probe, die hem alleen als "geen 410"-controle aanroept). Er ging niets
  uit omdat er nul calls waren, maar de functie liep wél. Of hij een
  cron-secret hoort te eisen (Vault draagt `pai_cron_secret`) is niet
  uitgezocht; noteer het vóór de probe hem nog eens aanroept met data erachter.
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

### Zoekwoorden — vijf beslissingen uit de meting van 2026-09-22

De volledige meting staat in `docs/keyword-doelen.md`. Eén titel is die dag
veranderd (de NL-rekenmachine, bewaakt door `lib/zoekwoorden.test.ts`); deze
vijf zijn bewust blijven liggen omdat ze een keuze vragen of in een andere
repo horen.

- **GDPR of AVG in de Nederlandse kopij.** `/nl/pricing` heet "Prijzen — DEUS
  CRM, EU-gehost, GDPR-klaar". De Nederlandse wet heet de AVG, en dat is wat
  een Nederlandse inkoper intikt; de Duitse pagina gebruikt DSGVO wél als
  eigen term. Het is geen string maar een keuze die door de hele NL-kopij,
  de juridische pagina's en `/pricing.md` loopt.
- **Drie eigen pagina's op "salderingsregeling 2027".** Het exact-match-domein
  `salderingsregeling2027.nl`, de portfoliopagina `/nl/work/
  salderingsregeling-2027` en de rekenmachine. De rekenmachine is
  gedifferentieerd ("berekenen"); de eerste twee dragen bijna dezelfde titel.
  Hertitelen maakt één pagina bewust zwakker op die term — alleen verstandig
  als je weet welke van de twee vandaag gevonden wordt, en dat vergt de
  Search-Console-verificatie die hierboven al openstaat.
- **`performancetracker.nl` en de portfoliopagina beschrijven verschillende
  producten.** Het domein zegt "Team prestaties, real-time inzicht"; de
  portfoliopagina hier zegt "Live opbrengst, verliesanalyse … voor
  zonne-eigenaren en installateurs". Geen zoekwoordkwestie maar een claim die
  niet klopt. Welke van de twee waar is, is niet van buitenaf te zien, en een
  gok invullen is precies wat `docs/claims.md` moet voorkomen.
- **`diazatlas.com` heeft geen prijspagina.** `/pricing` geeft **307** naar
  `/#pricing` (regel in `landing/vercel.json:121`); `/nl/pricing`,
  `/de/pricing` en `/features` geven 404. Er is dus geen URL die op een
  prijsvraag kan staan, voor een product waarvan "geen abonnement" het hele
  argument is. Werk in `bongartzdiaz/diaz-editor`; de drie 404's en de 307
  zijn hermeten op **2026-09-23** en staan er nog.

  **De titelklacht die hier stond, is vervallen.** Er stond dat drie van de
  vier homepagetitels over 60 tekens lopen en dat de Duitse daardoor precies
  "€197 Lebenslang" verliest. Dat is op 2026-09-22 gerepareerd en bewaakt:
  `scripts/verify-titel-zoekwoorden.mjs` in diaz-editor toetst het formaat uit
  `docs/SEO-STANDARDS.md` regel 5 en geeft 31 PASS, 0 FAIL. Gemeten op
  productie, 2026-09-23: **en 57, nl 58, de 50, es 59 tekens** — alle vier
  binnen de grens, en de Duitse draagt de prijs gewoon ("CAD einmalig kaufen ·
  €197, kein Abo · Diaz Editor").

  **Let op bij het nameten: tel tekens, geen bytes.** `${#t}` in bash telt
  UTF-8-bytes, en elke `·` kost er één extra, elke `€` twee. Dat is precies
  +4 per titel, waardoor alle vier te lang lijken en drie van de vier over de
  grens. En volg de redirect: `https://diazatlas.com/nl/` geeft 308, dus zonder
  `-L` lees je een lege body en een titel van nul tekens. Beide fouten zijn op
  2026-09-23 gemaakt, achter elkaar, op deze regel.
- ~~**`besparenbelgie.online` heet "Besparen Belgie".**~~ **Buiten scope sinds
  2026-09-22**; de meting blijft in `docs/keyword-doelen.md` §5 staan.

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
- ~~**In `bongartzdiaz/diaz-editor` staat nog één PR open: #639.** Die is niet
  door mergen te sluiten — mergen publiceert een leeg rapport.~~ **Gemerged op
  2026-09-22 (`aec3ea7c3`); er staat daar nu niets meer open. En die
  waarschuwing was fout.**

  Hij is gelezen vanaf de PR-titel, niet vanaf de diff, en twee keer herhaald
  voordat het bestand openging. Wat #639 toevoegt is **één markdown-bestand**,
  `reports/weekly-traffic/2026-W34.md`. Dat staat **buiten `landing/`** en wordt
  dus niet geserveerd — de URL geeft 404 — en `reports/` droeg al `weekly-seo`
  en `weekly-sales`. Er wordt niets gepubliceerd. Het is een intern logboek van
  een geblokkeerde run dat eerlijk *data pending* meldt, en dat is de
  real-stats-only-regel die wérkt, niet een overtreding ervan.

  Wat hij wél meebracht: 312 indexeerbare URL's in `landing/sitemap.xml`, het
  ruime crawl-beleid in `robots.txt`, en een correctie op een eerdere aanname —
  *"site = 0 organic by design"* gold alleen voor de bewust-noindex `/cad`-
  pagina's, niet voor de marketing-surface.

  **En hij wijst naar iets dat al op deze lijst staat.** #639 noemt **Search
  Console als prioriteit 1**, omdat GSC de enige organic-bron is die
  consent-vrij meet; GA4 en Vercel Insights ondertellen structureel door de
  EU/UK/CA default-deny. Onder *SEO-instrumenten* hieronder staat het
  TXT-record al als geplaatst met alleen de verificatie open. Dat is dus
  dezelfde knop als waar het weekrapport op wacht.

  **Zeven andere zijn gesloten, vijf daarvan op 2026-09-22.** #652 (`fa86f410`),
  #654 (`c843db65`) en #655 (`77a25563`) waren al op 2026-09-04 gemerged — de
  lijst zei tot 22 september dat ze wachtten. Op 2026-09-22 kwamen erbij:
  **#624** (`540b3e1b`), **#656** (`2367aff7d`), **#653** (`a9195a7d7`) en **#639** (`aec3ea7c3`).

  | PR | wat het droeg | wat er bij het mergen bovenkwam |
  |---|---|---|
  | #624 | accenten op twee Spaanse pillars | de **uren-rekensom liep een prijswijziging achter, in drie talen** |
  | #656 | acht GitHub-Action-majors | CI draait daar niet, dus het groene vinkje bewees niets — de vijf gepinde SHA's zijn tegen de upstream-tags nagemeten |
  | #653 | DXF-help EN + NL | de **Engelse** pagina droeg een Nederlandse CTA en linkte naar `/nl/pillar/` |

  **De vondst onder #624 is de belangrijkste van de drie.** De herijking van
  2026-08-22 bracht twintig bestanden op één AutoCAD-prijs en
  `verify-concurrentprijzen.mjs` bewaakt dat sindsdien — maar drie pillars
  rekenen die prijs óók om naar werkuren, en die afgeleide bleef op de oude
  prijs staan: ES 43 i.p.v. 48 (= 1.715/40), NL 31 en 30 i.p.v. 35, DE 30
  i.p.v. 32. Telkens in de og:description en de eerste alinea, terwijl de tabel
  en het FAQ-schema op diezelfde pagina het juiste getal droegen. **Een
  bewaakte invoer zegt niets over een onbewaakte uitkomst.** Gesloten met
  `verify-uren-rekensom.mjs`, die de uitkomst uit prijs ÷ tarief afleidt in
  plaats van een getal vast te pinnen; tien mutaties, waarvan er twee een fout
  in die poort zelf aanwezen. Alle drie gemeten op productie, met negatieve
  controles.

  **Over mergen in die repo.** De vuistregel is dat een sessie daar niet uit
  zichzelf merget; een expliciete opdracht van jou gaat erboven, en dat is op
  2026-09-22 drie keer gebeurd. De regel is dus geen weigering — hij bepaalt
  alleen wie begint.
- **De `supabase`-CLI op deze machine is ingelogd als
  `roy.raainvestments@gmail.com`.** Gemeten op 2026-08-26 via `supabase projects
  list`: zestien projecten over vijf organisaties, en **noch `vbozelswveaxsyccvaac`
  noch `wbgiouuifqhasedncysw` zit ertussen**. Vandaar dat een uitrol via de CLI
  faalt met 403 *"account does not have the necessary privileges"* — dat is geen
  defect maar een verkeerd account. De MCP-verbinding heeft die rechten wél, dus
  uitrollen kan daarlangs. Wil je het zelf via de CLI doen, dan moet je eerst als
  jezelf inloggen, en dat **vervangt Roy's opgeslagen token** op deze machine.

### 2026-09-22 — HMB- en Voltafy-resultaten als casestudy: één cijfer kan, en er ligt een blokkade onder het tweede

Juan: *je kan resultaten van HMB, Voltafy, SEO en ads ook gebruiken als
casestudy's voor juandiazllc*. Dat is een beslissing, en hij is genoteerd in
`docs/claims.md`. Wat hem tegenhoudt is dat de cijfers hier niet bestaan.

**Eén onderscheid dat vooraf vastligt, want het is niet terug te draaien zodra
het gepubliceerd staat.** Voltafy en Help Mij Besparen zijn **eigen ventures**,
geen klanten — zo staan ze ook in `docs/claims.md` ("Ventures named as live").
De vier bestaande uitkomsten op de homepage zijn wél klantresultaten, bewust
geanonimiseerd. Die twee soorten mogen niet door elkaar lopen: een
eigen-venture-resultaat dat als klantresultaat leest, suggereert klanten die er
niet zijn, en dat is precies wat regel 1 van `claims.md` moet voorkomen. Een
casestudy over een eigen venture is sterk genoeg op eigen benen — "dit bouwde
en draaide ik zelf" is een andere claim dan "dit deed ik voor een klant", niet
een zwakkere.

**Diaz Editor hoort er sinds 2026-09-22 ook bij** (*"the case studies that
were made from diaz editor are also good"*), en daar zit een harde grens aan:
**dat product heeft nooit een betalende externe klant gehad** — nul betalingen
ooit, 25 checkout-sessies waarvan geen enkele betaald, zes handmatig
uitgegeven licenties. Niets mag dus klantadoptie of omzet suggereren.

**En er is een open vraag die een sessie niet kan beslissen.** Er bestaat een
template voor klantcasestudy's (`CASE-STUDY-TEMPLATE-2026-05-25.md`) en
`landing/case-studies/` is **leeg, nul bestanden**. Wat er wél ligt is
uitgewerkt werk dát met de editor is gemaakt — het plan voor een woning van
300 m² in Colombia: NSR-10-onderzoek, memoria, bestek, fasering, Scene JSON,
DXF, 23 bestanden. Dat is een **capaciteitsdemonstratie, geen klantresultaat**,
en als zodanig sterker materiaal voor deze site. **Welke van de twee bedoel
je?** Zonder dat antwoord wordt er geen kopij geschreven.

**Wat er per casestudy nodig is voordat er één regel kopij geschreven wordt.**
Zonder deze vijf is het een verzonnen getal, en verzonnen getallen zijn precies
waarvoor dit dossier bestaat:

1. **het cijfer zelf** en waar het vandaan komt (Search Console, Plausible,
   GA4, de advertentiebeheerder, een Supabase-query);
2. **de meetperiode**, begin- en einddatum;
3. **het nulpunt** — waartegen is het een verbetering;
4. **wat er precies is gedaan** in die periode, want zonder ingreep is het
   geen casestudy maar een grafiek;
5. **eigen venture of klant**, expliciet.

**Wat er daarna gebeurt.** De rij `Revenue figures, testimonials, named
customers, customer counts | ❌ none exist` in `docs/claims.md` moet dan
bijgesteld worden, en `components/sections/ResultsStrip.test.ts` bewaakt al dat
een gepubliceerd getal in dat bestand staat. Die poort wordt hier dus niet
opnieuw gebouwd — hij dekt dit al, zolang de cijfers erin komen te staan.

**De cijfers zijn gezocht en deels gevonden — in jouw eigen vaults.** Juan:
*all numbers and data is saved in my files and obsidian brain, you can look it
up*. Dat klopte. Alle drie de vaults zijn doorzocht (`Mr Diaz`,
`Mr Diaz - HMB`, `Mr Diaz - PerformanceTracker`, samen 782 notities); de
volledige uitkomst met bronverwijzingen staat in `docs/claims.md`. In het kort:

- **Eén meting heeft de vorm van een casestudy.** HMB Meta-advertenties, week 28
  tegen week 29 juli 2026: de uitgaven bijna verdubbeld (+91,1%) terwijl de
  **kosten per registratie 22,6% zakten** (€ 8,91 → € 6,90). Nulpunt, ingreep en
  bron staan er allemaal bij.
- **Publiceer daarvan de ratio, niet het volume.** Week 29 telt zes dagen tegen
  zeven, dus "+97,5% leads" en "+166,7% afspraken" vergelijken ongelijke
  perioden. Het rapport zegt dat zelf. En het waren voorlopige cijfers: peildatum
  18 juli, en het aangekondigde definitieve rapport is er nooit gekomen.
- **Voltafy levert geen resultaatcijfer maar een diagnose.** Je nam het
  skalo-netwerk op 10 augustus over; de richting sindsdien is omlaag. Wat er wél
  ligt is een sterke audit — SERP-onderzoek dat stil faalde sinds 24 april, ruim
  5.000 artikelen die daardoor blind zijn geschreven, 628 kannibaliserende
  slug-paren. Dat is *"dit vond ik"*, niet *"dit verbeterde ik"*. Verkoopbaar,
  maar als een ander soort claim.

**Twee dingen die jij moet beslissen, en één die eerst moet.**

1. ~~⚠️ **Eerst dit: pas de over-ons-pagina's op skalo aan.**~~ **Buiten scope
   sinds 2026-09-22** — zie het scope-blok hieronder. De meting blijft staan
   omdat hij de casestudy-vraag raakt: op **40 van de 55 sites** staat dat de
   redactie systemen koopt of leent en onafhankelijk test, op 53 dat ze uit
   energietechnici en journalisten bestaat, op **nul** dat er met AI wordt
   geschreven, en de claim staat ook machineleesbaar in de JSON-LD.
   **De afweging verschuift daarmee naar de kopij hier:** een casestudy op
   juandiazllc.com die naar dat netwerk verwijst, trekt aandacht naar een
   claim die op veertig domeinen niet klopt. Dat is nu een reden om in de
   kopij niet naar skalo te wijzen, niet een reden om daar te gaan werken.
2. **Wil je de HMB-advertentieweek gepubliceerd hebben met de voorbehouden
   erbij, of wacht je op een tweede meetpunt?** Twee weken zijn geen trend, en
   het cijfer is voorlopig. Met de voorbehouden erbij is het eerlijk en dun; een
   derde week maakt het sterk.
3. ~~**Wordt de skalo-diagnose een casestudy?**~~ **Beantwoord op 2026-09-22:**
   *"case studies so work I did with results we got"*. Werk én resultaat, dus
   nog niet — de diagnose heeft het eerste en niet het tweede. Zie het blok
   hieronder.

Zie [[feedback_welk_document_liegt]]: toen stonden er vier echte klantcijfers op
de site die in `claims.md` ontbraken, en ik haalde ze weg in plaats van te
vragen. Daarom deze keer eerst zoeken, dan vragen, en pas dan schrijven.

### 2026-09-22 — accountscope: alleen bongartzdiaz

Juan: *"op dit claude account alleen bongartzdiaz doen juandiazllc en diazatlas
deus — tenzij ik anders zeg."*

**Binnen scope:** `bongartzdiaz/juandiazllc.com`, `bongartzdiaz/diaz-editor`
(= diazatlas.com) en `bongartzdiaz/DEUS-SHARED`.

**Buiten scope:** `mistersocial99/skalo-seo` en de 55 skalo-sites, plus
Voltafy, Help Mij Besparen, Performance Tracker, BesparenBE en
salderingsregeling2027. Niet uit zichzelf oppakken en niet voorstellen.

**Wat dat betekent voor de casestudy's.** juandiazllc.com is Juans **eigen**
casestudy: *"die resultaten waren bedoeld voor juandiazllc als werkresultaten"*.
Cijfers uit HMB, Voltafy of skalo blijven dus bruikbaar als **materiaal** voor
de kopij hier — ze staan met bron en voorbehoud in `docs/claims.md` — maar ze
zijn geen aanleiding om in die repo's te gaan werken.

**De skalo-hermeting van morgen vervalt daarmee.** Die stond hieronder als
openstaande taak; hij wordt niet uitgevoerd. Pak hem niet alsnog op.

### 2026-09-22 — skalo: #194 blijft staan, de revert is weer ingetrokken

**Eindstand: `#194` is gemerged en blijft gemerged. Er staat niets van dit
account open in die repo.** Raak hem niet aan; zie het scope-blok hierboven.

De weg ernaartoe, kort, zodat niemand hem opnieuw aflegt. Juan vroeg *"wat je
op mrsocial gezet hebt haal dat eruit"* en koos voor terugdraaien via een PR.
Die is gemaakt — `#199`, een schone revert van `7ca83ee96`: 57 bestanden, geen
conflicten met #196/#197/#198, na afloop gemeten op kopen-of-lenen 39 en
AI-vermelding 0, met de 55 bestaande over-ons-pagina's als positieve controle.
Daarna: *"delete that from his github — only bongartzdiaz"*. De PR is gesloten
en de tak verwijderd.

**Wat dat netto betekent.** De correctie van #194 blijft in die repo staan: de
claim dat de redactie systemen koopt en onafhankelijk test is er weg, de
AI-vermelding staat erin. Of dat op de 55 sites ook live komt hangt aan de
nachtmotor op `142.93.140.18`, en dat is niet van hier te zien en niet van hier
te sturen.

**Wat er niet meer kan.** De merge-commit van #194 staat in de historie van die
repo. Die eruit halen vraagt een nieuwe commit, en juist dat is wat hier niet
meer gebeurt. Wil Juan het alsnog terug, dan is dat werk voor een sessie met
die repo in scope.


**`mistersocial99/skalo-seo#194` is gemerged** (`7ca83ee96`): 55 sites plus het
sjabloon, met `scripts/check_over_ons_claims.py` als poort erbij. **Op de sites
zelf staat de oude claim nog.** Gemeten op `thuisbatterijmagazine.nl/over-ons/`
direct na de merge: `kopen of lenen` = 1, `journalist` = 1,
`AI-ondersteuning` = 0, met `redactie` = 1 als positieve controle zodat een
blokkadepagina niet als schone meting kan lezen.

**Dat is geen fout maar de uitrol.** `deploy-site.yml` staat op
`disabled_manually`, dus GitHub rolt daar niets uit. De sites worden gebouwd en
uitgerold door de nachtmotor op de server (`142.93.140.18`, `/opt/skalo-seo`),
die uit de repo trekt.

**Wat daaraan onzeker is, en het is niet van hier te beslissen.** De nachtmotor
bouwt een site als hij daar een artikel voor schrijft. Sites die vannacht geen
artikel krijgen, worden mogelijk niet herbouwd, en dan blijft de claim daar
staan. De keten is bovendien niet betrouwbaar: in de week van 12 tot 16
september lag hij drie nachten plat (`ALL_FAILED`) en draaide daarna twee
nachten half, waarvan één met 5 van de 55 sites.

**Dus: meet morgen na, en meet breed.** Eén site is geen bewijs voor 55.
`bash` met een lus over de domeinen, met `redactie` als positieve controle per
site, want een deel van het netwerk staat achter Cloudflare en geeft dan 403 met
`Just a moment...` — dat leest als nul treffers en dus als opgelost. Blijft de
claim staan op sites die geen artikel kregen, dan is een handmatige herbouw op
de server de enige weg.

**Let op bij het lezen van de vinkjes op die repo.** Alle jobs daar geven
`failure` met **nul stappen** en zonder log; GitHub weigert de
Actions-facturatie. Eén valstrik: `Overlapwacht` staat in de runlijst op
`success` terwijl zijn enige job `failure` is, omdat die job als
niet-blokkerend is opgezet. Het vinkje op runniveau zegt daar dus niets, in
allebei de richtingen. De controles op #194 zijn lokaal gedraaid: esbuild 56 van
56 met een positieve controle, en de poort mutatiegetest.

### ~~2026-09-22 — `www.juandiazllc.com` heeft geen geldig certificaat~~ — gesloten dezelfde dag

**Het domein staat erop en het certificaat is geldig.** Gemeten direct na de
wijziging met `curl`, omdat dat de hostnaam controleert:

| gemeten | uitkomst |
|---|---|
| `https://www.juandiazllc.com/` | **308** naar `https://juandiazllc.com/`, `ssl_verify=0` |
| dezelfde keten met `-L` | eindigt op `https://juandiazllc.com/en`, **200**, twee hops, `ssl_verify=0` |
| `https://juandiazllc.com/` | 307 naar `/en`, `ssl_verify=0` — de apex serveert zelf |
| negatieve controle `nope.juandiazllc.com` | resolvet niet (`curl: (6)`), dus de uitkomst op `www` is echt en geen wildcard |

`ssl_verify=0` is curls volledige controle **inclusief hostnaam** — precies de
controle die hieronder nog `SEC_E_WRONG_PRINCIPAL` gaf.

**Eindstand in het project**, gelezen via `list_project_domains` en niet van de
pagina:

| domein | stand |
|---|---|
| `www.juandiazllc.com` | 308 naar `juandiazllc.com` |
| `juandiazllc.com` | Production, **geen** redirect |
| `juandiazllc-com.vercel.app` | Production |

**Onderweg heeft de apex een kwartier de verkeerde kant op gewezen, en dat is
de les uit dit blok.** Het venster "Add Domains" draagt een vinkje *"Redirect
apex domains to www (recommended)"* dat aan staat. Ik zette het uit met
`form_input`, de schermafdruk vlak vóór het versturen liet het uit zien, en
tóch kwam `juandiazllc.com` eruit met `redirect: www.juandiazllc.com, 308`.
`form_input` zet de DOM-waarde; de state van React bleef `true`, en het
versturen gebruikt die state. Het vinkje sprong in een eerdere schermafdruk al
zichtbaar terug — dat signaal stond er, en ik las het als een hertekening in
plaats van als de waarheid.

Gevolg zolang het stond: elke verwijzing naar de apex — het sitemap, de
JSON-LD, en de backlink die diezelfde dag vanaf `diazatlas.com` is gelegd —
bouncete naar `www`. Gevonden door ná het versturen de **API** te bevragen in
plaats van de pagina te lezen, en teruggedraaid via Edit op de apexrij. **Een
schermafdruk van een React-formulier bewijst niet wat er verstuurd wordt. Alleen
de uitkomst bij de server doet dat.** Zie [[feedback_form_input_is_geen_react_state]].

**Het venster is niet betrouwbaar te bedienen, het inline Edit-formulier wél.**
De keuzelijsten in "Add Domains" worden búíten het venster getekend, als een
eigen `dialog` ernaast. Een klik op een optie telt daardoor als een klik buiten
het venster en sluit het hele formulier — dat kostte drie pogingen voordat de
oorzaak zichtbaar was in de accessibility-boom. Toetsenbordselectie committeert
er niet, en typen in het bestemmingsveld liet de renderer meermaals vastlopen.
Wat wél werkt: het domein toevoegen **zonder** redirect, en de redirect daarna
zetten via **Edit** op de rij zelf. Dat formulier staat inline, heeft geen
venster om te sluiten, en daar werkt de keuzelijst gewoon.

**De MCP-muur staat nog.** `add_project_domain` geeft nog steeds **403
`forbidden`**: het token leest wel en schrijft niet. Lezen ging wél, en dat is
precies wat deze wijziging heeft geverifieerd — inclusief de fout onderweg.

**"DNS Change Recommended" op `www` is een aanbeveling, geen fout.** Vercel
vraagt om `CNAME www ccb12fba14130019.vercel-dns-017.com.`, maar zegt er zelf
bij dat de oude records blijven werken. De API zet het domein op `verified:
true` en het certificaat is uitgegeven. Er is niets te doen, tenzij je mee wilt
met de nieuwe IP-reeks.

**Wat openblijft: `diazatlas.com`.** Alle vier de controles daar waren al
schoon, dus de Instagram-markering op dát domein heeft een andere oorzaak en is
met deze wijziging niet geraakt. Meet opnieuw voordat je concludeert dat het
opgelost is.

**Hieronder staat de diagnose van vóór de reparatie.** Hij klopte, op één punt
na: de stap was niet met één handeling te zetten.


**Eén handeling in Vercel, en het is de enige stap die dit oplost.** Voeg
`www.juandiazllc.com` toe aan het project `juandiazllc-com` (team
`bongartzdiaz-2377s-projects`), met een redirect naar `juandiazllc.com`.
Vercel geeft dan zelf een certificaat uit. Ik kan het niet zetten: de
MCP-verbinding leest wel maar schrijft niet, en geeft **403 `forbidden`** op
`add_project_domain` — dezelfde muur als bij het lezen van env-vars.

**Wat er gemeten is, op 2026-09-22.** Juan meldde dat Instagram
`juandiazllc.com` en `diazatlas.com` als onveilig markeert en vermoedde het
beveiligingscertificaat. Dat vermoeden klopt, voor één van de twee:

| host | uitkomst |
|---|---|
| `juandiazllc.com` | 307, certificaat geldig t/m 19 nov |
| **`www.juandiazllc.com`** | **`curl: (60) SEC_E_WRONG_PRINCIPAL`** — het geserveerde certificaat draagt alleen `DNS:juandiazllc.com` in zijn SAN, dus de hostnaam klopt niet |
| `diazatlas.com` | 200, certificaat geldig t/m 8 dec |
| `www.diazatlas.com` | 308, **eigen** certificaat mét `www` in de SAN |

**De oorzaak is geen verlopen certificaat maar een ontbrekend domein.** DNS
voor `www.juandiazllc.com` wijst naar Vercel (`76.76.21.123`), maar het
Vercel-project kent maar twee domeinen: `juandiazllc.com` en
`juandiazllc-com.vercel.app`. Vercel krijgt dus een verzoek voor een hostnaam
die het niet kent, serveert het apex-certificaat, en de hostnaamcontrole faalt.

**En `DEPLOY.md:28` zegt al jaren dat het er hoort te staan**: *"Production
domain: `juandiazllc.com` + `www.juandiazllc.com`"*. De DNS is daar ook naar
gezet. Alleen de Vercel-kant is nooit toegevoegd. Twee documenten die één feit
dragen en uit elkaar zijn gelopen zonder dat iets dat zag — zie
[[feedback_documentatie_is_de_aanroeper]].

**Let op bij het zelf nameten: `openssl s_client` zegt hier `Verify return
code: 0 (ok)` op de kapotte host.** Dat is geen tegenspraak. `s_client`
controleert standaard alleen de **keten**, niet de **hostnaam**; daarvoor is
`-verify_hostname` nodig. De keten ís in orde — het is een echt Let's
Encrypt-certificaat — alleen staat de gevraagde naam er niet in. Meet met
`curl`, dat de hostnaam wél controleert, of je leest een kapotte host als
gezond.

**Wat hiermee níét verklaard is.** Alle vier de controles op `diazatlas.com`
zijn schoon, dus als Instagram dat domein óók markeert, heeft dat een andere
oorzaak. Kandidaten die van hier niet te meten zijn: Meta's eigen
reputatielijst, of Google Safe Browsing. Beide zijn alleen ingelogd te zien, en
Meta heeft een eigen formulier om een markering te betwisten. **Meet dus na het
zetten van het www-domein opnieuw voordat je concludeert dat het opgelost is.**

**Over de suggestie om naar gratis Cloudflare te verhuizen.** Dat lost dit ook
op, want Cloudflare geeft automatisch een certificaat voor `www`. Maar het is
een productie-DNS-verhuizing om een ontbrekende subdomein-regel te repareren,
en daarmee een veel groter risico dan de fout zelf. Vercel doet hier al
hetzelfde werk gratis. Aanbeveling: zet het domein erbij, en houd een
platformverhuizing apart voor een reden die op zichzelf staat.

### 2026-09-22 — wat een casestudy is, beslist door Juan

*"case studies so work I did with results we got"*. Dat sluit de derde open
vraag uit het blok hierboven. Een casestudy vraagt **allebei**: werk dat jij
hebt gedaan, én een uitkomst die gemeten is.

Daarmee ligt het zo:

- **De HMB-advertentieweek kwalificeert.** Werk: het budget bijna verdubbeld.
  Resultaat: kosten per registratie 22,6% omlaag. Allebei aanwezig, met bron en
  meetperiode. Zie `docs/claims.md`.
- **De skalo-diagnose kwalificeert nog niet.** Het werk is er (de audit), het
  resultaat niet — de gemeten richting sinds de overdracht is omlaag. Zodra een
  reparatie een cijfer laat bewegen, wordt het er wél een. Tot dan is het
  materiaal, geen casestudy.

Dat betekent ook dat de vraag *"wordt de skalo-diagnose een casestudy"* van de
lijst af kan. Het antwoord is: nog niet, en er is een duidelijke voorwaarde.

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


## Sessielogboek

Het volledige sessielogboek (april t/m september 2026, ~600 KB) staat in
`docs/logboek.md`. Het wordt bewust **niet** meer bij elke sessie ingeladen:
lees het alleen als je een beslissing, meting of incident uit het verleden
nodig hebt (`grep -n "^### " docs/logboek.md` geeft de inhoudsopgave).
Nieuwe logboekblokken gaan onderaan **dat** bestand; dit bestand draagt alleen
de levende secties hierboven. `CLAUDE.md` en `AGENTS.md` blijven byte-identiek
(`cp CLAUDE.md AGENTS.md`, bewaakt door `docs-sync`).
