# /audit-full — PR #12 cumulative state

**Date:** 2026-05-08
**Scope:** `c364cd5..HEAD` — calendar OAuth/push-sync/delta-sync, Stripe billing, settings UIs, GDPR, Hetzner prep, repo-split runbook, audit-cleanup F5/F8/F11, i18n bundle
**Branch:** `claude/zen-noyce-f6e719`
**Tone:** broader than 2026-05-07 (architecture + contracts + polish, not security-first)

The codebase is in good shape. Most prior findings closed; the new bundles
respect the security baseline. Findings below are mostly polish — no
KRITIEK-level items. Nothing in this report blocks first-customer go-live.

---

## Findings (ranked by severity)

### MED — 1. `PATCH /api/me` lacks rate limit
**File:** `app/philly/api/me/route.ts:55-93`

The DELETE handler enforces `PRESET_MUTATION` (line 113). The PATCH handler — which can change a user's email, locale, name, avatarUrl — has no rate limit. An authenticated attacker could thrash a user's email field. Auth + audit are wired correctly, just the throttle is missing.

**Fix:** Add `enforceRateLimit(\`me-patch:${scope.userId}\`, PRESET_MUTATION)` immediately after the `requireScope()` line.

---

### MED — 2. Billing UI declares its own `SubscriptionData` type — drift risk
**File:** `app/philly/settings/billing/page.tsx:10-29`

The billing page defines `SubscriptionData`, `SeatStatus`, `ApiResp` inline. The route at `app/philly/api/billing/subscription/route.ts:38-52` is the source of truth. We hoisted calendar types to `lib/philly/calendar/types.ts` last bundle precisely because two UIs drifted; same anti-pattern is now setting up here. If the route adds a `trialEnd` field, the UI silently won't render it.

**Fix:** Hoist to `lib/philly/stripe/types.ts` (matches calendar pattern). Both server and client import from there. Aligns the billing surface with the calendar surface and pre-empts the drift cycle.

---

### MED — 3. `prisma datasource` has no `url` configured
**File:** `prisma/schema.prisma:5-7`

```
datasource db {
  provider = "mysql"
}
```

The `url` field is missing. Prisma uses `env("DATABASE_URL")` by default but explicit declaration is the recommended pattern; without it, `prisma migrate diff` and certain CLI commands can produce confusing errors. Also: `mysql` provider but the readiness sprint discussion is around Postgres (Hetzner cutover). Verify the provider intent with the Hetzner runbook.

**Fix:** Add `url = env("DATABASE_URL")`. Confirm `mysql` vs `postgresql` matches the Hetzner target.

---

### MED — 4. Calendar webhook does NOT rate-limit
**File:** `app/philly/api/calendar/webhook/[provider]/route.ts:51-81`

This is a public path (`PUBLIC_PHILLY_PATHS` allowlist). Auth = encrypted per-channel `authSecret`. There's no IP-based or path-level rate limit. A malicious actor who learns the route URL can flood it; even with auth-failures, every request burns a DB lookup (`calendarChannel.findFirst` for Google, `findMany` for Microsoft).

The Stripe webhook has the same shape but at least Stripe's signature verification rejects pre-DB; calendar webhook does a DB hit BEFORE auth check.

**Fix:** Add a per-IP token-bucket on this route OR move the auth check ahead of the DB lookup (Microsoft branch can verify clientState format/length before the Prisma call).

---

### MED — 5. Calendar webhook handler awaits delta-sync inline — Microsoft 3-second SLA at risk
**File:** `app/philly/api/calendar/webhook/[provider]/route.ts:289-306`

The MS branch comments declare a 3-second hard SLA (line 215-217), then awaits `Promise.allSettled(syncs)` inline (lines 293-306). Each `syncDeltaForChannel` is one HTTP call to Graph (typical p95 <800ms). If a batch contains 4+ subscriptions, total time exceeds 3.2s + verify cost — MS will mark the subscription as failed and back off.

The code comment acknowledges the trade-off ("If we ever exceed the budget in practice, swap to Next.js `after()`"). This isn't a bug — it's a documented hot path that will bite under modest concurrent load.

**Fix:** Use `after()` (App Router primitive) before MVPs scale beyond ~3 customers, or queue the sync work via a `jobs` table. Track in metrics-review.

---

### MED — 6. Delta-sync recursion on 410 has no recursion guard
**File:** `lib/philly/calendar/delta-sync.ts:142-150` (Google), `:245-252` (Microsoft)

When the provider returns 410 GONE, both branches drop the syncToken and recurse with `null`. The recursion bottoms out *because* the recursive call sets syncToken=null — which goes into the bootstrap branch. But: if a clock skew or persistence bug means we re-write the *same* expired token before recursing, we loop forever. There's no depth counter or wall-clock guard.

The current code does write `syncToken: null` before recursing, so the bug is hypothetical. But a typo on line 147/249 could turn this into an infinite recursion that hangs the webhook handler past the 3s SLA.

**Fix:** Add a `depth` parameter (default 0, max 1) so a second 410 in the same call returns `zero({ error: 'persistent_410' })` instead of recursing again.

---

### MED — 7. Webhook handler does not advance `lastUsedAt` on connection
**File:** `app/philly/api/calendar/webhook/[provider]/route.ts:170-198`

When a Google notification fires and we sync, the connection's `lastUsedAt` only advances if `getActiveConnection` chose to refresh tokens. The throttled write logic in `connection.ts:236-244` only runs for direct callers of `getActiveConnection`. Webhook-triggered syncs go through `syncDeltaForChannel` → `getActiveConnection`, so it *does* advance — but it's an indirect dependency. Worth verifying with a quick log probe in production.

**Fix:** Add an integration test that seeds a connection with `lastUsedAt = 30 days ago`, fires a webhook, and asserts the row was updated. (Document if intentional that webhook-only-active connections age out.)

---

### LOW — 8. Calendar oauth callback redirects to `/philly/login` (relative)
**File:** `app/philly/api/calendar/oauth/callback/route.ts:65`

```
return redirect(req, '/philly/login', { next: DEFAULT_RETURN, error: 'session_lost' })
```

`/philly/login` doesn't exist as a route in the codebase — the actual login route is `/login` (proven by `lib/supabase/middleware.ts:72`). Users who lose session mid-OAuth will hit a 404.

**Fix:** Change to `/login` (matches middleware). Add an integration test for the `session_lost` branch.

---

### LOW — 9. `getActiveConnection` writes `lastUsedAt` fire-and-forget but never logs failures
**File:** `lib/philly/calendar/connection.ts:241-244`

```
void prisma.calendarConnection
  .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
  .catch(() => {})
```

The `.catch(() => {})` swallows everything. If the DB is down or the row is gone, we'll never know — and `shouldWriteLastUsed` will keep retrying every read. A connection-pool exhaustion incident gets harder to diagnose because this write isn't on any structured log.

**Fix:** `.catch((err) => logger.warn('lastUsedAt write failed', { id: row.id, err }))`. Doesn't change behavior; gives operators a thread to pull.

---

### LOW — 10. Microsoft webhook: `clientState` log leak risk
**File:** `app/philly/api/calendar/webhook/[provider]/route.ts:276-279`

```
const allValid = group.every((n) => n.clientState && timingSafeEquals(n.clientState, expected))
if (!allValid) {
  logger.warn('[calendar webhook ms] clientState mismatch', { channelId: channel.id })
}
```

This is fine. But: the test bench could regress to `logger.warn(...{ provided: n.clientState })` and now we'd be logging an authentication secret. Add a comment block explaining the secret-logging-prohibition so future contributors don't add it for "easier debugging".

**Fix:** Add a `// CONTRIBUTOR: never include clientState in logger calls — it's a shared secret` comment above the warn.

---

### LOW — 11. Stripe checkout writes audit row BEFORE returning checkout URL
**File:** `app/philly/api/billing/checkout/route.ts:145-156`

The `await logAudit` happens after `stripe.checkout.sessions.create` succeeds but before the URL is returned. If logAudit fails (DB blip), the customer gets a 500 even though Stripe is happily holding their session. The `auditLog` call in the calendar oauth callback is best-effort (line 110-125) without `.catch()`, but `me/export` does `.catch(() => { /* audit best-effort */ })` (line 75).

**Fix:** Use the `me/export` pattern: `await logAudit(...).catch((err) => logger.warn('audit failed', { err }))`. Audit logs are valuable but shouldn't gate user-facing happy paths.

---

### LOW — 12. `app/philly/api/billing/portal/route.ts` — same pattern as F11
**File:** `app/philly/api/billing/portal/route.ts:80-90`

Same nit. Audit is awaited; if it fails, the user can't open their billing portal. Consistency: standardize on best-effort audit across all calendar/billing routes.

---

### LOW — 13. `lib/supabase/middleware.ts` — PUBLIC_PHILLY_PATHS allowlist is now 6 entries, no test
**File:** `lib/supabase/middleware.ts:51-69`

The allowlist grew from 1 → 6 entries this PR. There's no integration test asserting that (a) the allowlist contains exactly these 6 paths and (b) every NON-allowlisted /philly/api/* route returns 302 to /login when unauthenticated. Adding a 7th entry is a one-line PR — currently no enforcement that the ergonomics stay correct.

**Fix:** `lib/supabase/middleware.test.ts` — exhaustive table-driven test of the allowlist + a sample of protected routes. Cost: 30 lines.

---

### LOW — 14. Renew-channels cron route returns full per-channel results in JSON body
**File:** `app/philly/api/calendar/cron/renew-channels/route.ts:133-142`

```
return NextResponse.json({
  data: {
    triggeredBy, dueTotal, processed, renewed, failed,
    results,  // <- per-channel { channelId, provider, ok, error }
  }
})
```

The `results` array has up to 200 entries (MAX_PER_RUN = 33). Each contains `channelId` (unique per row, not sensitive but operational metadata) and provider error strings (`http_400 ...`). This response body is not authenticated past the cron-secret check; if the secret leaks, an attacker can map every channel ID in the system. Low-impact (channelIds aren't authentication tokens) but unnecessary.

**Fix:** Cron path returns `{ summary: { processed, renewed, failed } }` only. Admin path keeps full details (already audit-logged).

---

### LOW — 15. `delta-sync.ts` lacks pagination — comment acknowledges, but no metric
**File:** `lib/philly/calendar/delta-sync.ts:25-29`

The header doc states "we follow the first page only ... missing a page means at most 50 stale events on next sync — not correctness-breaking, just delayed." Bundle D4 will fix it. There's no metric that tells the operator *when* the gap is biting.

**Fix:** Surface a counter: when Google returns `nextPageToken` (via `json.nextPageToken` we don't read today, but it's in the API response), increment a logger.warn counter. Lets you decide whether D4 is urgent based on real customer load.

---

### LOW — 16. `prisma/schema.prisma:7` — datasource provider not committed yet
**File:** `prisma/schema.prisma:5-7`

Not a finding per se but a pre-Hetzner gotcha: datasource provider is `mysql` while the Hetzner runbook (`scripts/migrate-to-hetzner/02-postgres-init.sql`) sets up Postgres. Migrating provider mid-flight requires a careful schema diff. Make the provider switch part of the cutover script, not a surprise.

**Fix:** Add a step to `docs/hetzner-cutover-runbook.md` that explicitly flips the provider line + runs `prisma migrate dev --name postgres_cutover` against a clean DB. Verify any `@db.Text`, `Int`, etc. types translate cleanly.

---

### INFO — 17. Repo-split readiness — `lib/philly/*` is clean
**File:** verified across `lib/philly/calendar/*`, `lib/philly/stripe/*`

Spot-checked: zero imports out of `lib/philly/*` to `lib/seo/*` or `components/sections/*` or other marketing-site code. Cross-internal imports stay within `@/lib/philly/*` and `@/lib/supabase/*` (which is a tight infra dependency, expected). Repo split won't fight us on the lib side.

The wider `app/philly/*` does import from `components/philly/layout/Topbar.tsx` etc. — already part of the DEUS surface. No leakage to the brand-site components/sections.

**Action:** None — note this as a green checkpoint in `docs/repo-split-cutover.md`.

---

### INFO — 18. i18n locale file structure looks balanced
**File:** `lib/i18n/dict.ts`

Sample-counted en/nl/de/es block markers — all 4 locales have consistent block opens. Spot-checked the new `sectors.*`, `optout.*`, `a11y.*`, `globe.*` keys from this bundle's `efe560d` commit; all four locales include them. The `translate()` fallback at line 2590 is the single source of locale-fallback truth.

**Action:** None — bundle held discipline.

---

## What's NOT a finding (false alarms checked)

- **Calendar webhook PUBLIC allowlist** — properly scoped to two narrow paths (google + microsoft). Each webhook authenticates via shared secret. ✅
- **Stripe webhook missing audit log** — confirmed-non-finding per the user prompt. Server-to-server, no userId; webhook events live in `logger.info` instead. ✅
- **Cron route allowlist (`/audit/prune`, `/calendar/cron/renew-channels`)** — added in `8cb3f20`, route-level auth still enforced via X-Cron-Secret/role. ✅
- **`Testimonials.tsx`, `CommandPalette.tsx`, `sectors/[slug]/page.tsx`** body i18n — deferred per yesterday's `/translate` audit. ✅
- **`crypto.test.ts` + `state.test.ts` inter-suite flakes** — documented, not introduced this sprint. ✅
- **`app/philly/*` English-only this sprint** — accepted scope per CLAUDE.md. ✅
- **Subscription webhook events not audit-logged** — design choice, no userId in webhook scope. ✅
- **Calendar OAuth subscribe is best-effort post-OAuth** — acknowledged trade-off, comment is clear. ✅
- **Calendar callback `state.subject_mismatch` redirects to safe path** — correct. ✅
- **`renew-channels` org-scoping for admin path** — fixed in F1, verified at `route.ts:79-82`. ✅
- **CalendarConnection.organization onDelete: Restrict** — verified in schema.prisma:640, intentional + commented. ✅

---

## Top-5 punch-list

1. **F1 — `PATCH /api/me` rate limit** (MED) — one-line fix; closes a viable thrash vector.
2. **F2 — Hoist `SubscriptionData` to `lib/philly/stripe/types.ts`** (MED) — pre-empt the same drift cycle that gave us calendar types last bundle.
3. **F3 — Confirm `prisma datasource provider`** (MED) — `mysql` vs `postgresql` ambiguity creates a Hetzner-day surprise. Resolve before cutover.
4. **F4 — Calendar webhook rate-limit** (MED) — public path, DB hit per request before auth, no rate cap.
5. **F8 — `/philly/login` → `/login` typo** (LOW) — 404s users mid-OAuth on session loss; one-line fix.

Bundle is healthy. 18 findings, distribution: 0 KRITIEK / 0 HIGH / 7 MED / 9 LOW / 2 INFO. None block customer #1 onboarding.
