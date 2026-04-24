# Philly CRM — standalone

Operator-first CRM extracted as a runnable Next.js app from the
parent `juandiazllc.com` monorepo.

## Status: SCAFFOLD (work in progress)

First-pass extraction landed. Files copied, routing un-prefixed,
standalone proxy + root layout written. **`npm run build` will
still fail** on the first try — this is normal for a multi-commit
extraction. Fix one class of errors at a time and iterate.

Known follow-up work before the build is clean:

- `npm install` must run to pull deps (identical subset of the
  parent repo's package.json, minus marketing-only packages like
  `d3-geo`, `topojson-client`, `world-atlas`, `three`)
- Env vars required at a minimum:
  - `DATABASE_URL` (MariaDB connection string for Prisma)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (for admin ops)
- Cross-route imports like `@/lib/philly/...` keep the `philly/`
  subfolder intentionally; that folder structure was preserved.
- The parent monorepo's `proxy.ts` had locale routing and multi-
  surface CSRF exemptions. This standalone's `proxy.ts` keeps only
  the CRM-relevant pieces (CSRF + CSP + request-id + Supabase auth
  gate). The auth gate's allow-list lives in
  `lib/supabase/middleware.ts`.

## Routing changes from the monorepo

The monorepo served the CRM under `/philly/*`. The standalone drops
that prefix:

| Monorepo              | Standalone      |
|-----------------------|-----------------|
| `/philly/`            | `/`             |
| `/philly/deals`       | `/deals`        |
| `/philly/contacts`    | `/contacts`     |
| `/philly/login`       | `/login`        |
| `/philly/api/*`       | `/api/*`        |

All internal links and `fetch()` calls were bulk-rewritten during
extraction.

## Setup

```bash
cp .env.example .env.local   # fill in your Supabase + Prisma creds
npm install
npm run db:migrate           # apply Prisma migrations
npm run seed                 # optional: sample data
npm run dev
```

Visit `http://localhost:3000` — unauthenticated hits redirect to
`/login`.

## What's the same as the monorepo

Every CRM feature: deals, contacts, transactions, automations,
drip-campaigns, AI command-bar, dialer, calendar, property management,
philanthropy module, audit log, settings, 2FA recovery, rate limits,
Sentry instrumentation. Look-and-feel (Plus Jakarta Sans + Red Hat
Mono, dark/light theme, ClientLayout shell) preserved.

## What's different

- URL prefix (above)
- Own root layout (owns `<html>`/`<body>`; the parent's was nested)
- Own `next.config.mjs` (no turbopack cross-surface concerns)
- Pruned `package.json` (no `d3-geo`, `topojson-client`, `three`,
  `world-atlas` — those were marketing-only)

## Why both exist

The merged monorepo ships both the brand marketing site and the CRM
from a single Vercel deploy — fewer moving parts, lower infra cost.
This standalone extraction exists as:

1. A disaster-recovery backup: if the monorepo is compromised, lost,
   or the brand side is rebuilt from scratch, the CRM keeps running.
2. An independently deployable app: if the CRM ever needs its own
   domain / infra / auth surface, the split is already done.

Keep the monorepo as the source of truth for new CRM work; mirror
changes here by re-running the extraction or cherry-picking commits.

## Pushing this to its own GitHub repo

Two workflows in `scripts/`, pick whichever matches your situation.
Both run on your local machine — the sandbox this code was authored
in is network-scoped to one repo and can't reach others.

### Fresh start — push into a brand-new empty GitHub repo

Use this the first time you set up a standalone Philly repo. Nothing
auto-deploys; a new GitHub repo has no Vercel integration until you
explicitly wire one up.

```bash
# 1. Create the empty repo at https://github.com/new
#    (private, no README / .gitignore / license — all unchecked)
#
# 2. Download + run the init script:
curl -O https://raw.githubusercontent.com/bongartzdiaz/juandiazllc.com/claude/ai-command-bar/apps/philly-standalone/scripts/init-new-philly-repo.sh
chmod +x init-new-philly-repo.sh
./init-new-philly-repo.sh git@github.com:bongartzdiaz/philly-crm.git
```

One clean initial commit, 326 files, build-verified. No monorepo
history carried over.

### Update — sync the latest extraction into an existing Philly repo

Use this when the standalone repo already exists (initial commit
already made) and you want to refresh it with the current monorepo
state. Preserves the target repo's history — the sync shows up as
one commit on top.

```bash
curl -O https://raw.githubusercontent.com/bongartzdiaz/juandiazllc.com/claude/ai-command-bar/apps/philly-standalone/scripts/sync-to-philly-repo.sh
chmod +x sync-to-philly-repo.sh

# First time: sync to a non-main branch so you get a PR-style diff
./sync-to-philly-repo.sh git@github.com:bongartzdiaz/philly-crm.git sync/2026-04-24

# Once you trust the diff, subsequent syncs can target main directly
./sync-to-philly-repo.sh git@github.com:bongartzdiaz/philly-crm.git main
```

### Deployment (optional, opt-in)

Neither script deploys anything. When you're ready to deploy the
standalone separately from the brand site:

1. Open the Vercel dashboard, "New Project"
2. Import the standalone's GitHub repo
3. Set env vars from `.env.example` (DATABASE_URL, Supabase keys)
4. Point a subdomain at the Vercel project

Until you do that, the repo just sits on GitHub. Safe.
