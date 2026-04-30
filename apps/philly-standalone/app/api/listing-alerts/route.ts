/* GET  /api/listing-alerts — list alerts
   POST /api/listing-alerts — create alert */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.contactId?.trim()) return jsonError('contactId is required', 400)
  if (!body.name?.trim()) return jsonError('name is required', 400)

  const prisma = getAuthPrisma()
  const alert = await prisma.listingAlert.create({
    data: {
      organizationId: scope.organizationId,
      contactId: body.contactId,
      name: body.name.trim(),
      criteria: body.criteria ? JSON.stringify(body.criteria) : '{}',
      frequency: body.frequency ?? 'daily',
      channel: body.channel ?? 'email',
      enabled: body.enabled ?? true,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'listingAlert', entityId: alert.id })
  return NextResponse.json({ data: alert }, { status: 201 })
}
