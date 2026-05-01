/* POST   /api/drip-campaigns/[id]/enroll      — enroll a contact
   DELETE /api/drip-campaigns/[id]/enroll/?contactId=...   — unenroll
   GET    /api/drip-campaigns/[id]/enroll      — list current enrollments

   Bundle BZ. Operator manages enrollments via the existing
   /drip-campaigns page; the cron at /api/cron/drip-dispatch
   actually delivers the steps. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseSteps, initialDueAt } from '@/lib/philly/drip/steps'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const campaign = await prisma.dripCampaign.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!campaign) return jsonError('Campaign not found', 404)

  const enrollments = await prisma.dripEnrollment.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true, contactId: true, status: true,
      lastStepIndex: true, nextDueAt: true, lastDeliveredAt: true,
      lastError: true, attemptCount: true, createdAt: true,
    },
  })
  return NextResponse.json({ data: enrollments })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`drip-campaigns.enroll:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  let body: { contactId?: string }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.contactId || typeof body.contactId !== 'string') {
    return jsonError('contactId is required', 400)
  }

  const prisma = getAuthPrisma()
  const campaign = await prisma.dripCampaign.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true, status: true, stepsJson: true },
  })
  if (!campaign) return jsonError('Campaign not found', 404)
  if (campaign.status !== 'active') return jsonError('Campaign is not active', 400)

  const steps = parseSteps(campaign.stepsJson)
  const now = new Date()
  const due = initialDueAt(now, steps)
  if (!due) return jsonError('Campaign has no valid steps configured', 400)

  // Tenancy-bound contact check.
  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!contact) return jsonError('Contact not found in this organization', 404)

  // Idempotent — re-enrolling resets the cursor to step 0.
  const enrollment = await prisma.dripEnrollment.upsert({
    where: { campaignId_contactId: { campaignId: id, contactId: body.contactId } },
    update: {
      status: 'active',
      lastStepIndex: -1,
      nextDueAt: due,
      lastError: null,
      attemptCount: 0,
    },
    create: {
      campaignId: id,
      contactId: body.contactId,
      organizationId: scope.organizationId,
      status: 'active',
      lastStepIndex: -1,
      nextDueAt: due,
    },
  })

  // Bump the campaign's enrolledCount (best-effort — eventually-
  // consistent if races happen, that's fine for a vanity metric).
  await prisma.dripCampaign.update({
    where: { id },
    data: { enrolledCount: { increment: 1 } },
  }).catch(() => {})

  await logAudit({
    scope, action: 'create', entity: 'dripEnrollment', entityId: enrollment.id,
    changes: { campaignId: { old: null, new: id }, contactId: { old: null, new: body.contactId } },
  }).catch(() => {})

  return NextResponse.json({ data: enrollment }, { status: 201 })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`drip-campaigns.unenroll:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const url = new URL(req.url)
  const contactId = url.searchParams.get('contactId')
  if (!contactId) return jsonError('contactId query param is required', 400)

  const prisma = getAuthPrisma()
  const enrollment = await prisma.dripEnrollment.findFirst({
    where: { campaignId: id, contactId, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!enrollment) return jsonError('Enrollment not found', 404)

  // Soft-cancel: keep the row for audit + so we don't deliver
  // future scheduled steps. Operator can hard-delete via DB if
  // they want it gone.
  await prisma.dripEnrollment.update({
    where: { id: enrollment.id },
    data: { status: 'cancelled', nextDueAt: null },
  })

  await logAudit({
    scope, action: 'delete', entity: 'dripEnrollment', entityId: enrollment.id,
    changes: { status: { old: 'active', new: 'cancelled' } },
  }).catch(() => {})

  return new NextResponse(null, { status: 204 })
}
