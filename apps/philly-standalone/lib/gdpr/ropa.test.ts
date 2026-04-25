import { describe, it, expect } from 'vitest'
import { PROCESSING_ACTIVITIES, findActivity } from './ropa'

describe('PROCESSING_ACTIVITIES (RoPA)', () => {
  it('every activity has a unique id', () => {
    const ids = PROCESSING_ACTIVITIES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every activity declares at least one data subject and one data category', () => {
    for (const a of PROCESSING_ACTIVITIES) {
      expect(a.dataSubjects.length, a.id).toBeGreaterThan(0)
      expect(a.dataCategories.length, a.id).toBeGreaterThan(0)
    }
  })

  it('every activity declares at least one security measure', () => {
    for (const a of PROCESSING_ACTIVITIES) {
      expect(a.securityMeasures.length, a.id).toBeGreaterThan(0)
    }
  })

  it('every third-country transfer declares a recognised safeguard', () => {
    const allowed = new Set(['adequacy', 'scc', 'bcr', 'derogation'])
    for (const a of PROCESSING_ACTIVITIES) {
      for (const t of a.thirdCountryTransfers) {
        expect(allowed.has(t.safeguard), `${a.id} → ${t.country}: ${t.safeguard}`).toBe(true)
      }
    }
  })

  it('findActivity returns the activity by id, undefined for unknown', () => {
    expect(findActivity('operator_authentication')?.id).toBe('operator_authentication')
    expect(findActivity('does_not_exist')).toBeUndefined()
  })

  it('every consent-based activity has a stable id usable in GdprConsentRecord.purpose', () => {
    for (const a of PROCESSING_ACTIVITIES) {
      if (a.lawfulBasis !== 'consent') continue
      // GdprConsentRecord.purpose is VARCHAR(191) — keep ids well below.
      expect(a.id.length).toBeLessThanOrEqual(64)
      expect(a.id).toMatch(/^[a-z][a-z0-9_]*$/)
    }
  })
})
