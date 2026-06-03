/* GET  /api/listing-alerts — list alerts
   POST /api/listing-alerts — create alert */

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
  contactId: z.string().trim().min(1, 'contactId is required').max(120),
  name: z.string().trim().min(1, 'name is required').max(120),
  criteria: z.any().optional(),
  frequency: z.string().max(60).optional(),
  channel: z.string().max(60).optional(),
  enabled: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const contactId = url.searchParams.get('contactId') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(contactId ? { contactId } : {}),
  }

  const [alerts, total] = await Promise.all([
    prisma.listingAlert.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.listingAlert.count({ where }),
  ])

  return paginatedResponse(alerts, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`listing-alerts.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const alert = await prisma.listingAlert.create({
    data: {
      organizationId: scope.organizationId,
      contactId: body.contactId,
      name: body.name,
      criteria: body.criteria ? JSON.stringify(body.criteria) : '{}',
      frequency: body.frequency ?? 'daily',
      channel: body.channel ?? 'email',
      enabled: body.enabled ?? true,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'listingAlert', entityId: alert.id })
  return NextResponse.json({ data: alert }, { status: 201 })
}
