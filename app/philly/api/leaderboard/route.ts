/* GET /api/leaderboard — team leaderboard with agent stats */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()

  // Get all agents in org
  const agents = await prisma.user.findMany({
    where: { organizationId: scope.organizationId },
    select: { id: true, name: true, role: true, avatarUrl: true },
  })

  // Get deal stats per agent
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const leaderboard = await Promise.all(agents.map(async (agent) => {
    const [totalDeals, wonDeals, monthDeals, totalVolume, commissions] = await Promise.all([
      prisma.deal.count({ where: { ownerId: agent.id, pipeline: { organizationId: scope.organizationId } } }),
      prisma.deal.count({ where: { ownerId: agent.id, status: 'won', pipeline: { organizationId: scope.organizationId } } }),
      prisma.deal.count({ where: { ownerId: agent.id, status: 'won', actualClose: { gte: monthStart }, pipeline: { organizationId: scope.organizationId } } }),
      prisma.deal.aggregate({ where: { ownerId: agent.id, status: 'won', pipeline: { organizationId: scope.organizationId } }, _sum: { valueCents: true } }),
      prisma.commissionRecord.aggregate({ where: { agentId: agent.id, organizationId: scope.organizationId, createdAt: { gte: yearStart } }, _sum: { netCents: true } }),
    ])

    // Get goal for current month
    const goal = await prisma.agentGoal.findUnique({
      where: { agentId_year_month: { agentId: agent.id, year: now.getFullYear(), month: now.getMonth() + 1 } },
    })

    return {
      ...agent,
      totalDeals,
      wonDeals,
      monthDeals,
      totalVolumeCents: totalVolume._sum.valueCents ?? 0,
      ytdCommissionCents: commissions._sum.netCents ?? 0,
      conversionRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0,
      goal: goal ?? null,
    }
  }))

  // Sort by YTD commission descending
  leaderboard.sort((a, b) => b.ytdCommissionCents - a.ytdCommissionCents)

  return NextResponse.json({ data: leaderboard })
}
