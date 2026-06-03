# Deploy — juandiazllc.com (brand + DEUS CRM)

Eén Next.js app, twee Vercel-projecten, twee subdomeinen.

| Surface | Subdomain | Routes | Stack |
|---|---|---|---|
| Brand / holding site | `juandiazllc.com` (post-MVP: `lucen.ai`) | `/[locale]/*` | Next 16 + React 19 + Three.js + Supabase + next-intl |
| DEUS CRM | `philly.juandiazllc.com` (post-MVP: `app.lucen.ai`) | `/philly/*` | Next 16 + Prisma 7 + MariaDB + Supabase Auth (→ Lucia) + next-intl |

**Architectural note:** the two surfaces share the same codebase, the same `proxy.ts` middleware, and the same `prisma/schema.prisma`. They deploy as two Vercel projects from the same repo so each can be promoted/rolled back independently. The `philly/` folder name persists from before the Option A unification — DO NOT rename it mid-MVP-sprint, it would touch ~49 modules.

---

## 1. Vercel setup — two projects from one repo

### Project A — `juandiazllc-com` (brand site)

1. Vercel dashboard → Add New → Project → import `bongartzdiaz/juandiazllc.com`
2. Root Directory: `./` (default)
3. Framework preset: Next.js
4. Env vars (brand-side):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` = `juandiazllc.com`
   - `RESEND_API_KEY` (newsletter double-opt-in)
   - `NEWSLETTER_FROM` = `noreply@juandiazllc.com`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, newsletter writes)
5. Production domain: `juandiazllc.com` + `www.juandiazllc.com`

### Project B — `philly-juandiazllc` (DEUS CRM)

1. Vercel dashboard → Add New → Project → import the **same** repo
2. Root Directory: `./` (NOT `philly/` — the surface is at `/philly/*` URL prefix in the unified app)
3. Framework preset: Next.js
4. Build command: `prisma generate && next build`
5. Env vars (CRM-side, in addition to all brand-side vars above since this project serves the same Next app):
   - `DATABASE_URL` — MariaDB connection string (see section 2)
   - `INVITE_FROM_EMAIL` — defaults to `noreply@lucen.ai`
   - `NEXT_PUBLIC_APP_URL` — defaults to `https://app.lucen.ai`; set to whatever the live customer domain is so accept-invite links resolve
   - `STRIPE_SECRET_KEY` — optional (health check + future billing)
   - `SENTRY_DSN` — optional (observability)
6. Custom domain: `philly.juandiazllc.com`
   - Vercel → Project B → Settings → Domains → Add `philly.juandiazllc.com`
   - DNS: CNAME `philly` → `cname.vercel-dns.com`

### Deploy order
Either order — both projects are independent. Recommendation: deploy B first to a `*.vercel.app` auto-URL, smoke-test, then add the custom domain.

---

## 2. Database for DEUS

DEUS runs on **Prisma 7 + MariaDB**. Pick one:

### Option A — Managed (recommended for prod)
- **PlanetScale** — MySQL-compatible, Prisma 7 friendly, free tier
- **Railway** — MariaDB add-on ~$5/mo
- **DigitalOcean Managed MySQL** — $15/mo

### Option B — Self-hosted on Hetzner GEX44 (post-MVP target)
See `_drafts/server-spec.md` for the full Hetzner setup. Postgres is the migration target; MariaDB stays for week-1 if cutover is deferred.

```bash
docker run -d --name deus-mariadb \
  -e MARIADB_ROOT_PASSWORD=<strong-password> \
  -e MARIADB_DATABASE=deus \
  -p 3306:3306 \
  -v deus-mariadb-data:/var/lib/mysql \
  --restart always \
  mariadb:11
```

DATABASE_URL format:
```
mysql://root:<password>@<host>:3306/deus
```

### Run migrations (one-time, from a developer machine)
```bash
DATABASE_URL="mysql://..." npx prisma migrate deploy
DATABASE_URL="mysql://..." npm run seed   # optional, only on a fresh DB
```

For ongoing CI: Vercel Project B "Ignored Build Step" → `prisma migrate deploy` runs on every build. Watch out — that runs on every deploy, so a faulty migration in main breaks the build.

### Pending migrations from the May 2026 sprint
```bash
npx prisma migrate deploy   # runs all pending migrations including:
#   - seats_and_invites  (Subscription, Invite, Organization.seatLimit)
#   - user_soft_delete   (User.deletedAt for AVG Art. 17)
```

---

## 3. Local dev

### Single dev server (recommended)
```bash
npm install
cp .env.example .env.local       # Supabase + DB keys
npx prisma generate
npm run dev                      # starts the unified app on :3000
```

Brand surface: `http://localhost:3000/`
DEUS surface: `http://localhost:3000/philly`

The dev server compiles routes on demand — first hit to `/philly/*` is slower (Turbopack first-build).

### Verifying preview locally
The dev server requires a real `.env.local` with Supabase + DB credentials. Without them:
- Brand pages render but Supabase-backed flows (newsletter, login) fail
- `/philly/*` paths redirect to `/login` because Supabase auth middleware can't initialize

For testing auth-walled `/philly/*` pages without a real DB, copy `.env.local` from a developer's machine.

---

## 4. Auth

| Surface | Mechanism | User store |
|---|---|---|
| Brand | Supabase magic-link | Supabase Auth |
| DEUS (current) | Supabase Auth → Philly User mapping via `lib/philly/auth-helpers.ts` | MariaDB `User` table, auto-provisioned on first sign-in |
| DEUS (post-MVP) | Lucia Auth on self-hosted Postgres | MariaDB → Postgres migration |

The May 2026 sprint plan migrates DEUS auth from Supabase to Lucia + self-hosted Postgres on Hetzner. See `_drafts/sprint-plan.md` (or the `/sprint-planning` skill output committed earlier) for the cutover plan.

DEUS additionally supports:
- **Invite flow** — admin/manager invites new users via email; accept-flow at `POST /api/invites/accept` validates token + creates User with `bcrypt(12)` password hash
- **2FA** — TOTP via `lib/philly/two-factor.ts` (existing)
- **Soft-delete** — `User.deletedAt` (AVG Art. 17); deleted users can't authenticate, see `lib/philly/auth-helpers.ts:UserDeletedError`

---

## 5. Rollback per app

| Scenario | Action |
|---|---|
| Brand broken | Vercel Project A → Deployments → "Promote to Production" on previous commit |
| DEUS broken | Same on Project B |
| Config bug in repo affects both | `git revert <bad-sha>` + push, both Vercel projects rebuild |
| Database migration regret | `prisma migrate resolve --rolled-back <name>` + manual SQL fix; restore from pgBackRest backup if data is corrupted |

---

## 6. Go-live checklist (DEUS, May 2026 first customer)

- [ ] MariaDB live, `DATABASE_URL` tested with `npx prisma db pull`
- [ ] All Prisma migrations applied to prod DB (`npx prisma migrate deploy`)
- [ ] Vercel Project B env vars set (incl. `RESEND_API_KEY`, `INVITE_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`)
- [ ] Resend sender domain verified (SPF + DKIM on lucen.ai DNS zone)
- [ ] Vercel Project B deployed to `*.vercel.app`, smoke-tested
- [ ] DNS CNAME `philly.juandiazllc.com` → `cname.vercel-dns.com` propagated
- [ ] Custom domain green (SSL active)
- [ ] `/philly/api/health` returns 200 with all checks ok (DB + Supabase reachable + Stripe ok-or-not-configured + email_provider ok)
- [ ] First customer org seeded (Organization row + first admin User row + Subscription row)
- [ ] Customer prospect can: log in → invite teammate → accept invite → import contacts (CSV) → create deal → run AI insight → export their data → delete their account
- [ ] `_drafts/legal/*.md` published to live paths (privacy, DPA, ToS, sub-processors) with KvK + entity placeholders filled in
- [ ] DPA signed by customer (paper or DocuSign)
- [ ] Sentry receiving spans tagged `slo.bucket` (auth.login, deal.create, ai.score)
- [ ] pgBackRest nightly backup running, last restore drill green
- [ ] Status page live (or initial uptime monitor configured)

---

## 7. Why subdomain over path

Initially considered: rewrites + basePath to host everything under `juandiazllc.com/philly`. Reasons we didn't:

- No env var (`PHILLY_URL`) coupling the two surfaces
- Supabase auth callback URLs are clean on a subdomain
- Static asset paths in DEUS don't need patching
- Two separate preview deploys per PR (one for brand, one for DEUS)
- App-down isolation: a brand crash doesn't take DEUS down

Cost: one DNS CNAME line. That's all.

---

## 8. DEUS-SHARED mirror

`bongartzdiaz/DEUS-SHARED` is a force-pushed mirror of this repo for downstream distribution (collaborators, alternate deploy pipeline). Source of truth stays in this repo.

The sync workflow lives at `.github/workflows/sync-deus-shared.yml`. It runs on every push to `main` plus manual `workflow_dispatch`. Setup is operator-side: see `MANUAL_TASKS.md` → "DEUS-SHARED mirror setup" for the PAT generation, secret setting, and first-trigger steps.

---

## 9. Brand split (post-MVP)

Once the MVP customer is stable, the brand surface migrates from `juandiazllc.com` to `lucen.ai`:

| What | Where | When |
|---|---|---|
| Brand site | `lucen.ai` | Post-MVP, when the entity rename is legally final |
| DEUS app | `app.lucen.ai` | Same migration window |
| `juandiazllc.com` | 301 redirect to `lucen.ai` | Migration cutover |
| `philly.juandiazllc.com` | 301 redirect to `app.lucen.ai` | Same |
| Folder rename `app/philly/*` → `app/deus/*` | Future PR | Post-MVP, planned but not blocking |
