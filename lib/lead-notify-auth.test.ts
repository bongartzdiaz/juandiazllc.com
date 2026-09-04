/* ─────────────────────────────────────────────────────────────
   De toegangspoort van de edge function lead-notify.

   AANLEIDING. Een Claude Security-scan bevestigde op 2026-09-04 unaniem twee
   bevindingen op dit ene bestand, allebei MEDIUM:

     F6  CWE-306  de controle zat in `if (LEAD_NOTIFY_SECRET)`, dus een
                  ontbrekende sleutel logde een waarschuwing en liet dóór naar
                  Telegram en Resend met een volledig door de aanroeper
                  geleverd lichaam
     F7  CWE-697  `auth.includes(SECRET)` — een substringtest, niet in
                  constante tijd, zonder ondergrens op de sleutel

   Beide zijn woordelijk de gaten die `lead-acknowledge` op 2026-08-25 al
   kwijtraakte. De reparatie is daarom geen nieuw ontwerp maar dezelfde poort:
   `beoordeelAuth` uit `auth.ts`.

   DRIE LAGEN DIE ELKAAR NIET OVERLAPPEN.

   1. De beslissing zelf, écht uitgevoerd — geïmporteerd uit de kopie ván deze
      functie, niet die van de buurman. Dat brengt dit bestand onder tsc
      (`exclude` filtert alleen de wortelset; een geïmporteerd bestand wordt
      alsnog getypecheckt) en bewijst dat de kopie die híer wordt uitgerold
      dezelfde beslissing neemt.
   2. Byte-gelijkheid van de twee `auth.ts`. Twee bestanden die één feit dragen
      lopen uit elkaar; dit is de `cmp CLAUDE.md AGENTS.md`-vorm die de
      `docs-sync`-job al gebruikt.
   3. Een tekstscan op `index.ts`. Die kan hier niet uitgevoerd worden — het
      bestand roept `Deno.serve(...)` aan op moduleniveau — en juist daar zat
      F6: een `else`-tak in de bedrading, niet in de logica. Een module-import
      kan dat per definitie niet zien.

   WAT DEZE POORT NIET ZIET. Of de gedeployde functie deze code draagt. Het
   Supabase-datavlak geeft 402, en `updated_at == created_at` op een edge
   function zegt dat hij nooit is heruitgerold — bron in de repo bewijst niets
   over gedeployde code. Zie [[project_diaz_editor_repo_prod_drift]].
   ───────────────────────────────────────────────────────────── */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { zonderCommentaar } from './bronscan'
import { MIN_SLEUTELLENGTE, beoordeelAuth } from '../supabase/functions/lead-notify/auth'

const WORTEL = fileURLToPath(new URL('..', import.meta.url))
const INDEX = readFileSync(`${WORTEL}supabase/functions/lead-notify/index.ts`, 'utf8')
const INDEX_CODE = zonderCommentaar(INDEX)

const AUTH_NOTIFY = readFileSync(`${WORTEL}supabase/functions/lead-notify/auth.ts`)
const AUTH_ACK = readFileSync(`${WORTEL}supabase/functions/lead-acknowledge/auth.ts`)

/** Zelfde vorm als het echte vault-secret: standaard base64, 32 bytes, 44 tekens.
    Gemeten op wbgiouuifqhasedncysw op 2026-09-04 -- alleen lengte en tekenset
    opgevraagd, nooit de waarde. De echte sleutel draagt `+` en `/`, dus die staan
    hier ook in: een testsleutel die de tekenset van de echte niet haalt, bewijst
    minder dan hij lijkt. */
const SLEUTEL = 'K'.repeat(20) + '+' + '/' + 'K'.repeat(21) + '='

describe('de twee auth.ts zijn één feit', () => {
  it('BYTE-IDENTIEK, inclusief regeleinden', () => {
    // Niet `toEqual` op de gedecodeerde tekst: een verschil in regeleinden is
    // precies het soort drift dat op deze machine ontstaat en dat een
    // tekstvergelijking wegnormaliseert.
    expect(AUTH_NOTIFY.equals(AUTH_ACK)).toBe(true)
  })

  it('POSITIEVE CONTROLE: de vergelijking kan werkelijk verschil zien', () => {
    // Zonder dit is groen hierboven ook te verklaren door twee lege buffers.
    expect(AUTH_NOTIFY.length).toBeGreaterThan(1000)
    expect(AUTH_NOTIFY.equals(Buffer.concat([AUTH_ACK, Buffer.from('x')]))).toBe(false)
  })
})

describe('beoordeelAuth, uit de kopie van lead-notify', () => {
  it('F6: weigert met 503 not-configured zolang er geen bruikbare sleutel is', () => {
    // Dit IS de reparatie van F6. Voorheen liet deze tak dóór met een
    // console.warn, richting twee verzendkanalen.
    for (const geen of [null, undefined, '', '   ']) {
      expect(beoordeelAuth(geen, `Bearer ${SLEUTEL}`)).toEqual({
        ok: false,
        status: 503,
        error: 'not-configured',
      })
    }
  })

  it('F7: een korte sleutel kan niet langer als substring meeliften', () => {
    // De oude controle was `auth.includes(SECRET)` achter een truthy-check.
    // Met SECRET='x' kwam elke header die een x bevatte erdoor.
    expect(beoordeelAuth('x', 'Bearer zzz-x-zzz')).toEqual({
      ok: false,
      status: 503,
      error: 'not-configured',
    })
    expect(MIN_SLEUTELLENGTE).toBeGreaterThan(1)
  })

  it('F7: een header die de sleutel alleen bevát komt er niet door', () => {
    // De kern van de substringtest: `includes` liet dit door, exacte
    // vergelijking niet.
    expect(beoordeelAuth(SLEUTEL, `Bearer voorvoegsel-${SLEUTEL}-achtervoegsel`)).toEqual({
      ok: false,
      status: 401,
      error: 'unauthorized',
    })
  })

  it('weigert met 401 als de sleutel goed is maar de header niet', () => {
    for (const h of [null, '', 'Bearer', `Bearer ${SLEUTEL}x`, `Basic ${SLEUTEL}`]) {
      expect(beoordeelAuth(SLEUTEL, h)).toEqual({ ok: false, status: 401, error: 'unauthorized' })
    }
  })

  it('laat door bij een kloppende header', () => {
    expect(beoordeelAuth(SLEUTEL, `Bearer ${SLEUTEL}`)).toEqual({ ok: true })
  })

  it('onderscheidt niet-ingesteld van verkeerde sleutel', () => {
    const zonder = beoordeelAuth(null, 'Bearer wat-dan-ook')
    const verkeerd = beoordeelAuth(SLEUTEL, 'Bearer wat-dan-ook')
    expect(zonder.ok).toBe(false)
    expect(verkeerd.ok).toBe(false)
    expect(zonder).not.toEqual(verkeerd)
  })
})

describe('index.ts gebruikt de poort werkelijk', () => {
  it('roept beoordeelAuth aan, uit zijn eigen map', () => {
    expect(INDEX_CODE).toContain('beoordeelAuth(')
    expect(INDEX_CODE).toContain("from './auth.ts'")
  })

  it('bewaakt het oordeel met een negatie die terugkeert', () => {
    // Zonder deze assertie pint de scan alleen de VORM van het oude defect en
    // glipt een nieuwe fail-open met andere woorden erlangs. Control-flow
    // verifiëren kan een tekstscan niet — dat is zijn grens — maar de bewaking
    // verdwijnt hiermee alleen nog met een zichtbare bewerking.
    expect(INDEX_CODE).toMatch(/if\s*\(\s*!oordeel\.ok\s*\)/)
    expect(INDEX_CODE).toMatch(/return j\(\s*\{[^}]*oordeel\.error[^}]*\}\s*,\s*oordeel\.status\s*\)/)
  })

  it('F7-REGRESSIE: draagt geen substring-vergelijking op de sleutel meer', () => {
    expect(INDEX_CODE).not.toMatch(/\.includes\(\s*LEAD_NOTIFY_SECRET\s*\)/)
  })

  it('F6-REGRESSIE: draagt geen tak die bij een ontbrekende sleutel dóórlaat', () => {
    expect(INDEX_CODE).not.toMatch(/console\.warn\([^)]*LEAD_NOTIFY_SECRET/)
    expect(INDEX_CODE).not.toMatch(/endpoint is open/)
    expect(INDEX_CODE).not.toMatch(/if\s*\(\s*LEAD_NOTIFY_SECRET\s*\)/)
  })

  it('de poort staat vóór het lezen van het lichaam', () => {
    // Anders krijgt een vreemde alsnog een onbegrensde JSON-parse — dezelfde
    // vorm als het body-plafond dat /api/cal ná zijn HMAC kreeg (#210).
    const poort = INDEX_CODE.indexOf('beoordeelAuth(')
    const lichaam = INDEX_CODE.indexOf('req.json()')
    expect(poort).toBeGreaterThan(-1)
    expect(lichaam).toBeGreaterThan(-1)
    expect(poort).toBeLessThan(lichaam)
  })

  it('POSITIEVE CONTROLE: de scanner leest code, en de strip neemt commentaar weg', () => {
    // Het discriminerende paar. De kop van index.ts draagt beide verboden
    // regels met opzet voluit; ze staan er om precies dit te kunnen bewijzen.
    // Zonder dit paar is elke groene regressie hierboven ook te verklaren door
    // een lezer die niets vindt.
    expect(INDEX).toContain("console.warn('LEAD_NOTIFY_SECRET unset")
    expect(INDEX).toContain('auth.includes(LEAD_NOTIFY_SECRET)')
    expect(INDEX_CODE).not.toContain("console.warn('LEAD_NOTIFY_SECRET unset")
    expect(INDEX_CODE).not.toContain('auth.includes(LEAD_NOTIFY_SECRET)')
    expect(INDEX_CODE).toContain('Deno.serve(')
  })
})
