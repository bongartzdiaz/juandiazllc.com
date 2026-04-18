/* GET / PATCH / DELETE /api/webhooks/[id]
   Admin-only. Secret is masked in responses unless regenerated. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
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
  return NextResponse.json({ data: { ...wh, secret: wh.secret.slice(0, 8) + '...' } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
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
  if (body.rotateSecret === true) data.secret = crypto.randomBytes(32).toString('hex')

  const updated = await prisma.webhook.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'webhook', entityId: id })
  return NextResponse.json({
    data: {
      ...updated,
      secret: body.rotateSecret === true ? updated.secret : updated.secret.slice(0, 8) + '...',
    },
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
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
