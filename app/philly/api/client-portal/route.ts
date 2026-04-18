/* GET  /api/client-portal — list portal access entries
   POST /api/client-portal — create portal access for a contact */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }

  const [accesses, total] = await Promise.all([
    prisma.clientPortalAccess.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.clientPortalAccess.count({ where }),
  ])

  // Batch-load contact names (no relation in schema)
  const contactIds = Array.from(new Set(accesses.map((a: any) => a.contactId).filter(Boolean)))
  const contacts = contactIds.length > 0
    ? await prisma.contact.findMany({
        where: { id: { in: contactIds }, organizationId: scope.organizationId },
        select: { id: true, name: true, email: true },
      })
    : []
  const contactById = new Map(contacts.map((c: any) => [c.id, c]))

  const enriched = accesses.map((a: any) => ({
    ...a,
    contact: contactById.get(a.contactId) ?? null,
  }))

  return paginatedResponse(enriched, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.contactId?.trim()) return jsonError('contactId is required', 400)

  const prisma = getAuthPrisma()
  const access = await prisma.clientPortalAccess.create({
    data: {
      organizationId: scope.organizationId,
      contactId: body.contactId,
      permissions: body.permissions ? JSON.stringify(body.permissions) : '{}',
      enabled: body.enabled ?? true,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'clientPortalAccess', entityId: access.id })
  publishEntityCreated(scope.organizationId, 'clientPortalAccess', access.id, scope.userId)
  return NextResponse.json({ data: access }, { status: 201 })
}
