/* GET  /api/webhooks — list webhooks
   POST /api/webhooks — create a webhook */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { encryptSecret } from '@/lib/philly/crypto'
import { maskWebhookSecret } from '@/lib/philly/webhooks/secrets'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }
  const [webhooks, total] = await Promise.all([
    prisma.webhook.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { _count: { select: { deliveries: true } } },
    }),
    prisma.webhook.count({ where }),
  ])

  // Mask secrets — unwrap first since the storage form is encrypted.
  const masked = webhooks.map((w: any) => ({ ...w, secret: maskWebhookSecret(w.secret) }))
  return paginatedResponse(masked, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  let body: { url?: string; events?: string[]; enabled?: boolean }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.url?.trim()) return jsonError('url is required', 400)

  // Generate plaintext for the operator to copy, encrypt before storage.
  // The plaintext is returned exactly once in the create response.
  const secret = crypto.randomBytes(32).toString('hex')
  const encrypted = encryptSecret(secret)
  if (!encrypted) return jsonError('Failed to encrypt webhook secret', 500)

  const prisma = getAuthPrisma()
  const webhook = await prisma.webhook.create({
    data: {
      organizationId: scope.organizationId,
      url: body.url.trim(),
      events: JSON.stringify(body.events ?? ['*']),
      secret: encrypted,
      enabled: body.enabled ?? true,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'webhook', entityId: webhook.id })
  return NextResponse.json({ data: { ...webhook, secret } }, { status: 201 })
}
