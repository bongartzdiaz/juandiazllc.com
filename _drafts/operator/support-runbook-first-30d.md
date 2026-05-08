---
target_path: docs/operator-support-runbook-first-30d.md (na sign-off)
purpose: Operator-runbook voor de eerste 30 dagen na customer #1
         go-live. Wat te doen bij de meest waarschijnlijke
         supportvragen, met fix-paden en escalatie-rules.
audience: Juan + Hash (zodat Hash kan inspringen tijdens vakantie/
         ziekte/parallel-werk)
---

# DEUS Support Runbook — Eerste 30 dagen

Dit runbook is jouw playbook voor week 1-4 na customer #1 launch.
Doel: snelle, consistente afhandeling van de typische problemen,
met escalatie-rules zodat één persoon (Juan of Hash) ze beide kan
afhandelen zonder context-overdracht.

**Geldigheidsperiode:** dag 1 t/m dag 30 na customer-#1 go-live
(Di 2026-05-19 → Do 2026-06-18). Daarna herzien: nieuwe pijnpunten,
ticket-systeem inrichten, response-SLA aanpassen.

---

## Bereikbaarheidsbelofte aan klant

Wat we beloofd hebben in de welkom-mail + side letter:

- **Telefoon:** Juan +31 6 …, business hours (09:00–18:00 CET)
- **Email:** hello@lucen.ai, antwoord <4 werkuren
- **Slack** (later, na klant 3): private channel per klant

Wat we NIET beloofd hebben:

- 24/7 bereikbaarheid
- Antwoord in <1 uur
- Antwoord in weekend (behalve KRITIEK)

Houd je aan de belofte. Overlever niet ongevraagd: <4 werkuren is
de SLA, eerder is geen verwachting.

---

## Trigger-events: wat opent een support-actie?

| Bron | Hoe je het ziet | Eerste actie |
|---|---|---|
| Klant belt | Telefoon gaat | Neem op binnen 3 ringen, business hours |
| Klant mailt hello@ | Gmail-inbox | Triage <30 min, antwoord <4 uur |
| Klant in Slack-kanaal (post-klant-3) | Slack desktop | Antwoord <2 uur business hours |
| `/health` 503 | Cron-alert via Resend | Check status, triage <15 min |
| `/status` toont rood | Cron-alert via Resend | Idem |
| Stripe webhook fail | Cron-alert via Resend | Idem |
| Sentry alert (post Sentry-setup) | Sentry mail | Triage binnen 30 min |

Cron-alerts gaan naar `alerts@juandiazllc.com` — beide Juan en
Hash hebben die mailbox in hun client.

---

## Triage-decisieboom

### Stap 1 — Wat is de severity?

| Severity | Definitie | Response-SLA |
|---|---|---|
| **KRIT** | Klant kan niet inloggen, OF data-loss, OF security-issue | <30 min |
| **HIGH** | Feature stuk, klant kan werk niet doen | <4 werkuren |
| **MED** | Feature werkt vreemd, workaround mogelijk | <1 werkdag |
| **LOW** | Cosmetisch, vraag, suggestie | <3 werkdagen |

Default = MED. Promote naar HIGH/KRIT bij twijfel, niet andersom.

### Stap 2 — Wie pakt het op?

- **Business hours, Juan beschikbaar:** Juan
- **Business hours, Juan niet:** Hash (na intro-call met klant)
- **Buiten business hours, KRIT:** Juan, ook 's avonds
- **Buiten business hours, HIGH/MED/LOW:** geen actie, ack-mail
  "binnenkomend, morgen 09:00 antwoord"

### Stap 3 — Wat is het patroon?

Check eerst de "10 meest-waarschijnlijke problemen" hieronder. Als
het er niet bij staat: log in `support-log/2026-05/<klant>.md` en
escaleer naar Juan voor diepe duik.

---

## Top 10 meest-waarschijnlijke supportvragen

Deze lijst is voorspeld op basis van: rehearsal-runbook bevindingen,
kwetsbare delen van de stack, generieke SaaS-onboarding-frictie.
Update deze lijst aan het eind van week 1 met wat ECHT binnenkwam.

### 1. "Ik krijg geen invite-mail"

**Frequentie verwacht:** 30% van invites (mail-deliverability is
fragiel)

**Diagnose:**
1. Check Resend dashboard logs — is mail verstuurd? Bounced?
2. Open `/philly/audit` filter `entity=invite&action=create` →
   bestaat de invite-row?
3. Vraag klant om spam-folder te checken
4. Vraag klant om mail-domain (Outlook? Gmail? Eigen domein?)

**Fix-pad:**
- Verstuurd maar bounced → check klant-mailadres voor typo
- Verstuurd, niet bounced → klant moet whitelist `@juandiazllc.com`
- Niet verstuurd (geen Resend-row) → bug, escalate naar Juan
- Klant op eigen domein met strenge filters → genereer wachtwoord
  zelf, stuur via SMS, klant logt direct in via /login

**Preventie:** in welkom-mail aanstaande maandag al melden:
"check spam, voeg juandiazllc.com toe aan veilige afzenders".

---

### 2. "Mijn kalender komt niet door"

**Frequentie verwacht:** 20% (OAuth-flows breken op edge-browsers)

**Diagnose:**
1. Open `/philly/settings/integrations` voor klant
2. Status =
   - **active + push-sync badge groen** → werkt, klant verwart misschien iets
   - **active maar geen badge** → push-sync subscribe faalde, klant zit op poll-only
   - **revoked** → klant heeft connectie verbroken
   - **niet aanwezig** → OAuth-callback faalde, geen connectie aangemaakt

**Fix-pad:**
- Werkt, klant verwart → vraag wat ze concreet missen, mogelijk UI-bug
- Push-sync mist → Juan checkt Hetzner cron-job-status (renew + subscribe)
- Revoked → klant moet opnieuw connecten via wizard
- OAuth-callback fail → check `?error=` in laatste callback URL,
  mogelijk env-var-issue

**Preventie:** push-sync subscribe-failure stiller, voeg toast-
melding toe bij eerste OAuth-callback dat als dat mislukt klant
het ziet.

---

### 3. "Ik kan mijn collega niet uitnodigen"

**Frequentie verwacht:** 15%

**Diagnose:**
1. Heeft klant `admin` of `manager` role? Check `/philly/audit` rij `user.role`
2. Zit team al op seat-cap? Check Subscription.seatCount vs aantal active users
3. Email-domein-validatie: heeft klant `@example.com` ingevuld of geldig?

**Fix-pad:**
- Geen admin-rechten → upgrade klant zelf (alleen zij kunnen 't toewijzen)
- Seat-cap (>25 voor beta) → escaleer, mogelijk side-letter-uitbreiding
- Email-validatie blokkeert → bug, escaleer

---

### 4. "Hoe haal ik mijn data uit Pipedrive in DEUS?"

**Frequentie verwacht:** 50% van klanten met bestaande CRM

**Antwoord:**
- Pipedrive → exporteer als CSV via Settings → Data → Export
- Upload via DEUS Settings → Data → Import (per entity-type)
- Deals + contacten + organisaties moeten apart worden geïmporteerd
- Voor bulk-migratie (>1000 rijen) bied de €1.500 service aan

**Fix-pad bij issues:**
- Mapping-fout → klant kan kolommen handmatig her-mappen
- Encoding-issues (umlaut, accent) → controleer CSV is UTF-8
- Pipedrive-CSV bevat Linux line-endings → onze parser handelt dat,
  maar log als bug als anders

---

### 5. "Stripe-checkout werkt niet"

**Frequentie verwacht:** 5%

**Diagnose:**
1. Welke browser/device? Safari iOS heeft cookies-bug met Stripe
2. Adblocker actief? Stripe loadt scripts vanaf js.stripe.com
3. Card-rejection of UI-fail? Verschillende paths

**Fix-pad:**
- Safari iOS cookies → klant probeert in privé-tab of andere browser
- Adblocker → klant whitelist js.stripe.com
- Card rejected door Stripe → klant moet bank bellen of andere kaart
- UI-fail (knop niet klikbaar) → bug, screenshot, escalate

---

### 6. "Ik zie de verkeerde taal"

**Frequentie verwacht:** 10%

**Diagnose:**
- Settings → Language → wat staat er?
- URL `/en/` of `/nl/` of `/de/` of `/es/`?
- Browser-language preference (Accept-Language header)?

**Fix-pad:**
- Klant verandert taal in settings, persisteert
- Mid-flow taal-switch verliest soms state — bug, niet kritiek
- Vertaling-string mist → fallback naar Engels (zichtbaar voor
  klant), log als translation-bug

---

### 7. "Mijn dashboard is leeg / hoe begin ik?"

**Frequentie verwacht:** 25%

**Antwoord:** dit is BY DESIGN. Lege dashboard = geen valse data.
Quick-start cards bovenaan zeggen wat je moet doen:
1. Voeg eerste contact toe
2. Maak eerste deal
3. Importeer CSV

Als klant verloren is: bel ze, doe 5-min screenshare, leid ze door
de eerste deal-creatie. Dit gesprek is goud waard voor product-
feedback.

---

### 8. "Ik heb een vraag over privacy / GDPR / waar zit mijn data"

**Frequentie verwacht:** 20%, vooral bij eerste betaling

**Antwoord:** verwijs naar `/legal/privacy` + `/legal/dpa`. Voor
specifieke vragen, zie `_drafts/onboarding/first-questions-customer-en.md`
vraag 1 en 8.

Bij DPA-verzoek: ondertekenbaar zonder onderhandeling, zorg dat
klant ondertekend exemplaar in Supabase opgeslagen krijgt.

---

### 9. "Hoe export ik mijn data?"

**Frequentie verwacht:** 5% (vooral compliance-bewuste klanten)

**Antwoord:** Settings → Privacy → "Exporteer mijn data". Krijgt
JSON-bundle met alles. Geen sensitive (passwordHash, tokens) in
export per design.

Bij grote orgs (>1000 contacten) kan het 30+ sec duren. Streaming
export op spec, nog niet geshipped — zie `docs/spec-dsar-streaming.md`.

---

### 10. "Het werkt op desktop, maar mobile is gek"

**Frequentie verwacht:** 15%

**Antwoord:** mobile-web werkt, geen native app. Voor data-invoer
desktop aanbevelen, voor checken-onderweg mobile is fine.

Specifieke mobile-bugs uit vrijdagse rehearsal: log in bug-tracker,
fix in week 2.

---

## Niet-techniek vragen

### Klant vraagt om feature die er niet is

1. Bedank, vraag waarom ze het nodig hebben (use-case begrijpen)
2. Geen "ja, gaan we bouwen" toezegging
3. Wel "ik schrijf het op, kom erop terug" (en doe dat)
4. Voeg toe aan `_drafts/feature-requests.md` met klant + use-case
5. Bij maand-feedback-call review je requests samen met klant

### Klant vraagt om korting

Eerste 5 zitten al op €99 lifetime — geen verdere korting mogelijk.
Vriendelijk uitleggen: "dit is al onze beta-prijs". Als klant niet
betaalt: ga niet onderhandelen, laat ze gaan.

### Klant vraagt om referral-bonus

Niet opgezet in eerste 30 dagen. Antwoord: "We bouwen dat in fase
2, ik kom op je terug." Houd lijst bij van wie referrals brengt.

---

## Hash-takeover-protocol

Als Juan onbereikbaar (vakantie, ziek, parallel ander werk):

1. **Hash krijgt access toegang:** `/philly/audit`,
   `/philly/settings/team` (als admin), Resend dashboard, Stripe
   dashboard, Hetzner Robot, Supabase project. Wachtwoorden in
   gedeelde 1Password vault.
2. **Klant gewaarschuwd:** voor takeover-periode, mail klant 24u
   vooraf "Hash neemt waar van X tot Y, hier is zijn nummer".
3. **Hash gebruikt dit runbook:** alle top-10-vragen kunnen ook
   door Hash beantwoord worden.
4. **Escalatie naar Juan alleen bij:** legal/contractuele vragen,
   prijsbeslissing, fundamentele product-richting. Niet voor
   bug-fixes — Hash kan committen + deployen.
5. **Hash log in `40-Logboek/handover-<datum>.md`:** alles wat hij
   deed, zodat Juan terugkomst-context heeft.

---

## Dagelijkse rhythm — eerste 30 dagen

### Elke werkdag, 09:00 (5 min)

- Open `/philly/audit` filter laatste 24u
- Open hello@ inbox
- Open `alerts@juandiazllc.com` voor cron-alerts
- Triage: KRIT/HIGH = nu, MED = vandaag, LOW = deze week

### Elke vrijdag, 17:00 (15 min)

- Tel support-tickets afgehandeld deze week per categorie
- Update `support-log/2026-XX-XX.md` met patronen
- Update top-10-lijst hierboven als nieuwe patronen verschenen
- Plan komende week: welke fixes prioriteit?

### Elke maandag, 09:00 (10 min)

- Lees support-log van vorige week
- Plan support-tijd voor deze week (default 1 uur/dag)
- Mail eventuele open-issues naar klant: "ik heb je vraag van
  vrijdag nog niet beantwoord, doet vandaag"

---

## Maand-end review (D+30, Do 2026-06-18)

Schrijf een 1-pager met:

- Hoeveel tickets totaal, per severity, per klant
- Top 5 meest-voorkomende issues
- Top 3 fix-acties voor maand 2
- Klant-feedback samenvatting (uit maand-1-feedback-calls)
- Beslissing: ticket-systeem inzetten of nog door op email/telefoon?

Mail naar Hash. Beslis samen of week 5+ andere aanpak nodig heeft.

---

## Wat dit runbook NIET dekt

- **Productieve incidenten** (zie `docs/hetzner-cutover-runbook.md`
  voor cutover-rollback en `docs/customer-1-onboarding-rehearsal.md`
  voor pre-launch issues)
- **Legal disputes** (klant betaalt niet, klant claimt schade): naar
  bedrijfsjurist
- **Beveiligingsincidenten** (data-leak, account-take-over): zie
  separate `docs/security-incident-runbook.md` (te schrijven, niet
  geblokkeerd door customer-#1)
- **Fundamentele productbeslissingen** (gaan we feature X bouwen):
  niet support, dat is product-strategie
