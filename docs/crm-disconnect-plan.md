# CRM disconnect plan — juandiazllc.com → marketing-only (DRY-RUN)

**Status: PLAN ONLY. Nothing deleted.** Generated 2026-06-03 from a read-only
audit of the current tree.

> **DECISION 2026-06-03:** chose to **HIDE** the CRM (removed the Login links
> from Nav + Footer; `robots.ts`/`sitemap.ts` already exclude `/philly`, `/app`,
> `/login`, `/dashboard`) rather than do the full deletion below. The CRM stays
> functional behind auth (direct URL only). This full-removal manifest is
> retained for reference if a hard code separation is wanted later.

## Goal
Make `juandiazllc.com` (this repo) a pure marketing site. Remove the DEUS CRM
that currently lives in the same repo under `*/philly/*` + `prisma/` + `messages/`.

## Safety (no work is lost)
- All 77 CRM commits (incl. this session's security/audit/dashboard work) are on
  `origin/claude/zen-noyce-f6e719` — fully recoverable, syncable to DEUS-SHARED later.
- Execute on a NEW branch cut from the current branch (keeps the marketing
  improvements — fonts/SEO/pricing/contact-form — and the CRM history intact on
  the source branch).
- No marketing file imports from any CRM layer (verified: 0 cross-imports), so
  removal leaves no dangling imports in the marketing code.

---

## 1. DELETE — CRM code layers (~398 files)
| Path | Files | What |
|---|---|---|
| `app/philly/` | 230 | CRM routes + API |
| `lib/philly/` | 110 | CRM libs + tests |
| `components/philly/` | 41 | CRM UI |
| `hooks/philly/` | 17 | CRM hooks |
| `i18n/philly/` | 1 | next-intl request config |
| `prisma/` | — | CRM MariaDB schema + migrations + seed |
| `messages/` | 6 | next-intl `{en,nl,de,es}.json` + orphan `phily-{en,nl}.json` (unreferenced) |
| `scripts/ci/check-tenant-scope.mjs`, `scripts/philly/`, `scripts/migrate-to-hetzner/` | — | CRM ops scripts |

## 2. DELETE — auth/login  *(only under "full marketing-only"; OPEN decision)*
Login exists solely to enter the CRM (`/login` → `/philly`).
| Path | What |
|---|---|
| `app/[locale]/login/page.tsx` | login page |
| `components/LoginForm.tsx`, `components/LoginScene.tsx` | form + WebGL bg |
| `app/actions/auth.ts` | login server action |
| `lib/supabase/{client,li-client,middleware,server,service}.ts` | Supabase auth/data |

## 3. EDIT — config & connection points  *(MANDATORY — build breaks otherwise)*
| File | Change | Why |
|---|---|---|
| `next.config.ts` | Remove `createNextIntlPlugin` import + `withNextIntl(...)` wrapper → `export default nextConfig`. Drop `recharts` (and `three` if login removed) from `optimizePackageImports`. | The plugin points at `./i18n/philly/request.ts`; build fails once that's gone. |
| `package.json` | `build`: `prisma generate && next build` → `next build`. Remove `postinstall` (`prisma generate`). Remove scripts: `db:generate/migrate/push/deploy`, `seed`, `lint:tenant-scope`. | `prisma generate` fails with no schema; `npm install` runs postinstall. |
| `middleware.ts` (root) + `lib/supabase/middleware.ts` | Strip `/philly` gating; remove the whole supabase-middleware wiring if auth is removed. | `/philly` no longer exists. |
| `app/[locale]/app/page.tsx:390` | Remove/replace the `<Link href="/philly">` "open app" button. | Dead link. |
| `components/LoginForm.tsx:13` | `next ?? "/philly"` — moot if login removed; else repoint. | Dead target. |
| `.github/workflows/ci.yml` | Remove the `tenant-scope` job; keep `typecheck`/`test` (will be thin post-removal). | Lints CRM only. |
| `lib/sectors.ts:130` | **KEEP** — `/work/philly` is a marketing portfolio case-study link, not a CRM link. | Content, not connection. |

## 4. PRUNE — CRM-only deps  *(OPTIONAL, do LAST + build-verify; unused deps don't break the build)*
Remove: `@prisma/client`, `@prisma/adapter-mariadb`, `prisma`, `next-intl`,
`recharts`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`,
`@ai-sdk/anthropic`, `stripe`, `@sentry/node` (+ `@sentry/react`? verify),
`tsx`. Remove `@supabase/supabase-js` + `three` **only if auth/login removed**.
Keep (marketing): `next`, `react`, `lucide-react`, `d3-geo`, `topojson-client`,
`world-atlas`, `@types/*`, the font/SEO stack.

## 5. Build impact
- `withNextIntl` unwrap + prisma-out-of-build are the two MANDATORY edits; skip
  either and `npm run build` fails.
- Marketing has 0 imports from CRM layers → no dangling imports.
- Tests: almost all suites are `lib/philly/*.test.ts` (CRM) and disappear with
  the layer; remaining marketing tests (`lib/i18n`, `lib/insights`) stay green.
- Verify after each step: `npm install` (postinstall ok) → `npm run build`
  (marketing-only) → `npm run typecheck`.

## 6. Open decisions
1. **Auth/login: remove or keep?** Removing it (§2) is cleaner for a pure
   marketing site but also drops `three`/`@supabase/supabase-js`. Keeping it
   means repointing `/login`'s redirect away from `/philly`.
2. **Branch**: new branch off the current one (recommended) so marketing
   improvements + CRM history are both preserved.
3. **DEUS-SHARED**: out of scope for this operation — the CRM stays on
   `claude/zen-noyce-f6e719`; a sync to DEUS-SHARED is a separate later action.

## 7. Safe execution order (when approved)
1. Cut new branch off current.
2. Delete CRM dirs (§1) + auth/login (§2 if chosen).
3. Apply config + connection edits (§3).
4. `npm install` → `npm run build` → `npm run typecheck` — marketing-only green.
5. (Optional) prune deps (§4) → rebuild.
6. Commit.
