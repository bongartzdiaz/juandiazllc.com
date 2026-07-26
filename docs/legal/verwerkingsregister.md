# Verwerkingsregister — Juan Diaz LLC

**Artikel 30 AVG.** Dit is het register van verwerkingsactiviteiten onder
verantwoordelijkheid van Juan Diaz LLC, voor beide oppervlakken:
**diazatlas.com / Diaz Editor** en **juandiazllc.com / DEUS CRM**.

| | |
| --- | --- |
| Versie | 0.1 — eerste opzet |
| Datum | 2026-07-26 |
| Status | **CONCEPT — niet vastgesteld.** Zie §0 voor wat ontbreekt |
| Opgesteld op basis van | de code zoals die op deze datum in beide repo's staat |

De vrijstelling van art. 30 lid 5 (organisaties <250 werknemers) geldt hier
**niet**: de verwerking is niet incidenteel, betreft stelselmatig
klantgegevens, en omvat geautomatiseerde profilering.

---

## §0 — Wat ontbreekt en door wie ingevuld moet worden

Dit register is opgesteld uit wat verifieerbaar in de code staat. De
volgende velden kan alleen Juan invullen; ze zijn bewust leeg gelaten in
plaats van geraden.

| Veld | Nodig voor | Status |
| --- | --- | --- |
| Volledige rechtsvorm + registratienummer | art. 30(1)(a) | ⬜ Juan Diaz LLC, Delaware — registratienummer ontbreekt |
| Vestigingsadres | art. 30(1)(a), §5 DDG impressum | ⬜ Dover-adres staat in de diaz-editor-repo; niet bevestigd als officieel |
| EU-vertegenwoordiger (art. 27) | art. 30(1)(a) | 🔴 **Niet aangesteld.** privacy.html zegt 3× "appointment in progress" |
| Functionaris gegevensbescherming | art. 30(1)(a) | ⬜ Waarschijnlijk niet verplicht (art. 37), maar niet vastgesteld |
| Bewaartermijn CRM-klantdata | art. 30(1)(f) | ⬜ Nergens gedefinieerd |
| Bewaartermijn Supabase leads/subscribers | art. 30(1)(f) | 🔴 **Geen termijn, geen opruiming.** Rijen blijven eeuwig staan |
| Getekende verwerkersovereenkomsten | art. 28(3) | ⬜ Geen enkele DPA-artefact in beide repo's aangetroffen |
| Hostingregio Supabase / Resend / MariaDB | art. 30(1)(e) | 🔴 **Onbekend.** Staat nergens in de code. De gepubliceerde claim "Hetzner Falkenstein" was onjuist — die migratie is nooit doorgegaan; op 2026-07-26 uit alle live teksten verwijderd. Alleen in de vendor-dashboards vast te stellen |

**Zolang §0 open staat is dit register niet compleet in de zin van art. 30.**

---

## §1 — Verwerkingsverantwoordelijke

**Juan Diaz LLC** (Delaware, VS), handelend onder de merken *Diaz Atlas /
Diaz Editor* en *juandiazllc.com / DEUS*.

Contact voor betrokkenen: het adres onderaan elke pagina.
⚠️ **Discrepantie:** de CRM-documentatie noemt `privacy@lucen.ai`
(`lib/philly/dsar.ts:323,330`), dat nergens op de marketingsite staat. Eén
adres kiezen en overal doorvoeren.

---

## §2 — Verwerkingsactiviteiten

### 2.1 Diaz Editor — gratis proefperiode

| | |
| --- | --- |
| Doel | Uitgifte en beheer van een 14-daagse proeflicentie; misbruikpreventie |
| Betrokkenen | Aanvragers van een proefperiode |
| Categorieën | Naam, e-mail, **telefoonnummer**, bedrijfsnaam, device-fingerprint, gehasht IP, taal |
| Grondslag | Art. 6(1)(b) uitvoering overeenkomst — **behalve het telefoonnummer**, zie hieronder |
| Ontvangers | Supabase (hosting), Resend (verificatiemail), Cloudflare (IP/land-header) |
| Doorgifte | Resend — regio niet vastgesteld |
| Bewaartermijn | 2 jaar volgens `privacy.html` — **niet afgedwongen, geen opruimjob** |
| Bron | `supabase/functions/diaz-trial-init/`, `-verify/` |

🔴 **Bevinding.** Het telefoonnummer is een harde blokkade
(`diaz-trial-init/index.ts:74` geeft 400 `phone-invalid`). Een
telefoonnummer is niet noodzakelijk voor de levering van een gratis
proefperiode; e-mailverificatie bestaat al en dekt zowel levering als
anti-misbruik. Art. 5(1)(c) minimalisatie + art. 6(1)(b) strikt uitgelegd.
→ Staat als item 5 op de fase-B-lijst.

✅ **Wat goed gaat.** De marketing-opt-in is een apart veld, niet
voorgevinkt, en niet vereist om door te gaan (`diaz-trial-init:68`). Dat is
correct gebouwd.

### 2.2 Diaz Editor — licentie-uitgifte en -activatie

| | |
| --- | --- |
| Doel | Uitgifte, activatie en intrekking van licenties; zetelbeheer |
| Betrokkenen | Kopers en licentiehouders |
| Categorieën | Naam, e-mail, bedrijf, taal, licentiesleutel, device-fingerprint, **rauwe hostname** |
| Grondslag | Art. 6(1)(b) |
| Ontvangers | Supabase |
| Bewaartermijn | Niet gedefinieerd |
| Bron | `supabase/functions/diaz-license-issue/`, `-validate/`, `electron/license.js` |

⚠️ De `device_fp` wordt afgeleid uit hostname **plus gebruikersnaam**
(`electron/license.js:543-554`) en de rauwe hostname wordt apart opgeslagen
in `activations.hostname` (`:609`). De privacytekst presenteert de
fingerprint als onomkeerbare hash; dat is voor de fingerprint juist, maar
de rauwe hostname staat er los naast.

### 2.3 Diaz Editor — betalingen

| | |
| --- | --- |
| Doel | Verwerken van eenmalige aankopen, restituties, fiscale bewaarplicht |
| Betrokkenen | Kopers |
| Categorieën | Naam, e-mail, land, btw-gegevens, bedrag, Stripe-identifiers |
| Grondslag | Art. 6(1)(b) + art. 6(1)(c) (fiscale bewaarplicht) |
| Ontvangers | **Stripe Payments Europe Ltd** (IE) |
| Bewaartermijn | 10 jaar fiscaal |
| Bron | `supabase/functions/diaz-stripe-webhook/`, `diaz-beta-checkout/` |

Niet-actieve betaalpaden met code in de repo: **Paddle** (UK) en **Lemon
Squeezy** — beide niet aangesloten op de site, geen enkele transactie.
Vermeld omdat de functies wél gedeployd zijn.

### 2.4 Diaz Editor — e-mailreeksen en nieuwsbrief

| | |
| --- | --- |
| Doel | Onboarding-mails, productupdates, nieuwsbrief |
| Betrokkenen | Proefgebruikers, kopers, nieuwsbriefinschrijvers |
| Categorieën | E-mail, naam, taal, open- en klikgedrag |
| Grondslag | Art. 6(1)(a) toestemming (nieuwsbrief) / art. 6(1)(b) (transactioneel) |
| Ontvangers | **Resend** |
| Bron | `supabase/functions/diaz-drip-sender/`, `diaz-resend-webhook/` |

🔴 **Bevinding.** `diaz-resend-webhook/index.ts:148` slaat de **volledige
rauwe Resend-payload** op in `drip_email_event.raw_payload`. Die payload
bevat `click.ipAddress` en `open.ipAddress`. Het schemacommentaar van de
migratie beweert het tegendeel ("privacy-friendly, only country code"). Er
staan dus IP-adressen van elke e-mailopening in een tabel waarvan de
documentatie zegt dat dat niet zo is, zonder retentiejob.
→ **Doorgeschoven** — dit is codewijziging, geen laatste stap.

### 2.5 Diaz Editor — update-telemetrie

| | |
| --- | --- |
| Doel | Vaststellen of een update daadwerkelijk installeert |
| Betrokkenen | Gebruikers van de desktop-app |
| Categorieën | **Licentiesleutel**, device-fingerprint, versies, foutmelding |
| Grondslag | Art. 6(1)(f) gerechtvaardigd belang — **betwistbaar, zie hieronder** |
| Ontvangers | Supabase |
| Bron | `electron/main.js:565-598` |

🔴 **Bevinding.** De site belooft in vier talen *"Local-only: no cloud, no
account, no telemetry"*. Deze ping vuurt onvoorwaardelijk bij elke start,
zonder opt-out, en draagt de licentiesleutel — die herleidbaar is tot een
genoemde klant met e-mailadres. Belofte en gedrag spreken elkaar tegen.
→ Staat als item 4 op de fase-B-lijst: sleutel eruit, belofte preciezer.

✅ Op 2026-06-30 is de rauwe hostname hier al uit gehaald, met een expliciete
verwijzing naar dezelfde belofte. De redenering was juist; hij is alleen
niet doorgetrokken naar de licentiesleutel.

### 2.6 Diaz Editor — gebruikstelemetrie CAD

| | |
| --- | --- |
| Doel | Productverbetering |
| Categorieën | Gebruiksgebeurtenissen, device-fingerprint |
| Grondslag | Art. 6(1)(f) — **opt-out, standaard aan** |
| Bron | `apps/editor/lib/telemetry.ts`, `supabase/functions/diaz-cad-telemetry/` |

⚠️ Opt-out bestaat (`diaz_telemetry_optout`) maar staat standaard aan. Onder
art. 25(2) privacy-by-default is standaard-uit de verdedigbare keuze, en
onder de eigen "no telemetry"-belofte is standaard-aan onjuist.

### 2.7 diazatlas.com — websitestatistiek en attributie

| | |
| --- | --- |
| Doel | Bezoekersstatistiek, herkomstattributie |
| Categorieën | IP, user-agent, referrer, **advertentie-identifiers** (`gclid`, `fbclid`, `msclkid`, `yclid`), afgeleide beroepspersona |
| Grondslag | Art. 6(1)(a) toestemming — **poort werkt niet zoals bedoeld** |
| Ontvangers | Google (GA4), Vercel Analytics |
| Bewaartermijn | 90 dagen in `localStorage` |
| Bron | `landing/_attribution.js`, `landing/_compliance.js` |

🔴 **Bevinding.** De toestemmingspoort is een **tijdzone- plus
browsertaal-heuristiek** (`_compliance.js:29-41`). Toestemming kan niet uit
een tijdzone worden afgeleid. Bovendien staat `_compliance.js` op 422 van
837 pagina's, terwijl 116 pagina's zonder banner wél `_attribution.js`
laden.
→ **Doorgeschoven** — dit is een herbouw, geen laatste stap.

### 2.8 juandiazllc.com — contactformulier en leads

| | |
| --- | --- |
| Doel | Beantwoorden van contactaanvragen |
| Categorieën | Naam, e-mail, bedrijf, sector, bron, bericht |
| Grondslag | Art. 6(1)(b)/(f) |
| Ontvangers | Supabase, **Telegram** (meldingsbot) |
| Doorgifte | **Telegram — buiten de EU, niet gemeld aan de betrokkene** |
| Bewaartermijn | 🔴 Geen |
| Bron | `app/actions/contact.ts:43-57` |

### 2.9 juandiazllc.com — websitestatistiek

| | |
| --- | --- |
| Doel | Geaggregeerde bezoekersstatistiek |
| Categorieën | Geen persoonsgegevens opgeslagen; identifier is een dagelijks roterende hash |
| Grondslag | **Art. 11.7a lid 3 Telecommunicatiewet** — vrijstelling voor analytics met geen of geringe privacygevolgen, mits niet voor profilering |
| Ontvangers | Plausible |
| Bron | `components/Analytics.tsx` |

✅ GA4 is op 2026-07-26 verwijderd; het laadde onvoorwaardelijk, werd nergens
gemeld, en verzamelde niets (Consent Mode permanent `denied`).

### 2.10 DEUS CRM — klant- en contactbeheer

| | |
| --- | --- |
| Doel | CRM voor klanten van DEUS |
| Betrokkenen | Klanten én **hun** contactpersonen |
| Categorieën | Naam, e-mail, telefoon, bedrijf, notities, deals, documenten |
| Grondslag | Art. 6(1)(b) t.o.v. de klant; art. 6(1)(f) t.o.v. diens contacten |
| Ontvangers | MariaDB (Prisma), Supabase Auth |
| Bewaartermijn | 🔴 Niet gedefinieerd |

🔴 **Art. 14 wordt niet ingevuld.** Contactpersonen in het CRM hebben nooit
met Juan Diaz LLC te maken gehad en worden nooit geïnformeerd.

### 2.11 DEUS CRM — AI-contactattributen

| | |
| --- | --- |
| Doel | Automatisch afleiden van branche, ICP-score en samenvatting |
| Categorieën | Naam, e-mail, telefoon, bedrijf, contacttype, lead-bron, 1.500 tekens notities |
| Grondslag | Art. 6(1)(f) — **profilering, art. 4(4)** |
| Ontvangers | **Anthropic PBC (VS)** |
| Doorgifte | VS — `api.anthropic.com`, geen EU-regio ingesteld |
| Bron | `lib/philly/ai/contact-attributes.ts:137,141` |

🔴 Deze verwerking staat in **geen enkele publieke verklaring**. De
conceptlijst van sub-verwerkers beweert zelfs het tegendeel — zie §3.

### 2.12 DEUS CRM — agenda-koppeling

| | |
| --- | --- |
| Categorieën | Afspraaktitel, locatie, deelnemers-e-mails |
| Ontvangers | Google, Microsoft |
| Bron | `lib/philly/calendar/`, `prisma/schema.prisma:796-803` |

⚠️ `title` en `location` worden **verbatim** opgeslagen; redactie is opt-in
per organisatie. Agendatitels onthullen routinematig gezondheid, religie of
juridische zaken — art. 9-gebied. Privacy-by-default pleit voor redactie aan.

### 2.13 DEUS CRM — e-mail en sms

| | |
| --- | --- |
| Ontvangers | Resend, **SendGrid**, **Mailgun**, **Twilio** |
| Bron | `lib/philly/email/providers.ts`, `lib/philly/sms/twilio.ts` |

---

## §3 — Ontvangers, volledig

Alle partijen die volgens de code persoonsgegevens ontvangen. Partijen die
**in geen enkele gepubliceerde verklaring staan** zijn gemarkeerd.

| Partij | Rol | Gegevens | Vermeld? |
| --- | --- | --- | --- |
| Supabase | Hosting, auth, database | alles | ✅ |
| Stripe Payments Europe (IE) | Betalingen | naam, e-mail, land, btw | ✅ |
| Resend | E-mail | e-mail, naam, open/klik + **IP** | ✅ |
| Vercel | Hosting, analytics | IP, user-agent | ✅ |
| Google LLC | GA4, Fonts, OAuth, Agenda | IP, user-agent, agenda | deels |
| **Anthropic PBC (VS)** | AI-attributen | naam, e-mail, telefoon, bedrijf, notities | 🔴 **nee** |
| **Telegram** | Lead-melding | volledige lead | 🔴 **nee** |
| **Slack** | Foutmeldingen | fout-URL, user-agent | 🔴 **nee** |
| **PDOK (Kadaster, NL)** | Luchtfoto's | **projectadres van de gebruiker** | 🔴 **nee** |
| **Paddle (UK)** | Betalingen (inactief) | e-mail koper | 🔴 nee |
| **Lemon Squeezy** | Betalingen (inactief) | e-mail, naam, land | 🔴 nee |
| **GitHub / Microsoft** | Auto-updater | IP, appversie | 🔴 nee |
| Microsoft | Agenda, OAuth | agenda-inhoud | deels |
| Twilio | Sms | telefoonnummer | 🔴 nee |
| SendGrid, Mailgun | E-mail | e-mail | 🔴 nee |
| Cloudflare | IP-headers | IP, land | 🔴 nee |
| Firecrawl | Webverrijking | bedrijfsdomein | n.v.t. — **bewust uit** |

**De conceptlijst `_drafts/legal/subprocessors-en.md` is feitelijk onjuist**
en draagt daarom terecht een DO-NOT-PUBLISH-banner: hij stelt dat er geen
externe AI-API's worden gebruikt en dat er niets buiten de EER gaat,
terwijl §2.11 het tegendeel laat zien.

---

## §4 — Doorgifte buiten de EER

| Bestemming | Partij | Waarborg |
| --- | --- | --- |
| VS | Anthropic | ⬜ Geen DPA-artefact aangetroffen; DPF-status niet vastgesteld |
| VS | Google LLC | DPF — Google LLC is actief gecertificeerd |
| VS | Slack, Twilio, SendGrid, Mailgun, GitHub | ⬜ Niet vastgesteld |
| Buiten EU | Telegram | ⬜ Geen waarborg vastgesteld |
| UK | Paddle | Adequaatheidsbesluit VK |

---

## §5 — Beveiligingsmaatregelen (art. 32)

- TLS op alle verbindingen; geen cleartext
- RLS aan op alle tabellen in `diaz_editor`; anon-rol geweigerd (geverifieerd 2026-07-26)
- Wachtwoorden bcrypt(12); 2FA beschikbaar
- AES-256-GCM voor OAuth-tokens (`lib/philly/crypto.ts`)
- Rate-limiting op mutatie-endpoints
- Auditlog op geprivilegieerde schrijfacties
- Idempotency + handtekeningverificatie op de Stripe-webhook

---

## §6 — Bekende tekortkomingen

Bewust vastgelegd in plaats van weggelaten.

1. **Geen bewaartermijnen** op CRM-data, leads en subscribers
2. **Retentiejobs draaien pas sinds 2026-07-26** (PR #97) en vereisen nog `CRON_SECRET`
3. **Verwijdering is incompleet** — raakt Supabase Auth, Stripe-customer, documenten, sms/calls niet
4. **Tweede CRM-kopie in Supabase** valt buiten élk verwijderpad; laatste schrijfactie 2026-07-12
5. **Art. 27-vertegenwoordiger niet aangesteld**
6. **DPIA niet ondertekend** en dekt alleen de AI-attributen
7. **Geen getekende verwerkersovereenkomsten** aangetroffen
8. **Art. 14 wordt nergens ingevuld** voor CRM-contacten en agenda-deelnemers

---

*Bijhouden: dit register wijzigen bij elke nieuwe verwerking, elke nieuwe
ontvanger en elke wijziging van bewaartermijn. Een verwerking die hier niet
staat, hoort niet te draaien.*
