/* GET  /api/pipelines — list pipelines with stages
   POST /api/pipelines — create pipeline (admin only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  let body: { name?: string; industry?: string; stages?: { name: string; color?: string }[] }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.name?.trim()) return jsonError('name is required', 400)

  const prisma = getAuthPrisma()
  const pipeline = await prisma.pipeline.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name.trim(),
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
