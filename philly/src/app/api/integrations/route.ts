/* GET   /api/integrations — list connected integrations
   POST  /api/integrations — register/connect an integration
   PATCH /api/integrations — update integration status */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/audit'
import { encryptSecret } from '@/lib/crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.provider?.trim()) return jsonError('provider is required', 400)

  const prisma = getAuthPrisma()

  // Encrypt the API key / token before storing.
  const rawSecret = body.apiKey ?? body.accessToken ?? null
  const encSecret = rawSecret ? encryptSecret(String(rawSecret)) : null

  const integration = await prisma.integration.upsert({
    where: {
      organizationId_provider: {
        organizationId: scope.organizationId,
        provider: body.provider.trim(),
      },
    },
    create: {
      organizationId: scope.organizationId,
      provider: body.provider.trim(),
      name: body.name ?? body.provider.trim(),
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

  let body: { id?: string; status?: string }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.id) return jsonError('id is required', 400)

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
