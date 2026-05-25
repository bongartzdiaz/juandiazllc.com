# Pre-launch audit — DEUS-SHARED sync & data-flow readiness

Audit conducted 2026-05-19 against `claude/ai-command-bar` HEAD
after PR #31. Goal: surface concrete sync-failure modes BEFORE
PR #10 merges into `main`, so the operator-side launch path runs
against verified-buildable code with verified data-flow invariants.

This audit covers **three independent sync surfaces**:

1. **Upstream → mirror sync** (`juandiazllc.com:apps/philly-standalone` → `bongartzdiaz/DEUS-SHARED`)
2. **App-internal data syncs** (Stripe webhooks ↔ Subscription, audit-chain integrity, cross-org isolation)
3. **Operator-side sync** (11 prod env vars ↔ code expectations)

For each surface, items are tagged **FIX**, **TEST-PINNED**, or **DEFERRED** with revisit triggers.

---

## §1 Mirror sync — upstream to DEUS-SHARED

The `.github/workflows/sync-deus-shared.yml` workflow uses `rsync -av --delete` with `--exclude={.git,.github,node_modules,.next}` to copy `apps/philly-standalone/` to the mirror repo. **It does not currently run automatically** — only on `workflow_dispatch`, and only from `claude/ai-command-bar` because that's where the workflow file lives.

### Pre-flight gate (NEW — TEST-PINNED)

| Check | Status | Evidence |
|---|---|---|
| Local dry-run script exists | ✅ FIX-LANDED | `scripts/audit-sync-mirror.ts` reproduces the workflow's rsync logic + runs install/build/test against the result |
| Cross-platform (Windows + Linux) | ✅ FIX-LANDED | Node-native walk fallback for Windows; rsync direct on Linux runners |
| Output validates excludes | ✅ FIX-LANDED | Step 2 enumerates `RSYNC_EXCLUDES` and FAILs if any leaked into the mirror dir |
| File-count sanity | ✅ FIX-LANDED | Source vs mirror count within 5-file tolerance |
| Mirror builds + tests | ✅ FIX-LANDED | `npm ci` + `prisma generate` + `tsc --noEmit` + `npm test` against the rsync'd tree |

**Operator action before triggering the workflow:**

```bash
cd apps/philly-standalone
npm run audit:sync-mirror          # full check (5-7 minutes)
# OR for a fast structural-only check (~10 seconds):
npm run audit:sync-mirror:fast
```

Both exit 0 on success, 1 on any failure. **Failure means do NOT trigger `sync-deus-shared.yml`** — fix in `apps/philly-standalone/` first.

### Known gaps in this surface

| Gap | Why | Revisit trigger |
|---|---|---|
| Sync workflow has never been triggered against `bongartzdiaz/DEUS-SHARED` post-#14 | Workflow lives only on `claude/ai-command-bar`; PR #10 hasn't merged to main yet | After PR #10 lands main, trigger via `workflow_dispatch` |
| Mirror remote `main` is still at upstream `ade9e4e` (2026-05-07) | Same — no sync run has happened since PR #14 | First sync post-PR-#10-merge will catch it up |
| The `.github/` directory of source is intentionally not synced | Workflow design: target repo has its own workflows that shouldn't be overwritten | N/A — intentional |

---

## §2 App-internal data flows

These are the in-app pathways where state moves between systems (Stripe → DB, Supabase Auth → Philly User, etc.). Each has its own potential for silent drift.

### Pinned by hermetic tests (TEST-PINNED)

| Data flow | Test file | Coverage |
|---|---|---|
| Stripe webhook → Subscription row | `app/api/webhooks/stripe/route.test.ts` (NEW) | 11 cases: signature verify (× 2 reject paths), `customer.subscription.{created,updated,deleted}`, missing-orgId-skip, unknown-event-200, idempotency, handler-exception-500 |
| Cross-org isolation at the route layer | `lib/security/cross-org.test.ts` (from PR #29) | 11 cases across GET/list/PATCH/DELETE × scope mismatch |
| Audit-chain integrity (hash linking) | `lib/philly/audit-chain.test.ts` | Tamper detection + verification |
| Audit-chain CLI verification | `lib/philly/audit-verify.test.ts` | CLI exit codes + drift reports |
| Auth-helpers (requireScope / requireRole / requireSection) | `lib/philly/auth-helpers.test.ts` | Supabase Auth → Philly User row provisioning on first login |
| Billing plans registry | `lib/philly/billing/plans.test.ts` | Stripe price ID → plan slug mapping |
| Slack alerts pub/sub | `lib/philly/alerts.test.ts` | Webhook fan-out + retry behavior |

### Known gaps (DEFERRED — documented + tracked)

| Gap | Why deferred | Revisit trigger |
|---|---|---|
| SCIM PUT/PATCH/DELETE → Memberships row sync | SCIM provisioning has no hermetic tests today. Manual testing in Bundles BW/BX covered the happy path but no regression net. | At customer #1 with SCIM integration OR before first enterprise prospect |
| Drip dispatcher race-condition (concurrent claim) | Bundle CG redesigned with optimistic-concurrency lock but no test pins the contract | At first dispatcher-related incident OR within 30 days of launch |
| First-login Supabase Auth → Philly User auto-provisioning end-to-end | `auth-helpers.test.ts` covers the function but not the full request path through middleware → route → user creation | Once SCIM tests land — same mock pattern reusable |
| Real-time pub/sub (publishEntityCreated/Updated/Deleted) | These functions emit Supabase realtime events; no test verifies subscribers receive them | After first multi-user customer reports a "stale list" issue |

The hermetic test pattern that worked for Stripe webhook (see `app/api/webhooks/stripe/route.test.ts`) is the template — each deferred gap should get a similar file when its revisit trigger fires.

---

## §3 Operator-side sync — env vars + secrets

The app reads 50+ env vars (verified by `[2.envExampleDrift]`). Of those, **11 are production-critical secrets** that MUST be provisioned in Vercel before the first paying customer. The launch:check gauge verifies they exist in `.env.example`; only the operator can verify the actual values are vaulted + set in Vercel.

### Production secrets — operator playbook

Run these from any shell where you have `node` available. **Capture the output in your vault BEFORE pasting into Vercel** — once added, Vercel won't show them back to you.

```bash
# Generate the 3 random secrets — distinct, 32-byte hex each.
node -e "console.log('INTEGRATION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('BLIND_INDEX_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

Then for each of the 11 variables:

```bash
# From apps/philly-standalone/ — adjust if your Vercel project is at a different root.
vercel env add INTEGRATION_SECRET production       # paste value from above
vercel env add BLIND_INDEX_SECRET production       # paste value from above (DISTINCT)
vercel env add CRON_SECRET production              # paste value from above
vercel env add SENTRY_DSN production               # from sentry.io
vercel env add SLACK_ALERTS_WEBHOOK production     # from Slack channel webhook
vercel env add STRIPE_SECRET_KEY production        # sk_live_… from Stripe Dashboard
vercel env add STRIPE_WEBHOOK_SECRET production    # whsec_… from Stripe Dashboard → Webhooks
vercel env add STRIPE_PRICE_OPERATOR production    # price_… for €49/mo plan
vercel env add STRIPE_PRICE_TEAM production        # price_… for €199/mo plan
vercel env add STRIPE_PRICE_BUSINESS production    # price_… for €599/mo plan
vercel env add DEUS_SHARED_PAT production          # fine-grained PAT — see sync-deus-shared.yml header
```

### Hard requirements (verify before launch)

| Requirement | Verification |
|---|---|
| `INTEGRATION_SECRET` and `BLIND_INDEX_SECRET` are **distinct** values | `vercel env pull` then `diff <(echo "$INTEGRATION_SECRET") <(echo "$BLIND_INDEX_SECRET")` should show diff |
| Each secret is ≥ 32 bytes (64 hex chars) | Generated via `crypto.randomBytes(32).toString('hex')` ⇒ guaranteed |
| Stripe keys are LIVE mode (`sk_live_` not `sk_test_`) | Stripe Dashboard → mode toggle must be Live when creating |
| `STRIPE_WEBHOOK_SECRET` corresponds to a webhook endpoint configured for `https://juandiazllc.com/api/webhooks/stripe` | Stripe Dashboard → Developers → Webhooks → endpoint shows subscribed to 4 events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` |
| `DEUS_SHARED_PAT` is a GitHub fine-grained PAT scoped to `bongartzdiaz/DEUS-SHARED` only | GitHub Settings → Developer settings → Fine-grained tokens; permissions: Contents R+W, Metadata R |

### Known gaps in this surface (DEFERRED)

| Gap | Why | Revisit trigger |
|---|---|---|
| No automated way to verify the actual values are set in Vercel from CI | Requires Vercel CLI auth tokens; CI doesn't have them by design | Manual verification via `vercel env ls production` |
| Key-rotation procedure for `INTEGRATION_SECRET` exists (`pii:rotate` script) but has never been exercised on real prod data | No regression net for the rotation pipeline | After first key-rotation event or annually whichever first |

---

## §4 What this audit explicitly does NOT cover

Out-of-scope for the "95% live-ready" target; tracked as follow-up tasks:

- **Counsel review** of `docs/legal/*.md` `[TO FILL:]` markers (38 markers across 8 files) — see `ACCEPTED-RISKS.md` for the deferral with 30-day revisit
- **DPO countersign** on RoPA + DPIA — deferred to customer #10 or 60 days
- **External penetration test** — recommended pre-EU-GA but not blocking for first paying customer in test markets
- **Formal backup-restore drill** — see `BACKUP-RESTORE.md`; deferred to customer #5 per `ACCEPTED-RISKS.md`
- **CodeQL false-positive dismissal** for alerts #40 + #41 (`js/log-injection` on csp-report routes — data IS sanitized via `sanitizeLogField` per Bundle CP but CodeQL's taint tracker doesn't recognize the custom helper). **Action: manual UI dismiss with reason** "False positive — data sanitized via sanitizeLogField (Bundle CP)"

---

## §5 Audit gate — pre-merge check

Before merging PR #10 into `main`, this audit's gates must be GREEN:

```bash
cd apps/philly-standalone
npm run launch:check           # should be 0 FAIL
npm run audit:sync-mirror:fast # should be 3/3 pass (or :sync-mirror for full check)
npm test                       # should be 650+ pass / 0 fail
npx tsc --noEmit               # should be silent
```

The gates THIS audit added to `launch:check`:

- `[4.mirror.dryrun]` — MANUAL (reminds operator to run `audit:sync-mirror`)
- `[6.dataflow.webhook]` — PASS if Stripe webhook test file exists
- `[6.dataflow.crossorg]` — PASS if cross-org test file exists
- `[6.dataflow.auditchain]` — PASS if audit-chain test file exists
- `[6.dataflow.gaps]` — MANUAL (reminds operator that 3 known gaps remain documented)

Cross-reference: `LAUNCH-WALKTHROUGH.md` Sprint 0 § "Gauge" step now expects the new `[4.mirror.dryrun]` and `[6.dataflow.*]` entries; if you see fewer than 16 PASS, something regressed.

---

## §6 Decision log

| Decision | Why | Date |
|---|---|---|
| Stripe webhook test co-located with `route.ts` not in `lib/security/` | Matches the `csp-report/sanitize-log-field.test.ts` pattern; cross-org test belongs in `lib/security/` because it's policy-tested across multiple routes | 2026-05-19 |
| Mirror-sync dry-run is a SCRIPT (not a vitest test) | The script does real filesystem ops (mkdtemp, rsync, npm ci) that vitest's hermetic model doesn't support cleanly | 2026-05-19 |
| SCIM, drip dispatcher race, first-login provisioning tests deferred | Each requires substantial mock surface; doing all four in one audit PR would balloon scope past review-tractable | 2026-05-19 |
| New launch:check categories use `§6 Data flows` heading | Keeps the gauge structurally similar to GO-LIVE-CHECKLIST.md's section numbering even though we don't have a §6 there yet | 2026-05-19 |
