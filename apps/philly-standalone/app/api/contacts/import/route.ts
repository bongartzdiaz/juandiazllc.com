/* POST /api/contacts/import — bulk import contacts from CSV / XLSX.
   ──────────────────────────────────────────────────────────────────
   Body shape:
     {
       rows: Array<Record<string, string>>   // header → cell, already-extracted client-side
       mapping: {                            // user's column-mapping decision
         name:    string  // required — header to use as name
         email?:  string
         phone?:  string
         company?: string
         notes?:  string
         type?:   string  // a Contact.type literal OR a header whose value is one
       }
       type?: string                         // fallback type (default stakeholder)
       dedupeOn?: 'email' | 'phone' | 'both' | 'none'  // default 'both'
       dryRun?: boolean                      // preview-only, no writes
     }

   Response:
     {
       data: {
         total: number
         created: number
         skippedDuplicate: number
         failedValidation: number
         errors: Array<{ row: number; reason: string }>
       }
     }

   Constraints:
     - manager+ role only (same as POST /api/contacts)
     - rate-limited PRESET_MUTATION (same as bulk endpoint)
     - max 500 rows per call — anything bigger should be chunked client-side
     - all PII encrypted at-rest via lib/philly/pii (same path as
       single-create POST /api/contacts)
     - dedup via blind-index hashes (emailHash / phoneHash) — same path
       as the search-by-email lookup in GET /api/contacts

   Out of scope:
     - AI enrichment (single-create's post-response after() block) —
       firing 500 enrichment jobs per import would tank rate-limits.
       Operators can re-trigger enrichment from the contact's quickview.
     - .xls (legacy Excel) — modern Whise exports default to .xlsx
     - Streaming uploads — payload sent as JSON so the rows array is
       capped at 500 per call. */

import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { encryptPii } from '@/lib/philly/pii'
import { hashEmail, hashPhone } from '@/lib/philly/blind-index'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_ROWS = 500

const TYPE_VALUES = ['partner', 'beneficiary', 'stakeholder', 'donor', 'buyer', 'seller', 'tenant', 'landlord'] as const

const ImportBody = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1).max(MAX_ROWS),
  mapping: z.object({
    name:    z.string().min(1),
    email:   z.string().optional(),
    phone:   z.string().optional(),
    company: z.string().optional(),
    notes:   z.string().optional(),
    type:    z.string().optional(),
  }),
  type:     z.enum(TYPE_VALUES).optional().default('stakeholder'),
  dedupeOn: z.enum(['email', 'phone', 'both', 'none']).optional().default('both'),
  dryRun:   z.boolean().optional().default(false),
})

interface RowError { row: number; reason: string }

export async function POST(req: NextRequest) {
  const scope = await requireSection('contacts', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`contacts.import:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  let body: unknown
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const parsed = ImportBody.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid body', 400)
  }
  const { rows, mapping, type: defaultType, dedupeOn, dryRun } = parsed.data

  const prisma = getAuthPrisma()

  // Build the candidate set (validation + normalisation pass before any DB I/O).
  interface Candidate {
    name: string
    email: string
    phone: string
    company: string
    notes: string
    type: string
    emailHash: string | null
    phoneHash: string | null
  }
  const candidates: Candidate[] = []
  const errors: RowError[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? {}
    const name = (row[mapping.name] ?? '').trim()
    if (!name) {
      errors.push({ row: i + 1, reason: 'name missing or empty' })
      continue
    }

    const email = mapping.email ? (row[mapping.email] ?? '').trim() : ''
    const phone = mapping.phone ? (row[mapping.phone] ?? '').trim() : ''
    const company = mapping.company ? (row[mapping.company] ?? '').trim() : ''
    const notes = mapping.notes ? (row[mapping.notes] ?? '').trim() : ''

    // Validate email shape if present — phone is permissive (any non-empty string).
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: i + 1, reason: `invalid email format: ${email}` })
      continue
    }

    // Resolve type: if mapping.type is a Contact.type literal use it directly;
    // otherwise treat it as a column header whose value should be the literal.
    let resolvedType: string = defaultType
    if (mapping.type) {
      if ((TYPE_VALUES as readonly string[]).includes(mapping.type)) {
        resolvedType = mapping.type
      } else {
        const cell = (row[mapping.type] ?? '').trim().toLowerCase()
        if ((TYPE_VALUES as readonly string[]).includes(cell)) {
          resolvedType = cell
        }
      }
    }

    candidates.push({
      name,
      email,
      phone,
      company,
      notes,
      type: resolvedType,
      emailHash: email ? hashEmail(email) : null,
      phoneHash: phone ? hashPhone(phone) : null,
    })
  }

  // Dedup pass — look up existing emailHash / phoneHash in this org.
  let skippedDuplicate = 0
  if (dedupeOn !== 'none' && candidates.length > 0) {
    const orClauses: Record<string, unknown>[] = []
    if (dedupeOn === 'email' || dedupeOn === 'both') {
      const hashes = candidates.map(c => c.emailHash).filter((h): h is string => !!h)
      if (hashes.length > 0) orClauses.push({ emailHash: { in: hashes } })
    }
    if (dedupeOn === 'phone' || dedupeOn === 'both') {
      const hashes = candidates.map(c => c.phoneHash).filter((h): h is string => !!h)
      if (hashes.length > 0) orClauses.push({ phoneHash: { in: hashes } })
    }

    if (orClauses.length > 0) {
      const existing = await prisma.contact.findMany({
        where: { organizationId: scope.organizationId, OR: orClauses },
        select: { emailHash: true, phoneHash: true },
      })
      const seenEmail = new Set(existing.map(e => e.emailHash).filter(Boolean) as string[])
      const seenPhone = new Set(existing.map(e => e.phoneHash).filter(Boolean) as string[])

      // Also dedup *within* the upload itself — two rows with the same email
      // shouldn't both insert.
      const newEmail = new Set<string>()
      const newPhone = new Set<string>()

      for (let i = candidates.length - 1; i >= 0; i--) {
        const c = candidates[i]
        const dupAgainstDb =
          (dedupeOn !== 'phone' && c.emailHash && seenEmail.has(c.emailHash)) ||
          (dedupeOn !== 'email' && c.phoneHash && seenPhone.has(c.phoneHash))
        const dupAgainstBatch =
          (dedupeOn !== 'phone' && c.emailHash && newEmail.has(c.emailHash)) ||
          (dedupeOn !== 'email' && c.phoneHash && newPhone.has(c.phoneHash))
        if (dupAgainstDb || dupAgainstBatch) {
          candidates.splice(i, 1)
          skippedDuplicate++
        } else {
          if (c.emailHash) newEmail.add(c.emailHash)
          if (c.phoneHash) newPhone.add(c.phoneHash)
        }
      }
    }
  }

  if (dryRun) {
    return NextResponse.json({
      data: {
        total: rows.length,
        created: candidates.length,
        skippedDuplicate,
        failedValidation: errors.length,
        errors,
      },
    })
  }

  // Write pass.
  let created = 0
  const createdIds: string[] = []
  if (candidates.length > 0) {
    // createMany doesn't return ids in MariaDB — loop creates so we can fire
    // audit + realtime per row. Chunked in 100-row transactions keeps the
    // single statement size reasonable.
    const CHUNK = 100
    for (let i = 0; i < candidates.length; i += CHUNK) {
      const slice = candidates.slice(i, i + CHUNK)
      // Sequential within a chunk so the audit log + emit order matches the
      // input order — operators can scroll the audit page in the order they
      // imported.
      for (const c of slice) {
        const contact = await prisma.contact.create({
          data: {
            name: c.name,
            email: c.email ? (encryptPii(c.email) ?? '') : '',
            phone: c.phone ? (encryptPii(c.phone) ?? '') : '',
            emailHash: c.emailHash,
            phoneHash: c.phoneHash,
            type: c.type,
            company: c.company,
            notes: c.notes ? (encryptPii(c.notes) ?? '') : '',
            organizationId: scope.organizationId,
          },
        })
        created++
        createdIds.push(contact.id)
      }
    }
  }

  // One audit entry for the whole import — individual create entries would
  // blow up the audit log on a 500-row import. The audit row carries the
  // counts (encoded as synthetic 0→N diffs in the `changes` field so the
  // existing audit page renders them without special-casing); per-contact
  // creation is reconstructable from the Contact rows themselves
  // (createdAt + organizationId).
  await logAudit({
    scope,
    action: 'import',
    entity: 'contact',
    entityId: 'bulk',
    changes: {
      total:            { old: 0, new: rows.length },
      created:          { old: 0, new: created },
      skippedDuplicate: { old: 0, new: skippedDuplicate },
      failedValidation: { old: 0, new: errors.length },
    },
  })

  // Realtime: fan out entity-created notifications in the background so the
  // response returns immediately. Caps at 50 events to avoid hammering the
  // SSE channel for huge imports.
  after(async () => {
    const slice = createdIds.slice(0, 50)
    for (const id of slice) {
      publishEntityCreated(scope.organizationId, 'contact', id, scope.userId)
    }
  })

  return NextResponse.json({
    data: {
      total: rows.length,
      created,
      skippedDuplicate,
      failedValidation: errors.length,
      errors,
    },
  })
}
