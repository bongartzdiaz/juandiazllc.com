/* GET  /api/views — saved views for entity type
   POST /api/views — create a saved view */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  entity: z.string().trim().min(1, 'entity is required').max(60),
  name: z.string().trim().min(1, 'name is required').max(120),
  filtersJson: z.string().max(20_000).optional(),
  columnsJson: z.string().max(20_000).optional(),
  sortJson: z.string().max(5_000).optional(),
  isShared: z.boolean().optional(),
})

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

  const limited = enforceRateLimit(`views:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const view = await prisma.savedView.create({
    data: {
      organizationId: scope.organizationId,
      userId: scope.userId,
      entity: body.entity,
      name: body.name,
      filtersJson: body.filtersJson ?? '[]',
      columnsJson: body.columnsJson ?? '[]',
      sortJson: body.sortJson ?? '{}',
      isShared: body.isShared ?? false,
    },
  })

  return NextResponse.json({ data: view }, { status: 201 })
}
