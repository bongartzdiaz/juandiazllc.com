/* ---------------------------------------------------------------
   Donor RFM (Recency / Frequency / Monetary) scoring engine
   - Derives RFM from Activity rows where type contains 'donation'
   - Scores each dimension 1-5, combined 3-15
   - Segment labels:
     13-15 = "Champions" | 10-12 = "Loyal" | 7-9 = "Potential"
     4-6   = "At Risk"   | 3     = "Lost"
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/philly/auth'

export type RfmSegment = 'champions' | 'loyal' | 'potential' | 'at_risk' | 'lost'

export interface DonorScore {
  contactId: string
  contactName: string
  recency: number
  frequency: number
  monetary: number
  totalScore: number
  lastDonation: Date | null
  totalDonations: number
  totalAmountCents: number
  segment: RfmSegment
}

export interface DonorScoreReport {
  organizationId: string
  generatedAt: string
  count: number
  segments: Record<RfmSegment, number>
  donors: DonorScore[]
}

function quintile(value: number, sortedDesc: number[]): number {
  if (sortedDesc.length === 0) return 1
  const idx = sortedDesc.indexOf(value)
  const pct = idx / sortedDesc.length
  if (pct < 0.2) return 5
  if (pct < 0.4) return 4
  if (pct < 0.6) return 3
  if (pct < 0.8) return 2
  return 1
}

function quintileRecency(days: number, sortedAsc: number[]): number {
  // Fewer days = more recent = higher score
  if (sortedAsc.length === 0) return 1
  const idx = sortedAsc.indexOf(days)
  const pct = idx / sortedAsc.length
  if (pct < 0.2) return 5
  if (pct < 0.4) return 4
  if (pct < 0.6) return 3
  if (pct < 0.8) return 2
  return 1
}

function segmentFor(score: number): RfmSegment {
  if (score >= 13) return 'champions'
  if (score >= 10) return 'loyal'
  if (score >= 7) return 'potential'
  if (score >= 4) return 'at_risk'
  return 'lost'
}

interface DonationAgg {
  contactId: string
  contactName: string
  totalAmountCents: number
  donationCount: number
  lastDonationAt: Date
}

export async function generateDonorScores(organizationId: string): Promise<DonorScoreReport> {
  const prisma = getAuthPrisma()

  // Activity model tracks { organizationId, contactId, type, amount?, createdAt }
  // We look at any activity with type matching /donation|gift|grant_receipt/i
  const activities = await prisma.activity.findMany({
    where: {
      organizationId,
      type: { in: ['donation', 'gift', 'recurring_donation', 'pledge_payment'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { contactId: true, type: true, metadata: true, createdAt: true },
  }).catch(() => [] as Array<{ contactId: string | null; type: string; metadata: string; createdAt: Date }>)

  const byContact = new Map<string, DonationAgg>()
  for (const a of activities) {
    if (!a.contactId) continue
    const existing = byContact.get(a.contactId)
    let amt = 0
    try {
      const m = JSON.parse(a.metadata || '{}') as { amountCents?: number; amount?: number }
      amt = m.amountCents ?? (m.amount ? Math.round(m.amount * 100) : 0)
    } catch {}
    if (!existing) {
      byContact.set(a.contactId, {
        contactId: a.contactId,
        contactName: '',
        totalAmountCents: amt,
        donationCount: 1,
        lastDonationAt: a.createdAt,
      })
    } else {
      existing.totalAmountCents += amt
      existing.donationCount += 1
      if (a.createdAt > existing.lastDonationAt) existing.lastDonationAt = a.createdAt
    }
  }

  const ids = Array.from(byContact.keys())
  if (ids.length === 0) {
    return {
      organizationId,
      generatedAt: new Date().toISOString(),
      count: 0,
      segments: { champions: 0, loyal: 0, potential: 0, at_risk: 0, lost: 0 },
      donors: [],
    }
  }

  const contacts = await prisma.contact.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  })
  const nameMap = new Map<string, string | null>(contacts.map((c: { id: string; name: string | null }) => [c.id, c.name]))

  // Build sorted arrays for quintile calculation
  const now = Date.now()
  const enriched: (DonationAgg & { daysSince: number })[] = []
  for (const agg of byContact.values()) {
    agg.contactName = nameMap.get(agg.contactId) ?? '(unknown)'
    const daysSince = Math.floor((now - agg.lastDonationAt.getTime()) / (1000 * 60 * 60 * 24))
    enriched.push({ ...agg, daysSince })
  }

  const daysAsc = [...enriched].map(e => e.daysSince).sort((a, b) => a - b)
  const freqsDesc = [...enriched].map(e => e.donationCount).sort((a, b) => b - a)
  const monDesc = [...enriched].map(e => e.totalAmountCents).sort((a, b) => b - a)

  const donors: DonorScore[] = enriched.map(e => {
    const r = quintileRecency(e.daysSince, daysAsc)
    const f = quintile(e.donationCount, freqsDesc)
    const m = quintile(e.totalAmountCents, monDesc)
    const total = r + f + m
    return {
      contactId: e.contactId,
      contactName: e.contactName,
      recency: r,
      frequency: f,
      monetary: m,
      totalScore: total,
      lastDonation: e.lastDonationAt,
      totalDonations: e.donationCount,
      totalAmountCents: e.totalAmountCents,
      segment: segmentFor(total),
    }
  })

  donors.sort((a, b) => b.totalScore - a.totalScore)

  const segments: Record<RfmSegment, number> = {
    champions: 0, loyal: 0, potential: 0, at_risk: 0, lost: 0,
  }
  for (const d of donors) segments[d.segment]++

  return {
    organizationId,
    generatedAt: new Date().toISOString(),
    count: donors.length,
    segments,
    donors,
  }
}
