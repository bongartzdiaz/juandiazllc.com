import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VRAGEN, scoor } from '@/lib/lekkage-scan'
import { SCAN_BRON, TOESTEMMING_WAARDE } from '@/lib/scan-opvang'
import { TOESTEMMING_TEKSTEN } from '@/lib/lekkage-scan-taal'
import { DICT } from '@/lib/i18n/dict'

/* ─────────────────────────────────────────────────────────────
   De gate van de lekkage-scan (2026-09-20, avond).

   Wat hier vaststaat: de lead komt in `leads` met de uitslag als bericht,
   uitgerekend uit de meegestuurde antwoorden; `subscribers` krijgt alleen
   een rij met het losse vinkje; een dubbel adres in de reeks is geen fout;
   een kapotte reeks laat de lead staan en toont de uitslag toch; en zonder
   naam, bedrijf, adres of volledige antwoorden bereikt niets de database.
   ───────────────────────────────────────────────────────────── */

type Rij = { tabel: string; waarden: Record<string, unknown> }
const stuur = vi.hoisted(() => ({
  gooit: false,
  fout: {} as Record<string, { code: string; message: string } | undefined>,
  rijen: [] as { tabel: string; waarden: Record<string, unknown> }[],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    if (stuur.gooit) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.')
    return {
      from: (tabel: string) => ({
        insert: async (waarden: Record<string, unknown>) => {
          stuur.rijen.push({ tabel, waarden })
          return { data: null, error: stuur.fout[tabel] ?? null }
        },
      }),
    }
  },
}))

const { vraagUitslagAan } = await import('./scan-opvang')

const ALLES_NEE = Object.fromEntries(VRAGEN.map((v) => [v.id, false]))
const IDLE = { status: 'idle' as const }

function formulier(extra: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('locale', 'en')
  fd.set('name', 'Poort Tester')
  fd.set('company', 'Voorbeeld BV')
  fd.set('email', 'poort@voorbeeld.example')
  fd.set('antwoorden', JSON.stringify(ALLES_NEE))
  for (const [k, v] of Object.entries(extra)) fd.set(k, v)
  return fd
}

const rijen = (tabel: string): Rij[] => stuur.rijen.filter((r) => r.tabel === tabel)

beforeEach(() => {
  stuur.gooit = false
  stuur.fout = {}
  stuur.rijen = []
})

describe('de lead', () => {
  it('komt in leads met de uitslag als bericht en de antwoorden in metadata', async () => {
    const uit = await vraagUitslagAan(IDLE, formulier())
    expect(uit).toEqual({ status: 'ok', reeks: false })
    const [lead] = rijen('leads')
    expect(lead.waarden).toMatchObject({
      name: 'Poort Tester',
      company: 'Voorbeeld BV',
      email: 'poort@voorbeeld.example',
      source: SCAN_BRON,
    })
    const verwacht = scoor(ALLES_NEE)
    expect(lead.waarden.message).toContain(`${verwacht.length} lekken`)
    expect(lead.waarden.message).toContain('(en)')
    for (const l of verwacht) expect(lead.waarden.message).toContain(l.naam)
    expect(lead.waarden.metadata).toMatchObject({
      locale: 'en',
      tool: SCAN_BRON,
      lekken: verwacht.length,
      antwoorden: ALLES_NEE,
    })
    expect(rijen('subscribers')).toHaveLength(0)
  })

  it('rekent de uitslag zelf uit — een meegestuurd getal telt niet', async () => {
    const allesJa = Object.fromEntries(VRAGEN.map((v) => [v.id, true]))
    await vraagUitslagAan(IDLE, formulier({ antwoorden: JSON.stringify(allesJa), lekken: '3' }))
    const [lead] = rijen('leads')
    expect((lead.waarden.metadata as { lekken: number }).lekken).toBe(scoor(allesJa).length)
  })

  it.each([
    ['name', 'form.err.name'],
    ['company', 'form.err.company'],
    ['email', 'form.err.email'],
  ] as const)('zonder %s bereikt niets de database', async (veld, sleutel) => {
    const uit = await vraagUitslagAan(IDLE, formulier({ [veld]: '' }))
    expect(uit.status).toBe('err')
    expect(uit.message).toBe(DICT.en[sleutel])
    expect(stuur.rijen).toHaveLength(0)
  })

  it('zonder volledige antwoorden bereikt niets de database', async () => {
    for (const kapot of ['', 'null', '[]', '{"A1":true}', JSON.stringify({ ...ALLES_NEE, A1: 'ja' })]) {
      const uit = await vraagUitslagAan(IDLE, formulier({ antwoorden: kapot }))
      expect(uit.status, kapot).toBe('err')
    }
    expect(stuur.rijen).toHaveLength(0)
  })

  it('honeypot: doet alsof, schrijft niets', async () => {
    const uit = await vraagUitslagAan(IDLE, formulier({ website: 'http://bot' }))
    expect(uit).toEqual({ status: 'ok', reeks: false })
    expect(stuur.rijen).toHaveLength(0)
  })

  it('een database-fout op de lead is een fout — geen uitslag, geen reeks', async () => {
    stuur.fout.leads = { code: 'XX000', message: 'geweigerd' }
    const uit = await vraagUitslagAan(IDLE, formulier({ toestemming: TOESTEMMING_WAARDE }))
    expect(uit.status).toBe('err')
    expect(uit.message).toBe(DICT.en['form.err.generic'])
    expect(rijen('subscribers')).toHaveLength(0)
  })

  it('een gooiende createClient geeft de configuratiemelding', async () => {
    stuur.gooit = true
    const uit = await vraagUitslagAan(IDLE, formulier())
    expect(uit).toEqual({ status: 'err', message: DICT.en['form.err.unavailable'] })
  })
})

describe('de reeks, alleen met het vinkje', () => {
  it('met vinkje: ook een subscribers-rij, met de toestemmingstekst van de taal', async () => {
    const uit = await vraagUitslagAan(IDLE, formulier({ locale: 'de', toestemming: TOESTEMMING_WAARDE }))
    expect(uit).toMatchObject({ status: 'ok', reeks: true, message: DICT.de['form.ok.scan'] })
    const [sub] = rijen('subscribers')
    expect(sub.waarden).toMatchObject({ email: 'poort@voorbeeld.example', source: SCAN_BRON })
    const meta = sub.waarden.metadata as Record<string, unknown>
    expect(meta.locale).toBe('de')
    expect(meta.consent_tekst).toBe(TOESTEMMING_TEKSTEN.de)
    expect(meta.lekken).toBe(scoor(ALLES_NEE).length)
    expect(typeof meta.unsub_token).toBe('string')
    // Volgorde: eerst de lead, dan de reeks.
    expect(stuur.rijen.map((r) => r.tabel)).toEqual(['leads', 'subscribers'])
  })

  it('zonder vinkje geen subscribers-rij, ook niet met "on"', async () => {
    await vraagUitslagAan(IDLE, formulier({ toestemming: 'on' }))
    expect(rijen('subscribers')).toHaveLength(0)
  })

  it('een dubbel adres in de reeks is geen fout', async () => {
    stuur.fout.subscribers = { code: '23505', message: 'duplicate key' }
    const uit = await vraagUitslagAan(IDLE, formulier({ toestemming: TOESTEMMING_WAARDE }))
    expect(uit).toMatchObject({ status: 'ok', reeks: true })
  })

  it('een kapotte reeks laat de lead staan en toont de uitslag toch', async () => {
    stuur.fout.subscribers = { code: 'XX000', message: 'geweigerd' }
    const stil = vi.spyOn(console, 'error').mockImplementation(() => {})
    const uit = await vraagUitslagAan(IDLE, formulier({ toestemming: TOESTEMMING_WAARDE }))
    stil.mockRestore()
    expect(uit).toEqual({ status: 'ok', reeks: false, message: undefined })
    expect(rijen('leads')).toHaveLength(1)
  })
})
