# Launch Execution Plan — Vr 2026-05-09 09:00–13:00

Eén ochtend werk om customer #1 (Di 19 mei) en Hetzner-cutover (Vr 15 mei
21:00) te de-risken. Lees dit niet eerst helemaal door — werk tijd-blok
voor tijd-blok af. Issue-log staat onderaan.

**Doelstelling 13:00:** alle blokken afgevinkt, rehearsal-runbook
end-to-end gedraaid, cutover-plan geschreven, klant-communicatie-mail
in concept, issue-log ingevuld.

**Voorbereiding (do dit nu, Do-avond):**

- [ ] Verse e-mail klaarzetten voor staging-test (`+rehearsal@`-alias of
      ander mailbox)
- [ ] Google- of Microsoft-kalender met minimaal 2 events in komende 7
      dagen klaar
- [ ] Stripe test-key in staging verified (`STRIPE_SECRET_KEY` start met
      `sk_test_`)
- [ ] `pnpm install` + `pnpm db:generate` lokaal
- [ ] Eén tab open: dit document. Eén terminal open. Geen Slack.

---

## 09:00 — Cold start + preflight (30 min)

**Actie:**

1. Open `docs/customer-1-onboarding-rehearsal.md`. Spiek 5 min, zodat je
   de fasenamen kent.
2. Lokale staging-omgeving op: `pnpm dev` in repo-root, separate
   terminal `pnpm prisma studio` op port 5555.
3. `curl -s http://localhost:3000/philly/api/health | jq` — verwacht
   `database.ok=true`, statuscode 200, latency <500 ms.
4. Open `/status` in browser. Alle componenten groen.

**Verwacht resultaat:** dev-server draait, `/health` retourneert 200,
`/status` is groen, je weet welke fasen vandaag aan bod komen.

**Wat als het breekt:**

- `/health` 503 → zoek welke check faalt (`database`, `supabase_auth`,
  `stripe`, `email_provider`). DB faalt? `DATABASE_URL` env. Stripe
  faalt? `STRIPE_SECRET_KEY` env. Email faalt? `RESEND_API_KEY` env.
- `/status` rood → log naar issue-log, ga door met staging-test
  zonder te wachten op fix. Productie pas vóór cutover groen.

---

## 09:30 — Rehearsal Phase 0 + 1: invite-flow (30 min)

**Actie:** Volg `docs/customer-1-onboarding-rehearsal.md` Phase 0
(Preflight) + de eerste fase die invite-creatie + acceptance behandelt.

Concreet:

1. Operator-account: ga naar `/philly/settings/team`, verstuur invite
   naar je test-mailbox.
2. Open mail in test-mailbox (Resend dashboard als fallback). Klik
   accept-link.
3. Stel wachtwoord in. Log in. Land op onboarding wizard step 1.
4. Doorloop wizard step 1–4 (Profiel → Org → Industry → Team).

**Verwacht resultaat:**

- Invite-mail komt binnen <30 sec
- Token werkt eenmaal en niet daarna (klik 2× om dat te bewijzen)
- Wachtwoord-validatie blokkeert <12 chars
- Wizard slaat per stap op (refresh halverwege moet step bewaren)

**Wat als het breekt:**

- Mail komt niet → check Resend dashboard logs, DKIM/SPF status,
  rate-limit logs. Issue-log severity HIGH.
- Token-replay werkt → KRITIEK. Stop, fix vóór alles anders.
- Wizard verliest state → MED, fixbaar in 30 min, log + door.

---

## 10:00 — Rehearsal Phase 2: kalender-OAuth (30 min)

**Actie:** Wizard step 5 — connect Google OF Microsoft kalender.

1. Klik "Connect Google" (of "Connect Microsoft").
2. Doorloop OAuth-consent met je test-account.
3. Kom terug op wizard, zie "Connected as <email>".
4. Ga naar `/philly/settings/integrations` → controleer "Real-time sync
   · renews in 6d" badge zichtbaar.
5. In Prisma Studio: `CalendarConnection` rij staat er, `status=active`,
   `accessTokenEnc` gevuld (encrypted). `CalendarChannel` rij staat er,
   `expiresAt` is ~6 dagen vooruit (Google) of ~70 uur (Microsoft).
6. `curl /philly/api/calendar/external-events?provider=google&from=...&to=...`
   — moet je eigen 2+ events teruggeven, genormaliseerd.

**Verwacht resultaat:** OAuth round-trip werkt, push-sync subscribe
slaagt, events komen door als JSON, badge in UI klopt.

**Wat als het breekt:**

- OAuth callback redirect naar `/login` ipv `/onboarding` →
  `PUBLIC_PHILLY_PATHS` middleware-allowlist check.
- `?error=provider_not_configured` → env vars `GOOGLE_OAUTH_CLIENT_ID`
  + `_SECRET` ontbreken in staging.
- Push-sync subscribe faalt stilletjes → check `NEXT_PUBLIC_APP_URL`
  is gezet (anders is subscribe een no-op per design).
- Events leeg → `singleEvents`-param Google check, `$top` Microsoft
  check. Meestal scope-issue: re-consent met `prompt=consent`.

---

## 10:30 — Rehearsal Phase 3: Stripe checkout + portal (30 min)

**Actie:**

1. `/philly/settings/billing` → klik "Start free trial" op Starter
   (€49/maand).
2. Stripe Checkout: kaart `4242 4242 4242 4242`, expiry willekeurig
   in toekomst, CVC `123`, postcode `1011 AB`.
3. Submit. Redirect terug naar `/philly/settings/billing?session_id=...`.
4. Wacht 5 sec op webhook. Refresh page. "Current plan: Starter ·
   trialing · cancels in 14d".
5. Klik "Manage subscription" → Stripe Portal opent. Probeer plan-wijzig
   naar Professional. Terug naar app, refresh, "Professional".
6. In Prisma Studio: `Subscription` rij met `status=active`, juiste
   `seatCount`, `stripeSubscriptionId` gevuld.
7. Audit-log: `/philly/audit` → twee rijen (subscription create-intent
   + portal-access).

**Verwacht resultaat:** end-to-end Stripe flow werkt, webhook arriveert,
DB synct, audit-log bevat de juiste sporen.

**Wat als het breekt:**

- Webhook arriveert niet lokaal → `stripe listen --forward-to
  localhost:3000/philly/api/billing/webhook` draait? `whsec_…` matcht
  `STRIPE_WEBHOOK_SECRET`?
- Portal redirect 500 → `getAppBaseUrl()` ontbreekt env. Check
  `NEXT_PUBLIC_APP_URL`.
- Audit-row ontbreekt → `logAudit` call in route ontbreekt of `userId`
  scope is null. KRITIEK voor compliance, log + fix.

---

## 11:00 — Rehearsal Phase 4: first-day walkthrough + DSAR (30 min)

**Actie:**

1. Volg `customer-1-onboarding-rehearsal.md` Phase 4: maak een contact,
   een deal, importeer 5 contacten via CSV (`docs/sample-import.csv` of
   maak er een).
2. `/philly/contacts` → voeg attribute toe via AI-action (als
   geconfigureerd in staging).
3. `/philly/settings/privacy` → klik "Export my data". Verifieer JSON
   download met versie `1.0.0`. Open in editor — geen `passwordHash`,
   geen `twoFactorSecret`, geen `accessTokenEnc`.
4. Klik "Delete my account" → typed-DELETE confirmation modal. Annuleer
   (NIET bevestigen, je hebt het account nog nodig).
5. `/help` → 20 articles tonen, zoek naar "calendar", artikel opent.
6. `/status` herchecken — alles nog groen na 1 uur load.

**Verwacht resultaat:** alle dagelijkse customer-acties werken, DSAR
export bevat alleen non-secret data, help-center is doorzoekbaar.

**Wat als het breekt:**

- DSAR bevat secret veld → KRITIEK. Stop. Fix
  `lib/philly/dsar.ts:exportShape()` direct.
- CSV-import: `=cmd|...` rij komt door zonder neutralisatie → KRITIEK
  (formula injection). Check `csv-parse.ts` neutralization.
- Help-search 0 results → indexer staat uit of articles ontbreken.

---

## 11:30 — Issue-triage + quick-fix sweep (30 min)

**Actie:**

1. Alles hierboven gevonden → schrijf in issue-log onderaan.
2. Triage per item: KRITIEK (blokkert customer #1) / HIGH (irriteert
   customer #1) / MED (kan wachten tot week 2) / LOW (ooit).
3. KRITIEK + HIGH: fix nu, niet later. Per fix: branch, commit,
   `pnpm test` (verwacht 358/358 of meer).
4. Als er meer dan 5 KRITIEK/HIGH zijn: stop, push customer #1 naar
   Wo 20 mei. Mail klant vandaag, geen verrassingen op maandag.

**Verwacht resultaat:** issue-lijst is geprioriteerd, blocker-fixes
gecommit, test-suite groen, je weet of Di 19 mei haalbaar blijft.

**Wat als het breekt:**

- Test-suite breekt na fix → revert, log als deferred. Geen merge
  zonder groen suite.
- Meer dan 5 blockers → activeer "push naar Wo 20 mei"-pad
  (template-mail in sectie 13:00 hieronder).

---

## 12:00 — Cutover-plan finaliseren (30 min)

**Actie:** Open `docs/hetzner-cutover-runbook.md`. Werk de pre-flight
T-7-checklist af (we zitten op T-6, dichtbij genoeg):

1. Hetzner GEX44 status: provisioned, IP genoteerd, reverse-DNS gezet.
   Niet? Order vandaag, anders verschuift cutover automatisch.
2. SSH-key in Hetzner Robot. Test: `ssh deus@<ip> echo ok`.
3. DNS-toegang bevestigd (TransIP / Cloudflare / wat het is). Test-login
   gedaan.
4. B2-bucket `deus-backups-eu` aangemaakt, app-key in `1Password`.
5. Operator-laptop heeft `caddy`, `postgres-client`, `restic` lokaal.
6. Rollback-DNS-TTL verlaagd naar 300s vandaag (anders is rollback
   vrijdag-nacht 24u-traag).

Schrijf in issue-log of dit blok complete is. Niet complete = cutover
verschuift naar Vr 22 mei (week na customer #1 — minder ideaal).

**Rollback-condities (commit deze in cutover-runbook):**

- Health-check op nieuwe box faalt 3× in eerste 5 min na DNS-flip →
  rollback DNS, postmortem maandag.
- Auth-migratie loss-rate >1% (gebruikers kunnen niet inloggen) →
  rollback.
- Postgres-restore faalt of restore-tijd >15 min → rollback, plan
  cutover een week later met betere backup-flow.
- Customer #1 belt vóór maandag dat iets niet werkt → rollback,
  postmortem.

**Verwacht resultaat:** je weet of de cutover Vr 15 mei 21:00 doorgaat
of een week verschuift. Beslissing in issue-log.

---

## 12:30 — Klant-communicatie + go/no-go besluit (30 min)

**Actie:**

1. Schrijf 2 mails (concepten, nog niet versturen):

   **Mail A — go-pad: bevestiging customer-#1 onboarding Di 19 mei**

   ```
   Onderwerp: DEUS toegang — dinsdag 19 mei

   Hi <naam>,

   Dinsdag 19 mei is je DEUS-werkplek live. Je krijgt maandagavond
   een invite-mail met je login-link. Eerste sessie heb ik vrijdag
   uitgebreid gerepeteerd; alles werkt.

   Tussen vrijdag 15 mei 21:00 en zaterdag 16 mei 03:00 verhuizen we
   de app naar onze eigen server. In dat venster is de app offline.
   Voor jou geen impact: je begint pas dinsdag.

   Mocht ik vóór maandag een onverwachte fix nodig hebben, dan stuur
   ik je een korte heads-up. Anders hoor je niets meer van me tot
   maandagavond.

   Tot dinsdag,
   Juan
   ```

   **Mail B — no-go-pad: 1 dag uitstel naar Wo 20 mei**

   ```
   Onderwerp: DEUS — kleine schuif naar woensdag 20 mei

   Hi <naam>,

   Kleine update: ik schuif je start van dinsdag 19 mei naar woensdag
   20 mei, 09:00. Reden: vrijdag-rehearsal liet drie dingen zien die
   ik liever vóór jouw eerste sessie afmaak. Geen drama, één
   werkdag extra zekerheid.

   Verder verandert er niets aan onze afspraak.

   Tot woensdag,
   Juan
   ```

2. Beslis NU welke mail past. Criterium: 0 KRITIEK + ≤2 HIGH = go-pad.
   Anders no-go-pad.
3. Mail naar Hash sturen met 1-regel update: "Vrijdag-rehearsal
   afgerond, customer #1 [go/no-go], cutover [door/uitgesteld]."
4. Beide concepten + besluit in issue-log onderaan dit document.

**Verwacht resultaat:** klant-mail klaar voor verzending Ma 18 mei
of Ma 19 mei. Hash weet de status. Jij weet wat je doet.

---

## Issue-log

Format per regel: `datum | severity | beschrijving | fix-status |
commit/branch`

Severity: `KRIT` (blokkert customer #1) / `HIGH` / `MED` / `LOW`.
Fix-status: `OPEN` / `FIXING` / `DONE` / `DEFERRED`.

```
2026-05-09 | KRIT | <voorbeeld>             | OPEN     | -
2026-05-09 | HIGH | <voorbeeld>             | DONE     | abc1234
2026-05-09 | MED  | <voorbeeld>             | DEFERRED | -
```

**Live invullen tijdens elke fase. Niet aan het einde.**

| Datum | Sev | Beschrijving | Status | Commit |
|-------|-----|--------------|--------|--------|
|       |     |              |        |        |
|       |     |              |        |        |
|       |     |              |        |        |
|       |     |              |        |        |
|       |     |              |        |        |
|       |     |              |        |        |
|       |     |              |        |        |
|       |     |              |        |        |

---

## Cutover-plan — Vr 2026-05-15 21:00 CET

Volledig draaiboek staat in `docs/hetzner-cutover-runbook.md`. Dit is
de short-list voor de avond zelf.

**Onderhoudsvenster:** Vr 21:00 – Za 03:00 (6 uur, ruim). Werkelijk
verwacht: 90 min downtime. Rest is buffer + verificatie.

**T-2 uur (19:00):**

- Backup productie-Postgres + Supabase Auth → B2 EU bucket
- DNS-TTL al verlaagd naar 300s sinds Vr ochtend
- Customer #1 heeft Mail A ontvangen (Ma avond)
- `status.juandiazllc.com` op "Scheduled maintenance Friday 21:00"

**T-0 (21:00):**

- Vercel-deployment paused
- Postgres dump → restore op Hetzner-box
- Lucia auth-migratie script (zie cutover-runbook sectie 4)
- Caddy-TLS verificatie via HTTP-01
- DNS A/AAAA flip naar Hetzner-IP

**T+30 min (21:30):**

- Health-check loop op nieuwe `app.juandiazllc.com`
- Login-test met operator-account
- Stripe webhook-endpoint URL update in Stripe dashboard

**T+90 min (22:30) — go/no-go:**

- Health groen + login werkt + één test-deal aangemaakt → DONE
- Anders rollback per condities hierboven

**Communicatie:**

- Geen Slack-update tijdens venster (concentratie)
- Hash krijgt SMS bij start (21:00) + finish (22:30 of rollback)
- Customer #1 krijgt op Ma 19 mei een korte bevestiging dat alles
  klaar staat — niet over het cutover-venster (irrelevante details
  voor klant)

**Rollback-trigger (commit naar geheugen):**

- Faalt health 3× → DNS terug naar Vercel-IP, klaar in <300s
- Faalt auth-migratie → DNS terug, postmortem zaterdag, plan opnieuw
- Postgres restore >15 min of corrupt → DNS terug

---

## Na 13:00

Lunch. Vanavond: niets meer aan code. Zaterdagochtend: Hetzner-box
provisionen als blok 12:00 dat opleverde. Zondag: backup-restore drill
(1 uur, prove dat je data terug kunt halen).

Maandagavond 18 mei: invite naar customer #1, mail A.

Dinsdag 19 mei 09:00: je telefoon staat aan, koffie klaar.
