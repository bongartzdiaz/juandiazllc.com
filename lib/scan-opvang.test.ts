import { describe, it, expect } from 'vitest'
import {
  MAX_LEKKEN,
  SCAN_BRON,
  SCAN_CAMPAGNE,
  TOESTEMMING_TEKST,
  TOESTEMMING_WAARDE,
  bouwMetadata,
  leesLekken,
} from './scan-opvang'

/* ─────────────────────────────────────────────────────────────
   De zuivere helft van de scan-opvang.

   Dit bestand test wat er zonder Supabase te meten is: hoe het `lekken`-veld
   van het formulier wordt gelezen, en wat er precies in `metadata` belandt.
   De takken van de server action zelf staan in app/actions/scan-opvang.test.ts;
   die heeft een gemockte client nodig en meet iets anders.

   Waarom `leesLekken` een eigen poort verdient: het veld komt uit een hidden
   input en is dus invoer van buiten, niet een waarde die de component
   garandeert. De onderscheidende eis is dat "0" een echte uitslag is (nul
   lekken gevonden) en dat onzin `null` wordt — niet 0. Wie die twee door
   elkaar haalt, publiceert later een campagnesegment waarin iedere
   kapotte inzending als "nul lekken" meetelt.
   ───────────────────────────────────────────────────────────── */

describe('leesLekken', () => {
  it('leest een geldig aantal, nul inbegrepen', () => {
    expect(leesLekken('0')).toBe(0)
    expect(leesLekken('1')).toBe(1)
    expect(leesLekken('16')).toBe(16)
  })

  it('weigert alles wat geen geheel getal van hooguit twee cijfers is', () => {
    for (const waarde of ['', ' ', '-1', '1.5', '01e2', 'zes', '100', '999']) {
      expect(leesLekken(waarde), waarde).toBeNull()
    }
  })

  it('weigert een waarde die geen string is', () => {
    // FormData.get() geeft een File terug bij een bestandsveld, en null bij
    // een veld dat niet bestaat. Geen van beide mag als getal gelden.
    expect(leesLekken(null)).toBeNull()
    expect(leesLekken(undefined)).toBeNull()
    expect(leesLekken(3)).toBeNull()
  })

  it('accepteert de bovengrens en weigert wat erboven ligt', () => {
    expect(leesLekken(String(MAX_LEKKEN))).toBe(MAX_LEKKEN)
    expect(leesLekken(String(MAX_LEKKEN + 1))).toBeNull()
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
