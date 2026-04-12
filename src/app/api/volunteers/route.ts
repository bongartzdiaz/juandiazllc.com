/* GET  /api/volunteers — list volunteers
   POST /api/volunteers — create volunteer */

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

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.name?.trim()) return jsonError('name is required', 400)

  const prisma = getAuthPrisma()
  const volunteer = await prisma.volunteer.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name.trim(),
      email: body.email ?? '',
      phone: body.phone ?? '',
      skills: body.skills ? JSON.stringify(body.skills) : '[]',
      status: body.status ?? 'active',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'volunteer', entityId: volunteer.id })
  return NextResponse.json({ data: volunteer }, { status: 201 })
}
