# Memory — pickup-tomorrow quick-reference

Last touched: **2026-05-05**, end of Bundle CV (session 2).

If you are picking this project up after a break, read this file
first, then `JOURNEY.md` for context, then `CLAUDE.md` for the full
session log.

---

## Where things are

| Item | State |
| ---- | ----- |
| Current branch | `claude/ai-command-bar` |
| Branch HEAD | `c7c01d7` (Bundle CV — pricing page) |
| Production branch | `main` (NOT yet updated — PR #10 open, awaiting merge) |
| PR #10 | <https://github.com/bongartzdiaz/juandiazllc.com/pull/10> — description rewritten to reflect launch-release scope |
| Test counts | 617/617 standalone + 290/290 root, both green |
| Typechecks | clean on both apps |
| `npm run audit:tenant` | clean |
| `npm run audit:chain` | ready (run daily in production) |
| `npm run check:dead` (knip) | 0 unused-files findings on both trees |
| `npm audit --audit-level=high` | clean on both apps |
| **CodeQL** | **0 unresolved findings on PR #10 as of CT** |
| Lighthouse perf prep | done (Bundle CS step 5 — preloader 1200→700ms, hero reveal 1.2→0.7s, world-110m.json preload) |
| DEUS-SHARED mirror | **stale** — never synced; needs DEUS_SHARED_PAT secret + first run |
| Vercel production | unchanged from pre-BA — PR not merged |
| Vercel preview | builds on every push to `claude/ai-command-bar` |

---

## Bundles shipped this session (2026-05-05)

In dependency order:

- **CI** (prior session) — JOURNEY.md + MEMORY.md established
- **CJ–CK** (prior session) — fetchJson sweep, busyId Set
- **CM** (prior session) — SCIM Group PUT semantics + erasure cron-overlap
- **CN** — six commits closing the smoke-test failure cascade:
  Supabase middleware no-op when env vars empty, Vitest 4 MockInstance
  type fix, smoke spec slug fixes (the/-build-vs-buy-trap +
  instruments-not-saas), `page.route('**/*', ...)` external-host block
  in smoke (eliminates plausible/font-CDN flakes), npm `overrides`
  pin for postcss + @hono/node-server.
- **CO** — three new CI gates: `.github/workflows/codeql.yml` (PR +
  push + weekly cron), `.github/workflows/dead-code.yml` (knip,
  --no-exit-code mode), `.github/workflows/schema-drift.yml` (git-diff
  schema vs migrations parity check).
- **CP** — closure of 18 CodeQL findings: ReDoS bounds (scim/filter,
  template renderer, /api/me email validator), log injection in
  /api/csp-report (new sanitizeLogField), HTML-strip robustness on
  email/send + tools/page, prototype-pollution defence in
  audit.diffChanges, seed.ts password redaction; 3 false positives
  suppressed.
- **CQ** — mirror CP fixes to root parallel tree (lib/philly + app/
  philly), .github/codeql/codeql-config.yml excluding js/insufficient-
  password-hash with documented rationale, rag.ts TOCTOU fix via
  fs.open + fh.stat + fh.readFile.
- **CR** — drives CodeQL findings to zero: audit.ts diffChanges
  refactor (Map → Object.fromEntries breaks the taint analysis),
  remove localStorage secret writes from settings page (both trees),
  encodeURIComponent on pageSlug href, scripts/** paths-ignore.
- **CS** — review-fix pass: deceptive Save toast fixed (info-toast
  saying "configured in this session only"), trimmed unmatched knip
  entry patterns + paths-ignore for framework-required files,
  rewrote csp-report sanitize regex with RegExp constructor + Unicode
  escapes (was binary in git), 32 new unit tests for the new security
  guards (audit.test.ts, sanitize-log-field.test.ts, +2 cases on
  filter.test.ts), **deleted 24 dead files** (knip cleanup deferred
  since BO), removed 3 unused deps (@types/bcryptjs, mariadb,
  world-atlas), added 3 missing deps (geojson, @types/topojson-
  specification, **next-intl in standalone** — was hoisting from
  root, would have broken DEUS-SHARED's independent npm install),
  Lighthouse perf pass (preloader, hero reveal, TopoJSON preload).
- **CT** — close the only remaining unresolved review thread:
  console.warn(msg, e) in csp-report → console.warn('%s', msg, e)
  to defang format-string injection.
- **CU** — sync-deus-shared.yml workflow gets an optional `note`
  input; lands in the DEUS-SHARED commit message body and the source-
  side Step Summary so future audits map intent → SHA without reading
  bundle history.
- **CV** — pricing page (`/[locale]/pricing`) with three priced tiers
  (Operator €49 / Team €199 / Business €599) + Enterprise contact-us;
  i18n on all 4 locales (~232 dict entries), getPricingFaq helper
  with 6 Q&A per locale, footer + sitemap updated, CSS in globals.css
  with responsive breakpoints. Tier CTAs link to /signup?plan=<tier>
  which Bundle CY would wire up.

**Deferred** (started but not landed this session):
- Bundle CW (sales-quality demo seed) — schema mismatch on Deal
  pipeline+stage setup; needs a careful follow-up that mirrors
  prisma/seed.ts's pipeline creation.
- Bundle CX (Stripe billing scaffold) — not started.
- Bundle CY (self-service signup flow) — not started.
- Bundle CZ (onboarding wizard at /philly/welcome) — not started.

---

## What's blocking "100% ready"

Three categories. The first one is yours; the second two are the
operator's (which may also be you, but tomorrow-you wearing a
different hat).

### Engineering (you, 1 hour)

1. Open PR #10 → review the rewritten description → merge to `main`
2. Vercel auto-deploys → smoke-test the production URL for ~10 min
3. Tag the merge commit `v1.0.0`
4. (Optional) Open a new branch for the v1.0.x backlog

### Operator (you wearing the ops hat, ~3-4 hours per customer)

Walk `apps/philly-standalone/docs/operations/GO-LIVE-CHECKLIST.md`
in full for your first pilot customer. Six HARD blockers from §2/§3/§5/§6/§9:

- Set `INTEGRATION_SECRET` + `BLIND_INDEX_SECRET` + `CRON_SECRET`
  in production env
- Run `npm run pii:backfill` + `pii:backfill-notes` +
  `pii:backfill-hashes` (dry-run first)
- Perform first backup-restore drill (`BACKUP-RESTORE.md`)
- Wire Sentry DSN + Slack webhook + Better Stack monitor
- Get counsel sign-off on the 7 legal docs (fill `[TO FILL: ...]`)
- Document rollback plan + first-hour monitoring window for
  customer #1

### Counsel / DPO (external, lead time varies)

- Review + fill `apps/philly-standalone/docs/legal/{DPA, PRIVACY-NOTICE, COOKIE-POLICY, BREACH-RESPONSE, RECORDS-OF-PROCESSING, SUB-PROCESSORS, DPIA-AI-ATTRIBUTES}.md`
- Confirm DPO appointment (or "controller-acted" documented)
- EU representative if applicable (Art. 27)

---

## What's deferred (v1.0.x backlog)

None of these block launch. Pick whichever feels highest-leverage
when you're ready for a new bundle.

### Audit-deferred items

| Source | Item |
| ------ | ---- |
| Code-review | Replace serial Membership upserts with `Promise.all` / `$transaction` (`app/api/admin/scim-groups/[id]/route.ts`, `app/api/scim/v2/Groups/[id]/route.ts`) |
| Code-review | Drop `as never` JSON casts → `Prisma.InputJsonValue \| null` |
| Runtime audit | C3 — SCIM Azure AD `count=0` discovery (only matters if customer uses Azure) |
| Runtime audit | C7 — NotificationBell `setInterval` AbortController on unmount |
| Runtime audit | P1 — useApi cache bust on org switch |
| Runtime audit | P3 — EnrollmentModal `busyId` Set (per-button) instead of single |
| Runtime audit | P4 — `r.ok` check standardisation across pages that use raw `fetch` + `r.json()` |
| Runtime audit | P5 — SCIM Group PUT semantics when `members` field absent vs empty |
| Runtime audit | P6 — `runScheduledErasures` advisory-lock for cron-overlap audit-count drift |

### i18n leaks

- `/settings/scim-groups` (CB era — admin UI hardcoded English)
- `/settings/features` (CB era — admin UI hardcoded English)
- `EnrollmentModal.tsx` (CA era — modal hardcoded English)

### Larger feature backlog

- CopilotKit inline-generative-UI; Liveblocks presence on deal pages
- DeepL passthrough integration into the build pipeline (the `npm run i18n:fill` script exists; wire it as a CI step that fails the PR if missing keys ship)
- `Testimonials.tsx` empty placeholder — populate when Juan signs off on quotes
- Vercel native Sentry marketplace integration (recommended over the GH workflow; see OBSERVABILITY.md §9.1)

---

## Next-session candidates (ordered by impact)

If you have ~2 hours and want a single-bundle ship:

1. **Bundle CI — merge + deploy + tag.** PR #10 → main → Vercel
   prod → DEUS-SHARED sync → v1.0.0 tag. The most impactful 1-hour
   work currently available.
2. **Bundle CJ — first customer go-live.** Walk GO-LIVE-CHECKLIST
   end-to-end with Juan as the first customer (or a friendly pilot).
   Real-world data flows through the encrypted columns, the cron
   actually fires, the audit chain accumulates real entries.
3. **Bundle CK — i18n on the three remaining admin pages.**
   `/settings/features`, `/settings/scim-groups`, EnrollmentModal.
   ~50 keys × 4 locales = ~200 new translations. Mechanical.
4. **Bundle CL — useApi cache bust on org switch (P1).**
   Real UX bug for multi-org users. ~30-line change in
   `hooks/philly/useApi.ts` + `hooks/philly/useMySections.ts`.

If you have ~4 hours and want a deeper feature:

5. **Bundle CM — Vercel native Sentry integration.** Replace the
   GH-runner source-map upload (which has bundle-hash drift)
   with the marketplace integration. OBSERVABILITY.md §9.1 has
   the recipe. Eliminates a class of "stack trace looks weird"
   debugging frustration.
6. **Bundle CN — CopilotKit / Liveblocks on the deal page.**
   Real-time presence ("Sara is also viewing this deal") +
   inline AI-generated UI. Dependency-heavy but high demo value.
7. **Bundle CO — first customer pilot debrief → backlog grooming.**
   After the first real customer flip, walk back through the
   GO-LIVE-CHECKLIST, mark which items broke or surprised, file
   the gaps as bundle candidates.

---

## Things that surprised me (operator notes)

Random things that bit during the recent sprints — keep these in
mind:

- **Vercel cron auth via header, not body.** `authorization: Bearer
  $CRON_SECRET`. Document this in `BREACH-RESPONSE.md` if it
  isn't already.
- **`secrets.*` cannot be used in `jobs.<id>.if`** on GitHub
  Actions. Use `vars.*` for the on/off gate; this is why
  `db-slow-queries.yml` uses `vars.DB_SLOW_ENABLED`.
- **Postgres treats NULLs in a UNIQUE INDEX as distinct.** The
  feature-flags global slot needed a partial unique index
  `(key) WHERE organizationId IS NULL` to actually enforce
  one-row-per-key globally. See migration
  `20260430010000_feature_flags_harden`.
- **Edge runtime can't use `lib/philly/logger`** because it depends
  on `process.stdout`. Edge routes use `console.log` directly +
  rely on Axiom's Vercel integration to parse the JSON payload
  (only `vitals/route.ts` is on the edge today; comment in the
  file explains).
- **The drip dispatcher MUST claim the row before sending.** Cron
  retries / region failover would otherwise double-send. Bundle CG
  added optimistic-concurrency; don't ever loosen it.
- **DST is not a millisecond-quantity problem.** Calendar-day
  arithmetic must use `setUTCDate()` (or a TZ-aware library).
  Bundle CG fixed `dueAtForStep` for this; if you add another
  date-math helper, follow the same pattern.

---

## Files worth bookmarking

| Path | Why |
| ---- | --- |
| `CLAUDE.md` | Full session log + bundle conventions |
| `JOURNEY.md` | Chronological narrative (this file's neighbour) |
| `MEMORY.md` | This file |
| `apps/philly-standalone/docs/operations/GO-LIVE-CHECKLIST.md` | Per-customer launch gate |
| `apps/philly-standalone/docs/operations/ONBOARDING.md` | 4-hour orientation for new team members |
| `apps/philly-standalone/docs/operations/MIRROR-SYNC.md` | DEUS-SHARED partner-repo sync runbook |
| `apps/philly-standalone/docs/operations/OBSERVABILITY.md` | Sentry + Slack + Better Stack + Axiom |
| `apps/philly-standalone/docs/legal/LEGAL-REVIEW-CHECKLIST.md` | Counsel-facing brief |
| `apps/philly-standalone/lib/philly/features.ts` | Feature-flag catalogue + helpers |
| `apps/philly-standalone/lib/philly/scim/auth.ts` | SCIM bearer auth + the shared `scimGate` |
| `apps/philly-standalone/scripts/audit-tenant-isolation.ts` | The CI-friendly tenancy auditor |

---

## Obsidian-vault tips

If you're dropping these notes into your Obsidian vault, I'd
suggest:

- `JOURNEY.md` → daily/weekly note as a checkpoint at end of
  each sprint.
- `MEMORY.md` → "current state" page that gets overwritten each
  session — treat as your scratchpad of "where I am right now".
- `CLAUDE.md` § Session log → archived per-bundle entries; pasted
  into Obsidian one bundle at a time so each bundle has its own
  searchable note.
- `apps/philly-standalone/docs/legal/*` → Obsidian's "templates"
  feature works well for the `[TO FILL: ...]` markers.
- `GO-LIVE-CHECKLIST.md` → Obsidian's "tasks" plugin can render
  the checkbox tables natively.
