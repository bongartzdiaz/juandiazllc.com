/* POST /api/webhooks/[id]/deliveries/[deliveryId]/retry — replay a stored delivery */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string; deliveryId: string }> }

function sign(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id: webhookId, deliveryId } = await ctx.params

  const prisma = getAuthPrisma()

  // Load webhook + original delivery, verify org ownership
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, organizationId: scope.organizationId },
  })
  if (!webhook) return jsonError('Webhook not found', 404)

  const original = await prisma.webhookDelivery.findFirst({
    where: { id: deliveryId, webhookId },
  })
  if (!original) return jsonError('Delivery not found', 404)

  // Replay the payload
  const body = original.payload
  const signature = sign(body, webhook.secret)
  let status = 0
  let responseText = ''
  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Philly-Webhook/1.0 (retry)',
        'X-Philly-Signature': `sha256=${signature}`,
        'X-Philly-Retry': 'true',
        'X-Philly-Original-Delivery': deliveryId,
      },
      body,
    })
    status = res.status
    responseText = (await res.text().catch(() => '')).slice(0, 2000)
  } catch (err) {
    status = 0
    responseText = err instanceof Error ? err.message : 'network error'
  }

  // Record a new delivery row
  const retry = await prisma.webhookDelivery.create({
    data: {
      webhookId,
      event: original.event,
      payload: body.slice(0, 65000),
      statusCode: status || null,
      response: responseText ? `[RETRY] ${responseText}` : '[RETRY]',
    },
  })

  await logAudit({ scope, action: 'update', entity: 'webhook', entityId: webhookId })
  return NextResponse.json({
    data: {
      id: retry.id,
      statusCode: retry.statusCode,
      response: retry.response,
      ok: status >= 200 && status < 300,
    },
  })
}
