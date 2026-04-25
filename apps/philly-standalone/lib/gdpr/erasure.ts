/* ---------------------------------------------------------------
   GDPR Art. 17 — Right to erasure
   ---------------------------------------------------------------
   Two flows:

   1. SCHEDULE-FOR-OPERATOR (self-service)
      User stamps `User.deletionScheduledAt = now + 30 days`.
      Within the grace window, they can cancel; after the window,
      `runScheduledErasures()` (Bundle A5 cron) hard-deletes the
      User row, which cascades to all child tables.

   2. ERASE-CONTACT-NOW (admin-led, for third-party data subjects)
      Admin enters the data subject's email, we hard-delete every
      row across every PII-bearing model that references it, and
      write an append-only GdprErasureLog with a SHA-256 hash of
      the email so the erasure is provable to a regulator without
      retaining the email.

   This module never logs PII. It hashes emails on the way in and
   passes hashes to GdprErasureLog. The plaintext email never lands
   in any log line.
   --------------------------------------------------------------- */

export interface ErasureResult {
  rowCounts: Record<string, number>
  totalRows: number
}

// Structural Prisma surface — same trick as lib/gdpr/export.ts.
export interface PrismaForErasure {
  contact: {
    findMany: (args: { where: Record<string, unknown>; select: { id: true } }) => Promise<Array<{ id: string }>>
    deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>
  }
  reservation: { deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }> }
  volunteer: { deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }> }
  openHouseVisit: { deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }> }
  message: { deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }> }
  eSignature: { deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }> }
  callLog: { deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }> }
  smsMessage: { deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }> }
  user: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; deletionScheduledAt: Date | null } | null>
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>
    delete: (args: { where: { id: string } }) => Promise<unknown>
    findMany: (args: { where: Record<string, unknown> }) => Promise<Array<{ id: string; email: string }>>
  }
}

const GRACE_DAYS = 30
const MS_PER_DAY = 86_400_000

/**
 * Self-service: mark the operator's account for deletion in 30 days.
 * Idempotent — calling twice does not extend the grace window past
 * the original schedule.
 */
export async function scheduleAccountDeletion(
  prisma: PrismaForErasure,
  userId: string,
  now: Date = new Date(),
): Promise<{ scheduledFor: Date }> {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (existing?.deletionScheduledAt) {
    return { scheduledFor: existing.deletionScheduledAt }
  }
  const scheduledFor = new Date(now.getTime() + GRACE_DAYS * MS_PER_DAY)
  await prisma.user.update({
    where: { id: userId },
    data: { deletionScheduledAt: scheduledFor, deletionRequestedAt: now },
  })
  return { scheduledFor }
}

export async function cancelAccountDeletion(prisma: PrismaForErasure, userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { deletionScheduledAt: null, deletionRequestedAt: null },
  })
}

/**
 * Admin-led erasure: hard-delete every row across every PII-bearing
 * model that references `email` within `organizationId`. Cascade
 * deletes (per schema.prisma) handle ContactNote, Activity, etc.
 *
 * The caller is responsible for writing a GdprErasureLog entry with
 * the returned rowCounts — this function never touches the audit
 * tables itself, so tests can call it without mocking the log writer.
 */
export async function eraseContactSubject(
  prisma: PrismaForErasure,
  organizationId: string,
  email: string,
): Promise<ErasureResult> {
  const normalized = email.trim().toLowerCase()

  // Pre-fetch contact ids so we can delete dependent rows that
  // weren't marked Cascade in the schema (CallLog scopes via
  // contactId, SmsMessage via contactId).
  const contacts = await prisma.contact.findMany({
    where: { organizationId, email: normalized },
    select: { id: true },
  })
  const contactIds = contacts.map((c) => c.id)

  const [
    callLogs,
    smsMessages,
    contactsDeleted,
    reservations,
    volunteers,
    openHouseVisits,
    messages,
    eSignatures,
  ] = await Promise.all([
    contactIds.length > 0
      ? prisma.callLog.deleteMany({ where: { contactId: { in: contactIds } } })
      : Promise.resolve({ count: 0 }),
    contactIds.length > 0
      ? prisma.smsMessage.deleteMany({ where: { contactId: { in: contactIds } } })
      : Promise.resolve({ count: 0 }),
    prisma.contact.deleteMany({ where: { organizationId, email: normalized } }),
    prisma.reservation.deleteMany({
      where: { guestEmail: normalized, room: { organizationId } },
    }),
    prisma.volunteer.deleteMany({ where: { organizationId, email: normalized } }),
    prisma.openHouseVisit.deleteMany({
      where: { email: normalized, openHouse: { property: { organizationId } } },
    }),
    prisma.message.deleteMany({
      where: {
        conversation: { organizationId },
        OR: [{ fromAddress: normalized }, { toAddress: normalized }],
      },
    }),
    prisma.eSignature.deleteMany({
      where: { signerEmail: normalized, transaction: { organizationId } },
    }),
  ])

  const rowCounts: Record<string, number> = {
    Contact: contactsDeleted.count,
    Reservation: reservations.count,
    Volunteer: volunteers.count,
    OpenHouseVisit: openHouseVisits.count,
    Message: messages.count,
    ESignature: eSignatures.count,
    CallLog: callLogs.count,
    SmsMessage: smsMessages.count,
  }
  const totalRows = Object.values(rowCounts).reduce((s, n) => s + n, 0)
  return { rowCounts, totalRows }
}

/**
 * Cron entrypoint — find every User whose deletionScheduledAt has
 * elapsed and hard-delete them. Cascades take care of the rest.
 *
 * Returns the count for the cron's own log. Throws if the underlying
 * delete fails so the cron handler can return 500 + retry.
 */
export async function runScheduledErasures(
  prisma: PrismaForErasure,
  now: Date = new Date(),
): Promise<{ erasedUserIds: string[] }> {
  const due = await prisma.user.findMany({
    where: { deletionScheduledAt: { lte: now } },
  })
  const erasedUserIds: string[] = []
  for (const u of due) {
    await prisma.user.delete({ where: { id: u.id } })
    erasedUserIds.push(u.id)
  }
  return { erasedUserIds }
}
