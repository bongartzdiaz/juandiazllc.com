# DEUS competitive positioning — 2026-05-08

Honest read on where DEUS sits in the operator-CRM market on launch
day. Written for two audiences: internally (Juan + Hash, when
deciding pricing and pitch lines) and for the customer pitch (what
to send when a prospect asks "why not just use HubSpot").

The frame is "operator's CRM" — built for the founder running real
operations across one to four sectors who already lost a quarter to
a half-installed Pipedrive that never worked. Not a Salesforce
replacement, not a HubSpot competitor, not a Notion CRM template.

---

## 1 · The market in one paragraph

CRM is a saturated category with three dominant tiers:
**enterprise** (Salesforce, Microsoft Dynamics) for companies large
enough to afford a Salesforce admin; **mid-market** (HubSpot, Zoho,
Pipedrive) for sales teams that need a structured pipeline and
marketing tooling; and **founder-grade** (Folk, Attio, Close, Cap.
table-tier Notion templates) for the founder who wants something
beautiful, fast, and friendly. DEUS sits between mid-market and
founder-grade, opinionated for **operators**, not sales-led teams.

---

## 2 · The competitive set

Six tools that operator-prospects actually consider, ranked by
overlap with DEUS:

| Tool | Closest comp | Where they win | Where they lose |
|---|---|---|---|
| **HubSpot** | broad CRM | universally known, free tier, marketing automation depth | bloat, marketing-team focus, enterprise pricing curve |
| **Pipedrive** | sales pipeline | clean pipeline UI, sales-rep ergonomics | weak for non-sales workflows, US-hosted, paid add-ons for everything |
| **Attio** | founder-grade | beautiful, flexible data model, fast | early-stage, small team, US-only DPA, no per-tenant DB option |
| **Folk** | founder-grade | LinkedIn-import-first, networking flow | networking workflow, not pipeline workflow; US-hosted |
| **Close** | sales-led | calling + email + SMS in one place | sales-rep tool, not operator tool; US-hosted |
| **Salesforce** | enterprise | universal recognition, every integration exists | needs a Salesforce admin, six-figure TCO, glacial setup |

DEUS competes most directly with **Attio** and **Pipedrive**. The
positioning gap is real: there isn't a clean "operator-built,
EU-hosted, GDPR-clean, calendar-first" CRM in the founder-grade
tier. Folk is closest in spirit; nothing matches the mix.

---

## 3 · DEUS feature comparison

Honest version. Not "checkmarks for everything" — only ticks for what
genuinely ships in v1.0.

| Capability | DEUS v1.0 | Attio | Folk | Pipedrive | HubSpot |
|---|---|---|---|---|---|
| Per-industry pipeline templates | ✓ | partial | ✗ | ✓ | ✓ |
| Real-time calendar push-sync (Google + Outlook) | ✓ | ✓ | ✓ | partial | ✓ |
| Calendar event context on the deal page | ✓ | partial | partial | ✓ | ✓ |
| GDPR DSAR export self-serve (Art. 15) | ✓ | partial | partial | partial | partial |
| Right-to-erasure self-serve (Art. 17) | ✓ | partial | partial | partial | partial |
| Audit log on privileged actions | ✓ | enterprise tier | ✗ | enterprise tier | enterprise tier |
| AES-256-GCM token encryption at rest | ✓ | ? | ? | ? | ? |
| Per-tenant database option (physical isolation) | road­map | ✗ | ✗ | enterprise tier | enterprise tier |
| EU-hosted (Hetzner Falkenstein) | ✓ (Hetzner) | ✗ (US) | ✗ (US) | ✓ (option) | ✓ (option) |
| 14-day trial, no card up front | ✓ | partial | ✓ | ✓ | ✓ |
| Stripe Customer Portal self-serve billing | ✓ | partial | ✓ | partial | ✗ |
| Two-way calendar write-back | road­map (v1.1) | ✓ | partial | ✓ | ✓ |
| AI attributes on contacts | road­map (v1.2) | ✓ | partial | partial | ✓ |
| Native mobile apps | ✗ (Q3+) | ✓ | ✓ | ✓ | ✓ |
| Marketing automation / email campaigns | ✗ (intentional) | ✗ | partial | partial | ✓ |
| Calling, SMS, sequences | ✗ (intentional) | ✗ | ✗ | partial | ✓ |

**The honest gaps:** native mobile, two-way calendar, AI contact
attributes. The first is post-MVP roadmap. The other two are scoped
for v1.1-v1.2.

**The intentional non-features:** marketing automation, dialer,
multichannel sequences. DEUS is a CRM for operators, not a sales
engine. If a prospect needs HubSpot's marketing depth or Close's
dialer, the right answer is "not us — go use them."

---

## 4 · Pricing positioning

| Tool | Entry seat / month | Mid-tier seat / month | Notes |
|---|---|---|---|
| **DEUS** | €49 (Starter) | €79 (Professional) | EU-hosted, no card up front, 14-day trial |
| Attio | $34 (Plus) | $69 (Pro) | US-hosted |
| Folk | $25 (Standard) | $40 (Premium) | Networking focus |
| Pipedrive | €19 (Essential) | €34 (Advanced) | Per-feature add-ons add 30-50% |
| HubSpot Sales | €18 (Starter) | €81 (Pro) | Pro tier needed for usable feature set |
| Close | $99 (Startup) | $139 (Pro) | Heavily sales-rep focused |

**Where DEUS sits:** above Pipedrive entry, below Close, in line with
HubSpot Pro. The per-seat price is a confident mid-market number.
The justification is the EU-hosted, GDPR-clean, audit-logged stack
plus the operator-specific pipeline templates — that's where the
premium-vs-Pipedrive money goes.

**The beta-cohort discount** (50% off first six months for the first
three customers) brings the effective entry price to €24-39, which
is competitive with the cheapest tier on every alternative and
removes price as an objection while DEUS is still proving itself.

---

## 5 · Where DEUS wins

The pitch lines you can defend in front of a customer without
flinching:

- **EU-hosted, GDPR-controller-clean.** No Schrems II argument, no
  third-country transfer questions in the DPA. Hetzner Falkenstein,
  encrypted at rest, processor list of six EU-resident or
  DPF-certified vendors and nothing else.
- **Operator-built, not sales-built.** The five-phase frame
  (survey/blueprint/build/operate/scale) is operator language. Sales
  CRMs talk in stages-and-quotas; DEUS talks in the language an
  operator already uses to describe their work.
- **Calendar context where it belongs.** Real-time push-sync, not
  the next-poll lag. Meetings live on the deal they belong to.
- **Privacy on the record.** DSAR export self-serve in one click,
  account erasure with a 30-day window, audit log on every
  privileged action — visible to admins, not buried in an enterprise
  tier.
- **Honest pricing.** No per-seat fee plus per-feature add-on stack.
  Two SKUs, both clear, no Salesforce-style "we'll quote you."

---

## 6 · Where DEUS loses

The questions a prospect will ask. Answers prepared:

- **"What about marketing automation?"** Not in DEUS. Use Mailchimp,
  Klaviyo, or HubSpot Marketing for that and connect via the
  contact-export. DEUS is the source of truth for the operator;
  marketing tools are downstream.
- **"What about calling and sequences?"** Not in DEUS. Use Aircall
  or Close as a layer on top. Same logic — DEUS is the operator
  pipeline, not a sales-rep workstation.
- **"Do you have a mobile app?"** Web works on phones. Native is on
  the Q3+ roadmap. If the prospect's daily flow is mobile-first
  (showings agent, field tech), DEUS isn't ready for them yet.
- **"Can I two-way sync my calendar?"** Read-only today. Write-back
  in v1.1, late May. Don't promise unless you mean it.
- **"How big is your team?"** One founder, one collaborator. The
  honest answer. The advantage: every architectural decision was
  made deliberately, the codebase is small enough that one person
  knows every line, and the support email lands in someone's actual
  inbox.

---

## 7 · The five reasons a prospect picks DEUS

Distilled from the above, in the order a prospect actually thinks
through them:

1. **They got burned by HubSpot or Pipedrive.** Either too bloated or
   too sales-only. They want something that actually fits operator
   workflows.
2. **They care about EU residency.** Either by regulation
   (healthcare, finance, public sector adjacent) or by personal
   preference (post-Schrems II awareness).
3. **They want a real human on support.** DEUS is small enough that
   the founder is on the other end of the email.
4. **They want simplicity.** Two SKUs, no add-on stack, no
   "contact sales for pricing".
5. **They like the operator framing.** The five-phase pipeline
   actually matches how they think about their work.

---

## 8 · The five reasons a prospect picks something else

Equally important to be clear about:

1. **They need a dialer or marketing automation in the same tool.**
   Use Close or HubSpot.
2. **They need a polished mobile app from day one.** Use Pipedrive.
3. **They want every integration that exists out of the box.** Use
   HubSpot or Salesforce.
4. **They want the lowest possible price per seat.** Use Pipedrive
   Essential (€19).
5. **They need an enterprise legal review with SOC 2 Type II in
   hand.** That's a Q4 conversation for DEUS, not a v1.0
   conversation.

If any of those five describes the prospect, the right move is to
say so out loud. Trying to win a deal that DEUS isn't built for
costs more than it makes back.

---

## 9 · Three taglines to pick from

Pick the one that matches the moment.

- **"The CRM I wish existed when we were running operations."** —
  Juan-personal voice; works for warm-network outreach.
- **"Built for operators, not sales reps."** — generalist; works on
  the marketing site.
- **"EU-hosted, calendar-first, audit-clean."** — for the prospect
  who's been burned by US-hosted SaaS and asks the
  data-residency question first.

---

## 10 · Document control

| Item | Value |
|---|---|
| Date | 2026-05-08 |
| Author | LucenAI internal |
| Refresh cadence | quarterly, or when a major competitor ships a feature comparable to DEUS's positioning advantages |
| Stakeholders | Juan, Hash, customer-facing materials |
| Confidence in pricing recommendation | high vs Attio + Folk; medium vs HubSpot (HubSpot's Pro tier is feature-rich at the same price) |
