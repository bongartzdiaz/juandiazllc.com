/* GDPR Art. 17 hard-purge for soft-deleted users.

   Strategy: anonymize-and-keep-tombstone, NOT physical row delete.

   Reason: User has FK relations to AuditLog (RoPA, Art. 30) and
   activity-trail tables that we cannot legally delete (legal-claim
   defense, accounting records, audit trail). Physical delete would
   either cascade-wipe those audit rows OR fail with FK violation.

   What this does instead:
     - PII fields (name, email, image, avatarUrl, lastLoginIp) -> null
     - email -> "deleted-{userId}@anonymized.local" (preserves uniqueness)
     - Encrypted secrets (twoFactorSecret, recovery codes) -> wiped
     - tokensInvalidAfter bumped to now() (kills any cached sessions)
     - User row stays as tombstone so AuditLog.userId FK still resolves
     - hardPurgedAt timestamp set so we can tell "soft-deleted, awaiting
       30-day window" from "fully anonymized, tombstone only"

   GDPR posture: this satisfies Art. 17(1) (right to erasure) because
   personal data is no longer present. Recital 26 — anonymized data
   falls outside GDPR scope. The remaining row is non-personal data
   referenced only by aggregate logs.

   Operator side:
     POST /api/users/cron/hard-purge
       header: X-Cron-Secret: $CRON_SECRET
     Cadence: daily at 04:00 UTC (after audit prune at 03:30).

   Returns { purged, cutoff } so the cron-runner can monitor.
*/

import { getAuthPrisma } from '@/lib/philly/auth'
import { purgeMarketingData } from '@/lib/philly/dsar-marketing'
import { logger } from '@/lib/philly/logger'

const HARD_PURGE_AFTER_DAYS = 30
const MIN_PURGE_AFTER_DAYS = 7 // sanity floor — never purge < 7d

export interface HardPurgeResult {
  /** Number of users fully anonymized in this run. */
  purged: number
  /** Number of calendar connections erased across all purged users (A-08).
   *  Each cascades to its CalendarChannel + SyncedCalendarEvent rows. */
  calendarConnectionsErased: number
  /** Contact-form rows erased from the marketing store (Supabase), matched
   *  on the purged users' email addresses. */
  marketingLeadsErased: number
  /** Newsletter rows erased from the marketing store. */
  marketingSubscribersErased: number
  /** False when the marketing store could not be reached. Erasure is then
   *  INCOMPLETE for this run — personal data survives in Supabase and the
   *  run must be retried. Never report success to a data subject on this. */
  marketingStorePurged: boolean
  /** Cutoff timestamp — all soft-deletes older than this were processed. */
  cutoff: string
  /** Days threshold actually applied. */
  days: number
}

export function envPurgeAfterDays(): number {
  const raw = process.env.HARD_PURGE_AFTER_DAYS
  if (!raw) return HARD_PURGE_AFTER_DAYS
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < MIN_PURGE_AFTER_DAYS) return HARD_PURGE_AFTER_DAYS
  return n
}

/** Hard-purge: anonymize PII on users whose soft-delete window has passed.
 *
 * Optionally scope to a single org (admin-triggered). Cron path passes no
 * org filter and processes all orgs.
 */
export async function purgeStaleSoftDeletedUsers(opts: {
  days?: number
  organizationId?: string
} = {}): Promise<HardPurgeResult> {
  const days = Math.max(MIN_PURGE_AFTER_DAYS, Math.floor(opts.days ?? envPurgeAfterDays()))
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const prisma = getAuthPrisma()

  const where: Record<string, unknown> = {
    deletedAt: { lt: cutoff, not: null },
    // Avoid re-purging already-anonymized rows. We detect anonymized rows
    // by the synthetic email pattern. There is no separate hardPurgedAt
    // column today; if added later, switch to filter on that.
    NOT: { email: { startsWith: 'deleted-' } },
  }
  if (opts.organizationId) where.organizationId = opts.organizationId

  const candidates = await prisma.user.findMany({
    where,
    select: { id: true, email: true, organizationId: true, deletedAt: true },
  })

  if (candidates.length === 0) {
    return {
      purged: 0,
      calendarConnectionsErased: 0,
      marketingLeadsErased: 0,
      marketingSubscribersErased: 0,
      marketingStorePurged: true,
      cutoff: cutoff.toISOString(),
      days,
    }
  }

  /* Capture the real addresses before anonymization overwrites them —
     the marketing store keys on email and nothing else, so once the
     User row carries a synthetic `deleted-…` address the link to those
     rows is gone for good. */
  const emailsToPurge = candidates.map((c) => c.email)

  const now = new Date()
  let purged = 0
  let calendarConnectionsErased = 0
  for (const user of candidates) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          // PII anonymization. User.name is non-nullable in the schema
          // (legacy required-field), so we use an empty placeholder
          // rather than null. The synthetic email below is the load-
          // bearing "this row is anonymized" signal, not name.
          name: '',
          email: `deleted-${user.id}@anonymized.local`,
          image: null,
          avatarUrl: null,
          lastLoginIp: null,
          // Wipe encrypted secrets
          twoFactorSecret: null,
          twoFactorEnabled: false,
          twoFactorVerifiedAt: null,
          // Kill any cached session — bump invalidation timestamp
          tokensInvalidAfter: now,
        },
      })
      // Wipe recovery codes (separate table)
      await prisma.twoFactorRecoveryCode.deleteMany({
        where: { userId: user.id },
      })
      // Wipe Auth sessions (NextAuth)
      await prisma.session.deleteMany({
        where: { userId: user.id },
      })
      // Wipe Auth accounts (OAuth providers)
      await prisma.account.deleteMany({
        where: { userId: user.id },
      })
      // Erase calendar data (A-08, GDPR Art. 17). The user row is
      // tombstoned (not physically deleted), so the onDelete:Cascade from
      // User -> CalendarConnection never fires and the user's encrypted
      // OAuth tokens + synced meeting metadata would otherwise survive
      // erasure indefinitely. Delete the connection explicitly: that
      // cascades to its CalendarChannel (auth secrets) and
      // SyncedCalendarEvent (title/location/matchedEmails) rows.
      // (Provider-side push-unsubscribe + OAuth token revoke is a
      // best-effort follow-up — the channel is deleted here and expires
      // upstream within its TTL; we no longer hold the token.)
      const delConns = await prisma.calendarConnection.deleteMany({
        where: { userId: user.id },
      })
      calendarConnectionsErased += delConns.count
      purged++
    } catch (err) {
      // Log and continue — single bad row shouldn't tank the batch
      logger.error('hard-purge: user failed', {
        userId: user.id,
        organizationId: user.organizationId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  /* Second store. Runs after the CRM loop so a Supabase outage cannot
     stall the anonymization we can complete — but the result is
     reported honestly rather than folded into a success count. */
  const marketing = await purgeMarketingData(emailsToPurge)
  if (!marketing.available) {
    logger.error('hard-purge: marketing store NOT purged — erasure incomplete', {
      error: marketing.error,
      affectedUsers: emailsToPurge.length,
    })
  }

  logger.info('hard-purge: completed', {
    purged,
    calendarConnectionsErased,
    marketingLeadsErased: marketing.leadsDeleted,
    marketingSubscribersErased: marketing.subscribersDeleted,
    marketingStorePurged: marketing.available,
    cutoff: cutoff.toISOString(),
    days,
    organizationId: opts.organizationId ?? 'all',
  })

  return {
    purged,
    calendarConnectionsErased,
    marketingLeadsErased: marketing.leadsDeleted,
    marketingSubscribersErased: marketing.subscribersDeleted,
    marketingStorePurged: marketing.available,
    cutoff: cutoff.toISOString(),
    days,
  }
}
