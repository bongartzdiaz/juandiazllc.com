import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { CSRF_VRIJGESTELD, isCsrfVrijgesteld } from './csrf-vrijstelling'

/* ─────────────────────────────────────────────────────────────
   Een vrijstelling is een gat in de CSRF-verdediging. Deze poort bewaakt
   twee dingen die niemand bewaakte toen vijf van de negen regels naar
   routes wezen die niet meer bestonden:

     1. elke regel hoort bij een route die er werkelijk is
     2. de match is exact, niet op voorvoegsel
   ───────────────────────────────────────────────────────────── */

describe('CSRF-vrijstellingen', () => {
  it('vindt de lijst überhaupt', () => {
    // Zonder deze assertie zou een lege Set alles hieronder triviaal laten
    // slagen — een poort die niets bewaakt leest hetzelfde als een schone.
    expect(CSRF_VRIJGESTELD.size).toBeGreaterThanOrEqual(4)
  })

  it('elke vrijgestelde route bestaat ook echt', () => {
    // Vijf regels wezen naar routes die met #134/#138 vertrokken. Vier
    // daarvan waren naamruimtes (`/api/v1/`, `/api/auth/`), dus een nieuwe
    // route onder die naam zou vanaf dag één vrijgesteld zijn geweest
    // zonder dat iemand die keuze maakte.
    const ontbreekt = [...CSRF_VRIJGESTELD].filter(
      (pad) => !existsSync(`app${pad}/route.ts`),
    )
    expect(ontbreekt, 'vrijgesteld pad zonder route').toEqual([])
  })

  it('geen enkel pad eindigt op een schuine streep', () => {
    // Een afsluitende `/` verraadt dat iemand een naamruimte bedoelde. De
    // matcher doet dat niet meer, dus zo'n regel zou stil niets vrijstellen
    // en de bedoeling van de schrijver verliezen.
    expect([...CSRF_VRIJGESTELD].filter((p) => p.endsWith('/'))).toEqual([])
  })

  it('matcht exact en niet op voorvoegsel', () => {
    expect(isCsrfVrijgesteld('/api/cal')).toBe(true)
    expect(isCsrfVrijgesteld('/api/calculator')).toBe(false)
    expect(isCsrfVrijgesteld('/api/cal/extra')).toBe(false)
    expect(isCsrfVrijgesteld('/api/ca')).toBe(false)
  })

  it('de ingetrokken naamruimtes komen er niet meer door', () => {
    for (const pad of [
      '/api/auth/callback',
      '/api/v1/contacts',
      '/api/sms/webhook',
      '/api/webhooks/inbound/twilio',
      '/api/health',
    ]) {
      expect(isCsrfVrijgesteld(pad), pad).toBe(false)
    }
  })
})
