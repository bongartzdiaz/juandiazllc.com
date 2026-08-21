import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { maakLimiet, sleutelUitVerzoek, leesBegrensd, TeGroot } from './verzoeklimiet'

describe('maakLimiet', () => {
  it('laat een burst tot de capaciteit door en weigert daarna', () => {
    const l = maakLimiet({ capaciteit: 3, perSeconde: 1, nu: () => 0 })
    expect([l.toestaan('a'), l.toestaan('a'), l.toestaan('a')]).toEqual([true, true, true])
    expect(l.toestaan('a')).toBe(false)
  })

  it('telt per sleutel, niet over alle bezoekers heen', () => {
    const l = maakLimiet({ capaciteit: 1, perSeconde: 1, nu: () => 0 })
    expect(l.toestaan('a')).toBe(true)
    expect(l.toestaan('a')).toBe(false)
    // b mag nog, anders zou één luidruchtig IP iedereen buitensluiten.
    expect(l.toestaan('b')).toBe(true)
  })

  it('vult bij naarmate de tijd verstrijkt', () => {
    let t = 0
    const l = maakLimiet({ capaciteit: 2, perSeconde: 1, nu: () => t })
    expect(l.toestaan('a')).toBe(true)
    expect(l.toestaan('a')).toBe(true)
    expect(l.toestaan('a')).toBe(false)
    t = 1000
    expect(l.toestaan('a')).toBe(true)
    expect(l.toestaan('a')).toBe(false)
  })

  it('vult nooit verder dan de capaciteit', () => {
    let t = 0
    const l = maakLimiet({ capaciteit: 2, perSeconde: 1, nu: () => t })
    l.toestaan('a')
    t = 10_000_000 // een paar uur stilte
    expect([l.toestaan('a'), l.toestaan('a')]).toEqual([true, true])
    expect(l.toestaan('a')).toBe(false)
  })

  it('ruimt volle emmers op in plaats van eeuwig te groeien', () => {
    // De twee losse kopieën die hiervoor bestonden hielden elk IP voor
    // altijd vast. Op een lambda die lang blijft leven is dat een lek.
    let t = 0
    const l = maakLimiet({ capaciteit: 5, perSeconde: 1, maxSleutels: 10, nu: () => t })
    for (let i = 0; i < 11; i++) l.toestaan('ip-' + i)
    t = 60_000 // iedereen weer vol
    l.toestaan('nieuw')
    expect(l.omvang()).toBeLessThanOrEqual(2)
  })

  it('laat een geweigerde emmer niet vrij zolang er ruimte is', () => {
    // Opruimen mag niemand vrijpleiten die net geweigerd werd. Dit is de
    // eigenschap die wél afdwingbaar is; zie de test hieronder voor de
    // grens ervan.
    const l = maakLimiet({ capaciteit: 1, perSeconde: 0.001, maxSleutels: 100, nu: () => 0 })
    expect(l.toestaan('boosdoener')).toBe(true)
    for (let i = 0; i < 50; i++) l.toestaan('ruis-' + i)
    expect(l.toestaan('boosdoener')).toBe(false)
  })

  it('kan een straf NIET garanderen als de map vol wordt geduwd', () => {
    // Eerlijk opgeschreven in plaats van weggeasserteerd: een begrensde
    // map kan een sleutelvloed niet weerstaan. Staat alles op nul tokens,
    // dan is er geen "minst gestrafte" om weg te gooien en valt er sowieso
    // iemand af. De bovengrens bestaat om het geheugen te begrenzen, niet
    // om handhaving te garanderen.
    //
    // In productie is dit geen bruikbare aanval: de sleutel komt uit
    // x-forwarded-for, en die zet Vercel zelf. Een aanvaller heeft dus
    // evenveel échte bron-IP's nodig als sleutels — en tegen een botnet
    // was een limiet per IP nooit de verdediging.
    const l = maakLimiet({ capaciteit: 1, perSeconde: 0.001, maxSleutels: 1, nu: () => 0 })
    expect(l.toestaan('boosdoener')).toBe(true)
    for (let i = 0; i < 50; i++) l.toestaan('ruis-' + i)
    expect(l.toestaan('boosdoener')).toBe(true)
  })
})

describe('sleutelUitVerzoek', () => {
  const req = (h: Record<string, string>) => ({
    headers: { get: (n: string) => h[n.toLowerCase()] ?? null },
  })

  it('pakt de eerste waarde uit x-forwarded-for', () => {
    expect(sleutelUitVerzoek(req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4')
  })

  it('valt zonder header terug op een gedeelde sleutel', () => {
    // Strenger, niet losser: alle headerloze verzoeken delen dan één emmer.
    expect(sleutelUitVerzoek(req({}))).toBe('onbekend')
  })
})

describe('leesBegrensd', () => {
  const maakReq = (body: string, contentLength?: string): Request => {
    const bytes = new TextEncoder().encode(body)
    return {
      headers: {
        get: (n: string) =>
          n.toLowerCase() === 'content-length' ? contentLength ?? null : null,
      },
      body: new ReadableStream<Uint8Array>({
        start(c) {
          // In stukjes, zodat het plafond ook midden in een stroom werkt.
          for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7))
          c.close()
        },
      }),
    } as unknown as Request
  }

  it('leest een body die binnen het plafond past', async () => {
    await expect(leesBegrensd(maakReq('hallo'), 1024)).resolves.toBe('hallo')
  })

  it('weigert op content-length zonder de stroom te lezen', async () => {
    await expect(leesBegrensd(maakReq('x', '999999'), 1024)).rejects.toBeInstanceOf(TeGroot)
  })

  it('weigert ook als content-length liegt', async () => {
    // Een aanvaller zet gewoon geen of een te lage header. Het plafond moet
    // tijdens het lezen gelden, niet alleen ervoor.
    await expect(leesBegrensd(maakReq('x'.repeat(500)), 100)).rejects.toBeInstanceOf(TeGroot)
  })

  it('geeft een lege string bij een body-loos verzoek', async () => {
    const req = { headers: { get: () => null }, body: null } as unknown as Request
    await expect(leesBegrensd(req, 1024)).resolves.toBe('')
  })
})

/* ─────────────────────────────────────────────────────────────
   De poort. Een gedragstest op de emmer ziet niet dat een NIEUWE
   route hem nooit aanroept — en precies zo zijn csp-report en
   newsletter/confirm ongemerkt zonder rem live gegaan.
   ───────────────────────────────────────────────────────────── */

/** Publieke routes die bewust geen rem dragen, met de reden erbij. Een
    reden is verplicht: zonder reden is dit een lijst waar dingen op
    belanden omdat het even uitkwam.

    DEZE LIJST GAAT ALLEEN OVER DE REM. Tot 2026-08-21 ontsloeg hij een route
    stilzwijgend óók van de body-plafondcontrole hieronder — twee verschillende
    zorgen op één lijst, en de tweede was daardoor onzichtbaar uitgeschakeld
    voor de enige route die erop stond. */
const ZONDER_REM: Record<string, string> = {
  'app/api/cal/route.ts':
    'Cal.com-webhook. Een rem zou hier een echte boeking kunnen laten vallen ' +
    'bij een burst — cal.com levert herhalingen in salvo\'s — en een gemiste ' +
    'lead is duurder dan de aanroep die hij voorkomt. Wat een vreemde hier ' +
    'kost is begrensd: een lezing tot MAX_BYTES en één HMAC-vergelijking, ' +
    'daarna 401 zonder dat er iets geschreven wordt.',
}

/** Publieke routes die de body onbegrensd mogen lezen. Leeg, en dat hoort zo:
    er is geen reden te bedenken die niet ook voor de andere routes geldt.
    Hij staat er omdat een uitzondering die ooit nodig is een eigen plek moet
    hebben, en niet moet meeliften op de remlijst hierboven. */
const ONBEGRENSDE_BODY: Record<string, string> = {}

/** Bron zonder commentaarregels. De body-poort hieronder is een tekstscan, en
    die viel op de toelichting in cal's route die uitlégt waarom `req.json()`
    daar niet gebruikt wordt. De comment was juist; de meetlat kon geen code van
    prose onderscheiden.

    Bewust alleen hele commentaarregels en blokken, geen inline `//`-staarten:
    dan zou een `'https://…'` in een stringliteral de rest van de regel
    wegknippen en kan de poort een echte aanroep missen. Een poort die soms te
    veel meldt is te repareren; eentje die stil te weinig meldt niet. */
function zonderCommentaar(bron: string): string {
  let inBlok = false
  return bron
    .split('\n')
    .map((regel) => {
      const t = regel.trim()
      if (inBlok) {
        if (t.includes('*/')) inBlok = false
        return ''
      }
      if (t.startsWith('/*')) {
        if (!t.includes('*/')) inBlok = true
        return ''
      }
      if (t.startsWith('//') || t.startsWith('*')) return ''
      return regel
    })
    .join('\n')
}

function routeBestanden(map: string, uit: string[] = []): string[] {
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam)
    if (statSync(pad).isDirectory()) routeBestanden(pad, uit)
    else if (naam === 'route.ts') uit.push(pad.split(sep).join('/'))
  }
  return uit
}

describe('publieke API-routes', () => {
  const routes = routeBestanden('app/api')

  it('vindt de routes überhaupt', () => {
    // Zonder deze assertie zou een verkeerd pad een lege lijst geven en
    // zou alles hieronder triviaal slagen.
    expect(routes.length).toBeGreaterThanOrEqual(5)
    expect(routes).toContain('app/api/csp-report/route.ts')
  })

  it('elke route heeft een rem of staat met reden op de uitzonderingslijst', () => {
    // Match op `maakLimiet`, niet op de module-import. Sinds cal.com's route
    // `leesBegrensd` uit dezelfde module haalt, zou een import-match hem als
    // geremd aanmerken terwijl hij dat bewust niet is — de poort zou dan
    // precies de route missen waar hij over gaat.
    const zonder = routes.filter(
      (pad) => !readFileSync(pad, 'utf8').includes('maakLimiet') && !ZONDER_REM[pad],
    )
    expect(zonder, 'route zonder rem en zonder gemotiveerde uitzondering').toEqual([])
  })

  it('de uitzonderingslijsten bevatten geen route die niet meer bestaat', () => {
    // Een uitzondering die nergens meer op slaat is stille rommel, en dekt
    // op een dag per ongeluk een nieuw bestand met dezelfde naam.
    expect(Object.keys(ZONDER_REM).filter((p) => !routes.includes(p))).toEqual([])
    expect(Object.keys(ONBEGRENSDE_BODY).filter((p) => !routes.includes(p))).toEqual([])
  })

  it('geen route leest de body meer onbegrensd in', () => {
    // req.json() en req.text() lezen wat er komt. Vercel kapt rond 4,5 MB
    // af, maar dat is hun grens en geldt niet lokaal of op een andere host.
    const overtreders = routes.filter((pad) => {
      if (ONBEGRENSDE_BODY[pad]) return false
      const bron = zonderCommentaar(readFileSync(pad, 'utf8'))
      return bron.includes('req.json()') || bron.includes('req.text()')
    })
    expect(overtreders, 'leest de body zonder plafond').toEqual([])
  })

  it('de commentaarstrip verbergt geen echte aanroep', () => {
    // Zonder deze assertie kan zonderCommentaar stilletjes alles wegvegen en
    // slaagt de poort hierboven altijd — de klassieke lege-lijst-uit-een-kapot-
    // instrument. Beide richtingen: prose eruit, code erin.
    const bron = zonderCommentaar(
      [
        '// const a = await req.text()',
        '/* const b = await req.json()',
        '   nog steeds in het blok */',
        ' * const c = await req.text()',
        "const u = 'https://x.test//y'; const d = await req.json()",
      ].join('\n'),
    )
    expect(bron).not.toContain('req.text()')
    expect(bron).toContain('req.json()')
  })
})
