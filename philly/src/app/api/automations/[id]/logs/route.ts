/* GET /api/automations/[id]/logs — last N AutomationLog entries for a rule */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, jsonError } from '@/lib/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/pagination'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await params

  const prisma = getAuthPrisma()

  // Verify rule belongs to org
  const rule = await prisma.automationRule.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!rule) return jsonError('Rule not found', 404)

  const { page, limit, skip } = parsePagination(req)
  const where = { ruleId: id }
  const [logs, total] = await Promise.all([
    prisma.automationLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.automationLog.count({ where }),
  ])

  return paginatedResponse(logs, total, { page, limit, skip })
}
