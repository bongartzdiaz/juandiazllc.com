/* GET  /api/projects        — list all projects in the user's org (paginated)
   POST /api/projects        — create a new project (manager+ only) */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { createProjectSchema } from '@/lib/philly/validation/schemas'
import { parseQuery } from '@/lib/philly/api/validate'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const querySchema = z.object({
  status: z.string().max(40).optional(),
  category: z.string().max(80).optional(),
  q: z.string().max(200).optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireSection('projects')
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const parsed = parseQuery(req.nextUrl.searchParams, querySchema)
  if (parsed instanceof NextResponse) return parsed
  const status = parsed.status
  const category = parsed.category
  const search = parsed.q

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
  const scope = await requireSection('projects', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`projects.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

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
