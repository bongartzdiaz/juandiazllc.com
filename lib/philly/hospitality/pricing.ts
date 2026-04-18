/* ---------------------------------------------------------------
   Hospitality dynamic pricing engine
   - Adjusts base room rate based on:
     • Occupancy (high → +%, low → -%)
     • Lead time (last-minute bumps down, advance planners up)
     • Seasonality (weekend / month-of-year)
     • Day of week (Fri/Sat surcharge, weekday discount)
   - Returns per-night price with detailed breakdown.
   --------------------------------------------------------------- */

export interface PriceInput {
  basePriceCents: number
  checkIn: Date
  checkOut: Date
  occupancy: number   // 0..1 — share of rooms currently booked for the span
  leadTimeDays: number
}

export interface PriceAdjustment {
  factor: string
  pct: number
  reason: string
}

export interface PriceResult {
  totalCents: number
  nightlyCents: number
  nights: number
  basePriceCents: number
  adjustments: PriceAdjustment[]
}

const HIGH_SEASON_MONTHS = [5, 6, 7, 8] // Jun–Sep (0-indexed)
const SHOULDER_MONTHS = [3, 4, 9] // Apr, May, Oct

function dayAdjustment(date: Date): PriceAdjustment | null {
  const dow = date.getDay() // 0=Sun
  if (dow === 5 || dow === 6) return { factor: 'weekend', pct: 0.15, reason: 'Weekend premium (+15%)' }
  if (dow === 0) return { factor: 'sunday', pct: -0.05, reason: 'Sunday discount (−5%)' }
  if (dow >= 1 && dow <= 3) return { factor: 'weekday', pct: -0.08, reason: 'Mon–Wed discount (−8%)' }
  return null
}

function seasonAdjustment(date: Date): PriceAdjustment | null {
  const m = date.getMonth()
  if (HIGH_SEASON_MONTHS.includes(m)) return { factor: 'season', pct: 0.20, reason: 'High season (+20%)' }
  if (SHOULDER_MONTHS.includes(m)) return { factor: 'season', pct: 0.05, reason: 'Shoulder season (+5%)' }
  return { factor: 'season', pct: -0.05, reason: 'Low season (−5%)' }
}

function occupancyAdjustment(occ: number): PriceAdjustment | null {
  if (occ >= 0.9) return { factor: 'occupancy', pct: 0.25, reason: 'Near sold out (+25%)' }
  if (occ >= 0.75) return { factor: 'occupancy', pct: 0.15, reason: 'High demand (+15%)' }
  if (occ >= 0.5) return { factor: 'occupancy', pct: 0.05, reason: 'Moderate demand (+5%)' }
  if (occ <= 0.25) return { factor: 'occupancy', pct: -0.10, reason: 'Low demand (−10%)' }
  return null
}

function leadTimeAdjustment(days: number): PriceAdjustment | null {
  if (days <= 1) return { factor: 'leadtime', pct: -0.10, reason: 'Same-day/next-day discount (−10%)' }
  if (days <= 3) return { factor: 'leadtime', pct: -0.05, reason: 'Last-minute (−5%)' }
  if (days >= 60) return { factor: 'leadtime', pct: 0.05, reason: 'Early booker (+5%)' }
  return null
}

function nightsBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
}

/** Compute a single-night price (applies adjustments for that specific night's day-of-week + season). */
function singleNight(
  base: number,
  date: Date,
  occupancy: number,
  leadTimeDays: number,
): { cents: number; adjustments: PriceAdjustment[] } {
  const adjustments: PriceAdjustment[] = []
  const factors = [
    dayAdjustment(date),
    seasonAdjustment(date),
    occupancyAdjustment(occupancy),
    leadTimeAdjustment(leadTimeDays),
  ].filter((x): x is PriceAdjustment => !!x)

  let total = base
  for (const f of factors) {
    total = Math.round(total * (1 + f.pct))
    adjustments.push(f)
  }
  return { cents: total, adjustments }
}

export function computeStayPrice(input: PriceInput): PriceResult {
  const nights = nightsBetween(input.checkIn, input.checkOut)

  let total = 0
  const summary = new Map<string, PriceAdjustment>()

  for (let i = 0; i < nights; i++) {
    const night = new Date(input.checkIn.getTime() + i * 24 * 60 * 60 * 1000)
    const { cents, adjustments } = singleNight(input.basePriceCents, night, input.occupancy, input.leadTimeDays)
    total += cents
    for (const a of adjustments) summary.set(a.factor, a)
  }

  return {
    totalCents: total,
    nightlyCents: Math.round(total / nights),
    nights,
    basePriceCents: input.basePriceCents,
    adjustments: Array.from(summary.values()),
  }
}
