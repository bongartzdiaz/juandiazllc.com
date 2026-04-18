/* GET  /api/projects        — list all projects in the user's org (paginated)
   POST /api/projects        — create a new project (manager+ only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { createProjectSchema } from '@/lib/philly/validation/schemas'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined
  const category = url.searchParams.get('category') ?? undefined
  const search = url.searchParams.get('q') ?? undefined

  const prisma = getAuthPrisma()

  const where = {
    organizationId: scope.organizationId,
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(search
      ? { OR: [{ title: { contains: search } }, { description: { contains: search } }] }
      : {}),
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        milestones: { select: { id: true, status: true } },
        _count: { select: { contactProjects: true, impactMetrics: true } },
      },
    }),
    prisma.project.count({ where }),
  ])

  return paginatedResponse(projects, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const parsed = await validateBody(req, createProjectSchema)
  if (!parsed.success) return parsed.response

  const input = parsed.data

  const prisma = getAuthPrisma()
  const project = await prisma.project.create({
    data: {
      title: input.title,
      description: input.description,
      status: input.status,
      category: input.category,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      budgetCents: input.budgetCents,
      sdgGoals: input.sdgGoals,
      organizationId: scope.organizationId,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'project', entityId: project.id })
  publishEntityCreated(scope.organizationId, 'project', project.id, scope.userId)

  return NextResponse.json({ data: project }, { status: 201 })
}
