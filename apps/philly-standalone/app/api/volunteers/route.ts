/* GET  /api/volunteers — list volunteers
   POST /api/volunteers — create volunteer */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(255),
  email: z.string().max(255).optional(),
  phone: z.string().max(60).optional(),
  skills: z.unknown().optional(),
  status: z.string().trim().max(60).optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(status ? { status } : {}),
  }

  const [volunteers, total] = await Promise.all([
    prisma.volunteer.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: { _count: { select: { volunteerLogs: true } } },
    }),
    prisma.volunteer.count({ where }),
  ])

  return paginatedResponse(volunteers, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`volunteers.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const volunteer = await prisma.volunteer.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
      email: body.email ?? '',
      phone: body.phone ?? '',
      skills: body.skills ? JSON.stringify(body.skills) : '[]',
      status: body.status ?? 'active',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'volunteer', entityId: volunteer.id })
  publishEntityCreated(scope.organizationId, 'volunteer', volunteer.id, scope.userId)
  return NextResponse.json({ data: volunteer }, { status: 201 })
}
