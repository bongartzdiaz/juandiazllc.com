# Customer #1 — First-Day Script

**Datum:** Di 2026-05-19, 09:00–10:00 CET (+ check-in 16:00)
**Doel:** klant ervaart de eerste 60 minuten met DEUS als
"production-grade software gerund door iemand die hen ziet".

Dit is **niet** een operator-runbook (zie
`docs/customer-1-onboarding-rehearsal.md`). Dit is wat de klant
voelt, in tijd-blokken, met de operator-acties van Juan parallel
genoteerd.

---

## T-12 uur — Maandagavond 18 mei 21:00

**Klant ontvangt:** welkom-mail (zie `_drafts/onboarding/welcome-email.md`)
met invite-link, login-credentials, 2 zinnen "morgen 09:00 ben ik
bereikbaar als je vastloopt — bel +31 6 …".

**Operator (Juan) doet:**
- Verstuur invite via `/philly/settings/team` om 21:00 (niet eerder
  — mensen lezen mail 's avonds, niet middag)
- SMS naar klant: "Mail is verstuurd. Check je spam als je 'm niet
  ziet binnen 5 min. Tot morgen."
- Open `/philly/audit` op je telefoon — verifieer invite-row
  bestaat
- Telefoon op stille modus, niet op vliegtuig — je moet bereikbaar
  zijn

---

## T-0 — Di 19 mei 09:00

**Klant doet:** klikt invite-link in mail, opent in browser.

**Wat ze zien (in volgorde, eerste 10 sec telt):**

1. URL = `app.juandiazllc.com/onboarding?token=…` (post-cutover) of
   `philly.juandiazllc.com/...` (pre-cutover fallback)
2. Pagina-load <1.5s op gemiddelde verbinding
3. Bovenaan: DEUS-logo, één regel "Welkom <voornaam>" (uit invite
   gehaald)
4. Eén veld: wachtwoord instellen. Geen wizard nog.
5. Onder formulier: "Vastgelopen? Bel Juan: +31 6 …" — letterlijk
   in HTML, niet in een help-bubble. Drempelverlaging.

**Operator (Juan) doet:**
- 09:00 — open `/philly/audit` filter op klant-org. Refresh elke 2
  min in eerste half uur.
- Ververs `/philly/api/health` in tweede tab — gewoon zekerheid

**Wat NIET zien:** geen popup "accept cookies", geen feedback-
widget, geen Intercom-bubble, geen newsletter-signup. Je vraagt
niets, ze geven jou hun aandacht.

---

## T+2 min — wachtwoord ingesteld

**Klant doet:** typt wachtwoord (12+ chars), klikt "Stel in".

**Wat ze zien:**
1. Korte success-flash ("Account aangemaakt") — 1.5 sec, dan weg
2. Land direct op `/philly/onboarding` step 1 van 5
3. Step-indicator bovenaan: `1 ─ 2 ─ 3 ─ 4 ─ 5`
4. Heading: "Vertel ons wie je bent" (NL) — niet "Profile setup"
5. Drie velden: voornaam (al ingevuld uit invite), achternaam, rol
   in organisatie

**Audit-log:** rij verschijnt (`user.create_password`). Juan ziet
op zijn dashboard: "Klant is binnen."

---

## T+3-15 min — wizard step 1 t/m 4

Klant doorloopt:
- **Step 1:** profiel (naam, rol)
- **Step 2:** organisatie-naam, KvK (optioneel), adres (optioneel)
- **Step 3:** branche-keuze: Real Estate / Hospitality / Anders
- **Step 4:** team-grootte ("Hoeveel mensen ga je uitnodigen?" —
  geen seat-paywall, gewoon vraag)

**Wat ze zien doorlopend:**
- "Vorige" + "Volgende" knop, beide groot, links + rechts
- Refresh-tolerant (elke step opslaat)
- "Skip" optie waar relevant — ze kunnen later vullen
- Onderaan elke pagina: "Vragen? Bel Juan." Permanent zichtbaar

**Operator (Juan) doet:**
- Niets actief. Wel kijkend op `/philly/audit`. Als step 3 5+
  minuten duurt → branche-keuze is verwarrend, log als HIGH-issue.

**Stuck-cases die KUNNEN gebeuren** (ranked likelihood):

| Probleem | Indicator | Fix-pad (Juan) |
|---|---|---|
| KvK-veld validatie te streng | klant blijft op step 2 | Bel direct: "Skip dat veld, vul later in via settings" |
| Branche-keuze "Anders" geeft generic UI | klant gefrustreerd na step 3 | Bel: "Kies Real Estate voor nu, we passen aan" |
| Wachtwoord eis onduidelijk | bounce op T+2 min | Eis-tekst in step 0 verduidelijken — pre-fix vrijdag |

---

## T+15-25 min — wizard step 5 (kalender)

**Klant doet:** klikt "Connect Google" of "Connect Microsoft".

**Wat ze zien:**
1. OAuth-consent screen (Google/Microsoft, niet onze UI)
2. Lijst scopes: read-only kalender, profiel-info, "offline access
   for sync"
3. Klant accepteert → terug op DEUS
4. Wizard step 5: groen vinkje "Connected as <email>"
5. Onder vinkje: "Real-time sync · vernieuwt over 6 dagen"
6. Details-accordion: "Wat we lezen, wat we niet lezen"
   (transparency-paneel)

**Wat NIET:**
- Geen "we have indexed 247 events" big-data-flex (creepy)
- Geen "AI is leerklaar!" hype
- Geen vraag om Google Drive of Gmail (alleen kalender)

**Operator (Juan) doet:**
- 09:25 (geschat) — klant heeft nu OAuth gedaan. SMS als check-in:
  "Zie dat je verder bent. Loopt het?"

---

## T+25-30 min — wizard finish

**Klant doet:** klikt "Klaar". Land op `/philly` dashboard.

**Wat ze zien:**

1. Welkom-toast bovenaan: "Welkom bij DEUS, <voornaam>." 5 sec, dan
   weg.
2. Dashboard heeft 4 widgets, in deze volgorde:
   - **Quick-start cards** (3 acties: "Voeg eerste contact toe",
     "Maak eerste deal", "Importeer CSV")
   - **Vandaag in jouw kalender** (uit Google sync)
   - **Recent contacts** (leeg, met empty-state "Nog geen contacten
     — klik hierboven")
   - **Pipeline** (leeg, empty-state "Voeg je eerste deal toe")
3. Sidebar: 6 items max (Dashboard, Contacts, Deals, Tasks,
   Calendar, Settings)

**Niet:** geen 12 widgets, geen welkomstvideo-modaal, geen
"complete je profiel"-progress-bar.

---

## T+30-45 min — eerste echte actie

**Drie waarschijnlijke paden, ranked:**

### Pad A (60% kans) — Klant maakt eerste contact aan
- Klikt quick-start card "Voeg eerste contact toe"
- Modal of dedicated page (jullie keuze, beide werken)
- Vult: naam, email, telefoon, organisatie
- Save → land op contact-detail-page

**Operator-doet:** zie audit-row `contact.create`, geen actie nodig.

### Pad B (25%) — Klant importeert CSV
- Quick-start card "Importeer CSV" → upload-pagina
- Drag-drop of file-picker
- Mapping-preview, klant verifieert kolommen
- Submit → batch-import

**Risico:** als CSV >100 rows, klant verwacht progress-indicator.
Check: bestaande UI heeft die (zie `lib/philly/import/csv-parse.ts`
diff).

### Pad C (15%) — Klant exploreert settings
- Klikt sidebar Settings → tabbed pages
- Bekijkt billing tab, team tab, integrations tab
- Mogelijk frustratie: "ik wil deal aanmaken, niet settings"

**Operator-doet:** als 10 min later nog geen contact/deal in audit-log
→ SMS: "Vragen over settings? Bel even."

---

## T+45-60 min — natural pause-point

**Klant heeft typisch:** 1-3 contacten, mogelijk eerste deal,
kalender-events zichtbaar.

**Verwachte vragen die ze NU stellen** (proactief FAQ stuurt 80%
weg, zie `_drafts/customer/first-10-questions-en.md`):

- "Hoe nodig ik mijn collega uit?" → wijzen naar Settings → Team
- "Kan ik dit op mobiel?" → ja, geen native app, web werkt
- "Waar is mijn data?" → Falkenstein DE, in welkom-mail al gelinkt
  naar privacy-page

---

## T+60 — proactieve check-in (Juan, NIET klant)

**10:00 sharp — Juan stuurt SMS:**

> Heb je het aan de praat? Goeie eerste indrukken/vragen?
> Bel maar als iets vreemd is. Anders bel ik 16:00.

NIET via Slack-bot, NIET via geautomatiseerde email. Persoonlijk
SMS. Eén regel.

**Klant antwoordt typisch binnen 15 min:**
- "Ja, draait!" → fijn. 16:00 alsnog kort bellen.
- "Loopt vast bij X" → bel direct.
- Geen antwoord binnen 30 min → nudge SMS: "Hoor het graag — anders
  bel ik om 11:00 even."

---

## T+8 uur — 16:00 check-in call

**5 minuten max. Juan vraagt:**

1. Wat heb je gedaan vandaag?
2. Wat was raar / onverwacht?
3. Wat mis je nu het meeste?

**Schrijf antwoorden letterlijk op.** Dit zijn de 3 belangrijkste
data-points die je krijgt in week 1. Niet samenvatten, niet
interpreteren. Letterlijke quotes.

---

## Rest van de dag — Juan-werk parallel

Tijdens klant-eerste-uur (09:00-10:00):
- Geen development-werk (focus op audit-log + telefoon)
- Geen Slack-meetings
- Geen email-bezuiniging

10:00-12:00:
- Update `MEMORY.md` met "customer #1 ervaring eerste uur"
- Schrijf 3 quotes-uit-call op in vault `40-Logboek/2026-05-19.md`
- Update `docs/customer-1-onboarding-rehearsal.md` met wat anders
  ging dan rehearsal voorspelde

12:00-16:00:
- Normale werk, maar telefoon op aan (niet op stille)
- `/philly/audit` open in een tab, ververs elke 30 min

16:00:
- Check-in call (5 min)
- Schrijf antwoorden in vault
- 3 letterlijke quotes → daarvan komt jouw week-1 backlog

---

## Faal-staat: customer #1 ervaart KRITIEK probleem

Definitie: kan niet inloggen, ziet 500-pagina, krijgt error in
oauth-flow, payment-flow stuk.

**Juan-actie binnen 5 min na detectie:**

1. Bel direct (geen mail, geen SMS — bel)
2. Excuses, eerlijk: "Iets is stuk, geef me 30 min."
3. Hang op, fix.
4. Bel terug zodra fix live is.
5. Volgende dag: "Hoe kunnen we dit goedmaken? Eén maand gratis
   bovenop je beta-jaar?"

**Niet:** uitleggen waarom-het-stuk-is in eerste call. Repareren
eerst, post-mortem later.

---

## Niet-script-bare dingen

- **Persoonlijke noot in welkom-mail.** Eén regel. "Bedankt dat je
  als eerste de gok neemt — ik heb al je feedback nodig en jij
  krijgt mijn directe lijn." Niet copy-paste-baar voor klant #2.
- **Een bevestigings-mail post-onboarding eind dag 1**, één regel:
  "Geslaagd. Ik bel morgen 09:00 — hetzelfde tijdstip als vandaag
  — om te kijken hoe dag 2 voelt." Eén-regel-mails wekken meer
  vertrouwen dan lange.

---

## Wat dit script bewijst (intern)

DEUS verkoopt geen software. Het verkoopt: "iemand die je terug
gaat bellen". Per-seat-pricing, AI-features, GDPR-compliance —
allemaal table stakes. Wat jouw differentiator op dag 1 is, is dat
de oprichter binnen 1 uur weer mailt.

Dat schaalt niet voorbij klant 20-30. Dat is OK. Klant 1-10 is voor
deze trust-bouw. Klant 11-30 is voor de eerste hire (support-rol).
Klant 31+ is voor het schalen-systeem.

Vandaag = klant 1.
