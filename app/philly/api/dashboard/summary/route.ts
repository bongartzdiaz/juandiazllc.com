/* GET /api/dashboard/summary — real KPI + trailing-6mo revenue
   for the authenticated user's organization. Used by the Philly
   dashboard page to replace hardcoded demo arrays.

   Returned shape:
     {
       data: {
         kpis: {
           contacts: number,
           contactsDelta30d: number,   // net new in last 30d
           openDeals: number,
           openDealValueCents: number,
           wonDeals30d: number,
           wonDealsValueCents30d: number,
           transactionsCompleted: number,
           transactionsSalePriceCents: number,
         },
         monthlyRevenue: [{ month: "Jan", revenueCents: number, wonDeals: number }, ...],
         recentActivity: [{ id, action, entity, at, actorName? }, ...],  // last 10
         asOf: ISO timestamp,
       }
     }

   Tenant isolation is enforced per-query (MariaDB, NO row-level security):
   Contact/Transaction/AuditLog filter on organizationId directly; Deal has no
   organizationId column and is scoped through its pipeline relation
   (pipeline.organizationId). Every read below MUST carry one of those filters.
*/

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export async function GET(_req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const orgId = scope.organizationId

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  // Start of the month 5 months back (so we return 6 buckets incl. current).
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  // Run the heavy reads in parallel — dashboard latency budget is tight.
  const [
    contactsTotal,
    contactsNew30d,
    openDealsAgg,
    wonDeals30dAgg,
    completedTx,
    wonDealsForChart,
    recentAudit,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.contact.count({
      where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.deal.aggregate({
      where: { status: 'open', pipeline: { organizationId: orgId } },
      _count: { _all: true },
      _sum: { valueCents: true },
    }),
    prisma.deal.aggregate({
      where: { status: 'won', actualClose: { gte: thirtyDaysAgo }, pipeline: { organizationId: orgId } },
      _count: { _all: true },
      _sum: { valueCents: true },
    }),
    prisma.transaction.aggregate({
      where: { organizationId: orgId, status: 'completed' },
      _count: { _all: true },
      _sum: { salePrice: true },
    }),
    // Monthly revenue chart: won deals over last 6 months, bucketed in JS.
    prisma.deal.findMany({
      where: {
        status: 'won',
        actualClose: { gte: sixMonthsAgo },
        pipeline: { organizationId: orgId },
      },
      select: { valueCents: true, actualClose: true },
    }),
    // Recent activity — audit log is the canonical feed.
    prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        userId: true,
        createdAt: true,
      },
    }),
  ])

  // Bucket won-deal revenue into 6 month slots ending on the current month.
  const buckets: { month: string; revenueCents: number; wonDeals: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ month: MONTH_LABELS[d.getMonth()], revenueCents: 0, wonDeals: 0 })
  }
  for (const d of wonDealsForChart as Array<{ valueCents: number; actualClose: Date | null }>) {
    if (!d.actualClose) continue
    const diffMonths =
      (now.getFullYear() - d.actualClose.getFullYear()) * 12 +
      (now.getMonth() - d.actualClose.getMonth())
    const bucketIdx = 5 - diffMonths
    if (bucketIdx >= 0 && bucketIdx < 6) {
      buckets[bucketIdx].revenueCents += d.valueCents
      buckets[bucketIdx].wonDeals += 1
    }
  }

  return NextResponse.json({
    data: {
      kpis: {
        contacts: contactsTotal,
        contactsDelta30d: contactsNew30d,
        openDeals: openDealsAgg._count._all,
        openDealValueCents: openDealsAgg._sum.valueCents ?? 0,
        wonDeals30d: wonDeals30dAgg._count._all,
        wonDealsValueCents30d: wonDeals30dAgg._sum.valueCents ?? 0,
        transactionsCompleted: completedTx._count._all,
        transactionsSalePriceCents: completedTx._sum.salePrice ?? 0,
      },
      monthlyRevenue: buckets,
      recentActivity: (recentAudit as Array<{
        id: string
        action: string
        entity: string
        entityId: string | null
        userId: string
        createdAt: Date
      }>).map((r) => ({
        id: r.id,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        actorId: r.userId,
        at: r.createdAt.toISOString(),
      })),
      asOf: now.toISOString(),
    },
  })
}
