/* POST /api/projects/bulk — bulk operations on projects */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: { action?: string; ids?: string[]; data?: Record<string, unknown> }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.action) return jsonError('action is required', 400)
  if (!Array.isArray(body.ids) || body.ids.length === 0) return jsonError('ids must be a non-empty array', 400)
  if (body.ids.length > 200) return jsonError('Maximum 200 items', 400)

  const prisma = getAuthPrisma()
  const owned = await prisma.project.findMany({
    where: { id: { in: body.ids }, organizationId: scope.organizationId },
    select: { id: true },
  })
  const ownedIds = owned.map(p => p.id)

  if (body.action === 'delete') {
    const result = await prisma.project.deleteMany({ where: { id: { in: ownedIds } } })
    for (const id of ownedIds) {
      await logAudit({ scope, action: 'delete', entity: 'project', entityId: id })
    }
    return NextResponse.json({ data: { deleted: result.count } })
  }

  if (body.action === 'update') {
    if (!body.data) return jsonError('data required for update', 400)
    const allowed = ['status', 'category'] as const
    const updateData: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body.data[key] !== undefined) updateData[key] = body.data[key]
    }
    const result = await prisma.project.updateMany({ where: { id: { in: ownedIds } }, data: updateData })
    return NextResponse.json({ data: { updated: result.count } })
  }

  if (body.action === 'export') {
    const projects = await prisma.project.findMany({
      where: { id: { in: ownedIds } },
      include: { milestones: true, _count: { select: { impactMetrics: true, contactProjects: true } } },
    })
    return NextResponse.json({ data: projects })
  }

  return jsonError('Unknown action', 400)
}
