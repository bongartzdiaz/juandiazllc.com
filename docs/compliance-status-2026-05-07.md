# DEUS / juandiazllc.com — compliance status, 2026-05-07 (rev. 2)

> Audit prepared on branch `claude/zen-noyce-f6e719` (PR #12). Code-grounded — every claim links to a file path. This is a status report, not a redesign; no code changes proposed. **Rev. 2** updated late on 2026-05-07 after the AF audit cycle closed and Bundles D2 + D3 + Hetzner cutover prep landed.

## Executive summary

- **Overall posture: YELLOW (improving).** Technical security keeps tightening — calendar push-sync now ships with cross-tenant isolation in the renew-channels admin path, full audit-log coverage on calendar connect/disconnect + Stripe Customer Portal access, `onDelete: Restrict` guarding `CalendarConnection.organization` deletes, and a dedicated push-sync compliance review (see `docs/compliance-check-push-sync-2026-05-07.md`). The legal/operational layer is unchanged: privacy/DPA/ToS/sub-processors documents are still in `_drafts/` with `[KvK TBD]` / `[address TBD]` placeholders and are not served from any `/legal/*` URL. **No customer can sign a DPA on day one.** Still not shippable to a paying B2B customer that requires a DPA at signing.
- **Critical gaps:** 4 (legal docs not published, no breach IR runbook, no Records of Processing Activities (RoPA), no contact-side consent capture/suppression — blocks NL telemarketing 2026 + Art. 7).
- **Operator-blocking actions:** 5 (confirm legal entity, fill placeholders, publish legal pages, write IR runbook, write RoPA).
- **Positive movement since rev. 1:** AF audit cycle closed (8 fixed + 3 originally-deferred all closed), data residency improves with Hetzner Falkenstein cutover (EU-only infrastructure + Backblaze B2 EU bucket for backups), audit-log coverage extended to all financially or integration-relevant user actions.

---

## GDPR / AVG article-by-article

### Art. 5 — Lawfulness, fairness, transparency, purpose limitation, minimization

| Sub-principle | Status | Evidence | Gap |
|---|---|---|---|
| Lawfulness | ⚠️ Partial | Legal bases declared in privacy draft `_drafts/legal/privacy-en.md:36-44` (contract / legitimate interest / legal obligation / consent table). | Not yet served at a public URL — see Art. 12-14. |
| Purpose limitation | ✅ Implemented | DPA draft `_drafts/legal/dpa-en.md:27-29` "We process Personal Data only to provide the DEUS Service". `lib/philly/dsar.ts:62-67` org-scoped queries — no cross-purpose joins. | — |
| Data minimization | ✅ Implemented | `lib/philly/dsar.ts:70-79` selects only fields the data subject needs and explicitly omits `passwordHash`, `twoFactorSecret`, `lockedUntil`, `failedLoginCount`, `lastLoginIp`. | — |
| Accuracy (rectification) | ✅ Implemented | `app/philly/api/me/route.ts:55-92` PATCH validates email format, trims, audit-logs the diff. | — |
| Storage limitation | ⚠️ Partial | Retention table in `_drafts/legal/privacy-en.md:71-79` (active = subscription, soft-delete = 30d, audit = 24m, errors = 90d). | Hard-purge job for `User.deletedAt` 30-day window is not implemented in code — only declared in policy. **Owner action:** scheduled task (cron / pg_cron / GitHub Action) that purges `User` rows where `deletedAt < now() - 30d`. |
| Transparency | ⚠️ Partial | See Art. 12-14. | Privacy notice is in `_drafts/`, not at a live URL. |

**Owner action:** ship `app/[locale]/legal/privacy/page.tsx`, `terms/page.tsx`, `dpa/page.tsx`, `subprocessors/page.tsx` (paths declared in the draft frontmatter); implement the 30-day hard-purge job.

### Art. 6 — Legal basis for processing

| Status | Evidence | Gap |
|---|---|---|
| ⚠️ Partial | Legal-basis table in `_drafts/legal/privacy-en.md:36-44`: contract (Art. 6(1)(b)) for service operation + transactional emails; legitimate interest (Art. 6(1)(f)) for abuse detection + analytics; legal obligation (Art. 6(1)(c)) for billing + tax; consent (Art. 6(1)(a)) for product updates. | Bases are stated in the *draft* notice but the notice is not published. No customer-side consent record exists (see Art. 7). |

**Owner action:** publish privacy notice. Add a `legalBasis` enum to `Subscription` so the audit log records the specific basis claimed when a tenant onboards (defense-in-depth — not legally required, useful for SOC-2).

### Art. 7 — Conditions for consent

| Status | Evidence | Gap |
|---|---|---|
| ⚠️ Partial | Visitor analytics opt-out: `components/AnalyticsOptOut.tsx:1-83` localStorage toggle, served on `/privacy`. Cookie banner removed because Plausible is cookieless — `CLAUDE.md` documents the legal reasoning (EU DPAs + Dutch AP confirm no consent required). | **No timestamped consent record anywhere.** No `consentGivenAt` / `consentVersion` / `consentScope` columns on `User` or `Contact`. Marketing emails to *customers* (when added) and any contact-side outbound (when DEUS gains an email-blast feature) cannot demonstrate Art. 7(1) "controller able to demonstrate consent". |

**Owner action:** when the first marketing-send feature lands, add `consents` table (userId / contactId, scope, givenAt, withdrawnAt, evidence_blob).

### Art. 12-14 — Information to be provided

| Status | Evidence | Gap |
|---|---|---|
| ❌ Missing (in production) | All four required documents drafted in `_drafts/legal/`. Privacy notice covers identity (1), contact (1, 12), categories (2), purposes (3), legal bases (3), recipients/sub-processors (4), transfers (5), retention (7), rights (8), complaint right (8), security (10), updates (11). | Not served from `app/[locale]/legal/*`. `[KvK TBD]` and `[address TBD]` placeholders block publication. The `target_path:` frontmatter exists but the pages do not. |

**Owner action (operator-blocking):** confirm whether Juan Diaz LLC is US-registered or NL BV; fill KvK + address; create the four `app/[locale]/legal/*` pages; link from footer (`Footer.tsx`) and registration flow.

### Art. 15 — Right of access (DSAR)

| Status | Evidence | Gap |
|---|---|---|
| ✅ Implemented | `lib/philly/dsar.ts:62-229` builds a stable, versioned (`DSAR_EXPORT_VERSION = '1.0.0'`) JSON archive. `app/philly/api/me/export/route.ts:28-90` serves it (`?scope=user|org`), rate-limits via PRESET_READ, audit-logs the export, sets `Cache-Control: no-store`. UI: `app/philly/settings/privacy/page.tsx`. Sensitive credentials explicitly omitted (`dsar.ts:75-79`, `156-159`, `192-194`). | None — best-in-class for the size of the team. |

### Art. 16 — Right to rectification

| Status | Evidence | Gap |
|---|---|---|
| ✅ Implemented | Self-rectification: `app/philly/api/me/route.ts:55-92` PATCH (name/email/locale/avatarUrl) with audit-log diff. Org admins can edit teammates and contacts via the standard CRUD endpoints. | None for own-data. Document the controller's responsibility for upstream-imported contact data in DPA Art. 9 — already drafted in `_drafts/legal/dpa-en.md:79-86`. |

### Art. 17 — Right to erasure ("right to be forgotten")

| Status | Evidence | Gap |
|---|---|---|
| ✅ Implemented | `app/philly/api/me/route.ts:109-184` DELETE. Soft-deletes (`User.deletedAt`), invalidates sessions atomically (`prisma.$transaction` lines 149-159), audit-logs as `kind: self_erasure`, last-admin guardrail (lines 129-143), 30-day hard-purge window declared. Schema field `deletedAt` defined at `prisma/schema.prisma:104-107`. Soft-deleted users get 410 Gone via `lib/philly/auth-helpers.ts:41-46, 66-67`. **`CalendarConnection.organization` now uses `onDelete: Restrict`** (`prisma/schema.prisma:640`) — User-side Cascade still handles Art. 17 erasure for personal calendar tokens, while accidental org delete is blocked at the FK so connections aren't silently orphaned. Comment in schema documents the rationale. | **Hard-purge cron not implemented.** Without the scheduled job, soft-deleted rows accumulate forever — violates the policy that promises 30-day purge. **Owner action:** add a daily cron (DigitalOcean / Vercel Cron / pg_cron) that runs `prisma.user.deleteMany({ where: { deletedAt: { lt: now()-30d } } })` plus cascade. Write a regression test. |

### Art. 18 — Right to restriction

| Status | Evidence | Gap |
|---|---|---|
| ❌ Missing | No restriction mechanism in code or docs. Privacy notice at `_drafts/legal/privacy-en.md:90` mentions Art. 18 in the rights list, but no UI or API route for it. | Practical impact is low for a CRM (most users either rectify or delete), but the right is non-derogable. **Owner action:** for now, route Art. 18 requests through `privacy@lucen.ai` and document the manual operator playbook (suspend account, freeze data) in a new `docs/runbooks/art-18-restriction.md`. Not blocking go-live but needs to exist before audit. |

### Art. 20 — Right to data portability

| Status | Evidence | Gap |
|---|---|---|
| ✅ Implemented | Same export pipeline as Art. 15. `lib/philly/dsar.ts:198-216` JSON manifest is structured + versioned + machine-readable, satisfies Art. 20(1) "structured, commonly used, machine-readable format". Notice in manifest cites both Art. 15 + Art. 20. | — |

### Art. 21 — Right to object

| Status | Evidence | Gap |
|---|---|---|
| ⚠️ Partial | Visitor analytics: opt-out via `components/AnalyticsOptOut.tsx`. Authorized Users: erasure path covers full opt-out by deleting the account. | No object-to-marketing flow because **no marketing-send feature exists yet**. When it ships, a clear opt-out (one-click unsubscribe + suppression list) is mandatory — see Telemarketing 2026 section. |

### Art. 25 — Data protection by design and by default

| Status | Evidence | Gap |
|---|---|---|
| ✅ Implemented | Encrypted-at-rest secrets via AES-256-GCM in `lib/philly/crypto.ts:14-69`. Refusal to start in prod without `INTEGRATION_SECRET` (line 23). Password hashing: bcrypt(12) at `app/philly/api/invites/accept/route.ts:98`. PII columns in DSAR explicitly stripped (passwordHash, twoFactorSecret, invite tokens — `lib/philly/dsar.ts:75-79`, `192-194`). Audit log records who/what/when (`lib/philly/audit.ts:84-107`). Rate-limit + Zod on every public + mutating endpoint (security-baseline checklist). | bcrypt(12) is acceptable per the baseline. The baseline note prefers "argon2id or bcrypt(≥12)" — bcrypt(12) meets the floor. **Future improvement:** migrate to argon2id when the auth layer moves to Lucia (per the May 2026 Hetzner sprint plan). |

### Art. 28 — Processor agreements

| Status | Evidence | Gap |
|---|---|---|
| ⚠️ Partial | Full DPA drafted at `_drafts/legal/dpa-en.md:1-138`. Covers all Art. 28(3) sub-clauses: subject-matter (§2), nature/purpose (§3), categories (§4), instructions (§5), confidentiality (§6), security measures (§7), sub-processors with consent (§8 + 30-day notice), data-subject assistance (§9), transfers (§10 — EEA-only), breach (§11), audit (§12), return/delete (§13), liability (§14), governing law (§16). Sub-processor list at `_drafts/legal/subprocessors-en.md`. | Not signed-and-served yet — same publication blocker as Art. 12. **Owner action:** publish at `app/[locale]/legal/dpa` and link from signup-checkout flow with a "I have read the DPA" checkbox. |

### Art. 30 — Records of Processing Activities (RoPA)

| Status | Evidence | Gap |
|---|---|---|
| ❌ Missing | No RoPA document in repo. Privacy notice + DPA are *external* (data-subject + customer facing); RoPA is *internal* (regulator-facing) and required under Art. 30(1) for the controller and Art. 30(2) for the processor. Juan Diaz LLC is both. | **Owner action:** create `docs/compliance/ropa.md` listing for each processing activity: (a) name + purpose, (b) categories of data subjects, (c) categories of personal data, (d) recipients, (e) transfers, (f) retention, (g) security measures. Use the privacy notice + DPA as input — the data is already there, it just needs reformatting into the Art. 30 schema. |

### Art. 32 — Security of processing

| Sub-area | Status | Evidence |
|---|---|---|
| Encryption in transit | ✅ Implemented | TLS by Vercel/Hetzner default; declared in `_drafts/legal/dpa-en.md:54`. |
| Encryption at rest | ✅ Implemented | `lib/philly/crypto.ts` AES-256-GCM for secrets. Backups are AES-256 per DPA §7. |
| Password hashing | ✅ Implemented | `app/philly/api/invites/accept/route.ts:98` `bcrypt.hash(password, 12)`. Auth flows through Supabase (`app/actions/auth.ts:30`) + bcrypt for self-set passwords. |
| Access control | ✅ Implemented | `requireScope` / `requireRole` everywhere (`lib/philly/auth-helpers.ts:116-184`). Tenant isolation enforced via `organizationId` in every Prisma `where` (DSAR sample at `lib/philly/dsar.ts:97-99`). |
| Rate limiting | ✅ Implemented | `enforceRateLimit` with `PRESET_READ` / `PRESET_MUTATION` on every route. AI-score has tighter cap (`app/philly/api/ai/score/route.ts:17` capacity 10, refill 0.166/s). Public `POST /invites/accept` IP-keyed. |
| Audit log | ✅ Implemented (extended) | `lib/philly/audit.ts:84-107`. 24-month retention declared in privacy notice. **Coverage extended in Bundle AF (2026-05-07):** Stripe Customer Portal access (`app/philly/api/billing/portal/route.ts:80`), calendar OAuth callback connect events (entity=integration, action=create, sensitive token data NOT logged), calendar disconnect events (entity=integration, action=delete), Stripe Checkout intent capture (entity=subscription, action=create — captures who-clicked-what even when checkout is abandoned), admin-triggered renew-channels sweep (mirrors `/api/audit/prune` pattern with renewedCount/failedCount/processed). Webhook handlers stay in `logger.info` because there is no `scope.userId` server-to-server. Duplicate `'user'` entry removed from `AuditEntity` enum. |
| Logging hygiene | ✅ Implemented | `console.log → logger.debug` migration done in `lib/philly/email/providers.ts:34-39` and `lib/philly/sms/twilio.ts:43`. Sentry payload redaction declared in baseline. |
| Soft-delete + session purge | ✅ Implemented | `app/philly/api/me/route.ts:149-159`. `tokensInvalidAfter` invalidates all JWTs (`prisma/schema.prisma:97`). |
| 2FA (TOTP) | ⚠️ Partial | Schema present (`prisma/schema.prisma:99-101` `twoFactorSecret`/`twoFactorEnabled`/`twoFactorVerifiedAt`). No 2FA enrollment or verification route was found in this audit. Recovery codes table referenced but not exercised. | 
| Restore drills | ❌ Missing | DPA §7 promises "restore drills monthly". No evidence of an executed drill, runbook, or backup-verify schedule in this repo. |
| Default-deny middleware | ✅ Implemented | `lib/supabase/middleware.ts` `PUBLIC_PHILLY_PATHS` allowlist (CLAUDE.md memo). |
| Generic public errors | ✅ Implemented | `app/philly/api/invites/accept/route.ts:52-61` returns one generic 410 for unknown/expired/revoked/accepted. |

**Owner action (Art. 32):** wire 2FA enrollment UI; document a monthly restore drill in `docs/runbooks/restore-drill.md`; first drill before first paying customer goes live.

### Art. 33 — Breach notification readiness

| Status | Evidence | Gap |
|---|---|---|
| ⚠️ Partial | DPA §11 commits to **24-hour** notice to Customer + acknowledges 72-hour authority window. Sentry is configured for error monitoring (`lib/philly/observability.ts` SLO bucketing). | **No incident-response runbook exists.** No documented escalation tree, no breach-classification matrix (confidentiality / integrity / availability), no template communications, no recorded "who calls the AP". A 24-hour clock is uncreditable without a runbook. **Owner action (operator-blocking):** create `docs/runbooks/incident-response.md` with: detection sources, severity ladder, decision tree (notify Customer y/n, notify AP y/n, notify data subjects y/n), template emails in EN + NL, log-collection checklist, post-mortem template. Reference Art. 33(3) required content. |

### Art. 35 — DPIA (Data Protection Impact Assessment)

| Status | Evidence | Gap |
|---|---|---|
| ❌ Missing | The lead-scoring feature (`lib/philly/ai/scoring.ts`) processes contact data to assign a 0-100 score with 5-tier classification (`hot/warm/nurture/cold/dormant`). It is rule-based + deterministic (not ML), but it produces an output that influences how the controller engages with the data subject. Under Art. 35(3)(a) "systematic and extensive evaluation … based on automated processing, including profiling, on which decisions are based that produce legal effects … or similarly significantly affect" — this is borderline. The Dutch AP's DPIA-list explicitly includes "uitgebreide profilering". | **Owner action:** run a short DPIA for the lead-scoring feature. Output: `docs/compliance/dpia-lead-scoring.md`. The likely conclusion is "low risk because (a) rule-based, (b) human-in-the-loop, (c) decisions are non-binding sales prioritization, (d) data subject is contacted, not denied a service" — but the *exercise* is what Art. 35 requires. Roughly 1 day of writing. The AI Attributes feature (`Contact.aiIcpFit`/`aiSummary` columns at `prisma/schema.prisma:294-300`) is on the roadmap and *will* trigger Art. 35 once it ships, since it uses an LLM (per `_drafts/legal/privacy-en.md:66-68` "AI runs on our own servers in Germany using open-source models" — so no third-party API but still automated profiling). DPIA must precede that ship. |

---

## Telemarketing 2026 (NL)

The amended Telecommunicatiewet (effective 1 Jan 2026) tightens NL telemarketing: B2C calls require **opt-in**; B2B calls keep opt-out but need a 3-year recency window and a clear Bel-me-niet-register-equivalent. Email/SMS still under e-Privacy/AVG (opt-in for cold to consumers, soft opt-in for own customers).

| Requirement | Status | Evidence | Gap |
|---|---|---|---|
| Opt-in capture for outbound email/SMS to contacts | ❌ Missing | `prisma/schema.prisma:264-313` Contact model has no `consentGivenAt` / `consentScope` / `consentEvidence` columns. No `optedOut: Boolean` either. | DEUS does not currently send outbound email/SMS *from a contact-blast feature* — `lib/philly/email/providers.ts` is wired for transactional only (invite emails, password reset). Risk is dormant **until** customers use DEUS to mail their own contacts. **When that feature ships**, opt-in capture is mandatory. |
| Suppression list (Bel-me-niet / per-contact unsubscribe) | ❌ Missing | None. | Same — needed when blast feature ships. Recommend a `ContactConsent` table separate from `Contact` (so erasure of consent is auditable and so re-import of a CSV doesn't accidentally re-subscribe a previously-opted-out contact). |
| Consent timestamping with evidence | ❌ Missing | None. | Required to demonstrate Art. 7(1) AVG. Store: timestamp, IP, user agent, consent text version, scope (email / SMS / phone). |
| Twilio SMS — opt-out keyword handling | ❌ Missing | `lib/philly/sms/twilio.ts:37-92` does not check a suppression list before send. | **Hot once SMS-blast ships**: every NL+EU SMS must honor STOP/UNSUBSCRIBE inbound. Add a Twilio inbound-SMS webhook + suppression check on every outbound. |
| CSV import — consent-flag column | ❌ Missing | `lib/philly/import/csv-parse.ts` (per CLAUDE.md, Bundle 5) accepts contacts but no `consent_given_at` column in the suggested mapping. | Add to the mapping suggestions when blast features ship. |

**Bottom line:** the telemarketing 2026 risk is **deferred, not absent**. As long as DEUS only sends transactional email (invites, password reset, billing receipts) it is compliant by virtue of having no marketing channel. The day a customer can use DEUS to send a campaign, *every* item above becomes a release blocker.

**Owner action:** when the email/SMS-campaign feature is queued, scope a "consent infrastructure" bundle: `ContactConsent` table, opt-in capture UI, suppression-list service, Twilio STOP webhook, CSV import consent column, email-template-side `{{unsubscribe_url}}` enforcement (refuse to send a campaign-template that lacks the token).

---

## EU AI Act Art. 50 (AI transparency)

Art. 50 requires that natural persons are informed when they interact with an AI system or when content has been AI-generated, except where obvious. For DEUS, the relevant surfaces are:

| Feature | AI involved? | Disclosure required? | Status | Gap |
|---|---|---|---|---|
| Lead scoring (`/api/ai/score`) | Heuristic (rule-based, deterministic). `lib/philly/ai/scoring.ts:51-172` is hand-coded scoring rules. | Likely **no** — Art. 50 covers "AI systems" per AI Act Art. 3(1); deterministic rule engines do not meet the definition. Nonetheless, since the UI labels this output as "AI" / `ai/score` route, a precautionary disclosure is the safer move. | ⚠️ Partial | Add a tooltip / explainer near the score output: "Computed from deterministic rules, not a learned model." |
| Contact AI Attributes (industry / ICP fit / summary) | **Yes** — schema fields `aiIndustry`, `aiIcpFit`, `aiSummary` at `prisma/schema.prisma:295-300`, called out in CLAUDE.md "Pending for next session — Vercel AI SDK v5 — Attio-style AI Attributes". | **Yes** — Art. 50(1) when used to interact with persons (probably no direct interaction here — this is back-office), Art. 50(4) for AI-generated text content (the `aiSummary` field). | ❌ Missing (feature not yet shipped) | Pre-ship: (a) UI badge "AI-generated" next to `aiSummary` and `aiIcpFit`, (b) explainer page at `/legal/ai-disclosure` covering model, training data, refusal modes, human-review path, (c) DPIA per Art. 35. |
| Onboarding wizard / AI insights endpoints | Rule-based (`lib/philly/ai/insights.ts`). | Same as scoring. | ⚠️ Partial | Same precautionary tooltip. |

**Owner action:** before merging the AI Attributes feature, write `docs/compliance/ai-act-disclosure.md` and add the UI badge.

---

## Calendar push-sync compliance posture (Bundles A / D / D2 / D3 — added 2026-05-07)

The calendar OAuth + push-sync surface is the most data-sensitive integration we ship today (read-only access to a user's full calendar, refresh-token persistence, real-time event delta-sync). It got its own dedicated compliance review in **`docs/compliance-check-push-sync-2026-05-07.md`** (parallel `/compliance-check` agent — defer to that doc as the single source of truth on this surface). Headline points cross-referenced into this status doc:

| Topic | Status | Evidence |
|---|---|---|
| Token at rest | ✅ AES-256-GCM via `lib/philly/crypto.ts`. Tokens never returned over the wire. |
| Cross-tenant isolation in cron path | ✅ Bundle AF F1 fix — `listDueForRenewal()` accepts an `organizationId` filter; admin-triggered renew passes `scope.organizationId`, system-cron path explicitly omits to process all orgs (legitimate operator role). |
| Audit-log on connect / disconnect | ✅ Calendar OAuth callback writes `entity=integration, action=create`, disconnect writes `action=delete`, both in `app/philly/api/calendar/...`. Token material never enters the audit row — only `{provider, providerEmail, kind: 'calendar'}` and status flips. |
| Webhook authenticity | ✅ Per-channel encrypted `authSecret` (32 bytes random), `crypto.timingSafeEqual` verification, MS validation handshake handled before JSON parse. `PUBLIC_PHILLY_PATHS` allowlist limited to `/health`, `/billing/webhook`, `/calendar/webhook/google`, `/calendar/webhook/microsoft`, `/audit/prune`, `/calendar/cron/renew-channels`. |
| Delta-sync recovery from token expiry | ✅ Bundle D3 worker handles 410 GONE (Google `syncToken` rotation, MS `@odata.deltaLink` invalidation) by full-resync fallback. Idempotent event upsert by external id. |
| Throttled `lastUsedAt` for unused-connection signal | ✅ Bundle AF F5 closed — `shouldWriteLastUsed` helper writes at most once per 6h to avoid hot-row contention. Backs a future janitor that retires connections idle >90d. |
| `lastError` UI rendering | ✅ Bundle AF F11 closed — surfaces in `/philly/settings/integrations` next to the disconnect button so users can self-diagnose "Reconnect needed" without reading logs. |

For the full GDPR walk-through of this specific surface (data subjects, categories, lawful basis, retention by token type, sub-processor map, transfer mechanism for Google + Microsoft), read `docs/compliance-check-push-sync-2026-05-07.md`. That doc lives separately so the surface can be re-audited on its own cadence as the OAuth scopes evolve.

---

## AF audit cycle — closed (added 2026-05-07)

The AF audit cycle (post-Bundle D2 sweep) is now fully closed: **8 findings fixed in the original pass + 3 originally-deferred follow-ups all closed**. No carry-over.

| ID | Severity | Topic | Resolution |
|---|---|---|---|
| F1 | HIGH | Cross-tenant exposure in admin renew-channels | `listDueForRenewal()` gained optional `organizationId`; admin path scopes, cron path doesn't. |
| F2 | HIGH | Missing rate-limit on admin renew-channels | `PRESET_MUTATION` added on admin trigger (cron skips — secret implies trust). Self-audit row recorded. |
| F3 | MEDIUM | Stripe Customer Portal no audit trail | Audit row written on portal open. Ties downstream Stripe webhook state changes (which lack `userId`) back to the human who clicked. |
| F4 | MEDIUM | Admin renew-channels sweep no audit trail | Audit row mirrors `/api/audit/prune` pattern (renewedCount/failedCount/processed). |
| F6 | MEDIUM | DTO drift between wizard + integrations settings | `ConnectionDTO` / `ChannelDTO` / `ConnectionsResponse` hoisted to `lib/philly/calendar/types.ts`. Wizard had stale shape; now both consumers import the same types. |
| F7 | MEDIUM | Missing `getAppBaseUrl()` helper + Stripe portal silent fail | New `lib/philly/app-url.ts`. Stripe portal route now fail-fasts on missing env + null-checks `session.url`. |
| F9 | LOW | Duplicate `'user'` in `AuditEntity` enum | Removed. |
| F10 | LOW | Unconditional Google-only OAuth params | `access_type=offline` and `prompt=consent` now gated on `provider === 'google'`. |
| ~~F5~~ | LOW | Soft-promise `lastUsedAt` | **Closed** — throttled-write helper `shouldWriteLastUsed` (writes at most once per 6h) plus unit tests. |
| ~~F8~~ | LOW | `CalendarConnection.organization` no `onDelete` | **Closed** — `onDelete: Restrict` with documenting comment in `prisma/schema.prisma:633-640`. |
| ~~F11~~ | LOW | `lastError` declared but never rendered | **Closed** — surfaces in `/philly/settings/integrations`. |

**Cron-route middleware fix (parallel landing):** `PUBLIC_PHILLY_PATHS` got `/api/audit/prune` and `/api/calendar/cron/renew-channels`. Without these the middleware redirected `X-Cron-Secret`-authenticated callers to `/login` before the route's own auth check ran, making the cron routes unreachable from any non-session caller. Both routes still enforce `X-Cron-Secret OR admin session` at the handler — the allowlist just lets the request reach the handler.

---

## Hetzner cutover — data residency improvement (target 2026-05-15)

Net-positive compliance change. Full operator runbook landed at `docs/hetzner-cutover-runbook.md` plus 9 numbered migration scripts under `scripts/migrate-to-hetzner/` (01-bootstrap → 09-smoke-test). MANUAL_TASKS.md surfaces three pre-flight gates that have to land **24 hours before** the cutover ceremony or we lock ourselves out of the box / DNS doesn't propagate / OAuth callbacks 4xx for in-flight customers.

| Compliance dimension | Before (Vercel + Supabase) | After (Hetzner + B2 EU) | Net |
|---|---|---|---|
| Application hosting | Vercel (US-headquartered, multi-region edge incl. US PoPs) | Hetzner Falkenstein (DE — EU only, single region) | ✅ Improvement |
| Postgres | Supabase (cloud, EU region, US-headquartered controller) | Hetzner Postgres on the same EU box | ✅ Improvement |
| Backups | Supabase managed (region declared but plumbing is opaque) | Backblaze B2 EU bucket `deus-backups-eu` (region `eu-central-003`), 30-day lifecycle, scoped Application Key (bucket-only, no master-key reuse) | ✅ Improvement |
| Sub-processor count | Vercel + Supabase + Resend + Stripe + Google + Microsoft + Sentry | Hetzner + Backblaze + Resend + Stripe + Google + Microsoft + Sentry (Vercel + Supabase removed; Hetzner + Backblaze added) | Sideways — list shrinks by one, sub-processor doc still needs a refresh post-cutover |
| Data-at-rest disclosure | "AES-256 declared in DPA §7" | Same DPA promise; LUKS at the disk level on Hetzner-side; B2 server-side encryption | ✅ Continuity, plus disk-level encryption is now operator-verifiable |
| OAuth callback co-existence | Single redirect URI per provider | Two redirect URIs registered per provider during cutover window (old + new) so in-flight OAuth doesn't 4xx | ✅ Operationally safer |

**Compliance follow-ups post-cutover:**
- Refresh `_drafts/legal/subprocessors-en.md` to drop Vercel + Supabase, add Hetzner Online GmbH (EU controller in Gunzenhausen, DE) and Backblaze Inc. (US controller — relevant transfer mechanism: SCCs + B2's stated EU-isolation for the `eu-central-003` bucket).
- Re-confirm DPA §7 backup-encryption claim against Backblaze's B2 server-side encryption documentation; record the cipher and key-management posture in `docs/compliance/backup-architecture.md` (new file, post-cutover).
- First B2 restore drill within 30 days of cutover (per DPA §7's "monthly restore drills" promise — was always undone, this is the chance to start clean).

---

## Repo split — DEUS-SHARED becomes primary for CRM (added 2026-05-07)

Decision recorded in `docs/repo-split-cutover.md`: future CRM (DEUS) work moves to `bongartzdiaz/DEUS-SHARED`. The unified `bongartzdiaz/juandiazllc.com` repo continues as the brand-site home (`app/[locale]/*`). The two codebases are no longer mirrored — the auto-mirror workflow `.github/workflows/sync-deus-shared.yml` was removed (it had never run because its PAT secret was never set, but it would have force-pushed the wrong shape into DEUS-SHARED's distinct flat structure). The pre-existing externally-managed Sync Bot is being unplugged separately.

**From a compliance standpoint, nothing changes about the data:** the same Postgres holds the same customer data, the same audit log records the same who/what/when, the same DPA covers the same processing. **Only the source-control location of the code changes.** Worth flagging here for completeness so that auditors who follow citations from this doc to a `bongartzdiaz/juandiazllc.com` repo URL aren't surprised when the next cycle's evidence sits in `bongartzdiaz/DEUS-SHARED`.

---

## Top 5 priority actions

| # | Action | Owner | ETA | Why it's #N |
|---|---|---|---|---|
| 1 | Confirm legal entity (US LLC vs NL BV?) and fill `[KvK TBD]` / `[address TBD]` placeholders in 4 legal drafts | Juan | this week | All other publication work blocks on this single answer. |
| 2 | Publish `app/[locale]/legal/{privacy,terms,dpa,subprocessors}/page.tsx` + link from footer + add DPA acceptance checkbox to signup | Engineering | same day after #1 | Cannot accept paying B2B customers without a published DPA. Art. 12-14 + Art. 28. |
| 3 | Write `docs/runbooks/incident-response.md` (severity ladder, escalation tree, EN+NL templates, AP contact, log-collection checklist) | Juan | 1 day | Art. 33 24-hour clock is uncreditable without it. |
| 4 | Implement 30-day hard-purge cron for soft-deleted Users + write regression test | Engineering | 0.5 day | Closes Art. 17 promise made in privacy notice; today the policy lies. |
| 5 | Write `docs/compliance/ropa.md` (Art. 30 RoPA — internal record) and `docs/compliance/dpia-lead-scoring.md` (Art. 35 DPIA) | Juan | 1 day combined | Required by AVG before first paying customer; both leverage already-written privacy notice content. |

---

## Documents that exist (drafts + new since rev. 1)

- `_drafts/legal/privacy-en.md` — Art. 12-14 privacy notice (EN, complete bar `[KvK TBD]` / `[address TBD]` placeholders — **still blocked, no progress since rev. 1**)
- `_drafts/legal/dpa-en.md` — Art. 28 DPA (EN, complete bar signature lines — **still blocked**)
- `_drafts/legal/tos-en.md` — Terms of Service (EN, governing law NL — **still blocked**)
- `_drafts/legal/subprocessors-en.md` — Sub-processor list (EN — **still blocked**, also needs Hetzner+Backblaze refresh post-cutover)
- `_drafts/onboarding/welcome-email.md`, `_drafts/onboarding/first-day-deus.md` — onboarding sequence
- `_drafts/pricing/pricing-en.md` — pricing tiers
- `MANUAL_TASKS.md` — operator-side env / migration / Stripe / OAuth setup checklist (now includes Hetzner cutover gates + push-sync renewal cron + repo strategy note)
- `docs/calendar-push-sync.md` — push-sync implementation reference (data flows, TTL choices, recovery semantics)
- `docs/compliance-check-push-sync-2026-05-07.md` — dedicated compliance review of the push-sync surface (parallel doc, single source of truth for that integration's GDPR posture)
- `docs/hetzner-cutover-runbook.md` + `scripts/migrate-to-hetzner/01..09-*.sh` — operator runbook + numbered migration scripts for the EU-only data residency improvement
- `docs/repo-split-cutover.md` — repo-split runbook (DEUS-SHARED becomes primary for CRM)
- Memory files: `feedback_security_baseline.md` (the bank-grade + GDPR floor)

## Documents that should exist but don't

- `app/[locale]/legal/privacy/page.tsx` (and 3 siblings) — public-facing pages, blocking go-live
- `docs/runbooks/incident-response.md` — Art. 33 readiness; without this the 24h commitment is theatre
- `docs/runbooks/restore-drill.md` — DPA §7 commits to monthly drills; need a documented procedure + log
- `docs/runbooks/art-18-restriction.md` — manual operator playbook for restriction requests
- `docs/compliance/ropa.md` — Art. 30 internal record of processing activities
- `docs/compliance/dpia-lead-scoring.md` — Art. 35 DPIA for the existing scoring feature
- `docs/compliance/dpia-ai-attributes.md` — Art. 35 DPIA for the upcoming LLM-powered contact attributes (must precede that feature shipping)
- `docs/compliance/ai-act-disclosure.md` — Art. 50 disclosure schema (must precede AI Attributes ship)
- NL translations of all four legal pages (`/nl/legal/...`) — required because NL is in the supported-locale set; `lib/i18n/dict.ts` already has scaffolding
- Privacy notice version-history page (`/legal/privacy/changelog`) — material-change emails 30 days in advance per the notice §11

---

*End of report. No code changes were made. **Rev. 2** updated late on 2026-05-07 against branch `claude/zen-noyce-f6e719` HEAD after Bundles D2 + D3 + AF + Hetzner runbook + repo-split-cutover landed. The push-sync surface has its own dedicated review at `docs/compliance-check-push-sync-2026-05-07.md` (cross-referenced in the new "Calendar push-sync compliance posture" section above).*
