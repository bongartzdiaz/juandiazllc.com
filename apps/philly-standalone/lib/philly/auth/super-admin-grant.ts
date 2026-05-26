/* Super-admin role grant/revoke — shared library used by the seed
   script, the grant CLI, and the revoke CLI.
   ──────────────────────────────────────────────────────────────────
   Single source of truth for "how to elevate a User to role='superAdmin'"
   so the three entry points (env-var seed, ad-hoc grant CLI, revoke CLI)
   can't drift in audit-log shape, idempotency behavior, or MFA-warning
   handling.

   Why the audit row goes on the GRANTEE's home org (not a "platform" org):
     - There IS no "platform" org row — every User belongs to an Organization
     - AuditLog.organizationId is required + FK-constrained to Organization
     - The hash-chain integrity check (verify-audit-chain.ts) walks
       per-organizationId chains; cross-org rows would require chain
       reconciliation logic that doesn't exist
     - Compliance discovery on "what role grants happened on org X"
       naturally finds the grantee's home-org chain

   Why GRANTOR_EMAIL is opt-in (falls back to self-grant):
     - Initial bootstrap has NO existing super-admin to act as grantor
     - Forcing a grantor would require manual "fake" rows; self-grant
       is honest about "this was a bootstrap action"
     - For non-bootstrap grants, the operator sets GRANTOR_EMAIL=their-email
       so the audit trail shows WHO promoted whom
   ──────────────────────────────────────────────────────────────── */

import type { PrismaClient } from '@prisma/client'
import { computeAuditHash } from '../audit-chain'

export type GrantResult =
  | { ok: true; action: 'granted' | 'already-super-admin'; userId: string; previousRole: string }
  | { ok: false; reason: 'user-not-found' | 'grantor-not-found'; email: string }

export type RevokeResult =
  | { ok: true; action: 'revoked' | 'not-super-admin'; userId: string; previousRole: string }
  | { ok: false; reason: 'user-not-found' | 'grantor-not-found'; email: string }

export interface GrantOptions {
  prisma: PrismaClient
  /** Email of the User to elevate. */
  granteeEmail: string
  /** Email of the User performing the grant. Falls back to granteeEmail (self-grant, used for bootstrap). */
  grantorEmail?: string | null
  /** New role to write — defaults to 'admin'. */
  revokeToRole?: string
}

/**
 * Grant role='superAdmin' to the user with the given email.
 *
 * Idempotent: if the user already has role='superAdmin', returns
 * `action: 'already-super-admin'` without writing a duplicate AuditLog.
 *
 * Writes an AuditLog row on the grantee's home org with the role-diff
 * + grantor identity in the `changes` field.
 *
 * Returns a result object (no exceptions for "user not found" — caller
 * decides how to handle, since the CLI wants a friendly message while
 * the bulk-seed wants to log-and-continue).
 */
export async function grantSuperAdmin(opts: GrantOptions): Promise<GrantResult> {
  const { prisma, granteeEmail } = opts
  const grantorEmail = opts.grantorEmail ?? granteeEmail

  const grantee = await prisma.user.findUnique({
    where: { email: granteeEmail },
    select: {
      id: true,
      email: true,
      role: true,
      organizationId: true,
      twoFactorEnabled: true,
    },
  })
  if (!grantee) return { ok: false, reason: 'user-not-found', email: granteeEmail }

  // Resolve grantor — for the audit trail. If GRANTOR_EMAIL is set but
  // points at a non-existent user, fail loudly: that's a misconfig.
  let grantorUserId: string
  if (grantorEmail === granteeEmail) {
    // Self-grant (bootstrap).
    grantorUserId = grantee.id
  } else {
    const grantor = await prisma.user.findUnique({
      where: { email: grantorEmail },
      select: { id: true },
    })
    if (!grantor) return { ok: false, reason: 'grantor-not-found', email: grantorEmail }
    grantorUserId = grantor.id
  }

  // Capture into a const BEFORE the update — defensive against any
  // ORM that mutates the returned object in place. Real Prisma doesn't,
  // but pinning the value here is cheap insurance.
  const previousRole = grantee.role

  if (previousRole === 'superAdmin') {
    return {
      ok: true,
      action: 'already-super-admin',
      userId: grantee.id,
      previousRole,
    }
  }

  await prisma.user.update({
    where: { id: grantee.id },
    data: { role: 'superAdmin' },
  })

  await writeAuditEntry({
    prisma,
    organizationId: grantee.organizationId,
    actorUserId: grantorUserId,
    targetUserId: grantee.id,
    targetEmail: grantee.email,
    action: 'update',
    changes: {
      role: { old: previousRole, new: 'superAdmin' },
      grantor: { old: null, new: grantorEmail },
      mfaEnrolled: { old: null, new: grantee.twoFactorEnabled },
    },
  })

  return {
    ok: true,
    action: 'granted',
    userId: grantee.id,
    previousRole,
  }
}

/**
 * Revoke role='superAdmin' from a user, replacing with the given role
 * (defaults to 'admin' — preserves org-level access without platform
 * privileges).
 *
 * Idempotent: no-op + audit-free when the user isn't currently superAdmin.
 */
export async function revokeSuperAdmin(opts: GrantOptions): Promise<RevokeResult> {
  const { prisma, granteeEmail, revokeToRole = 'admin' } = opts
  const grantorEmail = opts.grantorEmail ?? granteeEmail

  const grantee = await prisma.user.findUnique({
    where: { email: granteeEmail },
    select: { id: true, email: true, role: true, organizationId: true },
  })
  if (!grantee) return { ok: false, reason: 'user-not-found', email: granteeEmail }

  let grantorUserId: string
  if (grantorEmail === granteeEmail) {
    grantorUserId = grantee.id
  } else {
    const grantor = await prisma.user.findUnique({
      where: { email: grantorEmail },
      select: { id: true },
    })
    if (!grantor) return { ok: false, reason: 'grantor-not-found', email: grantorEmail }
    grantorUserId = grantor.id
  }

  const previousRole = grantee.role

  if (previousRole !== 'superAdmin') {
    return {
      ok: true,
      action: 'not-super-admin',
      userId: grantee.id,
      previousRole,
    }
  }

  await prisma.user.update({
    where: { id: grantee.id },
    data: { role: revokeToRole },
  })

  await writeAuditEntry({
    prisma,
    organizationId: grantee.organizationId,
    actorUserId: grantorUserId,
    targetUserId: grantee.id,
    targetEmail: grantee.email,
    action: 'update',
    changes: {
      role: { old: previousRole, new: revokeToRole },
      grantor: { old: null, new: grantorEmail },
    },
  })

  return {
    ok: true,
    action: 'revoked',
    userId: grantee.id,
    previousRole,
  }
}

// ── Internal helpers ───────────────────────────────────────────────

interface WriteAuditArgs {
  prisma: PrismaClient
  organizationId: string
  actorUserId: string
  targetUserId: string
  targetEmail: string
  action: 'update'
  changes: Record<string, { old: unknown; new: unknown }>
}

/**
 * Direct AuditLog write with hash-chain integrity.
 *
 * Doesn't route through lib/philly/audit.ts:logAudit() because logAudit()
 * uses getAuthPrisma() (which expects a request context — Supabase JWT,
 * cookies). These scripts run outside any request (CLI / seed / build
 * step), so we pass the PrismaClient explicitly and compute the chain
 * tip ourselves with the same hash algorithm.
 */
async function writeAuditEntry(args: WriteAuditArgs): Promise<void> {
  const { prisma, organizationId, actorUserId, targetUserId, targetEmail, action, changes } = args

  const tip = await prisma.auditLog.findFirst({
    where: { organizationId, hash: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  })
  const prevHash = tip?.hash ?? null

  const createdAt = new Date()
  const changesJson = JSON.stringify(changes)
  const hash = computeAuditHash(prevHash, {
    organizationId,
    userId: actorUserId,
    action,
    entity: 'user',
    entityId: targetUserId,
    changes: changesJson,
    createdAt,
  })

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: actorUserId,
      action,
      entity: 'user',
      entityId: targetUserId,
      changes: changesJson,
      createdAt,
      prevHash,
      hash,
    },
  })
}
