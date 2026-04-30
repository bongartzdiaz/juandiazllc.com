/* GET  /api/contacts — list contacts in the user's org (paginated)
   POST /api/contacts — create a new contact (manager+ only) */

import { NextRequest, NextResponse, after } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { createContactSchema } from '@/lib/philly/validation/schemas'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated, publishEntityUpdated } from '@/lib/philly/realtime/publish'
import { runAndPersistContactAttributes } from '@/lib/philly/ai/contact-attributes'
import { logger } from '@/lib/philly/logger'
import { encryptPii, decryptPii } from '@/lib/philly/pii'
import {
  hashEmail,
  hashPhone,
  looksLikeEmailQuery,
  looksLikePhoneQuery,
} from '@/lib/philly/blind-index'
import { compileFilter, FilterCompileError } from '@/lib/philly/filter/compile'
import { CONTACT_FILTER_SCHEMA } from '@/lib/philly/filter/schemas'
import type { FilterSpec } from '@/lib/philly/filter/types'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

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

  // Search rewrite for blind-index (Bundle P):
  //   - if `q` looks like a full email → exact-match by emailHash
  //   - if `q` looks like a phone → exact-match by phoneHash
  //   - otherwise → name + company substring search only
  // Substring on email/phone is no longer possible (the values are
  // encrypted with random IVs); operators search by the full value
  // they have, or by name/company fragments.
  const searchClause = ((): Record<string, unknown> | null => {
    if (!search) return null
    if (looksLikeEmailQuery(search)) {
      const h = hashEmail(search)
      if (h) return { emailHash: h }
    }
    if (looksLikePhoneQuery(search)) {
      const h = hashPhone(search)
      if (h) return { phoneHash: h }
    }
    return {
      OR: [
        { name: { contains: search } },
        { company: { contains: search } },
      ],
    }
  })()

  // Bundle AM — advanced filter builder. Accepts a JSON-encoded
  // FilterSpec under `?filter=`. Compile errors come back as 400.
  let advancedClause: Record<string, unknown> | null = null
  const filterParam = url.searchParams.get('filter')
  if (filterParam) {
    let parsed: unknown
    try { parsed = JSON.parse(filterParam) } catch { return jsonError('Invalid filter JSON', 400) }
    try {
      advancedClause = compileFilter(parsed as FilterSpec, CONTACT_FILTER_SCHEMA)
    } catch (e) {
      if (e instanceof FilterCompileError) return jsonError(e.message, 400)
      throw e
    }
  }

  // organizationId is enforced unconditionally — even an attacker
  // who somehow injects a where clause via the filter spec can't
  // escape their tenant.
  const where: Record<string, unknown> = {
    organizationId: scope.organizationId,
    ...(type ? { type } : {}),
    ...(searchClause ?? {}),
  }
  if (advancedClause && Object.keys(advancedClause).length > 0) {
    // Wrap the user's filter in AND with the tenancy guard. The
    // compiled filter never references organizationId (the schema
    // doesn't list it), but defence-in-depth.
    where.AND = [advancedClause]
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      // Bundle AG: explicit displayOrder wins (NULLS LAST via Prisma's
      // sort), createdAt is the secondary key for unordered rows.
      orderBy: [
        { displayOrder: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
      include: {
        _count: { select: { contactProjects: true } },
      },
    }),
    prisma.contact.count({ where }),
  ])

  // Decrypt at-rest PII on the way out: email, phone, notes.
  const decrypted = contacts.map((c) => ({
    ...c,
    email: decryptPii(c.email) ?? '',
    phone: decryptPii(c.phone) ?? '',
    notes: decryptPii(c.notes),
  }))
  return paginatedResponse(decrypted, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireSection('contacts', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`contacts.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, createContactSchema)
  if (!parsed.success) return parsed.response

  const input = parsed.data
  const prisma = getAuthPrisma()

  const contact = await prisma.contact.create({
    data: {
      name: input.name,
      email: encryptPii(input.email) ?? '',
      phone: encryptPii(input.phone) ?? '',
      emailHash: hashEmail(input.email),
      phoneHash: hashPhone(input.phone),
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

  // Hand back plaintext to the caller — they sent it that way.
  return NextResponse.json(
    {
      data: {
        ...contact,
        email: decryptPii(contact.email) ?? '',
        phone: decryptPii(contact.phone) ?? '',
        notes: decryptPii(contact.notes),
      },
    },
    { status: 201 },
  )
}
