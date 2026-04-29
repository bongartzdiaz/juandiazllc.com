# Project memory — juandiazllc.com

Next.js 16 + Prisma 7 + Supabase marketing site + Philly CRM app.
Tests run via Vitest: `npm test`. Typecheck: `npm run typecheck`. Build: `npm run build`.

## SLOs (p95 latency budgets)
Defined in `lib/philly/observability.ts` (`SLO` const). Wrap critical
paths in `withSpan({ name, slo })` to tag Sentry spans with
`slo.bucket` (`ok` / `slow` / `error`) and `slo.over_budget`.

- `SLO.LOGIN` — 1,200 ms (auth.login, `app/actions/auth.ts`)
- `SLO.CREATE_DEAL` — 800 ms (deal.create, `POST /api/deals`)
- `SLO.AI_ACTION` — 15,000 ms — wrap-points:
  - ai.score, `POST /api/ai/score`
  - ai.contact-attributes, `POST /api/contacts/[id]/ai-attributes` (philly-standalone)

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

### Launch readiness — 2026-04-28 (updated 2026-04-29)

Bundles G–AG shipped on `claude/ai-command-bar`. The CRM is launch-
ready for big-company / EU-GDPR procurement subject to the operator
setup steps below.

**Bundles in this branch:**
- G — multi-org Membership + per-org last-admin guard
- H — DB migration for Contact AI attributes (Vercel AI SDK v5)
- I — SWR rollout on 28 dashboard list pages
- J — Sentry SLO-tagging on AI/login/create-deal paths
- K — security hardening: missing headers + Sentry PII scrub +
  audit-chain integrity CLI
- L — compliance docs: RoPA / sub-processors / DPIA / AI-Act
- M — enterprise auth: per-org IP allowlist + session idle timeout
- N — at-rest encryption for `Contact.notes`
- O — launch audit cleanup
- P — blind-index encryption (Contact.email + Contact.phone)
- Q — online key rotation (zero-downtime)
- R — SCIM 2.0 user provisioning (RFC 7643/7644)
- S — operator UI for `/api/admin/security`
- T — contact quick-view popover
- U — `ContactNote.content` at-rest encryption + `useApi.mutate` exposed
- V — quick-view popovers for deals + properties (projects already had inline modal)
- W — SWR migration for notifications + deals (uses `useApi.mutate` from U)
- X — contact bulk operations (select / change-type / delete) + CSV export (`lib/philly/csv.ts`)
- Y — contact inline edit (Edit button in ContactQuickView swaps to ContactForm)
- Z — test coverage push: `pagination` / `safe-error` / `utils` / `audit-verify` (+55 tests)
- AA — saved views per user/org on contacts / deals / properties (`SavedView` table, `/api/views`, `useSavedViews` hook, `SavedViewsBar` chip-bar)
- AB — global keyboard shortcuts (`?` cheat sheet, `g {c,d,p,k,i,n,s,a,h}` nav chords, `/` focus search) via `useGlobalShortcuts` hook + `<KeyboardShortcuts />` mounted in `ProtectedShell`
- AC — column customization on the deals list view (`useColumnPrefs` localStorage hook + `<ColumnPicker>` popover, persists per-browser per-table)
- AD — right-click context menu on contact cards (Open / Quick view / Edit / Select / Copy email / Copy phone / Delete) via reusable `<ContextMenu>` primitive
- AE — context menu propagation to deals (list + kanban: Mark won/lost, Copy contact, Delete) and properties (list: Valuation deep link, Copy address, Delete)
- AF — `j` / `k` / `Enter` row navigation on the deals list view (focused row gets accent ring, scrollIntoView on move, hover updates focus too)
- AG — drag-drop reorder on the contacts page (live mode only): adds `Contact.displayOrder BIGINT NULL` + index, new migration `20260429000000_contact_display_order`, optimistic UI override, `POST /api/contacts/reorder` with rate-limit + transaction

**Verified at HEAD:**
- `npm run build` clean on both apps (root + standalone)
- `npm run typecheck` clean on both
- **483/483** standalone tests + 281/281 root tests green
- `npm run audit:tenant` clean
- `npm run audit:chain` ready (run daily in production)

**Operator setup required before customer traffic:**
1. `prisma migrate deploy` — six pending migrations:
   `20260428000000_multi_org_membership`,
   `20260428010000_contact_ai_attributes`,
   `20260428020000_enterprise_access_controls`,
   `20260428030000_contact_blind_index`,
   `20260428040000_apikey_scopes`,
   `20260429000000_contact_display_order`.
   (`SavedView` is in the schema already; verify it's in your DB and
   create-if-missing — no dedicated migration was needed because the
   model was added to the schema in an earlier branch.)
2. Set both encryption secrets in production env (32+ bytes each,
   distinct values):
   - `INTEGRATION_SECRET` — AES-256-GCM key for at-rest encryption
   - `BLIND_INDEX_SECRET` — HMAC-SHA-256 key for the email/phone
     blind-index search columns
3. Run the backfills (in this order, dry-run first):
   - `npm run pii:backfill` (encrypts `Contact.notes`)
   - `npm run pii:backfill-notes` (encrypts `ContactNote.content` — Bundle U)
   - `npm run pii:backfill-hashes` (encrypts `Contact.email`/`phone`
     and populates the hashes)
4. Lawyer review of `docs/legal/{DPA,PRIVACY-NOTICE,COOKIE-POLICY,
   BREACH-RESPONSE,RECORDS-OF-PROCESSING,SUB-PROCESSORS,
   DPIA-AI-ATTRIBUTES}.md` and fill in placeholder fields.
5. Per-customer SSO wiring per `docs/operations/SSO-SETUP.md`.
6. Per-customer SCIM tokens per `docs/operations/SCIM-SETUP.md`
   (issue `ApiKey` row with `scopes: ["scim:users"]`).

**Deferred (post-launch follow-ups):**
- SCIM Groups → role/sections mapping (today: User-only).
- SCIM `externalId` round-trip persistence.
- Quick-view popover propagation to projects (the page already
  has an inline detail modal, so this is style-only — keeping the
  existing pattern).
- CopilotKit inline-generative-UI; Liveblocks presence on deal pages.
- DeepL: ~60 hand translations (operator-side).
- `Testimonials.tsx` — intentionally empty placeholder until Juan
  signs off on quotes; renders null today, no runtime leak.
- `SEO.md:128` `/docs/pitch-template.md` TODO (operator content,
  not code).
- Advanced features remaining after Bundles AA–AG:
  - Advanced filter builder (server-side query DSL — bigger lift, needs
    product spec on field + operator vocabulary).
  - Column customization propagation to remaining table-shaped pages
    (transactions, grants, volunteers, documents, inbox, referrals —
    same `useColumnPrefs` hook + `<ColumnPicker>` as Bundle AC).
  - Context-menu items for the projects page (the page already has
    its own inline detail modal so the lift is smaller — just per-page
    menu items, the primitive is shared).
  - `j/k` row navigation propagation to the deal kanban + the
    properties grid (today AF only covers the deals list view).
  - Drag-drop reorder propagation to deals/properties (`displayOrder`
    column add + analogous reorder endpoint).

### Saved views — Bundle AA reference

`SavedView { organizationId, userId, entity, name, filtersJson,
columnsJson, sortJson, isShared, isDefault }`. Per-user views are
private; setting `isShared=true` exposes them to the org.

API:
- `GET    /api/views?entity=<contacts|deals|properties>` — own + shared
- `POST   /api/views { entity, name, filtersJson, isShared? }` — rate-limited
- `PATCH  /api/views/[id]` — owner (or admin/manager for shared) edits
- `DELETE /api/views/[id]` — owner (or admin/manager for shared) deletes

Client:
- `useSavedViews(entity)` — `{ views, saveCurrent, rename, deleteView, refetch }`
- `<SavedViewsBar entity currentFilters onApply />` — chip bar with
  inline Save / share-with-org toggle / hover-delete.

When wiring a new entity:
1. Choose what to persist into `currentFilters` (a `Record<string, unknown>`).
2. Implement `applySavedView(view)` to extract back into your local
   state setters (the hook is intentionally agnostic about what each
   filter shape contains — unknown keys are ignored).
3. Hide the bar in demo/showcase modes that use hand-curated rows
   (we do this on the contacts page for `realestate`/`hospitality`).

### Keyboard shortcuts — Bundle AB reference

`<KeyboardShortcuts />` is mounted once in `ProtectedShell`
(components/philly/layout/ClientLayout.tsx). It listens via
`useGlobalShortcuts(handlers)` — a hook that:

- Suppresses keys while the focus is on input/textarea/select or
  contenteditable (so search inputs aren't hijacked).
- Ignores meta/ctrl/alt-modified keys (those belong to the OS or
  the command palette's `cmd+K`).
- Supports two-key chord prefixes ("g c" → Contacts) with a 1.2s
  expiry between presses.

Bindings today:
- `?` — opens the cheat-sheet modal
- `/` — focuses the first visible search input via
  `focusFirstSearchInput()` (matches `[type=search]` /
  `[placeholder*="Search" i]` / `[aria-label*="search" i]`)
- `g h|c|d|p|k|i|n|s|a` — navigate to home / contacts / deals /
  properties / projects / insights / notifications / settings /
  audit

To add a shortcut: edit the `useGlobalShortcuts({...})` map in
`KeyboardShortcuts.tsx` AND add the row to the `NAV` or
`ACTIONS` array in the same file so the cheat sheet stays honest.

### Column customization — Bundle AC reference

`hooks/philly/useColumnPrefs(storageKey, defaults)` returns
`{ visible, toggle, setAll, reset, isOverridden }`. Persists the
visible column id set to localStorage under the supplied key
(versioned: `pai-deals-columns-v1`). Defaults live in the page
file as a `ColumnDef[]` so the picker can label them; widths
live in a sibling `Record<string, string>` so the grid template
can be recomputed on visibility change.

`<ColumnPicker columns visible onToggle onReset isOverridden />`
renders the toolbar button + popover. Outside-click + Escape
close it. `required: true` on a `ColumnDef` makes it un-toggleable.

Today only the deals list view uses it; the contacts page uses
cards (no columns) and the properties page uses a card grid.
Lift to other table-shaped pages by:
1. Defining `<ENTITY>_COLUMN_DEFS`, `<ENTITY>_COLUMN_DEFAULTS`,
   `<ENTITY>_COLUMN_WIDTHS` constants near the top of the page.
2. Calling `useColumnPrefs('pai-<entity>-columns-v1', defaults)`.
3. Memoising the visible columns + grid template, then mapping
   over `visibleColumns` in both the header and each row.

### Right-click context menu — Bundle AD reference

`<ContextMenu x y items onClose />` is a viewport-positioned
popover with auto-clamping. Closes on outside click, Escape,
scroll, and resize. Items are either:

- `{ kind: 'action', label, icon?, onClick, shortcut?, destructive?, disabled? }`
- `{ kind: 'separator' }`

Per-page wiring:
1. Add an `onContextMenu` handler on each row/card that calls
   `e.preventDefault()` + sets `{ x: e.clientX, y: e.clientY,
   <entityId> }` in state.
2. Render `<ContextMenu>` conditionally at the bottom of the
   page when state is non-null.
3. Build the `items` array inside the conditional so it can
   close over the targeted entity's data (used for "Copy email"
   / disable-when-empty / etc.).

Wired today on contacts, deals (list + kanban), and properties.
Items are page-specific — see each page file for its `items` array.

### `j` / `k` row navigation — Bundle AF reference

Implemented inline on `app/deals/page.tsx` only (list view). Pattern:

1. `[focusedDealId, setFocusedDealId] = useState<string | null>(null)`
2. `rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())` —
   each rendered row populates this in its `ref` callback.
3. `useGlobalShortcuts({ j, k, Enter }, view === 'list')` — the
   second arg disables the bindings outside the list view so kanban
   keyboard input still fires the kanban-native shortcuts.
4. `moveFocus(delta)` clamps to `[0, visibleDeals.length - 1]`,
   updates state, calls `el.scrollIntoView({ block: 'nearest' })`.
5. Hover on a row updates `focusedDealId` so the keyboard and
   mouse focus always agree.
6. A `useEffect` resets the focus when the focused id no longer
   appears in `visibleDeals` (filter / search changed).

To extend to another list-view page: copy items 1–6, swap the
shortcut hook's enabled-condition, and adjust the `Enter` handler
to push the right detail route.

### Drag-drop reorder — Bundle AG reference

Adds manual ordering to the contacts list. Live mode only — demo
industries (RE / HOS) keep their hand-curated arrays.

Schema:
- `Contact.displayOrder BIGINT NULL` + composite index
  `(organizationId, displayOrder)`.
- Migration `20260429000000_contact_display_order` is idempotent
  (`ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`).

API:
- `POST /api/contacts/reorder { ids: string[] }` — rate-limited
  via `PRESET_MUTATION`, requires admin/manager. Caps at 500 ids
  per call. Verifies every id is in the caller's org, drops the
  rest silently (so a deleted-in-another-tab contact doesn't fail
  the whole batch). Writes `displayOrder = idx + 1` for the kept
  ids inside a single `prisma.$transaction`.

UI:
- `dragId / dragOverId / orderOverride` state on the contacts page.
- `<Link>` cards get `draggable={isLive}` + `onDragStart/Over/Leave/Drop/End`.
- Visual: dragged card → `opacity 0.55`; drop target → 2-px accent
  ring + accent border. Feedback is purely CSS, no flash.
- `orderOverride` is an array of contact ids that takes precedence
  over the server's order until the next `apiQuery.refetch()`.
  Filters/search apply AFTER the override, so reordering inside a
  filtered view doesn't disturb hidden rows.

To extend to deals/properties: add `displayOrder` to the model +
matching migration + `/api/<entity>/reorder` route, then copy the
state + handler block from `app/contacts/page.tsx`.

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
