# Journey — `claude/ai-command-bar`

A chronological narrative of how the launch-readiness branch came
together. Read this if you're picking up the project after a break,
or if you're an Obsidian-vault note on the bigger arc.

For the technical changelog, see `CLAUDE.md` § Session log.
For the launch gate, see `apps/philly-standalone/docs/operations/GO-LIVE-CHECKLIST.md`.

---

## Phase 0 — The starting point (April 19, 2026)

Before this branch existed, the codebase was a marketing site
(`juandiazllc.com`) plus an early CRM mounted at `/philly` inside
the same Next.js app. The CRM was functional but rough: ~1% test
file coverage, hardcoded English everywhere, no observability,
plain-text PII, no SCIM, no rate limiting, no cron jobs, no
operator runbooks. The kind of state that demos well but won't
survive procurement.

The branch started as `claude/analyze-test-coverage-WBVSQ`,
commissioned to audit test coverage. The audit found priority gaps:
auth-helpers, validation schemas, server actions, the 120 API
routes, the 2FA flow. Coverage is one ladder rung; the bigger
realization was that "test coverage" was the most superficial of
the things missing.

Quickly that turned into "let's actually ship the thing for sale".
Branch was renamed `claude/ai-command-bar` because the very first
shippable bundle was the AI command palette; the name stuck even
as the scope expanded to ~60 bundles.

---

## Phase 1 — The AI command bar + foundational features (Bundles 1–6)

The first arc was operator-facing AI: "Ask AI" mode in the command
palette. Plain English in → typed plan back → operator confirms each
step. Read tools first, then write tools (`update_deal_stage`,
`set_lead_status`, `add_contact_note`, `create_task`,
`schedule_followup`, `link_deal_to_contact`).

In parallel: `/tools` hub broadened beyond the energy-ROI calculator
to include `peak-shift` (C&I demand-charge arbitrage) and
`deal-cycle` (sector-agnostic CRM cycle-time ROI). This signaled
that Juan Diaz LLC is cross-sector, not energy-only.

Test coverage push happened alongside: auth-helpers, two-factor,
proxy CSRF decisions, server actions for contact / subscribe /
newsletter. The repo's first respectable test suite.

This is the work captured in PR #10's original description.

---

## Phase 2 — The launch-readiness sprint (Bundles G–AY)

Once the AI command bar landed, the question became "what would
make this enterprise-procurement-ready?" The answer was a
multi-week sprint covering:

**Multi-tenancy + enterprise auth** (G, M, P, Q, R)
- Multi-org `Membership` table — a user can belong to multiple
  orgs with different roles per org
- AES-256-GCM encryption at rest on Contact PII columns
- Blind-index search columns so encrypted email/phone are still
  queryable by exact-match
- Online encryption-key rotation
- SCIM 2.0 Users CRUD
- Per-org IP allowlist + session idle timeout

**Compliance discipline** (legal docs, AY, BI, CC, CH)
- 7 legal doc templates (DPA, Privacy Notice, Cookie Policy, RoPA,
  Sub-processors, Breach Response, DPIA) with `[TO FILL: ...]`
  markers for counsel
- DPIA for the AI Attributes feature (Art. 35)
- Breach response runbook (Art. 33 — 72h notification protocol)
- Backup-restore drill protocol (Art. 32(1)(c))

**Operator UX** (T, U, V, W, X, Y, Z, AA, AB, AC, AD, AE, AF, AG,
AH, AI, AJ, AK, AL, AM)
- Quick-view popovers for contacts/deals/properties
- Saved views per user + org
- Keyboard shortcuts (`?` cheat sheet, `g {c,d,p,k,i,n,s,a}` nav
  chords, `/` focus search, `j/k` row nav)
- Column customization on every list view
- Right-click context menus
- Drag-drop reorder (contacts, deals, properties)
- Advanced filter builder (DSL → Prisma compiler with allowlist)

**i18n** (AP, AQ, AR, AS, AT, AU, AV, AW, AX, BL)
- Full four-locale parity (en/nl/de/es) on every dashboard page
- ~500 new translations added per locale across the sweep
- DE+ES added to the dashboard's next-intl message files
- Hospitality vertical depth (Reservations + Housekeeping pages)

The branch hit "AY" by April 28. The decision: launch-readiness
foundation done; pivot to the missing operational layer.

---

## Phase 3 — Observability + production safety (Bundles AZ–BO)

The next arc was "make this run in production". The bundles BA–BJ
added what should have existed from day one:

**Observability** (BA, BC, BF, BG, BH)
- Server-side Sentry (was wired but dormant — needed
  `instrumentation.ts` + DSN)
- Browser-side Sentry with PII scrub + replay-on-error
- `/api/health` endpoint on both apps
- Slack webhook helper (`lib/philly/alerts.ts`)
- Audit-chain integrity CLI now pages on hash-mismatch
- GitHub Actions for source-map upload, synthetic prod probes
  (15-min cadence), DB slow-query reports (daily)

**Production safety** (BB, BD, BE, BJ)
- Rate-limit sweep: 86 mutation routes hardened
- Feature flags / kill-switches table + admin route + UI
- `runScheduledErasures` batched (was looping per-row)

**Frontend resilience** (BG)
- Route-segment `error.tsx`, `not-found.tsx`
- Web-vitals → Sentry forwarding

**Audit cycle 1** (BJ)
- 10 findings caught + fixed: AI half-switch on contact create,
  workflow `if:` evaluation bugs, kill-switches not actually wired
  into hot paths, cross-org cache leak on global flag mutation,
  health-probe timer cleanup, idempotent FK migration, partial
  unique index for the global flag slot.

By BO (April 30), the repo was structurally ready. Test count had
grown to ~520. Operator runbooks existed for SSO, SCIM,
observability, status page, backup-restore, mirror sync.

---

## Phase 4 — Polish + the final audits (Bundles BP–CH, May 1–4)

The last week was the "is it really ready?" arc. Each bundle filled
a specific gap:

**Functional completion** (BP, BQ, BR, BS, BT, BU, BV, BW, BX)
- SCIM Groups with role/sections mapping (the real "enterprise
  IdP integration" use case)
- Drag-drop reorder on properties (parity with contacts + deals)
- Column customization on the last 4 list pages
- Filter builder lifted to deals + properties
- 2D `j/k/h/l` navigation on the deal kanban

**Internationalization tail** (BY, BL)
- DeepL passthrough script for filling missing translation keys
- i18n sweep on dialer + inbox

**The dispatcher gap** (BZ, CA)
- Drip campaign dispatcher cron — the bridge between
  "campaigns CRUD exists" and "campaigns actually send"
- Drip enrollment management UI

**Cosmetic but recurring user complaint** (CB)
- Removed every pulsing accent dot site-wide. User had read
  the dots as a cursor tracker even though no JS tracker
  existed. Five JSX dots + matching CSS rules removed.

**Audit cycles 2–3** (CC, CD, CG)
- Independent code-review caught 5 must-fix bugs in BK–CB —
  drip dispatcher attemptCount semantics, drip enroll over-count,
  SCIM externalId clearing, missing FK cascade, missing cron
  registration. All fixed in CC.
- `audit:tenant` script regex tightened (CD) — was throwing
  3 false positives on SCIM Groups + drip cron.
- Independent runtime debug audit caught 5 high-impact production
  bugs (CG) — drip dispatcher non-idempotent under cron retry,
  EnrollmentModal silent 200-row truncation, SCIM Group PATCH
  externalId-clearing impossible, SCIM PUT undeletes soft-deleted
  users on re-sync, drip step DST drift. All fixed.

**Operator-facing closure** (CE, CF, CH)
- `MIRROR-SYNC.md` runbook for the partner-repo sync
- `ONBOARDING.md` for new team members (4-hour orientation)
- `GO-LIVE-CHECKLIST.md` — the operator + DPO + on-call sign-off
  gate per customer (60+ items, 9 sections)

By CH (May 4), the test count was 588 standalone + 290 root, all
green. PR #10 description rewritten to reflect the actual scope.

---

## Status as of May 4, 2026

**Code:** ~95% ready. The remaining 5% is a backlog of
lower-priority items (useApi cache bust on org switch, server-side
search on more pickers, finishing i18n on three admin pages, SCIM
Azure AD `count=0` corner case). None of those are launch blockers.

**PR #10:** open from `claude/ai-command-bar` → `main`,
HEAD `da21aac`. Description rewritten to reflect launch-release
scope. Awaiting merge.

**Deployment:** 0%. The PR has not been merged. Vercel hasn't
deployed `main` to production yet. DEUS-SHARED has not been synced
since the partner-repo workflow is operator-triggered and hasn't
been clicked.

**Compliance:** structurally ready (every Art. 32/15/17/30/33/35
mechanism exists in code + has a paired runbook). Lawyer review of
the 7 legal docs is the gating dependency. Operator-side encryption
secrets + PII backfill + first backup-restore drill are the gating
operations.

**Audit trail:** three independent passes (security + code-review +
architecture + runtime debug + Supabase + tenancy isolation),
zero confidence-≥7 cross-tenant leaks, every must-fix finding
closed in either CC, CG, or in-flight as part of CD.

---

## How to pick this up tomorrow

1. Read `MEMORY.md` (right next to this file) for the quick
   pickup state.
2. Decide whether to merge PR #10 today or wait for one more
   review cycle.
3. If merging: walk `apps/philly-standalone/docs/operations/GO-LIVE-CHECKLIST.md`
   for your first pilot customer before flipping their tenant on.
4. Trigger the DEUS-SHARED sync per `MIRROR-SYNC.md`.
5. Tag the merge commit `v1.0.0`.

If picking up a new feature instead: see `MEMORY.md` § "Next-session
candidates" for the deferred backlog ordered by impact.
