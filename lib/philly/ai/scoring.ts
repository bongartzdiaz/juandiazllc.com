/* ---------------------------------------------------------------
   Predictive lead scoring — deterministic heuristics.

   Scores each contact 0-100 based on:
     • recency of interaction (last 7/30/90 days)
     • engagement volume (activities, notes, calls)
     • buyer readiness (pre-approved, price range set, areas set)
     • contact completeness (email + phone)
     • showings attended / feedback given
     • deal pipeline position

   Also returns a 5-tier classification and top 3 signal explanations.
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/philly/auth'

export type LeadTier = 'hot' | 'warm' | 'nurture' | 'cold' | 'dormant'

export interface LeadSignal {
  label: string
  points: number
  positive: boolean
}

export interface LeadScore {
  contactId: string
  contactName: string
  score: number          // 0-100
  tier: LeadTier
  signals: LeadSignal[]  // sorted by magnitude
  reasons: string[]      // top 3 human-readable
}

export interface ScoreReport {
  generatedAt: string
  total: number
  distribution: Record<LeadTier, number>
  scores: LeadScore[]
}

const DAY = 24 * 60 * 60 * 1000

function tierFor(score: number): LeadTier {
  if (score >= 80) return 'hot'
  if (score >= 60) return 'warm'
  if (score >= 40) return 'nurture'
  if (score >= 20) return 'cold'
  return 'dormant'
}

/** Score a single contact using pre-gathered counters. */
function scoreContact(input: {
  contactId: string
  name: string
  email: string
  phone: string
  type: string
  preApproved: boolean
  preApprovalAmt: number
  buyerPriceMin: number | null
  buyerPriceMax: number | null
  buyerAreas: string
  leadStatus: string
  lastContactedAt: Date | null
  createdAt: Date
  activities7d: number
  activities30d: number
  activities90d: number
  notes: number
  showingsAttended: number
  showingsMissed: number
  showingsWithFeedback: number
  openDeals: number
  wonDeals: number
}): LeadScore {
  const signals: LeadSignal[] = []

  /* === Recency === */
  if (input.lastContactedAt) {
    const daysSince = (Date.now() - input.lastContactedAt.getTime()) / DAY
    if (daysSince <= 3) signals.push({ label: 'Contacted in last 3 days', points: 18, positive: true })
    else if (daysSince <= 7) signals.push({ label: 'Contacted this week', points: 12, positive: true })
    else if (daysSince <= 30) signals.push({ label: 'Contacted this month', points: 6, positive: true })
    else if (daysSince <= 90) signals.push({ label: 'Contacted in last 90 days', points: 2, positive: true })
    else signals.push({ label: `Stale: not contacted in ${Math.floor(daysSince)} days`, points: -10, positive: false })
  } else {
    signals.push({ label: 'Never contacted', points: -8, positive: false })
  }

  /* === Engagement volume === */
  if (input.activities7d >= 3) {
    signals.push({ label: `${input.activities7d} activities this week`, points: 15, positive: true })
  } else if (input.activities7d >= 1) {
    signals.push({ label: `${input.activities7d} activity this week`, points: 8, positive: true })
  }
  if (input.activities30d >= 10) {
    signals.push({ label: `${input.activities30d} activities this month`, points: 10, positive: true })
  }
  if (input.notes >= 5) {
    signals.push({ label: `${input.notes} notes on file`, points: 6, positive: true })
  }

  /* === Buyer readiness (RE) === */
  if (input.preApproved) {
    signals.push({ label: 'Pre-approved for mortgage', points: 20, positive: true })
  }
  if (input.buyerPriceMin && input.buyerPriceMax) {
    signals.push({ label: 'Defined price range', points: 8, positive: true })
  }
  if (input.buyerAreas && input.buyerAreas.trim().length > 0) {
    signals.push({ label: 'Target areas specified', points: 5, positive: true })
  }

  /* === Contact completeness === */
  if (input.email && input.phone) {
    signals.push({ label: 'Full contact details', points: 4, positive: true })
  } else if (!input.email && !input.phone) {
    signals.push({ label: 'No contact details', points: -12, positive: false })
  } else if (!input.email) {
    signals.push({ label: 'Missing email', points: -4, positive: false })
  } else if (!input.phone) {
    signals.push({ label: 'Missing phone', points: -3, positive: false })
  }

  /* === Showings === */
  if (input.showingsAttended >= 3) {
    signals.push({ label: `Attended ${input.showingsAttended} showings`, points: 14, positive: true })
  } else if (input.showingsAttended >= 1) {
    signals.push({ label: `Attended ${input.showingsAttended} showing`, points: 8, positive: true })
  }
  if (input.showingsWithFeedback >= 1) {
    signals.push({ label: 'Provided showing feedback', points: 6, positive: true })
  }
  if (input.showingsMissed >= 2) {
    signals.push({ label: `${input.showingsMissed} no-shows`, points: -10, positive: false })
  }

  /* === Deal pipeline === */
  if (input.openDeals >= 1) {
    signals.push({ label: `${input.openDeals} open deal(s)`, points: 15, positive: true })
  }
  if (input.wonDeals >= 1) {
    signals.push({ label: `${input.wonDeals} won deal(s) — loyal client`, points: 10, positive: true })
  }

  /* === Lead status === */
  if (input.leadStatus === 'hot') {
    signals.push({ label: 'Marked as hot lead', points: 12, positive: true })
  } else if (input.leadStatus === 'qualified') {
    signals.push({ label: 'Qualified lead', points: 8, positive: true })
  } else if (input.leadStatus === 'lost') {
    signals.push({ label: 'Marked as lost', points: -20, positive: false })
  }

  /* Sum points, clamp 0-100 */
  const raw = signals.reduce((sum, s) => sum + s.points, 0)
  const score = Math.max(0, Math.min(100, Math.round(50 + raw))) // baseline 50

  /* Sort signals by absolute magnitude */
  signals.sort((a, b) => Math.abs(b.points) - Math.abs(a.points))

  const reasons = signals.slice(0, 3).map(s => s.label)

  return {
    contactId: input.contactId,
    contactName: input.name,
    score,
    tier: tierFor(score),
    signals,
    reasons,
  }
}

/** Generate scores for an entire organization. Capped at 500 most recent contacts. */
export async function generateLeadScores(organizationId: string, limit = 500): Promise<ScoreReport> {
  const prisma = getAuthPrisma()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY)

  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true, name: true, email: true, phone: true, type: true,
      preApproved: true, preApprovalAmt: true,
      buyerPriceMin: true, buyerPriceMax: true, buyerAreas: true,
      leadStatus: true, lastContactedAt: true, createdAt: true,
    },
  })

  if (contacts.length === 0) {
    return {
      generatedAt: now.toISOString(),
      total: 0,
      distribution: { hot: 0, warm: 0, nurture: 0, cold: 0, dormant: 0 },
      scores: [],
    }
  }

  const contactIds = contacts.map((c: any) => c.id)

  /* Batch-fetch engagement signals */
  const [activities7d, activities30d, activities90d, notes, showings, deals] = await Promise.all([
    // org-scope-lint-ok: contactIds derived from the org-scoped contact.findMany above
    prisma.activity.groupBy({
      by: ['contactId'],
      where: { contactId: { in: contactIds }, createdAt: { gte: sevenDaysAgo } },
      _count: true,
    }).catch(() => [] as Array<{ contactId: string | null; _count: number }>),
    // org-scope-lint-ok: contactIds derived from the org-scoped contact.findMany above
    prisma.activity.groupBy({
      by: ['contactId'],
      where: { contactId: { in: contactIds }, createdAt: { gte: thirtyDaysAgo } },
      _count: true,
    }).catch(() => [] as Array<{ contactId: string | null; _count: number }>),
    // org-scope-lint-ok: contactIds derived from the org-scoped contact.findMany above
    prisma.activity.groupBy({
      by: ['contactId'],
      where: { contactId: { in: contactIds }, createdAt: { gte: ninetyDaysAgo } },
      _count: true,
    }).catch(() => [] as Array<{ contactId: string | null; _count: number }>),
    prisma.contactNote.groupBy({
      by: ['contactId'],
      where: { contactId: { in: contactIds } },
      _count: true,
    }).catch(() => [] as Array<{ contactId: string; _count: number }>),
    prisma.showing.findMany({
      where: { contactId: { in: contactIds } },
      select: { contactId: true, status: true, feedback: true },
    }).catch(() => [] as Array<{ contactId: string | null; status: string; feedback: string }>),
    prisma.deal.findMany({
      where: { contactId: { in: contactIds } },
      select: { contactId: true, status: true },
    }).catch(() => [] as Array<{ contactId: string | null; status: string }>),
  ])

  const a7 = new Map<string, number>(activities7d.map((x: { contactId: string | null; _count: number }) => [x.contactId ?? '', (x as { _count: number })._count]))
  const a30 = new Map<string, number>(activities30d.map((x: { contactId: string | null; _count: number }) => [x.contactId ?? '', (x as { _count: number })._count]))
  const a90 = new Map<string, number>(activities90d.map((x: { contactId: string | null; _count: number }) => [x.contactId ?? '', (x as { _count: number })._count]))
  const n = new Map<string, number>(notes.map((x: { contactId: string; _count: number }) => [x.contactId, (x as { _count: number })._count]))

  const showingsByContact = new Map<string, { attended: number; missed: number; withFeedback: number }>()
  for (const s of showings) {
    if (!s.contactId) continue
    const rec = showingsByContact.get(s.contactId) ?? { attended: 0, missed: 0, withFeedback: 0 }
    if (s.status === 'completed') rec.attended++
    if (s.status === 'no_show') rec.missed++
    if (s.feedback && s.feedback.length > 0) rec.withFeedback++
    showingsByContact.set(s.contactId, rec)
  }

  const dealsByContact = new Map<string, { open: number; won: number }>()
  for (const d of deals) {
    if (!d.contactId) continue
    const rec = dealsByContact.get(d.contactId) ?? { open: 0, won: 0 }
    if (d.status === 'open') rec.open++
    if (d.status === 'won') rec.won++
    dealsByContact.set(d.contactId, rec)
  }

  const scores: LeadScore[] = contacts.map((c: any) => {
    const showingStats = showingsByContact.get(c.id) ?? { attended: 0, missed: 0, withFeedback: 0 }
    const dealStats = dealsByContact.get(c.id) ?? { open: 0, won: 0 }
    return scoreContact({
      contactId: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      type: c.type,
      preApproved: c.preApproved,
      preApprovalAmt: c.preApprovalAmt,
      buyerPriceMin: c.buyerPriceMin,
      buyerPriceMax: c.buyerPriceMax,
      buyerAreas: c.buyerAreas,
      leadStatus: c.leadStatus,
      lastContactedAt: c.lastContactedAt,
      createdAt: c.createdAt,
      activities7d: a7.get(c.id) ?? 0,
      activities30d: a30.get(c.id) ?? 0,
      activities90d: a90.get(c.id) ?? 0,
      notes: n.get(c.id) ?? 0,
      showingsAttended: showingStats.attended,
      showingsMissed: showingStats.missed,
      showingsWithFeedback: showingStats.withFeedback,
      openDeals: dealStats.open,
      wonDeals: dealStats.won,
    })
  })

  /* Sort by score desc */
  scores.sort((a, b) => b.score - a.score)

  const distribution: Record<LeadTier, number> = { hot: 0, warm: 0, nurture: 0, cold: 0, dormant: 0 }
  for (const s of scores) distribution[s.tier]++

  return {
    generatedAt: now.toISOString(),
    total: scores.length,
    distribution,
    scores,
  }
}
