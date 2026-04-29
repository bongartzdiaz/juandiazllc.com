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

Translation coverage: `npm run kb:check` reports which en docs
are missing nl/de/es translations and which translations have
gone stale (en updated more recently than the translation).
Informational by default; set `CHECK_KB_STRICT=1` to make CI
fail when coverage isn't 100%.

### Mandatory 2FA on admin role

Admins are required to enroll a TOTP authenticator. Without it,
`requireRole(['admin'])` returns 409 with `code: 'NEEDS_2FA'`,
admin server pages redirect to `/setup-2fa`, and admin API
routes reject. The `/setup-2fa` wizard generates a QR, verifies
the first code, and surfaces 10 single-use recovery codes once.

Enforcement is env-gated:

```
ADMIN_MFA_ENFORCED=true     # production default
ADMIN_MFA_ENFORCED=false    # dev / test (also default when NODE_ENV != production)
```

The `/api/2fa/{setup,verify,disable,recovery-codes}` endpoints
use `requireScope` (not `requireRole`) so an admin who hasn't
enrolled yet can still reach them. Disabling 2FA while admin-MFA
is enforced is rejected by `/api/2fa/disable` — demote yourself
to manager first if you need to remove your own 2FA.

### Cross-org integration tests

`scripts/test-integration.sh` brings up a MariaDB container
(`docker/test-db/docker-compose.yml` — tmpfs-backed for speed),
runs `prisma migrate deploy`, and executes
`lib/security/cross-org.integration.test.ts` against it. The
suite proves cross-tenant isolation holds end-to-end through
the full Prisma + DB stack: reads, writes, GDPR erasure, GDPR
export, audit log, assistant memory, and global user
uniqueness.

```
npm run test:integration         # bring DB up + migrate + run
npm run test:integration:down    # stop + wipe the test DB
```

The container stays running between iterations for fast
turnaround; each test resets DB state in `beforeEach` so order
doesn't matter.

### Obsidian vault sync

The KB + legal docs + runbook + auto-generated RoPA / PII registry
/ schema diagram / API inventory two-way sync to an Obsidian
vault for offline review and graph-style navigation.

```bash
OBSIDIAN_VAULT_PATH=/path/to/your/vault npm run vault:sync
```

Subcommands: `vault:export` (push only), `vault:import` (pull
only), `vault:check` (dry-run). Default vault path is
`./obsidian-vault` (gitignored). Markdown links round-trip
losslessly to/from Obsidian wikilinks; auto-generated
`system/*` notes are regenerated from code on every export and
never imported back.

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

Multi-org access (Bundle G) is unit-tested in
`lib/philly/auth-helpers.test.ts` (active-org cookie resolution +
fallback paths) and `lib/membership/remove.test.ts` (last-admin and
home-org guards). The `Membership` table is the canonical source for
"who can administer org X"; every home-org user has a mirrored
Membership row by migration backfill plus the POST /api/users
invariant.

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
dashboardSections }`. The route branches on whether the email
already has a `User` row:

- **New email** — pre-creates the Philly `User` row in the admin's
  org, mirrors the home-org `Membership`, sends a Supabase invite.
  When the invitee signs in, `resolvePhillyUser` finds their row
  and lands them in the admin's org.
- **Existing email, different org** (multi-org consultant case) —
  upserts a `Membership` row in the admin's org with the requested
  role. The user's home org is unchanged. The next sign-in shows the
  org-switcher in the topbar so they can move between orgs.
- **Existing email, same org** — 409 (already on this team).

### Switching orgs (multi-org users)

The topbar `OrgSwitcher` lists every org the user has a `Membership`
in. Selecting one calls `POST /api/me/active-org` which sets the
`philly-active-org` cookie (httpOnly, sameSite=lax, 30 days) and
reloads. `requireScope` reads the cookie and resolves
`scope.organizationId`, `scope.role`, and `scope.dashboardSections`
from the matching `Membership` row. A cookie pointing at an org the
user no longer belongs to silently falls back to the home org; the
next switch will overwrite the cookie cleanly.

### Demoting / removing an admin

- `PATCH /api/users { userId, role: "viewer" }` demotes a home-org
  user. Refuses to drop the last admin (HTTP 400). Promote a
  successor first.
- `DELETE /api/users/[id]/membership` revokes a non-home-org
  Membership. Refuses if the user's home org is the caller's org
  (use the user-deletion path instead) or if removing the row would
  leave the org with zero admins. The User record and any data the
  user authored stay in place — this is access-revocation, not data
  deletion. See `docs/user/en/concepts/multi-org.md` for the full
  data model.

### Rotating `INTEGRATION_SECRET` (online — Bundle Q)

`lib/philly/crypto.ts` supports a key list. Writes use the FIRST
configured key; reads try every configured key in order. Three-phase
rotation, zero downtime:

1. Deploy with `INTEGRATION_SECRET=<NEW>` and
   `INTEGRATION_SECRET_V2=<OLD>` set simultaneously.
2. Run `npm run pii:rotate -- --dry`, then `npm run pii:rotate` to
   re-encrypt every row under the new key.
3. Once `pii:rotate --dry` reports `rotated=0`, unset
   `INTEGRATION_SECRET_V2` and redeploy.

Up to 8 keys (V1..V8) can be active simultaneously for staged
rotations. Full procedure + exit-code reference in
`docs/operations/PII-ENCRYPTION.md`.

### Configuring SCIM (Bundle R)

To wire an enterprise customer's IdP for automated user
provisioning:

1. Issue an `ApiKey` row with `scopes: ["scim:users"]` (32+ bytes
   of entropy, hashed at rest).
2. Hand the bearer token to the customer's IT.
3. Customer points their IdP at `/api/scim/v2/`. Full Okta + Entra
   ID setup walkthrough in `docs/operations/SCIM-SETUP.md`.

### Verifying audit-chain integrity

```bash
npm run audit:chain                    # all orgs, summary
npm run audit:chain -- --json          # CI/cron pipe
npm run audit:chain -- --org=<orgId>   # one tenant
```

Exit 0 = clean, 1 = chains have broken entries (tampering),
2 = transient error. Schedule daily; pipe to your SIEM.

### Encrypting `ContactNote.content` (Bundle U)

Bundle U adds at-rest encryption (AES-256-GCM, `enc:v1:` prefix) to
`ContactNote.content`. New writes encrypt automatically; legacy
plaintext rows fall through on read until backfilled:

```bash
npm run pii:backfill-notes -- --dry              # report counts
npm run pii:backfill-notes                       # all orgs
npm run pii:backfill-notes -- --org=<orgId>      # one tenant
```

Idempotent. Re-running skips rows already prefixed. The shared
`npm run pii:rotate` covers BOTH `Contact.notes` and
`ContactNote.content` in a single pass — no separate rotate CLI for
notes.

### Keyboard shortcuts (Bundle AB)

Mounted globally on every authenticated page via
`<KeyboardShortcuts />` (in `ProtectedShell`). Operators press
`?` to see the cheat sheet. Two-key chords (e.g. `g c` → Contacts)
expire after 1.2 seconds. Shortcuts are suppressed while typing
in inputs.

To add a binding: edit `components/philly/ui/KeyboardShortcuts.tsx`
— add to the `useGlobalShortcuts({...})` map AND to the `NAV` or
`ACTIONS` array so the cheat sheet stays in sync.

### Column customization (Bundle AC + AH + AJ)

Each table-shaped list view ships a `Columns` popover top-right.
Visibility persists per browser per `pai-<entity>-columns-v1`
key. The Reset button clears the override.

Wired today: deals (list view), transactions, grants, volunteers,
referrals, lead-scores, e-signatures. Documents (card grid) and
inbox (master/detail with only 3 columns) are intentionally
not wired — the picker has too few togglables to be useful there.

Showings / open-houses / commissions / dialer are mechanical
lifts using the same recipe (see `CLAUDE.md`).

### Right-click menu (Bundle AD + AE + AK)

Cards on every list/grid page expose a right-click menu. Items
per page:
- Contacts: Open / Quick view / Edit / Select / Copy email /
  Copy phone / Delete
- Deals: Open / Quick view / Mark won / Mark lost / Copy contact /
  Delete (list + kanban)
- Properties: Open / Quick view / Valuation / Copy address / Delete
- Projects: Quick view / Open full page / Copy title / Delete
  (Open + Delete disabled in RE/HOS demo modes)

The menu primitive (`<ContextMenu>`) is generic — per-page wiring
lives in each `app/<entity>/page.tsx`.

### `j` / `k` row navigation (Bundle AF + AI)

Wired on: deals list view, properties grid, transactions list.
`j` next, `k` previous, `Enter` opens the focused row. Focus
follows mouse hover too. The deals page hides the bindings in
kanban view via `useGlobalShortcuts(..., view === 'list')`. The
deal kanban (2D layout) is intentionally not bound yet.

### Drag-drop reorder (Bundle AG + AL)

Adds manual ordering. Operators drag one row/card onto another
to insert above it.

Wired today:
- Contacts (live mode only — demo industries keep their hand-curated arrays)
- Deals LIST view (kanban already uses dnd to move between stages,
  so reorder lives on the list only — we don't double-bind)

Backends:
- `POST /api/contacts/reorder { ids: string[] }`
- `POST /api/deals/reorder { ids: string[] }`

Both write `displayOrder = idx + 1` inside a `prisma.$transaction`,
rate-limited via `PRESET_MUTATION`, capped at 500 ids/call.

Schemas:
- `Contact.displayOrder BIGINT NULL` + `(organizationId, displayOrder)` index
  — migration `20260429000000_contact_display_order`
- `Deal.displayOrder BIGINT NULL` + `(pipelineId, displayOrder)` index
  — migration `20260429010000_deal_display_order`

Both list endpoints `orderBy: [displayOrder asc nulls last, createdAt desc]`.

To reset all manual orders for an org/pipeline:
```sql
UPDATE Contact SET displayOrder = NULL WHERE organizationId = '<orgId>';
UPDATE Deal SET displayOrder = NULL WHERE pipelineId = '<pipelineId>';
```

### Advanced filter builder (Bundle AM)

The contacts list ships an "Filters" button (live mode only) that
opens a builder modal. Operators add type-aware rules (Name
contains, ICP fit ≥ 70, Type is any of donor/partner, Added after
2026-01-01, etc.) joined by AND or OR.

The filter compiles server-side via
`lib/philly/filter/compile.ts`. Every field is declared on
`lib/philly/filter/schemas.ts:CONTACT_FILTER_SCHEMA` — fields not
on that allowlist are rejected with a 400. The unconditional
`{ organizationId: scope.organizationId }` AND wrap means an
attacker who somehow injects a clause can't escape their tenant.

Email + phone use exact-match only via the blind-index hashes
from Bundle P; substring on those columns isn't possible (random
IVs). The UI surfaces this caveat in the builder footer.

Saved views (Bundle AA) carry the advanced filter under
`filters.advanced`, so a saved-and-shared filter survives a
refresh.

Operators using the Saved Views feature can save an advanced
filter to share across the org — see `CLAUDE.md` for the
reference.

### Saved views (Bundle AA)

Per-user filter+view bundles persisted on `SavedView`. The chip-bar
appears above the list/grid on `/contacts`, `/deals`, `/properties`.
Operators can save the current filter state, switch back to it
later, or share with the org.

API surface:
- `GET    /api/views?entity=<contacts|deals|properties>`
- `POST   /api/views { entity, name, filtersJson, isShared }`
- `PATCH  /api/views/[id]` (rename / toggle shared)
- `DELETE /api/views/[id]`

Permission model:
- A user can always edit/delete their OWN view.
- Admins/managers can edit/delete a SHARED view.
- A shared view becomes visible to every user in the same org.

There's no separate migration — `SavedView` was added to the schema
in an earlier branch. Verify the column is present before deploy:

```bash
mysql -e "DESCRIBE SavedView" $DB_NAME
```

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
