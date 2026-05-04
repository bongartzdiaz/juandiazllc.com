# Philly CRM — team onboarding

Welcome. Read this in order; you should be able to demo, customize, and
deploy the product for a customer by the end of it. Plan ~4 hours including
a local boot and a click-through. Companion docs in this folder go deeper
on each operational concern — this file points you at them.

## 1. What the product is

Philly CRM is an **operator-first, multi-tenant CRM** for small-to-mid
European service businesses that have outgrown a spreadsheet but don't
want a Salesforce procurement cycle. "Operator-first" means the people
configuring the product (a sales-engineer or implementation lead) get
first-class tooling — feature flags, saved views, drip campaigns, audit
log, GDPR exports — without writing code. Customers log in, see their org,
and never see another customer's data. Tenancy is a hard `organizationId`
AND-clause on every query, audited by `npm run audit:tenant`.

The same codebase ships **three industry skins**: `philanthropy` (grants,
volunteers, impact), `realestate` (properties, showings, open-houses,
commissions, dialer), `hospitality` (rooms, reservations, housekeeping).
The active vertical is determined by `Organization.industry`; admins keep
a switcher for previewing the others. Shared modules — contacts, deals,
documents, automations, AI command-bar, drip campaigns, audit, settings —
are vertical-agnostic and present in all three skins.

**Non-goals.** This is not a consumer or B2C product. There is no public
sign-up flow, no social graph, no marketplace, no payments processor, no
mobile-native client. The customer profile is a 5-to-200-seat European
operator with EU-GDPR procurement requirements (DPA, RoPA, sub-processors,
DPIA, breach response, encryption-at-rest). If a prospect wants
LinkedIn-style B2B prospecting or a self-serve free tier, this is the
wrong product.

## 2. Architecture in 5 minutes

**Stack.** Next.js 16 (App Router, Turbopack for dev + prod builds),
React 19, Prisma 7 with `@prisma/adapter-mariadb`, MariaDB for application
data, Supabase for auth only (session cookies, password reset, magic
links — Supabase is **not** the data store), SWR for client fetching,
Zod for validation, Vitest for tests, Sentry for errors + SLO tracing.

**Multi-tenancy.** Every tenant-scoped table carries `organizationId`.
Server code obtains a `Scope` via `requireScope()`/`requireRole()` in
`lib/philly/auth-helpers.ts`; that scope is AND-wrapped onto every Prisma
query. The advanced filter compiler in `lib/philly/filter/compile.ts` adds
the same wrap unconditionally. `npm run audit:tenant` walks every API
route looking for unscoped queries — run it before every release.

**Two-app structure.**

| Repo | Path | Role |
| ---- | ---- | ---- |
| `bongartzdiaz/juandiazllc.com` | `apps/philly-standalone/` | Source of truth. Marketing site lives at the repo root, the CRM lives in this subfolder. |
| `bongartzdiaz/DEUS-SHARED` | repo root | Standalone mirror, refreshed manually via `scripts/sync-to-philly-repo.sh`. Used for disaster-recovery deploys + customer handoffs. |

Sync is one-way and manual; see `MIRROR-SYNC.md`. Never edit DEUS-SHARED
directly.

**Where things live.**

- `app/` — App Router routes; one folder per top-level page (`contacts`,
  `deals`, `properties`, `grants`, `reservations`, `housekeeping`, …).
  API routes live under `app/api/`.
- `app/settings/` — operator settings: `features` (flag UI), `users`,
  `pipelines`, `security`, `api-keys`, `webhooks`, `scim-groups`,
  `property-taxonomy`.
- `components/philly/` — all internal CRM components. `layout/Sidebar.tsx`
  + `Topbar.tsx` are the chrome; `ClientLayout.tsx` mounts the global
  shortcuts, industry sync, Sentry bootstrap.
- `hooks/philly/` — `useIndustry`, `useApi`, `useColumnPrefs`,
  `useSavedViews`, `useGlobalShortcuts`, `useTheme`.
- `lib/philly/` — server-side core: `auth-helpers`, `audit`, `audit-chain`,
  `crypto`, `pii`, `blind-index`, `rate-limit`, `features`, `observability`,
  `filter/`, `drip/`, `scim/`.
- `prisma/schema.prisma` + `prisma/migrations/` — schema is the contract.
  Run migrations with `npm run db:migrate`; never edit a committed
  migration.
- `proxy.ts` — edge middleware: CSRF, CSP, request-id, Supabase auth gate.
  CSRF-exempt prefixes are listed inline.
- `messages/{en,nl,de,es}.json` — next-intl message files for the
  dashboard. The marketing site uses a separate `lib/i18n/dict.ts` in
  the parent monorepo.
- `docs/operations/` and `docs/legal/` — what you're reading now, plus
  the legal review pack.

## 3. Run it locally

```bash
cd apps/philly-standalone
cp .env.example .env.local        # fill in DATABASE_URL + Supabase + secrets
npm install
npm run db:migrate                # applies all migrations under prisma/migrations
npm run seed                      # creates the demo org + admin user
npm run dev                       # http://localhost:3000
```

**Required env vars** (see `.env.example` for the full annotated set):

- `DATABASE_URL` — `mysql://...` against a MariaDB-compatible server.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — auth.
- `INTEGRATION_SECRET` — 32+ byte AES-256-GCM key. Generate with
  `openssl rand -base64 32`. Required to encrypt `Contact.notes`,
  `ContactNote.content`, OAuth tokens, TOTP secrets.
- `BLIND_INDEX_SECRET` — 32+ byte HMAC key for the email/phone hash
  columns. Distinct value from `INTEGRATION_SECRET`.
- `OAUTH_STATE_SECRET`, `CRON_SECRET`, `APP_URL` — see `.env.example`.

**Seed.** `prisma/seed.ts` upserts one org (`philly-demo`,
`industry: philanthropy`) and one admin user
(`admin@philly.local` / `changeme123`, override via `SEED_ADMIN_EMAIL`
and `SEED_ADMIN_PASSWORD`). The seed user must also exist in your
Supabase project for login to succeed — easiest path is to invite the
same email through the Supabase dashboard.

**Demo orgs and the industry switcher.** The Sidebar's industry button
(top-left, hidden when `Organization.industry !== 'general'`) cycles
between `philanthropy`, `realestate`, `hospitality`. Each surfaces a
different `NAV_INDUSTRY` block: philanthropy adds Grants / Volunteers /
Impact; realestate adds Properties / Showings / Open Houses / Commissions
/ Dialer; hospitality adds Rooms / Reservations / Housekeeping. The
switcher is a previewing tool for admins — for real customers you bind
the org to one vertical (see §5).

**Tests + checks.**

```bash
npm test          # vitest run
npm run typecheck # tsc --noEmit
npm run build     # prisma generate && next build --turbopack
npm run audit:tenant  # multi-tenancy guard
npm run audit:chain   # audit-log integrity (run daily in prod)
```

## 4. Demo flow (10 minutes)

A sales-engineer click-path. Assumes you've seeded the demo org and are
logged in as `admin@philly.local`.

1. **Land at `/`** — the dashboard. KPI cards, live metrics band, a
   widget grid editable via the pencil icon. Toggle the industry switcher
   in the sidebar to show that the same shell hosts three verticals.
2. **`/contacts`** — list view with cards. Click "New Contact". Fill in
   name + email + phone. Save. The new row gets AI-derived `industry`,
   `icpFit`, and `summary` from Anthropic Haiku within ~5 seconds (the
   `AI_CONTACT_ENRICHMENT` flag controls this; see §5).
3. **Contact quick-view** — right-click the new card → "Quick view".
   Popover slides in with full detail; "Edit" swaps to the inline form.
   Demonstrate the right-click context menu (copy email, copy phone,
   delete, select).
4. **`/deals`** — list view. "New Deal" → pick a contact, pipeline,
   stage. Save. Show the column picker (toolbar button), saved-views
   chip-bar (Save current → name it → toggle "Share with org"), and
   advanced filter builder.
5. **`/kanban`** — the deals kanban. Drag the new deal from one stage
   to the next. The audit log records the stage change (`/audit`).
6. **`/lead-scores`** or AI command-bar (cmd-K) — type "summarise the
   highest-value open deals" to demo the AI command-bar. Read tools
   are gated by `requireScope`; write tools require admin/manager
   (see Bundle BN in `CLAUDE.md`).
7. **`/settings/features`** — toggle `AI_CONTACT_ENRICHMENT` off,
   create another contact, show that AI fields stay null. Toggle back
   on. Same UI exposes `WEBHOOKS`, `REALTIME`, `SCIM`, `DRIP_CAMPAIGNS`,
   `AI_DEAL_SCORING`.
8. **`/drip-campaigns`** — show the dispatcher cron (`/api/cron/drip-dispatch`,
   bearer-protected by `CRON_SECRET`); create a campaign, enroll a contact,
   point at the next-fire timestamp.
9. **`/audit`** — every action above is in the chain-hashed audit log.
   Filter by entity, expand a row to see Before/After diff, change the
   date range to 30d.
10. **`/gdpr`** — show the Art. 15 export and Art. 17 erasure. Both
    operate over the encrypted columns + blind-index hashes (see §6).

## 5. Customizing for a customer

What the operator changes per-customer:

- **Branding.** Logo + primary colour live in the layout shell; the
  current iteration uses CSS custom properties in `app/globals.css`
  (`--accent`, `--accent-strong`). Replace `public/logo.svg` and the
  two custom properties; everything inherits.
- **Vertical.** Set `Organization.industry` to `philanthropy`,
  `realestate`, or `hospitality`. `OrgIndustrySync` (mounted in
  `ProtectedShell`) pins the active vertical for non-admin members
  and hides the switcher; admins keep it for previewing.
- **SSO.** SAML / OIDC via Supabase + the per-org IP allowlist in
  `lib/philly/ip-allowlist.ts`. Step-by-step in
  `docs/operations/SSO-SETUP.md`.
- **SCIM.** Issue an `ApiKey` row with `scopes: ["scim:users"]` for
  the customer's IdP. Endpoints under `/api/scim/v2/*`. Full setup
  in `docs/operations/SCIM-SETUP.md`. Group provisioning is deferred
  (see §9).
- **Feature flags.** `/settings/features` writes to the `FeatureFlag`
  table (`lib/philly/features.ts`). Per-org rows beat global rows
  beat the `FEATURES[key].enabledByDefault` constant. Use these to
  pause webhooks during a migration window, kill AI for a customer
  with a strict DPA, etc.
- **Drip campaigns.** `/drip-campaigns` lets operators define
  multi-step email + SMS sequences. The cron at
  `app/api/cron/drip-dispatch/route.ts` fires every minute on Vercel
  Cron and consumes `DripEnrollment` rows. Pause via the
  `DRIP_CAMPAIGNS` flag, not by deleting campaigns.
- **Pipelines / stages, property taxonomy, user roles.** Configurable
  under `/settings/pipelines`, `/settings/property-taxonomy`,
  `/settings/users`.

## 6. Compliance

- **Legal pack.** `docs/legal/` holds DPA, Privacy Notice, Records of
  Processing (Art. 30), Sub-processors, DPIA for AI attributes, Breach
  Response, Cookie Policy. Every operator-supplied field is marked
  `[TO FILL: …]` for grep-friendly review (see Bundle AY); follow
  `docs/legal/LEGAL-REVIEW-CHECKLIST.md` and have counsel sign each
  one off before customer launch.
- **Encryption-at-rest.** `Contact.notes`, `ContactNote.content` and
  the OAuth/TOTP credentials in `lib/philly/integrations.ts` use
  AES-256-GCM via `lib/philly/crypto.ts` and `lib/philly/pii.ts`. Key
  is `INTEGRATION_SECRET`. `Contact.email` and `Contact.phone` carry
  encrypted ciphertext columns plus HMAC-SHA-256 blind-index columns
  (`emailHash`, `phoneHash`) keyed by `BLIND_INDEX_SECRET` for equality
  search. Online key rotation: `npm run pii:rotate`.
- **Audit chain.** Every mutation is appended to `AuditLog` with a
  `prevHash → hash` chain (`lib/philly/audit-chain.ts`). Verify with
  `npm run audit:chain`; pages on integrity failure via the Slack
  webhook in `lib/philly/alerts.ts`.
- **AI DPIA.** `docs/legal/DPIA-AI-ATTRIBUTES.md` documents the model,
  data flow, and lawful basis for the contact-enrichment + lead-scoring
  features. Each is governed by a feature flag so a customer can DPA
  them off.
- **GDPR Art. 15 / 17.** `lib/gdpr/export.ts` and `lib/gdpr/erasure.ts`
  drive `/gdpr`. Both honour the blind-index hash columns from Bundle
  AN. The retention cron at `/api/cron/gdpr-retention` purges expired
  rows; `runScheduledErasures` batches deletes via `deleteMany`.

## 7. Operations

- `OBSERVABILITY.md` — Sentry, Slack alerts, `/api/health`, log
  routing, `pg_stat_statements` slow-query report. Read this when
  setting up a new deployment.
- `BACKUP-RESTORE.md` — Postgres / MariaDB backup cadence, restore
  drill protocol, GDPR Art. 32(1)(c) quarterly test. Read this before
  the first customer signs.
- `STATUS-PAGE.md` — Better Stack wiring against `/api/health`. Read
  this when you're ready to publish a public uptime page.
- `MIRROR-SYNC.md` — how to refresh the DEUS-SHARED standalone mirror
  after a bundle. Read this when you ship a release.
- `SSO-SETUP.md`, `SCIM-SETUP.md`, `SESSION-POLICY.md`,
  `PII-ENCRYPTION.md` — per-customer wiring runbooks; pull as needed.

## 8. The bundle convention

The repo's git history uses a **bundle** convention. Each bundle is one
PR-shaped unit of work, identified by a two-letter tag (G, H, …, AZ, BA,
…). Bundles ship under a topic branch (currently `claude/ai-command-bar`)
and are summarized in the **Session log** at the bottom of the repo-root
`CLAUDE.md`. Read `CLAUDE.md` from the bottom up for the most recent
context, scrolling backward to recover the why of any line in `git log`.
Bundle entries reference: the SHA, the files touched, the schema or
migration changes, the env-var surface, the test impact, and any
deferred follow-up. Treat the session log as the authoritative changelog
— GitHub release notes do not exist for this project.

When you ship work yourself, append a new entry under the latest
session-log heading with the same shape (entry tag, one-line summary,
bullets for code + schema + tests + caveats) before merging.

## 9. Deferred / known gaps

Be honest with prospects. The following are known and tracked in
`CLAUDE.md`'s **Launch readiness** section.

- **SCIM Groups + `externalId` round-trip.** Today SCIM provisions
  Users only; group → role/section mapping happens in
  `/settings/users` after the user lands. Most IdPs are fine with
  this, but if the prospect requires Group-driven role assignment,
  flag it.
- **Dashboard locale parity.** All four locales (`en`, `nl`, `de`,
  `es`) are live for shared components and the major list pages
  (Bundles AP–AW). The remaining English-only surfaces are the inbox
  master/detail layout and a handful of RE-specific dialer subviews.
  `translate()` falls back to English silently — don't treat that as
  a feature in front of a NL/DE/ES customer.
- **DeepL passthrough** for auto-filling missing keys is wired as a
  CLI (`npm run kb:translate`) but not in the runtime path.
- **CopilotKit inline-generative-UI** and **Liveblocks presence** on
  deal pages are deferred.
- **Testimonials** on the marketing site are intentionally empty
  pending Juan's sign-off.
- **Rate-limit sweep** completed for 86 mutation routes (Bundle BB);
  the 8 unrate-limited routes (cron, vitals, csp-report, log-error,
  me, scim) are intentionally exempt. Audit before adding new
  unauthenticated POSTs.
- **The demo glosses over** SSO and SCIM (we use email+password in
  the demo for speed) and **does not** show the GDPR export/erasure
  end-to-end against a customer-data-shaped row set. For an
  enterprise procurement demo, walk through `docs/legal/` and the
  audit-chain CLI explicitly — that's the differentiator.

## 10. First 5 PRs to ship

Concrete, small, learn-the-codebase tickets. Pick whichever matches
your strengths.

1. **i18n the inbox.** `app/inbox/page.tsx` master/detail layout still
   has hardcoded English. Add an `inbox.*` namespace to
   `messages/{en,nl,de,es}.json`, wire each string through
   `useTranslations()`. Pattern lives in Bundle AP — copy from the
   `quickview.*` namespace.
2. **Translate `/settings/features`.** The flag-toggle UI in
   `app/settings/features/page.tsx` is en-only. Add a `settings.features.*`
   namespace and wire each label/description. The `description` field
   is operator copy; either translate the seven entries in
   `lib/philly/features.ts` (preferred) or accept a translation map.
3. **Add a 6th column to the deals list view.** `app/deals/page.tsx`
   declares `DEAL_COLUMN_DEFS` / `DEAL_COLUMN_DEFAULTS` /
   `DEAL_COLUMN_WIDTHS`. Add a `lastActivityAt` column (already on
   the `Deal` model) using the same recipe Bundle AC documents in
   `CLAUDE.md`.
4. **Wire a new feature flag for `EMAIL_INTEGRATION`.** Add the entry
   to `FEATURES` in `lib/philly/features.ts`, gate the outbound
   provider in `lib/philly/email/providers.ts` with
   `isFeatureEnabled(...)`, expose it in `/settings/features`. No
   migration needed — `FeatureFlag` rows are upserted on first write.
5. **Drag-drop reorder for properties.** Properties have no
   `displayOrder` column today. Add `Property.displayOrder BIGINT
   NULL` + index, write migration `2026XXXXXXXXXX_property_display_
   order`, mirror `app/api/contacts/reorder/route.ts` to a new
   `/api/properties/reorder`, copy the dnd handler block from
   `app/contacts/page.tsx`. Bundle AG documents the recipe.

Welcome aboard. When in doubt: read `CLAUDE.md`'s session log, then
this folder, then the file path. The codebase is small enough to fit
in your head after a week.
