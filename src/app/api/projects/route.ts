/* GET  /api/projects        — list all projects in the user's org
   POST /api/projects        — create a new project (manager+ only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const projects = await prisma.project.findMany({
    where: { organizationId: scope.organizationId },
    orderBy: { createdAt: 'desc' },
    include: {
      milestones: { select: { id: true, status: true } },
      _count: { select: { contactProjects: true, impactMetrics: true } },
    },
  })

  return NextResponse.json({ data: projects })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const input = body as {
    title?: string
    description?: string
    status?: string
    category?: string
    startDate?: string
    endDate?: string | null
    budgetCents?: number
    sdgGoals?: number[]
  }

  if (!input.title?.trim()) {
    return jsonError('title is required', 400)
  }
  if (!input.startDate) {
    return jsonError('startDate is required', 400)
  }

  const startDate = new Date(input.startDate)
  if (isNaN(startDate.getTime())) {
    return jsonError('startDate must be a valid date', 400)
  }

  const endDate = input.endDate ? new Date(input.endDate) : null
  if (endDate && isNaN(endDate.getTime())) {
    return jsonError('endDate must be a valid date', 400)
  }

  const prisma = getAuthPrisma()
  const project = await prisma.project.create({
    data: {
      title: input.title.trim(),
      description: input.description ?? '',
      status: input.status ?? 'planned',
      category: input.category ?? 'general',
      startDate,
      endDate,
      budgetCents: Math.max(0, Math.floor(input.budgetCents ?? 0)),
      sdgGoals: Array.isArray(input.sdgGoals) ? input.sdgGoals : [],
      organizationId: scope.organizationId,
    },
  })

  return NextResponse.json({ data: project }, { status: 201 })
}
