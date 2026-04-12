/* GET  /api/grants — list grants
   POST /api/grants — create grant */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/pagination'

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

  const [grants, total] = await Promise.all([
    prisma.grant.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.grant.count({ where }),
  ])

  return paginatedResponse(grants, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.title?.trim()) return jsonError('title is required', 400)

  const prisma = getAuthPrisma()
  const grant = await prisma.grant.create({
    data: {
      organizationId: scope.organizationId,
      title: body.title.trim(),
      funder: body.funder ?? '',
      amountCents: body.amountCents ?? 0,
      status: body.status ?? 'prospect',
      appliedDate: body.appliedDate ? new Date(body.appliedDate) : null,
      awardedDate: body.awardedDate ? new Date(body.awardedDate) : null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      description: body.description ?? '',
      requirements: body.requirements ?? '',
    },
  })

  return NextResponse.json({ data: grant }, { status: 201 })
}
