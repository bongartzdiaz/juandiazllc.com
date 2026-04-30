/* GET / PATCH / DELETE /api/webhooks/[id]
   Admin-only. Secret is masked in responses unless regenerated. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { encryptSecret } from '@/lib/philly/crypto'
import { maskWebhookSecret } from '@/lib/philly/webhooks/secrets'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await params

  const prisma = getAuthPrisma()
  const wh = await prisma.webhook.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: {
      deliveries: { orderBy: { createdAt: 'desc' }, take: 25 },
      _count: { select: { deliveries: true } },
    },
  })
  if (!wh) return jsonError('Webhook not found', 404)
  return NextResponse.json({ data: { ...wh, secret: maskWebhookSecret(wh.secret) } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`webhooks.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await params

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.webhook.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Webhook not found', 404)

  const data: Record<string, unknown> = {}
  if (typeof body.url === 'string') data.url = body.url.trim()
  if (Array.isArray(body.events)) data.events = JSON.stringify(body.events)
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled

  // Hold the plaintext so we can return it once on rotation.
  let rotatedPlaintext: string | null = null
  if (body.rotateSecret === true) {
    rotatedPlaintext = crypto.randomBytes(32).toString('hex')
    const enc = encryptSecret(rotatedPlaintext)
    if (!enc) return jsonError('Failed to encrypt rotated secret', 500)
    data.secret = enc
  }

  const updated = await prisma.webhook.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'webhook', entityId: id })
  return NextResponse.json({
    data: {
      ...updated,
      secret: rotatedPlaintext ?? maskWebhookSecret(updated.secret),
    },
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`webhooks.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await params

  const prisma = getAuthPrisma()
  const existing = await prisma.webhook.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Webhook not found', 404)
  await prisma.webhook.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'webhook', entityId: id })
  return NextResponse.json({ data: { id } })
}
