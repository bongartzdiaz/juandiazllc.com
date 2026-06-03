/* GET  /api/email/accounts — list email accounts
   POST /api/email/accounts — connect new email account */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { encryptSecret } from '@/lib/philly/crypto'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  email: z.string().trim().min(1, 'email is required').max(255),
  password: z.string().max(1000).optional(),
  provider: z.string().max(60).optional(),
  displayName: z.string().max(255).optional(),
  smtpHost: z.string().max(255).optional(),
  smtpPort: z.coerce.number().int().optional(),
  imapHost: z.string().max(255).optional(),
  imapPort: z.coerce.number().int().optional(),
  username: z.string().max(255).optional(),
})

// Strip the encryptedPass field on every response — even though the
// stored value is encrypted at rest, leaking the ciphertext narrows
// an attacker's brute-force search if they ever exfiltrated it.
function redactAccount<T extends { encryptedPass?: string }>(account: T): Omit<T, 'encryptedPass'> {
  const { encryptedPass: _, ...rest } = account
  void _
  return rest
}

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

  return paginatedResponse(accounts.map(redactAccount), total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  // Connecting an email account is an expensive op (it'll attempt
  // SMTP/IMAP probes downstream) and stores a credential. Rate-limit
  // per user to make abuse loud rather than silent.
  const limited = enforceRateLimit(`email-accounts:create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  // Encrypt the SMTP/IMAP password before insert. The DB column is
  // named `encryptedPass`; that name has been a contract for a while
  // but the encryption was missing — fixed here.
  const passPlaintext = typeof body.password === 'string' ? body.password : ''
  const encryptedPass = passPlaintext ? (encryptSecret(passPlaintext) ?? '') : ''

  const prisma = getAuthPrisma()
  const account = await prisma.emailAccount.create({
    data: {
      organizationId: scope.organizationId,
      userId: scope.userId,
      provider: body.provider ?? 'smtp',
      email: body.email,
      displayName: body.displayName ?? '',
      smtpHost: body.smtpHost ?? '',
      smtpPort: body.smtpPort ?? 587,
      imapHost: body.imapHost ?? '',
      imapPort: body.imapPort ?? 993,
      username: body.username ?? '',
      encryptedPass,
      status: 'active',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'emailAccount', entityId: account.id })
  return NextResponse.json({ data: redactAccount(account) }, { status: 201 })
}
