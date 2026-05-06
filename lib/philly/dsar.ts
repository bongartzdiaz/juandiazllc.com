/* ---------------------------------------------------------------
   DSAR — Data Subject Access Request export.

   Builds the JSON archive returned by GET /api/me/export. Two scopes:
   - 'user'  : everything tied to the requesting user (default)
   - 'org'   : everything in the user's organization (admin/manager only)

   Shape is stable + versioned (`export_version`) so consumers can
   migrate when we add fields. Privacy team: this file is the single
   place where "what data leaves the system" is defined — review it
   when the schema changes.
   --------------------------------------------------------------- */

import type { PrismaClient } from '@prisma/client'

export const DSAR_EXPORT_VERSION = '1.0.0'

export type DsarScope = 'user' | 'org'

export interface DsarManifest {
  export_version: string
  generated_at: string
  scope: DsarScope
  generated_by_user_id: string
  organization_id: string
  user_count: number
  contact_count: number
  deal_count: number
  activity_count: number
  audit_log_count: number
  notice: string
}

export interface DsarArchive {
  manifest: DsarManifest
  user: unknown
  organization: unknown
  contacts: unknown[]
  deals: unknown[]
  notes: unknown[]
  activities: unknown[]
  audit_log: unknown[]
  // Org-scope extras (omitted for user-scope exports)
  team?: unknown[]
  projects?: unknown[]
  pipelines?: unknown[]
  invites?: unknown[]
}

interface BuildArgs {
  prisma: PrismaClient
  userId: string
  organizationId: string
  scope: DsarScope
}

/**
 * Builds the DSAR archive. All queries are explicitly org-scoped via the
 * organizationId arg — even on user-scope exports, we never reach across
 * tenants.
 */
export async function buildDsarArchive({
  prisma,
  userId,
  organizationId,
  scope,
}: BuildArgs): Promise<DsarArchive> {
  // ── Always-included tables ──

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true, locale: true,
      avatarUrl: true, createdAt: true, lastLoginAt: true,
      twoFactorEnabled: true, twoFactorVerifiedAt: true,
      // intentionally omitted: passwordHash, twoFactorSecret, lockedUntil,
      // failedLoginCount, lastLoginIp — security material the data subject
      // doesn't need and that increases breach risk if leaked from the export
    },
  })

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true, name: true, slug: true, industry: true, createdAt: true,
      seatLimit: true,
    },
  })

  // ── Scope-dependent slices ──
  // For user-scope: only data this user authored or is owner of
  // For org-scope: every row in the org (admin export)

  // Contacts: org-scope = whole org; user-scope = contacts the user
  // owns (assignedToId match). The schema doesn't have an `updatedAt`
  // on Contact, so we don't select it here.
  const contactsWhere = scope === 'org'
    ? { organizationId }
    : { organizationId, assignedToId: userId }

  const contacts = await prisma.contact.findMany({
    where: contactsWhere,
    select: {
      id: true, name: true, email: true, phone: true, type: true,
      company: true, notes: true, leadSource: true, leadStatus: true,
      assignedToId: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Deals are org-scoped via Pipeline, not directly. Money lives in
  // valueCents (int). probability is 0-100, status open/won/lost.
  const deals = await prisma.deal.findMany({
    where:
      scope === 'org'
        ? { pipeline: { organizationId } }
        : { pipeline: { organizationId }, ownerId: userId },
    select: {
      id: true, title: true, valueCents: true, currency: true,
      probability: true, expectedClose: true, status: true,
      contactId: true, propertyId: true, createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // ContactNote uses `content`, not `body`.
  const notes = await prisma.contactNote.findMany({
    where: scope === 'org'
      ? { contact: { organizationId } }
      : { userId },
    select: {
      id: true, contactId: true, content: true, userId: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Activity uses title + description (no `summary`); it has its own
  // organizationId column too.
  const activities = await prisma.activity.findMany({
    where: scope === 'org'
      ? { OR: [{ organizationId }, { contact: { organizationId } }] }
      : { userId },
    select: {
      id: true, contactId: true, type: true, title: true, description: true,
      userId: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const auditLog = await prisma.auditLog.findMany({
    where: scope === 'org'
      ? { organizationId }
      : { organizationId, userId },
    select: {
      id: true, action: true, entity: true, entityId: true,
      changes: true, userId: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5000, // hard cap — full log available via separate request to privacy@
  })

  // ── Org-scope-only slices ──

  let team: unknown[] | undefined
  let projects: unknown[] | undefined
  let pipelines: unknown[] | undefined
  let invites: unknown[] | undefined

  if (scope === 'org') {
    team = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        lastLoginAt: true, deletedAt: true,
      },
    })
    projects = await prisma.project.findMany({
      where: { organizationId },
      select: {
        id: true, title: true, description: true, status: true,
        startDate: true, endDate: true, createdAt: true,
      },
    })
    pipelines = await prisma.pipeline.findMany({
      where: { organizationId },
      select: { id: true, name: true, industry: true, createdAt: true },
    })
    invites = await prisma.invite.findMany({
      where: { organizationId },
      select: {
        id: true, email: true, role: true, expiresAt: true,
        acceptedAt: true, revokedAt: true, createdAt: true,
        // token deliberately omitted — it's a credential
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  const manifest: DsarManifest = {
    export_version: DSAR_EXPORT_VERSION,
    generated_at: new Date().toISOString(),
    scope,
    generated_by_user_id: userId,
    organization_id: organizationId,
    user_count: scope === 'org' ? (team?.length ?? 0) : 1,
    contact_count: contacts.length,
    deal_count: deals.length,
    activity_count: activities.length,
    audit_log_count: auditLog.length,
    notice:
      'This export is generated under AVG/GDPR Art. 15 (right of access) ' +
      'and Art. 20 (data portability). Sensitive credentials (password ' +
      'hashes, 2FA secrets, invite tokens) are omitted. Audit log is ' +
      'capped at 5000 most recent entries; for the full log contact ' +
      'privacy@lucen.ai.',
  }

  return {
    manifest,
    user,
    organization,
    contacts,
    deals,
    notes,
    activities,
    audit_log: auditLog,
    ...(scope === 'org' ? { team, projects, pipelines, invites } : {}),
  }
}
