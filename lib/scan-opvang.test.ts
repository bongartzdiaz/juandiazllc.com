import { describe, it, expect } from 'vitest'
import {
  SCAN_BRON,
  SCAN_CAMPAGNE,
  TOESTEMMING_TEKST,
  TOESTEMMING_WAARDE,
  bouwLeadBericht,
  bouwMetadata,
  leesAntwoorden,
} from './scan-opvang'
import { VRAGEN, scoor } from './lekkage-scan'

/* ─────────────────────────────────────────────────────────────
   De zuivere helft van de scan-opvang.

   Dit bestand test wat er zonder Supabase te meten is: hoe de meegestuurde
   antwoorden worden gelezen, wat het bericht aan Juan draagt, en wat er
   precies in `metadata` belandt. De takken van de server action zelf staan
   in app/actions/scan-opvang.test.ts, met een gemockte client.

   Waarom `leesAntwoorden` een eigen poort verdient: het veld komt uit een
   hidden input en is dus invoer van buiten, niet een waarde die de component
   garandeert. Sinds de gate (2026-09-20) rekent de server de uitslag zelf
   uit; een half of vervalst antwoordenobject moet `null` worden en geen
   uitslag met nul lekken opleveren.
   ───────────────────────────────────────────────────────────── */

describe('leesAntwoorden', () => {
  const alles = Object.fromEntries(VRAGEN.map((v) => [v.id, v.id.startsWith('B')]))

  it('leest een volledig antwoordenobject', () => {
    expect(leesAntwoorden(JSON.stringify(alles))).toEqual(alles)
  })

  it('weigert alles wat geen volledig object met booleans is', () => {
    const zonderEen: Record<string, boolean> = { ...alles }
    delete zonderEen[VRAGEN[0].id]
    for (const waarde of [
      '', ' ', 'null', '[]', '{}', '"A1"', '{"A1":true',
      JSON.stringify(zonderEen),
      JSON.stringify({ ...alles, A1: 'ja' }),
      JSON.stringify({ ...alles, A1: 1 }),
      JSON.stringify({ ...alles, Z9: true }),
      JSON.stringify(alles) + ' '.repeat(2000),
    ]) {
      expect(leesAntwoorden(waarde), waarde.slice(0, 40)).toBeNull()
    }
  })

  it('weigert een waarde die geen string is', () => {
    // FormData.get() geeft een File terug bij een bestandsveld, en null bij
    // een veld dat niet bestaat.
    expect(leesAntwoorden(null)).toBeNull()
    expect(leesAntwoorden(undefined)).toBeNull()
    expect(leesAntwoorden(alles)).toBeNull()
  })
})

describe('bouwLeadBericht', () => {
  it('noemt taal, aantal, en per lek naam, breuk en vraag-ids', () => {
    const lekken = scoor(Object.fromEntries(VRAGEN.map((v) => [v.id, false])))
    const b = bouwLeadBericht(lekken, 'de')
    expect(b).toMatch(/^Lekkage-scan \(de\): 3 lekken\./)
    for (const l of lekken) {
      expect(b).toContain(`${l.naam} — ${l.aantal}/${l.totaal}`)
      for (const v of l.vragen) expect(b).toContain(v.id)
    }
    expect(b.split('\n')).toHaveLength(4)
  })

  it('nul lekken is een zin, geen lege lijst', () => {
    expect(bouwLeadBericht([], 'nl')).toBe('Lekkage-scan (nl): nul lekken gevonden.')
  })

  it('geen bedrag en geen percentage — dat mag ook niet in een Telegram', () => {
    const lekken = scoor(Object.fromEntries(VRAGEN.map((v) => [v.id, false])))
    expect(bouwLeadBericht(lekken, 'nl')).not.toMatch(/€|%/)
  })
})

describe('bouwMetadata', () => {
  const nu = new Date('2026-09-14T12:00:00.000Z')
  const token = '11111111-2222-3333-4444-555555555555'

  it('draagt alles wat de campagne en het afmelden nodig hebben', () => {
    const m = bouwMetadata({ locale: 'nl', lekken: 3, nu, token })

    expect(m).toEqual({
      locale: 'nl',
      campagne: SCAN_CAMPAGNE,
      consent_at: '2026-09-14T12:00:00.000Z',
      consent_tekst: TOESTEMMING_TEKST,
      lekken: 3,
      unsub_token: token,
    })
  })

  it('bewaart de toestemmingstekst woordelijk, niet een verwijzing ernaar', () => {
    // De tekst op de pagina kan wijzigen; de rij mag dat niet meebewegen,
    // anders is achteraf niet vast te stellen waar iemand mee instemde.
    const m = bouwMetadata({ locale: 'nl', lekken: null, nu, token })
    expect(m.consent_tekst).toBe(TOESTEMMING_TEKST)
    expect(m.consent_tekst.length).toBeGreaterThan(20)
  })

  it('houdt een ontbrekende uitslag op null in plaats van nul', () => {
    expect(bouwMetadata({ locale: 'nl', lekken: null, nu, token }).lekken).toBeNull()
    expect(bouwMetadata({ locale: 'nl', lekken: 0, nu, token }).lekken).toBe(0)
  })
})

describe('de constanten die buiten deze repo gelezen worden', () => {
  it('SCAN_BRON is de waarde waarop de campagnes filteren', () => {
    // Deze string staat ook in docs/email-campagnes.md, in het SQL-segment.
    // lib/email-campagnes.test.ts legt die twee naast elkaar.
    expect(SCAN_BRON).toBe('lekkage-scan')
  })

  it('de campagnenaam draagt een jaar en een maand', () => {
    // Zonder datum in de naam belandt een adres uit de eerste reeks stil in
    // de tweede zodra die er komt.
    expect(SCAN_CAMPAGNE).toMatch(/^lekkage-scan-\d{4}-\d{2}$/)
  })

  it('de toestemmingswaarde is expliciet, niet de browserstandaard', () => {
    // Een checkbox zonder value stuurt "on"; dat leest in de actie als ruis.
    expect(TOESTEMMING_WAARDE).not.toBe('on')
    expect(TOESTEMMING_WAARDE.length).toBeGreaterThan(0)
  })

  it('de toestemmingstekst belooft een afmeldlink en een bovengrens', () => {
    // Beide horen er te staan: de bovengrens omdat de campagne er drie zijn,
    // de afmeldlink omdat Telecommunicatiewet 11.7 hem eist.
    expect(TOESTEMMING_TEKST).toMatch(/drie mails/)
    expect(TOESTEMMING_TEKST).toMatch(/afmeldlink/)
  })
})
