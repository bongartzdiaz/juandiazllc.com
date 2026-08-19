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

> De dekkingsnotitie bovenaan dit bestand ("~1% file coverage", april 2026)
> gaat over `lib/philly/*` en klopt daar nog grotendeels. De marketingkant
> staat inmiddels op ~~989 tests~~; verwar die twee niet.
>
> ⚠️ **Dat getal was opgeblazen** door de vitest-exclude hierboven (PR #176).
> Gemeten op main na de fix, 2026-08-19: **708 tests in 23 bestanden**. Het
> verschil is zod, niet ons werk.
