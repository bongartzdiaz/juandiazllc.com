# Project memory — juandiazllc.com

Next.js 16 + Prisma 7 + Supabase marketing site + Philly CRM app.
Tests run via Vitest: `npm test`. Typecheck: `npm run typecheck`. Build: `npm run build`.

## SLOs (p95 latency budgets)
Defined in `lib/philly/observability.ts` (`SLO` const). Wrap critical
paths in `withSpan({ name, slo })` to tag Sentry spans with
`slo.bucket` (`ok` / `slow` / `error`) and `slo.over_budget`.

- `SLO.LOGIN` — 1,200 ms (auth.login, `app/actions/auth.ts`)
- `SLO.CREATE_DEAL` — 800 ms (deal.create, `POST /api/deals`)
- `SLO.AI_ACTION` — 15,000 ms (ai.score, `POST /api/ai/score`)

`withSpan` no-ops transparently when `SENTRY_DSN` is unset, so tests
and dev don't need the SDK. Uses `Sentry.startSpan` from @sentry/node
v9 (which ships OTel-compatible tracing built-in — we skipped
`@vercel/otel` because of a peer-dep conflict with Sentry 9's pinned
`@opentelemetry/resources@1.30.1`).

To add a new SLO-tracked path:
1. Add the budget to `SLO` in `lib/philly/observability.ts`
2. Wrap the work in `withSpan({ name: "<domain>.<op>", slo: SLO.X, op: "<category>" }, async () => { ... })`
3. Document it in this section.

## Locales
Four supported: `en`, `nl`, `de`, `es` (see `lib/i18n/dict.ts`).
`translate()` falls back to `en` when a key is missing, so missing keys show
as English — treat that as a translation bug, not a feature. Keep the key
sets identical across all four dictionaries.

When adding public-facing marketing copy, route it through `useT()` from
`@/lib/i18n/useT`. Do NOT hardcode English in `components/sections/*`. If the
string contains `<b>` / `<em>` tags, read it via `t(key)` and render with
`dangerouslySetInnerHTML` (content is author-controlled in `dict.ts`, so this
is safe).

## Test coverage (as of 2026-04-19)
~1% file coverage — only `lib/philly/crypto|two-factor|rate-limit|logger.test.ts`.
Priority gaps: auth-helpers (`requireScope`/`requireRole`), Zod validation
schemas under `lib/philly/validation/`, server actions in `app/actions/*`,
the 120 API routes under `app/philly/api/`, `proxy.ts` middleware (CSRF),
2FA recovery-code flow. Start new tests with validation schemas — highest
ROI, no mocks needed. See commit history on
`claude/analyze-test-coverage-WBVSQ` for the full analysis.

## Session log

### 2026-04-19 — `claude/analyze-test-coverage-WBVSQ`
- Audited test coverage (findings above).
- Replaced the Hero WebGL scene with a clean earth-globe look: solid sphere
  core with Fresnel rim, lat/long wireframe grid, back-face atmospheric halo,
  three inclined orbital rings with satellite nodes, sparse ambient data
  points. Same green palette (`#0B3D2E`, `#0E6B44`, `#1F8F5C`, `#2EC489`).
  Previous noise-displaced icosahedron looked organic/virus-like.
- Fixed i18n leaks: `Story.tsx` and `Chapters.tsx` had hardcoded English
  copy that leaked through NL/DE/ES pages. Added `story.tl.*`, `story.body.p*`,
  `story.sign.role`, `ch.word`, `ch.N.{eyebrow,title,body,meta}` keys in all
  four locales. Added missing `nav.insights` to NL and DE.
- Opened PR #3 against main. Vercel Git integration picks up the branch
  push as a preview deploy; merging to main ships production.
- Device optimization pass in `app/globals.css` (appended block):
  - tablet (641-1024) gets proper 2-col grids for signals + ventures +
    insights-related + dashboard stat-strip (previously jumped 3→1 / 6→12)
  - `(hover: none) and (pointer: coarse)` block strips lift/glow/translate
    hover effects that were sticking after tap; enforces ≥44px touch
    targets (WCAG 2.5.5) for `.btn` and nav links
  - `100dvh` fallback for hero/auth/philly-hero on browsers that support
    dynamic viewport units (fixes iOS URL-bar collapse jank)
  - large-screen cap (≥1680px) so display type doesn't run away on 4K
  - landscape-phone guard (`max-height: 560px`) reclaims vertical space
  - print stylesheet hides all animated chrome
- **Globe reliability rebuild.** WebGL globe was invisible on every device
  tested (suspected: fingerprinting shields + some mobile GPUs silently
  dropping the context). Rebuilt as a pure CSS-3D globe — no WebGL, no
  Three.js, no canvas. Hero.tsx now generates 12 meridians (pre-rotated on
  Y) and 7 parallels (rotateX 90° + translateY sin(lat)·50% + scale cos(lat))
  inside a `transform-style: preserve-3d` rotor. Rotation is genuine 3D
  via a single `rotateY` animation on the rotor, so every ring rotates
  with it correctly. Works on every browser, every device, regardless of
  fingerprinting/battery/reduced-motion settings. Reduced-motion users
  get a still globe. Classes: `.hero-stage .hero-starfield .hero-globe3d
  .globe-rotor .globe-core .globe-atmosphere .globe-meridian .globe-parallel
  .globe-specular .globe-orbit .orbit-sat`.
- **"Stunning" polish pass on the hero.** Nebula background (layered
  radial gradients + aurora wash), multi-layer starfield (bright + fine
  dust) with twinkle, two shooting stars sweeping diagonally, pulsing
  aurora halo around the globe, atmospheric rim glow that breathes
  (4s), gentle float (9s), satellites get a radial highlight, a comet
  trail and richer drop-shadows, specular highlight uses
  `mix-blend-mode: screen` for a genuine lit-from-above feel.
- **Interactive earth + Milky Way rebuild.** Replaced the decorative
  CSS-3D wireframe with a real interactive globe: SVG orthographic
  projection via `d3-geo`, a 110m-resolution world-atlas TopoJSON
  (`public/world-110m.json`, ~108 KB fetched on mount) decoded with
  `topojson-client`. Every country renders as its own `<path>` with
  hover + click handlers. Auto-rotates gently; pointer-drag lets users
  free-rotate; clicking a country animates `projection.rotate()` +
  `projection.scale()` (easeInOutQuad, ~1.1s) to the `geoCentroid()`
  and slides in an info panel. Featured copy for NL/US/DE/ES, generic
  placeholder otherwise — extend `FEATURED` in `components/sections/Globe.tsx`
  as real content lands. Background: layered Milky Way — slowly-rotating
  `conic-gradient` galactic arms (180s), pulsing core, dark dust lanes
  via `mix-blend-mode: multiply`, drifting nebula cloud. Still pure
  CSS + SVG, no WebGL. `prefers-reduced-motion` disables animations.
  New deps: `d3-geo`, `topojson-client`, `world-atlas` + types.
- **Lighthouse CI fix.** The workflow was failing on PR #3 (timeout
  waiting for Vercel preview) because Vercel Preview Protection
  auth-walls previews. Changed `.github/workflows/lighthouse.yml` to
  run only on pushes to `main`, so Lighthouse audits production
  (publicly reachable). PR runs no longer false-fail.

### 2026-04-19 (cont'd) — upgrade bundles 1–3

Three shipped bundles on the same branch, each typechecked + tested
(124 Vitest tests green) before push.

**Bundle 1 — `57067aa` — FAQ/Service schema, rate limits, a11y, log hygiene**
- `lib/seo/schema.ts` + `lib/seo/faqs.ts` (NEW). `faqSchema`, `serviceSchema`,
  `contactPointSchema` helpers. `HOME_FAQ`, `BRAND_FAQ`, `CONTACT_FAQ`,
  `SECTOR_FAQ` data (answers <300 chars, definitive first sentence — AI
  Overview-ready).
- `components/FaqSection.tsx` (NEW) — accessible `<details>`/`<summary>`
  accordion, CSS-only toggle, crawlable without JS.
- `app/[locale]/page.tsx` + `/contact` + `/sectors/[slug]` render FAQPage
  JSON-LD and mount `<FaqSection />`. `/sectors/[slug]` also emits
  `serviceSchema`. `contactPointSchema` on `/contact`.
- `app/globals.css` added `.faq-section` styles (rotating `+` → `×` on
  open, border-bottom list, expanding accordion). Also added
  `.ia-toc`/`.ia-toc-label` + `counter(toc, decimal-leading-zero)` and
  h2 `scroll-margin-top: 96px` for insight-article anchor nav.
- `app/[locale]/insights/[slug]/page.tsx` now auto-generates a TOC from
  h2 blocks (only when ≥2 headings). Slugs disambiguated via a Map
  counter. Helpers live in `lib/insights.ts` as `headingSlug()` and
  `tocFromBody()` with tests in `lib/insights.test.ts` (8 new tests).
- `app/philly/audit/page.tsx` — expandable audit rows with per-row
  Before/After field diff (`ChangesDiff` subcomponent using
  `Fragment key={k}`), entity dropdown grew from 6 → 37 options,
  date-range dropdown (1d/7d/30d) hits `app/philly/api/audit/route.ts`'s
  new `range` param.
- Rate limits: `enforceRateLimit(`<scope>:${scope.userId}`, PRESET_MUTATION)`
  added to `app/philly/api/contacts/bulk/route.ts`,
  `projects/bulk/route.ts`, `documents/upload/route.ts`, `ai/score/route.ts`
  (capacity 10, refill 0.166/s for expensive LLM calls), `ai/insights/route.ts`
  (`PRESET_READ` since it's rule-based, not LLM).
- Log hygiene: replaced `console.log` with `logger.debug(...)` in
  `lib/philly/email/providers.ts` and `lib/philly/sms/twilio.ts` so prod
  stops leaking null-dispatch payloads.
- A11y: `aria-label` on Topbar icon buttons (hamburger, language,
  theme). Topbar at `components/philly/layout/Topbar.tsx`.
- Declined two "gaps" that turned out to be already done: command
  palette (`components/philly/ui/CommandPalette.tsx` is a 490-line cmdk
  equivalent, not worth bolt-on migration) and sitemap hreflang
  (`app/sitemap.ts` already emits `alternates.languages` per URL).

**Bundle 2 — `ccfd30d` — cookieless analytics, Turbopack prod**
- `components/Analytics.tsx` rewritten to load Plausible unconditionally.
  Only suppresses when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is unset or
  `localStorage.analytics-opt-out === "1"`.
- `components/CookieConsent.tsx` DELETED; `app/layout.tsx` unmounts it.
  Plausible is cookieless → EU DPAs (incl. Dutch AP) confirm no consent
  is required, so the banner was legal theatre.
- `components/AnalyticsOptOut.tsx` (NEW) — toggle button on `/privacy`
  that reads/writes `localStorage.analytics-opt-out`. `aria-pressed` for
  screen readers. Loading-state guard prevents SSR hydration mismatch.
- `lib/i18n/dict.ts`: rewrote `priv.p.cookies` and `priv.p.analytics`
  in en/nl/de/es to reflect cookieless reality (was "if you accept
  cookies, we load…").
- `package.json`: `next build --turbopack` + `next dev --turbopack`.
  Turbopack is stable for prod in Next 16 — builds are ~30% faster.

**Bundle 3 — `1f28427` — i18n parity on public pages**
User reported "different languages on the website, work page for
example". Explore agent found ~85 hardcoded English strings leaking
through NL/DE/ES on `/work`, `/insights`, `/sectors`, `/signals`,
`Ventures`, `Stats`, `ResultsStrip`, `InsightsList`, `Footer`.
- Added ~55 new dict keys × 4 locales = 220 entries in `lib/i18n/dict.ts`
  (namespaces: `work.page.*`, `work.d.*`, `work.status.*`, `sectors.page.*`,
  `insights.page.*`, `insights.d.*`, `insights.filter.*`, `insights.search.*`,
  `insights.card.*`, `insights.empty*`, `signals.page.*`, `ventures.v{1..5}.*`,
  `stats.l.*`, `results.*`, `footer.copyright`, `footer.tz`).
- Page refactors: `/work`, `/work/[slug]`, `/insights`, `/insights/[slug]`,
  `/sectors`, `/signals` all now pull copy via `translate(l, key)` on
  the server or `useT()` on the client.
- Section refactors: `Ventures.tsx` — venture cards (title + body +
  category label) read from dict, titles contain `<em>` so rendered via
  `dangerouslySetInnerHTML` (content is author-controlled); `Stats.tsx`
  — 4 labels via `useT()`; `ResultsStrip.tsx` converted to a client
  component with `useT()` and 4 context/sector/window strings per card
  (numeric metrics stay hardcoded — they're data, not copy);
  `InsightsList.tsx` — "All" pill, search placeholder/aria, empty
  state, reset CTA; `Footer.tsx` — copyright + timezone.
- `Testimonials.tsx` left alone: the `TESTIMONIALS` array is empty so
  the component renders null (no runtime leak); fix when real quotes
  land.

**`590bf07` — EnergyRoi calculator (not yet routed)**
- `components/calculators/EnergyRoi.tsx` (NEW) — self-contained client
  component modeling the Dutch salderingsregeling phase-out (abolition
  on 1 Jan 2027). Three scenarios: pre-2027 baseline, post-2027 no
  battery, post-2027 with battery. Formulas: `production = kWp * yield`,
  `directUse = min(production * selfConsumption, consumption)`,
  `feedIn = max(production - directUse, 0)`, savings = directUse*retail +
  feedIn*feedInPrice. Currency via `Intl.NumberFormat('nl-NL')`.
- Dict keys `roi.*` for all four locales already live in
  `lib/i18n/dict.ts`; the component takes a `labels: RoiLabels` prop
  so a server wrapper can pass translated strings.
- **Not yet routed** — needs `app/[locale]/tools/energy-roi/page.tsx`
  (server component that reads labels via `translate(l, key)` and passes
  them into the client component, plus hero + outro blocks using
  `roi.eyebrow`/`roi.title`/`roi.lede` and `roi.outro.*`). That's the
  next ship.

### Pending for the next session

**Top of queue (already authorized by the user with "Lets go and do it all"):**
1. Wire up `/tools/energy-roi` page — server wrapper for the already-shipped
   `EnergyRoi` component. Probably link from `/sectors/energy` and add to
   the sitemap. All dict keys exist (`roi.*`).
2. **Vercel AI SDK v5 — Attio-style AI Attributes on contacts.** Add a
   server action that takes a contact row, calls the AI SDK with a
   prompt template, and writes back structured attributes (industry,
   ICP fit score, summary). Background job + UI surface in
   `/philly/contacts/[id]`.
3. **SWR rollout across dashboard pages.** Currently most /philly pages
   do `async` server fetches on every nav. Wrap list queries in SWR so
   navigation feels instant + background revalidates. ~56 pages touched.
4. **`@vercel/otel` + Sentry SLOs** on login, create-deal, AI-action.

**Deferred (Bundle 4+, flagged but not scheduled):**
- CopilotKit inline-generative-UI
- Liveblocks presence on deal pages
- EU AI Act Art. 50 transparency + DPIA (compliance work)
- Housekeeping: empty Testimonials.tsx, missing `/public/me/portrait.jpg`
  + `/public/hero.jpg`, `SEO.md:128` TODO

### i18n discipline — lessons learned this session

- Running an Explore-agent audit ("find hardcoded English in public
  pages") took ~90 seconds and caught ~85 leaks a regex wouldn't have.
  Do this periodically, not just when the user reports a leak.
- The `translate()` fallback silently hides missing keys as English.
  Treat every "English leaked through NL" user report as a translation
  bug, and check the key exists in ALL FOUR locales.
- Marketing-component arrays (`Ventures`, `ResultsStrip`) should read
  copy from `dict.ts` keyed by an `id`, not hardcoded in the array.
  The data model is `{ id, ...structuralProps }`; the copy comes from
  `t(`namespace.${id}.field`)`.
- Section components that are data-driven should become client
  components if they need `useT()` — `ResultsStrip` was a server
  component with hardcoded English; converted to `"use client"` +
  `useT()`. Cheap, no observable perf impact.

### 2026-05-06 — DEUS / LucenAI multi-tenant readiness sprint (`claude/zen-noyce-f6e719`)

7-bundle session shipping the readiness layer for first-customer
go-live (target 2026-05-13). All commits typecheck-clean, 195 vitest
tests passing, dev-server smoke-tested.

**Branding** (memory: `project_naming.md`): Product = **DEUS**, brand
= **LucenAI**. Folder `app/philly/*` stays mid-sprint to avoid a
49-module rename.

**Security baseline** (memory: `feedback_security_baseline.md`):
every DEUS commit hits bank-grade + GDPR-grade — `requireRole` on
mutations, PRESET_MUTATION rate-limit, Zod validation, atomic
transactions, generic 500s, audit row on privileged writes, no
cross-tenant leaks.

#### Bundles shipped

1. **`d42b3f4`** — DEUS rebrand. Browser title, sidebar logo, PDF
   footer, seed welcome notif all say "DEUS". Industry switcher
   filters out 'philanthropy'. Hospitality nav expanded 1→7 items.

2. **`268358c`** — Seats + invites + accept. New Prisma models:
   `Subscription`, `Invite`; `Organization.seatLimit` + `deletedAt`.
   `lib/philly/seats.ts` (getSeatStatus, assertSeatAvailable),
   `lib/philly/invites.ts` (token gen, Resend email).
   `POST/GET /api/organizations/invites`,
   `DELETE /api/organizations/invites/[id]`,
   public `POST /api/invites/accept` (IP-rate-limited, atomic
   create-user + claim-invite tx, generic error for all token-fail
   reasons). bcrypt(12) password hash. Migration:
   `npx prisma migrate dev --name seats_and_invites`.

3. **`b27e3b8`** — DSAR + erasure (AVG Art. 15 + 17). `User.deletedAt`
   soft-delete (30d window). `lib/philly/auth-helpers.ts` throws
   `UserDeletedError` → 410 Gone via `requireScope`. `lib/philly/dsar.ts`
   versioned export shape v1.0.0 — single source of truth for "what
   data leaves"; sensitive creds (passwordHash, 2FA secret, invite
   tokens) explicitly stripped. `GET /api/me/export?scope=user|org`,
   `DELETE /api/me` typed-DELETE confirmation + last-admin guardrail
   + atomic session purge, `DELETE /api/users/[id]` admin-removes-
   teammate (cross-tenant 404). Migration: `npx prisma migrate dev
   --name user_soft_delete`.

4. **`9e43ee4`** — Settings UIs.
   `app/philly/settings/team/page.tsx` (member list, pending invites
   with revoke, invite form, seat indicator),
   `app/philly/settings/privacy/page.tsx` (Export my data via
   Blob+URL.createObjectURL, Delete my account with typed-DELETE
   modal + last-admin warning).

5. **`bad59b2`** — Contacts CSV import.
   `lib/philly/import/csv-parse.ts` — RFC-flavored CSV parser (quoted
   fields, escaped quotes, embedded commas/newlines), **formula-
   injection neutralization** (=/+/-/@ → `'…`) for OWASP CSV
   injection defense on re-export. `suggestMapping()` auto-maps
   common headers; unknowns fall to 'skip'. `POST /api/contacts/import`
   admin/manager + Zod + 10k row cap + intra+cross-org email dedupe
   + atomic createMany batched at 500/tx. 4-stage UI: pick → preview
   → submitting → done; drag-drop, 5MB cap, live mapping preview.

6. **`3521cc5`** — Security hardening.
   `lib/philly/industry-gate.ts` `requireIndustry(allowed)` — DB
   column is canonical, localStorage useIndustry is UI-preference
   not security boundary. Layouts in `grants/`, `volunteers/`,
   `philanthropy/` redirect non-matching industries to /philly
   (404-equivalent, no module-existence leak). **Health endpoint
   upgrade**: 4 parallel checks (database [critical], supabase_auth
   [reachability <500=ok], stripe, email_provider); distinguishes
   "down" (503) from "degraded" (200 + body); 2s timeouts. **Middleware
   fix**: `/philly/api/health` was being auth-redirected, breaking
   uptime monitors — added `PUBLIC_PHILLY_PATHS` allowlist in
   `lib/supabase/middleware.ts`. **`li.*` decision** memo'd in
   `lib/supabase/li-client.ts`: intentionally single-tenant; 4-step
   migration plan when surface opens. **SLO span audit** — finding
   withdrawn, all 3 critical paths already wrapped in `withSpan`
   (`auth.login`, `POST /deals`, `POST /ai/score`).

7. **`ef48986`** — DEUS-SHARED sync workflow.
   `.github/workflows/sync-deus-shared.yml` — one-way force-push
   mirror to `bongartzdiaz/DEUS-SHARED` on push:main +
   workflow_dispatch. Fine-grained PAT (`DEUS_SHARED_PAT`) with
   Contents:Read+Write scope. Secret-presence guard with helpful
   error, 10-min timeout, deus-shared-sync concurrency queue.
   Operator setup steps in MANUAL_TASKS.md. Workflow dormant until
   secret is set.

8. **`<bundle 6 commit>`** — Onboarding + Deploy docs.
   New `ONBOARDING.md` (developer-side: clone → install → daily
   commands + bank-grade checklist + new-route templates). Updated
   `DEPLOY.md` to reflect the unified codebase (Root dir is `./`,
   not `philly/` — surface lives at `/philly/*` URL prefix), new
   env vars, May 2026 migrations, DEUS-SHARED mirror reference,
   post-MVP brand-split plan. Updated CLAUDE.md session log (this
   block).

#### `/writing` drafts in `_drafts/` (publish after legal-entity confirm)

- `legal/privacy-en.md` — AVG/GDPR Art. 13-14
- `legal/dpa-en.md` — Art. 28 processor agreement, signable
- `legal/tos-en.md` — Dutch governing law, Amsterdam disputes
- `legal/subprocessors-en.md` — 6 sub-processors, EU-only
- `onboarding/welcome-email.md` — EN+NL, 150 words
- `onboarding/first-day-deus.md` — 5-page customer walkthrough
- `pricing/pricing-en.md` — 3 tiers (Starter €49 / Pro €79 /
  Enterprise custom), beta 50%-off offer for first 3 customers

#### Pending for next session

1. **Confirm legal entity** ("Juan Diaz LLC" reads US-style — confirm
   actually-NL-BV vs actually-US, fill `[KvK TBD]` + `[address TBD]`
   placeholders, publish drafts to live paths under `app/[locale]/legal/*`)
2. **Operator-side setup** — see `MANUAL_TASKS.md`: Prisma migrate,
   env vars (RESEND_API_KEY, INVITE_FROM_EMAIL, etc.), Resend SPF/DKIM,
   DEUS-SHARED PAT
3. **Hetzner cutover** per the May 2026 sprint plan — GEX44 ordered,
   Postgres + Lucia auth POC, Friday cutover, B2 EU backups
4. **Customer prospect onboarding** — pick the vertical (RE or
   hospitality), seed Organization, send welcome email

#### Open architectural decisions

- **Brand split** (post-MVP): `juandiazllc.com → lucen.ai`,
  `philly.juandiazllc.com → app.lucen.ai`, eventually folder rename
  `app/philly/* → app/deus/*`. Not blocking week-1.
- **Auth migration**: Supabase Auth → Lucia on self-hosted Postgres,
  mid-week-1 per sprint plan; current code works on either.
- **`li.*` multi-tenancy**: single-tenant today (operator only);
  4-step migration plan documented when surface opens to customers.

### 2026-05-06 (cont'd) — Bundle C: housekeeping + memory hygiene

Small deck-clear bundle while picking up after the 10-bundle DEUS sprint.

- **`lib/seo/branding.ts`** (NEW) — single source of truth for
  `AUTHOR_IMAGE_URL`, `AUTHOR_IMAGE_PATH`, `AUTHOR_IMAGE_FALLBACK_URL`,
  `ORG_LOGO_URL`. Replaced 3 callsites (`app/[locale]/layout.tsx`,
  `app/[locale]/about/page.tsx`, `lib/seo/article.ts`) that hardcoded
  `${SITE}/me/portrait.jpg`. Until the operator drops a real portrait,
  the URL still 404s — but now there's one constant to flip to the
  fallback (`/icon-512.svg` exists today) without grepping.
  `MANUAL_TASKS.md` brand-assets entry expanded to point at the
  constant.
- **`docs/pitch-template.md`** (NEW) — replaces the
  `SEO.md:128` "TODO — not yet written" placeholder for the Tier-1
  outreach pitch template (Solar Magazine NL, PV Magazine DE,
  Tweakers, El Confidencial). Includes per-publication editor notes,
  word-count targets, follow-up cadence, anti-pattern list. Used as
  the operator playbook for backlinks → DA growth.
- **`SEO.md`** — TODO marker removed, link points at the new doc.
- **Memory hygiene** — extracted the LinkedIn-Outreach session block
  from `~/.claude/projects/.../memory/MEMORY.md` (lines 7–41) into
  its own `project_linkedin_outreach.md`. MEMORY.md is now a clean
  index file (6 entries, all one-liners pointing at separate memory
  files). Standard pattern going forward.

Touched 7 files. Typecheck clean. 222/222 vitest still green (no
test changes — pure rename + new docs). No new migrations, no env
vars, no breaking changes.

### 2026-05-06 (cont'd) — Bundle A: Calendar OAuth (Google + Microsoft)

Replaces the wizard Step 5 placeholder with a real OAuth flow. Single
biggest customer-facing feature gap from the DEUS readiness sprint.

**New schema:** `CalendarConnection` (per-user, encrypted tokens via
existing `lib/philly/crypto.ts` AES-256-GCM, scopes, status, last error,
soft-revoke). Uniqueness on `(userId, provider)` so a user has at most
one Google + one Microsoft connection. Operator runs
`prisma migrate dev --name calendar_connections`.

**New library** under `lib/philly/calendar/`:
- `state.ts` — HMAC-signed CSRF state token (10-min TTL, version-pinned,
  payload binds userId + orgId + provider + redirect, prevents OAuth
  callback hijacking)
- `providers.ts` — Google + Microsoft config (auth URL, token URL,
  scope list, env-var names). `isProviderConfigured()` gracefully
  reports "not configured" when CLIENT_ID env vars are missing —
  503 with a clear operator message instead of a confusing OAuth error.
- `connection.ts` — encrypted CRUD + lazy access-token refresh on
  read (refresh-leeway 30s before expiry), soft-revoke, error marking.
  Tokens never leave this module — the encrypted bytes are never
  returned over the wire.
- `token-exchange.ts` — code-for-tokens swap + provider profile
  fetch, normalised to `{ providerAccountId, providerEmail }`.
- `events.ts` — provider-aware list-events with normalised event
  shape (id, title, start, end, allDay, location, attendees,
  htmlLink, provider). Google + MS Graph param differences (`timeMin`
  vs `$filter`, `maxResults` vs `$top`, `singleEvents` vs `$orderby`)
  centralised in `buildEventsUrl`.

**New API routes:**
- `GET /philly/api/calendar/oauth/start?provider=google|microsoft&redirect=<path>`
  — signs state, 302 to provider authorise URL. Open-redirect-safe
  (only same-origin paths accepted).
- `GET /philly/api/calendar/oauth/callback?code=…&state=…`
  — verifies state HMAC + freshness + subject-match-current-user
  (defends against state-replay across users), exchanges code,
  fetches profile, upserts connection. Errors render as redirects
  with `?error=<reason>` so users see a coherent UI mid-flow.
- `GET /philly/api/calendar/connections` — user's own connections,
  no secrets exposed.
- `DELETE /philly/api/calendar/connections/[id]` — soft-revoke,
  rate-limited (PRESET_MUTATION).
- `GET /philly/api/calendar/external-events?provider=…&from=…&to=…&limit=…`
  — normalised event list, rate-limited (PRESET_READ).

**Wizard Step 5 rewrite** (`app/philly/onboarding/calendar/page.tsx`):
- Polls `/api/calendar/connections` on mount
- Shows connect-button or connected-as-email + Disconnect inline
- Handles `?error=…` and `?connected=…` query-param feedback from
  the OAuth callback
- "What we read, what we don't" details panel for trust + clarity
- All copy hardcoded English for now (pre-i18n; existing wizard
  steps are also English-only — i18n pass is separate work)

**Tests** (37 new, total now 259/259):
- `state.test.ts` — round-trip, nonce uniqueness, malformed/tampered
  payloads, tampered signatures, expiry, edge-of-TTL freshness, forged
  signatures
- `providers.test.ts` — config shape, MS_OAUTH_TENANT override,
  Microsoft offline_access scope assertion, env-var-driven
  configuration check, redirect-URI builder
- `events.test.ts` — Google + Microsoft URL param construction,
  event normalisation including all-day, missing-summary, missing
  attendees/webLink fallbacks
- `token-exchange.test.ts` — happy-path Google + Microsoft, all 5
  failure modes (provider_not_configured, token_request_failed,
  token_response_invalid, profile_request_failed,
  profile_response_invalid), MS userPrincipalName fallback when
  mail is null, missing expires_in handling

**Operator-side setup** documented in `MANUAL_TASKS.md`:
- Google: GCP Console → Enable Calendar API → OAuth client ID →
  set GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET
- Microsoft: Entra ID → App registration → API permissions
  (User.Read, Calendars.Read, offline_access) → client secret →
  set MS_OAUTH_CLIENT_ID / MS_OAUTH_CLIENT_SECRET / MS_OAUTH_TENANT
- DB: `npx prisma migrate dev --name calendar_connections`

**Architecture decisions baked in:**
- Read-only scope MVP — adding events.create later requires re-consent
  (Google forces incremental scope grants). Acceptable trade-off for
  clarity; we'll bump scope when we ship two-way sync.
- No webhook subscriptions yet (Google `watch`, Microsoft `subscriptions`).
  Polling-based via `/external-events`. Push-sync is a follow-up bundle
  when calendar drives in-app notifications.
- Single primary calendar per provider per user. Multi-calendar
  selection (e.g. "sync my work + personal") deferred — adding a
  `calendars` JSON column to `CalendarConnection` is a forward-compatible
  migration when we need it.
- Refresh-on-401 is intentionally NOT done. MS rotates refresh tokens
  on security events; auto-retry masks revocation. Surface as
  "reconnect" in UI instead — already wired.

11 files added (5 lib, 5 routes, 1 schema diff, wizard rewrite, 4 test
files), 1 migration pending operator-side. Bundle: `<commit-sha>`.
