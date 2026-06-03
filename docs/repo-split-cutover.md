# Repo split — unplug the DEUS-SHARED mirror

Operator-executable plan to retire the external Sync Bot that
extracts `app/philly/*` → flat-structure DEUS-SHARED, and switch to
two independent repos:

- **`bongartzdiaz/juandiazllc.com`** — brand site only (`app/[locale]/*`,
  marketing pages). Stays on Vercel.
- **`bongartzdiaz/DEUS-SHARED`** — DEUS CRM only (flat `app/`, `lib/`,
  `prisma/`). Source of truth for everything currently under
  `app/philly/*`. Deploys to Hetzner.

Target window: **end of cutover week, immediately after Hetzner
goes green** (Saturday 2026-05-16 morning, after the Friday cutover
ceremony has been verified stable for ≥12h).

The runbook is sequenced so an early step never burns a later step.
Each section ends with an explicit gate — do not proceed if the
gate isn't green.

---

## Why we're doing this

- **Sync Bot is a translator.** Every push to `juandiazllc.com main`
  triggers a structural rewrite (`app/philly/*` → `app/*`,
  `@/lib/philly/*` → `@/lib/*`, file moves, import rewrites). Each
  translation is a chance for drift. With DEUS-SHARED as the source
  of truth, the translator goes away.
- **Independent CI.** CRM and brand site each get their own faster
  build. Brand-site copy edits stop blocking CRM tests.
- **Independent deploy cadence.** Hetzner deploys CRM. Vercel deploys
  brand site. Each ships when ready.
- **Cleaner i18n boundary.** Brand site is multi-locale, CRM is
  English-only this sprint. Two repos = no `app/philly/*` carve-out
  in `/translate` audits.
- **Smaller blast radius.** A brand-site copy fix can't break
  CRM build, and vice versa.

The trade-off: any code we want shared between the two (e.g. a generic
`crypto.ts` helper, a Zod schema lib) needs to be either duplicated or
extracted to a published package. Today, no `lib/philly/*` is imported
by the brand site, so this is a future problem.

---

## Section 1 — Pre-cut gate (T-1 day, Friday afternoon)

Goal: confirm we are in a state where cutting the bot is safe — PR
#12 closed, DEUS-SHARED at parity, Hetzner box ready.

- [ ] **PR #12 merged to `juandiazllc.com main`.** Includes Bundles A
      (Calendar OAuth), B (Stripe billing), C (Hetzner prep),
      D + D2 + D3 (push-sync + renewal cron + delta-sync), F
      (settings/integrations), G (audit log on mutations), and AF
      (audit findings). If anything is still open, finish it before
      starting this runbook.
- [ ] **Final Sync Bot run completed after the merge.** Trigger the
      bot manually, or wait for its scheduled run. Verify the timestamp
      on the latest commit in DEUS-SHARED is newer than the PR #12
      merge commit.
- [ ] **DEUS-SHARED parity check.** From an empty directory:
      ```
      git clone https://github.com/bongartzdiaz/DEUS-SHARED.git
      cd DEUS-SHARED
      npm ci
      npm run typecheck
      npm test
      npm run build
      ```
      All four must pass cleanly. If any fail, the Sync Bot dropped
      something during translation — fix it BEFORE unplugging the
      bot, not after.
- [ ] **Diff parity spot-check.** Pick three CRM files we touched
      recently and verify the DEUS-SHARED translation matches:
      ```
      # In DEUS-SHARED:
      git log --oneline app/api/calendar/cron/renew-channels/route.ts
      git log --oneline lib/calendar/delta-sync.ts
      git log --oneline lib/calendar/push-sync.ts
      ```
      Each should show recent commits matching the PR #12 history.
- [ ] **Hetzner box is online and bootstrapped.** Per
      `docs/hetzner-cutover-runbook.md` Section 2, the box should
      already exist with Postgres + Caddy + Node + PM2 running.
      Don't unplug the bot before the box is up.

**Gate:** all four boxes ticked. If any fails, stop and resolve.

---

## Section 2 — Cutover ceremony deploys from DEUS-SHARED (T-0, Friday 21:00 CET)

The Hetzner cutover ceremony itself is in
`docs/hetzner-cutover-runbook.md`. The ONLY change relevant to this
runbook is the source repo.

- [ ] During the ceremony, when the runbook says "clone the repo",
      the operator clones `bongartzdiaz/DEUS-SHARED`, NOT
      `bongartzdiaz/juandiazllc.com`. Update the `git clone` line in
      `01-bootstrap.sh`'s usage block before Friday — currently it
      says `bongartzdiaz/website.git`, change to
      `bongartzdiaz/DEUS-SHARED.git`.
- [ ] DEUS-SHARED structure differences from juandiazllc.com — the
      operator should expect:
  - `app/api/...` instead of `app/philly/api/...`
  - `lib/...` instead of `lib/philly/...`
  - No `app/[locale]/*`, no marketing pages
  - Same Prisma schema (the Sync Bot copies it verbatim)
  - Same `package.json` dependencies, minus brand-site-only ones
- [ ] Smoke test (`09-smoke-test.sh`) URLs change too: hit
      `https://app.juandiazllc.com/api/health` (no `/philly` prefix
      in DEUS-SHARED). Update the script's internal paths before
      Friday — find/replace `/philly/api/` → `/api/` in
      `09-smoke-test.sh`.

**Gate:** Hetzner cutover green for ≥12 hours. Smoke tests passed.
Customers haven't reported regressions. If anything broke, do NOT
proceed to Section 3 — roll back to Vercel + Supabase per the
Hetzner runbook Section 6, and try again next week.

---

## Section 3 — Unplug the Sync Bot (T+12h, Saturday morning)

Goal: stop the external translator. After this step, juandiazllc.com
and DEUS-SHARED diverge intentionally.

- [ ] **Locate the Sync Bot.** It's externally managed (not in
      `.github/workflows/`). Last-known-sync timestamp is
      2026-04-29 per `MANUAL_TASKS.md` notes. Operator: identify the
      mechanism (cron job on a personal box? GitHub App? n8n
      workflow?) — wherever it lives, this is where you turn it off.
- [ ] **Disable, don't delete.** Pause the trigger or comment out the
      cron line. Keep the script around for 30 days in case we need
      to re-enable for a hotfix backport. After 30 days, delete.
- [ ] **Verify it stopped.** Push a trivial commit to
      `juandiazllc.com main` (e.g. a typo fix in `README.md`). Wait
      30 minutes. Confirm DEUS-SHARED's HEAD did NOT advance.

**Gate:** trivial-commit test passes — DEUS-SHARED stays put.

---

## Section 4 — Add the guardrail (T+12h, same Saturday)

Goal: prevent accidental commits of CRM code to
`juandiazllc.com main` after the cut. Without a guardrail, anyone
who edits `app/philly/*` here writes code that lives nowhere
downstream.

- [ ] **CODEOWNERS** in `juandiazllc.com`:
      ```
      # juandiazllc.com — brand-site only after 2026-05-16.
      # CRM code lives in bongartzdiaz/DEUS-SHARED.
      app/philly/**         @bongartzdiaz
      lib/philly/**         @bongartzdiaz
      prisma/schema.prisma  @bongartzdiaz
      ```
      Forces a manual approval on any PR that touches CRM-side files.
- [ ] **Branch protection rule** on `main`: require CODEOWNERS review
      to be satisfied. Settings → Branches → main → Edit.
- [ ] **Optional: CI deny-list check.** Add a workflow step that
      `git diff --name-only origin/main...HEAD` on every PR and fails
      if any matched path is in `app/philly/`, `lib/philly/`, or
      `prisma/schema.prisma`. This is belt-and-braces — CODEOWNERS is
      sufficient unless we expect someone to bypass it.
- [ ] **Mirror guardrail on DEUS-SHARED:** add a CODEOWNERS that
      requires approval on `app/[locale]/**` (in case someone
      accidentally drops brand-site code there). Should never trigger,
      but covers symmetry.

**Gate:** open a draft PR touching `app/philly/foo.ts` on
juandiazllc.com — verify it requires CODEOWNERS approval.

---

## Section 5 — Update docs (T+1 day, Sunday)

Goal: every doc that says "we mirror" or "the source of truth is
juandiazllc.com" gets updated. Stale docs cause future confusion
worse than no docs at all.

- [ ] **`CLAUDE.md`** session-log entry summarising the split. New
      "Repo strategy (post-2026-05-16)" section at the top:
      brand site = juandiazllc.com, CRM = DEUS-SHARED, no mirror.
- [ ] **`DEPLOY.md`** — if it currently says "deploy from
      juandiazllc.com", update the CRM section to say
      "deploy from DEUS-SHARED". Keep the brand-site Vercel
      instructions where they are.
- [ ] **`ONBOARDING.md`** — clone instructions. New CRM contributors
      clone DEUS-SHARED; brand-site contributors clone juandiazllc.com.
- [ ] **`MANUAL_TASKS.md`** — the "Repo strategy — DEUS-SHARED is now
      primary for CRM" section already exists from 2026-05-07.
      Append a "Status: cut over <date>" line and remove the "Sync
      Bot still externally managed" note.
- [ ] **`README.md`** in DEUS-SHARED — should explain the relationship
      with juandiazllc.com and where each piece lives. If it doesn't
      exist or is sparse, write it.
- [ ] **CRM memory note** (`~/.claude/projects/.../memory/`):
      `project_repo_strategy.md` already says "DEUS-SHARED is primary;
      no more mirroring". Update the date and add "Sync Bot disabled
      <date>" so any future session knows the cut already happened.

**Gate:** none — docs are async. Just don't skip them.

---

## Section 6 — First post-cut commit on each side (T+2 days, Monday)

Goal: prove that each repo can ship independently. No code change
required — just the workflow.

- [ ] **Brand-site change** in juandiazllc.com — make a real but
      trivial copy edit (e.g. update a footer date). Push to a
      branch, open PR, merge, watch Vercel preview + production
      deploy go green. Confirm DEUS-SHARED is unaffected.
- [ ] **CRM change** in DEUS-SHARED — make a trivial change (e.g. add
      a comment to a server action). Push to a branch, open PR, merge,
      watch the Hetzner deploy hook fire. Confirm juandiazllc.com is
      unaffected.

If either fails, roll back the change and diagnose before relying on
the new flow for real work.

---

## Section 7 — What happens if we need to re-merge later

Two repos that diverge can be reunited if needed. The Sync Bot
mechanism is preserved (per Section 3, "disable, don't delete") for
exactly this reason. To re-enable:

1. Re-arm the Sync Bot's trigger.
2. Run a one-time forced sync to bring DEUS-SHARED forward to
   juandiazllc.com's CRM state.
3. Reverse the CODEOWNERS rules to let anyone touch `app/philly/*`
   again.

Cost: half a day. Cheap insurance.

---

## Failure modes and what to do

**The Sync Bot keeps firing after we paused it.**
Some external scheduler is still triggering it. Check: cron, n8n,
Render scheduled jobs, GitHub Actions in a different repo. If you
can't find the trigger within an hour, revoke the bot's GitHub PAT
— that hard-stops it regardless of the trigger.

**Hetzner is green but the Sync Bot dropped something during the
final sync.**
DEUS-SHARED is missing a file or has a stale version. Diagnose with
the parity check from Section 1. Fix forward in DEUS-SHARED — don't
re-trigger the bot from juandiazllc.com (confusing history). Cherry-
pick the missing commit if needed.

**Brand-site CI breaks because a `lib/philly/*` import got removed.**
Brand site shouldn't import any `lib/philly/*` today — if it does,
that's a bug introduced in this cycle, not by the cut. Fix forward.

**Someone commits CRM code to juandiazllc.com main bypassing
CODEOWNERS.**
Possible if branch protection isn't fully enabled, or an admin force-
pushed. Cherry-pick the commit into DEUS-SHARED, revert it on
juandiazllc.com, then audit how it bypassed the guard.

**Hetzner cutover rolls back to Vercel + Supabase.**
The Friday rollback path is: revert DNS, re-enable Vercel deploy.
DEUS-SHARED stays untouched in this scenario; we're back on
juandiazllc.com for production CRM. Don't unplug the bot — wait until
the next cutover attempt is green.

---

## Summary card

| Step | When | Gate |
|------|------|------|
| 1. Pre-cut gate | Friday afternoon | PR #12 merged, DEUS-SHARED parity green |
| 2. Hetzner cutover from DEUS-SHARED | Friday 21:00 CET | Smoke tests pass, customers stable 12h |
| 3. Unplug Sync Bot | Saturday morning | Trivial commit doesn't reach DEUS-SHARED |
| 4. Add guardrail | Same Saturday | Draft PR touching `app/philly/*` requires CODEOWNERS |
| 5. Update docs | Sunday | All references to "the mirror" updated |
| 6. First post-cut commit | Monday | Each repo ships independently |
| 7. Re-merge contingency | (only if needed) | half-day cost |

If any gate fails, stop. Don't progress to the next step. The cost
of waiting is low; the cost of a partial cut is high.
