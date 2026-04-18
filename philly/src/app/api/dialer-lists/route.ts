/* GET  /api/dialer-lists — list dialer lists
   POST /api/dialer-lists — create dialer list */

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

  const [lists, total] = await Promise.all([
    prisma.dialerList.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.dialerList.count({ where }),
  ])

  return paginatedResponse(lists, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.name?.trim()) return jsonError('name is required', 400)

  const contactIds = Array.isArray(body.contactIds) ? body.contactIds : []

  const prisma = getAuthPrisma()
  const list = await prisma.dialerList.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name.trim(),
      contactIds: JSON.stringify(contactIds),
      totalContacts: contactIds.length,
      assignedTo: body.assignedTo ?? null,
      status: 'active',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'dialerList', entityId: list.id })
  return NextResponse.json({ data: list }, { status: 201 })
}
