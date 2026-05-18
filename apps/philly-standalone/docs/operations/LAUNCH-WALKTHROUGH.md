# Launch walkthrough — solo operator, ~2 hour path to customer #1

This is the **opinionated, time-boxed** path through the items in
[GO-LIVE-CHECKLIST.md](GO-LIVE-CHECKLIST.md) for the case where the
operator is the only person involved — no counsel on retainer, no
in-house DPO, no second engineer.

It is **not** a replacement for the checklist; it sequences the
checklist into three focused sprints with `scripts/check-launch-readiness.ts`
as the gauge after every sprint.

> **Run the gauge first:** `npm run launch:check` from
> `apps/philly-standalone/`. The output tells you where you actually
> stand. The walkthrough below closes the gaps the gauge surfaces.

---

## Operator-readiness assumptions

Before you start, you need accounts + access ready:

- **Stripe** account (live mode unlocked, business details complete).
- **Vercel** project for `juandiazllc.com` with the production
  deployment hooked up to `main`.
- **Supabase** project (production) — URL + anon key + DB connection
  string.
- **GitHub** repo admin access (to set repository secrets).
- A **secrets vault** of your choice (1Password, Bitwarden, SOPS, or
  a sealed envelope in a fire safe — anything you trust).
- The local repo at `apps/philly-standalone/` with `npm install` done
  and `npm run launch:check` working.

If any of those is missing, fix that first; the walkthrough assumes
they're in place.

---

## What we deliberately defer

For a solo first-launch the bar is "the most-likely customer-data-loss
or money-loss class of risk is closed". Two classes are explicitly
parked:

| Item | Defer until | Justification |
|---|---|---|
| Counsel sign-off on `docs/legal/*.md` [TO FILL] markers | After customer #1 | Counsel review is a 1-2 week round-trip; pre-launch you can substitute (a) your own first-pass fill with self-acknowledged risk noted in an `ACCEPTED-RISKS.md`, and (b) commit to counsel review within 30 days of first customer. |
| DPO countersign on RoPA + DPIA | After customer #10 OR within 60 days, whichever first | A solo operator doesn't need a retained DPO under GDPR unless processing scale is high. Document the absence; revisit at the 10-customer milestone. |
| Backup-restore drill (formal capture) | After customer #5 | Verify backups exist + are recoverable now (15 min). The formal documented-drill ritual can come once data volume justifies the time. |

Each of these gets an entry in `docs/operations/ACCEPTED-RISKS.md` so
future you (or a counsel reviewing in 30 days) sees the deliberate
decision, not a forgotten gap.

---

## Sprint 0 — Test-mode end to end (30 min)

Goal: prove the full flow works without any customer-money risk.

### S0.1 Stripe products in TEST mode (10 min)

1. Stripe Dashboard → Products → create three products (`Operator`, `Team`, `Business`) with the prices from `lib/philly/billing/plans.ts`. Stay in **test** mode.
2. Copy the three `price_…` IDs into your `.env.local`:
   ```
   STRIPE_PRICE_OPERATOR=price_…
   STRIPE_PRICE_TEAM=price_…
   STRIPE_PRICE_BUSINESS=price_…
   ```
3. Set `STRIPE_SECRET_KEY` to your test key (`sk_test_…`) in `.env.local` too.

> **Rollback:** delete the test products from the Dashboard, drop the
> env entries. Zero customer impact.

### S0.2 Local end-to-end (15 min)

1. `npm run db:push` against a fresh local DB (NOT production yet).
2. `npm run dev` → visit `/signup` → create a test account → land on `/welcome`.
3. Pick a plan, hit Continue → Stripe-hosted checkout opens in test mode.
4. Pay with test card `4242 4242 4242 4242`.
5. Verify in DB: `Subscription` row exists with status `active`.

> **Rollback:** drop the local DB. No outside state changed.

### S0.3 Gauge (5 min)

```bash
cd apps/philly-standalone
npm run launch:check
```

Expect: all PASS in Code state + Mirror; PII backfill scripts PASS;
Stripe checks remain MANUAL (correct, since these check files not API
state). Legal [TO FILL] markers remain MANUAL.

---

## Sprint 1 — Production secrets (45 min)

Goal: every server-side secret the live app needs is provisioned in
Vercel production env AND backed up to your vault.

### S1.1 Generate the three repo secrets (10 min)

```bash
# 32-byte random for each — must be DISTINCT.
node -e "console.log('INTEGRATION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('BLIND_INDEX_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

Store the three values in your vault BEFORE doing anything else. Once they
go into Vercel you cannot retrieve them.

### S1.2 Push secrets to Vercel production (15 min)

For each of the 11 secrets, use the Vercel CLI:

```bash
vercel env add INTEGRATION_SECRET production
# paste the value generated above
vercel env add BLIND_INDEX_SECRET production
vercel env add CRON_SECRET production
vercel env add SENTRY_DSN production            # from sentry.io project settings
vercel env add SLACK_WEBHOOK_URL production     # incoming-webhook url from Slack
vercel env add STRIPE_SECRET_KEY production     # sk_live_…
vercel env add STRIPE_WEBHOOK_SECRET production # filled in S2 below
vercel env add STRIPE_PRICE_OPERATOR production # price_… from live Stripe products (S2.1)
vercel env add STRIPE_PRICE_TEAM production
vercel env add STRIPE_PRICE_BUSINESS production
vercel env add DEUS_SHARED_PAT production       # PAT created in S1.3 below
```

> **Rollback:** `vercel env rm <NAME> production`. Note that secrets
> are still in your vault — Vercel deletion is reversible.

### S1.3 Create the DEUS_SHARED_PAT (10 min)

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens.
2. Token name `deus-shared-mirror`, expires in 1 year, repo scope: `bongartzdiaz/DEUS-SHARED`.
3. Permissions: Contents (Read + Write), Metadata (Read).
4. Generate → paste into vault → paste into `vercel env add` above AND into the repo's GitHub Actions secrets at `Settings → Secrets and variables → Actions → New repository secret`.

### S1.4 Gauge

`npm run launch:check` — Secrets section should now be all PASS for
`*.env.example` entries (those check the names, not the prod values).
Manual items remain.

---

## Sprint 2 — Production data + live Stripe flip (45 min)

Goal: production DB has all migrations + PII backfilled; Stripe is in
**live** mode with the webhook receiving events.

### S2.1 Live Stripe products + webhook (15 min)

Identical to S0.1 but in **live** mode:

1. Stripe Dashboard → toggle to live mode → create three Products with the same shape as in test.
2. Webhooks → Add endpoint:
   - URL: `https://juandiazllc.com/api/webhooks/stripe`
   - Events (4): `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Click into the new endpoint → reveal signing secret → paste into `STRIPE_WEBHOOK_SECRET` in your vault.
4. `vercel env add STRIPE_WEBHOOK_SECRET production` with that value.

> **Rollback:** disable the webhook endpoint. Stripe stops sending; the
> app continues to work for already-active subscriptions (it just won't
> see new ones).

### S2.2 Production migrate (10 min)

```bash
# From apps/philly-standalone/ with DATABASE_URL pointed at production.
npx prisma migrate status              # show what would happen
npx prisma migrate deploy              # apply
npx prisma migrate status              # confirm zero pending
```

> **Rollback:** Prisma migrations are forward-only. The "rollback" is
> a prior backup restore — verify your Supabase point-in-time recovery
> works BEFORE running this. (See S2.5.)

### S2.3 PII backfill (15 min)

If you have existing Contact rows in production:

```bash
# Dry run first — count what would change.
npm run pii:backfill -- --dry-run
npm run pii:backfill-notes -- --dry-run
npm run pii:backfill-hashes -- --dry-run

# Apply. Each script logs row-by-row; pipe to file for audit.
npm run pii:backfill | tee /tmp/pii-backfill.log
npm run pii:backfill-notes | tee /tmp/pii-backfill-notes.log
npm run pii:backfill-hashes | tee /tmp/pii-backfill-hashes.log
```

If you have zero existing rows (first launch), skip — the scripts are
no-ops on empty tables.

> **Rollback:** the backfill is non-destructive (it re-writes ciphertext;
> the original plaintext is now ciphertext but the key is in your vault).
> If you need to recover original plaintext: decrypt with the same key.

### S2.4 Verify backup recovery (5 min)

Supabase Dashboard → Database → Backups → take a manual snapshot
NOW (in addition to the rolling daily ones). Note the snapshot ID in
`docs/operations/ACCEPTED-RISKS.md`. You haven't done the formal drill
but you have a known-good point-in-time to restore to.

---

## Sprint 3 — Live mode flip (15 min)

Goal: merge PR #10 and watch the first real production deploy succeed.

### S3.1 Pre-flight gauge

```bash
npm run launch:check
```

All automated checks should be PASS or MANUAL. No FAIL. If anything
shows FAIL, do not proceed — investigate.

### S3.2 Merge PR #10

```bash
gh pr merge 10 --repo bongartzdiaz/juandiazllc.com --squash
```

Vercel auto-deploys `main` to `juandiazllc.com`. Watch the deploy logs;
expect: `prisma generate`, `next build`, ready in ~3 min.

### S3.3 Trigger first DEUS-SHARED sync

```bash
gh workflow run sync-deus-shared.yml --repo bongartzdiaz/juandiazllc.com
```

After ~1 min, check `https://github.com/bongartzdiaz/DEUS-SHARED` — a
new commit should appear with the message `Sync philly-standalone @ juandiazllc.com <sha>`.

### S3.4 Smoke the production checkout (5 min)

1. Open an incognito window to `https://juandiazllc.com/signup`.
2. Sign up with a real email (use a test domain like `@delivered-yard.app` so it's a real Supabase user).
3. Go through `/welcome` → Stripe checkout in live mode.
4. Use a real card with a tiny amount, OR abort at the Stripe page (no charge incurred for abandoned checkout).
5. Verify `Subscription` row appears in your production DB.

If the abandon-flow looks right, you're live. The first paying
customer can now follow the exact same path with a real card.

> **Rollback:** revert PR #10's merge commit. Vercel auto-deploys the
> revert. Stripe webhook keeps working (it's a URL not a deploy-bound
> thing). Existing subscriptions continue billing.

---

## After customer #1 — the deferred items

Within 7 days of customer #1:

- [ ] First-pass fill of `docs/legal/*.md` `[TO FILL:]` markers. Use AI assistance for the boilerplate, then send the diff to counsel for sign-off. Add row to `ACCEPTED-RISKS.md`.
- [ ] Formal backup-restore drill following `BACKUP-RESTORE.md`. Capture screenshots; check off §5 in `GO-LIVE-CHECKLIST.md`.
- [ ] If processing-scale crosses ~1000 contacts: retain a DPO and get RoPA + DPIA countersign.
- [ ] Re-run `npm run launch:check` and confirm zero MANUAL items remain.

---

## Reference

- The authoritative checklist: [GO-LIVE-CHECKLIST.md](GO-LIVE-CHECKLIST.md)
- Stripe specifics: [STRIPE-SETUP.md](STRIPE-SETUP.md)
- Mirror flow: [MIRROR-SYNC.md](MIRROR-SYNC.md)
- Backups: [BACKUP-RESTORE.md](BACKUP-RESTORE.md)
- The gauge: `scripts/check-launch-readiness.ts` (run with `npm run launch:check`)

This walkthrough lives at `apps/philly-standalone/docs/operations/LAUNCH-WALKTHROUGH.md`
and is partner-deploy reusable — anyone receiving the DEUS-SHARED
mirror runs the same path.
