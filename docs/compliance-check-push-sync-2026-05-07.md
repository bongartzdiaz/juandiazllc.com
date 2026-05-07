# AVG/GDPR Compliance Check — Calendar Push-Sync (Bundle D)

**Date:** 2026-05-07
**Scope:** Bundle D — Google `watch` + Microsoft Graph `subscriptions`,
delta-sync worker, renewal cron, webhook receivers.
**Reviewer:** automated `/compliance-check` pass against codebase HEAD.

---

## 1. Summary

**YELLOW — 11 findings (1 HIGH, 4 MEDIUM, 6 LOW).**

The cryptographic + integrity layer is strong (AES-256-GCM at rest,
timing-safe HMAC compare, 32-byte randomness, sound idempotency). The
gaps are **process/documentation** rather than code defects: calendar
metadata is missing from the DSAR export (Art. 15 blocker), the
sub-processor list and processing register need to be updated for
Google/MS, and Art. 9 special-category data flowing through the system
(health/religion in event titles) is not addressed at all. Code
quality is genuinely good — fix the paperwork and the missing DSAR
slice and this hits GREEN.

---

## 2. Personal-data inventory

| Field | Storage | Encrypted | Source | Lawful basis |
|---|---|---|---|---|
| `CalendarConnection.providerAccountId` | Postgres plain | No | OAuth profile | Art. 6(1)(b) contract / 6(1)(a) consent |
| `CalendarConnection.providerEmail` | Postgres plain | No | OAuth profile | same |
| `CalendarConnection.accessTokenEnc` | Postgres ciphertext | AES-256-GCM | OAuth exchange | same |
| `CalendarConnection.refreshTokenEnc` | Postgres ciphertext | AES-256-GCM | OAuth exchange | same |
| `CalendarConnection.scopes` | Postgres plain | No | OAuth response | same |
| `CalendarConnection.lastUsedAt` | Postgres plain (15-min throttled) | No | observability | Art. 6(1)(f) legitimate interest (op janitor) |
| `CalendarChannel.authSecretEnc` | Postgres ciphertext | AES-256-GCM | server-generated | n/a (system credential) |
| `CalendarChannel.syncToken` (Google) / deltaLink (MS) | Postgres plain | No | provider | n/a (opaque cursor) |
| `CalendarChannel.externalId`, `resourceId` | Postgres plain | No | provider | n/a |
| Calendar event payloads (title, attendees, location, body) | **NOT stored today** — `delta-sync.ts` line 9–14 explicitly defers persistence to a later bundle. Counts only. | n/a | provider | would be Art. 6(1)(b) |
| Tokens-in-flight | TLS 1.2+ to provider (MS pins `latestSupportedTlsVersion: 'v1_2'` in `push-sync.ts:205`) | TLS | wire | n/a |

**Data flows:**
1. User → OAuth consent screen → Google/Microsoft → `/oauth/callback`
   → encrypt + persist `CalendarConnection`.
2. Provider → `POST /api/calendar/webhook/{provider}` → verify HMAC →
   call `syncDeltaForChannel` → fetch from provider → log counts → ack.
3. Cron / admin → `POST /api/calendar/cron/renew-channels` → loop
   `renew()` per channel → provider HTTP call → update `expiresAt`.
4. User → `/settings/integrations` → `GET /connections` → returns
   non-secret view (`PublicConnection`).

---

## 3. Findings

### F1 — Art. 15 (Right of access) — calendar data missing from DSAR — **HIGH**

**Evidence:** `lib/philly/dsar.ts:62-229` — `buildDsarArchive` enumerates
user, organization, contacts, deals, notes, activities, audit_log,
team, projects, pipelines, invites. There is **no** `calendar_connections`
or `calendar_channels` slice. A user requesting their personal data
under Art. 15 today would receive an export that does not mention
their connected Google/Microsoft account, the scopes granted, the
connection's history, or the existence of an active push-sync channel.

**Severity:** HIGH — direct Art. 15 non-compliance once a customer is
live. Not a theoretical risk; the DSAR endpoint (`/api/me/export`) is
already shipped (Bundle 3 of the readiness sprint) and `dsar.ts:11`
explicitly identifies itself as the single source of truth for "what
data leaves".

**Remediation:** Add to `DsarArchive`:
```
calendar_connections: { id, provider, providerEmail, scopes,
  status, connectedAt, lastUsedAt, lastError }[]
calendar_channels: { id, connectionId, provider, status,
  expiresAt, createdAt }[]
```
Explicitly omit `accessTokenEnc`, `refreshTokenEnc`, `authSecretEnc`,
`providerAccountId`, `syncToken` (sensitive material — same pattern
already used for `passwordHash`, `twoFactorSecret`, invite token).
Bump `DSAR_EXPORT_VERSION` to `1.1.0`.

### F2 — Art. 9 special categories — no controls — **MEDIUM**

**Evidence:** `delta-sync.ts:163-176` (Google) and `:269-275` (MS) — the
worker iterates `items` and counts `added/updated/removed` but does
not look at event content. Once Bundle D4 lands persistence (per the
TODO in `delta-sync.ts:9-14`), titles like "Cardiology follow-up",
"Mosque, 13:00", "AA meeting", "Therapy — Dr. Vorster" will land in
the database. These are Art. 9 special-category data (health,
religion) requiring explicit consent or another Art. 9(2) basis on
top of the Art. 6 lawful basis.

**Severity:** MEDIUM today (no event payloads persisted yet),
**HIGH** the day Bundle D4 ships persistence.

**Remediation:** Before persistence lands:
1. Update consent text on the OAuth start screen to call out that
   calendar entries may contain health/religion data and request
   explicit consent for Art. 9 processing (or scope-down to titles
   only and document the residual risk).
2. Add a DPIA section covering this in the operator's processing
   register.
3. Consider an event-content denylist or hashed storage for sensitive
   keywords if customer DPAs require it.

### F3 — Art. 30 (Records of processing) — push-sync not in register — **MEDIUM**

**Evidence:** `_drafts/legal/subprocessors-en.md` (referenced in session
log) lists "6 sub-processors, EU-only". Google and Microsoft are
US-based controllers/processors of calendar data — they are NOT
EU-only and almost certainly are not in the current draft.

**Severity:** MEDIUM — Art. 30 register is mandatory, sub-processor
disclosure is required by the draft DPA (`_drafts/legal/dpa-en.md`).

**Remediation:** Operator action — add "Google LLC (Google Calendar
API)" and "Microsoft Corporation (Microsoft Graph)" to the
subprocessor list with their roles, regions, transfer mechanism, and
per-vendor DPA reference. Include category of data (calendar
metadata + event content), duration (until disconnect), and security
measures.

### F4 — Chapter V (Cross-border transfer) — DPF status unconfirmed — **MEDIUM**

**Evidence:** Code in `push-sync.ts:38-40` posts directly to
`googleapis.com` and `graph.microsoft.com` from EU-hosted infra. No
SCC fallback, no transfer impact assessment in repo.

**Severity:** MEDIUM — both Google and Microsoft self-certify under the
EU-US Data Privacy Framework as of 2024. If their certifications
remain valid as of the operator-side check, transfer is lawful under
Art. 45 (adequacy). If either lapses, fallback to SCCs (Art. 46) is
required. Code does not need changes; operator and legal need to
verify.

**Remediation:** Operator action — quarterly recheck on
https://www.dataprivacyframework.gov/list for both vendors. Document
the SCC fallback in the DPA (`_drafts/legal/dpa-en.md`). **Unclear —
check with legal.**

### F5 — Art. 6 lawful basis — consent screen content unclear — **MEDIUM**

**Evidence:** `oauth/callback/route.ts:85-97` upserts the connection
with the scopes the provider returned; `push-sync.ts:200` requests
`changeType: 'created,updated,deleted'` (real-time push). The
provider's own consent screen lists scopes (`Calendars.Read`,
`Calendars.read` etc.) but **the in-app text shown before redirect**
isn't visible in this audit because the wizard step's copy is in
React, not surfaced in the routes I reviewed. The CLAUDE.md log notes
"What we read, what we don't" panel exists in
`/philly/onboarding/calendar` and `/philly/settings/integrations` but
the literal copy was not part of this audit.

**Severity:** MEDIUM — consent quality determines whether the Art.
6(1)(a) basis holds.

**Remediation:** Verify that the consent panel:
1. Names the controller (LucenAI / DEUS).
2. States that real-time push notifications will be enabled.
3. Lists the provider scopes in plain language.
4. Notes that calendar data will leave the EU (transfer to US).
5. Mentions Art. 9 risk if event titles contain health/religion data.
6. Includes a link to the privacy policy and the right to withdraw.
**Unclear from code alone — review the wizard/integrations React copy.**

### F6 — Art. 5(1)(e) Storage limitation — channel pruning unclear — **MEDIUM**

**Evidence:** `push-sync.ts:281-285` (`unsubscribe`) and `:413-419`
(`renew` failure) flip channels to `status='expired'` or `'error'`
but **never delete the row**. `CalendarChannel` is on a `Cascade`
delete from `CalendarConnection` (`schema.prisma:700`) which is on a
`Cascade` from `User`, so erasure works — but normal operational
expiry leaves expired/error rows accumulating indefinitely. The
`status` index (`schema.prisma:646`) suggests query-time filtering,
not pruning.

**Severity:** MEDIUM — Art. 5(1)(e) requires data not be kept "longer
than necessary"; a stale channel row with `authSecretEnc` (encrypted
credential, even if no longer valid upstream) and `syncToken` is
still personal-data-adjacent.

**Remediation:** Add a daily janitor job that deletes
`CalendarChannel` rows with `status IN ('expired','error') AND
updatedAt < NOW - 90 days`. Document the retention window in the
privacy policy. Confirm with legal whether 90 days is acceptable; the
audit-log retention pattern (`/api/audit/prune`) is the model.

### F7 — Art. 32 — `lastError` may contain provider error bodies — **LOW**

**Evidence:** `push-sync.ts:147-151` and `:481` write
`${res.status} ${text.slice(0, 200)}` into `lastError`. Provider 4xx
responses can echo back parts of the request including the user's
email or an event id. The 200-char slice partially mitigates but
doesn't strip PII deliberately.

**Severity:** LOW — only operators with DB read access see it; not
exposed via API. Still a hygiene issue.

**Remediation:** Replace verbatim provider text with a controlled
enum (`provider_4xx`, `provider_5xx`, `provider_timeout`,
`provider_response_invalid`) plus the HTTP status. Useful for
debugging, no leakage risk.

### F8 — Art. 32 — `getActiveConnection` fire-and-forget swallows errors — **LOW**

**Evidence:** `connection.ts:240-243` — the throttled `lastUsedAt`
write is `void prisma.calendarConnection.update(...).catch(() => {})`.
A persistent DB-write failure here would silently disable janitor
detection of stale connections (F6's mitigation).

**Severity:** LOW — soft signal, not a correctness gate. But
swallowing is below the rest of the codebase's bar.

**Remediation:** `.catch((e) => logger.warn('lastUsedAt write failed',
{ id: row.id, err: e.message }))` — keep the fire-and-forget, lose
the silent fail.

### F9 — Art. 32 — webhook accepts notifications for inactive channels with auth check — **LOW**

**Evidence:** `webhook/[provider]/route.ts:124-130` (Google) skips with
"channel inactive" BEFORE the timing-safe compare. An attacker who
guesses an `externalId` for a channel they know is inactive learns
status by response code (the route returns 200 + `ignored:
'channel_inactive'` instead of 401). Same in `:265-267` for MS.

**Severity:** LOW — `externalId` is a Google-channel-id (UUID) or MS
subscription id (UUID-shaped); guessing is impractical. But ordering
auth-before-state is the textbook pattern.

**Remediation:** Reorder: verify auth secret first, then check
status. Drop the "ignored" reason from the response body — return
`{received: true}` only.

### F10 — Art. 33-34 — log lines include `userId` without indication of subject — **LOW**

**Evidence:** `oauth/callback/route.ts:99-103, 144-156` and webhook
route handlers log `userId` in plain. In a breach where logs are
exfiltrated, the userId is not directly PII (it's a CUID) but it's
linkable to user records.

**Severity:** LOW — already standard practice across the codebase
and the IDs are not human-readable.

**Remediation:** None required. Note in the operator runbook that log
retention should be ≤ 90 days and access should be limited.

### F11 — Art. 17 (Erasure) — provider-side calendar grants survive User delete — **LOW**

**Evidence:** `schema.prisma:633` cascades `CalendarConnection` on
User delete, which cascades `CalendarChannel`. But the cascade does
NOT call provider-side `unsubscribe` or revoke the OAuth grant on
Google/Microsoft. The provider still has an active OAuth grant in
the user's Google/Microsoft account console.

**Severity:** LOW — token expires within the OAuth grant's lifetime,
push-sync channel times out within 7d/70h, and the grant is visible
in the user's own Google/Microsoft account where they can revoke it.
But Art. 17 erasure is "best effort to make the data inaccessible"
and a residual provider-side grant is suboptimal.

**Remediation:** On User soft-delete (the 30-day window from Bundle
3) iterate active CalendarConnections and call `unsubscribe()` +
provider-side OAuth revocation
(`https://oauth2.googleapis.com/revoke` for Google, equivalent MS
endpoint). Document in the privacy policy that "we revoke our access
on your behalf — you can also revoke it directly in your Google /
Microsoft account at any time."

---

## 4. Compliant-by-design wins

- **Encryption discipline.** `accessToken`, `refreshToken`, and
  `authSecret` all encrypted at rest via AES-256-GCM
  (`lib/philly/crypto.ts`). The encryption boundary is enforced —
  `connection.ts:5` "encrypted forms never leave this module's
  boundary" is followed: only `getActiveConnection` returns
  plaintext, and only the renew/sync workers + webhook handler
  decrypt the auth secret.
- **Constant-time HMAC compare.** `route.ts:326-333` uses
  `crypto.timingSafeEqual` after a length pre-check — textbook
  pattern, defends against timing oracles.
- **32-byte CSPRNG auth secrets.** `push-sync.ts:579-581`
  `crypto.randomBytes(32).toString('base64url')` — far above what
  Google/MS require, future-proof against quantum-pre-shared-key
  weakening (within reason).
- **Idempotency via lastMessageNum.** `route.ts:147-155` refuses
  re-deliveries below the high-water mark — no double-processing on
  Google retries.
- **TLS 1.2 minimum on MS.** `push-sync.ts:205`
  `latestSupportedTlsVersion: 'v1_2'` ensures MS won't downgrade.
- **Soft-revoke audit trail.** `connection.ts:149-160` flips status
  to `revoked` rather than deleting the row — auditable history of
  who connected what when.
- **Tenant isolation on cron.** F1 from the earlier audit fix bundle
  (AF) — admin-triggered renew is org-scoped via `listDueForRenewal`'s
  `organizationId` parameter (`push-sync.ts:357-382`); cron path
  intentionally omits to process all tenants.
- **Read-only scopes only.** No `events.create` requested today.
  Future scope expansion forces re-consent — desirable from a
  data-minimization standpoint.
- **No event payload persistence yet.** `delta-sync.ts:9-14`
  explicitly defers Art. 9-risky storage to a future bundle, giving
  legal/privacy a chance to weigh in.
- **DSAR notice mentions privacy@.** `dsar.ts:212-215` provides a
  contact route for the audit-log overflow case — operationally
  important for Art. 15 §3 (response within one month).

---

## 5. Open questions for legal/operator review

1. **DPA status with Google + Microsoft.** Both have standard
   API-terms data-processing addenda (Google's Data Processing
   Amendment, Microsoft's OST/DPA). Are these executed under a
   business-tier account, or are we on a free/personal tier where
   the consumer ToS applies and there is no DPA? **Operator must
   verify.**
2. **DPF certification verification.** Confirm Google LLC and
   Microsoft Corporation are currently active in the EU-US DPF list
   on the day the first customer goes live, and recheck quarterly.
3. **Consent text in the wizard.** The actual on-screen consent copy
   for `/philly/onboarding/calendar` and `/philly/settings/integrations`
   was not in the file scope of this audit. Legal should review the
   live React text against Art. 7 + Art. 13 transparency requirements.
4. **Art. 9 strategy.** If a customer is in healthcare or religious
   org space, is calendar push-sync appropriate at all without
   stronger Art. 9 controls (denylist, redaction, separate consent)?
5. **Retention window.** Is 90 days for expired/error channels
   acceptable, or does the customer DPA require shorter? See F6.

---

## 6. Action items

| # | Item | Owner | Severity |
|---|---|---|---|
| 1 | Add `calendar_connections` + `calendar_channels` slices to `lib/philly/dsar.ts`, omit secrets, bump `DSAR_EXPORT_VERSION` to 1.1.0 | code | HIGH |
| 2 | Before Bundle D4 (event persistence): add Art. 9 DPIA section, update consent copy, evaluate denylist | legal + code | MEDIUM |
| 3 | Add Google LLC + Microsoft Corp to subprocessor list; update `_drafts/legal/subprocessors-en.md` and the Art. 30 register | operator + legal | MEDIUM |
| 4 | Verify DPF certification status for both vendors; document SCC fallback in DPA | operator + legal | MEDIUM |
| 5 | Audit the in-wizard consent copy against Art. 7/13 checklist | legal | MEDIUM |
| 6 | Add channel-pruning janitor (90-day retention for expired/error rows); document retention | code | MEDIUM |
| 7 | Replace verbatim provider error bodies in `lastError` with controlled enum | code | LOW |
| 8 | Replace `void ... .catch(() => {})` with `.catch((e) => logger.warn(...))` in `connection.ts:240-243` | code | LOW |
| 9 | Reorder webhook handler: verify auth before `status` check | code | LOW |
| 10 | On User soft-delete, call `unsubscribe()` + provider OAuth revoke endpoints; document in privacy policy | code | LOW |
| 11 | Add quarterly DPF recheck to operator runbook | operator | LOW |

**Re-audit trigger:** when Bundle D4 (event persistence) lands — that's
the inflection point where Art. 9 special-category exposure becomes
real and where the DSAR export must include event content.
