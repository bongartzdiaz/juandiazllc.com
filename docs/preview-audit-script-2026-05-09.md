# Preview-audit script — Vr 2026-05-09 09:30–11:30

90 min. Drie persona-sessies + console-sweep + stress-mutate. Tijd-blok
hard, geen overrun. Issues meteen in de issue-log van
`docs/launch-execution-plan-2026-05-09.md` schrijven, niet in dit bestand.

**Voorbereiding (5 min):**

- [ ] `pnpm dev` draait
- [ ] `localhost:3000/philly` opent
- [ ] Verse browser-window (geen extensions, incognito)
- [ ] Test-account ingelogd
- [ ] DevTools open: Console + Network tabs
- [ ] Stopwatch-timer per blok

---

## Sessie 1 — Nieuwe customer, desktop (09:30–09:50, 20 min)

**Persona:** "Anouk, makelaar, 38, gebruikt 1× per maand een nieuw
SaaS-tool. Niet technisch maar wel computer-vaardig."

**Strikt scenario, klik in deze volgorde:**

1. `/login` — log in. Focus eerst op email-veld? Tab-volgorde
   correct? Esc op pop-up = sluit?
2. Land op `/philly`. Console-tab: zero warnings? **Log alle
   warnings/errors.**
3. Open `/philly/contacts/new`. Vul: naam (3 chars), email
   (zonder @), submit. Verwacht: validatie-fout client-side, geen
   500.
4. Cancel-button. **Open opnieuw.** Vul correct, submit. Belandt
   op detail-page?
5. `/philly/deals/new`. Pak willekeurige waarde, datum vandaag.
   Submit. **Refresh de page halverwege** (F5) — state behouden of
   verloren?
6. `/philly/settings/team`. Klik "Invite member". Modal opent.
   - Klik buiten modal → sluit?
   - Open opnieuw, druk Esc → sluit?
   - Open opnieuw, vul email, submit met geldige + ongeldige email.
   - Klik invite. **Wacht.** Na 3 sec: zie je "sent"-toast?
7. `/philly/settings/billing`. Klik "Start trial Starter" (NIET
   doorklikken naar Stripe — alleen modal-trigger checken).

**Log per stap:** wat zag je dat je niet verwachtte?
**Stop op 09:50 ook als je niet klaar bent.**

---

## Sessie 2 — Admin op mobile 375px (09:50–10:10, 20 min)

**Persona:** "Erik, owner-operator hospitality, leest mail op de
trein op zijn iPhone SE."

**Setup:** browser-window naar 375 × 667 (iPhone SE). Refresh.

**Strikt scenario:**

1. `/login` op mobile. Touch-doelen ≥44 px? Tap op email-veld → toetsenbord
   opent zonder layout te breken?
2. `/philly` dashboard. Sidebar collapsed of hamburger? Hamburger
   tap-bare?
3. `/philly/contacts`. Lijst — horizontaal scroll? Tabel responsive?
4. `/philly/settings/team`. Invite-modal — past het op 375px? Submit-button
   bereikbaar of buiten viewport?
5. `/philly/settings/billing`. Plan-cards — naast elkaar of gestapeld?
   "Start trial"-button volledig zichtbaar?
6. `/philly/audit`. Tabel met filter-dropdowns. Werkt date-range
   picker op touch? Komt het scherm-vullend of te klein?
7. `/philly/onboarding/calendar`. "Connect Google"-button — past het?
   "What we read, what we don't" details — opent het accordion?
8. Language switcher: schakel naar NL mid-sessie. Behoudt page state?
   Vertalen alle labels of blijft "Submit" Engels?

**Log per stap:** screenshots van breekgevallen via `preview_screenshot`.
**Stop op 10:10.**

---

## Sessie 3 — Beestmodus + error-injection (10:10–10:30, 20 min)

**Persona:** "Random user, klikt op alles, internet hapert."

**Setup:** browser terug naar desktop. DevTools Network tab → "Throttle
Slow 3G".

**5 minuten per surface, totaal 4 surfaces:**

### A (10:10–10:15) — `/philly` dashboard
- Klik elk widget, elke tab, elke link in 5 min.
- Scroll naar bottom + top, 3× heen-en-weer.
- Open user-menu, language-switcher, theme-toggle.
- **Console-tab observeer:** zero red errors target.

### B (10:15–10:20) — `/philly/contacts` + `/philly/deals`
- Random klik op rijen, filters, sort-headers, bulk-checkbox.
- Open contact-detail, swipe terug, andere contact, swipe terug.
- Bulk-select 3 items, klik bulk-action-dropdown.

### C (10:20–10:25) — `/philly/settings/*` (alle subpages)
- Bezoek elke subpage in volgorde: profile, team, billing, privacy,
  integrations, audit-log, danger-zone.
- Trigger 1 modal per subpage minimum.
- Op "Delete account" modal: typ "delet" (niet "DELETE") — moet block.
  Typ "DELETE" → werkt (NIET bevestigen, annuleer).

### D (10:25–10:30) — Network-failure-simulatie
- DevTools → Network → "Offline".
- Probeer een actie: contact saven, invite versturen.
- Verwacht: error-toast, geen 500-page, retry-mogelijk.
- Network terug naar online → werkt actie alsnog?

**Stop op 10:30.**

---

## Console + Lighthouse sweep (10:30–10:45, 15 min)

**Mechanisch werk, hersenen-uit:**

1. Open elke pagina sequentieel:
   - `/philly`
   - `/philly/contacts`
   - `/philly/deals`
   - `/philly/settings/billing`
   - `/philly/onboarding/calendar`
2. Per pagina: refresh, wacht 5 sec, screenshot Console-tab.
3. Lighthouse audit per pagina (DevTools → Lighthouse → Generate).
   Categorieën: Performance, Accessibility, Best Practices.
4. Log scores. Onder 90 op a11y = HIGH issue.
5. **Specifiek zoeken in console:**
   - React key warnings → MED
   - Hydration mismatch → HIGH
   - "Warning: failed prop type" → MED
   - Deprecation notices → LOW
   - 4xx/5xx requests in Network → varies

**Stop op 10:45.**

---

## Stress-mutate sweep (10:45–11:00, 15 min)

**5 forms × 3 min elk:**

### Form 1 — Invite-email (3 min)
- Submit leeg → moet client-side blokkeren
- Submit `<script>alert(1)</script>` → moet behandeld als string
- Submit `robert');DROP TABLE users;--` → moet werken zonder DB-error
- Submit `🚀🚀🚀@example.com` → emoji handling
- Submit 5000-char string → max-length validation?

### Form 2 — Stripe checkout retry (3 min)
- Block `*/billing/webhook*` URL via DevTools → Network → Block.
- Doe checkout met test-card. Komt redirect terug?
- UI graceful (toont "processing")? Of stuck loading state?

### Form 3 — Calendar OAuth callback failure (3 min)
- Block `*/calendar/oauth/callback*` URL.
- Klik "Connect Google".
- Op return: zie je een nuttige error-state of een raw 500?

### Form 4 — Deal-create edge values (3 min)
- Titel: `—` (em-dash only) → werkt of blokkeert?
- Waarde: `-1` → moet blokkeren of corrigeren
- Datum: `1900-01-01` → past in DB? Toont weird?
- Datum: `9999-12-31` → idem

### Form 5 — DSAR delete typed-confirm (3 min)
- `/philly/settings/privacy` → "Delete my account".
- Typ "delet" → button moet disabled
- Typ "DELETE my account please" → idem disabled
- Typ "DELETE" → enabled, klik annuleer
- Sluiten via Esc → modal weg, geen actie uitgevoerd

**Stop op 11:00. Ga door naar issue-triage in execution-plan
blok 11:30.**

---

## Wat te doen bij KRITIEK gedurende sessie

Definitie: **KRITIEK** = zou customer #1 op Di 19 mei direct
opmerken én blocked zijn. Voorbeelden: login werkt niet, modal
sluit niet, payment-flow stuk, data-leak naar verkeerde tenant.

Actie:
1. Stop de huidige sessie. Niet doorklikken.
2. Schrijf bug-report in execution-plan issue-log met severity KRIT.
3. Probeer 30-min fix. Lukt → commit, doorgaan met script.
4. Lukt niet → activate "push customer #1 naar Wo 20 mei"-pad.

## Wat te doen bij HIGH

Niet stoppen. Log, doorgaan, pak bij blok 11:30 op.

## Wat te doen bij MED/LOW

Log, doorgaan, defer naar week 2.

---

## Tools die je gebruikt

| Wanneer | Tool | Why |
|---|---|---|
| Per pagina-load | DevTools Console | Warnings/errors zien |
| Per modal | Esc + click-outside | Modal-correctness |
| Mobile-sessie | DevTools Device-toolbar 375×667 | Responsive bugs |
| Per pagina-load | DevTools Network tab | Failed requests, slow APIs |
| Sessie 3D | DevTools Network → Offline | Faalmodus testen |
| Console-sweep | DevTools Lighthouse | A11y + perf scores |
| Per stap | Stopwatch | Time-box hard |

Geen screenshot-spam. Alleen screenshots van bugs voor de issue-log.

---

## Klaar op 11:00?

Tel issues per severity. Vul in:

```
Sessie 1 (desktop happy):    KRIT __  HIGH __  MED __  LOW __
Sessie 2 (mobile admin):     KRIT __  HIGH __  MED __  LOW __
Sessie 3 (beestmodus + net): KRIT __  HIGH __  MED __  LOW __
Console + Lighthouse:        KRIT __  HIGH __  MED __  LOW __
Stress-mutate:               KRIT __  HIGH __  MED __  LOW __
TOTAAL:                      KRIT __  HIGH __  MED __  LOW __
```

Beslismatrix:

| Totaal KRIT + HIGH | Actie |
|---|---|
| 0 | Customer #1 Di 19 mei = GO. Mail A versturen Ma 18 mei. |
| 1–2 | Fix vandaag in blok 11:30, Customer #1 = GO. |
| 3–5 | Fix vandaag, sanity-check zaterdagochtend, Customer #1 = GO mits sat-check OK. |
| 6+ | Mail B (uitstel naar Wo 20 mei). Hash mailen. |
