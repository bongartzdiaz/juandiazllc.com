/* PATCH /api/e-signatures/[id] — update status, signer, notes
   DELETE /api/e-signatures/[id] — delete signature request */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const sig = await prisma.eSignature.findFirst({
    where: { id, transaction: { organizationId: scope.organizationId } },
    include: { transaction: { select: { id: true, escrowNumber: true } } },
  })
  if (!sig) return jsonError('Signature not found', 404)
  return NextResponse.json({ data: sig })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.eSignature.findFirst({
    where: { id, transaction: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Signature not found', 404)

  const data: Record<string, unknown> = {}
  if (body.signerName !== undefined) data.signerName = body.signerName
  if (body.signerEmail !== undefined) data.signerEmail = body.signerEmail
  if (body.documentName !== undefined) data.documentName = body.documentName
  if (body.provider !== undefined) data.provider = body.provider
  if (body.externalId !== undefined) data.externalId = body.externalId

  // Status transitions auto-set timestamps
  if (body.status !== undefined) {
    data.status = body.status
    const now = new Date()
    if (body.status === 'sent' && !body.sentAt) data.sentAt = now
    if (body.status === 'viewed' && !body.viewedAt) data.viewedAt = now
    if (body.status === 'signed' && !body.signedAt) data.signedAt = now
  }

  const sig = await prisma.eSignature.update({
    where: { id }, data,
    include: { transaction: { select: { id: true, escrowNumber: true, titleCompany: true } } },
  })
  await logAudit({ scope, action: 'update', entity: 'eSignature', entityId: id })
  publishEntityUpdated(scope.organizationId, 'eSignature', id, scope.userId)
  return NextResponse.json({ data: sig })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const existing = await prisma.eSignature.findFirst({
    where: { id, transaction: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Signature not found', 404)

  await prisma.eSignature.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'eSignature', entityId: id })
  publishEntityDeleted(scope.organizationId, 'eSignature', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
