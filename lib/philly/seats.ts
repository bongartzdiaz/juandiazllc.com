/* ---------------------------------------------------------------
   Seat accounting — DEUS multi-tenant.

   A "used" seat = an active (non-deleted) User in the org plus a
   non-expired non-revoked non-accepted Invite. Both kinds count
   so an org can't oversubscribe by spamming invites.

   Seat limit comes from Subscription.seatCount when present, else
   Organization.seatLimit (the free-tier fallback).
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/philly/auth'

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

/** Returns seat usage for an organization. Cheap — three count queries. */
export async function getSeatStatus(organizationId: string): Promise<SeatStatus> {
  const prisma = getAuthPrisma()
  const now = new Date()

  const [users, invites, org, sub] = await Promise.all([
    prisma.user.count({ where: { organizationId } }),
    prisma.invite.count({
      where: {
        organizationId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { seatLimit: true },
    }),
    prisma.subscription.findUnique({
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
