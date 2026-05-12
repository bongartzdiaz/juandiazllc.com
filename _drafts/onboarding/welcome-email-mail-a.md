---
target_path: send via Resend on Mon 18 May 2026 21:00 CET (go-pad)
locale: NL + EN (both included; pick by customer's preferred language)
status: DRAFT — fill TODO placeholders before sending
purpose: Welcome customer #1 the evening before their Tue 19 May go-live.
         Use this version when Friday rehearsal lands 0 KRIT + ≤2 HIGH
         issues (per docs/launch-execution-plan-2026-05-09.md).
---

# Mail A — Welcome customer #1 (go-pad)

**Send time:** Mon 18 May 2026, 21:00 CET (sharp)
**Send from:** hello@lucen.ai (verify DKIM/SPF first — see
              `docs/email-deliverability-checklist.md`)
**Attachment:** signed side letter PDF (per
              `_drafts/legal/beta-side-letter-en.md` or
              `_drafts/legal/beta-side-letter-nl.md`)
**Pre-send checklist:**
- [ ] Replace `<TODO: Customer name>` × 4
- [ ] Replace `<TODO: Login link>` × 2
- [ ] Replace `<TODO: Calendly URL>` × 2
- [ ] Replace `<TODO: Juan NL phone>` × 2
- [ ] Replace `<TODO: org name>` (used in greeting)
- [ ] Attach signed side letter (PDF)
- [ ] Send to customer email + BCC hello@lucen.ai

---

## NL version

**Subject:** Welkom bij DEUS, <TODO: voornaam> — morgen 09:00 ben je live

Hi <TODO: voornaam>,

Welkom. Morgen om 09:00 ben jij de eerste betalende klant op DEUS.

Hier is je toegang:

- **Login:** <TODO: Login link>
  Open de link, kies een wachtwoord (minimaal 12 tekens), en je
  bent binnen.
- **FAQ:** [10 vragen die je waarschijnlijk hebt](https://juandiazllc.com/nl/help/getting-started)
- **Side letter:** in de bijlage. Dit is je lifetime €99/maand
  prijsslot, op papier.

**Wat je morgen ervaart:**

Een vijf-stappen wizard (3-5 minuten) waarin je je profiel, je
organisatie, je branche, en je team aangeeft. Daarna verbind je je
Google- of Microsoft-agenda — alleen lezen, transparant in detail.
Vervolgens land je op je dashboard met drie quick-start kaartjes:
voeg een contact toe, maak een deal, importeer een CSV.

Als je vastloopt — werkt iets niet, of klopt iets niet — bel me
direct: <TODO: Juan NL phone>. Ik ben morgen tussen 09:00 en 18:00
bereikbaar. Geen ticket-systeem, geen wachtrij, gewoon mijn telefoon.

Heb je vóór dinsdag nog vragen, mail terug op deze thread. Anders
spreken we morgen.

Tot dinsdag,
Juan

P.S. — Voor de duidelijkheid: je bent niet "klant #1 die we testen
op". Je bent klant #1 die DEUS mede vormgeeft. Dat is waarom je de
lifetime-prijs krijgt. Je feedback heb ik nodig.

---

## EN version

**Subject:** Welcome to DEUS, <TODO: First name> — tomorrow 09:00 you're live

Hi <TODO: First name>,

Welcome. Tomorrow at 09:00, you'll be the first paying customer on
DEUS.

Here's your access:

- **Login:** <TODO: Login link>
  Open the link, set a password (12 characters minimum), and you're in.
- **FAQ:** [10 questions you probably have](https://juandiazllc.com/en/help/getting-started)
- **Side letter:** attached. This is your lifetime €99/month price
  lock, on paper.

**What tomorrow looks like:**

A five-step wizard (3-5 minutes) where you set your profile, your
organisation, your industry, and your team. Then you connect your
Google or Microsoft calendar — read-only, transparent on details.
After that you land on your dashboard with three quick-start cards:
add a contact, create a deal, import a CSV.

If you get stuck — anything doesn't work, anything seems off —
call me directly: <TODO: Juan NL phone>. I'm reachable tomorrow
between 09:00 and 18:00 CET. No ticket system, no queue, just my
phone.

If you have questions before Tuesday, reply on this thread. Otherwise
we speak tomorrow.

Until Tuesday,
Juan

P.S. — To be clear: you're not "customer #1 we're testing on".
You're customer #1 who shapes DEUS with us. That's why you get the
lifetime price. I need your feedback.

---

## Why this works (internal notes — not in email)

- **Subject "morgen 09:00 ben je live"**: time-anchored. Customer
  knows when. Anti-pattern: "Welcome to DEUS" alone — generic,
  goes to promo tab.
- **One call to action**: open login link. Side letter + FAQ are
  reference, not extra steps.
- **Phone number twice**: once before "what to expect", once in
  conclusion. Reduces "should I bother him?" friction.
- **P.S. flips the framing**: "test subject" → "co-shaper". This
  is the single most-important sentence for trust. Customer
  remembers P.S. better than body.
- **No marketing fluff**: no "exciting!", no "thrilled!", no
  "journey". Customer is paying €99-495/month — they want a
  competent operator, not a marketer.

## Failure modes

- **Mail in spam**: see `docs/email-deliverability-checklist.md`
  for SPF/DKIM/DMARC. If score <9/10 on mail-tester.com, do NOT
  send Monday 21:00 — fix and reschedule to Tuesday morning.
- **Customer replies with question**: respond same evening if
  before 23:00, otherwise Tuesday 08:30 with apology + answer.
- **Customer replies cancelling**: see /support-runbook section
  "Klant vraagt om korting" pattern — fold gracefully.
