/* GET /api/billing/subscription
 *
 * Returns the current org's subscription state so the billing UI can
 * render plan + seat usage + next-invoice without doing its own DB call.
 *
 * Anyone signed in can read — billing state isn't sensitive at this
 * granularity (no card numbers, no Stripe IDs returned).
 */

import { NextResponse } from 'next/server'
import { requireScope } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { getSeatStatus } from '@/lib/philly/seats'
import type { SubscriptionResponse, SubscriptionStatus } from '@/lib/philly/stripe/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const [sub, seats] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: scope.organizationId },
      select: {
        plan: true,
        status: true,
        seatCount: true,
        currentPeriodEnd: true,
        cancelAt: true,
        createdAt: true,
      },
    }),
    getSeatStatus(scope.organizationId),
  ])

  const body: SubscriptionResponse = {
    data: {
      subscription: sub
        ? {
            plan: sub.plan,
            status: sub.status as SubscriptionStatus,
            seatCount: sub.seatCount,
            currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
            cancelAt: sub.cancelAt?.toISOString() ?? null,
            createdAt: sub.createdAt.toISOString(),
          }
        : null,
      seats,
    },
  }
  return NextResponse.json(body)
}
