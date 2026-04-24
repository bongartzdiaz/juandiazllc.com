/* GET  /api/calls — list call logs
   POST /api/calls — log a call */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const agentId = url.searchParams.get('agentId') ?? undefined
  const contactId = url.searchParams.get('contactId') ?? undefined
  const outcome = url.searchParams.get('outcome') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(agentId ? { agentId } : {}),
    ...(contactId ? { contactId } : {}),
    ...(outcome ? { outcome } : {}),
  }

  const [calls, total] = await Promise.all([
    prisma.callLog.findMany({ where, orderBy: { startedAt: 'desc' }, skip, take: limit }),
    prisma.callLog.count({ where }),
  ])

  return paginatedResponse(calls, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const call = await prisma.callLog.create({
    data: {
      organizationId: scope.organizationId,
      agentId: body.agentId ?? scope.userId,
      contactId: body.contactId ?? null,
      direction: body.direction ?? 'outbound',
      phoneNumber: body.phoneNumber ?? '',
      status: body.status ?? 'completed',
      duration: body.duration ?? 0,
      outcome: body.outcome ?? '',
      notes: body.notes ?? '',
      recordingUrl: body.recordingUrl ?? '',
      disposition: body.disposition ?? '',
      callbackAt: body.callbackAt ? new Date(body.callbackAt) : null,
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      endedAt: body.endedAt ? new Date(body.endedAt) : null,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'call', entityId: call.id })
  return NextResponse.json({ data: call }, { status: 201 })
}
