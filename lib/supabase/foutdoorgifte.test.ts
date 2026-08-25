import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServerClient } from '@supabase/ssr'
import { zonderCommentaar } from '../bronscan'
import { MARKETING_SCHEMA } from './keys'

/* ─────────────────────────────────────────────────────────────
   Hoe supabase-js een storing teruggeeft.

   `app/actions/foutpaden.test.ts` legt vast welke storing in welke tak van onze
   server actions landt. Die poort rust op één aanname over een bibliotheek die
   wij niet schrijven: dat een fetch-fout terugkomt als `{ error }` en niet wordt
   gegooid. Klopt die aanname niet meer, dan wisselen `form.err.generic` en
   `form.err.unavailable` stil van betekenis -- de code verandert niet, de
   melding aan de bezoeker wel.

   Tot 2026-08-25 stond die aanname alleen als meting in het logboek en als
   opmerking in de kop van die poort. Dit bestand maakt er een controle van.

   Gemeten op @supabase/ssr 0.6.1 met supabase-js 2.103.3 en postgrest-js
   2.103.3, met een geïnjecteerde fetch, dus zonder netwerk en zonder DNS:

     fetch weigert       -> resolve, error.message = "TypeError: fetch failed"
     HTTP 500            -> resolve, error.message uit de body
     HTTP 201            -> resolve, error = null
     client construeren  -> gooit niet op een onbereikbaar adres

   Die laatste hoort erbij: hij bewijst dat de `catch` in onze acties niet door
   supabase wordt gevuld maar door onze eigen `lib/supabase/keys.ts`.

   De client wordt hier gebouwd zoals `lib/supabase/server.ts` hem bouwt --
   `createServerClient` uit @supabase/ssr, met hetzelfde schema. Die functie zelf
   aanroepen kan niet: hij leest `cookies()` uit next/headers, en dat vergt een
   request-context. Vandaar een cookie-adapter die niets doet.
   ───────────────────────────────────────────────────────────── */

/** Een adres met een gereserveerd TLD (RFC 2606). Er gaat niets de deur uit --
    elke fetch hieronder is geïnjecteerd en wordt nooit echt uitgevoerd. */
const ONBEREIKBAAR = 'https://poort.invalid'
const SLEUTEL = 'sb_publishable_poort'

function client(fetchImpl: typeof fetch) {
  return createServerClient(ONBEREIKBAAR, SLEUTEL, {
    db: { schema: MARKETING_SCHEMA },
    global: { fetch: fetchImpl },
    cookies: { getAll: () => [], setAll: () => {} },
  })
}

/** Een fetch die weigert zoals Node doet als de naam niet resolvet, plus een
    teller. Zonder die teller bewijst "hij gooide niet" niets: een client die
    vóór de fetch al terugkeert, gooit ook niet. */
function weigerendeFetch() {
  const staat = { aanroepen: 0 }
  const impl = (async () => {
    staat.aanroepen++
    throw new TypeError('fetch failed')
  }) as unknown as typeof fetch
  return { impl, staat }
}

function antwoordendeFetch(status: number, body: string) {
  return (async () =>
    new Response(body, {
      status,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch
}

async function insert(fetchImpl: typeof fetch) {
  return client(fetchImpl).from('leads').insert({ email: 'poort@voorbeeld.example' })
}

describe('supabase-js geeft een storing terug in plaats van hem te gooien', () => {
  it('een weigerende fetch komt terug als { error }', async () => {
    const { impl, staat } = weigerendeFetch()

    // Niet `expect(...).resolves`: een worp moet hier zichtbaar zijn als een
    // gefaalde assertie met de worp erin, niet als een afgekeurde promise.
    let uitkomst: Awaited<ReturnType<typeof insert>> | undefined
    let geworpen: unknown
    try {
      uitkomst = await insert(impl)
    } catch (e) {
      geworpen = e
    }

    expect(geworpen, 'supabase-js gooide waar hij hoorde terug te geven').toBeUndefined()
    expect(staat.aanroepen, 'de geïnjecteerde fetch is nooit aangeroepen').toBeGreaterThan(0)
    expect(uitkomst?.error).not.toBeNull()
    expect(uitkomst?.error?.message).toContain('fetch failed')
    expect(uitkomst?.data).toBeNull()
  })

  it('een niet-2xx-antwoord komt terug als { error }', async () => {
    let uitkomst: Awaited<ReturnType<typeof insert>> | undefined
    let geworpen: unknown
    try {
      uitkomst = await insert(antwoordendeFetch(500, '{"message":"geweigerd"}'))
    } catch (e) {
      geworpen = e
    }

    expect(geworpen).toBeUndefined()
    expect(uitkomst?.error?.message).toBe('geweigerd')
  })

  it('de gelukkige weg geeft error: null', async () => {
    // De discriminerende controle. Zonder deze zou "error is gevuld" hierboven
    // ook te verklaren zijn door een opstelling die altijd een fout oplevert.
    const uitkomst = await insert(antwoordendeFetch(201, ''))
    expect(uitkomst.error).toBeNull()
  })

  it('een client bouwen op een onbereikbaar adres gooit niet', () => {
    // Dit is de andere helft van de takverdeling: de `catch` in onze acties
    // wordt gevuld door lib/supabase/keys.ts, niet door supabase-js.
    expect(() => client(antwoordendeFetch(201, ''))).not.toThrow()
  })
})

describe('en wat onze eigen code daaraan koppelt', () => {
  const ACTIES = join(__dirname, '..', '..', 'app', 'actions')
  const BESTANDEN = ['contact.ts', 'subscribe.ts']

  it('geen enkele actie zet throwOnError()', () => {
    // `.throwOnError()` keert de hele afspraak om: een databasefout wordt dan
    // wél gegooid en landt in de `catch`, waarmee de twee takken van betekenis
    // wisselen zonder dat er één regel aan die takken verandert.
    for (const naam of BESTANDEN) {
      const bron = zonderCommentaar(readFileSync(join(ACTIES, naam), 'utf8'))
      expect(bron, naam).not.toContain('throwOnError')
    }
  })

  it('en de scan zou het zien als het er stond', () => {
    // Positieve controle: nul treffers hierboven is pas een meting nadat dit
    // instrument bewees te kunnen vinden.
    const gemuteerd = zonderCommentaar('const q = supabase.from("leads").throwOnError()')
    expect(gemuteerd).toContain('throwOnError')
  })
})
