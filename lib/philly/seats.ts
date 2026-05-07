/* ---------------------------------------------------------------
   Seat accounting — DEUS multi-tenant.

   A "used" seat = an active (non-deleted) User in the org plus a
   non-expired non-revoked non-accepted Invite. Both kinds count
   so an org can't oversubscribe by spamming invites.

   Seat limit comes from Subscription.seatCount when present, else
   Organization.seatLimit (the free-tier fallback).
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/philly/auth'
import type { Prisma } from '@prisma/client'

/**
 * Subset of PrismaClient that's safe to call from inside a $transaction
 * callback. Both PrismaClient and the tx-bound client expose these methods
 * with the same shape, so the seat-helper can run from either context.
 */
export type SeatTxClient = Pick<
  Prisma.TransactionClient,
  'user' | 'invite' | 'organization' | 'subscription'
>

export interface SeatStatus {
  /** Active users in the org (anyone with a session-able account). */
  usersUsed: number
  /** Pending invites that still hold a seat. */
  invitesPending: number
  /** Total seats consumed = usersUsed + invitesPending. */
  used: number
  /** Authoritative limit — Subscription.seatCount or Organization.seatLimit. */
  limit: number
  /** Spare capacity. Negative means over-subscribed (admin override or migration artefact). */
  available: number
}

/** Returns seat usage for an organization. Cheap — three count queries.
 *
 * For race-safe seat-claiming (where an invite is created in the same
 * transaction), use {@link getSeatStatusTx} from inside a Serializable
 * `prisma.$transaction` callback.
 */
export async function getSeatStatus(organizationId: string): Promise<SeatStatus> {
  return getSeatStatusTx(getAuthPrisma(), organizationId)
}

/** Same as {@link getSeatStatus} but accepts a transactional Prisma client.
 *
 * Pass `tx` from inside `prisma.$transaction(..., { isolationLevel:
 * 'Serializable' })` to ensure count + create happen atomically. Without
 * this, two concurrent invites can both read "1 seat free", both pass
 * the check, and the org ends up oversubscribed.
 */
export async function getSeatStatusTx(
  tx: SeatTxClient,
  organizationId: string,
): Promise<SeatStatus> {
  const now = new Date()

  const [users, invites, org, sub] = await Promise.all([
    tx.user.count({ where: { organizationId } }),
    tx.invite.count({
      where: {
        organizationId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    }),
    tx.organization.findUnique({
      where: { id: organizationId },
      select: { seatLimit: true },
    }),
    tx.subscription.findUnique({
      where: { organizationId },
      select: { seatCount: true, status: true },
    }),
  ])

  // Subscription overrides Organization.seatLimit when active or trialing.
  // A canceled / past_due subscription falls back to seatLimit so the
  // customer doesn't get locked out mid-billing-failure.
  const limit =
    sub && (sub.status === 'active' || sub.status === 'trialing')
      ? sub.seatCount
      : (org?.seatLimit ?? 3)

  const used = users + invites
  return {
    usersUsed: users,
    invitesPending: invites,
    used,
    limit,
    available: limit - used,
  }
}

/**
 * Throws if the org is at or above its seat limit. Use before issuing
 * a new invite or auto-provisioning a user from a webhook.
 */
export async function assertSeatAvailable(organizationId: string): Promise<void> {
  const status = await getSeatStatus(organizationId)
  if (status.available <= 0) {
    throw new SeatLimitError(status)
  }
}

export class SeatLimitError extends Error {
  readonly status: SeatStatus
  constructor(status: SeatStatus) {
    super(`Seat limit reached: ${status.used}/${status.limit}`)
    this.name = 'SeatLimitError'
    this.status = status
  }
}
