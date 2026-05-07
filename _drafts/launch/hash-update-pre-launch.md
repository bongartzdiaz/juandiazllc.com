---
target: 1:1 to Hash, Sun 2026-05-18 evening before launch
length: 1 page, 5 minute read
tone: factual co-owner update, no marketing, no hand-holding
---

# DEUS launch — Hash update

**TL;DR:** ships Tue 19 May. PR #12 is launch-clean (358 tests, zero
high findings). All operator gates closed. Customer #1 onboards
together with me. Here's what you need to watch.

---

## What's live on Tuesday

Auth, seats, invites, CSV import, Stripe billing + Customer Portal,
GDPR export and deletion, audit log, calendar OAuth + push-sync to
Google and Outlook, meetings on contact pages, public /status page,
help center + drawer, onboarding wizard, four locales (EN/NL/DE/ES).

22 commits on PR #12. ~9,000 LOC net. Zero KRITIEK / zero HIGH on
the latest compliance pass.

## What I need from you in week one

1. **Customer #1 — observation, not intervention.** I onboard them
   live Tuesday. Don't jump in with feature suggestions in the first
   week. We're stress-testing what we have, not adding to the pile.

2. **Eyes on the dashboard.** `/status` page is public; bookmark it.
   `/api/health` returns the same data as JSON. Sentry is wired but
   noise-budget is unset — expect a few false alarms before we tune
   the thresholds.

3. **Sub-processor list.** Google + Microsoft need to be added to
   `_drafts/legal/subprocessors-en.md` before customer #1 signs the
   DPA. ~30 min of legal review work. I can't ship that — it needs
   your sign-off as co-owner.

4. **Brand split decision (post-customer-#1).** Folder name
   `app/philly/*` stays for now. Post-launch we rename to
   `app/deus/*` and split `juandiazllc.com → lucen.ai`. Worth a
   30-min call in week two to decide cutover timing.

## What I'm NOT shipping in v1.0 (so you can answer questions)

- **Two-way calendar sync** — read-only today. Write-back end of May
  (v1.1). Customers know.
- **AI contact attributes** — June (v1.2).
- **Native mobile app** — Q3+. Web works on phones.
- **Marketing automation, dialer, multichannel sequences** —
  intentionally NOT building. DEUS is a CRM for operators, not a
  sales engine. Use Mailchimp, Aircall, etc. on top.

If a prospect asks for one of these, the answer is "not us — go use
[X]". Trying to win deals DEUS isn't built for costs more than it
makes back.

## Pricing & beta-cohort offer

- Starter: €49 / seat / month, up to 10 seats.
- Professional: €79 / seat / month, unlimited.
- First 3 customers: 50% off for six months. After month 7, normal
  pricing.

Confidence in pricing is high vs Attio + Folk, medium vs HubSpot
Pro (HubSpot is feature-rich at the same price). Not negotiating
during the beta cohort — single price, single offer, no hand-wringing.

## What can break (and what I'll do if it does)

| What | Probability | My response |
|---|---|---|
| Calendar push-sync fails for customer #1 | Low — tested with synthetic + I'll have my own calendar connected for parity | Fall back to read-only polling via `/external-events`. Customer doesn't notice the difference for 24h. |
| Stripe webhook misses an event | Low — Stripe retries 3 days | Manual reconcile from `Subscription` table. Stripe console shows what failed. |
| Hetzner cutover (Fri) introduces latency | Medium — first prod traffic on the new infra | `/status` page shows it. Roll back to Vercel within an hour if p95 latency > 2s. |
| Customer #1 hits an Art. 9-shaped event we filter wrongly | Low — privacy filter only persists CRM-contact-attended events | If wrong, it's a missing event (false negative). Customer flags it. We add a manual sync trigger. |
| GDPR DPA review delays signing | Medium — depends on customer's legal team | DPA template is ready (`_drafts/legal/dpa-en.md`). 99% of B2B customers sign without redlines. |

If anything actually breaks: WhatsApp me, don't email. I'll triage
within 30 min during EU hours.

## Timeline check

- **Wed 2026-05-15:** Hetzner cutover ceremony
- **Sat-Mon:** rehearsal runbook walked, punch list cleared
- **Mon 2026-05-18:** PR #12 merged to main, Sync Bot mirrors to DEUS-SHARED
- **Tue 2026-05-19:** customer #1 onboards (co-presence on the call optional but appreciated)
- **Fri 2026-05-22:** sprint review — 5-customer roadmap decision

If this goes sideways, the most likely failure mode is the legal
entity gate. I made a call (NL BV recommendation in
`_drafts/legal/entity-decision-memo.md`) — happy to revisit if you
have a different read.

---

— Juan
