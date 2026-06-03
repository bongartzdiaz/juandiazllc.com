# PR #12 — DEUS multi-tenant readiness + launch sweep

## Summary

Multi-tenant readiness for first-customer go-live (target Tue **2026-05-19**, Hetzner cutover Fri **2026-05-15**). Every commit typecheck-clean. **358/358 vitest pass**. Zero KRITIEK / zero HIGH compliance findings.

The branch covers two arcs:

1. **Readiness sprint** (2026-05-06): seats, GDPR, settings UIs, CSV import, hardening, sync workflow, docs, onboarding wizard, customer-facing legal/onboarding/pricing drafts.
2. **Post-launch-clean sprint** (2026-05-08): channel pruning + delta-sync pagination, Bundle D4 event persistence (Art. 9 minimal), help center + drawer, QuickStart cards + public /status, full 4-locale i18n shells, WCAG fixes, DLP cross-contact leak fix, customer-#1 onboarding rehearsal runbook.

## Commits at a glance

| Phase | Commit | Bundle |
|---|---|---|
| 1 | `c364cd5` | DEUS rebrand + nav scope-cut |
| 1 | `0249558` | Seats + invites + accept flow |
| 1 | `377c821` | DSAR export + erasure (Art. 15 + 17) |
| 1 | `388b113` | Settings UIs (team + privacy) |
| 1 | `f074371` | Contacts CSV import + mapper |
| 1 | `e974e34` | Industry URL gate + health endpoint upgrade |
| 1 | `f51057b` | DEUS-SHARED sync workflow |
| 1 | `d4a3fef` | ONBOARDING.md + DEPLOY.md refresh |
| 1 | `7ec965a` | First-time onboarding wizard |
| 1 | `b735e28` | Customer-facing legal/onboarding/pricing drafts |
| 2 | `9cd1acd` | Launch-clean — DSAR Art. 15, audit MEDs |
| 2 | `e833602` | Calendar-webhook hardening (audit F4/F5/F6, compliance F9/F10) |
| 2 | `cd9df17` | Launch-readiness brief |
| 2 | `fcce6d1` | Operator-unblock artifacts (env vars, customer outreach, entity memo, comp positioning, compliance rev.3) |
| 2 | `63630d8` | 2-week sprint plan |
| 2 | `18af2af` | Channel-pruning janitor + delta-sync pagination |
| 2 | `cbdbec5` | Bundle D4 — synced calendar event persistence (Art. 9 minimal) |
| 2 | `8f7a94a` | Help center + drawer + 20-article corpus |
| 2 | `90cf70f` | QuickStart cards + public /status + UX polish |
| 2 | `c180d84` | i18n NL shells |
| 2 | `12f1869` | i18n DE+ES + WCAG fixes + DLP cross-contact leak fix |
| 2 | `8ba4fe2` | Customer-#1 onboarding rehearsal runbook |

## Highlights

### Customer-facing surfaces — complete end-to-end

- ✅ Auth · seats · invites · role-based access (admin / manager / viewer)
- ✅ Contacts · deals · pipelines · CSV import (10 000-row cap, formula-injection neutralised)
- ✅ Calendar OAuth · push-sync · delta-fetch · persistence · Meetings tab on contact pages
- ✅ Stripe billing · Customer Portal · 14-day trial (no card up front)
- ✅ DSAR export (1.2.0) · soft-delete erasure with 30-day window · audit log
- ✅ Settings UIs (team / billing / integrations / privacy)
- ✅ Onboarding wizard + post-wizard QuickStartCards
- ✅ Help center + floating drawer + 20-article corpus
- ✅ Public /status page (Hetzner cutover proof-of-life)
- ✅ Two cron routes (channel renewal + pruning)

### Privacy posture

- **GDPR Art. 15** — one-click DSAR export, 1.2.0 shape, sensitive credentials explicitly stripped (token encryption keys, password hashes, invite tokens, sync tokens).
- **GDPR Art. 17** — soft-delete with 30-day reversibility window, last-admin guardrail, atomic session purge, hard-delete cron.
- **GDPR Art. 9** — privacy-by-design calendar persistence: ONLY events whose attendee list intersects with CRM contacts are stored; descriptions never persisted; per-org `redactSyncedTitles` toggle stores SHA-256 hash for medical / legal / financial verticals. Posture documented in `_drafts/legal/privacy-en.md` §11.
- **GDPR Art. 5(1)(e)** — channel-pruning janitor closes residual-metadata retention drift (90-day default, env override, 30-day floor).
- **GDPR Art. 32** — AES-256-GCM token encryption at rest, per-IP webhook rate limiting, controlled error-code enums (no provider response bodies in user-visible columns), pre-DB clientState shape filter.

### Internationalisation

Full 4-locale parity (EN / NL / DE / ES) with **372 keys** verified on every locale. Customer-facing namespaces translated; lower-frequency sector-specific labels mirror EN as fallback so next-intl never throws on a missing key. Help articles remain English-only with a clear language-disclosure banner pointing customers to support@lucen.ai for help in their language.

### Accessibility

WCAG 2.1 AA baseline on the surfaces shipped this sprint:
- HelpDrawer: `aria-modal="true"` + return-focus-to-toggle on close
- /status: visually-hidden text equivalents for status-colour dots (1.4.1)
- QuickStartCards: `aria-live="polite"` for async-check announcements (4.1.3)
- Help center: mobile reflow at 720px

### DLP review

One real bug found and fixed: `/api/contacts/[id]/meetings` used SQL substring match on `matchedEmails`, which produced cross-contact false positives (contact `a@x.com` could see meetings with `aa@x.com`). Fixed with comma-split + exact `includes` post-filter, take-cap doubled so the post-filter has headroom.

### Test coverage

- 358 vitest tests (was 124 at start of branch)
- New surfaces fully covered: state.ts, providers.ts, events.ts, token-exchange.ts, push-sync.ts, delta-sync.ts, event-persistence.ts, articles.ts, plans.ts, webhook.ts, subscriptions.ts
- Typecheck clean
- Pre-existing 1/64 flake in `state.test.ts` documented in CLAUDE.md (passes in isolation)

## Operator setup required before merging to main

See `MANUAL_TASKS.md` for the full checklist. Critical items:

1. **Confirm legal entity** (KvK + address). Memo: `_drafts/legal/entity-decision-memo.md`. Recommendation: NL BV.
2. **Set production env vars** per `.env.example` and `_drafts/operator/env-vars-walkthrough.md`.
3. **Send customer-prospect first-touch email** from `_drafts/onboarding/customer-prospect-email.md`.
4. **Run two new Prisma migrations**:
   - `npx prisma migrate dev --name calendar_push_sync` (CalendarChannel)
   - `npx prisma migrate dev --name synced_calendar_events` (SyncedCalendarEvent + Organization.redactSyncedTitles)
5. **Wire two new crons** with `X-Cron-Secret: $CRON_SECRET`:
   - `/api/calendar/cron/renew-channels` — hourly
   - `/api/calendar/cron/prune-channels` — daily 03:30 UTC
6. **Walk the rehearsal runbook** on staging: `docs/customer-1-onboarding-rehearsal.md` (~30 min).

## Test plan

- [ ] `npm run typecheck` — clean
- [ ] `npx vitest run` — 358/358 pass
- [ ] Run both Prisma migrations on staging
- [ ] Wire the two new crons
- [ ] Walk `docs/customer-1-onboarding-rehearsal.md` (8 phases, ~30 min)
- [ ] Verify `/status` returns green on staging
- [ ] Verify a real Google Calendar event appears on a contact's Meetings tab within ~10s of being scheduled
- [ ] DSAR export contains `synced_calendar_events` slice and zero sensitive credentials
- [ ] `/philly/help` shows the language-disclosure banner when locale=NL/DE/ES

## Out of scope (post-customer-#1)

- Two-way calendar write-back (v1.1, late May)
- AI contact attributes (v1.2, June)
- SWR rollout across dashboard (~56 pages)
- Help articles in NL/DE/ES
- Lower-frequency dict namespaces in DE/ES
- Native mobile (Q3+ roadmap)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
