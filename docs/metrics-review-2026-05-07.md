# DEUS metrics review — 2026-05-07

PR #12 (`claude/zen-noyce-f6e719`) ships ~15 net-new feature surfaces.
This doc inventories what is observable today, what is dark, and what
to wire before D3 (the operator-side go-live cutover).

Sources read:
- `lib/philly/observability.ts` (SLO + `withSpan`)
- `lib/philly/logger.ts` callsites (33 files)
- `lib/philly/stripe/*`, `lib/philly/calendar/*`, `lib/philly/dsar.ts`,
  `lib/philly/seats.ts`, `lib/philly/invites.ts`,
  `lib/philly/import/csv-parse.ts`, `lib/philly/audit.ts`
- All `app/philly/api/*` route files referenced below
- `prisma/schema.prisma` (Subscription, AuditLog, CalendarChannel, Organization.onboarding*)

---

## 1. What we measure today

### SLO-tracked spans (the only paths with latency budgets)

`SLO` const in `lib/philly/observability.ts` defines three buckets:

| Span name      | Budget   | Wrapped at                                         |
|----------------|---------:|----------------------------------------------------|
| `auth.login`   | 1,200 ms | `app/actions/auth.ts:26`                           |
| `deal.create`  |   800 ms | `app/philly/api/deals/route.ts:83`                 |
| `ai.score`     | 15,000 ms| `app/philly/api/ai/score/route.ts:23`              |

Each emits attributes `slo.duration_ms`, `slo.bucket`
(`ok`/`slow`/`error`), `slo.over_budget`. No-ops cleanly when
`SENTRY_DSN` is unset (today: unset everywhere). Three of ~120 API
routes are wrapped — single-digit-percent coverage.

### `logger.{info|warn|error}` callsites (categorized)

33 files currently log structured events. Categorized by domain:

**Billing (Stripe)** — `app/philly/api/billing/*`
- `[billing] checkout session created` (info) — `checkout/route.ts:132`
- `[billing] checkout session has no url` (error) — `checkout/route.ts:128`
- `[billing] portal session created` (info) — `portal/route.ts:69`
- `[billing] portal session has no url` (error) — `portal/route.ts:65`
- `[billing webhook] verification failed` (warn) — `webhook/route.ts:43`
- `[billing webhook] handled` (info) — `webhook/route.ts:58`
- `[billing webhook] handled with warning` (warn) — `webhook/route.ts:52`
- `[billing webhook] dispatch failed` (error) — `webhook/route.ts:67`
- `[billing webhook] STRIPE_WEBHOOK_SECRET not set` (error) — `webhook/route.ts:33`

**Calendar OAuth + push-sync** — `app/philly/api/calendar/*`
- `[calendar oauth] state subject mismatch` (warn) — `oauth/callback/route.ts:68`
- `[calendar oauth] token exchange failed` (warn) — `oauth/callback/route.ts:77`
- `[calendar oauth] connected` (info) — `oauth/callback/route.ts:99`
- `[calendar oauth] push-sync subscribe failed (non-fatal)` (warn) — `oauth/callback/route.ts:144`
- `[calendar oauth] push-sync subscribed` (info) — `oauth/callback/route.ts:151`
- `[calendar webhook google] *` 8 events — `webhook/[provider]/route.ts:93–163`
- `[calendar webhook ms] *` 4 events — `webhook/[provider]/route.ts:237–263`
- `[calendar cron] renew sweep complete` (info) — `cron/renew-channels/route.ts:106`
- `[calendar] connection revoked` (info) — `connections/[id]/route.ts:61`
- `[calendar] push-sync unsubscribe failed (non-fatal)` (warn) — `connections/[id]/route.ts:50`

**Onboarding** — `app/philly/api/onboarding/*`
- `[onboarding] step advanced` (info) — `step/route.ts:49`
- `[onboarding] completed` (info) — `complete/route.ts:48`
- `[onboarding] skipped` (info) — `skip/route.ts:33`

**Auth + tenant** — auth helpers, invites, organizations
- `[invite] resend send failed/threw/skipping` — `lib/philly/invites.ts:46,71,76`
- `[invite] revoked` (info) — `organizations/invites/[id]/route.ts:53`
- `[invite] email send failed but invite created` (warn) — `organizations/invites/route.ts:139`
- `[invite] accept rejected` (info) — `invites/accept/route.ts:56`
- `[invite] accepted` (info) — `invites/accept/route.ts:120`
- `[org-me] updated` (info) — `organizations/me/route.ts:75`

**DSAR / GDPR** — `app/philly/api/me/*`, `app/philly/api/users/*`
- `[me] self-erasure` (info) — `me/route.ts:172`
- `[users] admin-erasure` (info) — `users/[id]/route.ts:101`
- `[dsar] export build failed` (error) — `me/export/route.ts:55`

**CSV import** — `app/philly/api/contacts/import/route.ts`
- `[contacts/import] success` (info, line 131) — counts: `inserted`, `skipped`, `dedup_intra`, `dedup_cross`
- `[contacts/import] batch insert failed` (error, line 109)

**Other**
- `[contacts/create] ai-enrichment failed` — `contacts/route.ts:99`
- `[outreach] *` 6 events — `outreach/*/route.ts`
- `[ai/contact-attributes] generation failed` — `lib/philly/ai/contact-attributes.ts:117`
- `[audit] pruned` — `audit/prune/route.ts:74`
- `[csp] violation` — `csp-report/route.ts:52`
- `[client error]` — `log-error/route.ts:38`

### What is dark today

- **Login attempt counts** — `withSpan` wraps the path so latency is
  tagged, but no `logger.info({event: 'login.attempt', success})` exists.
  Failed-credential vs network-error is captured in code (`authResult.reason`)
  but never logged.
- **Checkout abandonment** — we log `checkout session created` but no
  `checkout.completed` (the success_url redirect from Stripe is not
  instrumented; the webhook is the only signal).
- **AI usage volume + cost** — `ai.score` has SLO but no log of token
  count, model, contacts processed, or cost approximation.
- **Seat utilization at point-of-block** — `seats.ts.assertSeatAvailable`
  throws when full but emits no event. We can't tell how often customers
  hit the seat ceiling.
- **Calendar event read volume** — `external-events` route has no log;
  we can't see which providers are heavily used or what windows are queried.
- **Onboarding drop-off** — we log advance/complete/skip but not
  the step-arrival event (no "user reached step X" stamp), so funnel
  conversion can't be reconstructed cleanly.
- **DSAR export downloads** — the export builder logs `failed` but
  not `success` (no count of successful exports).
- **Push-sync delta volume** — webhook logs `notification accepted`
  but not how many events were upserted/changed/deleted from the
  delta payload.

---

## 2. Gaps — what we should measure but don't

### Onboarding wizard (5 steps + done)

Schema columns: `Organization.onboardingStep` (string),
`onboardingCompletedAt` (DateTime?). No `onboardingStartedAt`, no
per-step timestamps.

| Metric                          | Source                                | Captured? | Severity |
|---------------------------------|---------------------------------------|-----------|----------|
| Wizard starts (orgs created)    | `Organization.createdAt`              | Yes (incidental) | low |
| Step-arrival timestamps         | n/a                                   | **No**    | high — blocks funnel |
| Step-advance count              | `[onboarding] step advanced` log      | Yes       | ok |
| Time-to-complete (start → done) | `createdAt` → `onboardingCompletedAt` | Partial — only if completed | med |
| Drop-off step                   | latest `onboardingStep` for incomplete | Yes — query schema | ok |
| Skip count + reason             | `[onboarding] skipped` log            | Yes (no reason) | low |
| Calendar-step success rate      | `[calendar oauth] connected` log      | Yes       | ok |

**Ask**: a per-step `OnboardingStepEvent` row (orgId, step, arrivedAt,
advancedAt, source) is the proper fix. Cheap interim: log
`{event: 'onboarding.step_arrived', orgId, step}` from the wizard
client when each step mounts.

### Stripe billing

| Metric                              | Source                       | Captured? | Severity |
|-------------------------------------|------------------------------|-----------|----------|
| Checkout session created            | log `checkout session created` | Yes     | ok |
| Checkout session completed          | webhook `subscription.created` | Partial — derive | med |
| Checkout-abandonment rate           | (created − completed) / created | **No**  | high — pricing/UX signal |
| Trial start count                   | webhook (status='trialing')  | Derivable | ok |
| Trial → paid conversion             | derive: trialing→active      | **No**    | high — north-star |
| MRR by plan                         | Stripe Dashboard or DB rollup | External — Stripe | ok |
| Churn (cancelations / month)        | webhook `subscription.deleted` | Yes (single log) | med — needs rollup |
| Past-due / failed-payment rate      | webhook `markPastDue` calls  | Implicit  | med |
| Portal session usage                | log `portal session created` | Yes       | ok |
| Webhook reliability (handled vs warn) | webhook logs              | Yes       | ok |

**Ask**: a Postgres view `subscription_funnel` that joins audit log
intent (the `entity='subscription', action='create'` row written at
checkout-create time) with the eventual Subscription row keyed by
`stripeCheckoutSessionId`. Lets us compute conversion in SQL without
calling Stripe.

### Calendar OAuth (connect)

| Metric                       | Source                              | Captured? | Severity |
|------------------------------|-------------------------------------|-----------|----------|
| Connect-attempt start        | `oauth/start` route                 | **No**    | med |
| Connect success per provider | `[calendar oauth] connected` log    | Yes       | ok |
| State subject mismatch (attack signal) | `state subject mismatch` warn | Yes  | ok |
| Token-exchange failure       | `token exchange failed` warn        | Yes (no provider breakdown) | med |
| Provider profile fetch failure | implicit in token-exchange failure | Buried | low |
| Disconnect rate              | `connection revoked` log            | Yes       | ok |
| Reconnect (re-OAuth) detection | n/a                               | **No**    | low |

### Calendar push-sync

| Metric                              | Source                                        | Captured? | Severity |
|-------------------------------------|-----------------------------------------------|-----------|----------|
| Active channels per provider        | `CalendarChannel WHERE status='active'`       | Derivable | ok |
| Notifications received (volume)     | `notification accepted` log                   | Yes       | ok |
| Events upserted per delta           | n/a — sync handler doesn't count              | **No**    | high — drives storage growth |
| Delta-fetch latency p95             | n/a — not wrapped in `withSpan`               | **No**    | med |
| Channel renewal success rate        | `[calendar cron] renew sweep complete` (counts only at sweep level) | Partial | med |
| Channel renewal failures by provider | `markRenewError` writes `lastError` on row   | Yes (DB), no rollup log | med |
| Webhook auth failures (signature mismatch) | `[calendar webhook] auth failure` warn  | Yes       | ok |
| Duplicate redelivery count          | `duplicate redelivery` info log               | Yes       | ok |

**Ask**: `withSpan({ name: 'calendar.delta_fetch', slo: SLO.AI_ACTION ÷ 5 })`
on the sync handler so we get p95 visibility, plus a single counter log
on each notification with `{events_changed: N}`.

### Seats + invites

| Metric                          | Source                              | Captured? | Severity |
|---------------------------------|-------------------------------------|-----------|----------|
| Seat usage / limit per org      | `seats.getSeatStatus`               | On-demand | ok |
| Seat-block events (invite refused at limit) | n/a                     | **No**    | high — pricing trigger |
| Invites sent                    | `[invite] sent` log via Resend      | Implicit (email send result) | med |
| Invite-acceptance rate          | `[invite] accepted` log + Invite table | Derivable | med |
| Invite-revocation rate          | `[invite] revoked` log              | Yes       | ok |
| Time-to-accept                  | `Invite.createdAt` → `acceptedAt`   | Derivable | low |

**Ask**: log `{event: 'seat.blocked', orgId, role}` from
`assertSeatAvailable` when it throws.

### DSAR + erasure

| Metric                           | Source                       | Captured? | Severity |
|----------------------------------|------------------------------|-----------|----------|
| Export requests (count)          | n/a (no log on success)      | **No**    | med — compliance KPI |
| Export build failures            | `[dsar] export build failed` | Yes       | ok |
| Self-erasure events              | `[me] self-erasure`          | Yes       | ok |
| Admin-erasure events             | `[users] admin-erasure`      | Yes       | ok |
| Time-to-fulfill (request → file) | n/a — ad-hoc, no queue       | n/a       | low (synchronous) |
| Soft-delete window expiry        | n/a — no scheduled hard-delete job exists | **No** | high — GDPR Art. 17 |

**Ask**: add a single `logger.info('[dsar] export delivered', {scope, sizeBytes})`
in the success path of `me/export/route.ts`. Hard-delete cron is a
separate spec — flagged as architecture gap.

### CSV import

Best-instrumented surface in the PR.

| Metric                  | Source                            | Captured? | Severity |
|-------------------------|-----------------------------------|-----------|----------|
| Imports run (count)     | `[contacts/import] success` log   | Yes       | ok |
| Rows inserted           | included in success log           | Yes       | ok |
| Dedup intra-org hits    | included in success log           | Yes       | ok |
| Dedup cross-org hits    | included in success log           | Yes       | ok |
| Validation failures     | partial — Zod 400s not logged     | **No**    | low |
| File-size distribution  | n/a                               | **No**    | low |
| Formula-injection neutralizations | n/a — inline transform, silent | **No** | low — security signal |

---

## 3. Recommended instrumentation

Per gap, the cheapest surface that closes it. Most are
`logger.info({event, props})` — **no** new infra needed. Sentry spans
are reserved for paths where we want p95 alerting.

### Cheap (logger.info — ship this week)

1. **Login outcome** — `app/actions/auth.ts`, after `authResult` resolves:
   `logger.info('auth.login_attempt', {success: authResult.ok, reason: authResult.reason ?? null})`.
2. **Onboarding step-arrival** — wizard client calls a lightweight
   `POST /api/onboarding/step/visit` that writes
   `logger.info('onboarding.step_visited', {orgId, step})`. No DB row,
   just log. (If we need funnel SQL later, promote to a DB row.)
3. **Seat block** — `lib/philly/seats.ts:assertSeatAvailable` catch path:
   `logger.warn('seat.blocked', {orgId, used, limit, role})`.
4. **DSAR delivery success** — `app/philly/api/me/export/route.ts` after
   the JSON is built: `logger.info('dsar.export_delivered', {scope, sizeBytes, userId: scope.userId})`.
5. **Calendar delta count** — `app/philly/api/calendar/webhook/[provider]/route.ts`
   after delta-fetch: `logger.info('calendar.delta_synced', {provider, events_changed, channelId})`.
6. **Connect attempt start** — `app/philly/api/calendar/oauth/start/route.ts`:
   `logger.info('calendar.oauth_start', {provider, userId: scope.userId})`.
7. **Token-exchange failure breakdown** — already logged but not by
   provider. Add `provider` field to the `token exchange failed` log.

### Medium (Sentry span — ship before D3)

8. **Calendar delta-fetch p95** — wrap the sync handler in
   `withSpan({ name: 'calendar.delta_fetch', slo: SLO.CAL_DELTA, op: 'calendar.sync' })`
   with a new `SLO.CAL_DELTA = 3_000` ms budget. Multi-page deltas mean
   tail latency is a real risk.
9. **Stripe webhook handler p95** — `app/philly/api/billing/webhook/route.ts`
   wrap `dispatchEvent(event)` call in a span. Stripe retries on >5s,
   we want to know if we're crowding that budget.
10. **CSV import duration** — `app/philly/api/contacts/import/route.ts`
    wrap the parse + Zod + dedup + insert pipeline.
    `SLO.CSV_IMPORT = 30_000` (10k row cap × ~3ms).

### External / Postgres views (ship before customer #3)

11. **`subscription_funnel` view** — joins
    `AuditLog WHERE entity='subscription' AND action='create'` to
    `Subscription` keyed by `stripeCheckoutSessionId` in `changes` JSON.
    Columns: `org_id, plan_intended, intent_at, sub_id, sub_created_at,
    sub_status, status_at, completed (bool), trial_to_paid (bool)`.
    Lets dashboard render conversion without Stripe API calls.
12. **`onboarding_funnel` view** — over `Organization`
    plus the new `OnboardingStepEvent` table (if shipped) or scraped
    from logs.
13. **Stripe Dashboard widgets** — MRR by plan, trial conversion, churn.
    Stripe owns the source-of-truth; we mirror only for in-app gating.
14. **Plausible custom events** — `plausible('onboarding.completed')`,
    `plausible('checkout.started')`, `plausible('calendar.connected')`.
    Cookieless, no consent needed (already configured per CLAUDE.md
    bundle 2). Free trend lines without DB joins.

---

## 4. KPI dashboard recommendation

A single `/philly/admin/metrics` page (admin-only) with 9 tiles in
3 rows. All sources are SQL (Prisma), Stripe API, or Sentry — no
new vendors.

### Row 1 — Adoption funnel (top-of-funnel, daily)

| Tile | Metric | Source |
|------|--------|--------|
| 1.1  | Orgs created (this week / last week) | `Organization.createdAt >= now() - interval '7 days'` |
| 1.2  | Onboarding completion rate (7d) | `count(onboardingCompletedAt) / count(*) WHERE createdAt >= now() - 7d` over `Organization` |
| 1.3  | Drop-off step (mode + count) | `SELECT onboardingStep, count(*) FROM Organization WHERE onboardingCompletedAt IS NULL GROUP BY 1 ORDER BY 2 DESC` |

### Row 2 — Revenue (the only one that pays the bills)

| Tile | Metric | Source |
|------|--------|--------|
| 2.1  | MRR by plan | Stripe API: `stripe.subscriptions.list({status: 'active'})` summed by `items[0].price.unit_amount * quantity / 100` per plan |
| 2.2  | Trials in flight | `Subscription WHERE status='trialing'` count + `currentPeriodEnd` countdown |
| 2.3  | Trial→paid conversion (28d) | `Subscription WHERE status='active' AND createdAt >= now()-28d AND was_trialing=true` / total trials started in window. Needs `subscription_funnel` view. |

### Row 3 — Operational health (SLO + error budgets)

| Tile | Metric | Source |
|------|--------|--------|
| 3.1  | Login p95 + slo bucket mix (24h) | Sentry — span `auth.login`, group by `slo.bucket` |
| 3.2  | `deal.create` p95 + bucket mix (24h) | Sentry — span `deal.create` |
| 3.3  | `ai.score` p95 + bucket mix (24h) | Sentry — span `ai.score` |

### Row 4 (optional, if 3-row format too tight) — Engagement

| Tile | Metric | Source |
|------|--------|--------|
| 4.1  | Calendars connected (active) | `CalendarConnection WHERE status='active' AND deletedAt IS NULL` count by provider |
| 4.2  | Push-sync channels (active vs near-expiry) | `CalendarChannel WHERE status='active'`, partitioned by `expiresAt < now()+12h` |
| 4.3  | Seat utilization (avg used / limit across orgs) | `Subscription` join `User WHERE deletedAt IS NULL` |

### Implementation note

For the operator (Juan), don't build a custom dashboard SPA in week 1.
Wire these as a `/philly/admin/metrics/page.tsx` that renders simple
server-fetched cards (same shape as `/philly/audit`). Plausible
provides graph trends free; Stripe Dashboard renders MRR natively.
This page is the tier-zero glance; deep dives happen in Sentry +
Stripe + Plausible.

---

## 5. Quick wins (≤30 min each, ship today before D3)

### QW1 — Login outcome log (5 min)

**File**: `app/actions/auth.ts`
**Where**: after the existing `withSpan` block resolves, before the
redirect/throw.
**Code sketch**:
```ts
import { logger } from '@/lib/philly/logger'
// after withSpan resolves
logger.info('auth.login_attempt', {
  success: authResult.ok,
  reason: authResult.reason ?? null,
})
```
**Rationale**: Failed-login rate is the single biggest leading
indicator for credential stuffing + customer support friction. We
have the data already (`authResult.reason`); we're throwing it away.
The span tags latency but not outcome distribution.

### QW2 — Seat-block log in `assertSeatAvailable` (5 min)

**File**: `lib/philly/seats.ts`
**Where**: inside `assertSeatAvailable`, on the throw path.
**Code sketch**:
```ts
import { logger } from '@/lib/philly/logger'
// before throw
logger.warn('seat.blocked', { orgId, used: status.used, limit: status.limit })
```
**Rationale**: Tells us how often customers hit the seat ceiling —
direct upgrade signal. If `seat.blocked` fires twice for one org,
that's a sales call, not a product bug. Without this log, the only
signal is the customer Slacks Juan, which is a 2-day delay.

### QW3 — Stripe checkout completion delta tag (15 min)

**File 1**: `app/philly/api/billing/checkout/route.ts`
**File 2**: `app/philly/api/billing/webhook/route.ts`

Already audit-logged at intent (line 145–156 of checkout/route.ts —
"Audit the *intent*"). The webhook fires `customer.subscription.created`
on completion. **Add the cross-link**: write the `stripeSubId` into
the audit-log row's `changes` JSON when the webhook lands, and surface
"checkout completion rate" as a single SQL query on the audit table.

**Code sketch** (in `webhook.ts:dispatchEvent`):
```ts
case 'customer.subscription.created': {
  const sub = event.data.object as Stripe.Subscription
  const orgId = resolveOrganizationId(sub)
  if (!orgId) return { ok: true, handled: false, ... }
  await upsertFromStripe(orgId, sub)
  // QW3: stamp the matching audit row so we can compute conversion
  logger.info('billing.checkout_completed', {
    orgId,
    plan: sub.items.data[0]?.price?.id,
    seatCount: sub.items.data[0]?.quantity ?? 1,
    stripeSubId: sub.id,
  })
  return { ok: true, handled: true, type: event.type }
}
```

**Rationale**: gives us the "started → completed" conversion rate
which is the most-watched single number for any SaaS pre-revenue.
Falls out of grep over the existing log stream — no new infra.

---

## Summary of asks

- 3 quick wins above land before D3 (≤30 min each).
- 7 cheap log additions (#1–#7 in §3) land Bundle 8 — single PR, ~80 LOC.
- 3 SLO spans (#8–#10) land Bundle 8 or 9 once `SENTRY_DSN` is set
  (currently empty per `lib/philly/observability.ts:60`).
- 2 Postgres views (#11–#12) land when first paying customer signs
  (need real data to validate).
- Plausible custom events (#14) land alongside i18n pass on
  `/philly/onboarding/*` (currently English-only).

The net story: SLO scaffolding is good, log discipline is decent,
but **conversion + retention are unobservable** today. Three quick
wins close the highest-value gaps before D3.
