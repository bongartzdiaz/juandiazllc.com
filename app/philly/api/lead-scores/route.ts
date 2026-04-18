/* GET  /api/lead-scores — list lead scores
   POST /api/lead-scores — recalculate a contact's score */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  const contactIds = Array.from(new Set(scores.map(s => s.contactId).filter(Boolean)))
  const contacts = contactIds.length > 0
    ? await prisma.contact.findMany({
        where: { id: { in: contactIds }, organizationId: scope.organizationId },
        select: { id: true, name: true, email: true },
      })
    : []
  const byId = new Map(contacts.map(c => [c.id, c]))
  const enriched = scores.map(s => ({ ...s, contact: byId.get(s.contactId) ?? null }))

  return paginatedResponse(enriched, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.contactId?.trim()) return jsonError('contactId is required', 400)

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
