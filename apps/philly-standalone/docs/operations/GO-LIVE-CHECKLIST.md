# Go-live readiness checklist

This is the **last gate** before flipping a customer's tenant on in
production. Walk through every item; record the evidence; have a
second person sign off. The checklist is the bridge between
"structurally compliant code" and "we can prove it to counsel /
the customer's DPO".

Audience: operator + DPO + on-call engineer. Each item lists who
owns it, what verifies it, and where the underlying machinery
lives.

| Severity legend | Meaning |
| --- | --- |
| **HARD** | Do not go live. Customer-facing or regulator-facing exposure. |
| **SOFT** | Go live possible but flagged risk; document the gap and acceptance. |
| **NICE** | Quality-of-life; ship after launch. |

---

## §1 — Code state (engineering owns)

| # | Item | How to verify | Severity |
| - | ---- | ------------- | -------- |
| 1.1 | Branch is on a tagged release commit (no WIP) | `git log -1 --format=%H` matches a `vX.Y.Z` tag | HARD |
| 1.2 | All migrations applied to prod DB | `prisma migrate status` shows zero pending | HARD |
| 1.3 | Tests + typecheck green at the deployed commit | CI badge green; `npm test && npm run typecheck` clean locally on that SHA | HARD |
| 1.4 | `npm run audit:tenant` clean | run from `apps/philly-standalone`; expect "no findings" | HARD |
| 1.5 | `npm run audit:chain` clean against prod DB | scheduled daily; manual verification before go-live | HARD |
| 1.6 | DEUS-SHARED mirror is in sync with main | Top commit on DEUS-SHARED references the production SHA — see `MIRROR-SYNC.md` | SOFT |
| 1.7 | No `[TO FILL:` markers anywhere in code paths the customer will touch | `grep -rn "\[TO FILL:" apps/philly-standalone` returns 0 outside `docs/legal/` | HARD |

---

## §2 — Encryption + secrets (operator owns)

| # | Item | How to verify | Severity |
| - | ---- | ------------- | -------- |
| 2.1 | `INTEGRATION_SECRET` set in production env (≥ 32 bytes, random) | `vercel env ls production \| grep INTEGRATION_SECRET` | HARD |
| 2.2 | `BLIND_INDEX_SECRET` set in production env (≥ 32 bytes, random, **distinct** from INTEGRATION_SECRET) | `vercel env ls production \| grep BLIND_INDEX_SECRET` | HARD |
| 2.3 | `CRON_SECRET` set in production env (HMAC-strength) | `vercel env ls production \| grep CRON_SECRET` | HARD |
| 2.4 | Both secrets backed up to a secure vault (1Password / HashiCorp / sealed envelope) | Operator confirms recovery procedure documented + tested | HARD |
| 2.5 | Key-rotation schedule recorded — when does each secret rotate? Who owns it? | Calendar entry + operator runbook reference | SOFT |
| 2.6 | PII backfill run on existing data | `npm run pii:backfill && npm run pii:backfill-notes && npm run pii:backfill-hashes` — dry-run first, then apply, capture stdout for audit | HARD |
| 2.7 | Backfill counters verified: rows-encrypted == rows-expected | Compare CLI output count to `prisma.contact.count()` | HARD |
| 2.8 | Spot-check: pick 3 random Contact rows, confirm email/phone/notes columns are ciphertext (not plaintext), and the backfill helper successfully decrypts them | `npm run pii:verify` (if added) or manual decrypt with the helper | HARD |
| 2.9 | **Stripe billing secrets set** — `STRIPE_SECRET_KEY` (live key, not test), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_OPERATOR`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_BUSINESS` | `vercel env ls production \| grep STRIPE_` — five entries, all set | HARD |
| 2.10 | Stripe webhook endpoint registered + reachable | Stripe Dashboard → Developers → Webhooks → endpoint shows recent 200s from `customer.subscription.*` test events | HARD |
| 2.11 | All four required Stripe webhook events subscribed (`checkout.session.completed` + `customer.subscription.{created,updated,deleted}`) | Endpoint detail page → Events tab lists all four | HARD |
| 2.12 | End-to-end test-mode subscription run: signup → checkout → cancel → re-subscribe; each event hit the webhook with 200 | Stripe Dashboard event log + local `Subscription` row updates verified per `STRIPE-SETUP.md` §A-C | HARD |
| 2.13 | Stripe Tax enabled in dashboard (or external tax provider documented) | Dashboard → Tax → Status shows ✓ enabled in target jurisdictions | SOFT |

---

## §3 — Database + backups (operator owns)

| # | Item | How to verify | Severity |
| - | ---- | ------------- | -------- |
| 3.1 | Daily logical backup running (Supabase Pro or self-hosted) | Supabase Dashboard → Database → Backups shows last 7 daily backups | HARD |
| 3.2 | Point-in-time recovery enabled (Supabase Pro tier) | Same dashboard; PITR status active | SOFT |
| 3.3 | At least one full backup-restore drill completed per `BACKUP-RESTORE.md` | Drill-log entry signed off, includes restored Contact decryption verification | HARD |
| 3.4 | Encryption-key rotation history archived (last 14 days minimum) | Vault entry per the secret-rotation procedure | HARD |
| 3.5 | Database in correct region for the customer's data residency requirements (EU customers → EU region) | Supabase project settings → Region | HARD |
| 3.6 | Connection pool capped to prevent runaway opening | Supabase pgbouncer config or app-side `connection_limit` URL param | SOFT |

---

## §4 — Identity, access, multi-tenancy (operator owns)

| # | Item | How to verify | Severity |
| - | ---- | ------------- | -------- |
| 4.1 | Customer's primary admin user exists, role=admin, MFA enrolled | DB query: `SELECT id, email, role, twoFactorEnabled FROM "User" WHERE organizationId='<custId>'` | HARD |
| 4.2 | Customer's `Organization.industry` set to the right vertical (`philanthropy` / `realestate` / `hospitality` / `general`) | DB query or `/api/me` response inspection | HARD |
| 4.3 | Per-org `IpAllowlist` configured if the customer wants IP gating | `/settings/security` admin UI or DB | SOFT |
| 4.4 | Per-org session idle timeout configured (default 480 min) | Same | SOFT |
| 4.5 | If SSO is wired: SAML/OIDC provider tested with at least one real customer login | `SSO-SETUP.md` end-to-end run; capture trace of the round-trip | HARD if customer requires SSO |
| 4.6 | If SCIM is wired: ApiKey row issued with `scopes:["scim:users","scim:groups"]`; IdP test-creates + test-deletes a user successfully | `SCIM-SETUP.md` end-to-end test | HARD if customer requires SCIM |
| 4.7 | If SCIM Groups → role mapping is in use: each customer-side IdP group has its `role` and `dashboardSections` set in `/settings/scim-groups` | Admin UI inspection | SOFT |
| 4.8 | No `viewer`-role user has access to any feature that should be admin-only — spot-check with a viewer-role test account | Manual click-through of `/settings/*` and write paths | HARD |

---

## §5 — Observability + incident response (operator owns)

| # | Item | How to verify | Severity |
| - | ---- | ------------- | -------- |
| 5.1 | `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_RELEASE` set in production env | `vercel env ls production` | HARD |
| 5.2 | Sentry receives a test error from production | Trigger a `Sentry.captureMessage('go-live-test')` manually; confirm landing in Sentry within 60s | HARD |
| 5.3 | Sentry → Slack integration wired; alert rule for `level >= error` AND for `slo.over_budget == true` | Sentry → Settings → Integrations | HARD |
| 5.4 | `SLACK_ALERTS_WEBHOOK` set in Vercel + GitHub repo secrets | Both env stores show the secret | HARD |
| 5.5 | Better Stack (or equivalent) uptime monitor pointed at `/api/health` for both apps; check frequency ≤ 60s | Better Stack dashboard | HARD |
| 5.6 | GitHub Actions: `synthetic-prod.yml` running on `*/15 * * * *`; `db-slow-queries.yml` running daily; `sentry-release.yml` firing on push to `main` | GitHub Actions dashboard | SOFT |
| 5.7 | Axiom (or equivalent log shipper) integrated with Vercel | Axiom dashboard shows live log stream | SOFT |
| 5.8 | On-call rota documented + paged on Slack alert (not "we'll see it eventually") | Notion / Linear / runbook entry | HARD |
| 5.9 | Incident-response template (`BREACH-RESPONSE.md`) walked through with the on-call team in a tabletop exercise | Tabletop notes archived | SOFT |
| 5.10 | Audit-chain integrity check `audit:chain` scheduled (daily) and routed to `#ops-alerts` on failure | Cron entry + Slack alert verified | HARD |

---

## §6 — Compliance documents (counsel + DPO own)

Each of these has placeholders that **must** be filled before the
document is shown to the customer or filed with a regulator. Walk
through each `[TO FILL: …]` marker. The full list lives in
`docs/legal/LEGAL-REVIEW-CHECKLIST.md`.

| # | Document | Owner | Severity |
| - | -------- | ----- | -------- |
| 6.1 | `docs/legal/DPA.md` — Data Processing Agreement | Counsel signs off; both parties countersign | HARD |
| 6.2 | `docs/legal/PRIVACY-NOTICE.md` — published at customer-facing URL (usually `/privacy`) | Operator + counsel | HARD |
| 6.3 | `docs/legal/COOKIE-POLICY.md` — published or rolled into the privacy notice (cookieless analytics may make this very short) | Operator | HARD |
| 6.4 | `docs/legal/RECORDS-OF-PROCESSING.md` — Art. 30 RoPA filled with controller-specific values | DPO | HARD |
| 6.5 | `docs/legal/SUB-PROCESSORS.md` — accurate list (Anthropic, Supabase, Vercel, hosting region, plus customer-specific Twilio / DocuSign / etc.) | Operator + counsel | HARD |
| 6.6 | `docs/legal/BREACH-RESPONSE.md` — appendix A on-call list filled with real names + phone numbers | Operator | HARD |
| 6.7 | `docs/legal/DPIA-AI-ATTRIBUTES.md` — DPO sign-off line dated; controller sign-off line dated; trigger-for-re-DPIA understood | DPO + controller | HARD if AI Attributes feature enabled |
| 6.8 | DPO appointed (Art. 37) if processing volume / sensitivity requires it; if not appointed, controller acts as DPO and that's documented | Operator + counsel | HARD per Art. 37 |
| 6.9 | EU representative appointed (Art. 27) if controller is outside EU but offers services to EU residents | Counsel | HARD if applicable |

---

## §7 — Feature flags + kill-switches (operator owns)

The system ships with kill-switches for the most common runaway
risks. Configure these to your customer's preferred default before
go-live.

| # | Flag | Default | Confirm setting in `/settings/features` | Severity |
| - | ---- | ------- | ----------------------------------------- | -------- |
| 7.1 | `ai-contact-enrichment` | enabled | Operator decides per customer (DPIA-relevant) | HARD if AI Attributes is the deal-breaker |
| 7.2 | `ai-deal-scoring` | enabled | Operator decides per customer | SOFT |
| 7.3 | `webhooks` | enabled | Disable during initial migration to prevent test-data fan-out | SOFT |
| 7.4 | `realtime` | enabled | Almost always on | NICE |
| 7.5 | `scim` | enabled | Disable if no SCIM customer yet | NICE |
| 7.6 | `drip-campaigns` | enabled | Disable until first drip campaign is configured + dry-run sent | SOFT |

---

## §8 — Customer onboarding (operator + customer owns)

| # | Item | Verifier | Severity |
| - | ---- | -------- | -------- |
| 8.1 | Customer has at least one admin user trained on `/settings/users` and `/settings/security` | Live walkthrough recording or training notes | HARD |
| 8.2 | Customer has read + signed off on the privacy notice + DPA | Counter-signed PDF in a vault | HARD |
| 8.3 | Customer-side data import dry-run completed (CSV → contacts) without errors | Operator-side log of the import | HARD if customer is migrating from prior CRM |
| 8.4 | Customer-side branding applied (logo, colours) — `Organization.industry` + theme | Visual inspection | NICE |
| 8.5 | Customer's data subjects (their contacts) informed about the new processing — Art. 14 if data was collected from third parties, Art. 13 if collected directly | Customer's responsibility; operator confirms it's been addressed | HARD if customer has existing contacts being migrated |
| 8.6 | Customer-side test of the "Erase me" flow: `POST /api/me/account-deletion` → cron sweep → row absent + audit log entry | Operator-side log + DB check | SOFT |

---

## §9 — Final pre-flip checks (operator + on-call own)

| # | Item | Severity |
| - | ---- | -------- |
| 9.1 | DNS for the customer's CRM hostname (e.g. `app.<customer>.com`) points at the Vercel deployment | HARD |
| 9.2 | SSL certificate valid + auto-renewing (LetsEncrypt via Vercel handles this; verify expiry > 60 days) | HARD |
| 9.3 | `proxy.ts` host-allowlist includes the customer's hostname (if applicable) | SOFT |
| 9.4 | Status page (`status.<customer>.com` or shared) reflects the customer's deployment | NICE |
| 9.5 | Rollback plan documented — if the first hour goes wrong, what's the procedure to revert? | HARD |
| 9.6 | First-hour monitoring window — at least one engineer watching the Sentry + Slack feeds for the first 60 min after flip | HARD |
| 9.7 | Customer's go-live announcement scheduled AFTER the flip + 30min stable observation, not before | SOFT |

---

## Sign-off

When every HARD item is checked, capture:

| Field | Value |
| ----- | ----- |
| Customer name | [TO FILL] |
| Tenant id (`Organization.id`) | [TO FILL] |
| Production deploy SHA | [TO FILL] |
| Date of go-live | [TO FILL] |
| Operator sign-off | [TO FILL: name + signature + date] |
| Engineering sign-off | [TO FILL: name + signature + date] |
| DPO sign-off (or "controller-acted") | [TO FILL: name + signature + date] |

Archive a copy of this completed checklist in your customer-folder
(plus a redacted version in your audit-evidence folder for the
inevitable SOC 2 / ISO 27001 / EU AI Act conformity assessment).

## Re-running

Run this checklist:
- Once per **new customer** before their first production user logs in.
- Once per **major release** (e.g. when a new compliance-relevant
  feature like AI Attributes ships) — re-walk §6 (DPIA, RoPA,
  privacy notice).
- Once per **encryption-key rotation** — re-walk §2 (especially
  §2.6 backfill verification).
- Once per **quarter** as a continuous-compliance drill — pick
  a representative customer and walk it.

## Reference

- [`OBSERVABILITY.md`](./OBSERVABILITY.md) — the monitoring / Sentry / Slack wiring
- [`BACKUP-RESTORE.md`](./BACKUP-RESTORE.md) — the §3.3 drill protocol
- [`SSO-SETUP.md`](./SSO-SETUP.md) — the §4.5 SSO wiring
- [`SCIM-SETUP.md`](./SCIM-SETUP.md) — the §4.6 SCIM wiring
- [`STATUS-PAGE.md`](./STATUS-PAGE.md) — the §9.4 public status surface
- [`MIRROR-SYNC.md`](./MIRROR-SYNC.md) — the §1.6 DEUS-SHARED sync
- [`PII-ENCRYPTION.md`](./PII-ENCRYPTION.md) — the §2 encryption + key-rotation specifics
- [`SESSION-POLICY.md`](./SESSION-POLICY.md) — the §4.4 session-idle policy
- [`ONBOARDING.md`](./ONBOARDING.md) — the §8.1 customer-admin training reference
- [`../legal/LEGAL-REVIEW-CHECKLIST.md`](../legal/LEGAL-REVIEW-CHECKLIST.md) — the §6 placeholder map
