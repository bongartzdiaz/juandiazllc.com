/* GET  /api/webhooks — list webhooks
   POST /api/webhooks — create a webhook */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { assertSafeWebhookUrl, UnsafeWebhookUrlError } from '@/lib/philly/webhooks/ssrf-guard'
import { logAudit } from '@/lib/philly/audit'
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

  // Mask secrets
  const masked = webhooks.map((w: any) => ({ ...w, secret: w.secret.slice(0, 8) + '...' }))
  return paginatedResponse(masked, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`webhooks:create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  let body: { url?: string; events?: string[]; enabled?: boolean }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.url?.trim()) return jsonError('url is required', 400)

  // SSRF guard (A-04): https-only, no internal/private/metadata targets.
  try {
    await assertSafeWebhookUrl(body.url.trim())
  } catch (e) {
    if (e instanceof UnsafeWebhookUrlError) return jsonError(e.message, 400)
    throw e
  }

  const secret = crypto.randomBytes(32).toString('hex')

  const prisma = getAuthPrisma()
  const webhook = await prisma.webhook.create({
    data: {
      organizationId: scope.organizationId,
      url: body.url.trim(),
      events: JSON.stringify(body.events ?? ['*']),
      secret,
      enabled: body.enabled ?? true,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'webhook', entityId: webhook.id })
  return NextResponse.json({ data: { ...webhook, secret } }, { status: 201 })
}
