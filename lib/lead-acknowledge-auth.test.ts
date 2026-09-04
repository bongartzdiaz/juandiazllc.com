/* ─────────────────────────────────────────────────────────────
   De toegangspoort van de edge function lead-acknowledge.

   TWEE LAGEN DIE ELKAAR NIET OVERLAPPEN.

   1. De beslissing zelf, écht uitgevoerd. Dat kan omdat `auth.ts` geen enkele
      Deno-global aanraakt en zijn sleutel binnenkrijgt in plaats van uit env
      te lezen.
   2. Een tekstscan op `index.ts`. Die kan hier niet uitgevoerd worden — het
      bestand roept `Deno.serve(...)` aan op moduleniveau — en juist daar zat
      het defect: een `else`-tak die bij een ontbrekende sleutel een
      waarschuwing logde en dóórliet. Een module-import zou dat per definitie
      niet kunnen zien, want die tak zit in de bedrading en niet in de logica.

   WAAROM DIT BESTAND IN lib/ STAAT EN NIET NAAST DE FUNCTIE. `tsconfig.json`
   sluit `supabase/functions` uit, want tsc kent `Deno` niet. Maar `exclude`
   filtert alleen de wortelset: een geïmporteerd bestand wordt alsnog
   getypecheckt. Door `auth.ts` hiervandaan te importeren komt hij dus wél
   onder tsc te liggen. Zou deze test naast de functie staan, dan draaide hij
   onder vitest maar zou niets hem typechecken — en `vitest groen` is geen
   `tsc groen`.
   ───────────────────────────────────────────────────────────── */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { zonderCommentaar } from './bronscan'
import {
  MIN_SLEUTELLENGTE,
  bearerToken,
  beoordeelAuth,
  gelijkInConstanteTijd,
  sleutelIsBruikbaar,
} from '../supabase/functions/lead-acknowledge/auth'

const WORTEL = fileURLToPath(new URL('..', import.meta.url))
const INDEX = readFileSync(`${WORTEL}supabase/functions/lead-acknowledge/index.ts`, 'utf8')
const INDEX_CODE = zonderCommentaar(INDEX)

/** Zelfde vorm als het echte vault-secret: standaard base64, 32 bytes, 44 tekens.
    Gemeten op wbgiouuifqhasedncysw op 2026-09-04 — alleen lengte en tekenset
    opgevraagd, nooit de waarde. */
const SLEUTEL = 'K'.repeat(20) + '+' + '/' + 'K'.repeat(21) + '='

describe('sleutelIsBruikbaar', () => {
  it('weigert afwezig, leeg en witruimte', () => {
    for (const waarde of [null, undefined, '', '   ', '\t\n']) {
      expect(sleutelIsBruikbaar(waarde)).toBe(false)
    }
  })

  it('weigert een sleutel korter dan de ondergrens', () => {
    expect(sleutelIsBruikbaar('x')).toBe(false)
    expect(sleutelIsBruikbaar('a'.repeat(MIN_SLEUTELLENGTE - 1))).toBe(false)
  })

  it('accepteert vanaf de ondergrens, en de echte sleutellengte', () => {
    expect(sleutelIsBruikbaar('a'.repeat(MIN_SLEUTELLENGTE))).toBe(true)
    expect(sleutelIsBruikbaar(SLEUTEL)).toBe(true)
    expect(SLEUTEL).toHaveLength(44)
  })

  it('de ondergrens ligt ruim onder de echte sleutel', () => {
    // Anders zet een te strenge controle de keten uit op het moment dat hij
    // aan hoort te gaan — zie de kopnotitie van auth.ts.
    expect(MIN_SLEUTELLENGTE).toBeLessThan(SLEUTEL.length)
  })
})

describe('bearerToken', () => {
  it('leest de token uit een geldige header', () => {
    expect(bearerToken(`Bearer ${SLEUTEL}`)).toBe(SLEUTEL)
    expect(bearerToken(`bearer ${SLEUTEL}`)).toBe(SLEUTEL)
    expect(bearerToken(`  Bearer   ${SLEUTEL}  `)).toBe(SLEUTEL)
  })

  it('geeft null bij afwezig of vormloos', () => {
    for (const h of [null, undefined, '', 'Bearer', 'Bearer ', SLEUTEL, `Basic ${SLEUTEL}`]) {
      expect(bearerToken(h)).toBeNull()
    }
  })
})

describe('gelijkInConstanteTijd', () => {
  it('herkent gelijk en ongelijk', () => {
    expect(gelijkInConstanteTijd(SLEUTEL, SLEUTEL)).toBe(true)
    expect(gelijkInConstanteTijd(SLEUTEL, SLEUTEL.slice(0, -1) + 'X')).toBe(false)
    expect(gelijkInConstanteTijd(SLEUTEL, SLEUTEL.slice(0, -1))).toBe(false)
    expect(gelijkInConstanteTijd('', '')).toBe(true)
  })
})

describe('beoordeelAuth', () => {
  it('weigert met 503 not-configured zolang er geen bruikbare sleutel is', () => {
    // Dit IS de reparatie. Voorheen liet deze tak dóór met een console.warn.
    for (const geen of [null, undefined, '', '   ']) {
      expect(beoordeelAuth(geen, `Bearer ${SLEUTEL}`)).toEqual({
        ok: false,
        status: 503,
        error: 'not-configured',
      })
    }
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
    // Zonder dit onderscheid is "de functie staat niet ingesteld" met een
    // onschadelijke probe niet te scheiden van "jij stuurde de verkeerde
    // sleutel", en wordt elke diagnose duur.
    const zonder = beoordeelAuth(null, 'Bearer wat-dan-ook')
    const verkeerd = beoordeelAuth(SLEUTEL, 'Bearer wat-dan-ook')
    expect(zonder.ok).toBe(false)
    expect(verkeerd.ok).toBe(false)
    expect(zonder).not.toEqual(verkeerd)
  })

  it('REGRESSIE: een korte sleutel kan niet langer als substring meeliften', () => {
    // De oude controle was `auth.includes(SECRET)` achter een truthy-check.
    // Met SECRET='x' kwam elke header die een x bevatte erdoor. Nu valt zo'n
    // sleutel af op de ondergrens en weigert het endpoint álles — luid, niet
    // stil open.
    expect(beoordeelAuth('x', 'Bearer zzz-x-zzz')).toEqual({
      ok: false,
      status: 503,
      error: 'not-configured',
    })
  })
})

describe('index.ts gebruikt de poort werkelijk', () => {
  it('roept beoordeelAuth aan', () => {
    expect(INDEX_CODE).toContain('beoordeelAuth(')
    expect(INDEX_CODE).toContain("from './auth.ts'")
  })

  it('draagt geen substring-vergelijking op de sleutel meer', () => {
    expect(INDEX_CODE).not.toMatch(/\.includes\(\s*LEAD_NOTIFY_SECRET\s*\)/)
  })

  it('bewaakt het oordeel met een negatie die terugkeert', () => {
    // Zonder deze assertie pint de scan alleen de VORM van het oude defect
    // (`console.warn`, `.includes`) en glipt een nieuwe fail-open met andere
    // woorden erlangs. Hij kan geen control-flow verifiëren — dat is de grens
    // van een tekstscan — maar hij dwingt wel af dat de bewaking alleen met
    // een zichtbare bewerking verdwijnt.
    expect(INDEX_CODE).toMatch(/if\s*\(\s*!oordeel\.ok\s*\)/)
    expect(INDEX_CODE).toMatch(/return j\(\s*\{[^}]*oordeel\.error[^}]*\}\s*,\s*oordeel\.status\s*\)/)
  })

  it('draagt geen tak die bij een ontbrekende sleutel dóórlaat', () => {
    // Het defect had precies deze vorm: `else { console.warn('...open') }`,
    // waarna de aanroep gewoon verderging.
    expect(INDEX_CODE).not.toMatch(/console\.warn\([^)]*LEAD_NOTIFY_SECRET/)
    expect(INDEX_CODE).not.toMatch(/endpoint staat open/)
  })

  it('POSITIEVE CONTROLE: de scanner leest werkelijk code, en geen commentaar', () => {
    // Zonder dit paar is elke groene uitkomst hierboven ook te verklaren door
    // een lezer die niets vindt. De eerste helft bewijst dat hij code ziet; de
    // tweede dat de strip commentaar wegneemt in plaats van alles.
    expect(INDEX_CODE).toContain('Deno.serve(')
    expect(INDEX).toContain('DRIE EIGENSCHAPPEN DIE BEWUST ZO ZIJN')
    expect(INDEX_CODE).not.toContain('DRIE EIGENSCHAPPEN DIE BEWUST ZO ZIJN')
  })
})
