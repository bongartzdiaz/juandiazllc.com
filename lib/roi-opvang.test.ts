import { describe, it, expect } from 'vitest'
import {
  ROI_BRON,
  ROI_CAMPAGNE,
  ROI_VELDEN,
  TOESTEMMING_WAARDE,
  bouwRoiMetadata,
  leesGetal,
  leesGetallen,
  type RoiVeld,
} from './roi-opvang'

/* ─────────────────────────────────────────────────────────────
   De zuivere helft van de ROI-opvang — zelfde snit als scan-opvang.test.ts.

   Wat hier bewaakt wordt: de getallen komen uit hidden inputs en zijn dus
   invoer van buiten. De onderscheidende eis is dat een kapotte of te grote
   waarde `null` wordt en niet 0 — een mail die "€0 besparing" toont omdat
   iemand `abc` in het veld zette, is erger dan een mail die "—" toont.
   ───────────────────────────────────────────────────────────── */

describe('leesGetal', () => {
  it('leest gehele en decimale getallen, nul en negatief binnen de grens', () => {
    expect(leesGetal('consumption', '3500')).toBe(3500)
    expect(leesGetal('consumerPrice', '0.3')).toBe(0.3)
    expect(leesGetal('consumption', '0')).toBe(0)
    expect(leesGetal('feedInPrice', '-0.05')).toBe(-0.05)
    expect(leesGetal('withBattery', '1')).toBe(1)
  })

  it('maakt onzin, leeg en oneindig null — niet 0', () => {
    expect(leesGetal('consumption', 'abc')).toBeNull()
    expect(leesGetal('consumption', '')).toBeNull()
    expect(leesGetal('paybackSald', 'Infinity')).toBeNull()
    expect(leesGetal('paybackSald', 'NaN')).toBeNull()
    expect(leesGetal('consumption', undefined)).toBeNull()
    expect(leesGetal('consumption', 3500 as unknown)).toBeNull() // alleen tekst uit een formulier
  })

  it('weigert buiten de grens per veld', () => {
    expect(leesGetal('scNoBat', '1.5')).toBeNull()
    expect(leesGetal('withBattery', '2')).toBeNull()
    expect(leesGetal('consumption', '-1')).toBeNull()
    expect(leesGetal('systemPrice', String(ROI_VELDEN.systemPrice.max + 1))).toBeNull()
  })

  it('accepteert ook wetenschappelijke notatie niet', () => {
    // `String(1e21)` levert "1e+21"; dat past nooit in een grens en de regex
    // laat het niet eens tot Number() komen.
    expect(leesGetal('systemPrice', '1e+21')).toBeNull()
  })
})

describe('leesGetallen', () => {
  it('leest elk veld uit ROI_VELDEN en niets anders', () => {
    const fd = new FormData()
    fd.set('consumption', '3500')
    fd.set('paybackNoBat', '')
    fd.set('email', 'x@y.z')
    const g = leesGetallen(fd)
    expect(Object.keys(g).sort()).toEqual(Object.keys(ROI_VELDEN).sort())
    expect(g.consumption).toBe(3500)
    expect(g.paybackNoBat).toBeNull()
    expect(g.systemSize).toBeNull()
    expect('email' in g).toBe(false)
  })
})

describe('bouwRoiMetadata', () => {
  it('draagt taal, campagne, toestemming, getallen en token — en niets anders', () => {
    const roi = Object.fromEntries(
      (Object.keys(ROI_VELDEN) as RoiVeld[]).map((k) => [k, null]),
    ) as Record<RoiVeld, number | null>
    roi.consumption = 3500
    const nu = new Date('2026-09-20T12:00:00Z')
    const m = bouwRoiMetadata({ locale: 'de', consentTekst: 'Ja, …', roi, nu, token: 'tok' })
    expect(m).toEqual({
      locale: 'de',
      campagne: ROI_CAMPAGNE,
      consent_at: '2026-09-20T12:00:00.000Z',
      consent_tekst: 'Ja, …',
      roi,
      unsub_token: 'tok',
    })
  })
})

describe('constanten', () => {
  it('bron en toestemmingswaarde zijn wat het formulier en de cron verwachten', () => {
    expect(ROI_BRON).toBe('energy-roi')
    expect(TOESTEMMING_WAARDE).toBe('ja')
    expect(ROI_CAMPAGNE).toMatch(/^energy-roi-\d{4}-\d{2}$/)
  })
})
