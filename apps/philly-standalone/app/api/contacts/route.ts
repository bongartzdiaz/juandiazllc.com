/* GET  /api/contacts — list contacts in the user's org (paginated)
   POST /api/contacts — create a new contact (manager+ only) */

import { NextRequest, NextResponse, after } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { createContactSchema } from '@/lib/philly/validation/schemas'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated, publishEntityUpdated } from '@/lib/philly/realtime/publish'
import { runAndPersistContactAttributes } from '@/lib/philly/ai/contact-attributes'
import { logger } from '@/lib/philly/logger'
import { encryptPii, decryptPii } from '@/lib/philly/pii'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireSection('contacts')
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? undefined
  const search = url.searchParams.get('q') ?? undefined

  const prisma = getAuthPrisma()

  const where = {
    organizationId: scope.organizationId,
    ...(type ? { type } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { company: { contains: search } },
          ],
        }
      : {}),
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: { select: { contactProjects: true } },
      },
    }),
    prisma.contact.count({ where }),
  ])

  // Decrypt at-rest PII fields on the way out. Bundle N — notes only;
  // email/phone are searchable so they remain in plaintext until the
  // blind-index design lands.
  const decrypted = contacts.map((c) => ({ ...c, notes: decryptPii(c.notes) }))
  return paginatedResponse(decrypted, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireSection('contacts', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const parsed = await validateBody(req, createContactSchema)
  if (!parsed.success) return parsed.response

  const input = parsed.data
  const prisma = getAuthPrisma()

  const contact = await prisma.contact.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      type: input.type,
      company: input.company,
      notes: encryptPii(input.notes ?? null) ?? '',
      avatarUrl: input.avatarUrl,
      organizationId: scope.organizationId,
      // Auto-enrichment kicks off post-response via after() below —
      // mark pending synchronously so the UI can show a spinner.
      aiAttributesStatus: 'pending',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'contact', entityId: contact.id })
  publishEntityCreated(scope.organizationId, 'contact', contact.id, scope.userId)

  // Attio-style auto-enrichment — fire the LLM call in the background
  // so the create response returns instantly. after() keeps the worker
  // alive on Vercel for the duration of the async task.
  after(async () => {
    try {
      await runAndPersistContactAttributes({
        contactId: contact.id,
        organizationId: scope.organizationId,
      })
      publishEntityUpdated(scope.organizationId, 'contact', contact.id, scope.userId)
    } catch (err) {
      logger.error('[contacts/create] ai-enrichment failed', {
        contactId: contact.id,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  })

  // Hand back plaintext notes to the caller — they sent it that way,
  // so they expect it that way.
  return NextResponse.json(
    { data: { ...contact, notes: decryptPii(contact.notes) } },
    { status: 201 },
  )
}
