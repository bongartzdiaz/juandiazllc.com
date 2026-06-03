/* GET   /api/integrations — list connected integrations
   POST  /api/integrations — register/connect an integration
   PATCH /api/integrations — update integration status */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { encryptSecret } from '@/lib/philly/crypto'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const connectSchema = z.object({
  provider: z.string().trim().min(1, 'provider is required'),
  name: z.string().optional(),
  apiKey: z.string().optional(),
  accessToken: z.string().optional(),
  scopes: z.unknown().optional(),
  metadata: z.unknown().optional(),
})

const updateSchema = z.object({
  id: z.string().min(1, 'id is required'),
  status: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }
  const [integrations, total] = await Promise.all([
    prisma.integration.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.integration.count({ where }),
  ])

  return paginatedResponse(integrations, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  // Storing an integration credential is a sensitive op — rate-limit
  // per admin so a runaway tool can't churn the Integration table
  // with malformed connect attempts.
  const limited = enforceRateLimit(`integrations:write:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, connectSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()

  // Encrypt the API key / token before storing.
  const rawSecret = body.apiKey ?? body.accessToken ?? null
  const encSecret = rawSecret ? encryptSecret(String(rawSecret)) : null

  const integration = await prisma.integration.upsert({
    where: {
      organizationId_provider: {
        organizationId: scope.organizationId,
        provider: body.provider,
      },
    },
    create: {
      organizationId: scope.organizationId,
      provider: body.provider,
      name: body.name ?? body.provider,
      status: 'connected',
      accessToken: encSecret,
      scopes: body.scopes ? JSON.stringify(body.scopes) : '[]',
      metadata: body.metadata ? JSON.stringify(body.metadata) : '{}',
    },
    update: {
      name: body.name ?? undefined,
      status: 'connected',
      accessToken: encSecret ?? undefined,
      scopes: body.scopes ? JSON.stringify(body.scopes) : undefined,
      metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'integration', entityId: integration.id })
  return NextResponse.json({ data: integration }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`integrations:write:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, updateSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const existing = await prisma.integration.findFirst({
    where: { id: body.id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Integration not found', 404)

  const integration = await prisma.integration.update({
    where: { id: body.id },
    data: { status: body.status ?? 'disconnected' },
  })

  await logAudit({ scope, action: 'update', entity: 'integration', entityId: integration.id })
  return NextResponse.json({ data: integration })
}
