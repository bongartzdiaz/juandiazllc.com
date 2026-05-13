# Stripe billing — operator setup

How to wire the standalone CRM up to a Stripe account so the
`/pricing` → `/signup` → `/welcome` flow can charge real money.
Source-of-truth is `lib/philly/billing/plans.ts` (slug ↔ env-var
mapping) and `app/api/{billing/checkout,webhooks/stripe}/route.ts`.

This runbook assumes you already have a Stripe account. If you
don't, create one at https://dashboard.stripe.com/register first
and complete the activation form before continuing — test-mode
works without activation but production charges require it.

## What's implemented

- **Subscription model** (`prisma/schema.prisma:Subscription`) —
  one row per `Organization`. Mirrors Stripe's `customer.id`,
  `subscription.id`, `price.id`, `status`, period dates, trial
  end, cancel-at-period-end. `ON DELETE CASCADE` to the org so
  GDPR Art. 17 erasure wipes the billing mirror.
- **Plan registry** (`lib/philly/billing/plans.ts`) — three priced
  tiers (`operator` / `team` / `business`) plus Enterprise as a
  contact-us route. Per-plan caps + feature flags gate access at
  the API layer.
- **Checkout endpoint** (`POST /api/billing/checkout`) — creates
  a Stripe Customer + Checkout session. Auth-gated via
  `requireScope()`. Routes orgs with active subscriptions to the
  Stripe **Billing Portal** instead of duplicating subscriptions.
  14-day trial, automatic tax, promo codes, billing-address
  collection.
- **Webhook sink** (`POST /api/webhooks/stripe`) — verifies the
  `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`,
  idempotent upsert on `checkout.session.completed` +
  `customer.subscription.{created,updated,deleted}`. Bad signatures
  return `400`; unknown event types log + 200 so Stripe stops
  retrying.

## One-time setup (~15 minutes)

### 1. Create the three Products in Stripe

Stripe Dashboard → **Products** → **Add product**. Repeat three
times with these settings:

| Slug | Name | Price (EUR / month) | Trial |
| ---- | ---- | ------- | ----- |
| `operator` | Operator | €49 | 14 days |
| `team`     | Team     | €199 | 14 days |
| `business` | Business | €599 | 14 days |

For each product:
- **Pricing model**: Standard pricing
- **Billing period**: Monthly
- **Currency**: EUR
- **Tax behavior**: Exclusive (Stripe Tax adds it on Checkout)
- **Description**: short blurb matching the marketing-side
  `pricing.tier.<slug>.blurb` so the Customer Portal shows it.

After creating each product, click into it and copy the **API ID**
of the recurring price (starts with `price_`). You'll need these
three IDs in the next step.

> If you're going to support an annual plan later, create a second
> **Price** under each Product (yearly cadence, 17% discount per
> the pricing-page FAQ). The current code only uses the monthly
> price; the annual price ID can sit on the Product unused until
> the toggle ships.

### 2. Set the four environment variables

In Vercel → your project → **Settings** → **Environment Variables**
(or your hosting equivalent), add four entries scoped to **both**
Production and Preview:

| Name | Value | Where to find it |
| ---- | ----- | --------------- |
| `STRIPE_SECRET_KEY`           | `sk_live_…` (or `sk_test_…` in non-prod) | Dashboard → Developers → API keys |
| `STRIPE_PRICE_OPERATOR`       | `price_…` | Product page → Pricing → API ID |
| `STRIPE_PRICE_TEAM`           | `price_…` | Product page → Pricing → API ID |
| `STRIPE_PRICE_BUSINESS`       | `price_…` | Product page → Pricing → API ID |

You'll add `STRIPE_WEBHOOK_SECRET` in step 3 below; Stripe only
issues it once the webhook endpoint exists.

### 3. Register the webhook endpoint

Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**:

- **Endpoint URL**: `https://<your-domain>/api/webhooks/stripe`
- **Events to send**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - *(optional)* `customer.subscription.trial_will_end` — logged
    as an info-line today; wire to an email in a follow-up bundle.

After creation, click **Reveal signing secret** on the endpoint
detail page and add it as a fifth env var:

| Name | Value |
| ---- | ----- |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |

Redeploy after adding the env vars (Vercel auto-rebuilds on env
changes; other hosts may need a manual deploy).

### 4. Enable Stripe Tax (recommended)

Dashboard → **More** → **Tax** → **Get started**. Fill the
business address + the jurisdictions you sell to. The Checkout
session created by `/api/billing/checkout` already sets
`automatic_tax: { enabled: true }` — Stripe handles VAT
calculation, EU reverse-charge, and OSS reporting from there.

Skip this step if your accountant runs tax outside Stripe; the
field is harmless when Tax isn't enabled.

## Test the wiring (~5 minutes)

### A. Test mode end-to-end

1. Pick a test card from
   <https://docs.stripe.com/testing#cards> — `4242 4242 4242 4242`
   succeeds, `4000 0000 0000 0341` fails on attach, etc.
2. From the marketing site, go to `/pricing`, click **Start free
   trial** under the Team tier.
3. Sign up with a fresh email. The wizard at `/philly/welcome`
   should appear after signup.
4. Step through the wizard → click **Start Stripe checkout**.
5. Enter the test card. Stripe redirects back to
   `/philly/welcome?checkout=success&plan=team`.
6. Verify in your DB (`SELECT * FROM Subscription WHERE
   organizationId = '<org id from welcome page>'`) that you have
   one row with `status = 'trialing'`, `plan = 'team'`,
   `currentPeriodEnd` 14 days in the future.

### B. Webhook delivery

Stripe Dashboard → **Developers** → **Webhooks** → your endpoint
→ **Recent events**. The `checkout.session.completed` event from
step A should show response `200 received: true`. If it shows
`400 Invalid signature`, your `STRIPE_WEBHOOK_SECRET` env var
doesn't match the endpoint's secret — regenerate or copy again.

### C. Cancellation

In Stripe Dashboard → **Customers** → find the test customer →
**Cancel subscription**. Within a few seconds the
`customer.subscription.deleted` event should land and the local
`Subscription.status` should flip to `'canceled'`.

## Going live

Once test mode works end-to-end:

1. Switch `STRIPE_SECRET_KEY` to the live key (`sk_live_…`).
2. Re-create the same three Products in **Live mode** and update
   the three `STRIPE_PRICE_*` env vars with the live `price_…`
   IDs (test-mode IDs don't work in live).
3. Re-register the webhook endpoint in **Live mode** and update
   `STRIPE_WEBHOOK_SECRET` with the new signing secret.
4. Run the test-mode flow once against the live deployment with
   a real card you control (any €1 product) and refund yourself
   to confirm the round-trip.

## Synthetic monitoring (Bundle DK)

Once the webhook endpoint is registered in Stripe and reachable
in production, wire the GitHub-Actions synthetic probe so a
deploy that breaks the route pages you within 15 minutes.

In the `juandiazllc.com` repo settings → **Variables** → **Actions**,
add one repo variable:

| Name | Value |
| ---- | ----- |
| `PROD_STRIPE_WEBHOOK_URL` | `https://<your-domain>/api/webhooks/stripe` |

The `.github/workflows/synthetic-prod.yml` cron (already running
every 15 minutes for `/api/health` probes) will now also POST to
the webhook URL with an empty body and expect **HTTP 400** —
which is the "Missing Stripe-Signature header" response from our
own code. Any other status (404 not deployed, 500 crash, timeout,
TLS error) pages the on-call Slack channel via the existing
`SLACK_ALERTS_WEBHOOK`.

Stripe's own webhook deliveries are not affected — the probe
sends a bare POST with no `Stripe-Signature` header.

## Troubleshooting

**Checkout 503 "Billing is not configured on this deployment"**
→ `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` is missing. The
route degrades intentionally so partner deploys without Stripe
don't 500.

**Checkout 400 "Invalid plan"**
→ The plan slug in the request body isn't `operator` / `team` /
`business`. Check the caller (most likely a stale Vercel preview
with the old pricing-page slugs).

**Checkout 500 "Checkout creation failed"**
→ Look at `logger.error` output. Most common: env var name typo
(`STRIPE_PRICE_TEAM` vs `STRIPE_PRICE_TEAMS`) so `stripePriceIdForPlan`
throws.

**Webhook 400 "Invalid signature"**
→ `STRIPE_WEBHOOK_SECRET` doesn't match the secret on the
endpoint. Possible causes: env var copied from the wrong endpoint
(test vs live), or trailing whitespace in the value.

**Webhook 200 but local `Subscription` row not updated**
→ Stripe event metadata is missing `organizationId`. Check the
checkout session's `metadata` field in the Stripe Dashboard
event detail; if empty, our `/api/billing/checkout` route lost
the metadata somehow — file a bug.

**Customer Portal returns to wrong domain**
→ `NEXT_PUBLIC_SITE_URL` is unset and `req.nextUrl.origin` is
resolving to a CDN-internal host. Set the env var explicitly to
your customer-facing domain.

## Operator checklist (pre-flight)

Before flipping the first customer's tenant:

- [ ] All four `STRIPE_*` env vars set in Production scope
- [ ] Three Live-mode Products created + price IDs match env vars
- [ ] Webhook endpoint registered in Live mode + signing secret set
- [ ] Stripe Tax enabled OR external tax provider documented
- [ ] One full test-mode subscription created, paid, cancelled,
      and re-subscribed — verified each event hit the webhook
- [ ] `/api/health` returns 200 (proves the standalone bundle deployed)
- [ ] First real customer's domain is in the OAuth/SAML allowlist
      if they use SSO (see `SSO-SETUP.md`)

This list is also tracked in `GO-LIVE-CHECKLIST.md` §2 under
"Secrets & env". Walk that file end-to-end before the first paid
customer.
