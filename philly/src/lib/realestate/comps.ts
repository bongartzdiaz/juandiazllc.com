/* ---------------------------------------------------------------
   Property comparables + automated valuation
   - Find similar properties in same city & property type
   - Score similarity by (bedrooms, bathrooms, sqft proximity)
   - Return weighted avg $/sqft → suggested price for subject property
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/auth'

export interface CompResult {
  id: string
  title: string
  address: string
  city: string
  priceCents: number
  sqft: number | null
  bedrooms: number | null
  bathrooms: number | null
  pricePerSqftCents: number | null
  similarity: number
  status: string
}

export interface ValuationReport {
  subjectId: string
  subject: {
    title: string
    city: string
    sqft: number | null
    bedrooms: number | null
    bathrooms: number | null
    priceCents: number
  }
  compCount: number
  avgPricePerSqftCents: number | null
  weightedAvgPricePerSqftCents: number | null
  suggestedPriceCents: number | null
  confidence: 'high' | 'medium' | 'low'
  comparables: CompResult[]
}

function similarity(subject: { bedrooms: number | null; bathrooms: number | null; sqft: number | null }, other: { bedrooms: number | null; bathrooms: number | null; sqft: number | null }): number {
  let score = 1
  if (subject.bedrooms != null && other.bedrooms != null) {
    const diff = Math.abs(subject.bedrooms - other.bedrooms)
    score *= Math.max(0, 1 - diff * 0.15)
  }
  if (subject.bathrooms != null && other.bathrooms != null) {
    const diff = Math.abs(subject.bathrooms - other.bathrooms)
    score *= Math.max(0, 1 - diff * 0.15)
  }
  if (subject.sqft != null && other.sqft != null && subject.sqft > 0) {
    const diff = Math.abs(subject.sqft - other.sqft) / subject.sqft
    score *= Math.max(0, 1 - diff)
  }
  return Number(score.toFixed(3))
}

export async function valuateProperty(organizationId: string, subjectId: string): Promise<ValuationReport | null> {
  const prisma = getAuthPrisma()
  const subject = await prisma.property.findFirst({
    where: { id: subjectId, organizationId },
  })
  if (!subject) return null

  // Grab candidates: same city + type, not this property, sold/available recently
  const candidates = await prisma.property.findMany({
    where: {
      organizationId,
      id: { not: subjectId },
      type: subject.type,
      city: subject.city,
      priceCents: { gt: 0 },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  const ranked: CompResult[] = candidates.map(c => ({
    id: c.id,
    title: c.title,
    address: c.address,
    city: c.city,
    priceCents: c.priceCents,
    sqft: c.sqft,
    bedrooms: c.bedrooms,
    bathrooms: c.bathrooms,
    pricePerSqftCents: c.sqft && c.sqft > 0 ? Math.round(c.priceCents / c.sqft) : null,
    similarity: similarity(
      { bedrooms: subject.bedrooms, bathrooms: subject.bathrooms, sqft: subject.sqft },
      { bedrooms: c.bedrooms, bathrooms: c.bathrooms, sqft: c.sqft },
    ),
    status: c.status,
  })).sort((a, b) => b.similarity - a.similarity).slice(0, 10)

  const compsWithPpsqft = ranked.filter(c => c.pricePerSqftCents != null)

  let avgPricePerSqftCents: number | null = null
  let weightedAvgPricePerSqftCents: number | null = null

  if (compsWithPpsqft.length > 0) {
    avgPricePerSqftCents = Math.round(
      compsWithPpsqft.reduce((sum, c) => sum + (c.pricePerSqftCents ?? 0), 0) / compsWithPpsqft.length,
    )
    const totalWeight = compsWithPpsqft.reduce((sum, c) => sum + c.similarity, 0)
    if (totalWeight > 0) {
      weightedAvgPricePerSqftCents = Math.round(
        compsWithPpsqft.reduce((sum, c) => sum + (c.pricePerSqftCents ?? 0) * c.similarity, 0) / totalWeight,
      )
    }
  }

  let suggestedPriceCents: number | null = null
  if (subject.sqft && weightedAvgPricePerSqftCents) {
    suggestedPriceCents = subject.sqft * weightedAvgPricePerSqftCents
  }

  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (compsWithPpsqft.length >= 6) confidence = 'high'
  else if (compsWithPpsqft.length >= 3) confidence = 'medium'

  return {
    subjectId,
    subject: {
      title: subject.title,
      city: subject.city,
      sqft: subject.sqft,
      bedrooms: subject.bedrooms,
      bathrooms: subject.bathrooms,
      priceCents: subject.priceCents,
    },
    compCount: ranked.length,
    avgPricePerSqftCents,
    weightedAvgPricePerSqftCents,
    suggestedPriceCents,
    confidence,
    comparables: ranked,
  }
}
