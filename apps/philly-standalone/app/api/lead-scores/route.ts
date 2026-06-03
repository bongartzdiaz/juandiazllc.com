/* GET  /api/lead-scores — list lead scores
   POST /api/lead-scores — recalculate a contact's score */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { decryptPii } from '@/lib/philly/pii'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'
import { idSchema } from '@/lib/philly/api/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  contactId: idSchema,
  behaviorScore: z.coerce.number().optional(),
  demographicScore: z.coerce.number().optional(),
  reason: z.string().trim().max(255).optional(),
})

function gradeFromScore(score: number): string {
  if (score >= 80) return 'A'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  if (score >= 20) return 'D'
  return 'F'
}

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const minScore = url.searchParams.get('minScore') ? Number(url.searchParams.get('minScore')) : undefined
  const grade = url.searchParams.get('grade') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(minScore ? { score: { gte: minScore } } : {}),
    ...(grade ? { grade } : {}),
  }

  const [scores, total] = await Promise.all([
    prisma.leadScore.findMany({ where, orderBy: { score: 'desc' }, skip, take: limit }),
    prisma.leadScore.count({ where }),
  ])

  // Manual contact join
  const contactIds = Array.from(new Set(scores.map((s: any) => s.contactId).filter(Boolean)))
  const contacts = contactIds.length > 0
    ? await prisma.contact.findMany({
        where: { id: { in: contactIds }, organizationId: scope.organizationId },
        select: { id: true, name: true, email: true },
      })
    : []
  const byId = new Map(
    contacts.map((c: any) => [c.id, { ...c, email: decryptPii(c.email) ?? '' }]),
  )
  const enriched = scores.map((s: any) => ({ ...s, contact: byId.get(s.contactId) ?? null }))

  return paginatedResponse(enriched, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`lead-scores.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const behaviorScore = body.behaviorScore ?? 0
  const demographicScore = body.demographicScore ?? 0
  const totalScore = Math.min(100, Math.max(0, behaviorScore + demographicScore))

  const prisma = getAuthPrisma()
  const result = await prisma.leadScore.upsert({
    where: { contactId: body.contactId },
    create: {
      organizationId: scope.organizationId,
      contactId: body.contactId,
      score: totalScore,
      grade: gradeFromScore(totalScore),
      behaviorScore,
      demographicScore,
      lastActivity: new Date(),
      scoreHistory: JSON.stringify([{ date: new Date().toISOString(), score: totalScore, reason: body.reason ?? 'manual' }]),
    },
    update: {
      score: totalScore,
      grade: gradeFromScore(totalScore),
      behaviorScore,
      demographicScore,
      lastActivity: new Date(),
    },
  })

  await logAudit({ scope, action: 'update', entity: 'leadScore', entityId: result.id })
  return NextResponse.json({ data: result })
}
