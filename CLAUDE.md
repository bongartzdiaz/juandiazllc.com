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
   is dicht.** De migratie staat op wbgio; wat nog open is, is de uitrol van
   beide functies via de Supabase-MCP in een verse sessie met alleen Supabase
   aan (geen PAT, geen CLI — beslist 2026-09-20), en dat is onderhoud
   (rotatie zonder dashboard), geen blokkade meer. Die vault-sleutel staat er
   sinds 2026-08-16 16:22:38 UTC (44 tekens). **Vóór stap 4.**

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
4. **`brevo_api_key` in Vault** (SQL-editor: `select vault.create_secret('<sleutel>', 'brevo_api_key')`, dezelfde route als stap 3) **+ `ACK_FROM` + `NOTIFY_FROM`** als Edge-Function-secrets, op een in Brevo geauthenticeerd domein (Resend is sinds 2026-09-20 uit de code; zie `MANUAL_TASKS.md`, bovenste blok). Zonder die twee
   gaat er bij een echte lead geen enkele mail de deur uit — gemeten, niet
   vermoed. Pas ná stap 3, anders geef je een publiek aanroepbaar endpoint een
   mailkanaal op je eigen domein.
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
  Vercel-productie. Tot die staan antwoordt `GET /api/campagne/scan-reeks`
  503 `not-configured` en gaat er niets uit. Volledige uitleg, probe en
  controlequery in `MANUAL_TASKS.md`. Sinds 2026-09-20 ook de enige
  blokkade voor de ROI-mail van #378 (`source=energy-roi`, zelfde cron).
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
- **Vier PR's in `bongartzdiaz/diaz-editor` wachten op jouw merge: #652,
  #653, #654 en #655.** Ze dragen de D2-, D3-, D4- en D6-rijen uit
  `docs/content-kalender.md`; in die repo merget deze sessie niet.
  **Gemeten op 2026-09-03, want dit bestand had het elders mis:** #659 is
  **gemerged** (`64ccd0d5`, 2026-09-02 15:29 UTC) en #647 is **gesloten
  zonder merge**. De sessielog-instructie om de basis van #647 naar `main`
  te verzetten is daarmee vervallen; logboekgeschiedenis wordt niet
  herschreven, dus dit blok is de correctie erop.
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


## Sessielogboek

Het volledige sessielogboek (april t/m september 2026, ~600 KB) staat in
`docs/logboek.md`. Het wordt bewust **niet** meer bij elke sessie ingeladen:
lees het alleen als je een beslissing, meting of incident uit het verleden
nodig hebt (`grep -n "^### " docs/logboek.md` geeft de inhoudsopgave).
Nieuwe logboekblokken gaan onderaan **dat** bestand; dit bestand draagt alleen
de levende secties hierboven. `CLAUDE.md` en `AGENTS.md` blijven byte-identiek
(`cp CLAUDE.md AGENTS.md`, bewaakt door `docs-sync`).
