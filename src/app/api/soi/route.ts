/* GET  /api/soi — list SOI categories
   POST /api/soi — create SOI category */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }

  const [categories, total] = await Promise.all([
    prisma.soiCategory.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
    prisma.soiCategory.count({ where }),
  ])

  return paginatedResponse(categories, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.name?.trim()) return jsonError('name is required', 400)

  const prisma = getAuthPrisma()
  const cat = await prisma.soiCategory.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name.trim(),
      touchFrequency: body.touchFrequency ?? 30,
      color: body.color ?? '#3b82f6',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'soiCategory', entityId: cat.id })
  return NextResponse.json({ data: cat }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.id) return jsonError('id is required', 400)

  const prisma = getAuthPrisma()
  const existing = await prisma.soiCategory.findFirst({
    where: { id: body.id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Category not found', 404)

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.touchFrequency !== undefined) data.touchFrequency = body.touchFrequency
  if (body.color !== undefined) data.color = body.color

  const cat = await prisma.soiCategory.update({ where: { id: body.id }, data })
  await logAudit({ scope, action: 'update', entity: 'soiCategory', entityId: body.id })
  return NextResponse.json({ data: cat })
}

export async function DELETE(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return jsonError('id is required', 400)

  const prisma = getAuthPrisma()
  const existing = await prisma.soiCategory.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Category not found', 404)

  await prisma.soiCategory.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'soiCategory', entityId: id })
  return new NextResponse(null, { status: 204 })
}
