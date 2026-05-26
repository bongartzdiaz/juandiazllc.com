# Super-admin management runbook

> **Audience:** Juan / lucenai.eu staff with database access.
> **When to read:** before granting your first super-admin, before adding new staff, when revoking departing staff, when investigating "who got promoted to superAdmin when".

## What `superAdmin` means

`role='superAdmin'` is the **platform-owner role**. Distinct from org-level `admin`:

| Role | Scope | Can do |
|---|---|---|
| `viewer` | One org | Read-only |
| `manager` | One org | Mutate within own org |
| `admin` | One org | Full settings + billing + users for THEIR org |
| **`superAdmin`** | **All orgs** | Force ON/OFF features per-org, cross plan tiers, with mandatory audit reason |

`requireSuperAdmin()` (in `lib/philly/auth-helpers.ts`) enforces:
1. `scope.role === 'superAdmin'`
2. MFA **unconditional** — no env override, no dev shortcut. Bypassing org boundaries warrants the strictest auth surface.

## Three ways to grant the role

### (1) Bulk seed from env var — first-time setup or deploy-time bootstrap

Set `SUPER_ADMIN_EMAILS` in Vercel (or `.env.local` for dev):

```
SUPER_ADMIN_EMAILS=juan@philanthropyai.eu,roy@lucenai.eu
```

Then run:

```bash
npm run seed:super-admins
```

The seed is **idempotent** — re-running on already-promoted users is a no-op (no duplicate AuditLog row). Safe to add to deploy pipeline.

Behavior when an email has no matching User row:
- **Production** (`NODE_ENV=production`): aborts with exit 1. Stale env var must be fixed (or the user must complete Supabase first-login) before deploy proceeds.
- **Dev/staging**: logs warning, continues. Local seeding doesn't break when a new lucenai.eu hire hasn't signed up yet.

### (2) Ad-hoc grant via CLI — most common path post-bootstrap

```bash
# Self-grant (bootstrap — when there are zero super-admins yet)
npx tsx scripts/grant-super-admin.ts juan@philanthropyai.eu

# Subsequent grants (audit trail shows who promoted whom)
GRANTOR_EMAIL=juan@philanthropyai.eu \
  npx tsx scripts/grant-super-admin.ts new-staff@lucenai.eu
```

Always set `GRANTOR_EMAIL` for non-bootstrap grants. The audit trail's value depends on it.

### (3) Direct SQL (emergency / break-glass only)

If both scripts above are broken (e.g., during the DEUS-SHARED extraction migration):

```sql
-- Grant
UPDATE User SET role='superAdmin' WHERE email='juan@philanthropyai.eu';

-- Record the audit row manually (CRITICAL: maintains hash chain integrity)
-- (Better: get the scripts working again before resorting to this.)
```

⚠️ Direct SQL skips the audit-log hash chain. Use only when scripted grants are physically broken. Investigate and fix the script path immediately after.

## Revoking

```bash
# Revoke departing staff (defaults to demoting to 'admin' — keeps org access)
npx tsx scripts/revoke-super-admin.ts old-staff@lucenai.eu

# Deeper demotion (e.g., contractor with no ongoing access)
REVOKE_TO_ROLE=viewer \
  npx tsx scripts/revoke-super-admin.ts contractor@external.com

# With explicit actor (audit trail)
GRANTOR_EMAIL=juan@philanthropyai.eu \
  npx tsx scripts/revoke-super-admin.ts old-staff@lucenai.eu
```

Idempotent: revoking a non-superAdmin user is a no-op (no audit row written).

## Auditing — who got promoted, when, by whom?

```sql
SELECT
  createdAt,
  userId       AS actor_id,
  entityId     AS target_id,
  changes
FROM AuditLog
WHERE entity = 'user'
  AND JSON_EXTRACT(changes, '$.role.new') = 'superAdmin'
ORDER BY createdAt DESC;
```

For revokes, swap `'superAdmin'` for `'admin'` (or whatever `REVOKE_TO_ROLE` was used).

The audit chain integrity can be re-verified end-to-end with:

```bash
npm run audit:chain
```

A mismatch means someone tampered with the audit-log table directly. Investigate immediately.

## Rotation policy

| Cadence | Action |
|---|---|
| **Every 90 days** | Review the super-admin list. Revoke anyone who no longer needs cross-org access. |
| **On staff departure** | Revoke same day. Don't wait for the offboarding ticket. |
| **On compromise suspicion** | Revoke immediately, rotate MFA, force re-enroll, then re-grant if appropriate. |

To see who currently has the role:

```sql
SELECT email, twoFactorEnabled, lastLoginAt
FROM User
WHERE role = 'superAdmin'
ORDER BY email;
```

If anyone has `twoFactorEnabled = false`, that's a misconfig — `requireSuperAdmin()` will reject their requests, but the row shouldn't exist in that state. Tell them to enroll TOTP.

## MFA enforcement

Super-admin requires MFA **unconditionally** — there is no `ADMIN_MFA_ENFORCED=false` escape hatch for this role. If you've just been granted the role and can't reach `/admin/orgs`, the most likely cause is missing MFA enrollment:

1. Visit `/setup-2fa`
2. Scan the QR code with Authenticator
3. Complete the 6-digit verification
4. Re-try the super-admin page

If MFA is enrolled but the page still 403s, check:

```sql
SELECT email, role, twoFactorEnabled FROM User WHERE email = 'YOUR_EMAIL';
```

`role` should be `'superAdmin'` AND `twoFactorEnabled` should be `1`.

## "I lost my MFA device" — break-glass procedure

1. Have another super-admin (if any) issue you a TOTP recovery code (existing `TwoFactorRecoveryCode` table; covered by Bundle BR).
2. If you're the ONLY super-admin and have lost MFA:
   - Direct DB access: set `twoFactorSecret=NULL`, `twoFactorEnabled=0` for your User row
   - Re-enroll at `/setup-2fa`
   - Document the break-glass event in `docs/operations/INCIDENT-LOG.md`
3. Never bypass MFA in production code (e.g., adding env override). The audit consequence of a permanent MFA bypass is unacceptable.

## Related files

- `lib/philly/auth/super-admin-grant.ts` — shared library (grantSuperAdmin/revokeSuperAdmin)
- `lib/philly/auth/super-admin-grant.test.ts` — 12 hermetic tests pinning behavior
- `lib/philly/auth-helpers.ts:requireSuperAdmin` — auth gate
- `prisma/seed-super-admins.ts` — bulk seed
- `scripts/grant-super-admin.ts` — ad-hoc grant CLI
- `scripts/revoke-super-admin.ts` — ad-hoc revoke CLI
- `app/api/admin/orgs/[orgId]/features/[key]/route.ts` — the primary consumer of `requireSuperAdmin()` (PR-2b)
