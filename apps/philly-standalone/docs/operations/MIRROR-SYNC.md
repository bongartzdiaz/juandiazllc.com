# Mirror sync — `juandiazllc.com` → `DEUS-SHARED`

The Philly CRM lives in two places:

| Repo                                | Path                            | Role                                                                                                                       |
| ----------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `bongartzdiaz/juandiazllc.com`      | `apps/philly-standalone/`       | Source of truth. All development happens here. The CRM is one app inside the marketing-site monorepo.                       |
| `bongartzdiaz/DEUS-SHARED`          | repo root                       | Standalone mirror — published as a self-contained Next.js app for disaster-recovery deploys, partners, and audit handoff. |

Mirror sync is **manual + one-way** (`juandiazllc.com` → `DEUS-SHARED`).
The target repo is overwritten — never edit `DEUS-SHARED` directly.

## When to run the sync

After every bundle that lands on `claude/ai-command-bar` (or whatever
branch is your active development branch). Pattern:

```
1. Ship bundle → push to claude/ai-command-bar on juandiazllc.com
2. Verify Vercel preview + tests + typecheck
3. Trigger DEUS-SHARED sync (this runbook)
```

Don't batch sync runs. Doing one sync per bundle keeps the source
SHA in the DEUS-SHARED commit message useful for blame, and means a
future audit can map any DEUS-SHARED state back to a single
juandiazllc.com commit.

## How to run the sync (~30 seconds)

1. Open <https://github.com/bongartzdiaz/juandiazllc.com/actions>
2. Left sidebar → **"Sync Philly standalone → DEUS-SHARED"**
3. Top-right → **Run workflow** dropdown
4. **Branch**: `claude/ai-command-bar` (or whichever branch you just pushed)
5. **Target branch on DEUS-SHARED**: `main` (default; change only for
   special-case staging)
6. **Optional note**: a one-line summary of *why* this sync is happening
   (e.g. `Bundle CT — closes the last CodeQL thread`). If supplied, it
   lands in both the DEUS-SHARED commit message and the workflow run's
   Step Summary, so future audits can map intent → SHA without reading
   bundle history.
7. Click the green **Run workflow** button

The job:
- Checks out the source repo at the chosen branch.
- Clones `bongartzdiaz/DEUS-SHARED` using `DEUS_SHARED_PAT`.
- `rsync -av --delete --exclude='.git' --exclude='.github'
  --exclude='node_modules' --exclude='.next'` from
  `apps/philly-standalone/` into the DEUS-SHARED working tree.
- Commits with `sync from juandiazllc.com monorepo (<short-sha>)`.
- Pushes to the target branch.

Total run time: typically 60–90 seconds. The workflow logs the
commit SHA + diff stats in the Step Summary.

## One-time setup (≈2 minutes, never again)

If this is the first sync and the workflow header tells you the
secret is missing, do this once. All steps work from mobile.

### 1. Create a fine-grained PAT

`github.com → avatar → Settings → Developer settings → Personal
access tokens → Fine-grained tokens → Generate new`

- **Token name**: `deus-shared-sync`
- **Expiry**: 90 days (refresh at expiry)
- **Resource owner**: `bongartzdiaz`
- **Repository access**: "Only select repositories" → `DEUS-SHARED`
- **Repository permissions**:
  - Contents → **Read and write**
  - (Everything else → No access)
- Generate, copy the token (shown once).

### 2. Add to juandiazllc.com as a secret

`github.com/bongartzdiaz/juandiazllc.com → Settings → Secrets and
variables → Actions → New repository secret`

- **Name**: `DEUS_SHARED_PAT`
- **Value**: paste the token

### 3. PAT renewal

When the token expires, the next sync will fail with a clear
"Bad credentials" error. Generate a new PAT (same scope as step
1) and overwrite the secret. The expiry date is in your GitHub
notifications inbox a week ahead.

## Verifying a sync landed

Three quick checks after running:

1. **Workflow run is green** — visible in the Actions list.
2. **Step Summary** — shows source SHA + status `success`. If the
   summary says "No changes — DEUS-SHARED was already in sync."
   that's an OK outcome (you double-clicked).
3. **Spot-check on DEUS-SHARED** — go to
   <https://github.com/bongartzdiaz/DEUS-SHARED/commits/main> and
   confirm the top commit references the source SHA.

## What's NOT synced

The workflow `--exclude`s these on purpose:

- `.git/` — DEUS-SHARED keeps its own history.
- `.github/` — DEUS-SHARED has its own workflows (lighter; no
  e2e). The source repo's CI shouldn't overwrite them.
- `node_modules/` — installed fresh on every deploy.
- `.next/` — build output is per-environment.

Everything else under `apps/philly-standalone/` is overwritten,
including:

- `prisma/schema.prisma` and the `migrations/` tree
- `messages/` (i18n)
- `docs/legal/` and `docs/operations/`
- `package.json`, `vercel.json`
- Application source (`app/`, `components/`, `hooks/`, `lib/`,
  `scripts/`)

Operators wiring DEUS-SHARED for production should treat the repo
as read-only — every change must come through a sync from
`juandiazllc.com`.

## When NOT to run the sync

- **Mid-bundle.** If you've pushed an intermediate commit that
  doesn't yet pass `npm test` + typecheck on the source side, don't
  sync. DEUS-SHARED gates customer / partner deploys; only ship
  green builds.
- **Before lawyer review of the legal docs.** The
  `docs/legal/{DPA, PRIVACY-NOTICE, ...}` placeholders (`[TO FILL:
  …]`) are part of the sync. Operators downstream may not realise
  they're placeholders. Either fill them first or block the
  customer's sign-off until they fill in their own copy.
- **When the source branch is not `claude/ai-command-bar`** unless
  you actively want a different state on DEUS-SHARED.

## Troubleshooting

| Symptom                                            | Cause                                                          | Fix                                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `DEUS_SHARED_PAT secret not set`                   | First-time setup not done                                      | See "One-time setup" above                                                                       |
| `remote: Permission to bongartzdiaz/DEUS-SHARED.git denied` | PAT scope wrong or expired                                     | Regenerate PAT with `Contents: Read and write` on DEUS-SHARED, replace secret                      |
| `Updates were rejected because the tip is behind` | Someone pushed directly to DEUS-SHARED                         | Investigate the rogue commit. Force-push only after confirming the rogue commit isn't yours      |
| Workflow says "No changes"                         | The source state is byte-identical to current DEUS-SHARED      | Expected when re-syncing the same SHA. Not an error.                                             |
| Tests fail on the source side after push          | Source bundle is broken                                        | Don't sync until the source is fixed. Ship a hotfix bundle on `juandiazllc.com` first.           |

## Reference

- Source workflow: `.github/workflows/sync-deus-shared.yml`
  (the file's header has setup steps as a reminder).
- DEUS-SHARED repo: <https://github.com/bongartzdiaz/DEUS-SHARED>.
- Bundle naming convention + session log: top-level `CLAUDE.md`
  in the source repo.
