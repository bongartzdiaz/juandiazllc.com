> ## ⛔ SUPERSEDED 2026-07-26
> Dit concept is vervangen door `docs/legal/subprocessors.md`.
> Het beschreef Hetzner-hosting die nooit heeft bestaan en stelde dat er
> geen doorgifte buiten de EER plaatsvindt — beide onjuist.
> **Niet gebruiken. Niet publiceren.**

---
last_updated: 2026-07-21
locale: en
target_path: app/[locale]/legal/subprocessors/page.tsx
review_status: BLOCKED — needs legal review before publication
---

> ## ⚠️ DO NOT PUBLISH WITHOUT REVIEW
>
> This draft previously stated *"We do not use third-party AI APIs
> (OpenAI, Anthropic, Google, etc.). All AI in DEUS runs on our own
> servers in Germany"* and *"We do not transfer Personal Data outside
> the European Economic Area."*
>
> **Both statements contradict the shipped code.** DEUS calls
> Anthropic's hosted API (`lib/philly/ai/contact-attributes.ts`,
> `lib/philly/ai/insights.ts`, `POST /api/ai/score`) using
> `ANTHROPIC_API_KEY`, and `docs/legal/DPIA-AI-ATTRIBUTES.md` risk 5
> explicitly assumes an Anthropic DPA plus EU SCCs. Publishing the old
> text would have been a false statement to customers about where
> their data goes.
>
> The rows below have been corrected to match what the software
> actually does. **Two things still need a human:**
>
> 1. **Verify the legal entity, region, and transfer mechanism for
>    each AI vendor.** The entity names and regions below are marked
>    `[VERIFY]` where I could not confirm them from the repo. Do not
>    publish placeholders.
> 2. **Confirm the DPAs are actually signed.** The DPIA assumes an
>    Anthropic DPA + SCCs exist. If they do not, that is a live
>    compliance gap independent of this document.
>
> If the intent was for the original text to become true via the
> Hetzner self-hosting cutover, the fix is to finish that migration
> *and then* restore the stronger claim — not to publish it early.

# Sub-processors

LucenAI uses the following Sub-processors to operate the DEUS Service. They process Personal Data on our behalf, under written data-processing agreements equivalent to or stricter than the protections in our [DPA](/legal/dpa).

We notify Customers **at least 30 days** before adding or replacing a Sub-processor by email to the registered billing contact. The Customer can object on reasonable data-protection grounds within 14 days; if the objection is not resolved, the Customer can terminate the subscription with a pro-rata refund.

## Current Sub-processors

| Sub-processor | Purpose | Region | DPA |
|---|---|---|---|
| Hetzner Online GmbH | Hosting — compute, database, AI inference | Falkenstein, Germany | [hetzner.com/legal](https://www.hetzner.com/legal/contract/) |
| Backblaze Inc. | Encrypted backup storage | Amsterdam, Netherlands | [backblaze.com/dpa](https://www.backblaze.com/company/dpa.html) |
| Stripe Payments Europe Ltd | Subscription billing | Dublin, Ireland | [stripe.com/legal/dpa](https://stripe.com/legal/dpa) |
| Resend.com Inc. | Transactional email (invites, password reset) | EU region | [resend.com/legal/dpa](https://resend.com/legal/dpa) |
| Functional Software Inc. (Sentry) | Error monitoring | Frankfurt, Germany | [sentry.io/legal/dpa](https://sentry.io/legal/dpa/) |
| Plausible Insights OÜ | Cookieless analytics | Estonia | [plausible.io/data-policy](https://plausible.io/data-policy) |
| Anthropic `[VERIFY entity]` | AI inference for contact enrichment, lead scoring, and insights | `[VERIFY region + transfer mechanism]` | [anthropic.com/legal/commercial-terms](https://www.anthropic.com/legal/commercial-terms) `[VERIFY DPA is signed]` |

### Conditional Sub-processors

Active only when the corresponding feature is enabled for your workspace.

| Sub-processor | Purpose | Enabled when | Region | DPA |
|---|---|---|---|---|
| Firecrawl `[VERIFY entity]` | Fetches the public homepage of a contact's email domain to give AI contact-enrichment business context. Receives **only the bare domain** — never a contact's name, email address, or notes. | `FIRECRAWL_API_KEY` is configured. **Off by default.** | `[VERIFY region + transfer mechanism]` | `[VERIFY DPA]` |

## What does *not* process Customer data

- We do not use any analytics that tracks Authorized Users individually.
- We do not sell, share, or license Customer Data to any party, and no
  Sub-processor above is permitted to use it to train their own models.
  `[VERIFY this is contractually true for each AI vendor — for
  Anthropic it depends on which commercial terms apply.]`

## Changes to this list

This page is the live list. Subscribe to changes by emailing **privacy@lucen.ai** with subject "subprocessor updates" — we will email you each update.

Last updated: 2026-05-12.
