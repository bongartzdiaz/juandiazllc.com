/* ---------------------------------------------------------------
   GDPR Art. 15 — Subject Access Request (SAR) export
   ---------------------------------------------------------------
   Two flavors:
   - collectOperatorData(prisma, userId)
       Self-export for a CRM operator (employee). Returns their own
       User row + every record they authored within their org.

   - collectContactSubjectData(prisma, organizationId, email)
       Admin-led export for a third-party data subject (lead,
       volunteer, guest, etc.). Returns every row, across every
       table, that references the given email.

   Both return a serializable object suitable for JSON download.
   The shape is documented inline so a regulator can verify the
   export covers what the privacy notice promises.

   This module is the only place that reads PII for export — any
   new model with PII MUST be added here AND to lib/gdpr/pii-registry.ts.
   --------------------------------------------------------------- */

export interface OperatorExport {
  schemaVersion: 1
  generatedAt: string
  subjectKind: 'operator'
  user: Record<string, unknown> | null
  sessions: Array<Record<string, unknown>>
  accounts: Array<Record<string, unknown>>
  contactNotes: Array<Record<string, unknown>>
  activities: Array<Record<string, unknown>>
  auditLogs: Array<Record<string, unknown>>
  twoFactorRecoveryCodeCount: number
}

export interface ContactSubjectExport {
  schemaVersion: 1
  generatedAt: string
  subjectKind: 'contact'
  subjectEmail: string
  organizationId: string
  contacts: Array<Record<string, unknown>>
  reservations: Array<Record<string, unknown>>
  volunteers: Array<Record<string, unknown>>
  openHouseVisits: Array<Record<string, unknown>>
  messages: Array<Record<string, unknown>>
  eSignatures: Array<Record<string, unknown>>
  consentRecords: Array<Record<string, unknown>>
}

export type ExportPayload = OperatorExport | ContactSubjectExport

/**
 * Compute per-model row counts from an export payload — used to
 * populate `GdprExportLog.rowCounts`.
 */
export function rowCounts(payload: ExportPayload): Record<string, number> {
  if (payload.subjectKind === 'operator') {
    return {
      User: payload.user ? 1 : 0,
      Session: payload.sessions.length,
      Account: payload.accounts.length,
      ContactNote: payload.contactNotes.length,
      Activity: payload.activities.length,
      AuditLog: payload.auditLogs.length,
      TwoFactorRecoveryCode: payload.twoFactorRecoveryCodeCount,
    }
  }
  return {
    Contact: payload.contacts.length,
    Reservation: payload.reservations.length,
    Volunteer: payload.volunteers.length,
    OpenHouseVisit: payload.openHouseVisits.length,
    Message: payload.messages.length,
    ESignature: payload.eSignatures.length,
    GdprConsentRecord: payload.consentRecords.length,
  }
}

// Minimal Prisma surface this module needs — declared structurally
// rather than imported so tests can pass a hand-rolled stub without
// pulling in Prisma's full type graph.
export interface PrismaForExport {
  user: { findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null> }
  session: { findMany: (args: { where: { userId: string } }) => Promise<Array<Record<string, unknown>>> }
  account: { findMany: (args: { where: { userId: string } }) => Promise<Array<Record<string, unknown>>> }
  contactNote: { findMany: (args: { where: { userId: string } }) => Promise<Array<Record<string, unknown>>> }
  activity: { findMany: (args: { where: { userId: string } }) => Promise<Array<Record<string, unknown>>> }
  auditLog: { findMany: (args: { where: { userId: string } }) => Promise<Array<Record<string, unknown>>> }
  twoFactorRecoveryCode: { count: (args: { where: { userId: string } }) => Promise<number> }
  contact: { findMany: (args: { where: Record<string, unknown> }) => Promise<Array<Record<string, unknown>>> }
  reservation: { findMany: (args: { where: Record<string, unknown> }) => Promise<Array<Record<string, unknown>>> }
  volunteer: { findMany: (args: { where: Record<string, unknown> }) => Promise<Array<Record<string, unknown>>> }
  openHouseVisit: { findMany: (args: { where: Record<string, unknown> }) => Promise<Array<Record<string, unknown>>> }
  message: { findMany: (args: { where: Record<string, unknown> }) => Promise<Array<Record<string, unknown>>> }
  eSignature: { findMany: (args: { where: Record<string, unknown> }) => Promise<Array<Record<string, unknown>>> }
  gdprConsentRecord: { findMany: (args: { where: Record<string, unknown> }) => Promise<Array<Record<string, unknown>>> }
}

const REDACT = '[redacted]'

function redactSensitive(row: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }
  for (const f of fields) {
    if (f in out && out[f] != null) out[f] = REDACT
  }
  return out
}

export async function collectOperatorData(
  prisma: PrismaForExport,
  userId: string,
): Promise<OperatorExport> {
  const [user, sessions, accounts, contactNotes, activities, auditLogs, twoFactorRecoveryCodeCount] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.session.findMany({ where: { userId } }),
      prisma.account.findMany({ where: { userId } }),
      prisma.contactNote.findMany({ where: { userId } }),
      prisma.activity.findMany({ where: { userId } }),
      prisma.auditLog.findMany({ where: { userId } }),
      prisma.twoFactorRecoveryCode.count({ where: { userId } }),
    ])

  // Strip credentials & secrets — they're personal data, but
  // re-exposing them would itself be a security incident. The
  // user can rotate / regenerate, which is what GDPR rectification
  // (Art. 16) actually requires.
  const safeUser = user
    ? redactSensitive(user, ['passwordHash', 'twoFactorSecret', 'tokensInvalidAfter'])
    : null
  const safeAccounts = accounts.map((a) =>
    redactSensitive(a, ['refresh_token', 'access_token', 'id_token', 'session_state']),
  )
  const safeSessions = sessions.map((s) => redactSensitive(s, ['sessionToken']))

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    subjectKind: 'operator',
    user: safeUser,
    sessions: safeSessions,
    accounts: safeAccounts,
    contactNotes,
    activities,
    auditLogs,
    twoFactorRecoveryCodeCount,
  }
}

export async function collectContactSubjectData(
  prisma: PrismaForExport,
  organizationId: string,
  email: string,
  emailHash: string,
): Promise<ContactSubjectExport> {
  const normalized = email.trim().toLowerCase()
  // Some PII-bearing models (Reservation, OpenHouseVisit, Message,
  // ESignature) don't carry organizationId directly — they're scoped
  // via a parent table. Use Prisma nested where to enforce tenancy.
  const [contacts, reservations, volunteers, openHouseVisits, messages, eSignatures, consentRecords] =
    await Promise.all([
      prisma.contact.findMany({ where: { organizationId, email: normalized } }),
      prisma.reservation.findMany({
        where: { guestEmail: normalized, room: { organizationId } },
      }),
      prisma.volunteer.findMany({ where: { organizationId, email: normalized } }),
      prisma.openHouseVisit.findMany({
        where: { email: normalized, openHouse: { property: { organizationId } } },
      }),
      prisma.message.findMany({
        where: {
          conversation: { organizationId },
          OR: [{ fromAddress: normalized }, { toAddress: normalized }],
        },
      }),
      prisma.eSignature.findMany({
        where: { signerEmail: normalized, transaction: { organizationId } },
      }),
      prisma.gdprConsentRecord.findMany({
        where: { organizationId, subjectEmailHash: emailHash },
      }),
    ])

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    subjectKind: 'contact',
    subjectEmail: normalized,
    organizationId,
    contacts,
    reservations,
    volunteers,
    openHouseVisits,
    messages,
    eSignatures,
    consentRecords,
  }
}
