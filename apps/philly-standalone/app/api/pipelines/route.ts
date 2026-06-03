/* GET  /api/pipelines — list pipelines with stages
   POST /api/pipelines — create pipeline (admin only) */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  industry: z.string().trim().max(60).optional(),
  stages: z
    .array(z.object({ name: z.string().trim().min(1).max(60), color: z.string().max(20).optional() }))
    .max(40)
    .optional(),
})

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const pipelines = await prisma.pipeline.findMany({
    where: { organizationId: scope.organizationId },
    orderBy: { createdAt: 'asc' },
    include: {
      stages: { orderBy: { position: 'asc' } },
      _count: { select: { deals: true } },
    },
  })

  return NextResponse.json({ data: pipelines })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`pipelines.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const pipeline = await prisma.pipeline.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
      industry: body.industry ?? 'general',
      stages: {
        create: (body.stages ?? [{ name: 'New' }, { name: 'In Progress' }, { name: 'Closed' }]).map((s, i) => ({
          name: s.name,
          position: i,
          color: s.color ?? '#94A3B8',
        })),
      },
    },
    include: { stages: { orderBy: { position: 'asc' } } },
  })

  await logAudit({ scope, action: 'create', entity: 'kanbanBoard', entityId: pipeline.id })
  return NextResponse.json({ data: pipeline }, { status: 201 })
}
