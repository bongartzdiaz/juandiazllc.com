# Session policy

The platform implements four session controls that together meet
typical enterprise security requirements (NIST SP 800-63B AAL2-ish,
SOC 2 CC6.1). All four are evaluated on every authenticated API
call by `requireScope()` in `lib/philly/auth-helpers.ts`.

| Control | Scope | Where configured | Default |
| ---- | ---- | ---- | ---- |
| **Supabase session lifetime** | Global | Supabase project → Auth → Sessions | 1 hour access + 30-day refresh |
| **Global session invalidation** | Per user | `User.tokensInvalidAfter` | NULL = never |
| **Idle timeout** | Per organisation | `Organization.sessionIdleTimeoutMinutes` | NULL = no idle timeout |
| **IP allowlist** | Per organisation | `Organization.ipAllowlist` | NULL = open |

## 1. Supabase session lifetime

Set in the Supabase dashboard. Two values matter:

- **JWT expiry** — how long an access token lives. Default 3600 s.
  Lower values mean Supabase issues a refresh more often (more
  network traffic but tighter blast radius if a token leaks).
- **Inactivity timeout** — how long an unused refresh token lives.
  Default 30 days. For an enterprise customer, drop this to
  `<=7 days`.

These values are global to the Supabase project and apply to every
customer. Make them strict enough to satisfy the most-demanding
customer; per-customer hardening is layered on top via §3 + §4.

## 2. Global session invalidation (per user)

Set `User.tokensInvalidAfter` to "now" to invalidate every
JWT issued for that user before that timestamp. Use this to:

- Force a sign-out on all devices after a password reset.
- Revoke an employee's sessions immediately on offboarding while
  the SCIM/SSO sync is still propagating.

Surfaced via `POST /api/users/[id]/revoke-sessions` (admin-scoped,
audit-logged).

## 3. Idle timeout (per organisation)

`Organization.sessionIdleTimeoutMinutes` — integer in [5, 1440].
NULL = no idle timeout (default). When set:

- `requireScope()` reads `User.lastActivityAt` and rejects with
  `401 / IDLE_REAUTH_REQUIRED` if the gap exceeds the limit.
- `lastActivityAt` is touched on every authenticated request,
  throttled to once per minute to keep DB writes manageable.

A user kicked for idle is sent to the standard sign-in page; their
SSO IdP (if configured) re-issues a session on the next click. No
data loss because mutations were not in flight.

Recommended values:

| Customer profile | Recommended `sessionIdleTimeoutMinutes` |
| ---- | ---- |
| SMB internal CRM | NULL (no idle timeout) |
| Mid-market (50–500 employees) | 60–120 |
| Enterprise / regulated industries | 30 |
| Healthcare / public sector | 15 |

## 4. IP allowlist (per organisation)

`Organization.ipAllowlist` — comma-separated CIDR ranges, IPv4 or
IPv6 (or single IPs without a `/`). NULL/empty = open.

When set, `requireScope()` reads the request's `x-forwarded-for` (or
`x-real-ip`) and rejects with `403 / IP_NOT_ALLOWED` when the IP is
not in any range. **No implicit exemptions** — loopback and RFC1918
do *not* auto-pass. The admin chooses what to trust.

Configure via `PATCH /api/admin/security`:

```json
{ "ipAllowlist": "203.0.113.0/24, 198.51.100.7" }
```

To clear:

```json
{ "ipAllowlist": null }
```

The endpoint validates that every CIDR parses; if any entry is
malformed the whole update is rejected with a 400 listing the bad
entries.

> **Lock-out warning.** An admin can lock themselves out by setting
> an allowlist that does not include their own IP. The recovery
> path is a database `UPDATE Organization SET ipAllowlist = NULL
> WHERE id = '<org-id>'` by the platform operator. Document this
> in the customer onboarding email.

## Audit trail

Every change to §2, §3, or §4 above is written to the hash-chained
`AuditLog` (entity = `user` or `organization`). The `/audit` page
shows them; `npm run audit:chain` verifies the chain integrity.

## Reference

- `lib/philly/auth-helpers.ts` — implementation
- `lib/philly/ip-allowlist.ts` — CIDR matching
- `app/api/admin/security/route.ts` — admin API
- `prisma/schema.prisma` — `Organization.ipAllowlist`,
  `Organization.sessionIdleTimeoutMinutes`, `User.lastActivityAt`,
  `User.tokensInvalidAfter`
