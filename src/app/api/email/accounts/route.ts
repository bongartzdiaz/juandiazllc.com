/* GET  /api/email/accounts — list email accounts
   POST /api/email/accounts — connect new email account */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }
  const [accounts, total] = await Promise.all([
    prisma.emailAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { _count: { select: { emails: true } } },
    }),
    prisma.emailAccount.count({ where }),
  ])

  return paginatedResponse(accounts, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.email?.trim()) return jsonError('email is required', 400)

  const prisma = getAuthPrisma()
  const account = await prisma.emailAccount.create({
    data: {
      organizationId: scope.organizationId,
      userId: scope.userId,
      provider: body.provider ?? 'smtp',
      email: body.email.trim(),
      displayName: body.displayName ?? '',
      smtpHost: body.smtpHost ?? '',
      smtpPort: body.smtpPort ?? 587,
      imapHost: body.imapHost ?? '',
      imapPort: body.imapPort ?? 993,
      username: body.username ?? '',
      encryptedPass: body.password ?? '',
      status: 'active',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'emailAccount', entityId: account.id })
  return NextResponse.json({ data: account }, { status: 201 })
}
