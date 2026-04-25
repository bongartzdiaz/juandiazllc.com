/* ---------------------------------------------------------------
   GDPR Art. 5(1)(e) — Storage limitation
   ---------------------------------------------------------------
   Auto-purge stale rows. Each PII-bearing model has a retention
   period defined in lib/gdpr/pii-registry.ts; this module reads
   those budgets and deletes anything past the threshold.

   Two parallel jobs run on the same schedule:
   - runRetentionPurge():       purges old rows from PII tables
   - runScheduledErasures():    finalises scheduled-deletion users
                                (lives in lib/gdpr/erasure.ts)

   Designed to be idempotent: repeated runs are harmless (no rows
   match the cutoff a second time). The cron endpoint at
   /api/cron/gdpr-retention is the production entrypoint.
   --------------------------------------------------------------- */

import { PII_REGISTRY } from './pii-registry'

const MS_PER_DAY = 86_400_000

export interface PurgeResult {
  /** Per-model deleted-row counts. Keys match Prisma model names. */
  rowCounts: Record<string, number>
  /** Sum of rowCounts. */
  totalRows: number
  /** Cutoff dates used per model (ISO timestamps), for audit. */
  cutoffs: Record<string, string>
}

// Structural Prisma surface for retention. Each entry uses a
// `deleteMany({ where: { createdAt: { lt: Date } } })` shape; we
// declare them collectively for the test mock.
type DeleteManyFn = (args: {
  where: { createdAt: { lt: Date }; [k: string]: unknown }
}) => Promise<{ count: number }>

export interface PrismaForRetention {
  contact: { deleteMany: DeleteManyFn }
  contactNote: { deleteMany: DeleteManyFn }
  activity: { deleteMany: DeleteManyFn }
  reservation: { deleteMany: DeleteManyFn }
  volunteer: { deleteMany: DeleteManyFn }
  openHouseVisit: { deleteMany: DeleteManyFn }
  message: { deleteMany: DeleteManyFn }
  eSignature: { deleteMany: DeleteManyFn }
  callLog: { deleteMany: DeleteManyFn }
  smsMessage: { deleteMany: DeleteManyFn }
  auditLog: { deleteMany: DeleteManyFn }
}

// Map registry model name → which Prisma client to call. The User
// model is excluded (operator data is purged via the scheduled
// erasure flow, not by retention cutoff).
const MODEL_TO_CLIENT: Record<
  string,
  ((p: PrismaForRetention) => { deleteMany: DeleteManyFn }) | undefined
> = {
  Contact: (p) => p.contact,
  ContactNote: (p) => p.contactNote,
  Activity: (p) => p.activity,
  Reservation: (p) => p.reservation,
  Volunteer: (p) => p.volunteer,
  OpenHouseVisit: (p) => p.openHouseVisit,
  Message: (p) => p.message,
  ESignature: (p) => p.eSignature,
  CallLog: (p) => p.callLog,
  SmsMessage: (p) => p.smsMessage,
  AuditLog: (p) => p.auditLog,
  // User is intentionally not listed — the deletion-grace flow owns it.
}

export async function runRetentionPurge(
  prisma: PrismaForRetention,
  now: Date = new Date(),
): Promise<PurgeResult> {
  const rowCounts: Record<string, number> = {}
  const cutoffs: Record<string, string> = {}

  for (const entry of PII_REGISTRY) {
    const factory = MODEL_TO_CLIENT[entry.model]
    if (!factory) continue
    const cutoff = new Date(now.getTime() - entry.retentionDays * MS_PER_DAY)
    cutoffs[entry.model] = cutoff.toISOString()
    const client = factory(prisma)
    const { count } = await client.deleteMany({ where: { createdAt: { lt: cutoff } } })
    rowCounts[entry.model] = count
  }

  const totalRows = Object.values(rowCounts).reduce((s, n) => s + n, 0)
  return { rowCounts, totalRows, cutoffs }
}
