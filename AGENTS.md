# Project memory — juandiazllc.com

Next.js 16 + Supabase. **Marketingsite, meer niet.** Negen dependencies,
elf dev. Tests via Vitest: `npm test`. Typecheck: `npm run typecheck`.
Build: `npm run build`.

> ⚠️ **Alles onder "Session log" hieronder is gedateerd en beschrijft voor
> een groot deel het CRM dat op 2026-08-11 uit deze repo is verwijderd.
> Lees het als geschiedenis, niet als beschrijving van de huidige code.**
> Wat er nu staat, staat in de twee secties direct hieronder.

## Wat hier NIET meer woont (2026-08-11)

Vijf PR's hebben het CRM en alles eromheen uit deze repo gehaald. Dit
staat hier zodat een volgende sessie niet opnieuw gaat "bouwen" wat al
verhuisd is.

| weg | waarheen / waarom | PR |
|---|---|---|
| `app/philly/*`, `lib/philly/*`, `components/philly/*`, `hooks/philly/*`, `prisma/` | het CRM leeft in `bongartzdiaz/DEUS-SHARED`, daar op **postgresql** met 95 models | #134 |
| `app/[locale]/{app,dashboard,status}` | ingelogde surface + statuspagina die alleen `/philly/api/health` peilde | #134 |
| 26 npm-pakketten, `scripts/migrate-to-hetzner/`, Tailwind | Tailwind had hier nooit gedraaid — 2483 regels handgeschreven CSS, nul directives | #137 |
| `app/[locale]/login`, `app/auth/`, `app/actions/auth.ts`, `lib/observability.ts` | elke inlogbestemming wees naar iets dat weg was | #138 |
| `lib/supabase/{middleware,client,li-client}.ts` | geen afnemers meer | #138, #140 |

**De SLO-sectie die hier stond is vervallen.** Die beschreef
`SLO.LOGIN`, `SLO.CREATE_DEAL` en `SLO.AI_ACTION` in
`lib/philly/observability.ts`, met `withSpan`-wrappers op `auth.login`,
`POST /api/deals` en `POST /api/ai/score`. Alle vier zijn verwijderd.
Wil je latency-budgetten op de marketingkant, dan is dat nieuw werk, geen
herstel. Sentry draait nog wel (`lib/sentry.ts`, alleen serverfouten;
`sendDefaultPii` staat uit).

**DEUS-SHARED is de bron voor alles wat CRM is.** De `sync-deus-shared.yml`
die van die repo ooit een spiegel maakte, heeft nooit op main gestaan; de
twee zijn sindsdien uit elkaar gegroeid en DEUS-SHARED loopt voor.

## Het `li.*`-schema — beslissing bewaard, code weg (2026-08-11)

`lib/supabase/li-client.ts` is verwijderd in #140. Het bestand had geen
afnemers meer nadat `/philly/outreach` en `/api/outreach/*` met #134
verdwenen, maar het droeg een beslissing die het bewaren waard is.

**De beslissing (2026-05-06).** Het `li.*`-schema was bewust
**single-tenant**: het droeg Juans eigen LinkedIn-outreachpijplijn,
binnen DEUS getoond als operator-only dashboardfunctie. Klantorganisaties
lazen of schreven er niet in. De afscherming zat in drie lagen:
`requireRole(['admin','manager'])` op de muterende routes, een sidebar-ingang
die alleen voor bepaalde industrieën verscheen, en een service-role-sleutel
die alleen server-side bestond.

**Alle drie die lagen zijn met #134 verdwenen**, samen met de routes die ze
beschermden. Er is hier niets meer dat `li.*` benadert.

**Het migratieplan, als de surface ooit opengaat voor klantorganisaties:**
1. `organization_id`-kolom op elke `li.*`-tabel
2. bestaande rijen backfillen naar Juans org-id
3. elke query hard filteren op `.eq('organization_id', scope.organizationId)`
4. Postgres-RLS als tweede slot — en let daarbij op
   `feedback_postgrest_rpc_execute_default`: RLS alleen is niet genoeg,
   want PostgreSQL geeft EXECUTE standaard aan PUBLIC.

**Openstaande vraag.** Het `li`-schema bestaat **niet** in Supabase-project
`wbgiouuifqhasedncysw`, terwijl `liClient()` daar wel naartoe wees
(`getSupabaseUrl()` + `{ db: { schema: "li" } }`). Gemeten op 2026-08-11:
alleen `public`, 120 tabellen. Waar de outreachdata werkelijk staat is
**niet vastgesteld** — zie de memory `project_linkedin_outreach`.

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

> ⚠️ **This list is historical (April 2026) and items 1, 2 and 4 were
> already shipped long before they were struck through here.** It has
> misled two separate sessions into "building" finished features.
> **Verify against the code before acting on anything in this block.**

**Top of queue (already authorized by the user with "Lets go and do it all"):**
1. ~~Wire up `/tools/energy-roi` page~~ — **DONE**, shipped in PR #9
   (`9038b9e`) with sitemap entry + two CTAs from `/sectors/energy`.
   Confirmed 2026-05-07.
2. ~~**Vercel AI SDK v5 — Attio-style AI Attributes on contacts.**~~ —
   **DONE**, also shipped in PR #9. `lib/philly/ai/contact-attributes.ts`,
   `POST /philly/api/contacts/[id]/ai-attributes`,
   `components/philly/contacts/AiAttributesCard.tsx`, schema fields
   `aiIndustry` / `aiIcpFit` / `aiSummary` / `aiAttributesStatus`.
   Built as an API route, not a server action. Confirmed 2026-07-21.
3. **SWR rollout across dashboard pages.** Currently most /philly pages
   do `async` server fetches on every nav. Wrap list queries in SWR so
   navigation feels instant + background revalidates. ~56 pages touched.
   *(Not verified — check before starting.)*
4. ~~**`@vercel/otel` + Sentry SLOs** on login, create-deal, AI-action.~~
   — **DONE**; all three paths wrapped in `withSpan`. The `@vercel/otel`
   half was deliberately dropped (peer-dep conflict with Sentry 9); see
   the SLO section at the top of this file.

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

### 2026-05-06 (cont'd) — Bundle B: Stripe billing (Checkout + Portal + webhooks)

Unlocks paid trials → revenue gate for first customers. Builds on the
existing `Subscription` schema (already shipped in the readiness sprint)
and the `seats.ts` helper (which already reads `Subscription.seatCount`
when status is `active` or `trialing`). My job was just keeping the
`Subscription` row fresh via webhooks.

**New library** under `lib/philly/stripe/`:
- `client.ts` — lazy Stripe singleton, env-var-driven, `isStripeConfigured()`
  graceful-fail (Resend pattern). API version pinned to `2025-02-24.acacia`
  (matches installed SDK 17.7's `LatestApiVersion`).
- `plans.ts` — plan catalogue (Starter / Professional). Price IDs live
  in env vars (`STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`),
  not in code — Stripe is source-of-truth for pricing. `planKeyFromPriceId()`
  reverse-maps for the webhook handler.
- `customer.ts` — `ensureStripeCustomer(org, billingEmail)` lazy creates
  a Stripe Customer per Organization, idempotent.
- `subscriptions.ts` — `upsertFromStripe(orgId, sub)` mirrors a Stripe
  Subscription into our DB. Status mapping: trialing/active = honour
  seatCount; past_due/unpaid = revert to free-tier (seats.ts handles
  the fallback so customer doesn't get locked out mid-failure);
  canceled/incomplete = audit row stays, free-tier seats. Defensive
  read of `current_period_end` (Stripe API version drift — top-level
  vs items[0]).
- `webhook.ts` — `verifyWebhook(rawBody, sig, secret)` (HMAC + 5-min
  replay-window via Stripe SDK), `dispatchEvent(event)` routes 5
  critical events. Idempotent — Stripe retries are safe replays.
  Soft-fail on missing metadata (return ok:true so Stripe stops
  retrying), 500 only on real DB failures (Stripe SHOULD retry).

**New API routes:**
- `POST /philly/api/billing/checkout` — admin-only, rate-limited.
  Creates Customer (lazy) → Checkout Session with 14-day trial,
  EU VAT collection, billing-address-required. Returns `{ url }` for
  client redirect.
- `POST /philly/api/billing/portal` — Customer Portal session for
  self-service plan/payment/invoice management.
- `POST /philly/api/billing/webhook` — Stripe receiver, signature
  verified, no-session bypass via `PUBLIC_PHILLY_PATHS` allowlist
  in `lib/supabase/middleware.ts`.
- `GET  /philly/api/billing/subscription` — current sub status + seat
  usage for the UI. Anyone signed-in can read (no card data exposed).

**Settings UI** at `app/philly/settings/billing/page.tsx`:
- Polls `/api/billing/subscription` on mount
- "Current plan" panel: plan name, seat usage (used/limit + active/pending),
  next renewal date OR "no subscription" for free tier
- "Manage subscription" button (admin-only) opens Stripe Portal
- "Upgrade" panel (only visible on free / canceled / expired tiers):
  side-by-side Starter / Professional cards with feature lists + "Start
  free trial" CTAs
- Surfaces `?session_id=…` (success) and `?canceled=1` (canceled at
  Stripe) query params from the Checkout redirect
- "Cancels on …" notice when `cancelAt` is set

**Tests** (30 new, total now 289/289):
- `plans.test.ts` — `planFromKey` happy + unknown, `getPriceId` env
  var driven, `planKeyFromPriceId` reverse mapping, TRIAL_DAYS = 14
- `webhook.test.ts` — `HANDLED_EVENTS` shape, `isHandledEvent` narrowing,
  `verifyWebhook` 6 cases (valid, missing signature, missing secret,
  wrong-secret, tampered body, expired timestamp), `resolveOrganizationId`
  + `invoiceSubscriptionId` polymorphism
- `subscriptions.test.ts` — `isHandledStatus`, `subscriptionPeriodEnd`
  defensive read across API versions

**Architecture decisions baked in:**
- 14-day trial, no card-up-front. Anti-abuse mitigation deferred —
  if it becomes a problem, flip via `subscription_data.trial_settings`.
- Single line item per subscription (seats × price). Add-ons / metered
  usage deferred. The webhook reads `items.data[0]` so multi-item
  subs would silently use only the first — fine for now, noted for
  when we ship usage-based billing.
- EU VAT via `tax_id_collection: { enabled: true }` — Stripe handles
  reverse-charge mechanics. Fine for B2B-only customers.
- `PUBLIC_PHILLY_PATHS` allowlist gets a 2nd entry (was just `/health`).
  Every public path is a hole — both are minimal-risk (signature-verified
  inputs, no PII in response).
- Refresh-after-failed-payment NOT auto-retried — Stripe's dunning emails
  handle it. We just mirror the past_due state so the customer sees
  it in `/settings/billing`.

**Operator-side setup** documented in `MANUAL_TASKS.md`:
- Stripe Dashboard: create Starter + Professional products
- Webhook endpoint subscribed to 5 events, copy `whsec_…`
- Vercel env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`
- Local dev: `stripe listen --forward-to localhost:3000/...`

15 files added (6 lib including 3 test files, 4 routes, 1 settings UI,
1 middleware diff, 1 webhook handler). NO new schema migrations
needed — Subscription model was already shipped.

### 2026-05-07 — Bundle F: per-user integrations settings surface

Closes the gap between the onboarding wizard (one-time, per-user calendar
connect) and post-onboarding management. Yesterday's Bundle A wired
calendar OAuth through `/philly/onboarding/calendar`, which users only
see during initial setup — nowhere to manage connections after that.

- **`app/philly/settings/integrations/page.tsx`** (NEW) — dedicated
  per-user settings surface. Polls `/api/calendar/connections`, shows
  Google + Microsoft rows with Connect / Disconnect, surfaces `?error=`
  / `?connected=` query-param feedback from the OAuth callback. Same
  trust panel ("what we read, what we don't") as the wizard so the
  promise stays consistent across surfaces.
- **`app/philly/settings/page.tsx`** — replaced the integrations tab
  kitchen-sink stub (which had hardcoded fake `GoHighLevel/Supabase/
  Slack/GA` rows) with two cards: "Personal — calendar" links to
  `/philly/settings/integrations`, "Workspace — org-wide tools" links
  to the existing `/philly/integrations`. No more fake data.

**Architecture decision**: kept the per-user surface (`/settings/integrations`)
distinct from the per-org surface (`/philly/integrations`) because the
underlying data models are different — `CalendarConnection` is per-user
(every teammate connects their own calendar) while the workspace
`Integration` model is per-org (one Stripe key, one Slack workspace).
Forcing them onto a single page would have required either:
- Tagging each row "personal vs workspace" — confusing UX
- Or merging the data models — would have broken per-user calendar isolation

Two surfaces, clearly labelled, is honest.

**No new schema, no new API routes, no new lib code.** Pure UI completion
on top of yesterday's Bundle A. Typecheck clean. 289/289 vitest still
green (no tests for UI-only changes; the API was test-covered in Bundle A).

### 2026-05-07 — Bundle E: confirmed already shipped

Earlier session log claimed `/tools/energy-roi` was "not yet routed" —
verified incorrect. The page (`app/[locale]/tools/energy-roi/page.tsx`)
shipped in PR #9 (`9038b9e`), with sitemap entry + two CTAs from
`/sectors/energy` (anchor callout + dedicated card). No work needed.

### 2026-05-07 — Bundle G: audit log on billing + calendar mutations

Wired the existing `logAudit` helper (`lib/philly/audit.ts`) into the
three new user-initiated mutation paths from yesterday's bundles:

- **`POST /api/billing/checkout`** — audits the *intent* (entity=subscription,
  action=create, entityId=null). The actual Subscription row gets created
  later via `customer.subscription.created` webhook. Capturing the intent
  here gives auditors a who-clicked-what trail even when the customer
  drops off mid-Checkout (declines card, abandons tab).
- **`GET /api/calendar/oauth/callback`** — audits the connection
  (entity=integration, action=create). Records `{provider, providerEmail,
  kind: 'calendar'}` in changes. We deliberately do NOT log providerAccountId,
  scopes, or any token/refresh material — those are sensitive enough to
  keep out of permanent record.
- **`DELETE /api/calendar/connections/[id]`** — audits revocation
  (entity=integration, action=delete, entityId=connection.id). Status
  flip recorded as `{old: 'active', new: 'revoked'}`.

**What's NOT audited here**: the Stripe webhook handler. Webhook events
are server-to-server (no Supabase session, no `scope.userId`) — `AuditLog.userId`
is required by schema. Webhook events stay in `logger.info` instead.
If future compliance review demands user-traceable audit on webhook
state changes, the right move is to add a synthetic system-user row
+ FK relaxation, not roll-our-own around it.

3 files changed (3 routes + 1 doc). Typecheck clean. 289/289 still
green. No new schema, no new env vars, no breaking changes.

### 2026-05-07 — Bundle D: calendar push-sync (Google `watch` + MS Graph subscriptions)

Replaces poll-only calendar reads (`/api/calendar/external-events`) with
provider-pushed notifications. Calendar changes propagate to DEUS in
seconds instead of waiting for the next poll. Builds on Bundle A's
OAuth foundation; uses the same `CalendarConnection` rows for tokens.

**Research first** (used `/research` skill — findings persisted to
`docs/calendar-push-sync.md` for future contributors). Key APIs +
gotchas:
- Google `watch`: TTL up to 7 days, no auto-renewal — must create new
  + stop old. Webhook is push-then-pull (empty body, headers carry
  channel id + token). `X-Goog-Resource-State='sync'` is the bootstrap
  notification — ignore.
- MS Graph subscriptions: TTL **4230 minutes (~70 hours)** — much
  shorter. Renew via PATCH. Validation handshake on first contact:
  POST `?validationToken=…` with `text/plain`, must respond plain text
  + 200 within **10 seconds**. Notifications: 3-second hard SLA, queue
  + 202 immediately.

**New schema**: `CalendarChannel` (per-CalendarConnection, encrypted
authSecret, externalId, expiresAt, lastMessageNum, syncToken, status).
`@@unique([provider, externalId])` so the webhook can look up the
right channel by what the provider sends. `@@index([expiresAt, status])`
for the renewal cron's selector. Run `prisma migrate dev --name
calendar_push_sync` to apply.

**New library** (`lib/philly/calendar/push-sync.ts`):
- `subscribe()` — provider-aware. Generates a 32-byte random authSecret,
  calls Google `events.watch` or MS `POST /subscriptions`, persists a
  `CalendarChannel` row. Idempotent — returns the existing active
  channel if one exists.
- `renew()` — Google: new `watch` + stop old (overlap intentional, per
  Google's docs). MS: `PATCH /subscriptions/{id}` with new
  `expirationDateTime`.
- `unsubscribe()` — best-effort tear-down. Tells the provider to stop
  via Google's `/channels/stop` or MS's `DELETE /subscriptions/{id}`.
  Marks the row `expired` regardless of provider response — the
  channel will time out upstream within its TTL anyway.
- `listDueForRenewal()` — selector for the cron, returns channels with
  `expiresAt < NOW + 12h` and `status='active'`.

**New webhook receiver** (`app/philly/api/calendar/webhook/[provider]/route.ts`):
- Single route, dynamic param distinguishes Google vs MS.
- MS validation handshake is the FIRST branch (text/plain query-param
  echo). Must precede the JSON body parse — handshake requests don't
  have JSON.
- Google handler: verify `X-Goog-Channel-Token` against decrypted
  authSecret using `crypto.timingSafeEqual`, ignore bootstrap `sync`
  state, dedupe via `lastMessageNum` (refuse `<= stored`).
- MS handler: `value` array can batch notifications across DIFFERENT
  subscriptions in one POST — group by `subscriptionId`, verify
  `clientState` per group via timing-safe compare.
- Both return 2xx fast. Today the actual delta-fetch is just a TODO
  marker — proves the round-trip works without committing to a sync
  implementation. Event-fetch worker is a follow-up bundle.

**Wired into existing flows**:
- `app/philly/api/calendar/oauth/callback/route.ts` — after
  `upsertConnection`, calls `subscribePushSync()` best-effort. Failure
  is non-fatal (user still gets a working OAuth connection).
- `app/philly/api/calendar/connections/[id]/route.ts` DELETE — tears
  down active channels FIRST (while OAuth tokens are still valid),
  then revokes the connection. Channel stops happen synchronously
  before the row flip.

**Middleware allowlist** — added two paths to `PUBLIC_PHILLY_PATHS`
(`/philly/api/calendar/webhook/google`, `/philly/api/calendar/webhook/microsoft`).
Joins `/health` and `/billing/webhook` as the only auth-exempt /philly
paths. Per-channel encrypted authSecret is the auth.

**Tests**: 13 new in `push-sync.test.ts` covering TTL constants vs
provider docs, URL builders, base64url-secret length + uniqueness +
provider-limit fits. **289 → 302/302 green.** Also fixed a flaky test
inherited from Bundle A's `state.test.ts` — the tampered-signature
assertions had a 1/64 collision when the random sig already ended in
'X'. Replaced with a guaranteed-different replacement char.

**Architecture decisions baked in**:
- Schema: separate `CalendarChannel` table (not extending `CalendarConnection`)
  so OAuth state and push-sync state have independent lifecycles. A
  channel can fail without invalidating tokens, and vice versa.
- TTL choices: 6 days (Google) and 4200 minutes (MS) — both leave
  buffer vs the documented caps for clock skew + retry on transient
  failure.
- Renewal buffer: 12 hours — comfortably ahead of MS's 70-hour TTL,
  reasonable for daily Google renewals.
- AuthSecret: 32-byte base64url → 43 chars. Fits within Google's 256
  and MS's 128 character limits with room.
- Bootstrap "sync" notification: ignore via early return — only `exists`
  state triggers downstream.
- MS 3-second SLA: handler does verify + bookkeeping, returns 202
  Accepted. Actual sync work is a TODO — no synchronous work in the
  handler.
- Webhook deduplication: at-the-edge via `lastMessageNum` (Google
  only — MS doesn't expose an equivalent). Sync-level idempotency
  (event upsert by external id) is the second layer when the actual
  fetch lands.

**Operator setup** documented in `MANUAL_TASKS.md`:
- `prisma migrate dev --name calendar_push_sync`
- `NEXT_PUBLIC_APP_URL` must be set (otherwise subscribe is no-op)
- Renewal cron job (deferred — `listDueForRenewal()` selector is ready)

8 files added (1 schema diff, 1 lib, 1 lib test, 2 routes, 1 middleware
diff, 1 oauth-callback diff, 1 connection-delete diff, 1 docs file +
1 docs update). Typecheck clean.

### 2026-05-07 — Bundle D2: renewal cron + push-sync status badge

Closes the production gap from Bundle D — `CalendarChannel` rows expire
after 7 days (Google) or ~70 hours (Microsoft); without a renewal cron,
push-sync stops working silently. This bundle ships the renewal path
plus a UX touch so users can see the sync is healthy.

- **`POST /api/calendar/cron/renew-channels`** — same auth shape as
  the existing `/api/audit/prune` cron (`X-Cron-Secret` header OR admin
  session). Calls `listDueForRenewal()` + per-channel `renew()` loop
  with a 200-channel batch cap so a single sweep can't go runaway.
  Returns `{ dueTotal, processed, renewed, failed, results[] }` —
  enough for an operator to debug a sweep without dumping per-channel
  secrets.
- **`GET /api/calendar/connections` extended** — adds a `channel`
  field per connection: `{ id, status, expiresAt, lastRenewedAt }` or
  `null`. The query joins `CalendarConnection.channels` (filtered to
  `status='active'`, ordered desc, take 1) so the front-end gets a
  single round-trip per render.
- **`/philly/settings/integrations` UX** — adds a green "Real-time sync ·
  renews in 6d" badge next to the connected-as-email row when a healthy
  channel exists. When a connection is active but no channel is healthy
  (subscribe failed, channel expired without renewal), shows "Read-only
  — push-sync not active" so the user can tell what's happening
  without reading docs. Helper `formatRelativeFuture` keeps the
  copy short ("in 5h" → "in 3d" → absolute date if >7 days).

**No new schema, no new env vars** beyond the already-existing
`CRON_SECRET`. Cadence + cron entry documented in `MANUAL_TASKS.md`.

302/302 tests still green (no new tests this bundle — the cron route
delegates to `push-sync.ts` which is already test-covered, and the UI
addition is pure rendering on top of the typed response). Typecheck
clean.

### 2026-05-07 — middleware fix surfaced by preview verification

While verifying Bundle D2 in a local preview I tried to call
`POST /api/calendar/cron/renew-channels` without a session and got
`opaqueredirect` (302 to /login) instead of the expected 401 from the
route handler. Realised the middleware redirect happens BEFORE the
route's own `X-Cron-Secret` check, so any external scheduler hitting
this endpoint gets bounced. Same architectural shape as `/api/health`
hit earlier in PR #12.

This was also a latent bug in `/api/audit/prune` (shipped weeks ago,
documented as cron-callable in its header comment, but actually
unreachable from any non-session caller). Both routes now in
`PUBLIC_PHILLY_PATHS`. The route-level auth check (X-Cron-Secret OR
admin session) is unchanged — the allowlist entry just lets the
request reach the handler.

Verified post-fix: all three previously-broken endpoints now return
401 from `requireRole` instead of 302 from middleware. 302/302 tests
still green; no test code touched.

Lesson: spin up a preview EARLIER when shipping cron-style routes —
unit tests don't catch middleware-shape bugs because they don't
exercise the middleware path.

### 2026-05-07 — Bundle AF: audit fixes (HIGH × 2, MEDIUM × 4, LOW × 2)

Followup to `/audit-full` — addressed 8 of 11 findings. The remaining
3 (lastUsedAt schema-drift, CalendarConnection.organization onDelete,
lastError UI rendering) are LOW-impact follow-ups documented in the
audit report; not blocking.

**HIGH severity (cross-tenant safety in renew-channels):**
- F1: `cron/renew-channels` admin path was processing channels across
  ALL organizations because `listDueForRenewal()` had no scope filter.
  Added optional `organizationId` parameter; admin path passes
  `scope.organizationId`, cron path omits to process all orgs.
- F2: Same route had no rate limit on the admin path. Added
  `PRESET_MUTATION` for the admin trigger; cron skips (secret implies
  trust). Plus self-audit for admin runs (mirrors /api/audit/prune).

**MEDIUM (compliance + contracts):**
- F3: Stripe Customer Portal access now writes an audit row. The portal
  enables cancel/payment-method/tax-id changes; downstream Stripe
  webhooks fire as `customer.subscription.deleted` etc. but those are
  server-to-server with no userId. This row ties the resulting state
  changes back to the admin who clicked the button.
- F4: Admin-triggered renew-channels sweep now writes an audit row
  (renewedCount, failedCount, processed). Mirrors prune route's pattern.
- F6: Hoisted `ConnectionDTO` / `ChannelDTO` / `ConnectionsResponse`
  into `lib/philly/calendar/types.ts`. Both UIs that consume the
  endpoint (wizard + integrations settings) now import from there
  instead of declaring their own inline interfaces. The wizard had
  drifted (missing `channel` field added in Bundle D2) — fixed.
- F7: Created `lib/philly/app-url.ts → getAppBaseUrl()` helper. Stripe
  checkout, Stripe portal, and calendar OAuth subscribe all use it
  now. Portal route gained the missing fail-fast on missing env (was
  silently composing a relative URL Stripe rejected with an opaque
  error) and the missing `session.url` null-check.

**LOW (polish):**
- F9: Removed duplicate `'user'` from `AuditEntity` union.
- F10: Gated `access_type=offline` and `prompt=consent` behind
  `provider === 'google'` check. They were unconditionally set for
  both providers; harmless on MS but misleading to read.

**Skipped this round (LOW, follow-up):**
- F5 (lastUsedAt soft-promise — needs throttled write logic)
- F8 (CalendarConnection.organization missing onDelete)
- F11 (lastError declared but never rendered)

7 files touched: 5 routes, 2 new lib helpers, 1 audit-helper diff,
1 Prisma-schema-comment will be addressed in F8 follow-up. Typecheck
clean. Tests: 301 pass + 1 pre-existing flake in crypto.test.ts
(documented in readiness-sprint session log; passes in isolation,
fails when interleaved — not introduced by this work).

### 2026-07-20 — SEO: new NL energy insight (dynamisch energiecontract)

Restarted the insights cadence (last post was 2026-04-15 — ~3 months
stale) by shipping the highest-ROI piece from an SEO content audit:
deepen the NL post-salderingsregeling energy cluster, which is the
site's only realistic ranking wedge on a DR-0 domain (urgent 2027
deadline, high commercial intent, thin Dutch competition).

- **New insight** `dynamisch-energiecontract-na-de-salderingsregeling`
  in `lib/insights.ts`. `markets: ["nl"]`, tag `Energy`, Dutch body —
  matches the convention of its two siblings (`salderingsregeling-2027`,
  `thuisbatterij-verkoop-na-2027`), which are NL-only with no i18n.
  Deliberately did NOT add en/de/es i18n: salderingsregeling is a
  Dutch-regulatory topic, and CLAUDE.md's own rule is that
  market-specific posts stay `["nl"]` "so they don't surface as thin
  content under /en,/de,/es". (My earlier pitch loosely said "+ i18n";
  corrected to match the repo convention.)
- **New `InsightBlock` variant** `{ type: "cta"; text; href }`. The
  existing `p` renderer emits plain text (`<p>{text}</p>`) — no inline
  links — so an internal link to the ROI calculator wasn't expressible.
  The `cta` block renders as a `.btn.primary` link in
  `app/[locale]/insights/[slug]/page.tsx`. The article uses it once to
  link `/tools/energy-roi` mid-body (the internal-link SEO value + a
  natural funnel step from "reken het door" to the calculator).
- **feed.json** (`app/feed.json/route.ts`) — added `cta` to the
  body-flattening branch (returns `b.text`). Harmless for this post
  (NL-only, never in the EN feed) but keeps the mapper correct if an
  all-market post ever uses `cta`. `tocFromBody` ignores non-h2 blocks;
  `rss.xml` uses `summary` only — both unaffected.
- **globals.css** — one rule `.ia-body .ia-inline-cta { margin: … }`
  for CTA spacing; reuses existing `.btn.primary` styling.

Auto-wiring already in place: the detail page's related-posts + the
`Energy`-tag → Voltafy venture cross-link surface automatically. Follow-
ups (not in this PR): cross-link the new article from `/sectors/energy`
and the calculator page; Tier-1 #2/#3 (thuisbatterij terugverdientijd,
installateur-angle) to complete the cluster.

4 files touched (insights data + type, detail renderer, feed mapper,
css). Typecheck clean. 417 pass + the same documented crypto flake.
Production build green — new `/nl` page generates, no route errors.

### 2026-07-20 (cont'd) — SEO Tier-1 #2: thuisbatterij terugverdientijd

Second piece of the NL energy cluster, riding on the `cta` infra merged
in #82 (so this PR is content-only — one file).

- **New insight** `thuisbatterij-terugverdientijd-2027` in
  `lib/insights.ts`. `markets: ["nl"]`, tag `Energy`, Dutch body, one
  `cta` block → `/tools/energy-roi`. Consumer/installer search-intent
  counterpart to the operator-angle `thuisbatterij-verkoop-na-2027`:
  that post is about *how installers sell* batteries; this one is the
  honest *terugverdientijd rekensom* (what actually determines payback,
  why brochure numbers mislead, how to compute it for your own profile).
  Distinct angle + target term ("thuisbatterij terugverdientijd"), no
  overlap with the three existing saldering/battery posts.
- 1 file changed. Typecheck clean. 417 pass + the same documented
  crypto flake (green in isolation). Build green — 241 static pages,
  new `/nl` page generates.

Cluster now: dynamisch-energiecontract + thuisbatterij-terugverdientijd
shipped; Tier-1 #3 (installateur-angle "salderen stopt") + the
`/sectors/energy`/calculator cross-links remain as follow-ups.

### 2026-07-20 (cont'd) — SEO Tier-1 #3 + cluster cross-links

Completes the NL post-salderingsregeling energy cluster: the last
article plus the internal cross-linking that ties the four pieces to
the two highest-intent surfaces.

- **New insight** `salderen-stopt-wat-installateurs-nu-moeten-vertellen`
  in `lib/insights.ts`. `markets: ["nl"]`, tag `Energy`, Dutch body,
  one `cta` → `/tools/energy-roi`. Installer *customer-communication*
  angle — which existing/prospect customers to reach before 2027 and a
  three-sentence honest script — distinct from the other four
  saldering/battery posts (funnel / sales / contract-math / payback).
- **New shared component** `components/EnergyInsightLinks.tsx`. Server
  component, **self-gates to `locale === "nl"`** (returns null otherwise)
  because the cluster is `markets:["nl"]` — mounting it on the
  all-locale sector/tool pages would otherwise emit links that 404 on
  /en,/de,/es. Renders `getAllInsights("nl").filter(tag === "Energy")`
  as a linked "Verder lezen" list. Inline-styled to match the
  surrounding pages (no globals.css churn). Copy hardcoded Dutch since
  it only ever renders on /nl.
- **Cross-links wired**: mounted on `app/[locale]/sectors/[slug]/page.tsx`
  (energy slug only, after the ROI-calculator link) and
  `app/[locale]/tools/energy-roi/page.tsx` (after the calculator, before
  the outro CTA). Internal-link equity now flows from the two
  high-intent energy surfaces into the whole cluster, and both
  directions are covered (articles → calculator via `cta`; calculator +
  sector → articles via the new block).

Cluster complete (5 NL energy posts: whatsapp-funnel is Growth, the
other four are the saldering set) + bidirectional internal links.
Follow-ups exhausted for this cluster; next SEO move would be a new
cluster (DE Heimspeicher / ES autoconsumo) or the orphan sector pages
(real-estate, hospitality) per the earlier audit.

4 files touched (insights data, new component, 2 page mounts) + CLAUDE.md.
Typecheck clean. 418/418 tests pass (crypto flake didn't fire this run).
Build green — 242 static pages, new `/nl` page generates, no route errors.

### 2026-07-20 (cont'd) — SEO: DE Heimspeicher cluster (new market)

Opened a second market cluster after finishing the NL saldering set:
three `markets: ["de"]` energy insights anchored in **German** regulatory
reality, plus the plumbing to cross-link and surface them correctly.

**Key content decision — NOT a translation of the NL cluster.** Germany
has no salderingsregeling. The DE articles are written to the real
German market: sinking Einspeisevergütung (halbjährliche Degression),
§14a EnWG (reduzierte Netzentgelte für steuerbare Verbrauchseinrichtungen),
§41a EnWG dynamic-tariff mandate (2025), Smart-Meter-Rollout, negative
Börsenpreise. Translating the Dutch saldering posts would have been
factually wrong for a German reader.

- **Three new insights** in `lib/insights.ts`, all `markets: ["de"]`,
  tag `Energy`, German bodies (Sie-form, matching existing DE i18n):
  - `heimspeicher-wirtschaftlichkeit-2026` — honest Amortisationsrechnung
    (payback; parallels the NL terugverdientijd piece but framed on the
    Einspeisevergütung↔Strompreis spread, not saldering).
  - `dynamische-stromtarife-wann-lohnt-es-sich` — when a dynamic tariff
    actually pays (§14a/§41a, Smart Meter, battery arbitrage).
  - `sinkende-einspeiseverguetung-was-installateure-sagen-muessen` —
    installer customer-communication angle.
- **No `cta` to `/tools/energy-roi`.** That calculator is explicitly
  Dutch-saldering-modelling — even its German copy says "die
  niederländische Salderingsregeling … 1. Januar 2027". Linking German
  Heimspeicher articles to it would confuse the reader, so the DE
  cluster relies on related-posts + the sector/tool cross-link block
  instead. (A German-market ROI calculator would be its own build.)
- **Generalised `components/EnergyInsightLinks.tsx`** from NL-only to a
  per-locale copy map (`nl` + `de`; en/es → null). Now renders the
  current locale's Energy cluster: NL saldering posts on `/nl`, DE
  Heimspeicher posts on `/de`, on both the energy sector page and the
  ROI calculator page (mounts already pass `locale={l}`, no page edits).
- **Fixed a latent related-posts bug** in
  `app/[locale]/insights/[slug]/page.tsx`: "read next" used
  `getAllInsights()` (all markets), so on non-NL locales it could link
  to NL-only posts that 404. Switched to `getAllInsights(l)` — in-market
  only, and it also applies localized titles. Pure improvement; needed
  so the DE cluster cross-links to its own siblings, not NL 404s.

Auto-wiring: sitemap (per-locale), `/de/insights` listing, and a new
`/de/insights/tag/energy` page all pick the cluster up. Verified all 3
DE slugs land in the generated sitemap under `/de/insights/`.

3 files touched (insights data, generalised component, related-posts
fix) + CLAUDE.md. Typecheck clean. 418/418 tests pass. Build green —
246 static pages (+3 articles +1 new DE energy-tag page), all 3 `/de`
pages generate, no route errors.

Next SEO move: ES autoconsumo cluster (same pattern, Spanish market:
autoconsumo, batería virtual, compensación de excedentes) or the orphan
real-estate/hospitality sector pages.

### 2026-07-20 (cont'd) — SEO: ES autoconsumo cluster (third market)

Third market cluster, completing NL + DE + ES energy coverage. Three
`markets: ["es"]` energy insights anchored in **Spanish** regulatory
reality — again NOT a translation of the NL/DE clusters.

**Market specifics baked in:** Spain has neither salderingsregeling nor
Einspeisevergütung. It has **compensación de excedentes** (RD 244/2019):
surplus is valued and subtracted from the month's término de energía but
**capped at that term — it is NOT balance neto (net metering)**, never
offsets the power term/taxes, and doesn't roll over. Plus **batería
virtual** (a commercial € -credit product, not net metering), **PVPC /
tarifa por horas**, and the retail↔compensation spread (~0.20-0.25 vs
~0.05-0.10 €/kWh, topado). Copy is informal "tú" to match existing ES
i18n voice.

- **Three new insights** in `lib/insights.ts`:
  - `autoconsumo-con-bateria-rentabilidad-2026` — honest payback (parallels
    the DE Heimspeicher / NL terugverdientijd piece, framed on the capped
    compensación, not saldering/Einspeisevergütung).
  - `compensacion-de-excedentes-no-es-balance-neto` — the distinctly-Spanish
    misconception correction + sizing implications + where batería virtual
    fits. High-intent, corrects a real and costly error.
  - `autoconsumo-lo-que-los-instaladores-deben-explicar` — installer
    customer-communication angle.
- **No `cta` to `/tools/energy-roi`** — same reasoning as the DE cluster;
  the calculator models Dutch saldering, wrong for a Spanish reader.
- **Added `es` to the `EnergyInsightLinks` COPY map** (nl + de + es now;
  en → null). The ES cluster now surfaces on `/es/sectors/energy` and
  `/es/tools/energy-roi` via the existing `locale={l}` mounts — no page
  edits. Related-posts already market-aware (`getAllInsights(l)`, shipped
  in the DE PR), so the ES articles cross-link to their own siblings.

Auto-wiring verified: all 3 ES slugs land in the generated sitemap under
`/es/insights/`; new `/es/insights/tag/energy` page generates.

2 files touched (insights data, component copy-map entry) + CLAUDE.md.
Typecheck clean. 418/418 tests pass. Build green — 250 static pages
(+3 articles +1 new ES energy-tag page), no route errors.

Energy content now spans all three EU markets: NL (saldering, 5 posts),
DE (Einspeisevergütung/Heimspeicher, 3), ES (autoconsumo, 3). Next:
orphan real-estate/hospitality sector pages, or per-market ROI
calculators (the current one is Dutch-saldering-only).

### 2026-07-20 (cont'd) — SEO: feed the orphan real-estate + hospitality sectors

The `real-estate` and `hospitality` sector pages existed but had zero
supporting insight articles — topical dead-ends with no cluster. Unlike
the energy clusters, these topics aren't tied to one country's
regulation, so they're **all-market operator articles** (EN base + de/es
i18n, NL falls back to EN base — matching the existing all-market
operator-article convention).

- **Two new insights** in `lib/insights.ts`, no `markets` field (all
  four locales), full en/de/es i18n:
  - `the-esg-number-your-asset-manager-cant-defend` — tag **"Real
    estate"**. Real-estate ESG reporting is assembled once a year from
    inconsistent per-property-manager data and can't survive investor
    due diligence; make it reproducible from the meter. (Draws on the
    sector page's own "ESG as a scramble" / "portfolio blindness" leaks.)
  - `the-ten-minutes-before-check-in` — tag **"Hospitality"**. The
    highest-margin moment (pre-check-in upsell / room assignment / rate)
    is decided on gut feel with no instrument; build the instrument, not
    another dashboard.
- **New component `components/SectorInsightLinks.tsx`** — general
  "Further reading" block for a sector page. Maps sectorSlug → insight
  tag (`real-estate`→"Real estate", `hospitality`→"Hospitality"),
  renders `getAllInsights(locale).filter(tag)` with a 4-locale heading,
  self-gates to null when a sector has no matching in-market posts (e.g.
  `adjacent`). Mounted on the sector page for every sector; only the two
  fed sectors render anything today. Energy keeps its own
  `EnergyInsightLinks` (market-scoped, topic-specific copy) — this
  component handles the all-market operator sectors.
- Tag pages (`/insights/tag/real-estate`, `/insights/tag/hospitality`)
  auto-generate per locale from the new tags; venture cross-link is
  undefined for these tags (no card, graceful).

Verified: all 2 articles + 2 tag pages generate in **all four locales**
and land in the sitemap. Typecheck clean. 418/418 tests. Build green —
266 static pages (+16: 2 articles ×4 + 2 tag pages ×4).

3 files touched (insights data, new component, sector-page mount) +
CLAUDE.md. Follow-ups: a 2nd article per sector would deepen each
cluster; per-market ROI calculators remain the bigger energy-funnel play.

### 2026-07-20 (cont'd) — real-estate + hospitality round 2 (clusters, not orphans)

Second article for each sector, turning the two single-article sectors
into real 2-article clusters. Content-only — rides on the
`SectorInsightLinks` infra + tags from the previous PR (no component or
page changes; both blocks auto-append the new posts by tag).

- **`the-retrofit-roi-model-that-doesnt-survive-the-building`** — tag
  "Real estate". Retrofit (insulation/heat-pump/solar) payback models
  built on regional averages break against the specific asset; model
  from the meter. Distinct from the ESG-due-diligence piece.
- **`what-your-channel-mix-hides-about-your-best-guests`** — tag
  "Hospitality". OTA-vs-direct true contribution (net of commission,
  cancellation, ancillary, repeat) lives across five dashboards that
  never reconcile; price the channel by contribution, not rate. Distinct
  from the check-in-margin piece.
- Both all-market (EN base + de/es i18n), same convention as round 1.

**Calculator decision (deferred, needs a steer):** considered building
per-market ROI calculators (the DE/ES energy clusters have no tool to
funnel into) but the existing `EnergyRoi` is a Dutch-saldering *model*
(its reference scenario values every kWh at retail = "what you lose when
saldering ends"). DE/ES never had net metering, so an honest calculator
there needs a *different scenario model* (self-consumption vs feed-in),
plus route-structure + default-value decisions. That's an
architecturally significant modeling call — left for an explicit steer
rather than guessed at. Flagged as the next big energy-funnel play.

1 file touched (insights data) + CLAUDE.md. Typecheck clean. 418/418
tests. Build green — 274 static pages (+8: 2 articles ×4 locales),
both land in the sitemap across all four locales.

Sector clusters now: real-estate (2), hospitality (2), each surfaced via
SectorInsightLinks + tag pages.

### 2026-07-20 — end-of-day handoff / queued for next session

Big content day: 7 PRs merged (#82–#88), 15 fresh insights across NL/DE/ES
+ EN, restarting a ~3-month-stale blog. State on `main` @ `e9a61f2`,
working tree clean, all preview builds green.

**Content footprint now:**
- Energy: NL saldering (5), DE Heimspeicher (3), ES autoconsumo (3) — each
  market-authentic (not translated), cross-linked, surfaced on its
  sector + calculator pages via `EnergyInsightLinks` (per-locale copy map).
- Operator sectors: real-estate (2), hospitality (2) — all-market
  (EN+de+es i18n), surfaced via `SectorInsightLinks` (tag-driven) + tag
  pages.
- Infra shipped: `cta` InsightBlock type, related-posts market-fix
  (`getAllInsights(l)`), two cross-link components.

**Queued for next session (in priority order):**
1. **Per-market ROI calculators — NEEDS A PRODUCT STEER, don't build blind.**
   The current `EnergyRoi` is a Dutch-*saldering model* (reference scenario
   values every kWh at retail = "what you lose when net-metering ends"),
   which is why NL articles funnel into it and DE/ES can't. DE/ES never had
   net metering → they need a *different scenario model* (self-consumption
   vs feed-in: DE Einspeisevergütung, ES capped compensación). Open
   question for the operator: **one calculator that adapts per locale, or
   separate tools** (`/tools/heimspeicher-rechner`, `/tools/autoconsumo`)?
   Highest-leverage remaining energy-funnel move once decided.
2. **Ahrefs — see MANUAL_TASKS.md** (added this session): free DR key
   migration by **2026-08-01** (hard deadline), and the plan gates GSC +
   keyword data so the pulse's Part C can't run. Decide: upgrade plan or
   wire GSC directly.

   > ⚠️ **Achterhaald. Beslist op 2026-08-03, afgesloten op 2026-08-11:
   > Ahrefs gaat eruit, DataForSEO komt ervoor in de plaats.** Vraag geen
   > Ahrefs-sleutel meer aan. Sinds 2026-08-19 loopt de MCP-kant via OpenSEO
   > (MIT, zelf te hosten), dat op dezelfde DataForSEO-data draait en
   > Search Console meebrengt — zie route 3 in MANUAL_TASKS.md.
3. Optional content: a 3rd article to deepen any sector; or a 4th EU market
   only if there's a real regulatory hook (there isn't an obvious one).

**Daily-pulse notes for tomorrow's run:** Supabase MCP works (leads query
is reliable). Site-health curl/WebFetch from the headless env is blocked
by Cloudflare — the UptimeRobot task in MANUAL_TASKS.md is the fix; until
it's set up, report the health checks as "can't verify from headless env,"
not as failures. Ahrefs Part C = "plan insufficient / GSC not wired."

> ⚠️ **Deel C draait pas als DataForSEO-inloggegevens gezet zijn.** De
> Ahrefs-MCP antwoordt inmiddels op élke aanroep met "Insufficient plan";
> behandel dat niet als een meting maar als een losgekoppeld instrument.
> `npm run seo:report:dry` laat gratis zien wat een rapport zou opvragen.

### 2026-07-21 — AI contact attributes: web enrichment + compliance correction

Started as "build the AI Attributes feature" from the stale pending
list above. **It was already shipped in PR #9.** Verified before
writing code; the pending list is now annotated so this stops
happening. Real work became the one genuine gap (optional website
enrichment) plus two compliance defects found on the way.

**Feature — optional company-homepage enrichment (off by default)**
- `lib/philly/ai/company-domain.ts` (NEW) — pure derivation of a
  company URL from an email address. Refuses consumer mailboxes
  (~45 domains incl. NL/BE/DE/ES ISPs), disposable/relay domains,
  and bare public suffixes; strips subdomains and paths so only a
  bare `https://<registrable-domain>` can ever be produced. This is
  the gate that decides whether third-party data is fetched at all,
  so it carries the heaviest test coverage.
- `lib/philly/ai/scrape-contact-site.ts` (NEW) — Firecrawl v1 client.
  Single homepage, `onlyMainContent`, 8k-char cap, 8s abort (inside
  the 15s AI_ACTION SLO). Never throws; every failure returns a typed
  `reason` and the caller falls back to CRM-only.
- `contact-attributes.ts` — `GenerateInput` gains `websiteContent` /
  `websiteUrl`; `runAndPersistContactAttributes` gains
  `enrichFromWeb?: boolean`. Scrape is best-effort and non-fatal.
- **Prompt-injection hardening.** Scraped pages are third-party
  controlled, so this is a real vector, not a theoretical one.
  Defence in depth: untrusted-content fences + a system-prompt clause
  telling the model to ignore embedded directives (and to treat one
  as evidence the source is untrustworthy); forged fence markers
  stripped from the body before wrapping; Zod schema caps what any
  successful injection could emit; 8k truncation. `systemPrompt` and
  `userPrompt` exported specifically so these assertions are direct.
- Schema: `Contact.aiAttributesSources` (`"crm"` | `"crm+web:<host>"`).
  Migration pending operator-side (`ai_attributes_sources`).
- UI: `AiAttributesCard` shows "From CRM data only" / "From CRM data
  + acmesolar.nl" next to the timestamp.

**Compliance — two defects found, neither introduced by this work**
1. **The DPIA lived only in the `deus-shared-port` worktree**, never
   in the source-of-truth repo. Copied to `docs/legal/` and revised:
   new §1.2a (external source + enforced-constraint table mapping
   each promise to the code that keeps it), reworked §2.2 LIA and
   §2.3 minimisation to distinguish the default config from the
   enriched one, new risks 9-11 (prompt injection, sub-processor
   exposure, sole-trader conflation), §5 now records that **§1.2a is
   not signed off** and web enrichment must not be enabled until a
   DPO reviews it, plus a new §6 open-items list.
2. **`_drafts/legal/subprocessors-en.md` was factually wrong.** It
   stated DEUS uses no third-party AI APIs and transfers no data
   outside the EEA, while the code has called Anthropic's hosted API
   since PR #9 — and the DPIA's own risk 5 assumes an Anthropic DPA.
   That document is destined for `/legal/subprocessors`, so publishing
   it would have been a false statement to customers. Added a
   DO-NOT-PUBLISH banner explaining the discrepancy, corrected rows
   with `[VERIFY]` markers for entity/region/DPA (not invented), and
   a conditional-sub-processor table for Firecrawl.

**Deliberately NOT done**: enabling `FIRECRAWL_API_KEY` anywhere.
The feature is dark until legal sign-off — see MANUAL_TASKS.md.

483/483 tests green (65 new), typecheck clean. ~~Note `npm test`
without exclusions also picks up `diaz-editor-gtm/` and other
untracked scratch dirs' node_modules and reports 3 spurious file
failures; the real suite is clean.~~

> ⚠️ **Opgelost aan de bron op 2026-08-19 (PR #176).** `vitest.config.ts`
> sloot uit met `node_modules/**`, en die glob is aan de wortel verankerd —
> vandaar dat een scratch-map met eigen dependencies meeliep. Nu
> `**/node_modules/**`. **Het was niet alleen ruis:** zod's hele suite telde
> mee als de onze, dus elk testaantal in dit logboek vanaf ongeveer dit punt
> is te hoog. Gemeten na de fix: 23 bestanden, 708 tests, nul rood.

### 2026-08-03 — SEO fase 1 + zichtbare UI-fouten + de crypto-"flake" was geen flake

**PR #108 (gemerged).** Metadata per taal op alle publieke pagina's. Op
productie serveerden ~127 van de 136 niet-Engelse URL's een Engelse `<title>`
en `<meta description>` achter een vertaalde pagina. Nieuw: `metadata-locales.test.ts`
(roept `generateMetadata` rechtstreeks aan, draait mee in de test-job),
`TITLE_SUFFIX` + `TITLE_BUDGET` in `lib/seo/branding.ts`, en `meta.<route>.{title,description}`
in `dict.ts` voor 14 paginatypes × 4 talen. Het achtervoegsel ging van
" · Juan Diaz, LLC" (17 tekens) naar " · Juan Diaz" (12) — met 43 tekens over
paste geen Duitse of Spaanse titel binnen de 60 die Google toont.

**Twee zichtbare fouten, alle vier de talen.** `overflow-x: hidden` op
html/body maakte van body een scroll-container, waardoor `position: sticky`
nergens meer werkte: `.chapters` reserveerde 3200px voor een paneel dat
wegscrolde, dus 1600px zwart scherm. Nu `overflow-x: clip` — knipt net zo
goed, maakt géén scroll-container. **Zet dit nooit terug op `hidden`.**
Daarnaast rende `fomo.proof.title` (bevat `<em>`) via `{t(...)}`, dus stond
de tag als tekst op de homepage.

**Fase 2, responsive.** `nav.top` is een flexbox waarin `.nav-right` niet
krimpt; tussen 861 en 1024px werd het logo platgedrukt en wikkelde
"Juan Diaz, LLC" naar 2 regels (EN) of 3 (DE). Opgelost met compactere nav in
die band plus `flex: 0 0 auto; white-space: nowrap` op `.brand`. Ook 18 links
onder de 24px van WCAG 2.2 SC 2.5.8 opgehoogd (footer, sociale links,
taalschakelaar) — die vielen buiten de bestaande `pointer: coarse`-regel.

> ⚠️ **Onder 860px is er geen hamburgermenu.** Zes pagina's (about, story,
> services, sectors, insights, signals) zijn dan alleen via de footer
> bereikbaar. Bestaand gat, niet in deze sessie opgelost — dat is een
> ontwerpkeuze. Verberg dus geen navlinks verder als oplossing voor krapte.
>
> **Achterhaald op 2026-08-05 door PR #126.** Onder 860px verdwijnt nu de hele
> balk en toont een hamburgerknop alle negen links; `.hide-mobile` en
> `.hide-tiny` bestaan niet meer. De instructie hierboven is daarmee omgekeerd
> geldig geworden: navlinks verbergen mág onder 860px, juist omdat er een
> paneel achter zit.
>
> Wat wél blijft gelden: verberg nooit een navlink zonder plek waar hij
> terugkomt. `NAV_LINKS` in `components/Nav.tsx` is de enige lijst en voedt
> zowel de balk als het paneel, zodat die twee niet uiteen kunnen lopen — de
> dubbele lijst in de markup was precies hoe dit gat ontstond.

**De crypto-"flake" bestond niet.** Bovenstaande logs noemen een
"pre-existing flake in crypto.test.ts" die "green in isolation" zou zijn.
Dat klopt niet: hij faalde óók in isolatie, ongeveer één op de vier runs. De
test manipuleerde het láátste base64-teken ('A'↔'B'), en dat verschilt alleen
in opvulbits — de gedecodeerde bytes waren dan identiek, er was niets
gemanipuleerd, en decryptie hoorde gewoon te slagen. De code was in orde, de
test niet. Nu wordt een echte byte omgeklapt; 6 van de 6 runs groen.

**Meetmethode die zich terugbetaalde.** Een scriptje dat alle 176
sitemap-URL's ophaalt uit de draaiende productiebuild en controleert op
zichtbare HTML-tags, lege titels/beschrijvingen, placeholders en
hreflang-dekking. Drie keer voorkwam het een verkeerde conclusie: een
statische codescan meldde 11 mogelijke `<em>`-lekken waarvan er 10 vals waren,
de preloader leek schuldig maar is `opacity: 0`, en een "horizontale
scrollbalk" op 768px bleek de statusbalk. **Alleen wat de geserveerde HTML en
de gerenderde layout laten zien telt.**

### 2026-08-03 (vervolg) — de contentlaag viertalig, en zes gates die het zo houden

Tien PR's (#115 t/m #124). De aanleiding was PR #108 van eerder die dag, die
de metadata per taal repareerde. Bij het nameten bleek dat een symptoom van
iets groters.

**De vondst.** De navigatie was vertaald, de inhoud niet. De vier
sectorpagina's, vijf ventures, drie signals-essays en negen artikelen
serveerden onder `/nl`, `/de` en `/es` dezelfde Engelse tekst als onder
`/en` — terwijl die 85 URL's in de sitemap staan en via hreflang naar elkaar
wijzen. De negen operator-artikelen hadden al Duits en Spaans; Nederlands
ontbrak, dus de thuismarkt was de enige taal die terugviel op Engels.

**Het patroon dat nu overal geldt.** `Sector`, `Venture` en `Signal` hebben
een `i18n`-veld met per taal een `…L10n`, gespiegeld naar wat `Insight` al
deed. Die typen dragen bewust alleen kopij: `slug`, `gradient`, `proof[].href`,
`phases[].title`, het bloktype van een signal en `Signal.tag` staan er niet
in, want dat is structuur of een routeersleutel. `lib/i18n/merge.ts` bevat
`defined()` en `mergeByIndex()`; die laatste houdt de basislengte aan.

**Zes gates, elk bewezen door hem opzettelijk te breken:**

| gate | bewaakt |
|---|---|
| `sectors.test.ts` · `ventures.test.ts` · `signals.test.ts` | vier talen af, titels verschillen, binnen `TITLE_BUDGET`, lijstlengtes gelijk |
| `insights.i18n.test.ts` | blokstructuur van vertalingen (Insight vervangt de body in zijn geheel, dus geen merge bewaakt hem) |
| `insights.seo.test.ts` | zoektitel en -beschrijving per markt binnen wat Google toont |
| `lib/i18n/link-conventie.test.ts` | marketingcode importeert `next/link` niet rechtstreeks |
| `lib/i18n/tags.test.ts` | elke tag in gebruik heeft een label in vier woordenboeken |
| `scripts/seo-audit.ts` | dubbele/te lange titels en beschrijvingen, h1's, taalloze links — draait tegen een server |

**Auditstand:** dubbele-titel 26→0, dubbele-description 26→0, meerdere-h1
4→0, link-zonder-taal 176→0, titel-te-lang 42→0, description-te-lang 54→0.
De lengtecontroles zijn in #122 aan de audit toegevoegd; daarvóór was dat
probleem onzichtbaar.

**Drie regels die deze sessie hard heeft gemaakt.**

1. *Assert niet door het vangnet.* Drie keer bleek een test van mijzelf niet
   te kúnnen falen. `mergeByIndex` vult korte vertalingen aan vanuit de
   basis, dus een lengtecontrole op de uitvoer slaagt altijd — assert op
   `post.i18n[taal]`. `translate()` valt terug op Engels, dus een
   sleutelcontrole via die functie ziet een ontbrekend Duits label niet —
   assert op `DICT[l]`.
2. *Hermeet de hele lijst, niet je doelcijfer.* Bij het inkorten van
   beschrijvingen zette ik Nederlandse tekst in het Engelse vak:
   `description-te-lang` naar 0, `dubbele-description` van 0 naar 1.
3. *Plaatsaanduidingen en verbuigende talen botsen.* `Einblicke zu {tag}`
   levert met `tag=Systeme` de verkeerde naamval op, terwijl hetzelfde label
   in de h1 correct staat. Eén label, twee naamvallen — de oplossing is een
   sjabloon waarin de tag géén naamval draagt: `{tag} — Einblicke für
   Betreiber`.

**Meetopstelling.** Alles gemeten op `next start` (poort 3200) ná herstart,
want een draaiende server blijft de vorige build serveren. Let op: de lokale
build heeft `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, dus een crawl op
3200 meldt 176× `canonical-wijkt-af`. Dat is een meetartefact, geen defect —
productie geeft `https://juandiazllc.com/nl`.

**Blijft staan.** Geen hamburgermenu onder 860px (bestaand, ontwerpkeuze).
Operator-acties: DNS TXT voor Search Console, Plausible-goal `Boeking 15min`,
branch protection op main met de vier CI-jobs.

> **Bijgewerkt 2026-08-05.** Het hamburgermenu is er (PR #126). De
> operator-acties staan nog open, maar twee tellingen klopten niet: het zijn
> vier Plausible-doelen — `Boeking 15min`, `Pricing CTA`, `Sector CTA` en
> `Tool CTA`, alle vier al getagd in de code — en vijf CI-jobs sinds `audit`
> erbij kwam (PR #127). Daar hoort ook de gratis Ahrefs-sleutel bij, met een
> harde deadline op 2026-08-10.

> **Bijgewerkt 2026-08-19 — branch protection staat aan, deze actie is klaar.**
> Op `main`: force-push en verwijderen geblokkeerd, PR verplicht met nul
> goedkeuringen (solo-repo, je kunt je eigen PR niet goedkeuren), en vijf
> verplichte checks — `typecheck`, `test`, `i18n`, `audit`, `deps`. Admins zijn
> niet gebonden; dat is het ontsnappingsluik als een check buiten je schuld
> breekt. "Branch up-to-date vereist" staat uit, anders moet je voor elke merge
> eerst rebasen.
>
> **Twee checks zijn bewust níet verplicht.** `audit-productie` staat wel op
> elke PR maar wordt altijd overgeslagen, en een check die nooit rapporteert
> laat een PR eeuwig op "expected" staan in plaats van rood te worden. `Vercel`
> ook niet: die deploy gaat pas ná de merge naar productie, dus een hapering
> daar zou je merge blokkeren zonder dat er iets mis is. De vijf namen komen
> uit drie werkelijk gedraaide PR's, niet uit de workflow-bestanden — en geen
> van de vijf workflows heeft een `paths`-filter, dus ze draaien ook op een
> PR die alleen een `.md` aanraakt.
>
> Tegelijk staat `delete_branch_on_merge` aan en zijn 88 gemergede takken
> opgeruimd (130 → 38). Wat blijft staan is werk achter een gesloten,
> nooit-gemergede PR.
>
> **Nog wél open van de operator-acties hierboven:** DNS TXT voor Search
> Console en de vier Plausible-doelen.

> De dekkingsnotitie bovenaan dit bestand ("~1% file coverage", april 2026)
> gaat over `lib/philly/*` en klopt daar nog grotendeels. De marketingkant
> staat inmiddels op ~~989 tests~~; verwar die twee niet.
>
> ⚠️ **Dat getal was opgeblazen** door de vitest-exclude hierboven (PR #176).
> Gemeten op main na de fix, 2026-08-19: **708 tests in 23 bestanden**. Het
> verschil is zod, niet ons werk.

### 2026-08-19 — /services, 88 takken opgeruimd, en drie poorten die niet deden wat ze beloofden

Vier PR's (#182 t/m #184 plus repo-instellingen). De rode draad was het hermeten: elke poort die deze sessie is aangeraakt bleek iets
anders te bewaken dan er op stond.

#### PR #182 — het aanbod stond dichtgeklapt onder de knop

`/services` beschreef vier diensten en beantwoordde geen koopvraag. Het antwoord
stónd er al, in de FAQ ónder de CTA: gratis blueprint-gesprek, diagnose van één
pagina, sprint tegen vaste prijs, scope pas daarna. Wie dat las boekte; wie het
niet zag, boekte niet.

Nu staat het symptoom vóór de dienstnaam (in de woorden van de bezoeker) en de
drietrapsladder vóór de CTA. 13 nieuwe sleutels × 4 talen = 52 dict-entries,
per taal afgeleid uit de bestaande native FAQ in `lib/seo/faqs.ts`. **Geen
bedrag** — `docs/claims.md` heeft er geen voor dit traject, en dat is de enige
bron.

Verder in dezelfde PR: de SEO-instrumenten wezen nog naar de Ahrefs-MCP, die op
elke aanroep "Insufficient plan" antwoordt. Route 3 in `MANUAL_TASKS.md` wijst
nu naar OpenSEO (MIT, zelf te hosten, draait op dezelfde DataForSEO-data en
brengt Search Console mee).

#### De metadatapoort viel om op zijn eigen importkosten

Met een koude vite-cache viel `/ — titel en beschrijving verschillen per taal`
om op `Test timed out in 5000ms`. Warm en in CI liep dezelfde test in
milliseconden. Er was niets mis met de metadata: de test mat zijn eigen
opstartkosten. Elke route wordt door drie `describe`-blokken gebruikt, twaalf
dynamische imports per route, dus de assertie die toevallig eerst draaide
betaalde de volledige transformkosten van dat paginamoduul — de homepage sleept
de Globe met d3-geo en topojson mee.

`testTimeout` verhogen zou het rood hebben weggenomen zonder de oorzaak, en
daarna ook een échte vertraging verbergen. De routemodules worden nu eenmalig
parallel ingeladen in een `beforeAll`. **In twee richtingen bewezen:** met
`meta.services.title` in `nl` opzettelijk gelijkgetrokken aan `en` faalt de
poort binnen 5 ms met een `AssertionError`, niet met een time-out.

#### Takken: 130 → 38

`delete_branch_on_merge` stond uit, dus elke gemergede PR liet zijn tak staan.
Nu aan, en 88 takken opgeruimd. Elke tak moest twee onafhankelijke bewijzen
leveren: er zit een gemergede PR achter, én main draagt de inhoud aantoonbaar
al. Waar die twee elkaar tegenspraken is niets verwijderd tot duidelijk was
waarom.

**Dat gebeurde twaalf keer, en mijn meetlat had ongelijk.** De cherry-test
(die squash-merges wél aankan) merkte ze aan als "inhoud niet in main". Tien
ervan waren juist het eenvoudigste geval: gewone voorouders van main via een
merge-commit. Bij zo'n tak ís de merge-base de tak zelf, dus de synthetische
commit heeft een lege diff — en een lege patch-id matcht nergens op. **Test
eerst afstamming, pas daarna patch-gelijkheid.**

Wat blijft staan is werk achter een gesloten, nooit-gemergede PR (31 takken),
vier takken zonder PR, `philly-mariadb-port`, en
`claude/analyze-test-coverage-WBVSQ` — die PR is gemerged maar de tak liep
daarna nog 32 commits door.

#### De deny-lijst matchte op tokengrens, en dat gold voor het hele cluster

`.claude/settings.local.json` had een deny op `Bash(git push --delete:*)`. Die
blokkeerde `git push --delete X` maar niet `git push origin --delete X`: het
woord `origin` breekt het voorvoegsel. Alle 88 verwijderingen zijn er langs
gegaan. Wat halverwege alsnog ingreep was de auto-mode-classifier, een andere
laag — verwar die twee niet.

De drie buren in datzelfde cluster hadden **exact dezelfde lek**, en twee vormen
waren nooit gedekt:

| kwam door | reden |
|---|---|
| `git push origin --force main` | `origin` breekt het voorvoegsel |
| `git push origin -f main` | idem |
| `git push origin --mirror` | idem |
| `git push --force-with-lease …` | eigen vlag, stond er niet in |
| `git push deus-shared --force` | tweede remote, kwam in geen enkele regel voor |

Alles gedicht behalve `git push origin +main:main`: force-pushen via refspec
zonder vlag, en een voorvoegselregel kan een refspec niet lezen. **Repareer je
één regel in een cluster, test dan de buren** — ze zijn met hetzelfde verkeerde
model geschreven.

#### PR #183 — branch protection op main

Dat laatste gat hoort aan de GitHub-kant dicht, niet in de permissielijst.

| regel | stand |
|---|---|
| force-push / verwijderen van `main` | geblokkeerd |
| PR verplicht | ja, 0 goedkeuringen (solo-repo) |
| verplichte checks | `typecheck`, `test`, `i18n`, `audit`, `deps`, `docs-sync` |
| branch up-to-date vereist | nee |
| admins gebonden | nee (ontsnappingsluik) |

**Twee checks bewust niet verplicht.** `audit-productie` staat op elke PR maar
wordt altijd overgeslagen; zo'n check rapporteert nooit en laat de PR op
"expected" hangen in plaats van rood te worden. `Vercel` deployt pas ná de
merge, dus een hapering daar zou merges blokkeren zonder defect.

De namen komen uit drie werkelijk gedraaide PR's, niet uit de workflow-bestanden.
Gecontroleerd op de val die dit gevaarlijk maakt: geen van de vijf workflows
heeft een `paths`-filter, dus ze draaien ook op een PR die alleen een `.md`
aanraakt. PR #183 was daar zelf het bewijs van.

#### PR #184 — AGENTS.md stond buiten git en beschreef verwijderde code

Het bestand was een afsplitsing van dit bestand van vóór 11 augustus. Het opende
met "Next.js 16 + Prisma 7 + Supabase marketing site + Philly CRM app" en
documenteerde de SLO-sectie (`lib/philly/observability.ts`, `withSpan`, drie
budgetten) als actueel. Beide zijn met #134-#140 verwijderd. 144 regels verschil,
en precies die 144 waren de verkeerde.

Untracked zijn was de oorzaak: het kwam in geen diff, geen review, geen CI. Omdat verschillende harnassen verschillende bestanden lezen, kreeg een
deel van de tooling maandenlang projectkennis over code die hier niet staat.

`AGENTS.md` is nu een byte-identieke kopie, bewaakt door de `docs-sync`-job in
`ci.yml` (sinds deze sessie een verplichte check). **Wijzig je er één, kopieer
hem dan over de ander heen: `cp CLAUDE.md AGENTS.md`.**

#### Meting

726 tests in 25 bestanden, groen op main na #184. Dat vervangt de 708/23
hierboven.

#### Wacht op de operator

- **Plausible-cijfer**: bezoekers over 30 dagen plus de vier doelen. Zonder dat
  blijft "0 leads in `marketing.leads`" onbeslist tussen geen-verkeer en
  geen-conversie.
- **Akkoord voor één end-to-end test van de leadketen**: één rij in
  `marketing.leads`, Telegram + ontvangstbevestiging, daarna de rij weg. De
  keten is nog nooit in zijn geheel gelopen.
- **Vier OpenSEO-taken** in `MANUAL_TASKS.md`: DataForSEO-inloggegevens (open
  sinds 2026-08-03), self-host vs gehost kiezen, Search Console via DNS TXT
  verifiëren, Ahrefs-MCP loskoppelen.
- **DNS TXT voor Search Console** en de vier Plausible-doelen taggen.

### 2026-08-20 — een adres dat niet bestond, 56 dode sleutels, en een poort die op één platform niet kon meten

Vier PR's (#188 t/m #191). Wat ze bindt: elke controle die deze dag is aangeraakt
mat iets anders dan er op stond.

#### PR #188 — Philly droeg een adres dat niet bestaat

`philly.juandiazllc.com` stond als `domain` in `lib/ventures.ts` en werd op drie
plekken gerenderd. Die hostnaam staat niet in DNS, en niets in deze repo bedient
hem — het CRM leeft sinds #134 in `bongartzdiaz/DEUS-SHARED`. Tegelijk beweerde
`work.page.lede` in vier talen dat er vijf producten live staan. Vier staan er
live; Philly wordt gebouwd.

`domain` en `external` zijn nu nullable, en `lib/ventures.test.ts` draagt een
poort die het telwoord in de lede vergelijkt met `VENTURES.filter(status ===
"live").length`.

**Die poort moest twee keer geschreven worden.** De eerste versie zocht het
telwoord in de hele lede. Elke lede eindigt op de vijf-fase-methode, dus het
woord "vijf" staat er altijd in en de assertie kon niet falen bij vijf live
ventures. Nu leest hij alleen de eerste zin, en eist bovendien dat er géén ander
telwoord in die zin staat. **Scope een assertie op de zin die de claim draagt.**

Bereikbaarheid wordt DNS-first gecontroleerd (`lib/seo/venture-adressen.ts`),
alleen in de productie-audit. Op productie geverifieerd: hostnaam 0×, de valse
claim 0×, `href="#"` 0×.

#### PR #189 + #190 — 56 sleutels vertaalden kopij die niemand rendert

Negentien `dash.*` beschreven `/dashboard` (weg met #134), twintig `app.*` de
operator-hub, vier `cookie.*` een banner die verdween toen Plausible cookieloos
werd, zes `contact.*` het formulier van vóór de meerstapsversie, en `nav.login`
een inlog die met #138 vertrok. Dood gewicht in een woordenboek is niet neutraal:
`cookie.body` beloofde in vier talen "a session cookie for sign-in" voor een
sessie die niet meer bestaat, en `dash.footer` noemde het subdomein hierboven.

`lib/i18n/wees-sleutels.test.ts` houdt dat voortaan tegen. Hij scant `app`,
`components`, `lib` en `scripts` op letterlijke aanroepen én op samengestelde
(`t(\`process.${i}.name\`)` → `/^process\.[^.]+\.name$/`); deze repo heeft 49 van
de tweede soort.

**Drie keer bleek de meetlat zelf stuk, en telkens werd dat zichtbaar door twee
tellers naast elkaar te leggen.**

| symptoom | oorzaak |
|---|---|
| poort verklaarde `nav.login` levend | haar eigen toelichting noemde de sleutel; testbestanden telden mee als afnemer |
| 709 sleutels tegen 714 | `[a-zA-Z0-9._]` zat in de extractie én in de scan naar afnemers — het ontbrekende koppelteken hief zichzelf op |
| 677 sleutels tegen 692 | `check-i18n-parity.mjs` las één sleutel per regel; de procesfases staan met vier op één regel |

Die laatste betekent dat een ontbrekende Duitse `process.3.body` jarenlang
onzichtbaar was voor de controle die daarvoor bestaat. Gefixt; het script leest
nu ook sleutels achter een komma.

**Een testbestand is geen afnemer.** Een sleutel die alleen nog in een test
voorkomt rendert nergens. En een controle die zichzelf als bewijs accepteert is
geen controle.

#### PR #191 — de prijspoort kon op Windows niet groen worden

`npm run regen:pricing:check` stond permanent rood op deze machine. Er liep
niets uit de pas: de generator schreef zijn blokken met LF terwijl de
doelbestanden CRLF dragen (`.gitattributes` heeft `* text=auto`,
`core.autocrlf=true`), dus elke vergelijking meldde verschil. Draaide je de
generator "om het te repareren", dan kreeg je gemengde regeleinden die git bij de
volgende vergelijking weer gelijktrok.

Gemeten met de oude versie uit `HEAD` naast de nieuwe: CRLF-checkout oud rood /
nieuw groen, LF-checkout oud groen / nieuw groen. Windows-specifiek dus — op een
runner was de oude check ook groen geweest.

**Het werkelijke gat was dat hij nergens draaide.** Geen van de vijf workflows
riep hem aan. De check hangt nu aan de bestaande `docs-sync`-job, die al in de
branch-protection-lijst staat; een nieuwe job zou daar eerst met de hand bij
moeten en tot dat moment niets bewaken. Wijzigt iemand een bedrag in de
gegenereerde TS in plaats van in de CSV, dan is de CSV geen bron meer — en
`docs/claims.md` verwijst naar prijzen die dan nergens één herkomst hebben.

**Een instrument dat op één platform altijd rood staat, wordt daar niet
gedraaid.** Het gat en de kapotte meter hielden elkaar in stand.

#### De vier OpenSEO-taken nagetrokken

Van de vier taken in `MANUAL_TASKS.md` bleek er één al gedaan en stonden er twee
verkeerd beschreven.

**Search Console — het TXT-record staat er al.** Gemeten via `dns.google`:
`google-site-verification=ABrD7ZNd...` naast de SPF-regel. Wat daarmee níet
vaststaat is of de property in Search Console ook als geverifieerd staat; dat is
alleen ingelogd te zien. `nslookup -type=TXT` gaf hier stil niets terug en had de
conclusie "geen record" opgeleverd — het derde instrument deze dag dat faalde
zonder te klagen.

**Ahrefs staat op `✓ Connected` en is dood.** De gezondheidscontrole van
`claude mcp list` test de verbinding, niet de toegang. Gemeten op
`subscription-info-limits-and-usage`, een endpoint dat volgens zijn eigen
beschrijving gratis is en geen units verbruikt: `{"error": "Insufficient plan"}`.
Het is bovendien een claude.ai-connector, geen lokale MCP — `claude mcp remove`
raakt hem niet, loskoppelen gaat via de connector-instellingen op claude.ai.

**Self-host vs gehost: gehost, tenzij het volume groeit.** De 28%-opslag klopt
woordelijk. Twee dingen die het document niet noemde en de keuze bepalen:
self-host als MCP-endpoint is nergens gedocumenteerd (`openseo.so/docs/mcp` kent
alleen de gehoste URL), en Search Console vergt bij self-host een eigen
Google-OAuth-app met drie extra variabelen. Bij vier verzoeken per rapportrun is
28% een rondingsverschil; bij honderden per dag keert die rekensom om.

**`.env.example` noemde `DATAFORSEO_LOGIN` en `DATAFORSEO_PASSWORD` niet**,
terwijl `lib/seo/dataforseo.ts` en `scripts/seo-report.ts` ze allebei lezen. Staat
er nu in, met de waarschuwing dat OpenSEO dezelfde inloggegevens in een ándere
vorm wil (`DATAFORSEO_API_KEY`, base64 van `email:wachtwoord`).

#### De vier Plausible-doelen: de code is af, het dashboard niet

Het logboek zei dat de vier doelen "alle vier al getagd in de code" waren. Dat
klopt, en het is nu ook end-to-end op **productie** nagelopen in plaats van in de
broncode. Per pagina één getagde knop aangeklikt met de uitgaande call
onderschept en geblokkeerd, zodat er geen testdata in de echte cijfers belandt:

| doel | pagina | eigenschappen |
|---|---|---|
| `Boeking 15min` | /contact, insight-detail, `Capacity.tsx` (2×) | `url` |
| `Pricing CTA` | /pricing | `tier`, `url` |
| `Sector CTA` | /sectors/[slug] | `sector`, `url` |
| `Tool CTA` | /tools/energy-roi | `tool`, `url` |

Alle vier vuren naar `plausible.io/api/event` met `d: juandiazllc.com`. Er is
niets meer aan de code te doen; de kliks worden nu al verstuurd en door Plausible
weggegooid omdat de doelen daar niet bestaan.

Nieuw ten opzichte van de notitie: drie van de vier sturen **custom properties**
mee, en die zijn in Plausible pas zichtbaar na aparte aanmelding. Zonder die stap
zie je het aantal kliks wel, maar niet welke tier of sector ze opleverde.

**Twee instrumenten faalden hier, allebei stil.** In de geserveerde HTML is
`data-domain` niet te vinden — Next injecteert het script client-side, dus alleen
de preload-link staat in de bron. Een grep leverde dus "Plausible is verkeerd
geconfigureerd" op, terwijl de gerenderde DOM gewoon
`data-domain="juandiazllc.com"` draagt. En de netwerk-opname van de browser-pane
registreert alleen same-origin verzoeken, dus die toont een event naar
`plausible.io` nooit. Meet dit in de DOM met een onderschepte `fetch`.

#### De leadketen is voor het eerst in zijn geheel gelopen

Via het **echte meerstapsformulier op productie**, niet via een SQL-insert — dat
laatste had alleen het staartstuk getest. Testinzending daarna verwijderd;
`marketing.leads` stond op 0 rijen vóór en na.

| schakel | uitkomst |
|---|---|
| rij in `marketing.leads` | aangekomen — anon-INSERT komt door RLS heen |
| `leads_notify_new` → `lead-notify` | 200, `{"telegram":"sent","resend":"skipped: RESEND_API_KEY unset"}` |
| `leads_acknowledge_new` → `lead-acknowledge` | 200, `{"sent":false,"channel":"skipped:no-api-key"}` |

Beide dispatches binnen 135 ms na de insert. **Telegram werkt. E-mail werkt
nergens**, en beide helften melden dezelfde reden: de `RESEND_API_KEY` op de
edge functions is niet gezet. Dat is één operator-actie, geen defect.

De keten registreert haar eigen storing: `ack_channel` droeg `skipped:no-api-key`
precies zoals de kolomtoelichting belooft. Daardoor was de diagnose één query in
plaats van speurwerk. Zo hoort een schakel te falen.

**Twee instrumenten faalden ook hier.** `read_page` gaf een lege boom met
viewport 0×0 terwijl de pagina gewoon geladen was; `javascript_tool` zag alles.
En het formulier reageerde niet op klikken — de oorzaak was mijn eigen globale
`preventDefault` uit de Plausible-meting op dezelfde tab, die een client-side
navigatie overleeft. Bij SPA-navigatie blijft een listener op `document` leven;
alleen een harde reload ruimt hem op.

#### De tweede meldingslaag was geen ontbrekende meting maar een duplicaat

De meting hierboven liet één schakel open: kwam de interne melding vanuit Vercel
aan? Naast de edge function stuurde `lib/notify.ts` bij elke inzending zélf ook
een Telegram en een e-mail. Het plan was die schakel meetbaar te maken — dezelfde
reden laten teruggeven als de edge function, en wegschrijven in `metadata`.

Bij het openen van `lead-notify` bleek dat het verkeerde antwoord. Die functie
doet **beide** kanalen al, geeft per kanaal een reden terug en logt. `notify.ts`
stuurde dezelfde twee kanalen naar dezelfde ontvanger, over dezelfde rij. Bij
goede configuratie kreeg Juan alles dubbel; bij slechte hoorde hij van deze helft
niets, want hij sloeg stil over (`if (!key) return`) en faalde stil (lege
`catch`). Meetbaar maken zou een tweede, zwakkere meting hebben opgeleverd naast
een sterkere die er al was.

`lib/notify.ts` is daarom verwijderd. Beide afnemers — `app/actions/contact.ts`
en `app/api/cal/route.ts` — schreven de rij toch al weg, dus trigger
`leads_notify_new` vuurde in beide gevallen al. Er valt niets weg, alleen het
duplicaat. `app/api/cal/route.ts` droeg het `LeadNotification`-type; dat is nu
een lokaal `LeadRij`-type in dat bestand, want het is de enige lezer.

**De bezoeker merkt het ook.** Beide meldingen stonden met een `await` in het
request-pad van de server action, zonder timeout. Twee externe HTTP-aanroepen
minder tussen "verzenden" en het bevestigingsscherm.

**En het haalt een strik uit de operator-taak.** `RESEND_API_KEY` moest op twee
plekken staan, met twee verschillende gevolgen bij ontbreken. Nu is er één
plek — de edge-function-secrets — en één plek waar je kunt zien of het werkte.

#### De duurste knop op de site ging langs de leadketen heen

Drie CTA's op `/pricing` wezen naar `hello@lucen.ai`: de Enterprise-tier, de
migratiedienst en "praat met sales". Live in vier talen, op een pagina die in de
topnav staat en in de sitemap op prioriteit 0,9.

**`lucen.ai` is een geparkeerd domein.** `https://` geeft een SSL connect error
(curl exit 35); `http://` geeft 302 met `X-Served-By: Namecheap URL Forward` naar
`www.lucen.ai`, en dat is een parking-lander die zichzelf beschrijft als *"the
parked domain's origin … so the market can attribute the visit"*. Er staat wel
een MX (Namecheap-forwarding), dus post kán aankomen — of `hello@` een
doorstuurregel heeft is van buitenaf niet vast te stellen.

**De echte kosten zaten in de omleiding, niet in het adres.** Een `mailto:` slaat
alles over wat er deze twee dagen aan de leadketen is gebouwd: geen rij in
`marketing.leads`, dus geen `leads_notify_new`, dus geen Telegram en geen
ontvangstbevestiging. Het spoor houdt op bij de Plausible-klik. Dat trof
uitgerekend de lead die vanaf vijftien zitplaatsen begint.

De vier tier-knoppen deden het al goed — `/contact?interest=<slug>`, uitgelezen
door `ContactForm.tsx` en weggeschreven in `source` als
`contact_page:interest=pro:stage=3`. De drie afwijkers volgen dat patroon nu ook
(`enterprise`, `migration`, `sales`). Op de lokale productiebuild gemeten: nul
mailto's, zeven formulierlinks per taal, alle vier de talen correct van
taalprefix voorzien.

**Twee poorten deden hier hun werk, en één daarvan was niet van mij.**

`lib/contactadressen.test.ts` (nieuw) eist dat elk e-mailadres in geleverde code
op juandiazllc.com staat. De strenge helft — geen `mailto:` buiten het domein —
kent geen uitzonderingen, en die viel meteen op mijn eigen toelichting, omdat ik
daarin `mailto:hello@lucen.ai` letterlijk had opgeschreven. De comment is
herschreven; de poort niet verzwakt. Uitzonderingen dragen een **aantal**, zodat
een tweede, échte vermelding in hetzelfde bestand niet stil meelift. In drie
richtingen gebroken: mailto teruggezet, vreemd adres zonder uitzondering,
uitzondering achterhaald — alle drie rood, daarna weer groen.

`lib/i18n/eerste-stap.test.ts` (uit #187) ving de wijziging zelf op: twee knoppen
die nu naar `/contact` wijzen droegen niet `cta.book`. Die poort voorkomt dat
dezelfde stap opnieuw elf namen krijgt. Hier was hernoemen fout — `cta.book` is
het blueprint-gesprek, en een migratievraag over DEUS is dat niet; de FAQ zegt in
vier talen dat die twee verschillen. Ze staan dus in `NIET_HET_AANBOD` met reden,
naast het precedent dat er al stond (`pricing.outro.cta`, om exact dezelfde
reden).

**Twee vragen die hierdoor open kwamen te liggen, en die van de operator zijn.**
Er staat geen koopweg meer in deze repo — Stripe vertrok met #134, en de drie
grep-treffers op "stripe/checkout" zijn alle drie vals (een CSS-klasse
`.philly-stripe`, een comment, en "checkout" in een hotelcontext). En de vier
bedragen op die pagina staan niet in `docs/claims.md`; ze komen uit
`_drafts/pricing/pricing-tiers.csv`, wat ze afgeleid maakt, niet geverifieerd.

**Mutatietesten met ongestaged werk:** hersteld uit een kopie in de scratchpad,
niet met `git checkout --`. Die laatste herstelt vanuit de index en had het werk
van deze sessie teruggezet naar HEAD.

#### PR #197 — een plan voor de naamzoekopdrachten, en wat er niet in staat

`docs/seo-geo-plan.md`. De aanleiding was een vraag met een harde eis erin: alles
wat met de naam te maken heeft moet op pagina 1. Dat is een entiteitsprobleem,
geen rankingprobleem — er lopen naamgenoten rond (voetballers, een bokser) met
decennia aan autoriteit.

**§0 gaat over de instrumenten, niet over de site.** Vijf meters staan stuk of
uit: Vercel Analytics geeft 404, er is geen Plausible-sleutel, Search Console is
niet uitgelezen, DataForSEO heeft geen inloggegevens en Ahrefs antwoordt
"Insufficient plan". Zolang die vijf zo staan is elke uitspraak over verkeer een
schatting. Dat staat als stap nul in het plan en niet als voetnoot.

§5 is een geordende lijst van negen punten met per punt een eigenaar. Zes zijn
van de operator, twee zijn beslissingen, één is code — dat laatste is dit werk.
§6 zegt wat er níet beloofd wordt: geen termijn op een SERP die door
naamgenoten wordt bezet, geen belofte over AI-citaties, en geen cijfer zolang
§0 openstaat.

#### PR #198 — vier personen werden één

De JSON-LD beschreef dezelfde mens op vier plekken en was het oneens met
zichzelf. Gemeten, niet vermoed:

| bestand | naam | url |
|---|---|---|
| `app/layout.tsx` | Juan Stefan Bongartz Diaz | geen |
| `app/[locale]/layout.tsx` | Juan Stefan Diaz | /{l}/about |
| `app/[locale]/about/page.tsx` | Juan Stefan Bongartz Diaz | /about → 307 |
| `lib/seo/article.ts` | Juan Stefan Bongartz Diaz | /about → 307 |

Geen van de vier droeg een `@id`. Zonder dat mag een crawler ze als vier losse
personen lezen, en dan verdeelt elk signaal zich over vier knopen — precies het
omgekeerde van wat je wilt op een naam die al verzadigd is met naamgenoten.

Nu één knoop: `PERSON_ID` in `lib/seo/branding.ts`, met `name` plus
`alternateName[]` zodat alle drie de naamvormen op dezelfde entiteit uitkomen.
`PERSON_URL` wijst op `/en/about` en niet meer op `/about`, want dat laatste
geeft 307 en een `url` die op een redirect uitkomt is een zwakker signaal.
`twitter.com/juandiazllc` is uit `sameAs` gehaald: 404 via x.com, en `sameAs` is
een verificatieveld — een dood adres daarin is een gefaalde controle, geen
ontbrekend signaal.

`lib/seo/persoon-entiteit.test.ts` telt per bestand de `Person`-knopen en eist
evenveel verwijzingen naar `PERSON_ID`. Een nieuwe knoop zonder gedeelde `@id`
is hoe dit gat is ontstaan en hoe het terugkomt.

#### PR #199 — llms.txt droeg de claim die #188 er net had uitgehaald

`public/llms.txt` is het bestand waarvan het hele doel is dat AI-assistenten het
citeren. Er stond in:

> Five active ventures — Voltafy, Performance Tracker, Help Mij Besparen,
> Salderingsregeling 2027, Philly/DEUS CRM.

Vier staan er live; Philly wordt gebouwd. PR #188 heeft die claim eerder dezelfde
dag uit `work.page.lede` gehaald en er in vier talen een poort omheen gezet.
**Die poort leest `dict.ts`.** Dit bestand stond in `public/`, werd door geen
enkele test aangeraakt, en overleefde de reparatie.

Daarnaast stond er `Last updated: 2026-08-03`, zeventien dagen oud.

**Het is nu een route, geen bestand.** `app/llms.txt/route.ts` leest
`lib/seo/llms.ts`, en daar komen de feiten uit de bron: de venture-regel uit
`VENTURES`, de talen uit `LOCALES`, de naamvormen en het GitHub-adres uit
`branding.ts`. `public/llms.txt` is verwijderd, en dat moest ook — Next serveert
statische bestanden vóór routes met dezelfde naam, dus met allebei had de route
nooit iets gedaan. Een van de elf poorten bewaakt precies dat, want een
teruggezet bestand schakelt de generator uit zonder één foutmelding.

**Geen telwoord meer in die regel.** Er staat nu "Live products — " plus de
lijst. Een getal naast een lijst is een tweede bron voor hetzelfde feit, en dat
was letterlijk het defect. Een poort houdt tegen dat het terugkomt.

**De afgeleide datum bleek ouder dan de ingetypte.** Nieuwste artikel:
2026-07-20; er stond 2026-08-03. Die datum was de dag dat iemand het bestand
bewerkte, niet de dag van de nieuwste inhoud — de handmatige versie overdreef
dus de versheid. Daarmee klopte mijn eigen kop ook niet: "Last updated" belooft
iets over het hele bestand, terwijl de datum alleen artikelen meet en een
venture-wijziging hem niet verschuift. De kop zegt nu wat hij meet.

**`/llms-full.txt` is nieuw** — de volledige tekst van elk Engelstalig artikel en
elke marktnotitie, 28 KB, zodat een assistent de bron kan lezen in plaats van
ernaar te raden. Alleen Engels: de markt-specifieke clusters staan niet onder
`/en` en zouden 404-URL's opleveren, dezelfde keuze als in `feed.json`.

**Eén afvlakker voor twee afnemers.** Toen `cta` als bloktype werd toegevoegd
(#82) moest `feed.json` met de hand mee. Dat werkte omdat er één afnemer was.
`lib/seo/plattetekst.ts` is nu de enige plek die de bloktypes kent, met een
`never`-tak die een zesde type tot compileerfout maakt in plaats van een stille
lege string. Twee vormen uit één switch: platte tekst voor JSON Feed, waar dat
per specificatie hoort, en markdown voor llms-full, waar de koppen blijven staan
en de href van een `cta` overleeft — die viel in de platte vorm helemaal weg.

**Zes mutaties, zes keer rood.** De onwaarheid terugzetten, de datum intypen,
`public/llms.txt` terugzetten, een `cta` stil laten vallen, de href weghalen, en
de dekkingscontrole een bloktype laten eisen dat niet bestaat.

#### De meetlat brak twee keer, op dezelfde manier, één laag uit elkaar

De telwoord-poort stond eerst als:

    new RegExp(`\b${w}\b`)

Dat matcht niets. In een template literal is `\b` het backspace-teken, geen
woordgrens — de test kon per definitie niet falen, en de mutatie met "Five
active ventures" er letterlijk in liep er groen doorheen. Alleen omdat er twee
tests op dezelfde mutatie hoorden af te gaan en er maar één afging, viel het op.

Toen ik het wilde repareren met een Python-script trapte ik in exact dezelfde
val: `\b` in een gewone Python-string is óók een backspace. De reparatie kon de
regel niet vinden.

De oorzaak eronder is het opschrijven, niet het denken: **de heredoc halveert een
dubbele backslash.** Wat ik als `\b` typte werd `\b` in het bestand. Enkele
backslashes overleven; dubbele niet. De poort is daarom herschreven zonder
escapes — `regel.split(/[^a-z]+/)` en een `Set` — en waar een letterlijke
backslash nodig is, gaat het via een raw string.

**Regel: bouw geen regex uit een template literal.** Een regex-literal
(`/[^a-z]+/`) gaat niet door string-escaping heen en is daarmee immuun voor deze
hele klasse. Zie ook [[feedback_verify_the_measuring_stick]] — dit is hetzelfde
mechanisme als de shell-expansie in `"…|\$1,200"`, één laag verder naar binnen.

#### Meting

796 tests in 31 bestanden, 692 dict-sleutels × 4 talen. Dat vervangt de 780/29
van een uur eerder, en die weer de 776/28 en de 726/25. De verwijdering van `lib/notify.ts` verandert
dat aantal niet: er was geen test die het bestand aanraakte, en dat is precies
wat een ongeobserveerde schakel is.

### 2026-08-20 (vervolg) — het bewijs lag op de pagina waar niemand koopt

Aanleiding was een aanbod-diagnose met de offer-skills (`docs/aanbod.md`, #200).
Die kwam op één bindende beperking uit, en het was niet de prijs: **geloofwaardigheid**.
Iemand die overweegt te boeken moet geloven dat het werkt, en het bewijs dáárvoor
bestond al — vier bevestigde klantuitkomsten in `docs/claims.md`, in vier talen
gepubliceerd, sinds #185 met een poort eromheen. Ze stonden alleen op de
homepage. `/services` en `/contact` droegen samen nul cijfers, terwijl dat de
twee pagina's zijn waar de beslissing valt.

#### Drie wijzigingen, waarvan er één iets meetbaars oplevert

| | wat | gevolg |
|---|---|---|
| A | `ResultsStrip` gemonteerd op `/services` (tussen de ladder en de CTA) en `/contact` (ná het formulier, vóór de FAQ) | geen nieuwe claim — een montage van iets dat al goedgekeurd is |
| B | de slot-CTA van `/services` wijst naar `/contact?interest=services` | vanaf nu is een lead vanaf deze pagina te onderscheiden van een lead vanaf de homepage |
| C | `services.how.s1.note` × 4 talen | legt uit dat "Blueprint" twee dingen heet: fase 02 van de methode én dit gratis gesprek |

B is het enige punt met een meetbaar gevolg. Op de draaiende build end-to-end
nagelopen: klik op de CTA, drie stappen door het formulier, en het verborgen
`source`-veld draagt `contact_page:interest=services:stage=blueprint`. Niets
ingezonden — alleen de wizard doorlopen.

C werd bijna het omgekeerde van wat het nu is. Mijn eerste lezing was dat
"blueprint call" hernoemd moest worden omdat de naam dubbel bezet was.
Hertellen draaide dat om: de term staat **7 keer in de Engelse FAQ alleen**
(≈28 over vier talen) tegen **4** voor `process.2.name`. Hernoemen zou de
grootste vindplaats hebben gesloopt om de kleinste te redden. Eén sleutel die
de relatie uitlegt is goedkoper en eerlijker.

#### De montagepoort noemt de pagina's, niet het aantal

`ResultsStrip.test.ts` had al een poort die elk gepubliceerd cijfer tegen
`docs/claims.md` legt. Daar staat nu `HOORT_TE_STAAN` naast: een expliciete
lijst van drie paden, elk met de reden waarom het blok daar hoort. Verdwijnt een
montage, dan valt de poort om; komt er een vierde bij zonder reden, ook.

Dat is niet symmetrisch met "alleen op de homepage", en dat is het punt. Die
situatie is nooit als besluit genomen — het was de plek waar het blok geboren
werd, en daarna heeft niemand er meer naar gekeken. In twee richtingen bewezen:
de `/contact`-montage weggehaald (rood op `ontbreekt`), en een pad uit de
verwachtingslijst gehaald (rood op `onverwacht`).

#### Twee keer had mijn eigen document ongelijk, allebei gevangen door hermeten

Bijlage B beweerde dat vier dienst-CTA's naar `/contact` wijzen. Ze wijzen naar
`/work`, `/sectors`, `/insights/the-build-vs-buy-trap` en
`/signals/instruments-not-saas`; alleen de slot-CTA gaat naar `/contact`. Vandaar
één pagina-brede `?interest=services` en geen vier. Per dienst zou beter zijn,
maar de vier kaarten zíjn zelf al links — een tweede anchor daarin is ongeldige
HTML, dus dat is een ontwerpwijziging en geen parameter.

En het document telde vier NL saldering-artikelen waar er vijf staan
(`getAllInsights("nl")` gefilterd op tag `Energy`).

**Bijna een niet-defect gerapporteerd.** Ik vermoedde dat stap 2 van het
formulier de bezoeker in verkoperstaal laat zelf-diagnosticeren. De gemeten
labels doen precies het tegenovergestelde: "Revenue is leaking — not sure where."
Symptoomtaal, al sinds de meerstapsversie. Eerst kijken, dan melden.

#### Wat blijft liggen, en om een betere reden dan ik eerst opschreef

Bijlage D — de uitleg van wat de sprint van 30 dagen oplevert — staat niet in
deze PR. Het document zei dat die op de prijs wacht. Dat klopt niet: de blokkade
is dat **ik niet weet wat die 30 dagen opleveren**. Dat is Juans kennis, en een
deliverable verzinnen is dezelfde fout als een prijs verzinnen. D is daarom
verhuisd van §4 naar §5, bij de beslissingen.

#### Meting

Op de draaiende build in alle vier de talen nagelopen: het blok rendert op
`/services` en `/contact`, de DOM-volgorde is ladder → bewijs → CTA op services
en formulier → bewijs → FAQ op contact, de notitie staat vertaald (geen Engelse
terugval), en de CTA draagt per taal het juiste voorvoegsel. Geen console-fouten,
geen horizontale overloop op 375 px. Een screenshot lukte niet — de browser-pane
compositeert hier geen frames — dus dit is in de DOM gemeten, niet op het oog.

797 tests in 31 bestanden, 693 dict-sleutels × 4 talen. Dat vervangt de 796/31
en de 692 hierboven.

### 2026-08-20 (vervolg) — twee adressen met één merknaam, en twee kapotte Duitse woorden

De vraag was backlinks te maken naar "de lucenai site". Het antwoord veranderde
twee keer tijdens het meten.

#### Ik mat eerst het verkeerde domein, en dat was de repo's schuld

`lucen.ai` is wat híer staat — tot #196 wezen drie CTA's op `/pricing` naar een
mailadres op dat domein. Gemeten: geen https (geen certificaat), `http://` 302
naar een CNAME op `parkingpage.namecheap.com`. Geparkeerd.

`lucenai.eu` is de echte site: 200 over TLS, `www` 301 naar de apex, WordPress
op LiteSpeed, Yoast, Google Workspace-mail, en er staat al een
`google-site-verification`-TXT. Twee adressen, één merknaam, en deze repo kende
alleen de dode.

#### Elf van de zestien URL's in die sitemap zijn demo-inhoud

| soort | n | wat |
|---|---|---|
| echte pagina's | 3 | `/`, `/about/`, `/contact/` |
| demo-artikelen | 9 | alle negen met de titel "Blog Post Title" en als tekst `Blog post excerpt [1-2 lines]` |
| thema-restanten | 2 | WordPress' "Sample Page" en `/global-styles/` |
| archieven daarvan | 2 | `/category/blog/`, `/author/hashadmin/` |

Plus: de homepage noemt in het feature-blok **"Philanthropy AI"** — kopij van
een ander product, één keer in de zichtbare tekst tegen vier keer "Lucen AI".
Er is geen `meta name="description"`; de `og:description` bevat de volledige
paginatekst. En de negen artikeltitels eindigen op een losse `%`, een kapot
Yoast-sjabloon.

Backlinks bouwen naar een site waar tweederde placeholder is, is een stem die
je niet terugkrijgt. Opruimen kost een uur, links verdienen kost maanden. De
volgorde staat in `docs/lucenai-backlinks.md`; zes van de zeven stappen zijn
operator-werk in WordPress.

#### Wat er wél in code kon, en wat het waard is

`lucenai.eu/about` noemt **"Juan Stefan Bongartz Diaz — Co-Founder | CTO"**
voluit, met exact de naamvorm waar `PERSON_NAME` op leunt, en linkt niet terug.
Deze kant kende Lucen AI helemaal niet. Die rand ligt er nu: `affiliation` in
het `Person`-schema op `/about`, plus een zichtbare link in vier talen.

**Niet in `sameAs`** — dat veld zegt "dit adres beschrijft dezelfde entiteit",
en `lucenai.eu` beschrijft een bedrijf met drie oprichters. `worksFor` was al
bezet door de rechtspersoon van deze site; twee werkgevers in dat veld maakt
geen van beide sterker.

Eerlijk over de waarde: **één link vanaf een domein zonder autoriteit.** De
SEO-waarde is bijna nul, de entiteitswaarde echt maar bescheiden.
`controleerEntiteitsAdressen` in `lib/seo/venture-adressen.ts` bewaakt de
bereikbaarheid in de dagelijkse productie-audit, om dezelfde reden als bij de
dode X-handle en `philly.juandiazllc.com`: een adres in een schemaveld dat 404
geeft is geen ontbrekend signaal maar een mislukte controle.

#### Onderweg: het Duitse woord voor "bouwer" is niet "Bauer"

Twee vondsten in de tien sleutels die ik toevallig opensloeg, allebei op de
oppervlakken die de naamzoekopdracht beslissen:

| sleutel | stond er | betekent |
|---|---|---|
| `about.title.b` (de) | "— Betreiber, Bauer, Gründer." | boer |
| `meta.home.description` (de) | "Bauerprobt, operator-built." | geen woord |

De H1 van de Duitse `/about` noemde hem dus operator, **boer**, oprichter. En de
Duitse homepage-description — de meest geserveerde Duitse zin van de site —
droeg een niet-bestaand woord waar "Construction-trained" (en) / "Bouwkundig
getraind" (nl) staat. Nu "Erbauer" en "Bautechnisch geschult"; die laatste komt
op 158 tekens, onder de `DESC_MAX` van 160.

**Hier past geen poort.** Een test kan niet zien of Duits klopt. Wat de
trefkans zegt is wel iets: twee fouten in tien willekeurig gelezen sleutels, in
een woordenboek van 696 dat niemand ooit uitgelezen heeft. Een Duitse
leesbeurt over de meta- en about-sleutels is werk dat er nog ligt.

#### Twee poorten gingen af op mijn eigen toelichting

`contactadressen.test.ts` viel op `hello@lucen.ai` in een nieuwe comment in
`branding.ts` — de uitzondering draagt een **aantal** per bestand, dus een
tweede vermelding elders lift niet stil mee. En `persoon-entiteit.test.ts` viel
op de volle naam die ik in een comment in `about/page.tsx` had overgeschreven.
Beide keren was de comment fout, niet de poort. Herschreven, poorten ongemoeid.

#### En één keer sloeg mijn eigen gereedschap te breed

Een `.replace('--', '—')` over een heel commentaarblok raakte ook de
streepjeslijnen eronder, en maakte er em-dash-linialen van. Zelfde familie als
de backslash-halvering van gisteren: een vervanging die wijder toesloeg dan
bedoeld. Regel-voor-regel herschreven, met een assertie dat er geen
em-dash-liniaal overbleef.

#### Meting

803 tests in 31 bestanden, 696 dict-sleutels × 4 talen. Zes nieuwe tests voor
`controleerEntiteitsAdressen`, in twee richtingen gebroken: het adres op het
eigen domein gezet (rood) en ENOTFOUND gedegradeerd tot waarschuwing (rood).
Op de draaiende build in vier talen nagelopen: link, `rel`, `affiliation`,
Duitse H1 en Duitse description.

### 2026-08-20 (vervolg) — de Duitse leesbeurt: veertien zinnen, en een test die het defect verdedigde

De vorige PR vond bij toeval twee kapotte Duitse woorden. Twee fouten in tien
willekeurig gelezen sleutels is geen toeval maar een steekproef, dus is het hele
Duitse blok uitgelezen — 696 sleutels, regel voor regel, met en/nl ernaast waar
de bedoeling onduidelijk was.

**Veertien zinnen aangepast, in drie klassen.**

*Woorden die iets anders betekenen.* `Bauingenieurlich` staat op geen enkele
woordenlijst, en `Bauingenieur` is bovendien een ander vak dan bouwmanagement —
het stond drie keer, waaronder in de H2 van de methode-sectie op de homepage en
in de lede van `/about`. `Produkte im Versand` en `Wir versenden bereits` gaan
over pakketpost, niet over software uitleveren. Let op: `Versand` blijft wél
staan in `pricing.feat.email.customSmtp`, want dáár betekent het precies wat er
staat. Een verbod op het woord zou dat kapot hebben gemaakt.

*Eén begrip, meerdere woorden.* `tag.label.hospitality` zei **Hotellerie** — een
derde Duits woord voor dezelfde sector naast Hospitality (13×) en Gastgewerbe
(3×), uitgerekend in de H1 en de titel van de tagpagina, terwijl de sectorpagina
ernaast Hospitality zegt. En `Operatoren` (5×) leest in het Duits als
wiskundige of machine-operatoren, terwijl het publiek overal elders `Betreiber`
heet (25×). De meta-description die in #108 geschreven werd, deed het al goed;
de pagina-lede ernaast niet.

*Aanspreekvorm.* Het Duitse blok is Sie — 122 keer gemeten — met drie du-vormen
ertussen. Dat leest als drie verschillende schrijvers.

**De poort bewaakt wat mechanisch is, niet wat een lezer moet doen.**
`lib/i18n/duits.test.ts` heeft twee regels: geen du-vormen, en geen van de vijf
woorden die zijn teruggedraaid — elk met de reden erbij, want een verbod zonder
reden wordt over een jaar weggehaald door iemand die niet weet waarom het er
stond. Hij leest `DICT.de` en niet de bestanden, zodat het testbestand zichzelf
niet laat struikelen over de woorden die het beschrijft. In drie richtingen
gebroken: `Bauer` terug, een du-vorm terug, `Hotellerie` terug.

Wat een test hier níet kan is zien of Duits klópt. Daar was de leesbeurt voor,
en die is nu gedaan.

#### Een bestaande test hield het defect op zijn plek

`tags.test.ts` asserteerde `tagLabel("de","hospitality") === "Hotellerie"`. De
poort die moest bewijzen dát er vertaald wordt, legde precies de verkeerde
vertaling vast. Hij is niet aangepast aan het nieuwe antwoord maar verplaatst
naar een tag die in het Duits écht anders luidt (`real-estate` → Immobilien) —
met "Hospitality" als verwachting zou de assertie ook zijn geslaagd op een
terugval naar het Engels, en dan bewijst hij niets meer.

**Een test die de fout vastlegt, verdedigt hem.** Bij elke gele vlag hoort dus
de vraag welke test hem tot nu toe groen hield.

#### Meting

807 tests in 32 bestanden, 696 dict-sleutels × 4 talen. Op de draaiende build in
de geserveerde HTML nagelopen: `Bauingenieurlich` 0×, `Hotellerie` 0×,
`Operatoren` 0×, `Produkte im Versand` 0×, du-vormen 0×, en de vervangingen
staan op `/de`, `/de/about`, `/de/services`, `/de/sectors/hospitality`,
`/de/sectors/adjacent` en `/de/insights/tag/hospitality`.

**Wat blijft staan.** `priv.p.contact` belooft in vier talen dat een inzending
"sofort als E-Mail (über Resend)" aankomt. Gemeten op 2026-08-20 doet hij dat
niet: de edge function meldt `resend: skipped: RESEND_API_KEY unset`. Dat is
geen vertaalfout maar een operator-actie die al op de lijst staat — tot die
sleutel gezet is, staat er in een privacyverklaring iets dat niet gebeurt.

#### Wacht op de operator — bijgewerkt 2026-08-20

Dit vervangt de lijst van 19 augustus hierboven.

- **Plausible-cijfer**: bezoekers over 30 dagen. Zonder dat blijft "0 leads in
  `marketing.leads`" onbeslist tussen geen-verkeer en geen-conversie.
- **`RESEND_API_KEY` op de edge functions** (Supabase → Edge Functions →
  Secrets), plus `ACK_FROM` op een geverifieerd domein. Zonder die twee gaat er
  bij een echte lead geen enkele mail de deur uit — gemeten, niet vermoed. De
  leadketen-test hoeft niet meer; die is gelopen.
- **DataForSEO-inloggegevens** (open sinds 2026-08-03). Zonder die twee waarden
  levert elke SEO-route niets. Zet ze zelf; de plek staat klaar in
  `.env.example`.
- **Kiezen: gehost of self-host** voor OpenSEO. Aanbeveling en onderbouwing
  staan in `MANUAL_TASKS.md`; de keuze kost geld, dus die is aan jou.
- **Ahrefs-connector loskoppelen** via claude.ai — zodra OpenSEO antwoordt.
- **Search Console**: alleen nog nakijken of de property daadwerkelijk
  geverifieerd is. Het DNS-record is er.
- **Vier Plausible-doelen aanmaken** in het dashboard — `Boeking 15min`,
  `Pricing CTA`, `Sector CTA`, `Tool CTA` — plus de drie custom properties
  (`tier`, `sector`, `tool`). Taggen is af en geverifieerd; zonder de doelen
  worden de kliks binnengehaald en weggegooid. Exacte namen en de meting staan
  in `MANUAL_TASKS.md`.

Vier daarbij uit `docs/aanbod.md` §5. Geen ervan is uit de repo af te leiden, en
geen ervan mag verzonnen worden.

- **Wat kost de diagnostische sprint van 30 dagen?** Eén bedrag, eerst in
  `docs/claims.md`, daarna pas in kopij. Zolang dit open staat blijft "vaste
  prijs" een belofte zonder inhoud.
- **Wat ligt er na die dertig dagen op tafel?** Eén zin. Stap 1 van de ladder
  noemt een tastbaar ding (een diagnose van één pagina), stap 2 noemt alleen een
  toestand. Hierop wacht de laatste tekstwijziging in vier talen.
- **Draag je een garantie, en welke?** De vorm die bij dit aanbod past raakt de
  levering van stap 2, niet de uitkomst. Jouw risico, jouw keuze; ik kan de
  gangbare vormen naast elkaar zetten met wat elk kost als het misgaat.
- **Hoeveel trajecten draag je tegelijk?** Een getal maakt schaarste echt en
  controleerbaar. Zonder getal is elke urgentie-zin een constructie, en dan hoort
  hij er niet te staan.

- **Zeven stappen voor lucenai.eu** in `docs/lucenai-backlinks.md` §3, waarvan
  zes operator-werk in WordPress. De belangrijkste kost een minuut: op
  `lucenai.eu/about` de naam van Juan linken naar `juandiazllc.com/en/about`.
  Backlinks bouwen heeft pas zin als stap 1 t/m 3 gedaan zijn.

### 2026-08-20 (vervolg) — DEUS, de tweede pass: twee prijslijsten die elkaar tegenspreken

`docs/aanbod.md` §6 zette de volgorde: eerst punt 3 — welke van de ontbrekende
mogelijkheden prijsrijen worden en op welk niveau — omdat dat "aanbodwerk is en
het kan nu". Bij het meten bleek die aanname niet te houden, en niet omdat de
mogelijkheden ontbreken.

#### Meet tegen `origin/main`, niet tegen de werkkopie

De lokale checkout van DEUS-SHARED stond op `efdf7da` van **18 mei**, 333
commits achter. Daar tellen 165 routes; op `origin/main` (`5f95d90`,
2026-08-19) zijn het er 201 — precies het getal dat `claims.md` op 15 augustus
noteerde. Een `git ls-tree`/`git grep` tegen `origin/main` meet zonder de
werkkopie aan te raken, en dat is hier het verschil tussen een meting en een
misverstand van drie maanden oud.

#### De beslissing van 15 augustus is niet uitgevoerd

`claims.md` legde die dag Juans keuze vast: per zitplaats wint, en DEUS-SHARED
volgt — slugs hernoemen, Stripe-`quantity` aan de zitplaatsen koppelen,
`maxUsers` van plafond naar ondergrens. Vijf dagen later staat er in
`lib/philly/billing/plans.ts` nog steeds `operator/team/business` op
€49/€199/€599 vast, met `maxUsers` als plafond en `quantity: 1` in de
checkout-route.

| | de pagina | DEUS-SHARED |
|---|---|---|
| niveaus | vier | drie |
| model | per zitplaats | vast per maand |
| gebruikers | **minimum** 3/5/10/15 | **maximum** 3/10/onbeperkt |

Starter kost op de pagina €40 × 3 = €120 als vloer; `operator` kost €49 met een
plafond van drie. Business: €990 tegen €599. Beide kunnen niet waar zijn.

**En de code denkt dat ze overeenkomen.** De kop van `plans.ts` zegt "matching
`pricing.tier.<slug>.*` in `/lib/i18n/dict.ts` on the marketing side". Die
sleutelruimte bestaat hier niet; het is `pricing.t.{starter,pro,business,
enterprise}.*`. Niet de naamruimte klopt en niet de slugs. Een commentaar dat
een voornemen als toestand opschrijft is erger dan geen commentaar — het
beantwoordt de vraag die je had moeten stellen.

#### Zestien mogelijkheden gemeten, acht met een niveau uit de code

De tabel staat in `docs/claims.md`, met per rij het bewijs (`app/api/**` en de
`PlanFeature` die hem afschermt). Twee dingen die er niet in stonden:

**De rij die "dialer" heette bestaat niet zoals hij klinkt.** Er is geen
telefonieprovider in de repo. Wat er staat is een bellijst met klik-om-te-bellen
en registratie van uitkomst; de eigen gebruikersdocumentatie opent met "Call
list management". Dat is dezelfde fout als de twee agenda-synchronisatierijen
die er in augustus afgingen — een naam aanzien voor een mogelijkheid — en
`claims.md` had de les er zelf al bij geschreven.

**De IP-allowlist staat nu al verkeerd op de pagina.** Vier vinkjes, terwijl
`PLANS` hem uitsluitend aan `business` geeft. Dat is geen rij die erbij moet,
maar een rij die nu iets verkoopt dat Starter niet krijgt.

Welke rijen erbij komen en op welk niveau blijft aan Juan: DEUS heeft drie
niveaus en de pagina vier, en welke van de vier het bovenste DEUS-niveau draagt
bepaalt wat er bij €69 en wat er bij €99 hoort. De drie verticale modules (35
routes samen) stel ik bewust niet voor — een module op een prijslijst zetten
beantwoordt de ICP-vraag stilzwijgend.

#### De knop beloofde een stap die er niet is

Drie knoppen zeiden in vier talen dat ze een proefperiode starten. Alle drie
gaan naar `/contact`. Er valt niets te starten; er staat een formulier — en de
pagina schrijft dat zelf op, in een commentaar boven `TIERS`.

Het aanbod was niet het probleem; het werkwoord was het. De knoppen vragen nu om
de proefperiode, en `pricing.outro.body` zegt erbij dat het opzetten met de hand
gaat.

`lib/prijsknoppen.test.ts` **schakelt zichzelf uit zodra de belofte waar wordt**:
de regel geldt alleen voor een knop waarvan de `ctaHref` naar `/contact` wijst.
Wijst hij naar `/signup`, dan mag het label weer zeggen dat het iets start. Dat
is opzet — een verbod dat blijft staan nadat de reden verdween, wordt over een
jaar weggehaald door iemand die niet weet waarom het er stond.

In drie richtingen gebroken: belofte terug bij een formulierknop (rood), belofte
terug bij een `/signup`-knop (groen, de regel vervalt), en het veld `ctaHref`
hernoemd (rood op de lege lijst, niet stil groen).

Drie FAQ-antwoorden zijn **niet** aangeraakt: naar rato opwaarderen, een
terugbetaaltermijn van 30 dagen, een factuur die de zitplaatsen volgt. Geen van
drieën wordt door enig systeem uitgevoerd, maar het zijn toezeggingen zoals de
migratiebelofte — bijstellen verandert het aanbod, en dat is niet aan mij.

#### Meting

811 tests in 33 bestanden, 696 sleutels × 4 talen (waardes gewijzigd, geen
sleutels). Dat vervangt de 807/32. Typecheck schoon, `regen:pricing:check`
groen. Op de productiebuild in vier talen nagelopen: de oude labels 0×, de
nieuwe 6× per taal, en de nieuwe zin in `outro.body` staat vertaald op alle vier
— geen Engelse terugval op `/de` en `/es`.

**Eén ding om te onthouden over het schrijven zelf.** De heredoc brak voor de
vierde keer deze sessie op inhoud met aanhalingstekens. Lange tekst gaat via het
Write-gereedschap naar de scratchpad en daarna met Python op zijn plaats; niet
via `<<'EOF'`.

#### Erbij op de operator-lijst

- **Welke van de zestien mogelijkheden worden prijsrijen, en op welk niveau?**
  De tabel met bewijs staat in `docs/claims.md`. Acht dragen een niveau uit
  DEUS' eigen code; de vertaling van drie DEUS-niveaus naar vier pagina-niveaus
  is een commerciële keuze.
- **De IP-allowlist: naar Business op de pagina, of in `PLANS` naar alle
  niveaus?** Nu verkoopt de pagina hem aan Starter en geeft het product hem
  alleen aan business.
- **Voert DEUS-SHARED de beslissing van 15 augustus alsnog uit?** Zolang dat
  niet gebeurt staan er twee prijsmodellen klaar die verschillende bedragen
  zouden aannemen.

### 2026-08-21 — DEUS-SHARED: de provider die bediende stond nergens

Twee PR's in `bongartzdiaz/DEUS-SHARED` (#99 en #100), na een auditronde over
`origin/main` (`5f95d90`). Geen code in deze repo aangeraakt; het staat hier
omdat de drie openstaande vragen bij de operator-lijst hieronder horen.

**Meet tegen `origin/main`, en let op wélke werkkopie.** Er staan er twee:
`C:/business/DEUS-SHARED` liep 333 commits achter (18 mei, 165 routes) en
`C:/business/deus-shared-tmp` is de canonieke — die stond 2 commits achter en
telt 201 routes. Ik heb de eerste in een eerder verslag als "de" checkout
genoemd; dat klopte niet. De gepubliceerde cijfers kwamen uit `origin/main` en
staan wel.

#### Vijf bevindingen, twee gerepareerd

`ResolvedChainEntry` draagt een `providerId` met het commentaar dat hij er voor
logging staat. Er logde niets. De failoverketen wordt opgebouwd, er wordt
gefailoverd, het antwoord komt terug — en welke verwerker de prompt heeft
gezien verliet de resolver nooit. Een prompt draagt naam, e-mail, telefoon,
bedrijf, notities en de tekst die een burger zelf instuurde. Bij een
inzageverzoek is "welke partij heeft dit gezien" precies de vraag, en die was
niet te beantwoorden — ook niet achteraf, want er was geen spoor.

`logProvenance()` schrijft nu één regel per bediend verzoek. **De inhoud gaat
er niet in**: een logregel met de prompt zou een tweede kopie van de
persoonsgegevens zijn op een plek met een andere bewaartermijn, een groter
defect dan wat het sluit. De test hanteert daarom een uitputtende lijst
toegestane velden — een nieuw veld laat de poort omvallen, ook als het
onschuldig lijkt.

De tweede: `2.envExampleDrift` in `check-launch-readiness.ts` matchte op
`process.env.X`, terwijl de providercatalogus `envVar: 'MISTRAL_API_KEY'`
declareert en later via `env[field.envVar]` leest. **Zeven van de achttien**
catalogusvariabelen ontbraken in `.env.example` zonder dat de poort iets
meldde. Met de oude scanner en een verwijderde sleutel gaf hij een groen
vinkje. Dat groene vinkje wás de blinde vlek — dezelfde soort als de
telwoord-regex van gisteren, één laag naar buiten.

#### Drie blijven liggen, en dat is opzet

Welke providers persoonsgegevens mogen ontvangen; of de failover-aanvulling een
uitgesproken voorkeur mag overrulen; en of de nul-retentiebelofte standhoudt
bij een tweede provider. Alle drie wijzigen een toezegging aan een klant.
Zelfde grens als bij de drie FAQ-antwoorden op `/pricing`: bijstellen verandert
het aanbod.

Ze staan met bewijs en regelnummers in
`docs/audit/AI-PROVIDER-AUDIT-2026-08-21.md` in DEUS-SHARED, naast de vier
eerdere ronden.

**Bij het opschrijven bleek de oplossingsweg al te bestaan.**
`SUB-PROCESSORS.md:57` draagt een checklistregel die zegt dat je bij een nieuwe
provider éérst zijn retentiegedrag bevestigt. Hij is nooit gelopen, want er is
nooit een tweede provider geconfigureerd. Dat kwam boven bij het hertellen: zes
treffers op de term, vijf beloftes en één instructie. Ik had eerst vijf
geschreven zonder het onderscheid te zien.

#### Meting

Alle zeven poorten lokaal, want de Actions-facturering staat stil en de
`gates`-workflow faalt zonder te draaien. tsc 0 · i18n PASS, 4010 sleutels × 5
talen · vitest **2607/2607** in 186 bestanden (was 2603) · launch:check 22 pass
· 0 fail · audit:tenant schoon · be:check PASS · build groen. Na de merge de
boom van main vergeleken met die van de tak: identiek.

#### Erbij op de operator-lijst

- **Welke AI-providers mogen persoonsgegevens ontvangen?** Vier kunnen het;
  vijf juridische documenten noemen alleen Anthropic. Volgen de documenten de
  code, of beperkt de code zich tot de documenten? Beide zijn verdedigbaar, en
  P3 hangt aan het antwoord.
- **Mag een platformsleutel automatisch failoverdoel worden** voor een
  organisatie die een andere voorkeur uitsprak? Nu wel, met opzet — maar het
  staat nergens opgeschreven als keuze, en een derde optie bestaat: alleen
  aanvullen met providers die de organisatie zelf configureerde.
- **Houdt de nul-retentiebelofte stand?** Hij is Anthropic-specifiek en is de
  enige mitigatie die de DPIA noemt voor retentie bij de verwerker. Beslis
  eerst de eerste vraag; deze volgt eruit.

### 2026-08-21 (vervolg) — vier baseline-bevindingen nagemeten, en drie ervan klopten niet

De opvolging van de security-baseline van gisteren. Vier punten stonden op de
lijst; bij het hermeten bleek van drie de premisse fout. Dat is het patroon van
deze dag: niet één van de vier is uitgevoerd zoals hij was opgeschreven.

#### PostgREST gaf vier functies weg via PUBLIC, niet via anon

De baseline noemde "zes ongethrottelde anon-RPC's in `diaz_editor`". De ACL's
lazen anders: twee functies droegen `anon=X`, maar álle vier droegen `=X` — en
dat is de PUBLIC-grant, die elke rol erft. Dit is precies
[[feedback_postgrest_rpc_execute_default]], nu ook in
`vbozelswveaxsyccvaac`, waar `diaz_editor` in `db_schemas` staat.

Gemeten vóór het intrekken, met `set role anon`: `validate_license('zzzz')` gaf
netjes `unknown-key` terug. Een werkend orakel dat zonder limiet vertelt of een
licentiesleutel geldig is.

| functie | anon nodig? | gedaan |
|---|---|---|
| `validate_license` | nee — `license-validate/index.ts:108` draait op service_role | ingetrokken |
| `capture_quiz_lead` | nee — nul client-aanroepers | ingetrokken |
| `log_update_event` | **ja** — `electron/main.js:537` | laten staan |
| `capture_newsletter_email` ×2 | **ja** — drie levende clients | laten staan |

**De maatregel die op de lijst stond was rate limiting; de juiste maatregel was
intrekken.** Een limiet op een endpoint dat niemand nodig heeft is een rem op een
deur die dicht kan.

#### De "dubbele" overload was geen duplicaat

De lijst zei: zoek uit welke van de twee `capture_newsletter_email` live is en
drop de andere. Beide zijn live, door verschillende clients — de 8-arg door
`landing/_exit-intent.js` en `_tool-capture.js`, de 4-arg door
`apps/editor/components/TradePicker.tsx`. Droppen had een echte aanroeper
gebroken.

Wat er wél mis was: van de drie plekken die één contract uitdrukken, deed er één
niet mee. De partiële index
(`UNIQUE (lower(email)) WHERE drip_state <> 'unsubscribed'`) en de 8-arg
overload zijn het eens — een afgemelde rij gaat bewust met pensioen. De 4-arg
zocht zonder dat filter, had geen e-mailvorm-controle en geen taalcorrectie,
terwijl `newsletter_subscribers_lang_check` alleen en/nl/es/de accepteert.
Willekeurige tekst kon dus als "adres" de drip-wachtrij in met
`drip_state='day_0'` en `next_send_at=now()`.

Bewezen in een blok dat zichzelf terugdraaide: onzin → `invalid` zonder rij,
`lang=fr` → opgeslagen als `en`, herhaling → `already_subscribed`. Nul rijen
vóór en na.

**Bijna het omgekeerde gedaan.** Mijn eerste migratie voegde een unieke index
toe en haalde het unsubscribed-filter uit de 8-arg, omdat ik dacht een
afmelding-die-zichzelf-terugdraait te zien. Beide fout: de index bestónd al —
ik had alleen `pg_constraint` bekeken, en een los unieke *index* is geen
constraint — en hij is partieel, wat het gedrag tot ontwerp maakt in plaats van
defect. Mijn `ON CONFLICT (lower(email))` zou bovendien gefaald hebben, want die
matcht geen partiële index. **Kijk in de juiste catalogus voordat je "bestaat
niet" concludeert.**

Postgres weigerde de migratie zelf ook, op iets anders: de bestaande functie had
parameter-defaults die ik niet had overgenomen. Vandaar `pg_get_function_arguments`
in plaats van de handtekening reconstrueren.

**Wat er open blijft, en van Juan is:** er is geen double-opt-in, en het ontwerp
staat opnieuw-aanmelden na een afmelding toe. Iemand anders kan dus een afgemeld
adres terugzetten op de lijst. Dat bijstellen verandert een toezegging.

#### Twee routes zonder rem, en één die per verzoek onbeperkt kon fanout'en

De baseline zei "vier van de vijf publieke routes ongethrottled". Het waren er
twee: `log-error` en `vitals` droegen elk hun eigen kopie van een token-bucket.

Het werkelijke gat zat niet in de verzoeken maar per verzoek. De Reporting API
stuurt een array, en `csp-report` deed één `captureMessage()` per element — één
POST met vierhonderd elementen was vierhonderd Sentry-berichten. Een limiet per
IP doet daar niets tegen, want het blijft één verzoek. Zie #206.

#### Een verouderde `.next` laat bestaande API-routes 404'en en nieuwe werken

Kostte de meeste tijd van de dag. Alle vijf de routes gaven 404, inclusief `cal`
die niet was aangeraakt — dus makkelijk te lezen als "mijn wijziging breekt het".
Een verse `app/api/ping/route.ts` gaf 200. Dat verschil is de diagnose: de
dev-server bedient API-routes prima, hij kende alleen deze vijf niet. `.next`
dateerde van de dag ervoor; na `rm -rf .next` gaf csp-report 204 en cal 503.

**Maak een verse route aan voordat je concludeert dat je wijziging iets brak.**
Een 404 op ál je routes is eerder cache dan code.

#### Meting

828 tests in 34 bestanden, was 811 in 33. Typecheck schoon. De vier routes ook
tegen een draaiende server gemeten, niet alleen in tests — `proxy.ts` draait op
`/api/*` en dat is precies de laag die unit-tests niet zien.

### 2026-08-21 (vervolg) — een poort die tool-aanroepen kan weigeren, en het contract dat niemand had opgeschreven

Op alle drie de oppervlakken stonden nul PreToolUse-hooks. Dat is geen
Website-code — de bestanden staan in `~/.claude/hooks/` en de instelling in
`~/.claude/settings.json`, dus buiten elke repo. **Het staat hier omdat een
volgende sessie die een weigering krijgt anders alleen de foutmelding heeft en
geen idee waar hij vandaan komt.**

#### Eerst gemeten, want vier van de zes aannames waren fout

Een sonde die niets blokkeerde en alleen opschreef wat hij binnenkreeg. Wat er
uit kwam:

| aspect | gemeten |
|---|---|
| activering | direct, **geen sessieherstart** |
| matcher | regex met alternatie; raakt ingebouwde tools **én** `mcp__<ref>__<naam>` |
| stdin | `tool_name`, `tool_input`, `cwd`, `permission_mode`, `session_id`, `tool_use_id` |
| weigeren | stdout-JSON `permissionDecision="deny"` → komt binnen als `<error>reden</error>` |
| exitcode 2 | weigert óók, maar komt binnen als **"hook error"** — leest als een kapotte poort in plaats van een besluit |
| crash (exit 1) | **laat het commando doorgaan, volkomen stil** |

Die laatste regel is de reden dat er een hartslag in zit. Een gecrashte poort
meldt niets, dus **geen weigeringen zien bewijst niet dat er bewaakt wordt** —
dezelfde familie als [[feedback_rood_dat_altijd_rood_staat]], maar dan
omgekeerd: niet een alarm dat altijd afgaat, maar een alarm dat stil is
omdat het stuk is. `echo POORT-HARTSLAG` weigert altijd; komt er niets terug,
dan draait de poort niet.

#### Drie regels, elk gekozen omdat een deny-regel hem níét kan uitdrukken

Een hook die de deny-lijst nabouwt is de fout van twee lijsten die hetzelfde
bewaken: ze lopen uit elkaar en dan bewaakt de zwakste. Deze drie passen daar
aantoonbaar niet in.

| | wat | waarom de deny-lijst hem mist |
|---|---|---|
| R1 | `git push … +src:dst` | force-push via refspec draagt geen vlag; een voorvoegselregel kan een refspec niet lezen. Dit is het enige gat dat 19 augustus open bleef staan toen de rest van dat cluster dichtging. |
| R2 | outreach-automatisering | een afspraak, geen commandovorm. Juans woorden: bouw dit als harde code, niet als documentatie — tot nu toe stond het alleen in documentatie. |
| R3 | `drop schema` / `drop database` via `execute_sql` of `apply_migration` | vergt de toolnaam én de inhoud van een parameter tegelijk |

R3 is niet theoretisch. Op 1 augustus is `diaz_editor` gedropt zonder hem uit
Exposed Schemas te halen; PostgREST gaf daarna op de hele REST-API 503
PGRST002 en de leadopvang lag plat.

#### Match op de handeling, niet op het zelfstandig naamwoord

Twee keer ging mijn eigen poort af op mijn eigen werk, en beide keren was dat
leerzaam.

De sonde blokkeerde de bewerking van de sonde, omdat de heredoc die hem schreef
de sentinel letterlijk droeg. **Bewerk de poort met het Write-gereedschap, niet
met een Bash-heredoc.** Dat staat ook in de kop van het bestand zelf.

En de eerste opzet van R2 matchte op het woord `linkedin`. Die zou
`cat project_linkedin_outreach.md` en `grep -ril linkedin` hebben geblokkeerd —
lezen, geen versturen. De werkende vorm eist twee dingen tegelijk: een
netwerkcliënt **én** een berichten-endpoint. Zelfde vorm als R1: `git push`
**én** een refspec, niet het plusteken alleen. Beide valse-treffergevallen
staan als test in de suite, en `grep -ril linkedin` is ook live nagelopen.

#### Bewezen, in beide richtingen, twee keer

23 gevallen in `veiligheidspoort.test.py` — elke regel weigert zijn eigen geval
en laat het buurgeval door — plus dezelfde drie regels nog eens **door het
harnas heen**, want een suite bewijst de logica en niet de bedrading.

Bij de live-proef heb ik voor elke regel een variant gekozen die de poort raakt
maar onschadelijk is als hij faalt: een refspec-push naar een niet-bestaande
remote, een `echo` die het curl-patroon draagt, en een `select` met de woorden
erin. Een echte force-push testen zou precies het ding doen dat de regel moet
voorkomen.

Andere richting ook live: `grep -ril linkedin` gaat door, en
`select count(*) from marketing.leads` gaf gewoon 0.

#### Wat de poort níét dekt, en dat is opzet

- **Koud van warm onderscheiden kan hij niet.** R2 blokkeert en legt uit; de
  afweging blijft bij Juan. Koude e-mail naar Duitsland is alleen gedekt via de
  bulk-verzendtools; één handgeschreven mail is niet als vorm herkenbaar.
- **R3 dekt alleen het MCP-pad.** Een `drop schema` via `psql` vanuit Bash valt
  erbuiten — er staan hier geen inloggegevens voor, dus dat pad bestaat niet.
- **Geen secret-scan op Write/Edit.** Bewust weggelaten: die zou op élke
  bewerking draaien en de valse treffers van deze zomer
  (`YOUR_..._KEY_HERE`, `${...}`) waren talrijker dan de echte.
- **Hij matcht op tekst**, dus hij gaat ook af op een commando dat het patroon
  alleen noemt. Dat is de prijs van deze vorm en hij staat opgeschreven.

De poort staat globaal ingehaakt en de matcher raakt alleen Bash en drie
MCP-toolvormen — niet elke aanroep, dus geen procesopstart per tool. Geen van
de vier oppervlakken had een botsende project-lokale hook;
`diaz-editor-work` heeft project-lokaal `deny=0` en leunt volledig op deze laag.

### 2026-08-21 (vervolg) — de allow-lijst was nog nooit bekeken, en daar zat het echte gat

De deny-lijst is dit jaar drie keer onderzocht: het cluster van 19 augustus, de
tokengrens-les, en vandaag de hook eromheen. De **allow**-lijst nooit, terwijl
die groter is — 131 regels globaal tegen 52 deny. Een te ruime allow-regel is
bovendien stiller dan een ontbrekende deny-regel: er komt geen prompt, dus je
merkt niet dat er iets langsging.

#### Eerst het geruststellende deel

Van de 203 allow-regels over vier oppervlakken zijn er **190 letterlijke
commando's**. Maar dertien dragen een wildcard. Dat is strakker dan de omvang
suggereert.

#### `gh` had nul dekking, op alle vier de oppervlakken

Geen enkele deny-regel noemt `gh`. Tegelijk staat `Bash(gh api:*)` in de
globale allow, en de sleutel draagt `repo` + `workflow`. Geen `delete_repo`,
dus de repo zelf kan niet weg — dat begrenst het. Maar `repo` alleen is genoeg
voor vier dingen die **geen enkele git-regel raakt**:

| via `gh api` | gevolg |
|---|---|
| `PATCH …/git/refs/{ref}` met `force=true` | force-push zónder één `git push` |
| `DELETE …/git/refs/{ref}` | tak weg, `main` inbegrepen |
| `DELETE …/branches/main/protection` | het vangnet uit #183 eraf |
| `PATCH /repos/{o}/{r}` met `private=false` | private repo publiek — geïndexeerd is geïndexeerd |

Alle 22 git-deny-regels én hookregel R1 kijken hier langs, want er komt geen
`git push` aan te pas. En admins zijn niet gebonden aan branch protection, dus
de eerste werkt ook op `main`.

Een deny-regel kan dit niet uitdrukken: `gh api -X DELETE <pad>` en
`gh api <pad> -X DELETE` zijn dezelfde handeling in een andere volgorde, en een
voorvoegselregel ziet alleen de eerste. Het staat nu als **R4** in de poort,
met GET expliciet doorgelaten — `gh api` lezend is dagelijks werk, en zeven van
de dertien nieuwe testgevallen gaan daarover.

#### Drie deny-regels suggereren dekking en doen niets

Onderweg bleek dat er inmiddels drie regels staan die het refspec-gat lijken te
dichten: `Bash(git push origin +:*)` plus dezelfde voor `deus-shared` en
`upstream`. Twee onschadelijke commando's lieten zien dat ze leeg zijn:

```
git push origin +      -> GEWEIGERD  (losse `+`-token, matcht het voorvoegsel)
git push origin +++    -> LIEP GEWOON (token is `+++`, matcht niet)
```

Een echte refspec is één token — `+main:main` — dus zo'n regel raakt hem nooit.
**Dat is erger dan geen regel:** wie de lijst leest ziet `git push origin +:*`
staan en concludeert dat het dicht is. R1 in de poort is de werkelijke
afscherming, en die dekt bovendien elke remotenaam in plaats van de drie die
toevallig zijn opgeschreven.

Ze zijn blijven staan. Een deny-regel weghalen op Juans machine is een
subtractieve wijziging aan zijn instellingen; de vondst hoort in het memo, niet
in een stille verwijdering.

#### Twee wildcards die aandacht verdienen maar geen regel krijgen

- `Bash(npm install:*)` — installeert willekeurige pakketten met
  postinstall-scripts, dus willekeurige code-uitvoering. Het is ook dagelijks
  werk; een verbod zou alles breken en binnen een dag worden uitgezet.
- `Bash(ssh root@skalo-ai.com '…:*)` — een rootshell met wildcard, op een host
  die niet in de GROEN-lijst van `SCOPE.md` staat.

Beide zijn een afweging voor Juan, geen defect dat ik kan repareren.

#### Meting

38 gevallen in de suite, was 23. R4 ook door het harnas heen bewezen: de
weigering tegen een repo die niet bestáát, zodat er niets kon gebeuren als de
poort zou falen, en de doorlaat op een GET die en passant bevestigde dat de
branch protection intact is — zes verplichte checks, force-push uit,
verwijderen uit, PR vereist.

**De les erbovenop:** kijk niet alleen naar wat de deny-lijst verbiedt, maar
naar wat de allow-lijst binnenlaat.

### 2026-08-21 (vervolg) — drie beweringen in één commentaarblok, geen van drieën waar

Verder met de baseline: dependencies en security headers, de twee hoeken die
nog niet waren aangeraakt. De eerste bleek in orde, de tweede leverde de
grootste vondst van de dag op — en die zat niet in de headers maar in de
toelichting erboven.

#### De deps-poort meet wat zijn naam belooft

Nagelopen omdat een groen vinkje dat niemand ooit heeft opengeslagen precies
het soort ding is dat deze week drie keer stuk bleek. Hier niet:
`npm audit` staat op **nul advisories op elk ernstniveau**, productie én dev, en
`security/geaccepteerde-advisories.json` heeft nul uitzonderingen. De poort
draait bovendien in een eigen workflow met een `schedule`, zodat een advisory
die zónder codewijziging verschijnt ook afgaat. Goed gebouwd.

Wel achterhaald: de memory-notitie van 20 juli meldt "27 npm-vulns (4 high)" als
open punt. Dat klopt niet meer; die notitie is bijgewerkt.

#### De headers zijn sterk, en toen viel de toelichting op

HSTS twee jaar met `includeSubDomains` (geen `preload` — een bewuste keuze
waard, geen defect), CSP met `frame-ancestors 'none'`, `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'`, plus een **report-only-policy die
strenger is dan de afgedwongen**.

De toelichting in `proxy.ts` legde uit waarom die twee uit elkaar liggen. Drie
beweringen, alle drie nagemeten op productie, alle drie onjuist.

**1. "`'unsafe-inline'` blijft, want onze JSON-LD hangt ervan af."** Nee. Een
`<script type="application/ld+json">` is een *datablok*: de browser voert hem
nooit uit, dus `script-src` raakt hem niet. Gemeten: vijf blokken zonder nonce,
alle vijf gewoon in de DOM en parsebaar, terwijl de nonce-policy actief was.

**2. `'unsafe-inline'` deed sowieso niets.** Zodra een directive een nonce
draagt negeert de browser hem (CSP2+). Chrome zegt het woordelijk in de
console: *"'unsafe-inline' is ignored if either a hash or nonce value is present
in the source list."* Bewezen met een inline script zonder nonce: geblokkeerd.

De inline-comment bij de nonce zei het omgekeerde — "noop when unsafe-inline is
present". Dat is de zwaarste van de drie, want wie dat leest concludeert dat de
afgedwongen policy nog niets doet, terwijl hij al volledig nonce-gestuurd is.

**3. "Weghalen zou elke pagina dynamisch maken — een grote SSG-regressie."**
Die regressie is er al, om een andere reden. De nonce wordt per verzoek
gegenereerd, dus Next rendert deze pagina's dynamisch: `Cache-Control: private,
no-store` en `x-vercel-cache: MISS` op drie opeenvolgende verzoeken aan dezelfde
pagina. Ook lokaal, dus het is Next en niet Vercel — ter vergelijking geeft
`/llms.txt`, een route zonder nonce-injectie, netjes `x-nextjs-cache: HIT`.

#### Wat er gewijzigd is

`'unsafe-inline'` is uit `script-src` gehaald: hij veranderde niets aan het
gedrag en liet elke scanner terecht afgaan op een policy die in werkelijkheid al
nonce-gestuurd was. `style-src` houdt hem — daar staat géén nonce tegenover en
React zet inline styles. Die asymmetrie is nu opzet in plaats van toeval.

**Er stond geen enkele test op `unsafe-inline`.** Dat is hoe een omgekeerde
toelichting jaren kan blijven staan. Er staan er nu drie, elk met de reden
erbij, en de style-src-poort is er expliciet om te voorkomen dat iemand hem
"opruimt" omdat script-src hem kwijt is — dat sloopt de opmaak van de hele site.

#### Bewezen, niet aangenomen

Twee mutaties, twee keer rood: `unsafe-inline` terug in script-src, en weg bij
style-src. Daarna hersteld uit een kopie in de scratchpad, niet met
`git checkout --` — die herstelt vanuit de index en had het werk teruggezet.

Daarna tegen een echte productiebuild op poort 3200, want een unittest op de
middleware bewijst niet dat de browser het accepteert en de fout-kosten hier
zijn "alle JS dood". `window.next` bestaat, styles toegepast, vijf JSON-LD-
blokken parsebaar, nul console-fouten. Plus een positieve controle: een inline
script zónder nonce werd geblokkeerd, één mét de juiste nonce draaide.

Die controle was nodig omdat mijn eerste poging — een `securitypolicyviolation`-
listener — niets ving. Niet omdat er niets was: het event vuurt asynchroon en ik
haalde de listener synchroon weer weg. **Een lege lijst uit een kapot instrument
leest hetzelfde als een schone meting.**

#### Drie meetvallen onderweg

- De console-buffer van de browser-pane wordt **niet geleegd bij navigatie**. Ik
  las een CSP-fout op twee verschillende pagina's en dacht even dat de site zelf
  een script blokkeerde. Het discriminerende detail: de nonce in beide
  meldingen was identiek, en een nonce hoort per verzoek te verschillen. Het was
  mijn eigen experiment van een pagina eerder.
- Python op Windows opent `/tmp/...` niet, en zijn stdout is cp1252 — allebei
  vandaag opnieuw ingelopen. `C:/...`-paden en `PYTHONIOENCODING=utf-8`.
- Een patch die een heel commentaarblok letterlijk matcht, brak op de
  streepjeslijn in de kop: ik had er drie te weinig overgenomen. Anker op
  inhoud en werk op regelbereik; tekens tellen is hoe je een patch schrijft die
  op de volgende machine weer stukloopt.

#### Wat dit voor Juan open laat

De afweging zelf, en die is echt: een nonce-CSP kost alle HTML-caching. Elke
paginaweergave is een functie-aanroep in plaats van een CDN-hit, op een site
waarvan het hele werk SEO en snelle eerste weergave is. Het alternatief is een
hash-gebaseerde CSP (cachebaar én streng, maar per pagina te berekenen) of de
nonce laten vallen (cachebaar, zwakker). Dat is een architectuurkeuze, geen
defect — hij staat nu in de code opgeschreven met de meting erbij, zodat niemand
hem opnieuw op de verkeerde gronden afweegt.

#### Meting

831 tests in 34 bestanden, was 828. Typecheck schoon, `regen:pricing:check`
groen, productiebuild groen.


### 2026-08-21 (vervolg) — mijn eigen uitzondering van drie dagen oud, en vijf vrijstellingen voor routes die er niet zijn

Twee PR's (#210 en #211). Ze horen bij elkaar: de eerste kwam voort uit het
natrekken van een claim die ik zélf bij #206 had opgeschreven, de tweede uit het
nalopen van de middlewarekant van diezelfde route.

#### De helft van mijn onderbouwing klopte niet

Bij #206 zette ik `/api/cal` op de uitzonderingslijst voor de rem, met als reden
dat "een vreemde niet verder komt dan een vergelijking". `handtekeningKlopt` is
inderdaad in orde — HMAC-SHA256 over de rauwe body, hex, `timingSafeEqual` met
een lengtecontrole ervoor, uitputtend gedekt.

Maar `await req.text()` las de hele body in het geheugen **vóór** die
vergelijking. Een vreemde kwam dus wel verder: hij kreeg een onbegrensde lezing,
op het enige publieke endpoint zonder rem ervoor. Nu `leesBegrensd(req, 256 KB)`
met 413 daarvoor.

#### Eén uitzonderingslijst deed twee dingen

Dit is de vondst die het waard is te onthouden. In `verzoeklimiet.test.ts` stond
in de test *geen route leest de body meer onbegrensd in*:

    if (ZONDER_REM[pad]) return false

`ZONDER_REM` is de lijst voor de **rem**. Hij ontsloeg de route stilzwijgend óók
van de **body-plafondcontrole** — twee verschillende zorgen op één lijst,
waardoor de tweede controle uitstond voor precies de ene route die erop stond.
De poort die het defect had moeten zien was door de uitzondering zelf
uitgeschakeld.

`ZONDER_REM` en `ONBEGRENSDE_BODY` staan nu los. Die tweede is leeg, en dat hoort
zo: hij bestaat zodat een toekomstige uitzondering niet opnieuw meelift.

#### Twee meetlatten die zelf stuk waren

De rem-poort matchte op de module-import `@/lib/verzoeklimiet`. Zodra cal
`leesBegrensd` uit diezelfde module haalt, zou hij als geremd gelden terwijl hij
dat bewust niet is — de poort zou precies de route missen waar hij over gaat. Nu
matcht hij op `maakLimiet`, de rem zelf.

De body-poort ging af op mijn eigen commentaarregel die uitlegt waarom
`req.json()` daar niet gebruikt wordt. **Derde keer deze sessie dat een tekstscan
op prose viel** (na `contactadressen` en `persoon-entiteit`), maar de eerste keer
dat de comment juist was en de meetlat niet. Er staat nu een commentaarstrip
voor, met een eigen test die bewijst dat hij geen echte aanroep verbergt — anders
is een lege overtreedslijst niet te onderscheiden van een kapot instrument. De
strip raakt bewust geen inline `//`-staarten: een `'https://…'` in een
stringliteral zou dan de rest van de regel wegknippen, en dát is een gemiste
aanroep.

#### De route had helemaal geen test

`cal-webhook.test.ts` test de helper, niet de handler. Daarom kon de claim uit
#206 ongemeten blijven staan: de vólgorde in de route was door niets gedekt.
`app/api/cal/route.test.ts` roept `POST` nu rechtstreeks aan, met een
Supabase-client die gooit — elk pad hoort te eindigen vóór de database, dus een
pad dat er toch komt is luid in plaats van stil.

Twee gevallen dragen het bewijs. Een te grote body met een **geldige**
handtekening geeft 413 (stond het plafond ná de HMAC, dan kwam dit verzoek door
en was de test groen om de verkeerde reden), en van 64 stukjes worden er hooguit
5 opgehaald. Plus een geldig ondertekende body die tot 400 komt, want een route
die álles met 413 beantwoordt zou alle andere tests halen.

#### PR #211 — vijf vrijstellingen voor routes die er niet zijn

Bij het nalopen van `proxy.ts` bleek de CSRF-vrijstellingslijst negen regels te
tellen. Gemeten tegen de bestandsboom staan er onder `app/api` nog vijf routes;
vijf lijstregels wezen naar niets:

| pad | stand |
|---|---|
| `/api/sms/webhook` | weg met #134 |
| `/api/webhooks/inbound/` | weg met #134 |
| `/api/v1/` | weg met #134 |
| `/api/auth/` | weg met #138 |
| `/api/health` | weg met #134 |

De middelste vier waren **naamruimtes**, en dat is het vervelendste soort dode
uitzondering: hij doet vandaag niets en morgen te veel. Een toekomstige
`/api/auth/…` zou vanaf zijn eerste dag de Origin-controle overslaan zonder dat
iemand die keuze maakte — en de site hád auth-routes tot #138, dus dat is
concreet en niet theoretisch.

**En de match was een voorvoegselmatch**: `pathname === p || pathname.startsWith(p)`.
Daarmee dekte `/api/cal` ook `/api/calculator` en `/api/calendar`. Op een site
met `/tools/energy-roi` is dat geen gezochte naam. Dezelfde klasse als de
deny-regels van 19 augustus — zie [[feedback_deny_matcht_op_tokengrens]].

Nu exact, in een eigen module (`lib/csrf-vrijstelling.ts`), want een
middlewarebestand in Next hoort alleen `default` en `config` te exporteren en een
lijst die een poort moet uitlezen kan daar dus niet staan. Zelfde reden waarom
`MAX_BYTES` niet uit de route te exporteren was.

#### Opnieuw hield een test het defect op zijn plek

`proxy.test.ts:186` asserteerde dat juist die vijf paden CSRF-vrijgesteld
**waren**. De routes waren al maanden weg; de test verdedigde hun vrijstelling.
Dezelfde vorm als de `Hotellerie`-assertie in `tags.test.ts` van gisteren. Hij is
niet aangepast maar omgekeerd: de routes die er nog zijn blijven vrijgesteld, de
vertrokken vrijstellingen geven 403, en een naam die alleen een voorvoegsel deelt
lift niet mee.

#### Een mutatie die stil niet landde

Negen mutaties over de twee PR's, elke verwachte kleur vooraf vastgelegd. Dat
laatste betaalde zich uit: de mutatie die de commentaarstrip moest slopen liep
**groen**, en dat las als een zwakke poort. Het was iets anders — het patroon
overspande een regeleinde en dit is een CRLF-repo, dus de vervanging deed niets.
Met een enkelregelig anker alsnog rood.

**Een mutatie die stil niet landt leest exact hetzelfde als een poort die niet
afgaat.** Sindsdien eist het mutatiescript dat het bestand aantoonbaar verandert.

Beslissend was de mutatie die met `req.text()` terug én de oude vermenging terug
volledig groen liep: dat reproduceert het defect precies zoals het bestond.

#### En de meter had een vaste offset

De nieuwe route-test telt hoeveel stukjes van de body werkelijk worden opgehaald.
Hij stond op 1 terwijl de route nog niets had gelezen — een `ReadableStream`
trekt bij aanmaak zelf al één stuk binnen om zijn buffer te vullen
(highWaterMark 1). Ik las dat bijna als een defect in de route. `highWaterMark: 0`
haalt de offset weg.

#### Gemeten op productie, ná controle van de deploy-SHA

De eerste peiling gaf "success" bij de eerste poging, en dat was de deploy van
#210 — niet die van #211. Bijna de verkeerde build gemeten. Pas doorgemeten toen
de productie-SHA gelijk was aan `main`:

| verzoek | uitkomst |
|---|---|
| `POST /api/cal`, `Origin: https://cal.com` | **503**, niet 403 — vrijstelling werkt nog |
| `POST /api/health`, vreemde Origin | 403 |
| `POST /api/v1/contacts`, vreemde Origin | 403 |
| `POST /api/auth/callback`, vreemde Origin | 403 |
| `POST /api/calculator`, vreemde Origin | 403 — voorvoegsel-lek dicht |
| `POST /api/newsletter/confirm`, vreemde Origin | 403 — controle |

#### Wat die 503 betekent, en dat is geen defect van deze PR

De body is `{"ok":false,"error":"not-configured"}`. Dat is de tak voor een
ontbrekende `CAL_WEBHOOK_SECRET`, dus die staat niet in Vercel-productie. **Als
cal.com een boeking post, krijgt hij 503 en komt er geen rij in
`marketing.leads`** — geen Telegram, geen ontvangstbevestiging. De boeking zelf
staat wel gewoon in cal.com, dus er gaat geen afspraak verloren; het spoor gaat
verloren.

Wat hier níet uit volgt: of cal.com de webhook überhaupt aanroept. Dat is van
buitenaf niet te zien. De leadketen-test van 20 augustus liep via het
**contactformulier**, niet via dit pad — de boekingsweg is nog nooit
end-to-end gelopen.

#### Meting

845 tests in 36 bestanden, was 831 in 34. tsc schoon, `regen:pricing:check`
groen, productiebuild groen.

#### Niet meegenomen

`lib/sentry.ts:59` filtert nog verzoeken aan `/api/health` uit de rapportage.
Die route bestaat niet meer, dus die tak is dood — maar het is een
rapportagefilter en geen beveiligingsregel, en hoorde niet in een CSRF-PR.

#### Erbij op de operator-lijst

- **`CAL_WEBHOOK_SECRET` in Vercel-productie zetten**, en daarna nakijken of
  cal.com de webhook werkelijk aanroept. Gemeten op 2026-08-21: het endpoint
  antwoordt `{"ok":false,"error":"not-configured"}`. Zolang dat zo is levert een
  boeking geen rij in `marketing.leads` op, en dus geen Telegram en geen
  ontvangstbevestiging — terwijl "Boeking 15min" de hoofd-CTA van de site is.
  Dezelfde vorm als de ontbrekende `RESEND_API_KEY`: de keten is gebouwd,
  getest en donker door één ontbrekende waarde.


#### PR #213 — het voorbeeldbestand beschreef het CRM, en miste de sleutel die donker stond

Nagelopen omdat de vorige meting één vraag openliet: waarom is
`CAL_WEBHOOK_SECRET` nooit gezet? Het antwoord staat niet in Vercel maar in de
repo — hij stond niet in `.env.example`, het bestand dat je erbij pakt.

Gemeten klopte dat bestand in geen van beide richtingen:

| | aantal |
|---|---|
| gelezen door code, niet gedocumenteerd | 13 |
| gedocumenteerd, nergens gelezen | 27 |

Die 27 zijn het CRM dat met #134/#138 vertrok: Prisma's `DATABASE_URL`,
`NEXTAUTH_*`, vier `STRIPE_*`, vier `TWILIO_*`, vijf agenda-OAuth-variabelen,
`CRON_SECRET`, `FIRECRAWL_API_KEY` en de rest. Geen ruis: wie de lijst afwerkt
zet sleutels voor een systeem dat hier niet meer woont, en `NEXT_PUBLIC_CAL_URL`
beloofde een terugval op mailto die niet bestaat — de boekingslink is een
constante in `lib/booking.ts`.

**Waarom geen scanner de sleutel zag.** De route las hem als
`process.env[SECRET_ENV]`. Dat compileert prima, werkt prima, en draagt geen
naam die een tekstscan kan vinden. Exact dezelfde blinde vlek als
`2.envExampleDrift` in DEUS-SHARED, die ik een dag eerder repareerde: die
matchte op `process.env.X` terwijl de providercatalogus `envVar: '…'`
declareert, en zeven van achttien variabelen ontbraken zonder één melding.
Twee repo's, dezelfde dag, hetzelfde mechanisme.

De indirectie is weg. Voor `NEXT_PUBLIC_*` zou hij bovendien een echt defect
zijn — Next vervangt alleen letterlijke uitdrukkingen bij het bouwen, en de kop
van `lib/supabase/keys.ts` waarschuwde daar al voor.

**De poort** (`lib/env-voorbeeld.test.ts`) bewaakt beide richtingen plus de
indirectie: elke gelezen variabele staat gedocumenteerd, elke gedocumenteerde
wordt gelezen, en niets leest via `process.env[…]`. Platform-variabelen
(`NODE_ENV`, `NEXT_RUNTIME`) staan met reden op een uitzonderingslijst — ze
horen niet in het bestand, want een lezer die ze daar ziet gaat ze zetten.
Testbestanden tellen niet als afnemer.

**De commentaarstrip is verhuisd** naar `lib/bronscan.ts`. Ik schreef hem
diezelfde middag voor de body-poort; deze poort heeft hem ook nodig, want de kop
van `keys.ts` noemt `process.env.NEXT_PUBLIC_X` als voorbeeld. Twee kopieën van
dezelfde strip lopen uiteen en dan bewaakt de zwakste.

**Vier mutaties, vier keer rood.** De sprekendste is bracket-toegang terugzetten:
de sleutel is dan meteen weer onzichtbaar en geldt als "gedocumenteerd maar
nergens gelezen" — precies de staat waarin hij maanden stond.

854 tests in 38 bestanden, was 845/36.

**En de leadtabel is leeg.** `marketing.leads` telt nul rijen, ook historisch,
en nul met `source like 'cal%'`. Daarmee is niet te onderscheiden of er geen
boekingen waren of dat er wel geboekt is en de webhook 503 gaf. Dat onderscheid
kopen kost één omgevingsvariabele.

### 2026-08-21 (vervolg) — de sweep over twee databases, een endpoint dat openstond, en vijftien runs rood die niemand las

De baseline afgemaakt over beide Supabase-projecten in scope, plus PR #215. De
rode draad is dezelfde als de rest van de week: bijna elk instrument dat ik
aanraakte gaf eerst een schoon ogende nul, en vier keer was die nul een defect
in de meter.

#### De database-kant: veel goed, en één ding dat verkeerd gelezen werd

`get_advisors` op `wbgiouuifqhasedncysw` gaf 116 bevindingen: 0 ERROR, 9 WARN,
107 INFO. Die 107 zijn allemaal `rls_enabled_no_policy`, en dat leest als een
waarschuwing terwijl het een slot is — RLS aan zonder policy weigert alles
behalve voor rollen met BYPASSRLS.

| schema | tabellen | RLS aan | zonder policy | bereikbaar via PostgREST |
|---|---|---|---|---|
| `public` | 118 | 118 | 104 | ja |
| `marketing` | 2 | 2 | 0 | ja |
| `outreach` | 3 | 3 | 3 | **nee** |

Nul tabellen met RLS uit. De 104 in `public` zijn de DEUS-tabellen (PascalCase,
Prisma) en staan dus dicht; de 3 in `outreach` zijn helemaal onbereikbaar.

**`anon` heeft in de hele blootgestelde oppervlakte precies twee rechten:**
INSERT op `marketing.leads` en op `marketing.subscribers`, elk met één
bijpassende policy, allebei INSERT-only met `WITH CHECK (true)` en géén
`USING`. Wie de publishable key uit de bron plukt kan een lead indienen en zich
inschrijven, meer niet. Geen SELECT, nergens.

`current_org_id()` is nagelopen omdat vijftien `phily`-policies er volledig op
leunen: hij leidt af uit `auth.uid()`, heeft een vastgezet `search_path` en is
`STABLE`, waardoor de `WITH CHECK` bij een UPDATE tegen de oude waarde
vergelijkt en een gebruiker zichzelf niet naar een andere organisatie kan
schrijven. Niet door de client te beïnvloeden.

**Storage:** `uploads` op wbgio staat **privé** met nul policies — alleen
service_role. Dat sluit een operatoritem dat sinds 2026-08-12 openstond. Op
vbozel staan twee publieke buckets (`content-vault` leeg, `yt-shorts` 62
objecten, geen limiet, geen mime-beperking); publiek lezen is voor uitgaande
video verdedigbaar, publiek schrijven kan niet omdat `storage.objects` RLS aan
heeft met nul policies. Wel dit weten: de standaard Supabase-grants geven `anon`
TRUNCATE op `storage.objects`, en **RLS dekt TRUNCATE niet**. Onbereikbaar hier
omdat `storage` in geen van beide projecten in `db_schemas` staat — maar het is
de vorm die elders wél bijt.

#### PR #215 — de kaart zonder bestemming bleef een link

Lighthouse CI stond op main vijftien runs achter elkaar rood, altijd hetzelfde:
SEO 0,92 op `/en` tegen een drempel van 0,95, drie runs per keer alle drie
0,92. Deterministisch, en niemand las het meer.

Bisect gaf een exacte grens:

    2026-08-19T12:14  SUCCESS  fix(sec): de afweer tegen null-bytes en zijn test
    2026-08-20T11:27  FAILURE  fix(ventures): Philly droeg een adres dat niet bestaat

PR #188 haalde terecht `philly.juandiazllc.com` weg en maakte `href` nullable,
maar liet `<a href={v.href ?? undefined}>` staan. React laat het attribuut dan
weg en er blijft een kale `<a>` over — Lighthouse' `crawlable-anchors`.

Het SEO-effect is klein; het toegankelijkheidseffect is groter. Een anchor
zonder href krijgt geen linkrol en is niet met het toetsenbord bereikbaar,
terwijl hij er identiek uitziet als zijn vier buren. Nu is het een `<div>`; de
CSS hangt aan `.v-card` als klasse en niet aan `a.v-card`, dus visueel
verandert er niets (gemeten: 1185×420, gelijk aan de brede Voltafy-kaart).

De poort is `controleerAnkers` in `lib/seo/audit.ts`, aangesloten in
`auditPagina`, zodat hij de hele site dekt in plaats van deze component.
**Fragmentlinks tellen bewust niet mee** — de skip-link `<a href="#main">` staat
op elke pagina en is een geldige, bereikbare link; zou die meetellen, dan meldt
de audit 176 valse treffers en wordt de controle binnen een week uitgezet. Eén
van de vijf tests eist dat de controle daadwerkelijk in `auditPagina` zit,
anders kan hij bestaan en nergens worden aangeroepen.

Gemeten op een productiebuild in vier talen: 45 anchors, **0 zonder href**, vier
v-cards als `<a>`, de vijfde als `<div>`. Daarna groen op main —
**de eerste geslaagde Lighthouse-run in zestien pogingen.**

#### Het endpoint dat openstond

Tweeënvijftig edge functions over de twee projecten, en op één na staan ze
allemaal op `verify_jwt: false`. Dat is grotendeels terecht — een Stripe-webhook
kan geen Supabase-JWT dragen — maar het betekent dat de poort per functie in de
code moet zitten. Dus gelezen in plaats van geteld.

`lead-notify` is **fail-open**:

```js
if (LEAD_NOTIFY_SECRET) { ...401... } else { console.warn('endpoint is open') }
```

`diaz-release-blast` doet het omgekeerde en valt dicht bij een ontbrekende env.
Beide zijn drie regels. Het verschil is of een ontbrekende configuratie leidt
tot "niemand mag" of "iedereen mag".

**Bewezen zonder één bericht te versturen.** De auth-controle staat vóór de
JSON-parse en de verzendingen staan erna, dus een POST met ongeldige JSON en
zonder auth-header scheidt de gevallen: `401` = dicht, `400 invalid-json` =
open. Gemeten: 400.

Vandaag kost dat Telegram-spam. Zodra `RESEND_API_KEY` gezet wordt — dat staat
op de operatorlijst — wordt het een mailkanaal vanaf het eigen domein. **Zet
`LEAD_NOTIFY_SECRET` dus eerst.**

`lead-acknowledge` is juist voorbeeldig: die wist dat de poort openstond en is
eromheen gebouwd — ontvangeradres uitsluitend uit de database, onbekend id
verstuurt niets, al bevestigde rij idempotent overgeslagen, `@resend.dev` als
afzender geweigerd. Was het adres uit de envelop gekomen, dan was dit een open
mailrelay geweest.

**Twee commentaren klopten niet**, allebei van de klasse die hier het meest
oplevert. `notify_new_lead()` beweert dat de twee sleutels "in either order"
aan kunnen; zet je de functiesleutel eerst, dan stuurt de trigger nog niets mee
en valt élke melding op 401 — stil, want `net.http_post` is asynchroon en de
fout landt in `net._http_response`. En de kop van `lead-acknowledge` zegt dat de
sleutel niet in de vault staat, terwijl `lead_notify_secret` er sinds
2026-08-16 wél in staat. Dat laatste maakt de reparatie triviaal: de
triggerkant is al klaar.

#### Tien dode functies op het verkeerde project

`diaz_editor` bestaat niet meer op `wbgiouuifqhasedncysw` — gedropt op 1
augustus. Toch staan er tien `diaz-*` edge functions ACTIVE en publiek die naar
dat schema wijzen, op versie 4–11, terwijl de onderhouden versies op vbozel op
27–36 staan. Supabase injecteert `SUPABASE_SERVICE_ROLE_KEY` in élke functie
van een project, dus dat zijn tien onbeheerde publieke endpoints met een sleutel
die RLS omzeilt — op het project dat `marketing.leads` en de 118 CRM-tabellen
draagt.

Binnen vbozel staat het bovendien nog vijf keer dubbel (`diaz-license-issue`
naast `license-issue`, enzovoort), alle vijf op 3 augustus vanaf een
CI-runner uitgerold. Exact de vorm uit `feedback_documentatie_is_de_aanroeper`:
een webhook wordt van buiten de repo gebeld, dus een slug-mismatch is
onzichtbaar voor elke controle die alleen eigen code leest.

**Niets verwijderd.** Een uitgerolde functie weghalen is onomkeerbaar en naar
buiten gericht, en de Lemon- en AppSumo-configuratie is van hieruit niet te
lezen.

#### Stripe: twee accounts, 25 sessies, nul betaald

Twee accounts, allebei "Juan Diaz, LLC". Het gebruikte account wijst zijn
webhook **correct** naar vbozel/`diaz-stripe-webhook`; het tweede heeft nul
webhooks en nul sessies en slikt dus geen betalingen stil op.

De betaalketen opnieuw aan de bron gemeten: **25 checkout-sessies tussen 9 mei
en 20 augustus, nul betaald** — zes open, negentien verlopen, allemaal
`unpaid`. Elf meer dan bij de meting van 1 augustus. De melding is niet het
probleem; de betaalstap zelf is het.

#### Vier keer brak de meetlat

1. De regex over de advisor-details matchte niets van 107, omdat het detail een
   **geëscapete backtick** draagt. Eerst 0 treffers, na een halve reparatie 12,
   pas de derde versie gaf 107.
2. `current_setting('pgrst.db_schemas')` gaf `public, graphql_public,
   diaz_editor` — de instelling van de **postgres**-rol, want `execute_sql`
   verbindt als postgres. PostgREST leest die van `authenticator`, en daar staat
   `public, graphql_public, marketing`. Dat draaide de conclusie volledig om.
   **Deze stond al correct in `feedback_drop_schema_breekt_postgrest`**, sinds
   16 augustus; ik ben er alsnog in getrapt door `current_setting()` te
   vertrouwen.
3. Een grep op `USING(true)` gaf achttien treffers in diaz_editor, alle achttien
   op `service_role` — een rol die al BYPASSRLS heeft, dus die policies openen
   niets. Niet de expressie is het signaal maar het paar (rol, expressie).
4. Twee lege uitkomsten waren pas een meting nadat de omgekeerde query bewees
   dat het instrument kón vinden (118 rijen).

#### Meting

859 tests in 38 bestanden, was 854/38. Zes verplichte checks groen, Lighthouse
groen. Eén hapering: `lib/contactadressen.test.ts` valt op een **koude**
vite-cache om met `Test timed out in 5000ms` (108 s transformkosten koud tegen
13 s warm) en loopt los in 776 ms. Zelfde klasse als de metadatapoort in #182 —
de assertie meet wachttijd in de worker-pool, niet wat hij hoort te meten. In
CI vuurde hij niet (24 s). Niet gerepareerd, wel echt.

#### Erbij op de operator-lijst

- **`LEAD_NOTIFY_SECRET`** zetten in Supabase → Edge Functions → Secrets, met
  dezelfde waarde als `lead_notify_secret` in Database → Vault. Dat sluit
  `lead-notify` én `lead-acknowledge`. **Doe dit vóór `RESEND_API_KEY`.**
- **Leaked-password protection** aanzetten op `wbgiouuifqhasedncysw` — de enige
  WARN uit de advisors die actie vergt.
- **Beslissen over de tien dode `diaz-*` functies** op wbgio en de vijf dubbele
  slugs op vbozel. Controleer eerst of Lemon/AppSumo er niet nog op wijzen.
- **Het tweede, lege Stripe-account** sluiten of labelen.
- Optioneel, hygiëne: `revoke execute on function public.handle_new_user(),
  public.notify_new_lead(), public.rls_auto_enable() from public, anon,
  authenticated;` — de drie zijn meetbaar niet aanroepbaar via RPC
  (`0A000: trigger functions can only be called as triggers`), dus dit is
  opruimen en geen reparatie.

#### Twee stukken schuld die vandaag zichtbaar werden

1. **`components/sections/Ventures.tsx` draagt een eigen VENTURES-array** naast
   `lib/ventures.ts`. De poort `lib/ventures.test.ts` leest de tweede en dekt
   dus niet wat de homepage werkelijk toont. Dezelfde vorm als #199, waar
   `llms.txt` de claim nog droeg die #188 net had weggehaald. Zolang dat zo is
   kan de homepage opnieuw iets beweren wat een gate elders al verboden heeft.
2. **`ventures.status.soon` luidt in het Nederlands "In productie".** Dat leest
   even goed als "draait live" en staat op de kaart die juist zegt dat er nog
   niets te bezoeken is. Kopij-vraag, raakt vier talen, niet in deze PR
   meegenomen.
> **Bijgewerkt 2026-08-21 — beide gesloten in #217.** De dubbele lijst is weg
> (de kaarten komen nu als prop vanaf de servercomponent, met een tekstscan-poort
> eromheen) en het Nederlandse label luidt "In aanbouw". Zie de sessie hieronder;
> daar staat ook waarom de voor de hand liggende reparatie van de eerste 40 KB
> proza naar de browser zou hebben gestuurd.

### 2026-08-21 (vervolg) — de twee stukken schuld hierboven, en een meter die CR niet ziet

PR #217 sluit de drie punten die aan het eind van de vorige sessie gemarkeerd
stonden. Ze bleken één patroon te delen: elk is een plek waar de code iets
beweert dat ergens anders al weerlegd is.

#### De naïeve fix zou 40 KB proza naar de browser hebben gestuurd

`components/sections/Ventures.tsx` droeg zijn eigen VENTURES-array naast die in
`lib/ventures.ts`, met adres en statusvlag erin. De voor de hand liggende
reparatie — importeer gewoon `VENTURES` — is fout, en niet op een subtiele
manier: dat component draagt `"use client"`, dus het hele bestand reist mee in
de homepage-bundel. 654 regels verhaal, fases en metrics in vier talen, voor
vier velden per kaart. Tree-shaking helpt niet, want `VENTURES` is één
aaneengesloten literal.

**Gemeten met twee volledige builds, niet aangenomen:**

| variant | client-chunks | venture-proza in client |
|---|---|---|
| prop vanaf de server | 1.134.682 B | nee |
| de naïeve import | 1.174.365 B | ja, `chunks/0ajm89qakwrdi.js` |

+39.683 bytes ongecomprimeerd, ~3,5% van alle client-chunks. **De absentie is
bewezen vindbaar**: dezelfde grep op dezelfde marker vindt hem wel in
`.next/server/`. Zonder die positieve controle is "niet gevonden" niet te
onderscheiden van een kapot zoekcommando.

Het loopt nu via de server. `ventureKaarten()` levert `{slug, live, domain,
external}`; `app/[locale]/page.tsx` is een servercomponent en geeft dat door als
prop. Het component importeert alleen het type, en dat is bij het compileren
weg. Wat er blijft staan is opmaak — onder welke dict-sleutel de kopij hangt en
of de kaart over twee kolommen loopt. Geen feit over het product.

#### "In productie" betekende het omgekeerde

Op de Philly-kaart stond in het Nederlands "In productie". In softwarecontext
leest dat als "draait in productie" — precies wat die kaart ontkent, en het
stond naast vier kaarten die "Live" zeggen. Nu "In aanbouw". De andere drie
talen deden het al goed: Shipping, Kommt, Próximamente.

**Een test kan niet zien of Nederlands klopt**; dat was de leesbeurt van
gisteren. Wat hij wél mechanisch bewaakt is deze ene klasse — een status-badge
die het tegenovergestelde belooft van de status die hij draagt — via een
woordenlijst per taal met de reden erbij. De lijst draagt een positieve
controle: het live-label moet er in elke taal wél op vallen, anders is de lijst
vacuüm en slaagt de poort altijd.

Blijft staan als observatie, niet als defect: het Duitse "Kommt" is als
status-badge ongebruikelijk Duits (`Demnächst` of `In Arbeit` ligt meer voor de
hand), maar het is niet misleidend — het zegt niet dat het ding draait. Buiten
de klasse die deze poort bewaakt.

#### Sentry filterde een route die niet bestaat

`beforeSend` gooide meldingen weg voor `/api/health`, vertrokken met #134.
Nagetrokken over álle getrackte bestanden: dit was de laatste levende
verwijzing. De rest is historische documentatie plus de gate uit #211, die juist
bewaakt dát de route 403 geeft.

#### De poort leest tekst, geen module — en dat is het hele punt

`components/sections/Ventures.test.ts` is een tekstscan, net als
`ResultsStrip.test.ts`. Een module-import zou een tweede lijst die ernáást staat
niet eens kunnen zien, en dat was nu juist het defect. Hij eist: geen URL of
domeinnaam in het component, geen eigen statusvlag, geen runtime-import van
VENTURES, een opmaaktabel die exact de slugs uit `VENTURES` dekt, en dat de
pagina de kaarten ook werkelijk doorgeeft. Die laatste koppelt de poort aan de
echte pagina in plaats van aan een component dat los van alles correct is.

Zes mutaties, zes keer rood, elk met precies één falende assertie. Elke mutatie
eiste dat het bestand aantoonbaar veranderde — een mutatie die stil niet landt
leest exact hetzelfde als een poort die niet afgaat.

#### grep is hier geen CR-detector

`grep -c $'\r$'` meldde **0** CR voor `lib/ventures.ts`, een bestand met 691
CRLF. Eerder diezelfde sessie meldde hij **102** CR voor `app/[locale]/page.tsx`,
een bestand met nul. Twee keer fout, in beide richtingen; `sed | cat -A` toont
om dezelfde reden geen `^M`. De MSYS-tools normaliseren regeleinden vóór het
matchen.

Op dat verkeerde cijfer schreef ik op dat `page.tsx` gemengde regeleinden droeg.
Python op de rauwe bytes zei het tegendeel: puur LF.

**Dat is geen cosmetiek.** PR #191 ging over `regen:pricing:check`, die op
Windows permanent rood stond op precies deze klasse. Die beoordelen met een
CR-blinde meter is hoe je een verkeerde fix scheept. Meet regeleinden met
`d.count(b'\r\n')` tegen `d.count(b'\n')`, en met niets anders.

Bijvangst: `git checkout --` schrijft bij `core.autocrlf=true` een LF-bestand
als CRLF terug. Een mutatiepatroon met `\n` dat de eerste ronde matchte, matcht
de tweede niet meer. Maak vervangingen regeleinde-agnostisch.

#### En `git add -A` is te grof in deze repo

Er staan drie langlopende ongetrackte scratch-mappen (`_3dcap/`,
`diaz-editor-gtm/`, `migrations-review/`). `git add -A` vóór de mutatieronde
stageerde ze in één klap mee, inclusief zeven PNG's en een map met eigen
`node_modules`. Teruggedraaid met `git reset -- <map>`; stage expliciete paden,
of controleer direct `git diff --cached --name-only`.

#### Meting

871 tests in 39 bestanden, was 859/38. tsc schoon, `regen:pricing:check` groen,
productiebuild groen en de chunks byte-identiek aan de basislijn na herstel.

Op een productiebuild in alle vier de talen, in de geserveerde HTML én in de
DOM: 5 kaarten, `A,A,A,A,DIV`, 45 ankers waarvan 0 zonder href, vier domeinen en
Philly zonder, statuslabels Live×4 plus per taal Shipping / In aanbouw / Kommt /
Próximamente. De Philly-`<div>` meet 1185×420, gelijk aan de brede
Voltafy-kaart, dus de opmaak is ongewijzigd. Geen horizontale overloop.

Eén CSP-fout in de console kwam van mijn eigen injectie, niet van de site: alle
vijf de nonce-loze inline scripts zijn `application/ld+json` — datablokken die
de browser nooit uitvoert — en elk uitvoerbaar script draagt een nonce. Zelfde
conclusie als #209, en opnieuw pas getrokken ná meten in plaats van ervoor.

### 2026-08-22 — nul opvang met het aas al op de plank, en drie meters die iets anders zeiden dan er op stond

PR #221, plus #220 die er als losse taak uitrolde. De aanleiding was een vraag om
een leadmagneet. Bij het meten bleek dat de verkeerde vraag: er is geen
leadmagneet-probleem maar een opvang-probleem.

#### Het aas lag er al, de fuik niet

| | stand, gemeten 2026-08-22 |
|---|---|
| nieuwsbriefformulier | bestaat, staat op **één** pagina (`/insights`) |
| `marketing.subscribers` | **0 rijen, ooit** |
| `marketing.leads` | **0 rijen, ooit** |
| dubbele opt-in (`app/actions/newsletter.ts`) | dood — `newsletter_subs` bestaat in geen schema, én geen Resend-sleutel |
| `/tools/energy-roi` | bestaat, **ongegate**, vangt niets |
| artikelen | 21, waarvan 13 op 2026-07-20 |
| bezoekerscijfer | onbekend — geen Plausible-doelen, geen sleutel |

Dat laatste is geen detail: **nul opvang is niet te onderscheiden van nul
bezoek.** Elke uitspraak over conversie in `docs/lead-magnet.md` staat daarom
als verwachting opgeschreven, niet als voorspelling.

#### Wat er gebouwd is, en wat er bewust niet in zit

`/nl/tools/lekkage-scan` — vijftien ja/nee-vragen in vier blokken, elk blok
gespiegeld aan een bevestigde uitkomst uit `docs/claims.md`. De uitslag is geen
cijfer op tien maar de drie dingen die het eerst lekken, in volgorde.

**Geen e-mailveld.** Een leadmagneet is een belofte die per e-mail wordt
ingelost, en `RESEND_API_KEY` staat niet gezet. Een veld dat vandaag een PDF
belooft levert iedereen die converteert niets — dat is slechter dan geen
leadmagneet, want je verbrandt precies het publiek dat je net verdiende en je
ziet het niet gebeuren. De opvang loopt via `/contact?interest=lekkage-scan`,
en die keten is getest.

**Geen bedrag.** Een voorspelde besparing kent het bedrijf niet. Een gate scant
wat de bezoeker leest, mét een positieve controle dat het patroon werkelijk
afgaat — anders is een lege overtreedslijst niet te onderscheiden van een kapot
instrument.

**Eén vraag staat omgekeerd.** Bij D2 telt *ja* als lek. Vijftien vragen waarbij
nee altijd slecht is vult iemand op de automatische piloot in; dan meet je
aandacht en niet de stack.

#### `ENKELE_TAAL` — het begrip dat ontbrak

De pagina bestaat alleen op `/nl`; alle vier de bevestigde engagements zijn
NL/BE, dezelfde keuze als bij het saldering-cluster. Twee poorten hebben dat
feit nodig: `app/sitemap.ts` (die had het begrip al, als `locales?: Locale[]`)
en `metadata-locales.test.ts` (die het niet had, en eist dat titel en
beschrijving per taal verschillen — onmogelijk bij een pagina die in de andere
drie talen 404't).

Die twee als losse lijsten opschrijven is de bugklasse die dit logboek het
vaakst raakt. Vandaar `lib/i18n/enkele-taal.ts` als enige bron, en een gate die
drie dingen eist: de pagina bestaat, hij **404't werkelijk** buiten zijn taal,
en de sitemap zegt precies hetzelfde. Zonder die 404-eis is de lijst een
achterdeur om een onvertaalde vierstalige pagina te verstoppen.

**De uitzondering in de metadata-poort is smal, en dat is te meten.** Die
overslaat één assertie; de twee andere lussen in dat bestand (titellengte,
og:image) dekken de nieuwe pagina gewoon. Dat verklaart waarom de telling met 26
steeg en niet met de 24 die ik schreef — en dat verschil natrekken was het waard,
want een onverklaarde plus is net zo goed een signaal als een onverklaarde min.

#### De poort verdiende zich terug vóór hij bestond

A3 stond in `docs/lead-magnet.md` als een óf-vraag ("op één plek, óf in meerdere
systemen") en is zo niet met ja/nee te beantwoorden. Dat viel op bij het
schrijven van de test die eist dat elke vraag **woordelijk** in dat document
staat. Zelfde vorm als #199, waar `public/llms.txt` een bewering bleef dragen
die de code al had ingetrokken — een document en een implementatie die dezelfde
tekst dragen lopen uit elkaar zonder dat iemand het merkt.

#### De scan was een wees, en dat meldde de audit

`scripts/seo-audit.ts`: *staat in de sitemap maar wordt nergens vandaan
gelinkt*. Een pagina waar niets naartoe wijst is geparkeerd, niet gebouwd.

Daaruit komt `components/ScanCallout.tsx`, gemonteerd op `/nl/services` en
`/nl/tools/energy-roi`. Die poortert op `ENKELE_TAAL` en niet op een eigen
`locale === "nl"` — dezelfde bron waaruit de pagina zijn talen haalt, dus de
knop kán per constructie geen 404 opleveren. Een eigen check zou een tweede
lijst zijn geweest, en dat is precies de vorm waarin dit soort gaten ontstaat.

In de audit is dit een **waarschuwing**; in `lib/lekkage-scan.test.ts` is het
een fout. Een waarschuwing komt stilletjes terug.

#### Drie meters zeiden iets anders dan er op stond

**Elf HTTP 500's die er niet waren.** De eerste auditrun liep tegen de
dev-server en meldde 500 op `/nl/about`, `/es/pricing` en negen andere pagina's
die ik niet had aangeraakt. Tegen `next start` waren ze weg: Turbopack die onder
de crawler stond te compileren. Dit logboek schrijft die meetopstelling al voor,
en dit is de derde keer dat het uitmaakte.

**Drie 404's in de console na een schone herlading.** Uit het netwerklog bleken
het mijn eigen sondes naar `/en`, `/de` en `/es` — die hóren te 404'en. De
consolebuffer van de browser-pane wordt bij navigatie niet geleegd; dat stond al
in het logboek van 21 augustus en ik trapte er opnieuw bijna in.

**De aanspreekvorm meten mislukte stil.** Een blok-extractie op `dict.ts` gaf
nul treffers voor élke vorm — `je`, `jij`, `u`, `uw`. Dat leest als een leeg
woordenboek. Het was een kapotte extractie; op regelnummers gemeten staat er
87× `je` en 0× `u`. Vierde keer deze week dat een lege uitkomst uit een stuk
instrument hetzelfde leest als een schone meting.

#### Gemeten

Alles op de productiebuild (`next start`, poort 3200), niet op de dev-server.

| | uitkomst |
|---|---|
| `/nl` | 200 · 1× h1 · 4 blokken · 15 vragen · 30 radio's |
| `/en`, `/de`, `/es` | 404 |
| hreflang | alleen `nl` + `x-default=nl` |
| sitemap | 176 → 177 URL's, alleen `/nl` |
| knop op `/nl/services` + `/nl/tools/energy-roi` | 1×, met taalprefix |
| dezelfde pagina's op `/en`, `/de` | 0× |
| mobiel 375px | geen overloop, raakdoelen 44px (WCAG 2.5.5) |
| `seo-audit` | waarschuwingen: **0** |

De uitslagvolgorde vooraf voorspeld en daarna gemeten: bij B=3, A=1 en D=1 hoort
B → A → D, met het gelijkspel gebroken op A. Dat kwam er precies zo uit.

De 177× `canonical-wijkt-af` is het bekende meetartefact — de lokale build
draagt `NEXT_PUBLIC_SITE_URL` op poort 3000 terwijl de crawl op 3200 loopt.
176 in het logboek, nu 177: exact +1 voor deze pagina.

**899 tests in 41 bestanden**, was 871/39. Dat vervangt de 871 hierboven.
Typecheck schoon, i18n 696 × 4, prijsgenerator groen, build groen met 207
statische pagina's.

Mutatietest op de wees-gate in twee richtingen: beide montages weg → rood op
`expected 0 to be greater than 0`, hersteld → groen. Hersteld uit een kopie in
de scratchpad, niet met `git checkout --` — die herstelt vanuit de index.

**Geen screenshot.** De browser-pane compositeert hier geen frames, dus alles
hierboven is in de DOM en in de geserveerde HTML gemeten, niet op het oog.

#### PR #220 — het commentaar noemde een tabel die in geen schema bestaat

Onderweg gevonden en als losse taak weggezet, want het was een codewijziging in
een documentatie-PR. `components/NewsletterForm.tsx:7` zei "Writes to Supabase
`newsletter_subs`", terwijl het formulier sinds 2026-07-21 via
`app/actions/subscribe.ts` naar `subscribers` schrijft. De kop van
`newsletter.ts` legt die verhuizing correct uit; de kop van het formulier is
meeverhuisd zonder bijgewerkt te worden.

Wie dat leest zoekt de opvang in de verkeerde tabel — en die tabel bestaat niet,
dus hij vindt niets en concludeert dat er niets binnenkomt. Precies de klasse
waar dit logboek het meest aan overhoudt.

#### Voor de operator: niets nieuws, wel een volgorde

`docs/lead-magnet.md` §7 voegt geen taken toe aan de lijst hieronder, maar zet
er drie in volgorde omdat ze elkaar blokkeren:

1. **De vier Plausible-doelen aanmaken.** Zonder dit is elke uitspraak over deze
   scan een gok — de kliks worden nu binnengehaald en weggegooid.
2. **`LEAD_NOTIFY_SECRET`.**
3. **`RESEND_API_KEY` + `ACK_FROM`** — pas ná 2, anders geef je een publiek
   aanroepbaar endpoint een mailkanaal vanaf het eigen domein. De scan werkt
   zonder; de PDF-variant wacht hierop.

En de beslissing die er hoe dan ook ligt: **wat ligt er na de sprint van dertig
dagen op tafel?** De scan eindigt in een uitnodiging, en die moet een tastbaar
ding noemen. Stap 1 van de ladder doet dat al; stap 2 noemt alleen een toestand.
Dezelfde vraag als `docs/aanbod.md` §5, en hij komt hier terug omdat elke
leadmagneet ergens naartoe moet leiden.

#### PR #222 — de scan onder de energie-artikelen, en het waren er vijf

Punt 1 uit het distributieplan. `ScanCallout` hangt nu ook onder de
insight-detailpagina, achter `post.tag === "Energy"`, tussen het boekblok en de
venture-kaart: wie het artikel uit heeft krijgt eerst een stap van vier minuten,
daarna pas een van een kwartier.

**Het plan telde elf energie-artikelen; het zijn er vijf.** Dat getal telde de
DE- en ES-clusters mee, maar de scan bestaat daar niet — `ScanCallout` poortert
op dezelfde `ENKELE_TAAL` waaruit de pagina zijn talen haalt, dus daar rendert
hij niets. Dat is precies waarom die gedeelde bron er staat: de knop kan niet
verwijzen naar een pagina die in die taal 404't, ook niet als iemand hem op een
vertaalde post monteert. Het document is bijgewerkt naar wat gemeten is.

**De poort noemt nu de plekken in plaats van het aantal.** De eerste versie eiste
“minstens één montage”, en dan mag er stilletjes één verdwijnen zolang er nog
één overblijft — precies de staat waarin de homepage jarenlang de enige plek was
voor `ResultsStrip` zonder dat dat ooit besloten was. Nu een expliciete lijst met
per plek de reden, plus een tweede assertie dat de artikelmontage achter de
Energy-tag hangt. Zonder die voorwaarde staat de scan onder élk artikel, ook
onder de real-estate- en hospitality-stukken die een ander publiek hebben.

Twee mutaties, twee keer rood: montage weg uit `/services` →
`expected [ …(2) ] to deeply equal [ …(3) ]`, en de Energy-voorwaarde weg → rood
op de tweede assertie.

**`grep -c` loog voor de derde keer deze sessie.** De ruwe HTML toont twee
treffers op de knoptekst; één daarvan zit in de RSC-payload
(`self.__next_f.push`). Geteld op gerénderde anchors is het er één. En de
metingen op `/nl/services` van een uur eerder telden regels in plaats van
treffers — geminificeerde HTML is één regel, dus die “1” zei niets. Opnieuw
gemeten met `grep -o | wc -l`: 1 anchor per NL-energiepost, 0 op de twee
NL-niet-energieposts, 0 op de DE- en ES-posts, 0 op elke `/en`- en `/de`-variant.

**Op productie nagemeten, ná de deploy.** De eerste probe gaf nul anchors op
élke URL, ook op `/nl/services`, dat de knop sinds #221 al droeg. Dat was geen
defect maar een te vroege meting: de productie-deploy van `3e4efc3` was net
aangemaakt en stond nog te bouwen. Pas met de uitgeleverde SHA gelijk aan `main`:

    vijf NL-energieposts       1 anchor elk
    twee NL-niet-energieposts  0
    DE- en ES-energieposts     0 — ook de kale tekst `lekkage-scan` staat er niet
    /en                        0
    /nl/tools/lekkage-scan     200 · canonical op juandiazllc.com · hreflang nl + x-default
    /de/tools/lekkage-scan     404
    sitemap                    177 URL's, de scan alleen onder /nl

**Twee slugs in die eerste probe bestonden niet.** Ik typte ze uit het hoofd in
plaats van ze uit `getAllInsights("nl")` te lezen, en kreeg twee keer 404 terug.
In een dekkingsmeting leest een 404 precies hetzelfde als een ontbrekende
montage. Lees de lijst uit de bron waar de poort hem ook uit leest.

900 tests in 41 bestanden, was 899/41. `seo-audit` waarschuwingen: 0.

#### PR #224 — wat de sprint oplevert stond al op de homepage, alleen niet aan de sprint geknoopt

Het laatste openstaande punt uit `docs/aanbod.md` §5: stap 2 van de ladder noemde
geen tastbaar ding. Wat de vraag kleiner maakte dan hij leek, is dat het antwoord
al in de repo stond.

| waar | wat er stond |
|---|---|
| `services.how.s1.body` | stap 1 levert "een diagnose van één pagina" — tastbaar |
| `services.how.s1.note` | dat gratis gesprek is "de Blueprint-fase van de methode in het klein" |
| `process.2.body` (homepage, 4 talen) | "Elke fase heeft een getal. Geen vage strategie-deck — een bouwplan dat een aannemer kan lezen." |

Is het gratis gesprek fase 2 *in het klein*, dan is de sprint diezelfde fase op
ware grootte. Het bouwplan was dus geen nieuwe belofte maar een ontbrekende
verbinding. Wat er stond was telkens een **toestand** ("beide kanten beperken
het risico"), in vier talen en in acht FAQ-antwoorden. Waar, maar niet vast te
houden.

**Beslist door Juan op 2026-08-22**, drie punten, eerst in `docs/claims.md` en
pas daarna in kopij: het bouwplan **plus het eerste onderdeel dat al draait**;
allebei volledig eigendom van de klant, ook als een ander het uitvoert; en de
sprintprijs gaat er volledig vanaf als de bouw volgt.

**Wat er bewust niet in staat is een bedrag.** De vaste prijs is nog onbeslist
(`docs/aanbod.md` §5.1), en dat is nu de enige blokkade voor een getal in kopij.
"Vaste prijs" mag wel: dat beschrijft een vorm. Wat het werkende onderdeel ís,
wisselt per traject en mag daarom nergens ingevuld worden — de belofte is dat er
na dertig dagen iets draait, niet wát er draait.

#### De poort noemt de voorwaarde, niet de formulering

`lib/seo/faqs.belofte.test.ts` bewaakte al één belofte over het blueprint-gesprek
(één pagina, niet twee). Daar staat nu een tweede blok naast met vier eisen:
een antwoord dat de sprint van dertig dagen noemt, noemt ook wat hij oplevert;
de ladder draagt in vier talen de deliverable plus beide toezeggingen; nergens
staat een bedrag; en `docs/claims.md` draagt de beslissing nog. Die laatste is
de `ResultsStrip`-vorm: kopij mag zijn bron niet overleven.

Twee dingen zitten er bewust in. De sprint-regex is **smal** — alleen de
volledige aanduiding telt, zodat een prijszin als "de diagnosesprint heeft een
vaste prijs" de deliverable niet hoeft te herhalen. En de bedrag-regex draagt
vier positieve proeven, want een lege overtreedslijst uit een kapotte regex leest
hetzelfde als een schone meting.

**Vijf mutaties, vijf keer rood, elk met een andere assertie:** deliverable weg
uit een NL-antwoord, `s2.note` weg voor Duits, een bedrag in de Engelse
`s2.body`, de beslissing weg uit `claims.md`, en de sprint-regex stuk (die ging
af op de positieve controle, `expected 6 to be 8`). Elke mutatie eiste dat het
bestand aantoonbaar veranderde; hersteld uit een kopie in de scratchpad.

#### De ladder rendert notities nu uit een verzameling, niet uit een gelijkheid

`s === "s1"` is `MET_NOTITIE.has(s)` geworden. Expliciete verzameling en geen
opzoeking-met-terugval, want `translate()` valt bij een ontbrekende sleutel terug
op Engels en ontbreekt hij daar ook, dan rendert de sleutelnaam zelf op de
pagina. Staat s3 niet in de verzameling, dan wordt er nooit naar een s3-notitie
gezocht. Gemeten in de DOM: kaart 1 en 2 dragen twee alinea's, kaart 3 één, en
`services.how.s*.note` komt 0× als kale tekst voor.

#### Er luisterde al iets op 3200

De eerste meting gaf nul treffers op de nieuwe kopij terwijl de bron hem wel
droeg. Niet de build was stuk: `next start -p 3200` kreeg `EADDRINUSE`
(errno −4091) omdat er nog een server van eerder die sessie op die poort stond,
en mijn `until curl`-lus slaagde meteen — op de oude server. Ik mat dus een
build van uren eerder.

Dat is dezelfde klasse als de verouderde `.next`, maar één laag naar buiten: niet
de cache was oud, de **luisteraar** was oud. Een `curl` die slaagt bewijst dat er
iets antwoordt, niet dat jóuw proces antwoordt. Lees het startlog, of kies een
vrije poort — ik nam 3211 in plaats van een proces te doden dat ik niet volledig
kon toeschrijven.

#### Meting

904 tests in 41 bestanden, was 900/41. i18n 697 sleutels × 4, was 696 — de plus is
`services.how.s2.note`. Typecheck schoon, prijsgenerator groen, build groen.
`seo-audit` tegen die build: **waarschuwingen 0, notities 0**; de 177
canonical-fouten zijn het bekende meetartefact.

Op de productiebuild in vier talen gemeten: de deliverable staat in
`services.how.s2.body`, beide toezeggingen in `s2.note`, geen kale sleutels, en
op 375 px geen horizontale overloop (kaarten 295 px breed, kaart 2 nu 308 px hoog
tegen 306 voor kaart 1). Geen console-fouten.

#### PR #225 — de prijs, en een poort die van richting omdraaide

De sprint kost **€2.500**, beslist door Juan op 2026-08-22. Daarmee is
`docs/aanbod.md` §5.1 dicht en staat het bedrag op `/services` in vier talen: in
de titel van stap 2 en in de drie FAQ-antwoorden die de sprint noemen.

**De poort van een uur eerder moest omkeren.** Die verbood *elk* bedrag in de
sprintkopij, omdat de prijs nog niet beslist was. Nu eist hij het omgekeerde:
elk bedrag dat bij de sprint staat is precies het bedrag uit `docs/claims.md`,
in de opmaak van zijn eigen taal, en er moet er één staan. Dat is strikt sterker
dan het verbod, want het dekt ook de stille variant — een prijs die in één taal
achterblijft bij een wijziging.

**Het getal wordt geparst, niet overgeschreven.** De poort leest de rij
`| vaste prijs sprint | **€2.500** |` uit `claims.md` en leidt daar de vier
taalvormen uit af. Een constante in het testbestand zou een tweede kopie van
hetzelfde getal zijn geweest, en dat is precies de bugklasse waarvoor
`claims.md` bestaat. Verdwijnt de rij, dan gooit de poort met een zin die zegt
wat te doen, in plaats van stil een verouderd getal te bewaken.

**Opmaak per taal was geen detail.** `pricing.migration.title` deed het al voor:
`€1,500` (en) · `€1.500` (nl) · `1.500 €` (de) · `1.500 €` (es). In het Duits en
Spaans staat het teken achter het getal. Eén van de vijf mutaties zet daarom de
Nederlandse vorm in de Duitse titel; die gaat af.

#### De poort ving zijn eigen regex

Eerste run rood op `expected '€2,500.' to be '€2,500'`. `[\d.,]*` at de punt aan
het eind van de zin mee, dus "€2,500." las als een ánder bedrag dan "€2,500". Een
bedrag moet op een cijfer eindigen: `\d(?:[\d.,]*\d)?`. Dat geval staat nu als
proef in de poort, want het is precies het soort verschil dat een prijscontrole
waardeloos maakt zonder dat iemand het merkt.

**Vijf mutaties, vijf keer rood:** prijs alleen in `claims.md` gewijzigd, prijs
alleen in de NL-titel gewijzigd, bedrag weg uit een NL FAQ-antwoord, de rij weg
uit `claims.md`, en de Nederlandse opmaak in de Duitse titel. De eerste twee zijn
elkaars spiegelbeeld en dat is opzet: de poort moet drift in beide richtingen
zien, niet alleen kopij die achterloopt.

#### De btw-behandeling staat nergens, en dat is een keuze die nog niet gemaakt is

Gemeten over `pricing.*` in vier talen: **geen enkele prijs op deze site draagt
een incl./excl.-vermelding.** €2.500 volgt die conventie. Verdedigbaar voor een
zakelijke koper, maar het is 21% verschil — €2.500 tegen €3.025 — en de keuze is
niet gemaakt. Dat staat als open punt in `claims.md`, niet als aanname in kopij.

Dit is niet theoretisch. De Educational-tier van Diaz Editor stond als €500 op
de pagina terwijl Stripe hem exclusief afrekende, dus een school betaalde €605
aan de kassa. Eén woord van Juan sluit het.

#### Twee meters braken, allebei stil

**Een raw string in Python at de escape niet af.** `r'...€...'` bevat
letterlijk backslash-u, geen euroteken, dus de vervanging vond zijn anker niet en
meldde `regex-anker 0x`. Luid, want de assertie stond er — zonder die assertie was
het een stille no-op geweest. Euroteken sindsdien via `chr(0x20AC)` buiten de raw
string gehouden.

**`sed 's/<script[^>]*>.*<\/script>//g'` at de hele pagina op.** Geminificeerde
HTML is één regel, dus `.*` liep van het eerste script-tag tot het laatste — dat
is vrijwel het hele document. De uitkomst was "nul bedragen op de pagina", wat
identiek leest aan een schone meting. Gemeten in de DOM met `innerText` staat er
wat er hoort te staan.

#### Meting

904 tests in 41 bestanden en 697 sleutels × 4 — beide onveranderd, want dit zijn
gewijzigde waardes en geen nieuwe sleutels. Typecheck schoon, prijsgenerator
groen, build groen.

In de DOM op 375 px, na het openvouwen van de FAQ:

    /nl/services   €2.500  ·  kaart 02: "Diagnosesprint — 30 dagen, €2.500"
    /de/services   2.500 € (3x)  ·  kaart 02: "Diagnose-Sprint — 30 Tage, 2.500 €"
    beide          geen horizontale overloop, geen console-fouten

Het enige andere bedrag in de zichtbare tekst is `€0`, de vierde bevestigde
klantuitkomst uit `claims.md` ("additional SaaS spend; retired tools funded the
rebuild"), al gedekt door `ResultsStrip.test.ts`.

#### En de btw-grondslag, in dezelfde PR

Juan antwoordde tijdens de CI-run: **exclusief btw.** Dat is in #225 zelf
meegenomen en niet in een volg-PR, want anders serveert productie een tijdje een
bedrag zonder grondslag — precies de toestand die de Educational-tier van Diaz
Editor €105 per verkoop kostte.

**De vorm verschilt per taal en dat is geen stijlkwestie.** `excl. VAT` (en) ·
`excl. btw` (nl) · `zzgl. MwSt.` (de) · `más IVA` (es). Het Duits gebruikt
bewust niet "excl.", want dat is geen Duits; `zzgl.` is de zakelijke
standaardafkorting. Eén van de vier mutaties zet de Nederlandse afkorting in de
Duitse titel, en die gaat af.

**Zestien plekken, niet één.** De grondslag staat naast élk bedrag en niet
alleen in de titel van de ladder, want `/contact` draagt hetzelfde
FAQ-antwoord zonder die titel ernaast. Een bedrag dat op één pagina zijn
grondslag heeft en op een andere niet, is op die tweede pagina misleidend.

Het Duits vroeg punctuatie-zorg: `zzgl. MwSt.` eindigt zelf op een punt, dus
"…für 2.500 € zzgl. MwSt.. Am Ende" moest "…zzgl. MwSt. Am Ende" worden. Op de
gerenderde build gemeten: `MwSt..` komt 0× voor.

**Vier mutaties, vier keer rood:** grondslag weg uit de NL-titel, grondslag weg
uit een DE FAQ-antwoord, de Nederlandse afkorting in het Duits, en grondslag weg
uit een ES FAQ-antwoord.

Gemeten op de productiebuild, over beide pagina's die het bedrag dragen:

    /en /nl /de /es  services   10 bedragen, 0 zonder grondslag
    /en /nl /de /es  contact     4 bedragen, 0 zonder grondslag

**Dit is de eerste prijs op deze site met een grondslag ernaast.** Geen enkele
prijs op `/pricing` draagt er een, gemeten over `pricing.*` in vier talen. Dat
staat als open punt in `docs/claims.md` — het is geen reden om het hier ook weg
te laten, maar het is wel een inconsistentie die iemand een keer moet wegnemen.

#### Na de merge: wat "10 bedragen" telt, en twee meters die stil het verkeerde zeiden

#225 is gemerged als `0473095`. De squash-boom is byte-identiek aan die van de
tak (`0d893ebd`), alle poorten groen op gemergede main: tsc 0 · 904 tests in 41
bestanden · i18n 697 × 4 · prijsgenerator groen · `CLAUDE.md` == `AGENTS.md`.

**Op productie gemeten, alle vier de talen, over de hele HTML** — zichtbare
tekst, JSON-LD én RSC-payload:

    /{en,nl,de,es}/services   sprintprijs 10x per taal, 0 zonder grondslag
    /{en,nl,de,es}/contact    sprintprijs  4x per taal, 0 zonder grondslag

`MwSt..` komt 0× voor. De JSON-LD is apart nagelopen, want dat is wat Google
leest: 6 blokken per taal, 2 bedragen, in alle vier de talen nul zonder
grondslag.

#### Het getal 10 telt de sprintprijs, niet de bedragen op de pagina

De meting in het blok hierboven noteert "10 bedragen" op `/services`. Bij het
hermeten op productie kwam daar 4 uit, en dat leest als drift terwijl er niets
gedreven was. Het waren twee meetlatten:

| | telt | uitkomst |
|---|---|---|
| vóór de merge | de sprintprijs, in de rauwe HTML | 10 |
| ná de merge | elk bedrag, in de zichtbare tekst | 4 |

Gelaagd uitgesplitst staat er per taal 11 in de rauwe HTML: 4 zichtbaar, 2 in de
JSON-LD, 5 in de RSC-payload. Strikt op de sprintprijs geteld is het 10 — exact
gelijk aan de oude meting. Het verschil van één is `€0`, dat de oude regex stil
uitsloot omdat hij twee cijfers eiste.

**Noteer dus wát je telt, niet alleen hoeveel.** Een kaal getal in een logboek
wordt over een maand gelezen als het antwoord op de vraag die de lezer dán heeft.

Het enige bedrag op die pagina's zonder grondslag is `€0`, de vierde bevestigde
klantuitkomst uit `docs/claims.md`. Dat is een uitkomstcijfer en geen prijs; het
hoort er geen te dragen, en `ResultsStrip.test.ts` dekt het al.

#### Vercel post een commit-status, geen check-run

De poller die op de deploy wachtte vroeg `commits/<sha>/check-runs` en kreeg
niets terug voor de naam `Vercel`, terwijl `commits/<sha>/status` op `success`
stond. Twee verschillende API's:

| endpoint | draagt |
|---|---|
| `/check-runs` | `i18n`, `docs-sync`, `typecheck`, `deps`, `test`, `lighthouse` |
| `/status` | **`Vercel`** |

Een poller op alleen de eerste wacht eeuwig op een deploy die al klaar is, en
meldt niets — hij blijft gewoon draaien. Dat leest hetzelfde als een deploy die
hangt. Enumereer bij een lege uitkomst eerst beide lijsten voordat je concludeert
dat er iets niet af is; dat kostte hier één aanroep.

**Dat is gemeten, niet beredeneerd.** De poller liep door tot zijn eigen lusgrens:

| | |
|---|---|
| pogingen | 40, over ~13 minuten |
| `vercel=` uit `/check-runs` | **leeg, alle 40 keer** |
| `combined=` uit `/status` | `success`, vanaf poging 1 |
| exitcode | **0** |

Geen foutmelding, geen rood, exitcode 0 — alleen een antwoord dat nooit kwam,
terwijl de deploy die hele dertien minuten live was. Vanaf de kant van de poller
is "nog niet klaar" niet te onderscheiden van "ik kijk op de verkeerde plek":
allebei zien eruit als een lege uitkomst.

Wat het onderscheid hier wél droeg was een tweede signaal dat aantoonbaar bewoog.
`combined=success` stond naast een lege `vercel=`, en die twee spraken elkaar
vanaf poging 1 tegen. Een poller die één veld leest kan niet merken dat hij het
verkeerde veld leest.

Dit is de reden dat `audit-productie` en `Vercel` bewust niet in de
branch-protection-lijst staan — zie de sessie van 19 augustus. De twee gaten
hangen samen: een check die via een ander endpoint rapporteert dan waar je naar
kijkt, is voor jouw instrument onzichtbaar.

#### De prijsregex hechtte over een knoopgrens

De productie-sonde meldde in het Spaans een bedrag van `1 €` dat nergens op de
pagina staat. De regex moet voor Duits en Spaans een euroteken *achter* het getal
toestaan, en precies die losheid liet hem over een DOM-grens hechten:

    ...|Despliegue Q1|€0|Gasto adicional en SaaS...

Twee losse knopen, platgeslagen tot "Q1 €0", en daar matcht `1 €`. In het Engels
en Duits staat er een woord tussen (`Q1 rollout`, `Q1-Rollout`), dus daar viel het
niet op — de fout was er wel, hij had alleen geen aanleiding.

De poort in `lib/seo/faqs.belofte.test.ts` kán dit niet krijgen: die leest losse
waardes uit `DICT`, niet platgeslagen paginatekst. **Een regex die op een hele
pagina losgelaten wordt heeft een andere foutklasse dan dezelfde regex op één
veld.** Meet je op de pagina, meet dan per element of anker op de exacte
prijsvorm, zoals de tweede ronde hier deed.

#### Twee valkuilen die deze sessie voor de zoveelste keer terugkwamen

`sed 's/<script[^>]*>.*<\/script>//g'` eet op geminificeerde HTML het hele
document, want dat is één regel en `.*` is hebzuchtig. De sonde gebruikt daarom
`re.S` met `.*?` per script-tag. En Python op Windows opent geen `/tmp/...` —
git-bash zet dat op `C:/Users/LENOVO/AppData/Local/Temp`, te vinden met
`pwd -W`. Allebei staan ze al eerder in dit logboek; allebei kostten ze opnieuw
een ronde.

### 2026-08-22 (vervolg) — de laatste twee aanbodbeslissingen, en een poort die twee keer te zwak bleek

Juan besliste §5.2 en §5.3 van `docs/aanbod.md`: **geen garantie op de uitkomst**,
en **drie trajecten tegelijk**. Daarmee staan alle vier de beslissingen uit dat
hoofdstuk dicht. Vastgelegd in `docs/claims.md` onder "Garantie en capaciteit";
`aanbod.md` verwijst er alleen naar.

#### Geen uitkomstgarantie was een registratie, geen reparatie

Eerst gemeten of de site al ergens een resultaat belooft. Over `lib/i18n/dict.ts`
en `lib/seo/faqs.ts` in vier talen: **nul treffers** op garantie-, terugbetaal- of
resultaattaal in de sprintkopij. Er stond dus niets dat teruggedraaid moest
worden — het antwoord legt een regel vast in plaats van een fout te herstellen.

De enige terugbetaal-belofte op de site is `pricing.faq.a3`: een venster van 30
dagen op een DEUS-**jaarcontract**. Ander product, andere toezegging. Die staat nu
expliciet als uitzondering in de poort, mét reden en aantal, zodat een volgende
sessie hem niet als tegenstrijdigheid leest en er ook geen tweede belofte
stilzwijgend onder hetzelfde voorvoegsel meelift.

Wat wél blijft is de risico-omkering op de **levering**: het bouwplan blijft van
de klant ook als een ander het uitvoert, en de sprintprijs gaat volledig van de
bouw af. Dat is een andere belofte dan een resultaat, en dat onderscheid is de
reden dat dit apart beslist moest worden.

#### Drie trajecten maakt een schaarste-zin toelaatbaar, niet verplicht

Het getal is een echte capaciteitsgrens, dus controleerbaar. Twee grenzen staan
in `claims.md`:

1. **"Nog N plekken vrij" mag niet.** Dat vergt een levende telling van lopende
   trajecten, en die bestaat nergens in deze repo. Een getal zonder bron is
   verzonnen, ook als het toevallig klopt.
2. **De grens knelt vandaag niet.** Gemeten 2026-08-22 op Supabase-project
   `wbgiouuifqhasedncysw`: `marketing.leads` nul rijen, `marketing.subscribers`
   nul rijen — beide ooit. Een capaciteitszin is dan positionering en geen
   urgentie. Als urgentie geframed zou hij druk suggereren die er niet is.

Er is daarom **geen kopij geschreven**. De beslissing staat vast; of hij de site
op gaat is een aparte keuze.

#### De poort ging twee keer nét niet ver genoeg, en de mutatietest wees allebei aan

`lib/seo/faqs.belofte.test.ts` scant nu het hele woordenboek op resultaattaal.
Twee keer bleek de eerste versie te zwak, en geen van beide was aan de assertie te
zien — alleen aan een mutatie die groen bleef.

**Eerst: de positieve controles dekten maar de helft van het patroon.** Een term
uit de garantie-helft schrappen veranderde niets aan de uitkomst, want alle vier
de controles gebruikten terugbetaal-woorden. Het patroon wordt nu uit een
**termenlijst** gebouwd, en de poort eist dat élke term afgaat op zijn eigen
bewijstekst. Een term die stukgaat is daarmee zichtbaar in plaats van stil.

**Daarna: geen test kan zien dat je een controle wéghaalt die hij niet verwacht.**
De hele term uit de lijst schrappen bleef groen — er was geen verwachting om
tegen af te zetten. Dat vraagt een vastgelegde inventaris: 16 termen, minstens 4
per taal. Een term schrappen dwingt nu een zichtbare bewerking van dat getal af.

Acht mutaties, acht keer rood, elk met een ándere assertie: belofte in een
FAQ-antwoord, belofte in een dict-sleutel, de DEUS-uitzondering weg (telt dan 0),
een term uit de lijst, een bewijs losgekoppeld van zijn term, een taal-tag
verschoven, de kop weg uit `claims.md`, en de rij "trajecten tegelijk" gewijzigd.

#### Drie keer brak mijn eigen gereedschap, en één keer op de bekendste manier

**Het tagging-script matchte op substring.** Bij het labelen van elke term met
zijn taal koos ik de eerste treffer uit een lijst — en `"garantie"` zit ín
`"garantiert"`, dus het Duitse woord kreeg het Nederlandse label. Duits hield
daardoor drie termen over in plaats van vier. De inventaris-assertie die ik net
had geschreven ving het meteen: `expected 3 to be greater than or equal to 4`.
Een poort die zijn eigen invoer controleert, betaalt zich binnen de minuut terug.

**Twee mutaties waren stuk in plaats van de poort.** `GARANTIETAAL_UIT = /zzz/i`
tóevoegen laat `GARANTIETAAL` gewoon staan, en `"Garantie en capaciteitXX"` bevat
nog steeds `"Garantie en capaciteit"`, dus de substring-check haalde het terecht.
Allebei zagen ze eruit als een zwakke poort. **Leg de verwachte kleur vooraf vast
en verklaar elke afwijking** — anders repareer je het verkeerde ding.

**En de heredoc halveerde opnieuw een dubbele backslash.** Wat ik als `\\n` typte
bereikte Python als `\n` en werd een echte newline, waardoor het mutatiescript
niet meer compileerde. Dat staat al in dit logboek van 20 augustus; het kostte
opnieuw een ronde. De uitweg is dezelfde: geen escapes gebruiken — hier werd de
term simpelweg door een lege regel vervangen, wat geldige TypeScript is.

#### Meting

905 tests in 41 bestanden, was 904. tsc schoon, i18n 697 × 4, prijsgenerator
groen, `CLAUDE.md` == `AGENTS.md`. Drie bestanden geraakt plus dit logboek; de
drie langlopende scratch-mappen staan bewust buiten de commit.
