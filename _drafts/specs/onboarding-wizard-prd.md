---
title: PRD — DEUS first-time onboarding wizard
status: draft
owner: Juan
target: customer #1 go-live (2026-05-13)
last_updated: 2026-05-06
---

# Onboarding wizard

## Problem statement

A brand-new admin signing into a fresh DEUS organization sees an empty dashboard with no contacts, deals, team, or vertical preferences set. Without a guided setup, the admin pokes at random nav items, doesn't invite their team, doesn't import contacts, and the org sits empty for a week — extending time-to-value past the point where the trial converts to a paid subscription.

## Goals

- **TTFV under 5 minutes** — from first sign-in, the admin reaches the "you're set up" screen within five minutes of focused work.
- **80%+ orgs reach "active" state in week one** — defined as: vertical confirmed + ≥1 teammate invited (or skipped explicitly) + ≥1 contact created or imported.
- **Zero handholding for customer #1** — Juan does not have to walk the admin through the steps over a call. The wizard self-serves.

## Non-goals

- **Multi-vertical onboarding** — admin picks one vertical (RE or hospitality) for v1. Toggling later is a settings action, not a wizard step.
- **Stripe / billing collection** — v1 onboards into a trial subscription; payment method is captured at trial-end. We don't ask for a card during the wizard.
- **Data migration from another CRM** — generic CSV import covers the 80% case. Salesforce/HubSpot connectors are post-MVP.
- **Permissions customization** — admin/manager/viewer is the role set; per-permission grids are not a wizard concern.
- **Tutorial videos / interactive tooltips** — copy + a clean UI is the bar for v1. Tooltips and a tour-mode are P2.

## User stories

- As a brand-new admin, I want a guided setup the first time I sign in so I know what to do without reading docs first.
- As an admin who skipped setup, I want to return to it later from a banner so I can finish in chunks (e.g., import contacts on Tuesday after talking to my team Monday).
- As an admin doing setup on my phone, I want each step to fit a 360px viewport so I can finish in the car between showings.
- As an admin who only wants to invite teammates and skip everything else, I want every step except "org details" to be skippable so the wizard doesn't force-feed me steps I don't need.
- As a viewer or manager who lands on `/philly/onboarding`, I want a clear "your admin handles this" message so I don't get stuck on a permission error.

## UX flow

Each step is its own URL so the path is shareable and the back button works as expected. A persistent progress indicator (1-of-5) sits at the top of the wizard frame.

| # | Path | On screen | Primary action | Skip | Required? |
|---|---|---|---|---|---|
| 1 | `/philly/onboarding/welcome` | Hero "Welcome to DEUS, [first name]". Two big cards: "Real estate team" / "Hospitality team". | Pick vertical → step 2 | — | **Yes** — selection persists `Organization.industry` |
| 2 | `/philly/onboarding/org` | Org name (pre-filled from signup), time zone (browser-detected default), default currency (EUR/USD/GBP). | Save → step 3 | — | **Yes** — fields validated server-side |
| 3 | `/philly/onboarding/team` | Up to 5 inline rows of `email + role` (admin/manager/viewer). Seat-counter shows 1 of 3 used (the admin themselves). | Send invites → step 4 | "Skip — I'll invite later" | No |
| 4 | `/philly/onboarding/contacts` | Two CTAs: "Upload a CSV" (links to `/philly/contacts/import`) and "I'll add them manually" (links to `/philly/contacts`). | Either choice → step 5 | "Skip" | No |
| 5 | `/philly/onboarding/calendar` | Connect Google or Outlook calendar. OAuth flow opens in a popup. | Connect → step 6 | "Skip" | No |
| 6 | `/philly/onboarding/done` | Confetti-light "You're set up". Three follow-up cards: "Run an AI insight", "Read the 5-page walkthrough", "Tour the audit log". | Go to dashboard → `/philly` with toast | — | — |

**Escape hatches:**
- Top-right "Close" button on every step → goes to `/philly` and shows a "Resume setup" banner on the dashboard until step is `done` or `skipped`.
- Browser back button works — each step is a real URL with its own server-rendered initial state.
- Refresh persists state; the wizard reads `Organization.onboardingStep` to know where to send the user.

**Mobile:** the wizard is a single-column stack on viewports < 640px. Buttons are full-width 44px-tall (touch target compliance per WCAG 2.5.5).

**A11y:** focus moves to the first interactive element on each step. Step heading is `<h1>`, primary action is the first focusable button. ESC closes the wizard.

## Data model changes

Add to `Organization`:

```prisma
model Organization {
  // ... existing fields
  onboardingStep        String   @default("welcome")   // welcome | org | team | contacts | calendar | done | skipped
  onboardingCompletedAt DateTime?
  onboardingSkippedAt   DateTime?
  // Set during step 2; canonical on the org. Replaces the existing
  // localStorage-only `pai-industry` preference for new orgs.
  // (Existing orgs keep working; the localStorage default still applies
  //  if the column is the default 'general'.)
  timeZone              String   @default("Europe/Amsterdam")
  defaultCurrency       String   @default("EUR")       // ISO 4217
}
```

No new model — the existing `Organization` row is the right home. A separate `OnboardingProgress` model would be over-engineered for 6 enum states.

## API surface

| Method | Path | Auth | Rate-limit | Body / Returns |
|---|---|---|---|---|
| GET | `/api/onboarding/state` | requireScope | PRESET_READ | `{ step, completedAt, skippedAt, gates: { hasTeammate, hasContact, hasVertical } }` |
| PATCH | `/api/onboarding/step` | requireRole(['admin']) | PRESET_MUTATION | `{ step: 'welcome'\|'org'\|... }` — moves cursor; rejects backwards moves except to/from `done` |
| POST | `/api/onboarding/skip` | requireRole(['admin']) | PRESET_MUTATION | `{}` — sets `onboardingSkippedAt = now`; bannerable |
| POST | `/api/onboarding/complete` | requireRole(['admin']) | PRESET_MUTATION | `{}` — sets `onboardingCompletedAt = now`, `step = 'done'`, writes audit row |
| PATCH | `/api/organizations/me` | requireRole(['admin']) | PRESET_MUTATION | `{ name?, industry?, timeZone?, defaultCurrency? }` — used in step 2 |

**Existing endpoints reused (no new code):**
- `POST /api/organizations/invites` — step 3 invites, one POST per email
- `POST /api/contacts/import` + redirect — step 4 CSV upload
- Calendar OAuth — step 5 hand-off (existing brand-side OAuth flow if available, else stubbed: shows "coming soon" + skip)

**Auth posture:** every wizard endpoint requires `admin` role. `manager` and `viewer` get a 403 from PATCH/POST; their UI shows a "your admin handles setup" message instead of the wizard.

## Telemetry

Single event channel: `onboarding_step` with payload `{ step, action, durationMs, organizationId, userId }`.

| Event | When | Action values |
|---|---|---|
| `onboarding_started` | First `GET /onboarding/welcome` from a fresh org | n/a |
| `onboarding_step_completed` | On every step advance | `welcome\|org\|team\|contacts\|calendar` |
| `onboarding_step_skipped` | When skip button is used | same set |
| `onboarding_completed` | `done` reached | n/a |
| `onboarding_resumed` | "Resume setup" banner clicked | n/a |

Pipe to `lib/philly/observability.ts → withSpan` (already used for SLO tracking) — the spans land in Sentry with `slo.bucket=ok` since onboarding has no latency budget; we just want event existence.

Audit row written on `onboarding_completed` via existing `logAudit({ entity: 'organization', action: 'update', changes: { onboarding: { old: 'in_progress', new: 'done' } } })`.

## Acceptance criteria

- [ ] Fresh admin (`Organization.onboardingStep = 'welcome'`) is auto-redirected to `/philly/onboarding/welcome` on first sign-in, regardless of where they tried to navigate
- [ ] Returning admin who didn't finish sees a "Resume setup" banner on `/philly` until `step = 'done'` or they explicitly dismiss
- [ ] Step 1 selection persists `Organization.industry` server-side; sidebar nav updates on next render
- [ ] Step 2 form rejects empty company name (Zod min-1) + invalid time zone (must be IANA-recognized) server-side
- [ ] Step 3 sends one POST to `/api/organizations/invites` per row; row-level errors stay inline (don't fail the whole step)
- [ ] Step 4 "Upload a CSV" fully redirects to `/philly/contacts/import`; step 4 "I'll add manually" → `/philly/contacts`
- [ ] Step 5 calendar OAuth runs in a popup; popup-blocked → inline error with "Try again" button
- [ ] Step 6 "Go to dashboard" calls `POST /api/onboarding/complete` then redirects to `/philly` with toast "Setup complete — welcome to DEUS"
- [ ] Manager + viewer hitting `/philly/onboarding/*` see a non-frightening empty state (not a 403 page)
- [ ] All 6 steps render under 360px without horizontal scroll
- [ ] Refreshing in the middle of any step keeps the user on that step
- [ ] Browser back navigates step-by-step
- [ ] Audit row written when `step` flips to `done`
- [ ] Telemetry events fire (verifiable in Sentry)
- [ ] No new vitest test fails; ≥6 new schema tests for the wizard endpoints

## Out of scope (v1) — future considerations (P2)

- **Tour-mode** — interactive tooltips that point at sidebar items after the wizard finishes
- **Personalized welcome video** — Juan-recorded 60-second intro per vertical
- **Salesforce / HubSpot importers** — full CRM-to-CRM migration
- **Per-vertical sample data** — pre-seed a tutorial deal so the dashboard isn't empty
- **Custom roles + permissions** — beyond admin/manager/viewer
- **Stripe payment capture during signup** — currently captured at trial-end
- **Calendar: iCal / Apple / others** — Google + Outlook for v1

## Open questions (genuinely unresolved)

- **eng**: Calendar OAuth — reuse Supabase social provider OAuth or hand-roll? Decision affects how we store the refresh token.
- **eng**: If admin self-deletes mid-onboarding, the org orphans. Acceptable for v1 (last-admin guardrail kicks in if they try) — confirm before merge.
- **ux**: Time-zone default — browser-detected vs hardcoded `Europe/Amsterdam`? Customer #1 is NL-based, browser-detect adds 1 line.
- **data**: Telemetry destination — Sentry is good for spans; do we ALSO need PostHog/Plausible for funnel analysis? Defer until customer #5.

## Estimated build

Single bundle, ~600-800 LOC:
- Prisma migration (~20 LOC)
- 4 API routes (~250 LOC)
- 6 page files + shared `OnboardingFrame` layout (~400 LOC)
- Banner component on `/philly` dashboard (~50 LOC)
- Schema tests (~80 LOC)

Fits in one PR. Target: merge by Wed 2026-05-08 to give 5 days of stabilization before customer #1 logs in Mon 2026-05-13.
