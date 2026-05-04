/* POST /api/cron/drip-dispatch — send the next step on every
   DripEnrollment whose nextDueAt has elapsed.

   Authentication: Bearer token equal to CRON_SECRET — same shape
   as the GDPR cron. Vercel Cron sets this header automatically
   when configured under vercel.json.

   Per-org gating: the DRIP_CAMPAIGNS feature flag (Bundle BZ
   re-add). When disabled, the org's enrollments are skipped
   silently — operators flip the flag to pause every drip without
   touching individual campaigns.

   Idempotent: re-running picks up where we left off. Failed sends
   bump attemptCount + record lastError + leave nextDueAt unchanged
   so the next cron run retries; after MAX_ATTEMPTS the enrollment
   pauses (status='paused') so the operator can intervene. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logger } from '@/lib/philly/logger'
import { isFeatureEnabled, FEATURES } from '@/lib/philly/features'
import {
  parseSteps, advanceAfterDelivery, renderTemplate,
  type DripStep,
} from '@/lib/philly/drip/steps'
import { sendEmail } from '@/lib/philly/email/send'
import { sendSms } from '@/lib/philly/sms/send'
import { decryptPii } from '@/lib/philly/pii'
import type { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const BATCH_SIZE = 100
const MAX_ATTEMPTS = 3

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const provided = req.headers.get('authorization')
  if (!provided) return false
  return provided === `Bearer ${expected}` || provided === expected
}

interface EnrollmentRow {
  id: string
  campaignId: string
  contactId: string
  organizationId: string
  lastStepIndex: number
  attemptCount: number
  createdAt: Date
  nextDueAt: Date | null
}

interface DispatchSummary {
  considered: number
  sent: number
  failed: number
  paused: number
  skippedFlag: number
}

async function dispatchOne(
  prisma: PrismaClient,
  enrollment: EnrollmentRow,
  steps: DripStep[],
  contact: { name: string; email: string | null; phone: string | null; company: string },
  emailAccountId: string | null,
): Promise<{ ok: boolean; error?: string; done?: boolean }> {
  const nextIdx = enrollment.lastStepIndex + 1
  if (nextIdx >= steps.length) {
    // No more steps — mark done. Shouldn't normally happen because
    // advanceAfterDelivery sets nextDueAt=null in that case, but be
    // defensive.
    return { ok: true, done: true }
  }
  const step = steps[nextIdx]
  const ctx = {
    name: contact.name,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    company: contact.company,
  }
  const body = renderTemplate(step.body, ctx)
  const subject = step.subject ? renderTemplate(step.subject, ctx) : 'Follow up'

  try {
    if (step.channel === 'email') {
      if (!contact.email) return { ok: false, error: 'contact has no email on file' }
      if (!emailAccountId) return { ok: false, error: 'no email account configured for org' }
      await sendEmail(enrollment.organizationId, {
        accountId: emailAccountId,
        to: contact.email,
        subject,
        bodyText: body,
        templateId: step.templateId,
        contactId: enrollment.contactId,
      })
    } else {
      if (!contact.phone) return { ok: false, error: 'contact has no phone on file' }
      await sendSms(enrollment.organizationId, {
        toNumber: contact.phone,
        body,
        templateId: step.templateId,
        contactId: enrollment.contactId,
      })
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown send error' }
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const prisma = getAuthPrisma()
  const summary: DispatchSummary = {
    considered: 0, sent: 0, failed: 0, paused: 0, skippedFlag: 0,
  }
  const now = new Date()

  // Pull a bounded batch of due enrollments. Order by nextDueAt asc
  // so the oldest backlog clears first.
  const due = await prisma.dripEnrollment.findMany({
    where: {
      status: 'active',
      nextDueAt: { lte: now },
    },
    orderBy: { nextDueAt: 'asc' },
    take: BATCH_SIZE,
    select: {
      id: true,
      campaignId: true,
      contactId: true,
      organizationId: true,
      lastStepIndex: true,
      attemptCount: true,
      createdAt: true,
      nextDueAt: true, // Bundle CG — optimistic-concurrency guard.
    },
  })

  summary.considered = due.length
  if (due.length === 0) {
    return NextResponse.json({ data: summary, ranAt: now.toISOString() })
  }

  // Cache per-org flag check, campaign steps, and email account
  // lookup so we don't refetch for every enrollment in the batch.
  const flagCache = new Map<string, boolean>()
  const campaignCache = new Map<string, { steps: DripStep[]; status: string }>()
  const emailAccountCache = new Map<string, string | null>()

  for (const e of due) {
    // Per-org DRIP kill-switch.
    if (!flagCache.has(e.organizationId)) {
      flagCache.set(
        e.organizationId,
        await isFeatureEnabled(prisma, e.organizationId, FEATURES.DRIP_CAMPAIGNS.key),
      )
    }
    if (!flagCache.get(e.organizationId)) {
      summary.skippedFlag += 1
      continue
    }

    // Resolve campaign + parse steps.
    if (!campaignCache.has(e.campaignId)) {
      const c = await prisma.dripCampaign.findUnique({
        where: { id: e.campaignId },
        select: { stepsJson: true, status: true },
      })
      if (!c) {
        campaignCache.set(e.campaignId, { steps: [], status: 'archived' })
      } else {
        campaignCache.set(e.campaignId, { steps: parseSteps(c.stepsJson), status: c.status })
      }
    }
    const camp = campaignCache.get(e.campaignId)!
    if (camp.status !== 'active' || camp.steps.length === 0) {
      // Campaign paused/archived since the enrollment was scheduled.
      // Pause the enrollment so we stop trying. Re-activating the
      // campaign will require operator action to resume.
      await prisma.dripEnrollment.update({
        where: { id: e.id },
        data: { status: 'paused', lastError: 'campaign is not active' },
      })
      summary.paused += 1
      continue
    }

    // Resolve contact + decrypt PII.
    const contactRow = await prisma.contact.findFirst({
      where: { id: e.contactId, organizationId: e.organizationId },
      select: { name: true, email: true, phone: true, company: true },
    })
    if (!contactRow) {
      // Contact deleted — cancel the enrollment.
      await prisma.dripEnrollment.update({
        where: { id: e.id },
        data: { status: 'cancelled', lastError: 'contact no longer exists' },
      })
      continue
    }
    const contact = {
      name: contactRow.name,
      email: decryptPii(contactRow.email) || null,
      phone: decryptPii(contactRow.phone) || null,
      company: contactRow.company,
    }

    // Resolve a default email account for this org (first one wins).
    if (!emailAccountCache.has(e.organizationId)) {
      const acc = await prisma.emailAccount.findFirst({
        where: { organizationId: e.organizationId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
      emailAccountCache.set(e.organizationId, acc?.id ?? null)
    }
    const emailAccountId = emailAccountCache.get(e.organizationId)!

    // Bundle CG — claim the row BEFORE sending so a concurrent cron
    // run (Vercel retry, region failover, or operator-triggered
    // workflow_dispatch overlapping the schedule) can't double-send.
    // updateMany returns count: 0 when the WHERE optimistic guard
    // doesn't match — meaning another runner already advanced this
    // row. We skip the send entirely in that case.
    const claim = await prisma.dripEnrollment.updateMany({
      where: { id: e.id, nextDueAt: e.nextDueAt, status: 'active' },
      data: { nextDueAt: null }, // null = "in flight"; gets restored below.
    })
    if (claim.count === 0) {
      logger.info('[drip] skipped — claimed by another runner', {
        enrollmentId: e.id,
      })
      continue
    }

    const result = await dispatchOne(prisma, e, camp.steps, contact, emailAccountId)
    if (result.ok) {
      const advance = advanceAfterDelivery(e.lastStepIndex, camp.steps, e.createdAt)
      await prisma.dripEnrollment.update({
        where: { id: e.id },
        data: {
          lastStepIndex: advance.nextStepIndex,
          nextDueAt: advance.nextDueAt,
          status: advance.done ? 'done' : 'active',
          lastDeliveredAt: now,
          lastError: null,
          // attemptCount tracks CONSECUTIVE FAILED sends — reset to 0
          // on success so a flaky third send can't be misread as
          // exhausted on the very next failure (Bundle CC audit fix).
          attemptCount: 0,
        },
      })
      summary.sent += 1
    } else {
      const newAttempts = e.attemptCount + 1
      const exhausted = newAttempts >= MAX_ATTEMPTS
      await prisma.dripEnrollment.update({
        where: { id: e.id },
        data: {
          attemptCount: newAttempts,
          lastError: result.error ?? 'unknown error',
          // Restore nextDueAt so the next cron run picks this up
          // again. If exhausted, pause the row (no more retries).
          // Bundle CG — paired with the optimistic-concurrency
          // claim above.
          ...(exhausted ? { status: 'paused', nextDueAt: null } : { nextDueAt: e.nextDueAt }),
        },
      })
      summary.failed += 1
      if (exhausted) summary.paused += 1
      logger.warn('[drip] step delivery failed', {
        enrollmentId: e.id,
        campaignId: e.campaignId,
        contactId: e.contactId,
        attempts: newAttempts,
        error: result.error,
        paused: exhausted,
      })
    }
  }

  logger.info('[drip] dispatch complete', summary as unknown as Record<string, unknown>)
  return NextResponse.json({ data: summary, ranAt: now.toISOString() })
}
