import { describe, it, expect, vi } from 'vitest'
import { DICT, LOCALES } from '@/lib/i18n/dict'

/* ─────────────────────────────────────────────────────────────
   Welke storing landt in welke tak.

   Beide server actions hebben twee foutuitgangen die op het oog uitwisselbaar
   zijn: `if (error)` na de insert, en de `catch` eromheen. De tweede heette tot
   2026-08-25 `form.err.network`, en die naam beschreef een geval dat hij niet
   vangt.

   Gemeten op twee productiebuilds, met alleen de omgeving gewijzigd en de
   wizard op /es/contact volledig doorlopen:

     NEXT_PUBLIC_SUPABASE_URL = onbereikbare host  ->  "Algo ha salido mal."
     NEXT_PUBLIC_SUPABASE_URL = leeg               ->  "Error de red."

   Precies omgekeerd aan wat de namen beloven. supabase-js vangt een fetch-fout
   zelf op en geeft hem terug als `{ error }`, dus een netwerkstoring komt in de
   eerste tak terecht. De `catch` is alleen bereikbaar als `createClient()`
   gooit, en dat doet hij op een ontbrekende `NEXT_PUBLIC_SUPABASE_URL` of
   publishable key -- configuratie, geen storing bij de bezoeker.

   Dat verschil is niet alleen naamgeving. De oude kopij zei er in vier talen
   bij dat de bezoeker het opnieuw moest proberen, terwijl opnieuw verzenden een
   ontbrekende omgevingsvariabele nooit oplost.

   Waarom geen bestaande poort dit ving: de i18n-poorten controleren dat een
   sleutel bestaat, in vier talen staat en vertaald is. Ze kunnen niet zien of
   de sleutel het juiste geval beschrijft -- daar is een test voor nodig die de
   actie werkelijk aanroept met een falende client.

   Wat deze poort NIET bewaakt: het gedrag van supabase-js zelf. Dat een
   fetch-fout als `{ error }` terugkomt is hierboven gemeten, niet hier
   afgedwongen. Verandert die bibliotheek van gedrag, dan wisselen de twee
   takken stilzwijgend van betekenis en zegt deze test daar niets over.
   ───────────────────────────────────────────────────────────── */

const OUDE_NAAM = 'form.err.network'
const NIEUWE_NAAM = 'form.err.unavailable'

/** Termen waarmee een taal een netwerkstoring benoemt. Klein gehouden: deze
    lijst wordt op één sleutel losgelaten, niet op de hele kopij. */
const NETWERKTAAL: Record<string, string[]> = {
  en: ['network'],
  nl: ['netwerk'],
  de: ['netzwerk'],
  es: ['de red'],
}

/** De kopij zoals hij tot 2026-08-25 luidde. Staat hier als positieve
    controle: de lijst hierboven moet hier wél op afgaan, anders is "nul
    treffers" op de nieuwe kopij geen meting maar een kapot instrument. */
const OUDE_KOPIJ: Record<string, string> = {
  en: 'Network error. Try again.',
  nl: 'Netwerkfout. Probeer het opnieuw.',
  de: 'Netzwerkfehler. Bitte versuchen Sie es erneut.',
  es: 'Error de red. Inténtalo de nuevo.',
}

type Gedrag = 'gooit' | 'db-fout' | 'duplicaat' | 'ok'
const stuur = vi.hoisted(() => ({ gedrag: 'ok' as Gedrag }))

/** Eén object dekt beide aanroepvormen: contact doet `await insert(...)`,
    subscribe doet `await insert(...).select().single()`. */
type Ketting = {
  then: (res: (v: unknown) => void) => void
  select: () => Ketting
  single: () => Ketting
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    if (stuur.gedrag === 'gooit') {
      // Woordelijk de fout die lib/supabase/keys.ts gooit op een lege waarde.
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.')
    }
    const uitkomst =
      stuur.gedrag === 'db-fout'
        ? { data: null, error: { code: 'XX000', message: 'geweigerd' } }
        : stuur.gedrag === 'duplicaat'
          ? { data: null, error: { code: '23505', message: 'duplicate key' } }
          : { data: { id: 1 }, error: null }

    const ketting: Ketting = {
      then: (res) => {
        res(uitkomst)
      },
      select: () => ketting,
      single: () => ketting,
    }
    return { from: () => ({ insert: () => ketting }) }
  },
}))

const { submitLead } = await import('./contact')
const { subscribe } = await import('./subscribe')

function contactFormulier(locale: string): FormData {
  const fd = new FormData()
  fd.set('locale', locale)
  fd.set('name', 'Poort')
  fd.set('email', 'poort@voorbeeld.example')
  fd.set('message', 'Een bericht dat lang genoeg is om de minimumlengte te halen.')
  fd.set('source', 'poort')
  return fd
}

function inschrijfFormulier(locale: string): FormData {
  const fd = new FormData()
  fd.set('locale', locale)
  fd.set('email', 'poort@voorbeeld.example')
  fd.set('source', 'poort')
  return fd
}

async function contactMet(gedrag: Gedrag, locale: string) {
  stuur.gedrag = gedrag
  const uit = await submitLead({ status: 'idle' }, contactFormulier(locale))
  stuur.gedrag = 'ok'
  return uit
}

async function inschrijfMet(gedrag: Gedrag, locale: string) {
  stuur.gedrag = gedrag
  const uit = await subscribe({ status: 'idle' }, inschrijfFormulier(locale))
  stuur.gedrag = 'ok'
  return uit
}

describe('welke storing in welke tak landt', () => {
  it('contact: een gooiende createClient geeft de configuratiemelding', async () => {
    for (const l of LOCALES) {
      const uit = await contactMet('gooit', l)
      expect(uit.status, l).toBe('err')
      expect(uit.message, l).toBe(DICT[l][NIEUWE_NAAM])
    }
  })

  it('contact: een database die een fout teruggeeft, geeft de algemene melding', async () => {
    for (const l of LOCALES) {
      const uit = await contactMet('db-fout', l)
      expect(uit.status, l).toBe('err')
      expect(uit.message, l).toBe(DICT[l]['form.err.generic'])
    }
  })

  it('contact: de gelukkige weg blijft de bevestiging geven', async () => {
    for (const l of LOCALES) {
      const uit = await contactMet('ok', l)
      expect(uit.status, l).toBe('ok')
      expect(uit.message, l).toBe(DICT[l]['form.ok.lead'])
    }
  })

  it('inschrijven: een gooiende createClient geeft de configuratiemelding', async () => {
    for (const l of LOCALES) {
      const uit = await inschrijfMet('gooit', l)
      expect(uit.status, l).toBe('err')
      expect(uit.message, l).toBe(DICT[l][NIEUWE_NAAM])
    }
  })

  it('inschrijven: een database die een fout teruggeeft, geeft de algemene melding', async () => {
    for (const l of LOCALES) {
      const uit = await inschrijfMet('db-fout', l)
      expect(uit.status, l).toBe('err')
      expect(uit.message, l).toBe(DICT[l]['form.err.generic'])
    }
  })

  it('inschrijven: een dubbel adres blijft een geslaagde inschrijving', async () => {
    for (const l of LOCALES) {
      const uit = await inschrijfMet('duplicaat', l)
      expect(uit.status, l).toBe('ok')
      expect(uit.message, l).toBe(DICT[l]['form.ok.already'])
    }
  })

  it('inschrijven: de gelukkige weg blijft de bevestiging geven', async () => {
    for (const l of LOCALES) {
      const uit = await inschrijfMet('ok', l)
      expect(uit.status, l).toBe('ok')
      expect(uit.message, l).toBe(DICT[l]['form.ok.subscribed'])
    }
  })
})

describe('de kopij van de configuratietak', () => {
  it('is in elke taal een andere zin dan de algemene melding', () => {
    // Vallen ze samen, dan is het onderscheid in de code er nog wel maar zegt
    // het de bezoeker niets meer -- en dan verdwijnt het bij de eerstvolgende
    // opruimbeurt zonder dat iemand merkt dat er iets weg is.
    for (const l of LOCALES) {
      expect(DICT[l][NIEUWE_NAAM], l).not.toBe(DICT[l]['form.err.generic'])
    }
  })

  it('benoemt in geen enkele taal een netwerkstoring', () => {
    for (const l of LOCALES) {
      const zin = (DICT[l][NIEUWE_NAAM] ?? '').toLowerCase()
      for (const term of NETWERKTAAL[l]) {
        expect(zin, `${l}: ${term}`).not.toContain(term)
      }
    }
  })

  it('gaat wél af op de kopij zoals hij was', () => {
    for (const l of LOCALES) {
      // Zonder deze regel is de controle leeg te maken zonder dat iets
      // opvalt: met nul termen wordt de assertie hieronder
      // expect([]).toHaveLength(0) en slaagt hij op niets. Gemeten met een
      // mutatie die NETWERKTAAL.nl leeghaalde -- die liep groen door.
      expect(NETWERKTAAL[l].length, l).toBeGreaterThan(0)
      const oud = OUDE_KOPIJ[l].toLowerCase()
      const treffers = NETWERKTAAL[l].filter((t) => oud.includes(t))
      expect(treffers, l).toHaveLength(NETWERKTAAL[l].length)
    }
  })

  it('draagt de oude sleutelnaam nergens meer', () => {
    for (const l of LOCALES) {
      expect(Object.keys(DICT[l]), l).not.toContain(OUDE_NAAM)
      expect(Object.keys(DICT[l]), l).toContain(NIEUWE_NAAM)
    }
  })
})
