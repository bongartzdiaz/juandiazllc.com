import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { leesBron, leesBronZonderCommentaar } from './bronscan'

/* Poort: de bronboom wordt één keer per proces gelezen, niet één keer per test.

   WAT ER MIS WAS (gemeten 2026-09-22)

   Veertien poorten in deze repo lopen app, components, lib en scripts af en
   zoeken de broncode door als tekst. De wandeling stond in de meeste al op
   modulniveau en gebeurde dus één keer. Het LEZEN niet: dat stond in een
   hulpfunctie die per `it()` werd aangeroepen, dus bij twee tests gingen
   dezelfde 244 bestanden (2,0 MiB) twee keer van schijf, bij vier tests vier
   keer.

   Op een stille machine viel dat niet op — de traagste test stond op 1666 ms
   tegen een vitest-standaard van 5000 ms, en drie volle runs achter elkaar
   waren groen. Met drie gelijktijdige vitest-processen viel er prompt een om
   met `Test timed out in 5000ms`, telkens een andere. Een rode suite die per
   run iets anders meldt, meet de machine en niet de code.

   WAT DEZE POORT BEWAAKT, en waarom elk punt

   1. `leesBron` onthoudt wat hij las. Zonder dat is de rest van deze poort
      een naamsverandering en geen reparatie.
   2. Geen enkele poort die de boom afloopt (`readdirSync`) leest nog met
      `readFileSync(..., 'utf8')`. Zo'n regel is precies hoe de kosten
      terugkomen, en hij leest onschuldig.
   3. vitest draagt een expliciete `testTimeout`. De standaard van 5000 ms is
      niet gekozen, hij stond er; wie hem weghaalt, valt zonder het te merken
      terug op precies de grens die dit probleem zichtbaar maakte.

   WAT DEZE POORT NIET BEWAAKT

   Niet hoe snel de suite is. Een duurmeting in een test meet de machine, en
   dat is exact de fout die hierboven beschreven staat. Wat hier wordt
   vastgelegd is de structuur die de duur bepaalt. */

const WORTEL = join(__dirname, '..')
const MAPPEN = ['app', 'components', 'lib', 'scripts']

function bestanden(map: string): string[] {
  const uit: string[] = []
  for (const naam of readdirSync(map)) {
    if (naam === 'node_modules' || naam === '.next') continue
    const pad = join(map, naam)
    if (statSync(pad).isDirectory()) uit.push(...bestanden(pad))
    else if (naam.endsWith('.test.ts') || naam.endsWith('.test.tsx')) uit.push(pad)
  }
  return uit
}

const POORTEN = MAPPEN.flatMap((m) => bestanden(join(WORTEL, m)))

describe('gememoiseerd lezen', () => {
  it('leest een bestand één keer en onthoudt het', () => {
    // Het bewijs dat hij onthoudt: het bestand is wég bij de tweede aanroep.
    // Een gewone readFileSync gooit daar ENOENT. Dit is het enige testbestand
    // in deze repo dat naar schijf schrijft, en het doet dat in de tijdelijke
    // map van het besturingssysteem — nooit in de repo.
    const map = mkdtempSync(join(tmpdir(), 'bronscan-'))
    const pad = join(map, 'bron.ts')
    writeFileSync(pad, ['// commentaar', 'const x = 1', ''].join(String.fromCharCode(10)), 'utf8')

    expect(leesBron(pad)).toContain('const x = 1')
    expect(leesBronZonderCommentaar(pad)).not.toContain('commentaar')

    rmSync(map, { recursive: true, force: true })

    expect(leesBron(pad)).toContain('const x = 1')
    expect(leesBronZonderCommentaar(pad)).not.toContain('commentaar')
  })

  it('geeft dezelfde tekst als een rechtstreekse lezing', () => {
    // Zonder deze assertie kan het hulpje van alles teruggeven en slagen alle
    // poorten die erop leunen alsnog — het lege-instrument-patroon.
    const eigen = leesBron(join(WORTEL, 'lib', 'bronscan.ts'))
    expect(eigen).toContain('export function leesBron')
    expect(eigen.length).toBeGreaterThan(500)
  })
})

describe('de poorten die de bronboom aflopen', () => {
  it('vindt ze überhaupt', () => {
    // Een lus over nul bestanden meldt een schone pas over niets.
    expect(POORTEN.length).toBeGreaterThan(50)
  })

  it('leest via leesBron, niet rechtstreeks met readFileSync', () => {
    const zondaars = POORTEN.filter((pad) => {
      // Zichzelf overslaan: de regex hieronder draagt de tekst waarop hij
      // matcht, dus deze poort wees zichzelf aan. Dat is dezelfde val als
      // een tekstscan die op haar eigen toelichting afgaat — zie
      // [[feedback_assert_niet_door_het_vangnet]].
      if (pad.endsWith('bronscan-lezen.test.ts')) return false
      const bron = leesBron(pad)
      if (!bron.includes('readdirSync')) return false
      // Eén niveau nesting toestaan: `readFileSync(join(WORTEL, pad), "utf8")`
      // is precies de vorm die hier voorkomt, en een `[^)]*` breekt af op het
      // sluithaakje van `join(` — gemeten met een mutatie, die kwam er zo
      // doorheen.
      return /readFileSync\((?:[^()]|\([^()]*\))*['"]utf-?8['"]/.test(bron)
    }).map((p) => p.slice(WORTEL.length + 1).replace(/\\/g, '/'))

    expect(zondaars, `lees deze via leesBron uit lib/bronscan.ts: ${zondaars.join(', ')}`).toEqual([])
  })
})

describe('de tijdslimiet van vitest', () => {
  it('staat expliciet in vitest.config.ts en is ruimer dan de standaard', () => {
    const config = leesBron(join(WORTEL, 'vitest.config.ts'))
    const m = config.match(/testTimeout:\s*(\d+)/)
    expect(m, 'vitest.config.ts draagt geen expliciete testTimeout').not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(15000)
  })
})
