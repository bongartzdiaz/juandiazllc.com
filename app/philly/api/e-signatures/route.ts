/* GET  /api/e-signatures — list e-signature requests
   POST /api/e-signatures — create signature request */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const transactionId = url.searchParams.get('transactionId') ?? undefined
  const status = url.searchParams.get('status') ?? undefined

  const prisma = getAuthPrisma()

  // We need to filter via the transaction's org
  const where = {
    transaction: { organizationId: scope.organizationId },
    ...(transactionId ? { transactionId } : {}),
    ...(status ? { status } : {}),
  }

  const [sigs, total] = await Promise.all([
    prisma.eSignature.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: {
        transaction: { select: { id: true, escrowNumber: true, titleCompany: true } },
      },
    }),
    prisma.eSignature.count({ where }),
  ])

  return paginatedResponse(sigs, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.transactionId?.trim()) return jsonError('transactionId is required', 400)
  if (!body.documentName?.trim()) return jsonError('documentName is required', 400)
  if (!body.signerEmail?.trim()) return jsonError('signerEmail is required', 400)

  // Verify transaction belongs to org
  const prisma = getAuthPrisma()
  const txn = await prisma.transaction.findFirst({
    where: { id: body.transactionId, organizationId: scope.organizationId },
  })
  if (!txn) return jsonError('Transaction not found', 404)

  const sig = await prisma.eSignature.create({
    data: {
      transactionId: body.transactionId,
      documentName: body.documentName.trim(),
      signerName: body.signerName ?? '',
      signerEmail: body.signerEmail.trim(),
      status: 'pending',
      provider: body.provider ?? 'manual',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'eSignature', entityId: sig.id })
  publishEntityCreated(scope.organizationId, 'eSignature', sig.id, scope.userId)
  return NextResponse.json({ data: sig }, { status: 201 })
}
