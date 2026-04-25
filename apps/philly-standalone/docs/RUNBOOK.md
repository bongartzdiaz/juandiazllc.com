# Operations runbook

Everything an on-call engineer needs to operate the Philly CRM in
production. Pair this with `docs/legal/BREACH-RESPONSE.md` for any
incident that may have leaked personal data.

## 1. Deploy

The standalone is a Next.js 16 app. Two deploy targets are supported:

- **Vercel** — drop `apps/philly-standalone/` into a Vercel project,
  point the build to `npm run build`, and set the env vars from
  `.env.example`. Vercel Cron picks up `vercel.json` automatically.
- **Self-hosted** — `npm run build && npm run start`. Configure a
  cron runner (systemd timer, k8s CronJob, etc.) to POST
  `/api/cron/gdpr-retention` daily at 03:00 UTC with
  `Authorization: Bearer $CRON_SECRET`.

### Pre-flight checklist

- [ ] All required env vars from `.env.example` set (the "Required in
      production" block — without `INTEGRATION_SECRET` encryption
      silently uses a dev-only key).
- [ ] `npm run db:migrate` applied (latest migration:
      `20260425010000_audit_hash_chain`).
- [ ] `prisma generate` run (build script does this automatically).
- [ ] `INTEGRATION_SECRET` is at least 32 random bytes
      (`openssl rand -base64 32`).
- [ ] `OAUTH_STATE_SECRET` is set (separate value from above).
- [ ] `CRON_SECRET` set in Vercel project / k8s secret manager.
- [ ] Supabase project created; auth provider configured for the
      target domain.
- [ ] Sentry DSN, environment, release tag set (optional but
      recommended).
- [ ] Smoke test: visit `/api/health` — expect `{"status":"ok"}` with
      a sub-100ms `database` check.

## 2. Health monitoring

| Endpoint        | Purpose                                | Auth          | Cadence (recommended) |
| --------------- | -------------------------------------- | ------------- | --------------------- |
| `GET /api/health` | Liveness + DB readiness probe       | Public        | Every 30s             |
| `GET /api/admin/audit/verify` | AuditLog hash chain check | Admin session | Daily, on-call review |

A `/api/health` 503 means the DB connection failed — page on-call.

A `409` from `/api/admin/audit/verify` means the AuditLog hash chain
has been tampered with. **This is a security incident** — open the
breach-response runbook (`docs/legal/BREACH-RESPONSE.md`) and
contact the privacy on-call.

## 3. Backup & restore

The CRM stores all data in MariaDB (Prisma adapter
`@prisma/adapter-mariadb`). The recommended posture:

- **Daily logical backup** — `mysqldump --single-transaction
  --quick --routines --triggers $DATABASE_URL > philly-$(date +%F).sql.gz`
  to S3-compatible storage with a 30-day rolling retention.
- **Point-in-time recovery** — enable binary logging on the MariaDB
  server with at least 7 days of retention; combine with the daily
  full to get RPO ≤ 1h, RTO ≤ 30min.
- **Restore drill** — once per quarter, restore the latest full to
  a staging instance and run the smoke test (`/api/health` plus a
  manual login + create-contact). Document the runtime; if it
  exceeds the RTO budget, raise a ticket.

The encrypted at-rest tokens (`Integration.accessToken`,
`Webhook.secret`, `User.twoFactorSecret`) are useless without
`INTEGRATION_SECRET`. **Back the secret up separately** in the same
key-management system that holds your `DATABASE_URL` credential —
losing it means every encrypted column becomes unreadable.

## 4. Routine cron

| Cron path                  | Schedule    | What it does                                     |
| -------------------------- | ----------- | ------------------------------------------------ |
| `/api/cron/gdpr-retention` | `0 3 * * *` | GDPR Art. 5(1)(e) retention purge + finalises    |
|                            |             | scheduled-deletion users from Bundle A.          |

### In-app AI assistant

The `/assistant` page calls a self-hosted Ollama box (separate VPS).
See `docker/ollama/README.md` for provisioning.

| Endpoint                   | Auth        | Purpose                                          |
| -------------------------- | ----------- | ------------------------------------------------ |
| `GET /api/assistant/health`| Admin       | Diagnostics: Ollama reachable + models loaded + KB index |
| `POST /api/assistant/ask`  | Any user    | Streaming chat (NDJSON)                          |
| `GET /api/assistant/conversations` | Any user | List the caller's chat history             |

Required env on the standalone: `OLLAMA_BASE_URL`,
`ASSISTANT_CHAT_MODEL`, `ASSISTANT_EMBED_MODEL`. Plus
`OLLAMA_AUTH_TOKEN` for production deployments where Caddy gates
the Ollama VPS. Default models: `qwen2.5:14b-instruct-q4_K_M`
(chat) + `bge-m3` (embeddings).

Build the KB index with `npm run kb:build` whenever docs change.
The output (`data/assistant-kb.json`) is committed to git so
production deploys don't need a running Ollama at build time.

The cron is registered in `vercel.json`. For non-Vercel deploys,
configure your scheduler to POST with the Bearer token and a 60s
timeout. Failures are logged at error level; alert on consecutive
failures (3+ in a row).

## 5. Tenant-isolation guarantees

Every API route under `app/api/` either:

- Calls `requireScope` / `requireRole` / `requireSection` and scopes
  Prisma queries by `scope.organizationId`, OR
- Is exempt for a documented reason (see `EXEMPT_PATHS` in
  `scripts/audit-tenant-isolation.ts`).

Re-run the audit before every release: `npm run audit:tenant`. A
clean exit (0) means no new isolation gaps were introduced. A
non-zero exit names the offending route.

The cross-tenant guarantee is unit-tested in
`lib/onboarding/create-org.test.ts` ("two unrelated signups land in
two separate organizations") — that test pins the fix for the
prior shared-default-org behavior. Removing or weakening it should
require a security-team review.

## 6. Common operational tasks

### Onboarding a new organization

1. The first signed-in Supabase user with a fresh email lands on
   `/onboarding` (the dashboard layout fetches `/api/onboarding/status`
   and redirects on `needsOnboarding: true`).
2. They submit a name → `POST /api/onboarding/create-org` creates
   the `Organization` + their `User` row as `admin` in one
   transaction.
3. They now see the dashboard and can invite teammates from
   `/settings/users`.

### Inviting a teammate

`/settings/users` (admin) → `POST /api/users { email, role,
dashboardSections }` → pre-creates the Philly `User` row in the
admin's org → sends a Supabase invite email. When the invitee signs
in, `resolvePhillyUser` finds their row by email and lands them in
the admin's org.

### Demoting / removing an admin

`PATCH /api/users { userId, role: "viewer" }`. The route refuses to
demote the last admin in an org (HTTP 400). Promote a successor
first.

### Rotating `INTEGRATION_SECRET`

There is currently no in-place rotation. Rotation requires:

1. Bring up a worker that decrypts every `Integration.accessToken`,
   `Integration.refreshToken`, `Webhook.secret`, and
   `User.twoFactorSecret` with the OLD key, then re-encrypts with
   the NEW key.
2. Deploy with `INTEGRATION_SECRET` = new key.
3. Verify via `/api/health` and a representative integration
   round-trip.

This is on the roadmap as `keys-rotate` but not implemented yet.
Until it is, treat `INTEGRATION_SECRET` as a once-set, never-rotate
secret — back it up offline.

## 7. Security CI

GitHub Actions `.github/workflows/security.yml` runs:

- `npm audit --audit-level=high` over the parent monorepo and
  `apps/philly-standalone` on PR + push to main + Mondays at 06:00 UTC.
- `gitleaks` full-history secret scan on the same triggers.

A failing run blocks merges. To investigate a finding, check the
Actions tab; for an `npm audit` advisory, look at
`https://github.com/advisories/<id>`.

## 8. Contacts

| Role                    | Channel                       |
| ----------------------- | ----------------------------- |
| Engineering on-call     | Pager (rotating)              |
| Privacy / DPO           | `<privacy@example.com>`       |
| Incident channel        | `#incident` on Slack          |
| Outside counsel         | (in `docs/legal/BREACH-RESPONSE.md`) |
