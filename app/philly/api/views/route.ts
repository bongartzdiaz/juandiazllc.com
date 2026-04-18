/* GET  /api/views — saved views for entity type
   POST /api/views — create a saved view */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const entity = url.searchParams.get('entity') ?? undefined

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(entity ? { entity } : {}),
    OR: [{ isShared: true }, { userId: scope.userId }],
  }
  const [views, total] = await Promise.all([
    prisma.savedView.findMany({ where, orderBy: { createdAt: 'asc' }, skip, take: limit }),
    prisma.savedView.count({ where }),
  ])

  return paginatedResponse(views, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  let body: {
    entity?: string; name?: string; filtersJson?: string
    columnsJson?: string; sortJson?: string; isShared?: boolean
  }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.entity) return jsonError('entity is required', 400)
  if (!body.name?.trim()) return jsonError('name is required', 400)

  const prisma = getAuthPrisma()
  const view = await prisma.savedView.create({
    data: {
      organizationId: scope.organizationId,
      userId: scope.userId,
      entity: body.entity,
      name: body.name.trim(),
      filtersJson: body.filtersJson ?? '[]',
      columnsJson: body.columnsJson ?? '[]',
      sortJson: body.sortJson ?? '{}',
      isShared: body.isShared ?? false,
    },
  })

  return NextResponse.json({ data: view }, { status: 201 })
}
