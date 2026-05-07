# DEUS launch readiness — 2026-05-08

**One-line answer:** seven to eleven working days from today, assuming
the Hetzner cutover lands cleanly on Friday 2026-05-15. Twenty-one
days worst case if the cutover rolls back and we redo it the
following Friday.

The code is **not** the constraint. Operator setup, legal entity
confirmation, and the cutover ceremony are.

---

## What "MVP launch" means here

Customer #1 — a real operator you and Hash have agreed to onboard,
not the team — successfully:

1. Receives a welcome email and clicks the invite link.
2. Creates their organization, picks an industry, gets a seeded
   pipeline.
3. Connects their Google or Outlook calendar in two clicks.
4. Adds at least one contact and one deal.
5. Stays signed in across a workday without anything breaking.

Everything below is what stands between today and that.

---

## Status by category

### Code — green
- 0 KRITIEK / 0 HIGH findings open across the most recent
  `/audit-full` and `/compliance-check` runs.
- 322/322 vitest tests passing.
- TypeScript clean.
- Calendar OAuth + push-sync + delta-sync + renewal cron all shipped.
- Stripe Checkout + Customer Portal + webhook all shipped.
- GDPR Art. 15 (DSAR), Art. 17 (erasure), Art. 32 (encryption,
  rate limits) all closed.
- Multi-tenant readiness (seats, invites, audit log, settings UIs)
  shipped.
- 4 MED + 7 LOW findings remain — all polish, none blocking.

**Code-side estimate to launch: 0 days.** The bundle is shippable.

### Operator-side environment — yellow
Detailed list in `MANUAL_TASKS.md`. The bottleneck. Time-boxable to
about half a day per operator if done in one sitting:

- [ ] Stripe production keys: secret, webhook secret, two price IDs.
- [ ] Google Cloud Console OAuth client (web app, calendar.readonly
      scope, callback URL registered).
- [ ] Microsoft Entra app registration (User.Read, Calendars.Read,
      offline_access; client secret; callback URL).
- [ ] Resend API key + verified `noreply@lucen.ai` sender (SPF, DKIM
      DNS records).
- [ ] `prisma migrate deploy` against the production database
      (calendar_connections, calendar_push_sync, seats_and_invites,
      user_soft_delete migrations).
- [ ] `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, all the rest of the
      env-var list.

**Estimate: half a day of focused work. Can run in parallel with the
Hetzner pre-flight.**

### Legal entity — yellow, blocking
- [ ] Confirm: is "Juan Diaz, LLC" actually a US LLC, an NL BV, or an
      eenmanszaak? KvK number? Registered address?
- [ ] Fill the `[KvK TBD]` and `[address TBD]` placeholders in
      `_drafts/legal/{privacy,dpa,tos,subprocessors}-en.md`.
- [ ] Decide: launch with English-only legal docs and translate later,
      or hold for NL/DE/ES translations.
- [ ] Publish to live paths under `app/[locale]/legal/*`.
- [ ] Add Google + Microsoft + Resend + Stripe + Backblaze + Hetzner
      to the sub-processor list.

**Estimate: one to two hours once the entity question is answered.
The entity question itself is open and only you can close it.**

### Hetzner cutover — yellow, scheduled Friday
Runbook is in place: `docs/hetzner-cutover-runbook.md` plus the nine
migration scripts in `scripts/migrate-to-hetzner/`. Three pre-flight
gates surfaced in `MANUAL_TASKS.md`:

- [ ] DNS TTL drop to 60 seconds 24 hours before cutover.
- [ ] Operator ed25519 SSH key uploaded to Hetzner Robot before the
      bootstrap script runs (it disables password auth — no key, no
      recovery).
- [ ] B2 EU bucket + scoped Application Key + OAuth callback URL
      coexistence (add new alongside the live URL, do not replace
      until the box has been stable for ≥48 hours).

**Estimate: ceremony itself is 2-3 hours Friday evening; pre-flight
items are about an hour each spread across the week.**

### Repo split — yellow, post-cutover
Runbook in `docs/repo-split-cutover.md`. Sequenced so a partial cut
cannot ship stale CRM:

1. Merge PR #12 to `juandiazllc.com main`.
2. Trigger one final Sync Bot run.
3. Verify DEUS-SHARED parity (clone, install, build, test).
4. Hetzner deploys from DEUS-SHARED.
5. Unplug Sync Bot Saturday morning after the box is green for ≥12
   hours.
6. Add CODEOWNERS guardrail.
7. Update the doc set to reflect the split.

**Estimate: half a day of operator work spread across Saturday and
Sunday after Friday cutover.**

### Customer prospect — open
- [ ] Pick the actual customer (RE / hospitality / energy?). The
      product is sector-agnostic but the welcome email and
      onboarding walkthrough land harder if tailored to one vertical.
- [ ] Send the welcome email (`_drafts/onboarding/welcome-email.md`).
- [ ] Walk them through the first-day setup in person or over a
      shared screen.
- [ ] Stand by for support during their first week.

**Estimate: depends entirely on whether the customer is already
warm. If they are, this is half a day of guided setup. If we are
still pitching, the launch date is whatever they say it is.**

---

## Critical path

The longest chain of strictly sequential dependencies looks like:

```
PR #12 polish (today)                                — done now
  ↓
Operator env-var setup                                — half day, you
  ↓
Hetzner pre-flight                                    — 3 items × 1 hr, you
  ↓
Friday cutover (T+0)                                  — 21:00 CET
  ↓
12-hour green window (T+12h)                          — Saturday morning
  ↓
Sync Bot final pass + parity check (T+18h)            — Saturday afternoon
  ↓
CODEOWNERS + docs (T+24h)                             — Saturday evening
  ↓
Customer onboarding walkthrough (T+72h)               — Tuesday
```

If today is Friday 2026-05-08, customer #1 is live **Tuesday
2026-05-19** in the best case.

---

## Risk-adjusted timeline

| Scenario | Probability | Customer #1 live |
|---|---|---|
| Best case — no blockers | 30 % | Tuesday 2026-05-19 (11 days) |
| Likely — 1-2 small blockers | 50 % | Friday 2026-05-22 (14 days) |
| Bad — Hetzner rolls back, redo next Friday | 15 % | Wednesday 2026-05-27 (19 days) |
| Worst — legal entity drags + cutover slip | 5 % | Friday 2026-05-29 (21 days) |

The single biggest source of variance is the legal-entity question
(which is just a clarification on your side, not work) and the
Hetzner cutover itself (where a one-week slip is realistic and not
catastrophic).

---

## What's NOT on the critical path

Useful to remember when something feels urgent and isn't:

- The 4 MED + 7 LOW audit findings still open — pure polish, fix
  post-launch.
- Bundle D4 (calendar event persistence with Art. 9 controls) —
  scheduled, but the read-only meeting-context-on-deal use case is
  what v1.0 sells. Persistence is v1.2.
- AI Attributes on contacts (Attio-style) — v1.2 roadmap.
- SWR rollout — v1.3 roadmap.
- NL / DE / ES translations of the launch release notes —
  post-launch sprint.
- Brand split (`juandiazllc.com → lucen.ai`) — separate calendar.
- DEUS-SHARED auto-CI parity tests — nice-to-have, not blocking.

If any of these get pulled forward at the cost of operator-setup or
cutover-prep, the launch slips. Treat them as future work.

---

## What I would do tomorrow

If you wake up on Friday 2026-05-09 and want to compress the
timeline by a full week, do these three things in this order:

1. **Confirm the legal entity in twenty minutes.** It is a single
   email or call. Once that is in hand, the legal docs unblock and
   the launch isn't legally dependent on anything else.
2. **Spend two hours on the operator env-var spreadsheet.** Stripe,
   Google OAuth, Microsoft OAuth, Resend, Backblaze, Hetzner DNS —
   open the dashboard for each, generate the credentials, drop them
   into a password manager and the Vercel env panel together.
3. **Pick the customer.** Send the welcome email Friday afternoon
   with a "we go live week of the 18th" note. That converts the
   abstract launch date into a commitment that pulls everything else
   forward.

The code is ready. The launch date is now a function of operator
discipline and one phone call.

---

## Open questions

These are the only items I cannot answer or do alone. Listing them so
nothing falls through:

1. Legal entity — what's the name + KvK + address?
2. Customer #1 — who is it, and have they agreed?
3. Pricing — is the €49 / €79 split from `_drafts/pricing/pricing-en.md`
   the published structure on day one, or are we doing a different
   beta-cohort offer for the first three customers (the doc mentions
   "50 % off for first 3", confirm)?
4. Brand on the legal docs — is it "Juan Diaz, LLC d/b/a LucenAI" or
   plain "LucenAI" with Juan Diaz, LLC as the operating company on the
   imprint only?
5. Cutover window — Friday 21:00 CET still the target, or do you want
   to push to a quieter Saturday morning slot?

Drop answers in this doc when you have them; I'll fold the rest of
the launch flow around them.
