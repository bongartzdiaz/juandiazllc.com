# DEUS-SHARED Extraction Plan

**Status:** Tooling ready. Execute AFTER the current PR stack (PRs #47–#55) lands on `main`.

**Owner:** Juan (operator). Cannot be automated end-to-end — phase 4 (cutover) involves DNS + Stripe + Vercel ops that require human verification.

## What this document is

The execution playbook for **task #6 — "DEUS-SHARED becomes canonical, decouple from juandiazllc.com"**. It assumes you've read the strategic context in `~/.claude/projects/.../memory/deus_extraction_plan.md` and accepted the 5-phase model:

```
0. DECIDE       ✓ done (2026-05-25)
1. STABILIZE    ← in progress (today's 8-PR stack lands on main)
2. EXTRACT      git filter-repo + rename "philly" → "deus"
3. STAND UP     New Vercel project + DNS + secrets
4. CUTOVER      Customer DNS swap
5. CLEANUP      Remove sync workflows from juandiazllc.com
```

This doc walks Phase 2 → Phase 5 step by step.

## Tooling that ships in this PR

| File | What it does |
|---|---|
| `scripts/deus-extraction/extract.sh` | git filter-repo wrapper; dry-run by default |
| `scripts/deus-extraction/rename-philly.mjs` | rewrites "philly" → "deus" in source files |
| `scripts/deus-extraction/validate-rename.mjs` | post-rename audit; flags stragglers |
| `docs/operations/EXTRACTION-PLAN.md` | this file |

All three scripts are non-destructive in default mode. The destructive `--apply` / `--execute` flags are gated.

## Inventory (factual baseline)

Dry-run of `rename-philly.mjs` against `apps/philly-standalone/` reports:

- **518 files scanned**
- **334 files to be modified**
- **1527 string replacements**:
  - 968 lib import specifiers (`@/lib/philly/X` → `@/lib/deus/X`)
  - 228 components imports
  - 218 hooks imports
  - 108 bare lib paths (scripts/CI/config)
  - 2 bare hooks paths
  - 3 package.json name fields

This is the rename surface. No code logic changes — just identifier renames.

## Pre-flight checklist (Phase 1 complete)

Before starting Phase 2:

- [ ] All of today's PRs (#47–#55) merged to `claude/ai-command-bar`
- [ ] `claude/ai-command-bar` merged to `main`
- [ ] `sync-deus-shared.yml` has fired successfully on the merge (verify in Actions tab)
- [ ] `DEUS-SHARED` main matches `apps/philly-standalone/` byte-for-byte (run `npm run audit:sync-mirror`)
- [ ] CodeQL alerts #40 and #41 dismissed (Sprint 3 part B)
- [ ] `ACCEPTED-RISKS.md` `[TO FILL:]` placeholders all resolved
- [ ] You have local `git filter-repo` installed (`pip install git-filter-repo` or `brew install git-filter-repo`)
- [ ] You have SSH or PAT write access to `bongartzdiaz/DEUS-SHARED`
- [ ] You've notified existing customers (if any) of the upcoming DNS cutover

## Phase 2 — Extract (~30 min)

### Step 2.1 — Tag the existing DEUS-SHARED main as a fallback

So if anything goes wrong you can restore the current mirror state:

```bash
cd /tmp
git clone git@github.com:bongartzdiaz/DEUS-SHARED.git deus-shared-fallback
cd deus-shared-fallback
git tag pre-extraction-mirror-2026-MM-DD
git push origin pre-extraction-mirror-2026-MM-DD
```

### Step 2.2 — Run the extraction script in dry-run mode first

From a fresh terminal:

```bash
cd /tmp
git clone git@github.com:bongartzdiaz/juandiazllc.com.git deus-extraction-prep
cd deus-extraction-prep
./apps/philly-standalone/scripts/deus-extraction/extract.sh
```

Expect output: "DRY-RUN mode", explaining what would happen. Verify the `--workdir` path, source repo, and subdir all match what you expect.

### Step 2.3 — Execute the destructive extraction

```bash
./apps/philly-standalone/scripts/deus-extraction/extract.sh --execute
```

This:
1. Fresh-clones `juandiazllc.com` into `/tmp/deus-extraction-<timestamp>/`
2. Runs `git filter-repo --subdirectory-filter apps/philly-standalone/` — REWRITES every commit so only files under that subdir survive, with the prefix stripped
3. Lists the result + commit count

**Do not push yet** — the rename step happens first.

### Step 2.4 — Run the rename

```bash
cd /tmp/deus-extraction-<timestamp>
node scripts/deus-extraction/rename-philly.mjs --apply
```

This rewrites 1527 string references across 334 files. Counts should match the pre-flight dry-run.

### Step 2.5 — Move the folders

The rename script only rewrites file *contents*. The actual directory renames are done as `git mv` so blame is preserved:

```bash
git mv lib/philly lib/deus
git mv components/philly components/deus
git mv hooks/philly hooks/deus
git commit -m "rename: lib/philly → lib/deus (preserves blame via git mv)"
```

### Step 2.6 — Validate

```bash
node scripts/deus-extraction/validate-rename.mjs
```

Expected output: `0 non-historical finding(s)`. If you see stragglers, fix them and re-run.

Run the test suite too:

```bash
npm ci
npx tsc --noEmit
npx vitest run
```

Expected: clean typecheck, 859+ tests pass (today's count was 859/859).

### Step 2.7 — Force-push to DEUS-SHARED main

⚠️ This is irreversible without the fallback tag from Step 2.1.

```bash
git remote add deus-shared git@github.com:bongartzdiaz/DEUS-SHARED.git
git push --force deus-shared main
```

After this, `bongartzdiaz/DEUS-SHARED` has the extracted + renamed history as its main. The previous mirror history is preserved via the `pre-extraction-mirror-2026-MM-DD` tag.

## Phase 3 — Stand up infrastructure (~45 min)

### Step 3.1 — New Vercel project

1. Create new Vercel project pointed at `bongartzdiaz/DEUS-SHARED`
2. Copy ALL env vars from the old `juandiazllc-com` project:
   - INTEGRATION_SECRET
   - BLIND_INDEX_SECRET
   - PII_ENCRYPTION_KEY
   - DATABASE_URL
   - SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY
   - STRIPE_SECRET_KEY / WEBHOOK_SECRET
   - NEXTAUTH_SECRET
   - ANTHROPIC_API_KEY
   - SUPER_ADMIN_EMAILS
   - SLACK_ALERTS_WEBHOOK
   - RESEND_API_KEY
   - SENTRY_DSN
3. **Do not** copy `DEUS_SHARED_PAT` — the sync workflow goes away in phase 5.

### Step 3.2 — Database — keep where it is

The Supabase project + database stay on the existing instance. Only the *app's* Supabase env vars need to point to it from the new Vercel project (already done in 3.1).

### Step 3.3 — Stripe webhook URL

The new Vercel deployment has a new domain. Update the Stripe webhook endpoint:

1. Stripe Dashboard → Developers → Webhooks
2. Click the existing endpoint (pointed at juandiazllc.com)
3. **Add a SECOND endpoint** pointed at the new DEUS domain. DON'T delete the old one yet — phase 4 cutover needs both live briefly so in-flight payments resolve.
4. After phase 4 settles (~1 week): delete the juandiazllc endpoint.

### Step 3.4 — DNS

If using `app.lucenai.eu`:

1. Add the CNAME at your DNS provider pointing to the new Vercel deployment URL
2. Verify in Vercel that the domain shows "Valid Configuration"
3. Wait for SSL cert provisioning (Vercel does this automatically, ~5 min)

## Phase 4 — Cutover (~15 min, but plan for 1-week settling)

1. **Communicate** to existing customers (if any) — give them 48h notice of the URL change. Email template lives in `docs/operations/CUSTOMER-CUTOVER-EMAIL.md` (TODO: write this).
2. **Switch the primary domain** in the OLD Vercel project to redirect to the new DEUS URL. Mechanism: Vercel "Redirect" rule, 301.
3. **Verify** end-to-end: sign-in flow, Stripe checkout, super-admin UI, locale switcher.
4. **Watch for 1 week**: Stripe webhook deliveries, Sentry errors, customer support tickets.

## Phase 5 — Cleanup (~30 min)

Open a single cleanup PR on `juandiazllc.com` removing the now-dead sync machinery:

- [ ] Delete `.github/workflows/sync-deus-shared.yml`
- [ ] Delete `.github/workflows/sync-mirror-dryrun.yml`
- [ ] Remove `apps/philly-standalone/scripts/audit-sync-mirror.ts`
- [ ] Remove `audit:sync-mirror` + `audit:sync-mirror:fast` from `apps/philly-standalone/package.json`
- [ ] Remove `[4.mirror.*]` checks from `apps/philly-standalone/scripts/check-launch-readiness.ts` (they no longer apply)
- [ ] Update `apps/philly-standalone/docs/operations/PRE-LAUNCH-AUDIT.md` §1 to reflect the new reality
- [ ] Decide on `apps/philly-standalone/` folder fate:
  - Option A: leave as a frozen snapshot (don't add new code, but keep readable in case anyone needs git blame back to old PRs)
  - Option B: archive the whole `juandiazllc.com` repo, since the CRM portion was the bulk of the value
- [ ] Revoke `DEUS_SHARED_PAT` GitHub PAT
- [ ] Update `~/.claude/projects/.../memory/deus_shared_mirror.md` — mark as HISTORICAL

## Post-extraction validation

After phase 5 lands, run the cross-project auditor:

```
@cross-project-auditor run a post-extraction audit:
  - DEUS-SHARED main builds + tests pass
  - juandiazllc.com no longer has sync workflows
  - Vercel for DEUS responds at app.lucenai.eu (or chosen domain)
  - Stripe webhook delivery succeeds on a test event
  - Old juandiazllc.com Vercel URL redirects to DEUS
```

Document results in `~/.claude/projects/.../memory/extraction-complete-2026-MM-DD.md`.

## Rollback plan

If anything goes catastrophically wrong before phase 4 cutover:

1. `git push --force deus-shared pre-extraction-mirror-2026-MM-DD:main`
2. Customers were never moved, so no customer impact
3. Document the failure mode in a new memory file
4. Investigate and retry phase 2 from scratch

If something goes wrong AFTER phase 4 cutover:

- Stripe: the old webhook endpoint is still live (per 3.3 plan) — payments still process
- Auth: the old juandiazllc.com URL still serves (just redirects) — bookmarks still work
- DNS: revert the CNAME swap; Vercel takes ~5min to re-provision

The rollback story is intentionally cheap because the cutover phase is the riskiest — keeping both endpoints alive for a week buys you the safety margin.

## Open questions parked for extraction time

- **Repo name**: `DEUS-SHARED` has the legacy "shared" suffix. Rename to `DEUS` or `deus-crm` or `lucena-deus`? Decide before phase 5 cleanup.
- **GitHub org**: stay at `bongartzdiaz/DEUS` or transfer to a `lucenai-eu` org? Per memory file: defer to LATER, after extraction is stable.
- **apps/philly-standalone/ outer folder**: freeze in place or delete? See phase 5 checklist.

## See also

- `~/.claude/projects/.../memory/deus_extraction_plan.md` — strategic context, 5-phase model rationale
- `~/.claude/projects/.../memory/deus_shared_mirror.md` — current mirror state
- `~/.claude/projects/.../memory/philly_naming.md` — naming-conflict disambiguation
- `~/.claude/projects/.../memory/session_6_launch_checklist.md` — what to do BEFORE extraction
