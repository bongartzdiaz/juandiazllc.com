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
import { fetchMarketingData } from '@/lib/philly/dsar-marketing'

// 1.3.0 — adds marketing_leads + marketing_subscribers slices. Those
// live in Supabase Postgres, not the CRM's MariaDB, and were previously
// absent from every export: a subject asking "what do you hold on me"
// got an answer covering only half the estate.
// 1.2.0 — adds synced_calendar_events slice (push-sync persistence).
// 1.1.0 — adds calendar_connections + calendar_channels slices.
// Sensitive fields (encrypted tokens, authSecret, providerAccountId,
// syncToken/deltaLink) are explicitly omitted — same pattern as
// passwordHash + invite token in 1.0.0.
export const DSAR_EXPORT_VERSION = '1.3.0'

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
  calendar_connection_count: number
  calendar_channel_count: number
  synced_calendar_event_count: number
  marketing_lead_count: number
  marketing_subscriber_count: number
  /** False when the marketing store could not be read — the export is
   *  then knowingly incomplete and says so in `notice`. */
  marketing_store_included: boolean
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
  calendar_connections: unknown[]
  calendar_channels: unknown[]
  synced_calendar_events: unknown[]
  /** Public contact-form submissions, matched on email address. */
  marketing_leads: unknown[]
  /** Newsletter signups, matched on email address. */
  marketing_subscribers: unknown[]
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

  // Calendar push-sync surface (Bundle D). User-scope = the user's own
  // connections; org-scope = every teammate's connection in the org.
  // Sensitive fields are omitted on purpose — same posture as
  // passwordHash and invite token:
  //   - accessTokenEnc / refreshTokenEnc — encrypted credentials
  //   - authSecretEnc — server-generated webhook secret
  //   - providerAccountId — provider-side internal ID, not the user's email
  //   - syncToken — opaque provider cursor, no informational value to the
  //     data subject and could leak provider implementation detail
  const calendarConnections = await prisma.calendarConnection.findMany({
    where: scope === 'org' ? { organizationId } : { userId, organizationId },
    select: {
      id: true,
      userId: true,
      provider: true,
      providerEmail: true,
      scopes: true,
      status: true,
      lastError: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const calendarChannels = await prisma.calendarChannel.findMany({
    where: scope === 'org'
      ? { connection: { organizationId } }
      : { connection: { userId, organizationId } },
    select: {
      id: true,
      connectionId: true,
      provider: true,
      status: true,
      expiresAt: true,
      lastRenewedAt: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const syncedCalendarEvents = await prisma.syncedCalendarEvent.findMany({
    where: scope === 'org' ? { organizationId } : { userId, organizationId },
    select: {
      id: true,
      connectionId: true,
      provider: true,
      externalId: true,
      title: true,
      location: true,
      htmlLink: true,
      startTime: true,
      endTime: true,
      allDay: true,
      matchedEmails: true,
      cancelledAt: true,
      syncedAt: true,
      updatedAt: true,
    },
    orderBy: { startTime: 'desc' },
    take: 5000,
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

  /* ── Marketing store (Supabase, separate from the CRM's MariaDB) ──
     Matched on email, the only identifier a public form submission
     carries. Org-scope covers every teammate's address. */
  const marketing = await fetchMarketingData(
    scope === 'org'
      ? (team as Array<{ email?: string }> | undefined)?.map((t) => t.email) ?? [
          (user as { email?: string } | null)?.email,
        ]
      : [(user as { email?: string } | null)?.email],
  )

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
    calendar_connection_count: calendarConnections.length,
    calendar_channel_count: calendarChannels.length,
    synced_calendar_event_count: syncedCalendarEvents.length,
    marketing_lead_count: marketing.leads.length,
    marketing_subscriber_count: marketing.subscribers.length,
    marketing_store_included: marketing.available,
    notice:
      'This export is generated under AVG/GDPR Art. 15 (right of access) ' +
      'and Art. 20 (data portability). Sensitive credentials (password ' +
      'hashes, 2FA secrets, invite tokens) are omitted. Audit log is ' +
      'capped at 5000 most recent entries; for the full log contact ' +
      'privacy@lucen.ai. Marketing submissions are matched on exact ' +
      'email address, so anything submitted with a different address is ' +
      'not included.' +
      (marketing.available
        ? ''
        : ' WARNING: the marketing store could not be reached, so ' +
          'contact-form and newsletter records are MISSING from this ' +
          'export. Request a re-export or contact privacy@lucen.ai.'),
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
    calendar_connections: calendarConnections,
    calendar_channels: calendarChannels,
    synced_calendar_events: syncedCalendarEvents,
    marketing_leads: marketing.leads,
    marketing_subscribers: marketing.subscribers,
    ...(scope === 'org' ? { team, projects, pipelines, invites } : {}),
  }
}
