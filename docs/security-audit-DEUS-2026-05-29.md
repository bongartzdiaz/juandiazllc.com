# DEUS CRM — Full-Spectrum Security, Privacy & Reliability Audit

**Date:** 2026-05-29 · **Branch:** `claude/zen-noyce-f6e719` · **Auditor:** principal-auditor pass (code-grounded, evidence-based)
**Standards:** OWASP ASVS · NIST SP 800-218 (SSDF) · CISA Secure by Design / Secure by Default
**Method:** read-only static review of the actual codebase (5 parallel evidence agents across auth/tenant, data-model, egress/webhooks, privacy/AI, SDLC). Every finding cites `file:line`. Where evidence was unavailable: **"Not verifiable from provided artefacts."**

---

## A. Executive summary

DEUS is a **multi-tenant B2B CRM** (`app/philly/*`) on **Next.js 16 + Prisma 7 + MySQL/MariaDB**, with **Supabase for authentication only** and a separate single-tenant **Supabase `li.*`** schema for outreach leads. It ships ~149 API routes, a mature `lib/philly/*` security layer (AES-256-GCM crypto, audit log, DSAR, rate-limit, 2FA, Zod validation, invites/seats), and deploys to Vercel (Hetzner+Postgres cutover planned but **not yet live**).

**Overall posture: solid foundations, not yet enterprise-grade, with one conditional-critical multi-tenant boundary risk.** The team has clearly invested in security (deliberate DSAR secret-stripping, signed OAuth state, timing-safe webhook checks, calendar data-minimisation for GDPR Art. 9, no committed secrets). But the isolation model is **100% application-enforced with no database backstop**, several **race-safety guarantees are mis-claimed for the wrong DB engine**, and the **SDLC has no pre-merge gate** — type errors, failing tests, or an authorization regression can merge to `main` and auto-deploy unblocked.

The single most dangerous issue is **auto-provisioning** (`auth-helpers.ts`): any identity that obtains a Supabase session but has no CRM user row is silently created as a member of the *oldest* organization (admin if it's the first user). If the shared Supabase project permits open signup, this is a **direct tenant breakout** — verifying the Supabase signup setting is the #1 priority.

- **Findings:** 1 Critical-conditional, 12 High, 14 Medium, 8 Low/Info.
- **Production blockers:** pre-merge CI gate, auth-helpers tests, fix CSRF fail-open.
- **Multi-tenant blockers:** fix auto-provisioning, shared-store rate limiter, `li.*` tenant scoping, MySQL race-safety.
- **Enterprise blockers:** SBOM/SCA, tamper-evident audit log, working secrets-scan, LLM DPA, security alerting.

---

## B. Assumptions and missing artefacts

**Assumptions made:**
1. The MySQL/MariaDB engine is authoritative today (`prisma/schema.prisma:6` `provider="mysql"`, `@prisma/adapter-mariadb`); the planned Postgres cutover is **future**, so all findings are evaluated against MySQL semantics.
2. Supabase is the live auth provider (`lib/philly/auth.ts`); the NextAuth `Account` table is dormant.
3. Vercel multi-lambda is the current deploy target (affects rate-limit findings).

**Artefacts required to close open items (cannot verify from code):**
- **Supabase Auth project settings** — is open signup enabled? email-domain allowlist? *(blocks final severity of A-01, A-25)*
- **GitHub branch-protection / required-status-checks** config on `main` *(A-09)*
- **Production env-var inventory** — `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`, `INTEGRATION_SECRET`, `ANTHROPIC_API_KEY`, Supabase SSR cookie `SameSite/Secure` options *(A-16, A-25)*
- **Anthropic DPA + zero-retention + EU residency** evidence *(A-21)*
- `lib/philly/integrations/oauth.ts` state-signing strength *(A-17)*
- Load/concurrency test results for the invite/seat races on MySQL *(A-05)*
- Full route enumeration: ~15 of 149 routes were sampled; **~105 route handlers remain unverified** for universal org-filtering *(A-03)*

---

## C. System model and trust boundaries

```
                        ┌─────────────────────────────────────────────┐
  Browser / API client ─┤  Vercel edge → proxy.ts (CSP, CSRF, auth gate)│
                        └───────────────┬─────────────────────────────┘
                                        │  PUBLIC_PHILLY_PATHS allowlist
                                        │  (health, billing/webhook, calendar/webhook, crons)
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
  app/[locale]/* (marketing,     app/philly/* CRM (149 API routes) ── lib/philly/* security layer
   public, brand)                 requireScope/requireRole              (crypto, audit, dsar, rate-limit,
        │                          (auth-helpers.ts)                     invites, seats, 2FA, validation)
        ▼                               │
  Supabase Auth (session)  ◄────────────┤  org scope derived from session→DB
                                        ▼
                    Prisma 7 → MySQL/MariaDB  ◄── NO RLS (app-layer tenant filter only)
                                        │
        ┌───────────────┬───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼
   Stripe (billing)  Resend (email)  Google/MS       Anthropic LLM   Supabase `li.*`
   webhook-verified  outbound        Calendar OAuth  (contact AI)    (outreach, SINGLE-TENANT,
                                     tokens enc.      PII egress       no org scoping)
```

**Trust boundaries:** (1) edge proxy → app; (2) session → org scope (the critical tenant boundary, app-enforced); (3) app → MySQL (no RLS); (4) app → third parties (Stripe/Resend/Google/MS/Anthropic); (5) DEUS Prisma data ↔ `li.*` Supabase data (two different isolation models in one app).

**Crown jewels:** customer PII (contacts/companies), deal values + commissions, calendar event metadata, encrypted OAuth/integration tokens, 2FA secrets, API keys, audit logs, billing/subscription data, DSAR exports. **Tenant boundary = `organizationId`, enforced only in application code.**

**User roles:** `admin` / `manager` / `viewer` (DB-authoritative via `requireRole`; Supabase `app_metadata.role` is a best-effort mirror that can drift).

---

## D. Audit findings by domain (scoring model)

> Severity: Critical / High / Medium / Low / Info · Confidence: High / Med / Low
> Mapping: ASVS = OWASP ASVS · SSDF = NIST SP 800-218 · CISA = Secure by Design

### Tenant isolation & authorization

**A-01 · Auto-provisioning joins any authenticated user into the first org (admin if first) · Critical-conditional · Confidence High**
- *Evidence:* `lib/philly/auth-helpers.ts:78-108` — `findFirst({orderBy:{createdAt:'asc'}})` then `create({ role: userCount===0?'admin':'viewer', organizationId: org.id })`. No invite check on this path.
- *Exploit:* if the shared Supabase project allows open signup, any registrant who hits `/philly/*` is provisioned into the live customer's org (viewer; admin on a fresh deploy) → cross-tenant read of all contacts/deals/documents. Bypasses invite/seat system entirely.
- *Mapping:* ASVS V2.2.1/V4.1.1 (no implicit grants); CISA secure-default deny-by-default.
- *Remediation:* require a matching pending `Invite`; if no CRM user row → 403, never auto-create. Block first-org auto-join when >1 org exists. **Verify Supabase signup setting — sets final severity (Critical if open, High if invite-only).**

**A-02 · v1 API `POST` cross-tenant foreign-key injection (BOLA write) · High · Confidence High**
- *Evidence:* `app/philly/api/v1/[...path]/route.ts:107-175` — for relation-scoped resources (`offers`, `reservations`, `showings`, `transactions`) the scopeFilter is `{property:{organizationId}}`, so `'organizationId' in filter` is false → no org injected, and client-supplied `propertyId/roomId/dealId/contactId` flow straight into `prisma.*.create`. `Offer` has no `organizationId` column (`schema.prisma:1215`). PATCH/DELETE are safe (org-scoped `findFirst`); only create is missing the check.
- *Exploit:* a `write`-scoped API key in Org A creates an offer/reservation/showing attached to Org B's property/room → attacker-controlled rows on another tenant's records, readable/patchable back.
- *Mapping:* ASVS V4.2.1/V13.1.4; CISA eliminate-vuln-class.
- *Remediation:* pre-flight validate every supplied FK against `scope.organizationId` (mirror `deals/route.ts:94-98` which already does this for `pipelineId`).

**A-03 · No database-level RLS — tenant isolation is 100% application-enforced · High · Confidence High**
- *Evidence:* MySQL/MariaDB engine (`schema.prisma:6`, `lib/philly/auth.ts:27`); zero `CREATE POLICY`/`ENABLE ROW LEVEL SECURITY` anywhere. No backstop if any one route omits the org filter.
- *Exploit:* any forgotten `organizationId` clause in 1 of ~149 routes = silent full-tenant exposure. ~105 routes unsampled.
- *Mapping:* ASVS V1.4.4/V4.1.3; CISA defense-in-depth.
- *Remediation:* Prisma client extension that injects `organizationId` for tenant models and throws if scope unset; CI lint asserting every `findMany/findFirst/count` on tenant models filters org; add real RLS on the planned Postgres cutover (GUC-keyed policies).

**A-13 · `li.*` outreach leads have zero tenant scoping · High (latent) · Confidence High**
- *Evidence:* `app/philly/api/outreach/leads/[id]/route.ts:63-69` — `liClient()` Supabase query `.eq("id", id)` with **no org filter**. Single-tenant by design (memory), but any authenticated DEUS user (any org) can read/PATCH any lead.
- *Exploit:* the moment a 2nd customer's data lands in `li.*`, full cross-tenant bleed.
- *Remediation:* do NOT onboard customer #2 onto `li.*` surfaces until tenant-scoped (4-step migration already documented).

**A-17 · `integrations/oauth/callback` binds tokens to state.orgId without session-org match · Medium · Confidence Med**
- *Evidence:* `app/philly/api/integrations/oauth/callback/route.ts:25-63` — org from signed `state` only, no `requireScope()` / no `scope.organizationId === payload.orgId` check. The calendar callback (`calendar/oauth/callback/route.ts:61-74`) does this correctly — inconsistent.
- *Remediation:* mirror the calendar flow; verify `lib/philly/integrations/oauth.ts` state HMAC+exp+nonce. *Not fully verifiable without that file.*

### Data integrity & CRM correctness

**A-05 · MySQL engine mismatch — `Serializable` race-safety + comments are wrong · High · Confidence High**
- *Evidence:* `me/route.ts:142-146,171` and `organizations/invites/route.ts:80-138` set `{isolationLevel:'Serializable'}` with comments claiming "Postgres detects the conflict and rolls one back" — but the engine is MySQL (`schema.prisma:6`). MySQL/InnoDB SERIALIZABLE uses locking reads, not Postgres SSI predicate-conflict detection; the `count`-then-`create` phantom race is exactly what it does NOT cleanly cover.
- *Exploit:* concurrent invites can oversubscribe seats; concurrent self-deletes can drop the last admin — contrary to the code's claimed guarantee. (The `/serializable|deadlock|conflict/i` matcher catches MySQL deadlocks → 409, partial mitigation.)
- *Remediation:* enforce invariants with `SELECT ... FOR UPDATE` on the org row (serialize the critical section) or a DB constraint; **fix the misleading comments**. Invite-*accept* (`accept/route.ts:102`) uses default isolation and checks seats *outside* the tx — also fix.
- *Mapping:* ASVS V1.11 (business-logic integrity); CISA.

**A-06 · No unique constraint on Contact email → silent duplicates, no merge tool · High · Confidence High**
- *Evidence:* `Contact` (`schema.prisma:277-327`) `email String @default("")`, no `@@unique`. Dedup is app-level only in `contacts/import/route.ts:53-70` (and has a case-normalisation bug at `:64-69`). No contact-merge code exists anywhere.
- *Exploit:* `POST /api/contacts`, AI flow, automations all freely double-insert; duplicates split notes/activities/deals with no remediation path.
- *Remediation:* add normalised `emailLower` + `@@unique([organizationId, emailLower])` (NULL for blanks since MySQL lacks partial indexes); ship a merge endpoint re-parenting notes/activities/deals/LeadScore (mind `LeadScore @@unique([contactId])` collisions).

**A-07 · Seat accounting counts soft-deleted users → 30-day seat leak · High · Confidence High**
- *Evidence:* `lib/philly/seats.ts:62` and `accept/route.ts:74` `user.count({where:{organizationId}})` — no `deletedAt:null`. (The last-admin guard *does* filter — `me/route.ts:155`.)
- *Exploit:* offboarded users hold a seat for the 30-day soft-delete window; an at-cap org can't invite a replacement. Customer-facing billing/onboarding bug.
- *Remediation:* add `deletedAt:null` to both counts.

**A-23 · `Deal` has no `organizationId` — cross-tenant risk in revenue aggregation · Medium · Confidence High**
- *Evidence:* `schema.prisma:540-593` — Deal tenancy only via optional `pipelineId`→`Pipeline.organizationId` (or contact/project/property; `ownerId` is FK-less to org). The money table.
- *Exploit:* a revenue/forecast aggregation filtered on `contactId`/`ownerId` without forcing the pipeline join can sum deals across tenants → reporting lies.
- *Remediation:* denormalise indexed `organizationId` onto `Deal`.

**A-26 · Org soft-delete not enforced at auth boundary; no org hard-purge · Medium · Confidence Med**
- *Evidence:* `auth-helpers.ts:79` resolves org without `deletedAt:null`; `user-purge.ts` covers users only — no org→children purge despite `schema.prisma:20-21` promise.
- *Exploit:* soft-deleted org's data still reachable; GDPR org-erasure unfulfillable.
- *Remediation:* filter `deletedAt:null` on org resolution; build `org-purge.ts` or document anonymise-tombstone strategy.

**A-27 · Provider message IDs not unique → inbound webhook double-processing · Medium · Confidence Med**
- *Evidence:* `Email.messageId` (`:1754`), `Message.externalId` (`:1432`), `SmsMessage.providerSid` (`:1792`) — not unique, not indexed.
- *Remediation:* `@@unique([accountId, messageId])` etc. + index.

**A-34 · Missing FK `onDelete` on org→children; org erasure unimplemented · Medium · Confidence High**
- *Evidence:* ~30 `organization Organization @relation` declarations with no `onDelete`; Pipeline→Stage cascades but Stage←Deal restricts → cascade fails mid-chain.
- *Remediation:* decide org-erasure strategy; declare explicit `onDelete` across the chain.

**A-35 · Orphaned owner refs after user purge · Low · Confidence High**
- *Evidence:* FK-less `Contact.assignedToId`, `Deal.ownerId`, `Showing.agentId` not nulled by `user-purge.ts`.
- *Remediation:* null these in purge or FK them with `onDelete:SetNull`.

### Data egress, exports, webhooks

**A-04 · SSRF via unvalidated outbound webhook URL; responses readable in delivery log · High · Confidence High**
- *Evidence:* `app/philly/api/webhooks/route.ts:44-57` + `[id]/route.ts:45` store `body.url` with no scheme/host validation; `lib/philly/webhooks/dispatcher.ts:29,88` blindly `fetch()`es it and captures up to 2000 chars of response into `WebhookDelivery.response`, readable via `GET /api/webhooks/[id]`. Neither route is rate-limited. Same in `automation/engine.ts:170`.
- *Exploit:* admin registers webhook → `http://169.254.169.254/...` (cloud metadata) or internal services; blind-and-reflected SSRF reads internal responses out of the delivery log.
- *Mapping:* ASVS V12.6/V5.2.6; CISA.
- *Remediation:* require `https://`, resolve+reject RFC1918/loopback/link-local/metadata (re-resolve at dispatch to defeat DNS-rebind), add rate limit, stop echoing target responses into the readable log.

**A-15 · CSV formula injection NOT neutralized on export · Medium · Confidence High**
- *Evidence:* `lib/philly/export.ts:6-9` only RFC-quote-escapes; never neutralizes `= + - @` cells. `neutralizeFormula()` exists but is import-only. Live paths: `CommandPalette.tsx:149-150`, `reports/page.tsx:202,340`, `contacts/bulk` export.
- *Exploit:* attacker sets contact `company = =HYPERLINK(...)`; operator exports + opens in Excel → formula executes / data exfiltrates.
- *Remediation:* apply `neutralizeFormula()` to every cell in `exportToCSV` (idempotent, safe).

**A-18 · Most mutation routes lack rate limiting; contact-create triggers unthrottled LLM spend · Medium · Confidence High**
- *Evidence:* only 34 of ~149 routes call `enforceRateLimit`. `contacts/route.ts` POST fires per-create LLM enrichment (`runAndPersistContactAttributes`, `:93`) with no throttle.
- *Exploit:* scripted bulk single-creates → LLM cost-amplification DoS.
- *Remediation:* shared rate-limit wrapper on all mutations.

**A-29 · Cron-secret comparison not constant-time · Low · Confidence High**
- *Evidence:* `audit/prune/route.ts:45`, `users/cron/hard-purge/route.ts:39`, `calendar/cron/*` use `headerSecret === cronSecret` (publicly reachable via `PUBLIC_PHILLY_PATHS`). Webhook routes correctly use `timingSafeEqual`.
- *Remediation:* use `crypto.timingSafeEqual`; the destructive hard-purge cron warrants it.

**A-33 · Inbound webhook auto-creates rows for arbitrary provider · Low · Confidence Med**
- *Evidence:* `webhooks/inbound/[provider]/route.ts:100-119` auto-creates `Webhook` + 65KB `WebhookDelivery` per accepted POST; `provider` unallowlisted. (Token check is timing-safe + IP-rate-limited — cross-org spoofing blocked.)
- *Remediation:* allowlist `provider`; require pre-registration.

### Authentication, crypto, session

**A-16 · Dev crypto fallback key usable when `NODE_ENV != production` · Medium · Confidence Med**
- *Evidence:* `lib/philly/crypto.ts:20-32` hard-fails only on `NODE_ENV==='production'`; otherwise returns a hardcoded public key. Same forgeable-HMAC fallback in `calendar/state.ts:43-48`.
- *Exploit:* a staging/preview/misconfigured box encrypts OAuth/calendar/2FA secrets with a repo-public key; OAuth state forgeable.
- *Remediation:* require `INTEGRATION_SECRET` unconditionally; gate the dev placeholder behind explicit `ALLOW_INSECURE_DEV_CRYPTO=1`.

**A-24 · API keys hashed with unsalted SHA-256 · Medium · Confidence High**
- *Evidence:* `lib/philly/api-keys.ts:21,37`. Raw keys are high-entropy (brute-force infeasible) but a DB/backup leak enables offline matching faster than a KDF; no lib-layer throttle on failed lookups.
- *Remediation:* HMAC (keyed) or argon2 verifier + constant-time compare; throttle failed validations.

**A-25 · CSRF same-origin check fails open when Origin+Referer both absent · Medium · Confidence High**
- *Evidence:* `proxy.ts:187-202` runs the cross-origin block only `if (origin || referer)`; a request with neither passes. No test for the missing-both case.
- *Exploit:* tooling stripping Referer + omitting Origin bypasses the guard; defense rests entirely on SameSite cookies (unverified).
- *Remediation:* treat absent Origin on unsafe methods as block, or add a CSRF token; confirm Supabase auth cookie `SameSite`.

**A-28 · CSP keeps `'unsafe-inline'` on enforced script-src · Low · Confidence High**
- *Evidence:* `proxy.ts:114-119,244` — strict nonce policy ships Report-Only; enforced policy allows inline scripts.
- *Exploit:* any XSS sink (e.g. unescaped contact `notes`) executes freely; CSP is monitoring-only.
- *Remediation:* flip nonce + `strict-dynamic` to enforced (report-only already proves it works).

**A-30 · Documents PATCH skips Zod validation · Low · Confidence Med**
- *Evidence:* `documents/[id]/route.ts:30-46` parses raw JSON; caller sets `entityType/entityId` unchecked (row stays org-scoped — not cross-tenant).
- *Remediation:* add `updateDocumentSchema`; validate entity ref.

### Privacy & GDPR

**A-08 · Hard-purge leaves calendar OAuth tokens + synced event PII → Art. 17 incomplete · High · Confidence High**
- *Evidence:* `lib/philly/user-purge.ts:89-132` nulls User PII but never touches `CalendarConnection` (`accessTokenEnc/refreshTokenEnc/providerEmail`), `CalendarChannel`, `SyncedCalendarEvent` (`title/location/matchedEmails`). DSAR *exports* these (`dsar.ts:182-237`) but purge doesn't *erase* them — inconsistency.
- *Exploit:* after erasure "succeeds," the org retains a live, auto-refreshing OAuth grant to the deleted user's calendar + meeting metadata; refresh token never revoked provider-side.
- *Mapping:* GDPR Art. 17(1), Art. 5(1)(e); ASVS V8.3.
- *Remediation:* in purge, `unsubscribe()` + provider token-revoke, then delete calendar connection/channel/synced-event rows; add counts to purge result.

**A-20 · Prompt injection: untrusted contact notes interpolated into LLM prompt · Medium · Confidence High**
- *Evidence:* `lib/philly/ai/contact-attributes.ts:80-91` concatenates raw `notes.slice(0,1500)` into the prompt with no delimiter/escaping. Output is zod-structured (no structural exfiltration), but `aiSummary`/`aiIcpFit` content is attacker-influenceable and shown as trusted enrichment.
- *Mapping:* OWASP LLM01/LLM05.
- *Remediation:* delimit untrusted fields + instruct model to treat as data; output-side sanity check.

**A-21 · LLM data-governance (Anthropic DPA / EU / no-train) unverified · Medium · Confidence Med**
- *Evidence:* `contact-attributes.ts:22-23,101` sends contact PII to Anthropic; no code/doc assertion of DPA, zero-retention, EU residency, or org opt-in. *Not verifiable from code.* (`insights.ts`/`scoring.ts`/`nl-query.ts` are deterministic — no LLM, verified.)
- *Mapping:* GDPR Art. 28/30/44-46.
- *Remediation:* confirm DPA + zero-retention; publish Anthropic in sub-processor list; gate AI behind org opt-in; document lawful basis.

**A-22 · PII (invitee email) in logs; logger doesn't redact email/name · Medium · Confidence High**
- *Evidence:* `organizations/invites/route.ts:168` logs raw `email`; `logger.ts:24-39` `REDACT_KEYS` lacks `email`/`name`. `log-error/route.ts:38-53` forwards client `url`+`ip` to Sentry.
- *Mapping:* GDPR Art. 5(1)(c)/32; ASVS V7.1.1.
- *Remediation:* drop/mask email in logs; add email/name to a soft-mask list.

**A-31 · Dormant NextAuth `Account` table stores OAuth tokens plaintext · Low (latent) · Confidence Med**
- *Evidence:* `schema.prisma:206-211` plaintext `refresh_token/access_token/id_token`; dormant (Supabase is live).
- *Remediation:* drop the unused table or guard against plaintext writes.

**A-36 · Admin org-DSAR bundles all teammates' calendar event PII · Low · Confidence Med**
- *Evidence:* `dsar.ts:182-237` `scope==='org'` pulls all members' calendar `title/location/matchedEmails`.
- *Remediation:* confirm this is a controller-admin export, not an Art. 15 subject response; restrict calendar slices to `scope==='user'`.

### SDLC, supply chain, observability

**A-09 · No pre-merge CI gate (typecheck/test/lint advisory) · High · Confidence High**
- *Evidence:* `.github/workflows/lighthouse.yml` is the only workflow (post-merge, perf-only). 358 tests + typecheck exist but nothing runs them on PRs; merge-to-`main` auto-deploys.
- *Mapping:* SSDF PW.7/PW.8/PO.3; CISA secure-default.
- *Remediation:* add `ci.yml` running `npm ci && typecheck && test && lint` on `pull_request`; required status checks + branch protection.

**A-10 · No SCA / SBOM / Dependabot · High · Confidence High**
- *Evidence:* no `npm audit` step, no SBOM artifact, no `dependabot.yml`/`renovate.json`. Lockfile committed (good).
- *Mapping:* SSDF PW.4/RV.1/PS.3; CISA SBOM.
- *Remediation:* `npm audit --audit-level=high` in CI; Dependabot; CycloneDX SBOM as release artifact.

**A-11 · AuditLog mutable / not tamper-evident · High · Confidence Med**
- *Evidence:* `schema.prisma:438-453` ordinary table (no hash-chain/WORM); `audit.ts:12-70` lists `auditLog` as a mutable entity; prune cron deletes rows. Admin with access can edit/delete its own trail.
- *Mapping:* SSDF PO.3/RV.2; CISA accountability.
- *Remediation:* revoke UPDATE/DELETE from app role (prune via privileged job) or add per-row HMAC/hash-chain; ship to an external immutable sink.

**A-12 · No tests on auth-helpers (requireScope/requireRole/tenant isolation) · High · Confidence High**
- *Evidence:* 25 test files exist (CLAUDE.md's "~1%" is outdated — validation/2FA/crypto/rate-limit/Stripe/calendar-state are covered), but **no `auth-helpers.test.ts`** and no route-level integration tests. The authz layer guarding all 149 routes is untested.
- *Mapping:* SSDF PW.8 (risk-based — authz is highest risk).
- *Remediation:* `auth-helpers.test.ts`: 401 unauth, 403 wrong-role, 410 deleted-user, org-scope assignment, auto-provision branch. Highest-ROI test work.

**A-14 · Rate limiter in-memory per-instance · Medium · Confidence High**
- *Evidence:* `lib/philly/rate-limit.ts:32` `new Map()`; header says swap for Redis. On Vercel multi-lambda each instance resets.
- *Exploit:* spread requests across instances to defeat login throttle, invite-token brute-force, AI cost caps, email abuse.
- *Remediation:* Redis/Upstash/Vercel KV before multi-instance.

**A-19 · Audit log server-to-server blind (webhooks/cron not audited) · Medium · Confidence High**
- *Evidence:* `schema.prisma:441` `userId` required; `audit.ts:96` always sets `scope.userId`. Stripe webhook + cron state-changes fall back to `logger.info` (ephemeral).
- *Remediation:* nullable `userId` or a system-user row + `actor` enum; route webhook/cron mutations through `logAudit`.

**A-32 · No security alerting · Medium · Confidence High**
- *Evidence:* `observability.ts` SLOs are latency-only; no alerts on failed-login bursts, anomalous bulk actions, or cross-tenant access patterns.
- *Mapping:* SSDF RV.1.
- *Remediation:* add detection rules on auth-failure spikes + bulk/export anomalies.

**A-37 · Opsera secrets/security pre-commit hook non-functional and routinely bypassed · Medium · Confidence Med**
- *Evidence:* hook lives in global plugin cache (not version-controlled); memory documents it "references an unloaded scan tool" and repeated flag-touch bypasses. No gitleaks/trufflehog anywhere.
- *Remediation:* replace with a committed `gitleaks` CI job + working local hook; stop the bypass pattern.

---

## E. Top critical vulnerabilities and failures (Top 10)

| # | ID | Finding | Severity |
|---|----|---------|----------|
| 1 | A-01 | Auto-provisioning → any authed user joins first org (admin if first) | Critical-conditional |
| 2 | A-02 | v1 API POST cross-tenant FK injection (BOLA write) | High |
| 3 | A-03 | No DB RLS — single forgotten filter = full tenant leak | High |
| 4 | A-04 | SSRF via unvalidated outbound webhook URL + readable responses | High |
| 5 | A-05 | MySQL race-safety mis-claimed (seat/last-admin oversubscribe) | High |
| 6 | A-08 | Hard-purge leaves live calendar tokens → GDPR Art. 17 gap | High |
| 7 | A-06 | No Contact-email uniqueness → silent duplicates, no merge | High |
| 8 | A-09 | No pre-merge CI gate; regressions auto-deploy | High |
| 9 | A-11 | Mutable, prunable audit log (no non-repudiation) | High |
| 10 | A-13 | `li.*` outreach leads — zero tenant scoping (bleed at customer #2) | High |

---

## F. Functional gaps and correctness risks

- **No contact-merge feature** despite duplicate-creation being possible (A-06) — operators have no remediation path.
- **Import dedup case-normalisation bug** (`import/route.ts:64-69`) skips dedup for mixed-case emails.
- **Invite-accept seat check outside the transaction** (`accept/route.ts:74`) — two invitees can race the last seat.
- **Inbound message double-processing** on provider retries (A-27).
- **Deleted users/orgs leak** into assignee pickers / member lists / reachable data (A-26, soft-delete not consistently filtered).
- **Orphaned owner references** after purge (A-35).
- *Verified correct:* deal amounts are `Int` cents (no float corruption); nl-query is deterministic + org-scoped; calendar data-minimisation drops `description`.

---

## G. Security posture assessment

**Strong:** DSAR secret-stripping (exemplary), AES-256-GCM at rest, signed OAuth state with TTL + constant-time compare (calendar flow), timing-safe webhook + Stripe signature verification, Zod validation on most inputs, bcrypt(12) passwords, 2FA with uniform-timing recovery, pagination caps, parameterized queries (no SQLi found), no committed secrets, calendar Art. 9 minimisation.

**Weak:** tenant isolation has no DB backstop (A-03) and one confirmed BOLA write (A-02) + a conditional-critical auto-join (A-01); CSP/CSRF are monitoring/fail-open (A-25/A-28); SSRF on webhooks (A-04); rate limiting ineffective at scale (A-14); export formula-injection (A-15).

**ASVS readiness:** ~L1 with material L2 gaps (access control, anti-automation, output encoding, logging). Not L2-complete.

---

## H. SDLC and supply-chain assessment (NIST SSDF)

| SSDF practice | State |
|---|---|
| PO.3 toolchain | ⚠️ CI exists but no security/quality gate; Opsera hook broken (A-37) |
| PW.7/PW.8 review+test | ❌ no pre-merge gate (A-09); authz untested (A-12) |
| PW.4 third-party | ⚠️ lockfile pinned, but no SCA/Dependabot (A-10) |
| PS.1 protect code | ✅ no secrets committed; ⚠️ no secrets-scan gate |
| PS.3 provenance/SBOM | ❌ no SBOM (A-10) |
| RV.1/RV.2 vuln mgmt | ❌ no continuous scanning, no security alerting (A-32) |

---

## I. Reliability / performance / operations assessment

- **Rate-limit store** is per-instance → ineffective + a reliability foot-gun on scale (A-14).
- **Observability:** SLO spans on 3 paths (login, create-deal, AI) via `withSpan`; no-ops without Sentry DSN. **No security/anomaly alerting** (A-32).
- **Indexes** generally good; gaps on `Subscription.stripeCustomerId`, `Deal.ownerId`, provider message-id columns.
- **Idempotency:** calendar webhooks dedupe via `lastMessageNum`; Stripe dispatch idempotent; **inbound email/SMS not idempotent** (A-27).
- **RPO/RTO, backup/restore integrity, queue backlog behavior:** *Not verifiable from provided artefacts* — no IaC/backup config in repo.

---

## J. Privacy and governance assessment

**Strong:** DSAR export shape is deliberate and secret-stripped; soft-delete + anonymise-tombstone purge is well-reasoned; calendar minimisation is a strong Art. 9 posture; encryption at rest for tokens/2FA.

**Gaps:** erasure incomplete for calendar data (A-08, **true Art. 17 gap**); PII in logs (A-22); LLM processing ungoverned/unconsented (A-21); org-DSAR over-discloses teammate calendar PII (A-36); no org-level erasure (A-26); consent/retention beyond user-purge *not verifiable*.

---

## K. Prioritized remediation roadmap

**Quick wins (0–30 days)**
- A-15 neutralize formula on export (1-line reuse) · A-07 add `deletedAt:null` to seat counts · A-29 timing-safe cron compare · A-05 **fix the misleading Postgres comments** + `SELECT FOR UPDATE` on org row · A-22 drop/mask email in logs · A-16 require `INTEGRATION_SECRET` unconditionally · A-02 validate FKs on v1 create.

**Mid-term (30–90 days)**
- A-09 pre-merge CI gate + branch protection · A-12 auth-helpers + route authz tests · A-01 fix auto-provisioning (invite-required) · A-04 webhook URL allowlist + SSRF guard + rate limit · A-14 shared-store rate limiter · A-06 contact uniqueness + merge endpoint · A-08 calendar erasure in purge · A-10 SCA + Dependabot + SBOM · A-25 CSRF fail-closed.

**Long-term (90+ days)**
- A-03 RLS on the Postgres cutover + Prisma org-scope extension + CI lint · A-11 tamper-evident audit log · A-23 denormalise `organizationId` onto Deal · A-13 tenant-scope `li.*` before customer #2 · A-32 security alerting · A-21 LLM DPA + opt-in · A-19 system-actor audit.

**Must fix before production:** A-09, A-12, A-25.
**Must fix before scaling to many tenants:** A-01, A-03, A-05, A-14, A-13.
**Must fix before enterprise customers:** A-10 (SBOM/SCA), A-11 (immutable audit), A-37 (secrets-scan), A-21 (LLM DPA), A-32 (alerting).
**Acceptable temporarily with compensating controls:** A-28 (CSP report-only — monitor), A-24 (high-entropy keys), A-30, A-31 (dormant), A-33 — provided the compensating control (e.g. SameSite cookies for A-25 interim, provider-side caps for A-14 interim) is documented.

---

## Required special sections

### Likely CRM-specific hidden failure modes
Duplicate contacts silently created (A-06); wrong/ghost owner after purge (A-35); deal totals mixing tenants via optional joins (A-23); deleted users in assignee pickers (A-26); inbound email/SMS duplicated on retry (A-27); seat cap blocked 30 days by soft-deleted users (A-07); automation `callWebhook` SSRF (A-04).

### Abuse cases and attacker paths
1. Open-signup Supabase → auto-join live org (A-01). 2. `write` API key → cross-tenant offer/reservation create (A-02). 3. Register webhook → SSRF cloud-metadata, read response from delivery log (A-04). 4. Poison a contact `company` field → operator CSV export → formula execution (A-15). 5. Distribute requests across lambdas → brute-force invite tokens / amplify LLM cost (A-14/A-18). 6. Stripped Origin+Referer POST → CSRF (A-25).

### What I would try first as an attacker
1. Authenticate to the shared Supabase with an arbitrary email and `GET /philly/api/me` — if signup is open, instant tenant access (A-01). 2. `POST /api/v1/offers` with another org's `propertyId` (A-02). 3. Diff list-endpoint result counts across two orgs to find a route missing the org filter (A-03, no RLS backstop). 4. Register an SSRF webhook (A-04).

### Most likely tenant isolation failures
A-01 (auto-join, design-level) > A-02 (v1 create, confirmed) > a forgotten org filter in the ~105 unsampled routes (A-03) > A-13 (`li.*`) > A-17 (integrations OAuth org binding).

### Most dangerous silent data integrity failures
Duplicate contacts (A-06); MySQL race oversubscription (A-05); seat leak (A-07); cross-tenant deal aggregation (A-23); deleted-record leakage (A-26); inbound message duplication (A-27).

### Where reporting can lie without obvious errors
`Deal` aggregations that don't force the pipeline join can sum across tenants (A-23); soft-deleted users/orgs inflate "active member" / assignment metrics (A-26); duplicate contacts split activity counts and inflate pipeline counts (A-06); a forgotten org filter makes any dashboard show another tenant's totals silently (A-03).

### Release-blocking criteria
- **Production:** pre-merge CI gate (A-09) + auth-helpers tests (A-12) + CSRF fail-closed (A-25).
- **Multi-tenant GA:** auto-provisioning fixed (A-01) + `li.*` scoped (A-13) + shared rate-limiter (A-14) + MySQL race-safety (A-05).
- **Enterprise:** SBOM/SCA (A-10) + immutable audit (A-11) + LLM DPA (A-21) + security alerting (A-32) + working secrets-scan (A-37).

### Minimum evidence required to claim enterprise-grade security and privacy
1. Penetration test report (3rd-party) covering tenant isolation + the BOLA/SSRF findings closed. 2. SBOM + clean SCA + documented patch SLA. 3. Required-status-check + branch-protection screenshots; CI logs showing test/typecheck/lint/secrets-scan gates. 4. Tamper-evident audit-log design + retention policy. 5. Signed DPAs + sub-processor list (incl. Anthropic) + data-residency attestation. 6. Tenant-isolation test suite (authorization matrix) in CI. 7. Incident-response runbook + RPO/RTO + backup-restore drill evidence. 8. RLS (or equivalent enforced) on the production DB. 9. Security alerting rules + on-call. 10. Completed DPIA for AI features + calendar processing.

---

## L. Appendix — verification test cases (highest-priority)

- **Tenant isolation matrix:** for each resource, Org-A user attempts read/write of an Org-B record by id → expect 404 (not 403, to avoid existence leak). Automate across all 149 routes.
- **A-01:** create a fresh Supabase identity with no CRM row → hit `/philly/api/me` → expect 403, not auto-provision.
- **A-02:** `write` API key POSTs `/api/v1/offers` with foreign `propertyId` → expect 404/validation error.
- **A-05:** N concurrent invite-accepts at seat cap → expect exactly `seatLimit` users, no oversubscription; N concurrent self-deletes of the 2 admins → expect ≥1 admin remains.
- **A-04:** register webhook URL `http://169.254.169.254/` → expect rejection at create.
- **A-15:** contact `company="=1+1"` → export CSV → cell stored as `'=1+1` (neutralized).
- **A-08:** soft-delete a user with a calendar connection → run purge → expect calendar connection/channel/synced-events deleted + provider token revoked.
- **A-25:** POST with no Origin + no Referer to a mutation route → expect block.

*Coverage note: ~15 of 149 routes were directly sampled; tenant-isolation assurance over the remaining ~105 is the largest open verification item (A-03).*
