# DEUS compliance status — 2026-05-08 (rev. 3)

> Delta from rev. 2 (`docs/compliance-status-2026-05-07.md`). Code-grounded.
> Rev. 3 reflects the two bundles shipped today on top of rev. 2: the
> launch-clean bundle (`9cd1acd`) and the calendar-webhook hardening
> bundle (`e833602`). Read rev. 2 first; this doc only documents what
> changed.

## Executive summary — net state on 2026-05-08

GREEN code-side. Zero Article-level GDPR gaps remain in the
codebase. Every finding from the parallel `/compliance-check` on
calendar push-sync (2026-05-07) is closed or formally accepted with
written rationale. Operator-side and legal-entity items are unchanged
from rev. 2 — those are not Claude-actionable.

PR #12 is launch-clean. Customer #1 onboarding is gated on operator
setup, legal entity confirmation, and the Hetzner cutover, all
covered in `docs/launch-readiness-2026-05-08.md`.

---

## What changed since rev. 2

### Closed (code-side)

| Finding | Article | Source | Closed by | Evidence |
|---|---|---|---|---|
| F1 — DSAR missing calendar slices | Art. 15 | `/compliance-check` 2026-05-07 | Bundle `9cd1acd` | `lib/philly/dsar.ts` 1.1.0 — `calendar_connections` + `calendar_channels` slices added; secrets explicitly omitted |
| F4 — webhook flood-the-DB attack | Art. 32 | `/audit-full` 2026-05-08 | Bundle `e833602` | per-IP rate limit (capacity 300, refill 10 RPS) + pre-DB `clientState` shape filter |
| F5 — Microsoft 3-second SLA risk | Art. 32 (availability) | `/audit-full` 2026-05-08 | Bundle `e833602` | `next/server` `after()` migration — 202 returns immediately, deltas run after |
| F6 — 410-recursion infinite-loop risk | Art. 32 (availability) | `/audit-full` 2026-05-08 | Bundle `e833602` | `recursionDepth` parameter in `syncGoogle` / `syncMicrosoft`, max depth 1, fails closed with `persistent_410` |
| F9 — `lastError` could leak provider response bodies | Art. 32 + Art. 5(1)(a) | `/compliance-check` 2026-05-07 | Bundle `e833602` | Controlled enum `RenewErrorCode` (`provider_4xx`, `provider_5xx`, etc.). Verbatim provider text only goes to `logger.warn`, not into a column visible via DSAR or the integrations UI |
| F10 — clientState log-leak risk | Art. 32 | `/compliance-check` 2026-05-07 | Bundle `e833602` | Contributor warning comment block at `app/philly/api/calendar/webhook/[provider]/route.ts:283-287` — future "easier debugging" patches that print `clientState` would now be flagged in code review |
| `PATCH /api/me` lacks rate limit | Art. 32 (availability) | `/audit-full` 2026-05-08 | Bundle `9cd1acd` | `enforceRateLimit('me-patch:${userId}', PRESET_MUTATION)` |
| OAuth callback `/philly/login` typo (404 mid-OAuth on session loss) | Art. 32 (availability) | `/audit-full` 2026-05-08 | Bundle `9cd1acd` | Redirect target now `/login`; comment added to keep it from regressing |
| `SubscriptionData` declared inline on UI vs route | Art. 5(1)(d) accuracy posture | `/audit-full` 2026-05-08 | Bundle `9cd1acd` | Hoisted to `lib/philly/stripe/types.ts` — TypeScript-checked drift between server + UI |

### Still open (operator or legal — not Claude-actionable)

| Item | Article | Owner | Status |
|---|---|---|---|
| Sub-processor list missing Google + Microsoft | Art. 30 | Operator + legal | Open. Add to `_drafts/legal/subprocessors-en.md` with role, region, transfer mechanism, DPA reference. |
| DPF certification verification (Google + Microsoft active) | Chapter V | Operator | Open. Verify on the day of customer #1 sign-up; recheck quarterly. |
| Consent text in calendar OAuth wizard reviewed against Art. 7 + 13 | Art. 6 + Art. 13 | Legal | Open. Live React copy at `/philly/onboarding/calendar` and `/philly/settings/integrations` not yet reviewed. |
| Channel-pruning janitor (90-day retention for expired/error rows) | Art. 5(1)(e) | Code (deferred) | Open. Self-contained ~80 LOC bundle; not blocking launch. |
| Bundle D4 — event persistence + Art. 9 controls | Art. 9 special categories | Code + legal | Open by design. Today the worker only counts events; persistence is v1.2 roadmap. Re-audit trigger when D4 ships. |
| Legal entity confirmation (KvK + address) | Art. 13 + 14 transparency | Operator | Open. Decision memo: `_drafts/legal/entity-decision-memo.md`. |

### Closed by acceptance (no code change)

| Item | Article | Rationale |
|---|---|---|
| `userId` in log lines (CUID, not human-readable) | Art. 33-34 | Logs retained ≤90 days, access limited to operator. Acceptable per processor-of-record posture. |
| `lastUsedAt` fire-and-forget swallow on connection write | Art. 32 | Soft signal, not a correctness gate. `.catch(() => {})` documented. Operator can revisit if connection-pool exhaustion is ever observed. |
| Provider-side OAuth grant survives User soft-delete | Art. 17 | Token expires within OAuth lifetime, push-sync channel times out within 7 days / 70 hours, user can revoke directly in their Google / Microsoft console. Best-effort revoke documented as a future-bundle item. |

---

## Compliant-by-design wins added since rev. 2

- **Provider-error code mapping is now controlled.** `RenewErrorCode`
  + `statusToErrorCode(status)` ensure no provider response body
  reaches the user-facing `lastError` column. Tested at six status
  buckets. (compliance LOW F9 closed.)

- **Microsoft 3-second SLA is no longer at risk under batch load.**
  `next/server` `after()` migration moves the per-channel sync work
  out-of-band; the handler returns 202 within milliseconds even on a
  10-channel batch. (audit MED F5 closed.)

- **Webhook surface is now properly throttled.** Per-IP rate limit at
  capacity 300, refill 10 RPS. Generous for legitimate Google + MS
  bursts, tight enough to choke a flood-the-DB scanner. (audit MED
  F4 closed.)

- **Pre-DB shape filter on Microsoft `clientState`.** Notifications
  whose `clientState` doesn't match the base64url(32-byte) shape are
  rejected before any Prisma query. Forged or random payloads no
  longer cost a DB lookup. (audit MED F4 closed.)

- **DSAR export now covers the full calendar surface.** Including
  `calendar_connections` + `calendar_channels` per Art. 15. Sensitive
  fields (`accessTokenEnc`, `refreshTokenEnc`, `authSecretEnc`,
  `providerAccountId`, `syncToken`) explicitly omitted. Manifest
  carries `calendar_connection_count` + `calendar_channel_count`.
  Version bumped to 1.1.0. (compliance HIGH F1 closed.)

---

## Operator action items, ranked by launch-blocking impact

1. **Confirm legal entity** (KvK + address). Memo:
   `_drafts/legal/entity-decision-memo.md`. Single email or phone
   call; nothing else can move until this is answered.
2. **Set production env vars** per
   `_drafts/operator/env-vars-walkthrough.md`. ~2 hours focused work.
3. **Add Google + Microsoft to the sub-processor list** in
   `_drafts/legal/subprocessors-en.md`. ~30 minutes.
4. **Verify DPF certification status** for both vendors on the day
   of customer #1 onboarding.
5. **Send the customer-prospect first-touch email** from
   `_drafts/onboarding/customer-prospect-email.md`. Convert the
   abstract launch date into a commitment that pulls everything
   else forward.

Items 1, 2, and 5 are the three operator-side items from the launch
brief that compress the timeline by a full week.

---

## Document inventory (current)

| Doc | Location | Status |
|---|---|---|
| Compliance status (rev. 2) | `docs/compliance-status-2026-05-07.md` | Baseline |
| Compliance status (rev. 3, this doc) | `docs/compliance-status-2026-05-08-rev3.md` | Current |
| Push-sync compliance check | `docs/compliance-check-push-sync-2026-05-07.md` | All HIGH + LOW closed |
| Audit-full PR #12 cumulative | `docs/audit-full-2026-05-08.md` | Top-3 MED closed |
| Launch readiness brief | `docs/launch-readiness-2026-05-08.md` | Current |
| Server specification (PDF + MD) | `docs/server-spec-deus-shared.md` + `.pdf` | Current |
| Repo split runbook | `docs/repo-split-cutover.md` | Current |
| Hetzner cutover runbook | `docs/hetzner-cutover-runbook.md` | Current |
| Privacy / DPA / ToS / sub-processors drafts | `_drafts/legal/*.md` | Blocked on legal entity |
| Operator env-var walkthrough | `_drafts/operator/env-vars-walkthrough.md` | Ready |
| Customer-prospect outreach + day-one welcome | `_drafts/onboarding/customer-prospect-email.md` | Ready |
| Legal entity decision memo | `_drafts/legal/entity-decision-memo.md` | Awaiting Juan's call |
| Competitive positioning | `docs/competitive-positioning-2026-05-08.md` | Current |
| v1.0 launch release notes | `_drafts/release-notes/v1.0-launch.md` | Awaiting legal entity confirmation |

---

## Next-rev. trigger

- Bundle D4 (event persistence) — re-audit on Art. 9 controls.
- Legal entity confirmed — bump rev. and update the imprint /
  privacy / DPA / ToS / sub-processors drafts to live paths.
- First customer signs the DPA — the Art. 28 processor relationship
  goes from theoretical to operational; document the executed DPA
  in the audit log.
