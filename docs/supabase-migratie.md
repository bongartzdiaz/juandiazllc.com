# Van Supabase-cloud naar de eigen VPS — het migratieplan

Geschreven op 2026-09-03. Dit is een **plan**, geen uitvoering: er is bij het
schrijven ervan niets aan wbgio, aan de VPS of aan Vercel gewijzigd.

## 0. Waarom dit er ligt

Supabase weigert sinds 2026-08-27 het hele datavlak van beide projecten met
402 `exceed_storage_size_quota`. Het contactformulier op juandiazllc.com schrijft
via precies dat pad, dus de leadopvang ligt eruit — een bezoeker die nu het
formulier invult krijgt `form.err.generic` terug. Dat staat bovenaan de
operator-lijst in `CLAUDE.md` en is een facturatietoestand, geen gebruikstoestand:
samen 49 MB over de hele organisatie.

Zelf hosten haalt die afhankelijkheid weg. Wat het niet doet is de keten
repareren die vandaag al donker stond — zie §9.

## 1. Wat er migreert, en wat bewust niet

**Wel: `wbgiouuifqhasedncysw` (juandiazllc.com).** Twee tabellen, één view, vier
triggers, drie functies, twee edge functions. Nul rijen, ooit — dus er valt geen
data te verhuizen, alleen structuur.

**Niet: `vbozelswveaxsyccvaac` (Diaz Atlas).** Veertien edge functions, een
Stripe-webhook, licentie-uitgifte, en een betaalketen die nog nooit
end-to-end heeft gelopen (25 checkout-sessies, nul betaald — `docs/claims.md`).
Die keten verhuizen terwijl hij onbewezen is, zet twee onbewezen dingen tegelijk
in beweging. `docs/diaz-atlas-volgorde.md` zegt dat de eerste stap daar één echte
aankoop is, niet een verhuizing.

## 2. De inventaris — wat er gereproduceerd moet worden

Gemeten op 2026-09-03 via het managementvlak, dat blijft werken terwijl het
datavlak 402 geeft.

### Tabellen

| tabel | kolommen |
|---|---|
| `marketing.leads` | 12: `id`, `name`, `email`, `company`, `sector`, `message`, `source`, `metadata`, `created_at`, `acknowledged_at`, `ack_channel`, `ack_seconds` |
| `marketing.subscribers` | 5: `id`, `email`, `source`, `metadata`, `created_at` |

`id` is `uuid` met `gen_random_uuid()` (dus **pgcrypto**), `metadata` is `jsonb`
met `'{}'`, `created_at` is `timestamptz` met `now()`. `email` is in beide
`NOT NULL`; elke andere kolom is nullable `text`.

### Indexen

    leads_pkey                  UNIQUE btree (id)
    leads_created_at_idx        btree (created_at DESC)
    leads_email_idx             btree (email)
    leads_open_ack_idx          btree (created_at DESC) WHERE acknowledged_at IS NULL
    subscribers_pkey            UNIQUE btree (id)
    subscribers_email_key       UNIQUE btree (email)
    subscribers_created_at_idx  btree (created_at DESC)

Let op `leads_open_ack_idx`: dat is een **partiële** index. Die staat niet in
`pg_constraint` en is met een constraint-query niet te vinden — precies de val
die op 2026-08-21 een migratie de verkeerde kant op stuurde. Kijk in
`pg_indexes`, niet in `pg_constraint`.

### View

`marketing.lead_response` — telt leads, bevestigde leads, en de mediaan, p90 en
traagste bevestigingstijd uit `ack_seconds`.

### Triggers

| trigger | tabel | functie |
|---|---|---|
| `leads_ack_is_server_owned` | `marketing.leads` BEFORE INSERT | `marketing.leads_ack_is_server_owned()` |
| `leads_acknowledge_new` | `marketing.leads` AFTER INSERT, alleen als `source` niet met `cal_` begint | `marketing.acknowledge_new_lead()` |
| `leads_notify_new` | `marketing.leads` AFTER INSERT | `notify_new_lead()` |
| `subscribers_notify_new` | `marketing.subscribers` AFTER INSERT | `notify_new_lead()` |

De laatste twee noemen de functie **ongekwalificeerd**, dus ze lossen op via
`search_path` naar `public.notify_new_lead()`. Wie dat schema anders noemt op de
VPS, breekt beide triggers zonder foutmelding bij het aanmaken.

### Functies

Alle drie zijn `plpgsql`. `leads_ack_is_server_owned()` draait op
`SET search_path TO ''` en nult `acknowledged_at` en `ack_channel` bij insert —
de bevestigingsvelden zijn van de server, niet van de indiener.

`notify_new_lead()` en `acknowledge_new_lead()` zijn **SECURITY DEFINER** met
`SET search_path TO 'public','net','vault'`. Ze lezen `lead_notify_secret` uit
`vault.decrypted_secrets`, zetten dat als `Authorization: Bearer`, en roepen
`net.http_post(...)` aan met `timeout_milliseconds := 5000`. Een mislukte
verzending geeft alleen een warning; een mislukte vault-lezing wordt geslikt.

**Ze dragen allebei een hardgecodeerde URL naar wbgio.** Dat is de regel die deze
migratie moet herschrijven, en de enige regel in de hele database die het oude
project noemt.

### Extensies

`pgcrypto` naar schema `extensions` · `supabase_vault` naar `vault` ·
`pg_net` naar **`public`** · `pg_cron` naar `pg_catalog`.

### RLS en rechten

Beide tabellen: `rowsecurity = true`, precies één policy elk
(`leads_public_insert`, `subscribers_public_insert`), `cmd = INSERT`,
`USING = NULL`, `WITH CHECK = true`, rollen `{anon, authenticated}`.

**Er bestaat nergens een SELECT-policy.** Wie de publishable key uit de
broncode plukt kan een lead indienen en niets teruglezen. Die eigenschap moet de
migratie behouden, en §7 meet hem na.

### Edge functions

`lead-notify` (v4, `verify_jwt: false`) en `lead-acknowledge` (v3, fail-closed).
De bron van de eerste bestond nergens buiten wbgio en staat sinds vandaag in
`supabase/functions/lead-notify/index.ts`.

## 3. Twee vragen die alleen op de VPS te beantwoorden zijn

Dit plan valt of staat hiermee, en het is van hier niet te meten.

1. **Draaien `pg_net` en `supabase_vault` daar?** Beide triggerfuncties hebben ze
   nodig: `net.http_post` om te verzenden, `vault.decrypted_secrets` om het
   secret te lezen. Ontbreekt `pg_net`, dan komt er geen enkele melding op gang.
   Ontbreekt de vault, dan valt de functie terug op verzenden **zonder** header —
   en `lead-acknowledge` is fail-closed, dus die weigert dan alles.
2. **Draait de edge-function-runtime daar?** Zonder die runtime is er geen plek
   voor `lead-notify` en `lead-acknowledge`, en dan moet de meldingskant ergens
   anders naartoe (een route op Vercel, of `pg_net` rechtstreeks naar Telegram).
   Dat is een andere migratie dan deze en hoort niet stilzwijgend meegenomen.

Nameten:

    select extname, extnamespace::regnamespace as schema
    from pg_extension
    where extname in ('pg_net','supabase_vault','pgcrypto');

Nul rijen voor `pg_net` betekent: eerst installeren, dan pas verder.

## 4. Het volgordebeginsel

**Bouw en bewijs de nieuwe stack volledig voordat er één variabele in Vercel
omgaat.** Die omzetting is de knip: hij is atomair, hij is de enige stap die de
bezoeker raakt, en hij is in dertig seconden terug te draaien.

De volgorde is dus niet "verhuizen en dan testen" maar "opbouwen, met een
testinsert bewijzen dat de hele keten loopt, en pas dan de site laten wijzen".

Eén eerlijke kanttekening bij "geen moment zonder opvang": de site staat
**vandaag al** zonder opvang, want het datavlak geeft 402. Die zin is dus
vooruitkijkend en beschrijft niet de huidige toestand.

## 5. De stappen

### Stap 1 — dump de definities uit het levende object, schrijf ze niet over

Dit plan bevat met opzet **geen** kopie van de drie functiebodies. Een document
en een implementatie die dezelfde tekst dragen lopen uit elkaar, en dit logboek
telt daar meer voorbeelden van dan van welke andere fout ook. Haal ze op het
moment van migreren op:

    select p.oid::regprocedure as handtekening,
           pg_get_functiondef(p.oid) as definitie
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname, p.proname) in (
      ('public','notify_new_lead'),
      ('marketing','acknowledge_new_lead'),
      ('marketing','leads_ack_is_server_owned')
    );

Gebruik `pg_get_functiondef`, niet een gereconstrueerde handtekening: de
functies dragen parameterdefaults, en die met de hand overtypen is op
2026-08-21 al een keer stukgelopen.

Voor de tabellen, indexen en de view:

    select indexdef from pg_indexes where schemaname = 'marketing';
    select pg_get_viewdef('marketing.lead_response'::regclass, true);

### Stap 2 — bouw het schema op de VPS

Schema, extensies, tabellen, indexen, view. In deze volgorde, want de
`gen_random_uuid()`-defaults hebben `pgcrypto` nodig voordat de tabel bestaat.

    create extension if not exists pgcrypto;
    create extension if not exists pg_net;
    create schema if not exists marketing;

Daarna de gedumpte DDL uit stap 1.

### Stap 3 — RLS en rechten, in deze volgorde

    alter table marketing.leads enable row level security;
    alter table marketing.subscribers enable row level security;

    grant usage on schema marketing to anon, authenticated;
    grant insert on marketing.leads, marketing.subscribers to anon, authenticated;

    create policy leads_public_insert on marketing.leads
      for insert to anon, authenticated with check (true);
    create policy subscribers_public_insert on marketing.subscribers
      for insert to anon, authenticated with check (true);

**Zet RLS aan vóór de grant.** Andersom staat de tabel even open, en op een
endpoint dat je net publiek maakt is "even" lang genoeg.

**Geef geen SELECT.** Dat is de eigenschap uit §2 die de site vandaag veilig
maakt, en hij is per ongeluk weg te geven met één `grant all`.

### Stap 4 — zet `marketing` in de PostgREST-schema's

Zonder deze stap bestaat de tabel wel en is hij via de API onbereikbaar.

    alter role authenticator set pgrst.db_schemas = 'public, graphql_public, marketing';
    notify pgrst, 'reload config';

**Lees dit terug van `authenticator`, niet met `current_setting()`.** Die laatste
geeft de instelling van de rol waarmee jij verbindt, en dat is niet dezelfde rol.
Die val kostte op 2026-08-21 een volledig omgekeerde conclusie, en hij staat in
`CLAUDE.md` als [[feedback_drop_schema_breekt_postgrest]].

    select rolname, rolconfig from pg_roles where rolname = 'authenticator';

### Stap 5 — de secrets, en de volgorde waarin ze aan mogen

Twee plekken, en de volgorde is dwingend:

| waar | naam | waarom |
|---|---|---|
| Database → Vault | `lead_notify_secret` | de trigger leest hem hier |
| Edge Functions → Secrets | `LEAD_NOTIFY_SECRET` | de functie vergelijkt hem hier |

Ze moeten **dezelfde waarde** dragen. De comment in `notify_new_lead()` beweert
dat de volgorde niet uitmaakt; dat klopt niet, en `CLAUDE.md` noteert die comment
als onjuist. Zet je de functiekant eerst, dan stuurt de trigger nog niets mee en
valt elke melding op 401 — stil, want `net.http_post` is asynchroon en de fout
landt in `net._http_response`.

Daarna pas de rest, en `RESEND_API_KEY` als laatste: dat geeft een publiek
aanroepbaar endpoint een mailkanaal op je eigen domein, en dat wil je niet
aanzetten voordat de poort dicht is.

    LEAD_NOTIFY_SECRET   verplicht - sluit beide functies
    TELEGRAM_BOT_TOKEN   optioneel - zonder deze twee slaat de Telegram-tak over
    TELEGRAM_CHAT_ID
    RESEND_API_KEY       optioneel - pas na LEAD_NOTIFY_SECRET
    ALERT_EMAIL
    RESEND_FROM          standaard onboarding@resend.dev; zet een geverifieerd domein
    ACK_FROM             voor lead-acknowledge

### Stap 6 — rol de twee edge functions uit

`supabase/functions/lead-notify/index.ts` en
`supabase/functions/lead-acknowledge/`. Er is in deze repo **geen**
deploy-workflow voor edge functions, dus dit gebeurt met de hand.

Let op: de `supabase`-CLI op deze machine is ingelogd als Roy en heeft geen
rechten op deze projecten. Dat is een verkeerd account, geen defect — zie de
operator-lijst.

### Stap 7 — herschrijf de twee URL's in de triggerfuncties

De enige inhoudelijke wijziging aan de gedumpte definities: beide
`https://wbgiouuifqhasedncysw.supabase.co/functions/v1/...`-adressen worden het
functies-endpoint van de eigen stack. Controleer daarna dat het oude projectref
nergens meer in de database staat:

    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public','marketing')
      and pg_get_functiondef(p.oid) like '%wbgiouui%';

Nul rijen. En als positieve controle dezelfde query op `functions/v1` — die moet
er twee geven, anders zoekt de query niet wat je denkt.

### Stap 8 — bewijs de keten met één testinsert, vóór de knip

Dit is de stap die het hele plan draagt. Insert één rij rechtstreeks in de
nieuwe database — nog niet via de site, want die wijst nog naar Supabase.

    insert into marketing.leads (name, email, message, source)
    values ('Migratietest', 'test@juandiazllc.com', 'Testinzending migratie', 'migratie_test')
    returning id, acknowledged_at, ack_channel;

Wat er moet gebeuren:

- `acknowledged_at` en `ack_channel` komen **null** terug — de BEFORE-trigger doet zijn werk
- `select * from net._http_response order by created desc limit 5` toont twee 200's
- Telegram geeft een bericht, als die twee variabelen staan

Daarna de rij weg: `delete from marketing.leads where source = 'migratie_test';`
en `select count(*) from marketing.leads` terug op nul.

### Stap 9 — de knip

Drie variabelen in Vercel, productie, in één keer:

    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   (of NEXT_PUBLIC_SUPABASE_ANON_KEY)
    SUPABASE_SECRET_KEY                    (of SUPABASE_SERVICE_ROLE_KEY)

`lib/supabase/keys.ts` leest per paar de eerste die gezet is. Staat de oude
`..._ANON_KEY` er nog naast een nieuwe `..._PUBLISHABLE_KEY`, dan wint de
publishable — maar laat er geen twee staan die naar verschillende stacks wijzen.

**`NEXT_PUBLIC_*` wordt bij het bouwen ingebakken, niet bij het draaien.** Er moet
dus een nieuwe build vanaf `main` overheen. En de Redeploy-knop in Vercel levert
op dit account aantoonbaar geen deployment op — driemaal gemeten op 2026-09-01,
met een controle op het filter zelf. Een push naar `main` is de enige deploy-route
met bewijs dat hij werkt.

## 6. Wat er níét hoeft te veranderen

Dit is de prettige helft van de meting.

**Geen regel applicatiecode.** Alle drie de server actions gebruiken
`createClient` uit `lib/supabase/server.ts`; `createBrowserClient` komt in
geleverde code nul keer voor. De hostnaam is een variabele, geen constante.

**Het endpoint hoeft alleen Vercel toe te laten**, niet het publieke internet —
elke schrijfactie loopt server-side. Een IP-allowlist is daarvoor geen bruikbaar
slot: Vercel Hobby heeft geen vaste uitgaande adressen. De poort blijft dus de
sleutel plus RLS, precies zoals nu.

**Het adres van de VPS blijft uit het zicht.** Gemeten op de levende
productiebundel, over de homepage en `/nl/contact` samen (2,06 MB): `supabase.co`
0x, `wbgiouui` 0x, `sb_publishable` 0x, `NEXT_PUBLIC_SUPABASE` 0x. Er staat geen
enkele Supabase-aanduiding in wat de browser krijgt.

Dat corrigeert wat ik hier eerder over zei. Ik had geschreven dat de hostnaam
"hoe dan ook publiek wordt omdat hij in de clientbundel staat". Dat is onjuist,
en het maakt de privacypositie van deze migratie beter dan ik hem beschreef.

## 7. Nameten, met een positieve controle bij elke nul

Een nul is pas een meting nadat hetzelfde instrument bewees iets te kúnnen
vinden. Elke regel hieronder heeft er daarom een.

| meting | verwacht | positieve controle |
|---|---|---|
| `pg_indexes` in `marketing` | 7 | de partiële index staat erbij |
| `rolconfig` van `authenticator` | bevat `marketing` | en ook `public` |
| policies per tabel | 1, `cmd = INSERT` | geen enkele met `cmd = SELECT` |
| REST-insert met de publishable key | 201 | dezelfde key op SELECT geeft leeg of geweigerd |
| REST-insert zonder key | 401 | mét key geeft 201 |
| `functiondef like '%wbgiouui%'` | 0 rijen | `like '%functions/v1%'` geeft 2 |
| `net._http_response` na de testinsert | twee 200's | een verzonnen slug geeft 404 |
| `marketing.leads` na opruimen | 0 rijen | vóór het opruimen 1 |

De SELECT-controle is de belangrijkste van de acht. Die eigenschap — indienen
mag, teruglezen niet — is met één `grant all` per ongeluk weg te geven, en er
komt geen foutmelding bij.

## 8. Terugdraaien

De knip is de enige stap die de bezoeker raakt, en dus de enige die
teruggedraaid hoeft te worden: zet de drie Vercel-variabelen terug op wbgio en
push. Alles daarvoor is additief op een lege database.

Wat dat **niet** herstelt is de 402: terugdraaien brengt je terug in de toestand
waar de leadopvang eruit ligt. Terugdraaien is dus zinvol als de VPS iets
kapotmaakt, en zinloos als hij alleen niet beter is dan niets.

## 9. Wat dit niet oplost

Deze migratie verhuist een keten die op vijf plekken donker stond, en donker
blijft tot iemand die knoppen omzet. Uit `CLAUDE.md`:

- de **zes Plausible-doelen** bestaan niet, dus elke klik wordt binnengehaald en weggegooid
- `RESEND_API_KEY` en `ACK_FROM` staan niet, dus er gaat bij een echte lead geen mail uit
- `CAL_WEBHOOK_SECRET` staat niet, dus een boeking levert geen rij op
- `SENTRY_DSN` wordt geweigerd, dus serverfouten worden niet gerapporteerd
- de tien dode `diaz-*` functies op wbgio staan er nog, met een service-role-sleutel erin

Die laatste blijft ook ná deze migratie staan. Zelf gaan hosten laat het oude
project niet verdwijnen — het maakt het alleen onbelangrijk voor de site, terwijl
er nog steeds tien publieke endpoints met een RLS-omzeilende sleutel op staan.
Opruimen is een eigen handeling en vergt het dashboard of een PAT.
