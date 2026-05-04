# Memory — pickup-tomorrow quick-reference

Last touched: **2026-05-04**, end of Bundle CH.

If you are picking this project up after a break, read this file
first, then `JOURNEY.md` for context, then `CLAUDE.md` for the full
session log.

---

## Where things are

| Item | State |
| ---- | ----- |
| Current branch | `claude/ai-command-bar` |
| Branch HEAD | `da21aac` (Bundle CH) |
| Production branch | `main` (NOT yet updated — PR #10 open, awaiting merge) |
| PR #10 | <https://github.com/bongartzdiaz/juandiazllc.com/pull/10> — description rewritten to reflect launch-release scope |
| Test counts | 588/588 standalone + 290/290 root, both green |
| Typechecks | clean on both apps |
| `npm run audit:tenant` | clean |
| `npm run audit:chain` | ready (run daily in production) |
| DEUS-SHARED mirror | **stale** — not yet synced past Bundle BO |
| Vercel production | unchanged from pre-BA — PR not merged |
| Vercel preview | builds on every push to `claude/ai-command-bar` |

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
