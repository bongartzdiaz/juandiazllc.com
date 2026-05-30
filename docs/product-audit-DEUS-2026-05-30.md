# DEUS CRM — Product Audit (2026-05-30)

Scope: the DEUS multi-tenant CRM under `app/philly/*`, `components/philly/*`,
`lib/philly/*`, `hooks/philly/*`, `i18n/philly/*`, `messages/*`,
`prisma/schema.prisma`. Companion to the security audit
(`docs/security-audit-DEUS-2026-05-29.md`); this report covers the domains
the security audit did NOT: localization, accessibility, UI/UX, frontend &
backend code quality, and data consistency.

Method: 4 parallel evidence agents over the real code (run
`wf_b033b5b9-e68`), every finding carries file:line evidence. No assumptions —
items that could not be confirmed from the source are listed under
"Not verifiable" per domain.

> **Architecture fact (load-bearing):** the CRM database is **MySQL/MariaDB**
> with **no row-level security**. Tenant isolation is enforced 100% in
> application code via `organizationId` filters (or, for `Deal`/`PipelineStage`,
> via the `pipeline.organizationId` relation). One missing filter = a
> cross-tenant leak. This shaped the Critical finding below.

---

## A. Executive summary

The CRM is feature-broad and visually consistent, but enterprise-readiness is
gated by four systemic issues, in priority order:

1. **One confirmed cross-tenant data leak (BE-01, Critical) — FIXED this
   session.** The dashboard summary aggregated `Deal` rows with no org filter,
   so every tenant's dashboard summed pipeline value and revenue across *all*
   organizations. Fixed by scoping the three deal queries through
   `pipeline.organizationId`, and the tenant-scope lint (A-03) was extended to
   cover relation-scoped models so this class can't recur.
2. **Accessibility has two Critical contrast failures** (white-on-accent
   buttons 1.86:1; muted `--txt3` 2.2–2.6:1) plus a near-total absence of
   semantic headings — the product is not WCAG 2.1 AA today.
3. **Localization is half-built.** 4 locales exist with perfect message-key
   parity, but 28/73 pages are hard-coded English, the in-app switcher only
   toggles en↔nl (DE/ES unreachable), and number/date/currency formatting is
   locale-blind.
4. **Frontend reliability/UX debt:** fetch errors are silently swallowed as
   empty data on ~94 sites, flagship pages render fabricated demo data into a
   real empty/erroring tenant, and validation/audit-diff coverage is uneven on
   the backend.

Severity tally (≈55 findings): **Critical 3** (BE-01 fixed → 2 open: both
A11Y contrast), **High 15**, **Medium 22**, **Low 13**, **Info 2**.

Verdict: **not enterprise-ready** until the Critical + High items in the
roadmap (§N) are closed. None of the remaining items is a multi-week rewrite;
most are bounded, mechanical fixes on an otherwise sound foundation.

---

## B. Verified current state vs not verifiable

**Verified healthy (keep):**
- next-intl message files have exact key parity: en/nl/de/es each 475 keys, 0
  missing/extra. Marketing dict (`lib/i18n`) ~681 keys × 4, parity-tested.
- Shared `Modal` is genuinely accessible: focus trap, Escape, focus-return,
  `role=dialog`/`aria-modal`/`aria-labelledby`, labelled close button.
- Global `:focus-visible` ring on button/input/a/select/textarea; inputs with
  `outline:none` compensate with a box-shadow ring.
- SWR data layer (`hooks/philly/useApi.ts`) is correct (dedup,
  keepPreviousData, revalidate, error-retry) — the gap is adoption, not design.
- Toast system mounted once in `ClientLayout`; `alert()` nearly eliminated.
- Pagination consistent on internal list routes (`parsePagination` +
  `paginatedResponse`, MAX_LIMIT=200).
- Primary list/detail routes (deals, offers, transactions, commissions,
  calendar, inbox, contact activity) ARE correctly org-scoped.
- v1 public API applies the cross-org FK guard on POST + PATCH (A-02).

**Not verifiable from static artefacts (needs a running build / live data):**
- Runtime screen-reader behaviour, 200%/400% zoom reflow, exact composited
  contrast of rgba-over-texture tokens.
- Real visual text-expansion/truncation of DE/ES strings in the rendered UI.
- Whether the RE/HOS demo "showcase" verticals are ever exposed to paying
  customers (gating is UI-state).
- Production deploy target (serverless vs long-lived Node) — determines impact
  of fire-and-forget webhook dispatch (BE-13) and detached report generation.
- Whether a CSV export of contacts/deals exists and localizes headers/cells
  (no such route found under `app/philly/api`).

---

## C. Product map & module inventory

| Area | State | Notes |
|---|---|---|
| Auth / SSO | present | Supabase session → MariaDB `User`; deny-by-default provisioning (A-01) |
| Dashboard | present | `app/philly/page.tsx` (1,381 LOC) renders **hardcoded demo data**, no live fetch; `/api/dashboard/summary` is the live source (BE-01 fixed) |
| Contacts/leads | present | list + detail + bulk + import; falls back to `DEMO_CONTACTS` (FE-02) |
| Pipeline/deals | present | kanban + deals list/detail; stage-transition not validated (BE-02), reorder ownership gap (BE-03) |
| Tasks/notes/activities | present | activity feed org-scoped via parent |
| Calls/dialer | present | raw-fetch pages |
| Email/SMS | present | hard-coded English; SMS error envelope mixed (BE-07) |
| Reports | present | English-only; HTML built by string-concat (BE-10) |
| Settings (team/privacy/billing/api-keys/webhooks/integrations/pipelines) | present | mostly English-only (LOC-02) |
| Admin / audit log | present | audit diffs often empty (BE-08) |
| Integrations / calendar OAuth + push-sync | present | per-user; English-only UI |
| Outreach (li.*) | present | single-tenant; operator-guarded this session (A-13) |
| Multilingual settings | partial | switcher en↔nl only (LOC-01) |

73 CRM pages total; all client components. ~100 API route handlers.

---

## D. Page & feature audit (highlights)

- **Dashboard** renders only mock arrays (`CSR_MONTHLY`, `RE_MONTHLY`, …) — no
  live data; the real `/api/dashboard/summary` exists but the page does not
  consume it. (FE-02, FE-08)
- **Contacts / Projects / Kanban** show fabricated `DEMO_*` records when the
  live list is empty *or* a fetch fails. (FE-02)
- **38 of 73 pages** have no failure-distinct state — load error renders as
  the empty state. (FE-01, FE-10)
- **14 pages** re-implement modals inline (no focus trap/ESC/focus-return)
  instead of the shared `Modal`. (FE-05, A11Y-11)
- **25 pages** gate destructive deletes on native `window.confirm()`; kanban
  delete silently swallows failure. (FE-06)

## E. End-to-end flow audit (gaps)

- **Language switch mid-session** only reaches nl; DE/ES users are stuck.
  Document `<html lang>` does not follow the CRM locale. (LOC-01, LOC-04,
  A11Y-07)
- **Won/Lost deal flow** captures no reason and does not require `actualClose`;
  a "won" deal without `actualClose` silently vanishes from the revenue chart.
  (BE-04)
- **Keyboard-only** users cannot sort tables, open kanban cards, or operate the
  command palette by element. (A11Y-08, A11Y-10, A11Y-12)
- **Bulk update** with no recognised field issues an empty `updateMany` → 500
  instead of 400. (BE-12)

## F. Localization / multilingual audit

| ID | Sev | Finding |
|---|---|---|
| LOC-01 | High | In-app switcher only toggles en↔nl; DE/ES unreachable despite full translations (`hooks/philly/useLocale.ts:4,37`) |
| LOC-02 | High | 28/73 pages hard-coded English (dashboard, billing, reports, most settings) |
| LOC-03 | High | Number/date/currency locale-blind; `formatCurrency` defaults `en-US`; 154 hard-coded `Intl`/`toLocale` locale args |
| LOC-04 | Med | Root `<html lang>` reads `jdl_locale` not CRM `pai-locale` (SC 3.1.1) |
| LOC-05 | Med | aria-labels/screen-reader text hard-coded English even where visible text is translated |
| LOC-06 | Med | Invite emails hard-coded English, no locale param (backend not locale-aware) |
| LOC-07 | Med | Help-center 20 articles English-only (only drawer chrome translated) |
| LOC-08 | Low | Form placeholders hard-coded English |
| LOC-09 | Med | Hard-coded English label maps + `timeAgo` in `lib/philly/utils.ts` bypass i18n |
| LOC-10 | Low | A few NL/DE values byte-identical to EN (e.g. `nav.auditLog`) |
| LOC-11 | Low | `Sidebar`/`useLocale` still assume en\|nl-only prefixes/guards |
| LOC-12 | Low | No pseudo-localization tooling; fixed 240px sidebar risks DE/ES overflow |
| LOC-13 | Info | `translate()` silent English fallback is a latent regressor (mitigated by current parity) |

## G. UI audit

- Inline styles everywhere: **3,465 `style={{`** occurrences, 0 CSS modules /
  Tailwind classes; recurring primitives (input/select/badge) re-declared
  per file → design drift. (FE-04)
- `StatusBadge` exists but only 2 pages use it; ~35 pages hand-roll badges.
- Tokens (`var(--*)`) usage is good and consistent — centralise the recurring
  shapes, keep the tokens.

## H. UX audit

- Error-as-empty and demo-as-fallback (FE-01/FE-02) are the biggest trust
  hazards. No undo on destructive actions (FE-06). No skeletons; "Loading…"
  text only (FE-10). Un-paginated full-list render on contacts/timeline scales
  poorly with org size (FE-07).

## I. Accessibility audit (WCAG 2.1 AA)

| ID | Sev | Finding |
|---|---|---|
| A11Y-01 | **Critical** | White text on `--accent` = 1.86:1 (dark) on all primary CTAs (Save/Add/Submit) |
| A11Y-02 | **Critical** | Muted `--txt3` = 2.2–2.6:1 (light) — placeholders, table headers, timestamps |
| A11Y-03 | High | No heading elements on most pages; page title is a styled `div` |
| A11Y-04 | High | Form labels not associated (`htmlFor`/`id` missing) app-wide |
| A11Y-05 | High | Errors not linked to fields; required is visual-only |
| A11Y-06 | High | Toasts not announced (no `aria-live`/role) — incl. validation errors |
| A11Y-07 | High | `<html lang>` doesn't track CRM locale |
| A11Y-08 | High | DataTable sort headers + custom checkboxes lack semantics/keyboard |
| A11Y-09 | Med | Tab UIs lack tablist/tab/tabpanel roles |
| A11Y-10 | High | Clickable card/row `div`s not keyboard-operable (kanban, palette, table) |
| A11Y-11 | Med | Kanban add-card modal has no focus trap/return |
| A11Y-12 | Med | CommandPalette lacks combobox/listbox ARIA |
| A11Y-13 | Med | API-key reveal toggle removed from keyboard (`tabIndex=-1`) |
| A11Y-14 | Low | `window.confirm/alert` + unlabeled icon buttons |
| A11Y-15 | Low | A few standalone status dots rely on colour alone |
| A11Y-16 | Info | Modal/focus-ring/MobileNav/native-date verified correct — preserve |

## J. Frontend code audit

| ID | Sev | Finding |
|---|---|---|
| FE-01 | High | Fetch errors swallowed as empty (94 sites); only 2/73 pages show an error state |
| FE-02 | High | Flagship pages render fabricated `DEMO_*` on empty/failed fetch; dashboard is all mock |
| FE-03 | Med | 37 pages hand-roll useEffect+fetch instead of SWR `useApi` (~12% migrated) |
| FE-04 | Med | Pervasive inline styles, no shared style layer |
| FE-05 | Med | 14 inline modal re-implementations bypass the accessible `Modal` |
| FE-06 | Med | Native `confirm()` deletes (25 pages); kanban swallows failure; no undo |
| FE-07 | Med | Client-side-only filtering, no pagination/virtualization on big lists |
| FE-08 | Med | Oversized page components (1,381 / 1,160 / 1,043 LOC …) |
| FE-09 | Low | Dead/duplicated components (`ApiErrorBanner` orphaned; two `NotificationBell`) |
| FE-10 | Low | Minimal/inconsistent loading; no skeletons |

## K. Backend / API audit

| ID | Sev | Finding | Status |
|---|---|---|---|
| BE-01 | **Critical** | Dashboard deal aggregates omitted org filter → cross-tenant numbers | **FIXED 2026-05-30** |
| BE-02 | High | Deal stage transition never validates stage∈pipeline/org | open |
| BE-03 | High | Pipeline-stage reorder updates arbitrary stage IDs w/o ownership check | open |
| BE-04 | Med | Won/Lost capture no reason, no required `actualClose` → silent revenue drop | open |
| BE-05 | High | ~74 mutation routes use raw JSON + ad-hoc checks vs ~29 Zod | open |
| BE-06 | Med | v1 API skips Zod + writes no audit row | open |
| BE-07 | Med | Inconsistent response envelopes across the API | open |
| BE-08 | Med | PATCH routes log audit rows with empty change diffs | open |
| BE-09 | Med | Internal create routes lack the cross-org FK guard the v1 API has | open |
| BE-10 | Med | Report HTML built by string-concat (stored-XSS) + unawaited generation | open |
| BE-11 | Med | Inbound webhook: no idempotency, no signature verification | open |
| BE-12 | Low | Bulk update/delete: unvalidated enums, empty `updateMany`, N+1 audit, no tx | open |
| BE-13 | Low | Realtime/webhook dispatch fire-and-forget (may not complete on serverless) | open |
| BE-14 | Low | Stale derived commission fields on `Deal` never recomputed | open |
| BE-15 | Low | Date query params parsed via `new Date()` without validation | open |
| BE-16 | Low | `serverError()` (500-logger) misused for 400s — pollutes error dashboards | open |
| BE-17 | Low | Scoring batch queries `.catch(()=>[])` → silent degraded scores | open |

## L. Data consistency, performance, security, observability

- **Tenant correctness** is the dominant theme: BE-01 (fixed), BE-02/03/09
  (FK/stage ownership) are the same class the security audit's A-02/A-03
  flagged. The new tenant-scope lint (A-03, extended for `Deal`/`PipelineStage`
  this session) is the structural backstop.
- **Reporting truth**: BE-04 (won w/o actualClose) and BE-14 (stale commission
  cents) silently produce wrong numbers.
- **Performance**: un-paginated lists (FE-07), 73 client components + recharts
  per page (bundle impact not measured).
- **Observability**: BE-08 (empty audit diffs) and BE-16 (mislabelled 500s)
  degrade the audit/forensic and error-monitoring signal.

## M. Testing & release readiness

- 395 unit/integration tests (vitest); strong on crypto/auth-helpers/SSRF/
  validation/calendar/stripe. **No** route-handler integration tests, no e2e,
  no per-locale screenshot/pseudo-loc tests, no automated a11y (axe/pa11y)
  in CI.
- CI gates today: `typecheck`, `test`, and the new `tenant-scope` lint.
- **Release blockers (must close before enterprise/customer-#2):** the 2 open
  Critical a11y contrast items, BE-02/BE-03/BE-09 (tenant-write correctness),
  LOC-01 (DE/ES reachable).

## N. Prioritized roadmap

**P0 — Critical (this week)**
1. ~~BE-01 dashboard deal org-scope~~ ✅ done 2026-05-30.
2. A11Y-01 + A11Y-02: define per-theme `--accent-fg` and darken `--txt3` to ≥4.5:1.
3. BE-02 + BE-03 + BE-09: apply `findCrossOrgForeignKey`/stage-ownership checks
   to internal create/update + stage reorder (close the remaining tenant-write
   gaps the lint can't see at the FK level).

**P1 — High (this sprint)**
4. LOC-01: 4-locale keyboard-accessible language picker; widen `useLocale`.
5. LOC-02: externalize the 28 English-only pages (start dashboard + billing).
6. LOC-03: thread active locale through all formatters.
7. A11Y-03/04/05/06/08/10: headings, label association, `aria-live` toasts,
   table + clickable-row keyboard semantics.
8. FE-01 + FE-02: real error states via `ApiErrorBanner`; gate `DEMO_*` behind
   an explicit demo flag, never as a live-tenant fallback.
9. BE-05: Zod schemas for the ~74 raw-JSON mutation routes (money/enums first).

**P2 — Medium**
10. FE-03 SWR rollout, FE-05 modal consolidation, FE-06 styled+localised confirm
    dialogs, BE-06/07/08/10/11 (v1 Zod+audit, envelope, audit diffs, report
    escaping, webhook idempotency), LOC-04..09.

**P3 — Low / hardening**
11. FE-07 pagination/virtualization, FE-08 component splitting, FE-09 dead code,
    BE-12..17, LOC-10..13, pseudo-loc + axe + per-locale screenshots in CI.

## O. Appendix — exhaustive CRM checklist

Localization: ☑ key parity · ☐ all strings externalized · ☐ switcher reaches
all locales · ☐ locale-aware formatting · ☐ translated aria/emails/help · ☐
pseudo-loc + expansion test.
Accessibility: ☐ AA contrast · ☐ headings · ☐ label association · ☐ error
wiring · ☐ live-region status · ☐ keyboard for all interactive · ☑ modal focus
mgmt (shared) · ☐ `<html lang>` tracks locale.
Frontend: ☐ error/empty/loading distinct · ☐ no demo-as-fallback · ☐ SWR
everywhere · ☐ shared style layer · ☐ shared modal everywhere · ☐ undo on
destructive · ☐ pagination/virtualization.
Backend: ☑ dashboard org-scope (fixed) · ☐ stage/FK ownership on internal
writes · ☐ Zod on all mutations · ☐ uniform envelope · ☐ audit diffs · ☐ v1
audit+validation · ☐ webhook idempotency+signature · ☐ report HTML escaping.
Data: ☐ won/lost reason+actualClose · ☐ recompute/drop derived commission ·
☑ pagination clamp.
Release: ☑ typecheck+test+tenant-scope CI · ☐ route/e2e tests · ☐ per-locale
screenshots · ☐ automated a11y in CI.

---

*Generated 2026-05-30. Findings IDs are stable; reference them in commits/PRs
(e.g. "fixes BE-02"). BE-01 fixed in the same session this report was written.*
