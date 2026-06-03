/* GET  /api/dialer-lists — list dialer lists
   POST /api/dialer-lists — create dialer list */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  contactIds: z.array(z.string().max(255)).max(100_000).optional(),
  assignedTo: z.string().max(255).optional(),
})

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

  const limited = enforceRateLimit(`dialer-lists.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const contactIds = Array.isArray(body.contactIds) ? body.contactIds : []

  const prisma = getAuthPrisma()
  const list = await prisma.dialerList.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
      contactIds: JSON.stringify(contactIds),
      totalContacts: contactIds.length,
      assignedTo: body.assignedTo ?? null,
      status: 'active',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'dialerList', entityId: list.id })
  return NextResponse.json({ data: list }, { status: 201 })
}
