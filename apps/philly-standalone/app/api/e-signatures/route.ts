/* GET  /api/e-signatures — list e-signature requests
   POST /api/e-signatures — create signature request */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  transactionId: z.string().trim().min(1, 'transactionId is required').max(80),
  documentName: z.string().trim().min(1, 'documentName is required').max(255),
  signerEmail: z.string().trim().min(1, 'signerEmail is required').max(255),
  signerName: z.string().trim().max(120).optional(),
  provider: z.string().trim().max(40).optional(),
})

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

  const limited = enforceRateLimit(`e-signatures.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  // Verify transaction belongs to org
  const prisma = getAuthPrisma()
  const txn = await prisma.transaction.findFirst({
    where: { id: body.transactionId, organizationId: scope.organizationId },
  })
  if (!txn) return jsonError('Transaction not found', 404)

  const sig = await prisma.eSignature.create({
    data: {
      transactionId: body.transactionId,
      documentName: body.documentName,
      signerName: body.signerName ?? '',
      signerEmail: body.signerEmail,
      status: 'pending',
      provider: body.provider ?? 'manual',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'eSignature', entityId: sig.id })
  publishEntityCreated(scope.organizationId, 'eSignature', sig.id, scope.userId)
  return NextResponse.json({ data: sig }, { status: 201 })
}
