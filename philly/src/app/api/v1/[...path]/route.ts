/* Public REST API v1 — API-key authenticated.
   Supported resources (read/write based on scope):
     GET    /api/v1/contacts
     POST   /api/v1/contacts
     GET    /api/v1/contacts/{id}
     PATCH  /api/v1/contacts/{id}
     DELETE /api/v1/contacts/{id}
   ... same shape for: projects, deals, properties, showings, offers,
       transactions, reservations, rooms, grants, volunteers, documents.

   Auth: Authorization: Bearer pk_... OR X-Api-Key: pk_...
*/

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { validateApiKey, canWrite, canAdmin, ApiKeyScope } from '@/lib/api-keys'
import { publishEntityCreated, publishEntityUpdated, publishEntityDeleted } from '@/lib/realtime/publish'
import { serverError } from '@/lib/safe-error'
import { enforceRateLimit, PRESET_READ, PRESET_MUTATION } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PrismaLike = { [key: string]: any }

interface ResourceConfig {
  model: string
  allowedFields: string[]
  /** Scope filter applied to every query — usually { organizationId } */
  scopeFilter?: (scope: ApiKeyScope) => Record<string, unknown>
  auditEntity: string
}

const RESOURCES: Record<string, ResourceConfig> = {
  contacts: {
    model: 'contact',
    allowedFields: ['name', 'email', 'phone', 'company', 'type', 'notes', 'leadStatus', 'leadSource'],
    scopeFilter: s => ({ organizationId: s.organizationId }),
    auditEntity: 'contact',
  },
  projects: {
    model: 'project',
    allowedFields: ['title', 'description', 'category', 'startDate', 'endDate', 'budget', 'status', 'sdgGoals'],
    scopeFilter: s => ({ organizationId: s.organizationId }),
    auditEntity: 'project',
  },
  deals: {
    model: 'deal',
    allowedFields: ['title', 'stageId', 'contactId', 'valueCents', 'probability', 'status', 'dealType', 'notes', 'expectedClose'],
    scopeFilter: s => ({ pipeline: { organizationId: s.organizationId } }),
    auditEntity: 'deal',
  },
  properties: {
    model: 'property',
    allowedFields: ['title', 'type', 'status', 'address', 'city', 'state', 'zipCode', 'country', 'priceCents', 'bedrooms', 'bathrooms', 'sqft', 'yearBuilt', 'description'],
    scopeFilter: s => ({ organizationId: s.organizationId }),
    auditEntity: 'property',
  },
  showings: {
    model: 'showing',
    allowedFields: ['propertyId', 'agentId', 'contactId', 'status', 'scheduledFor', 'notes', 'feedback', 'rating'],
    scopeFilter: s => ({ organizationId: s.organizationId }),
    auditEntity: 'showing',
  },
  offers: {
    model: 'offer',
    allowedFields: ['propertyId', 'contactId', 'dealId', 'amountCents', 'status', 'notes'],
    scopeFilter: s => ({ property: { organizationId: s.organizationId } }),
    auditEntity: 'offer',
  },
  transactions: {
    model: 'transaction',
    allowedFields: ['type', 'status', 'dealId', 'propertyId', 'salePrice', 'notes', 'closingDate'],
    scopeFilter: s => ({ organizationId: s.organizationId }),
    auditEntity: 'transaction',
  },
  reservations: {
    model: 'reservation',
    allowedFields: ['roomId', 'guestName', 'guestEmail', 'guestPhone', 'status', 'totalCents', 'notes', 'checkIn', 'checkOut'],
    scopeFilter: s => ({ room: { organizationId: s.organizationId } }),
    auditEntity: 'reservation',
  },
  rooms: {
    model: 'room',
    allowedFields: ['name', 'type', 'status', 'floor', 'capacity', 'priceCentsNight'],
    scopeFilter: s => ({ organizationId: s.organizationId }),
    auditEntity: 'room',
  },
  grants: {
    model: 'grant',
    allowedFields: ['title', 'funder', 'amountCents', 'status', 'description'],
    scopeFilter: s => ({ organizationId: s.organizationId }),
    auditEntity: 'grant',
  },
  volunteers: {
    model: 'volunteer',
    allowedFields: ['name', 'email', 'phone', 'status', 'totalHours'],
    scopeFilter: s => ({ organizationId: s.organizationId }),
    auditEntity: 'volunteer',
  },
}

function unauthorized(msg = 'Invalid or missing API key') {
  return NextResponse.json({ error: msg }, { status: 401 })
}

function pickFields(body: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) out[k] = body[k]
  return out
}

async function getAuthedScope(req: NextRequest): Promise<ApiKeyScope | null> {
  const header = req.headers.get('authorization') ?? req.headers.get('x-api-key')
  return validateApiKey(header)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const scope = await getAuthedScope(req)
  if (!scope) return unauthorized()
  const limited = enforceRateLimit(`v1:read:${scope.organizationId}:${scope.apiKeyId}`, PRESET_READ)
  if (limited) return limited
  const { path } = await params
  const [resource, id] = path
  const cfg = RESOURCES[resource]
  if (!cfg) return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })

  const prisma = getAuthPrisma() as PrismaLike
  const where = { ...(cfg.scopeFilter?.(scope) ?? {}) }

  if (id) {
    const row = await prisma[cfg.model].findFirst({ where: { id, ...where } })
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: row })
  }

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200)
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0

  const [rows, total] = await Promise.all([
    prisma[cfg.model].findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
    prisma[cfg.model].count({ where }),
  ])
  return NextResponse.json({ data: rows, total, limit, offset })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const scope = await getAuthedScope(req)
  if (!scope) return unauthorized()
  if (!canWrite(scope)) return NextResponse.json({ error: 'Write scope required' }, { status: 403 })
  const limited = enforceRateLimit(`v1:write:${scope.organizationId}:${scope.apiKeyId}`, PRESET_MUTATION)
  if (limited) return limited
  const { path } = await params
  const [resource] = path
  const cfg = RESOURCES[resource]
  if (!cfg) return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const data = pickFields(body, cfg.allowedFields)

  // For models with a direct organizationId column, inject it
  const filter = cfg.scopeFilter?.(scope) ?? {}
  if ('organizationId' in filter) data.organizationId = (filter as { organizationId: string }).organizationId

  const prisma = getAuthPrisma() as PrismaLike
  try {
    const row = await prisma[cfg.model].create({ data })
    publishEntityCreated(scope.organizationId, cfg.auditEntity, row.id)
    return NextResponse.json({ data: row }, { status: 201 })
  } catch (err) {
    return serverError(err, 'Create failed', 400)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const scope = await getAuthedScope(req)
  if (!scope) return unauthorized()
  if (!canWrite(scope)) return NextResponse.json({ error: 'Write scope required' }, { status: 403 })
  const limited = enforceRateLimit(`v1:write:${scope.organizationId}:${scope.apiKeyId}`, PRESET_MUTATION)
  if (limited) return limited
  const { path } = await params
  const [resource, id] = path
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const cfg = RESOURCES[resource]
  if (!cfg) return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const data = pickFields(body, cfg.allowedFields)

  const prisma = getAuthPrisma() as PrismaLike
  const where = { id, ...(cfg.scopeFilter?.(scope) ?? {}) }
  const existing = await prisma[cfg.model].findFirst({ where })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const row = await prisma[cfg.model].update({ where: { id }, data })
  publishEntityUpdated(scope.organizationId, cfg.auditEntity, id, undefined, row, existing)
  return NextResponse.json({ data: row })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const scope = await getAuthedScope(req)
  if (!scope) return unauthorized()
  if (!canAdmin(scope)) return NextResponse.json({ error: 'Admin scope required' }, { status: 403 })
  const limited = enforceRateLimit(`v1:write:${scope.organizationId}:${scope.apiKeyId}`, PRESET_MUTATION)
  if (limited) return limited
  const { path } = await params
  const [resource, id] = path
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const cfg = RESOURCES[resource]
  if (!cfg) return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })

  const prisma = getAuthPrisma() as PrismaLike
  const where = { id, ...(cfg.scopeFilter?.(scope) ?? {}) }
  const existing = await prisma[cfg.model].findFirst({ where })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma[cfg.model].delete({ where: { id } })
  publishEntityDeleted(scope.organizationId, cfg.auditEntity, id)
  return NextResponse.json({ data: { id } })
}
