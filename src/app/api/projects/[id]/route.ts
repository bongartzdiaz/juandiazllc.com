/* GET    /api/projects/[id] — single project (org-scoped)
   PATCH  /api/projects/[id] — update (manager+ only)
   DELETE /api/projects/[id] — delete   (admin only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const project = await prisma.project.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: {
      milestones: { orderBy: { dueDate: 'asc' } },
      impactMetrics: { orderBy: { date: 'desc' } },
      contactProjects: { include: { contact: true } },
    },
  })

  if (!project) return jsonError('Project not found', 404)
  return NextResponse.json({ data: project })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const input = body as Partial<{
    title: string
    description: string
    status: string
    category: string
    startDate: string
    endDate: string | null
    budgetCents: number
    spentCents: number
    sdgGoals: number[]
  }>

  // Verify the project belongs to the user's org before mutating
  const prisma = getAuthPrisma()
  const existing = await prisma.project.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Project not found', 404)

  const data: Record<string, unknown> = {}
  if (input.title !== undefined) data.title = input.title.trim()
  if (input.description !== undefined) data.description = input.description
  if (input.status !== undefined) data.status = input.status
  if (input.category !== undefined) data.category = input.category
  if (input.startDate !== undefined) {
    const d = new Date(input.startDate)
    if (isNaN(d.getTime())) return jsonError('startDate must be a valid date', 400)
    data.startDate = d
  }
  if (input.endDate !== undefined) {
    if (input.endDate === null) {
      data.endDate = null
    } else {
      const d = new Date(input.endDate)
      if (isNaN(d.getTime())) return jsonError('endDate must be a valid date', 400)
      data.endDate = d
    }
  }
  if (input.budgetCents !== undefined) data.budgetCents = Math.max(0, Math.floor(input.budgetCents))
  if (input.spentCents !== undefined) data.spentCents = Math.max(0, Math.floor(input.spentCents))
  if (input.sdgGoals !== undefined) data.sdgGoals = input.sdgGoals

  const project = await prisma.project.update({ where: { id }, data })
  return NextResponse.json({ data: project })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.project.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Project not found', 404)

  await prisma.project.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
