/* GET  /api/agent-goals — goals for agents (team view)
   POST /api/agent-goals — set agent goals */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'
import { idSchema } from '@/lib/philly/api/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const upsertSchema = z.object({
  agentId: idSchema,
  year: z.coerce.number(),
  month: z.coerce.number(),
  dealTarget: z.coerce.number().optional(),
  volumeTarget: z.coerce.number().optional(),
  gciTarget: z.coerce.number().optional(),
  callsTarget: z.coerce.number().optional(),
  showingsTarget: z.coerce.number().optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const year = parseInt(url.searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = url.searchParams.get('month') ? parseInt(url.searchParams.get('month')!) : undefined

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    year,
    ...(month !== undefined ? { month } : {}),
  }
  const [goals, total] = await Promise.all([
    prisma.agentGoal.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.agentGoal.count({ where }),
  ])

  return paginatedResponse(goals, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`agent-goals.upsert:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, upsertSchema)
  if (body instanceof NextResponse) return body

  if (!body.year || !body.month) return jsonError('year and month are required', 400)

  const prisma = getAuthPrisma()

  // Verify agent belongs to this organization
  const agent = await prisma.user.findFirst({
    where: { id: body.agentId, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!agent) return jsonError('Agent not found in your organization', 404)

  const goal = await prisma.agentGoal.upsert({
    where: { agentId_year_month: { agentId: body.agentId, year: body.year, month: body.month } },
    create: {
      organizationId: scope.organizationId,
      agentId: body.agentId,
      year: body.year,
      month: body.month,
      dealTarget: body.dealTarget ?? 0,
      volumeTarget: body.volumeTarget ?? 0,
      gciTarget: body.gciTarget ?? 0,
      callsTarget: body.callsTarget ?? 0,
      showingsTarget: body.showingsTarget ?? 0,
    },
    update: {
      dealTarget: body.dealTarget,
      volumeTarget: body.volumeTarget,
      gciTarget: body.gciTarget,
      callsTarget: body.callsTarget,
      showingsTarget: body.showingsTarget,
    },
  })

  return NextResponse.json({ data: goal })
}
