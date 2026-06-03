# Onboarding — DEUS / LucenAI

Two flavors of onboarding live in this repo. Pick the one that fits.

- **Developer onboarding** (this file) — for engineers joining the codebase: clone → install → run dev → first commit
- **Customer onboarding** — for paying organizations starting to use DEUS, see [`_drafts/onboarding/first-day-deus.md`](_drafts/onboarding/first-day-deus.md). Move it to a stable public path before launch.

---

## Developer onboarding

### Prerequisites

- Node.js 20+ (the repo runs on Next.js 16 / Turbopack)
- npm 10+
- Git
- A MariaDB database (managed or local — see [DEPLOY.md](DEPLOY.md) section 2)
- A Supabase project (free tier is fine for local dev)

### One-time setup

```bash
git clone git@github.com:bongartzdiaz/juandiazllc.com.git
cd juandiazllc.com
npm install
cp .env.example .env.local       # fill in the keys below
npx prisma generate
```

### Required `.env.local` keys

| Key | What | Where to find |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Same place |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side service role | Same — keep out of the browser |
| `DATABASE_URL` | MariaDB connection string | Your DB provider |

### Optional `.env.local` keys (degrades gracefully when absent)

| Key | What happens without it |
|---|---|
| `RESEND_API_KEY` | Invite emails not sent (UI flash banner explains) |
| `INVITE_FROM_EMAIL` | Defaults to `noreply@lucen.ai` |
| `NEXT_PUBLIC_APP_URL` | Defaults to `https://app.lucen.ai` |
| `STRIPE_SECRET_KEY` | Health endpoint reports "not configured" — not a failure |
| `SENTRY_DSN` | Observability spans no-op silently |

### First run

```bash
npx prisma migrate dev          # apply all migrations to your local DB
npm run seed                    # creates a default Organization + admin User
npm run dev                     # starts on :3000
```

Brand surface: `http://localhost:3000/`
DEUS surface: `http://localhost:3000/philly`

Default seeded admin login is printed at the end of `npm run seed`.

### Daily commands

```bash
npm run dev          # dev server (Turbopack)
npm run typecheck    # tsc --noEmit
npm test             # vitest run (unit + schema tests)
npm run build        # next build (turbopack prod)
```

### Repo layout (the parts that matter day-to-day)

```
app/
  [locale]/         brand-site routes (en/nl/de/es)
  philly/           DEUS CRM routes — pages + api/
  api/              brand-site API routes (newsletter, log-error, vitals)
  actions/          server actions (auth, contact, jobs, newsletter, subscribe)
components/
  philly/           DEUS components (layout, ui, forms)
  sections/         brand-site sections (hero, story, work, etc.)
hooks/
  philly/           DEUS-side React hooks (useApi, useTheme, useIndustry, ...)
lib/
  philly/           DEUS server libs — auth-helpers, audit, validation, observability, seats, invites, dsar, industry-gate, import/, ...
  supabase/         Supabase clients (server, client, middleware, li-client)
  i18n/             next-intl dict + helpers
  seo/              SEO metadata helpers, FAQ data
prisma/
  schema.prisma     single source of truth for the DB
  migrations/       generated SQL
messages/
  en.json, nl.json  next-intl message catalogs
proxy.ts            edge middleware: CSP, CSRF, locale, Supabase auth gate
```

### Bank-grade security baseline

Every commit follows the rules in `~/.claude/projects/.../memory/feedback_security_baseline.md`. Short version:

- **Auth**: `requireRole(['admin','manager'])` on mutations, `requireScope` minimum on reads
- **Validation**: every body through `validateBody(req, schema)` — `lib/philly/validation/schemas.ts`
- **Tenant isolation**: every Prisma query filters by `scope.organizationId`; cross-tenant always 404
- **Errors**: never reflect raw DB error messages to the client; log server-side, return generic copy
- **Tokens**: `crypto.randomBytes(32)` for invite/session tokens; `bcrypt(12)` for passwords
- **Atomicity**: any operation creating a user or claiming an invite goes inside `prisma.$transaction(...)`
- **Audit log**: privileged writes call `logAudit({ scope, action, entity, entityId, changes })`
- **Bug fixes**: regression test FIRST, then the fix

### What's where for the new (May 2026) features

| Feature | Code |
|---|---|
| Seats + invites | `app/philly/api/organizations/invites/`, `app/philly/api/invites/accept/`, `lib/philly/seats.ts`, `lib/philly/invites.ts` |
| GDPR DSAR export | `GET /api/me/export`, `lib/philly/dsar.ts` (export shape — single source of truth) |
| GDPR erasure | `DELETE /api/me`, `DELETE /api/users/[id]`, soft-delete via `User.deletedAt` |
| Settings UIs | `app/philly/settings/team/page.tsx`, `app/philly/settings/privacy/page.tsx` |
| Contacts CSV import | `app/philly/contacts/import/page.tsx`, `app/philly/api/contacts/import/route.ts`, `lib/philly/import/csv-parse.ts` |
| Industry URL gate | `lib/philly/industry-gate.ts` + `layout.tsx` files in `grants/`, `volunteers/`, `philanthropy/` |
| SLO observability | `lib/philly/observability.ts` (`SLO`, `withSpan`); wired in `app/actions/auth.ts`, `app/philly/api/deals/route.ts`, `app/philly/api/ai/score/route.ts` |
| Health endpoint | `GET /philly/api/health` — DB + Supabase + Stripe + email checks; auth-exempt via `lib/supabase/middleware.ts` `PUBLIC_PHILLY_PATHS` |

### Adding a new API route under /philly

```ts
// app/philly/api/<resource>/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { validateBody } from '@/lib/philly/validation'
import { yourSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logAudit } from '@/lib/philly/audit'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`<scope>:${scope.organizationId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, yourSchema)
  if (!parsed.success) return parsed.response

  const prisma = getAuthPrisma()
  // Always filter by organizationId
  const result = await prisma.<entity>.create({
    data: { ...parsed.data, organizationId: scope.organizationId },
  })

  await logAudit({ scope, action: 'create', entity: '<entity>', entityId: result.id })
  return NextResponse.json({ data: result }, { status: 201 })
}
```

### Adding a new UI page under /philly

- Create `app/philly/<route>/page.tsx` with `'use client'` if it does interactivity
- Read data via `useApi` from `@/hooks/philly/useApi` (SWR-backed, deduped, focus-revalidates)
- Use `<Topbar title=... sub=... />` for the page header
- Match existing inline-style patterns in `app/philly/settings/team/page.tsx` and `app/philly/contacts/import/page.tsx`
- Before merging: typecheck + tests green; smoke-test the page in dev

### Pull request checklist

- [ ] `npm run typecheck` clean
- [ ] `npm test` green (no new failing tests; flaky crypto test is pre-existing)
- [ ] No new `findMany` without an `organizationId` where-clause (cross-tenant leak)
- [ ] No new `error.message` reflected from DB to the client
- [ ] New mutations behind `requireRole` + rate-limit
- [ ] Audit row written for privileged writes
- [ ] Regression test added when fixing a bug

### Where to ask

- Repo questions: `bongartzdiaz/juandiazllc.com` issues
- Operator (production / customer) questions: Juan
- Security questions: see `feedback_security_baseline` memory + reach out to Juan before shipping anything sensitive
