import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, sep } from 'node:path'
import { zonderCommentaar } from './bronscan'

/* ─────────────────────────────────────────────────────────────
   De gedocumenteerde doelen moeten zijn wat de code werkelijk afvuurt.

   Op 2026-08-24 gemeten: de operator-lijst noemde er VIER, de code vuurt er
   VIJF. De ontbrekende was `Contact Submitted` — het enige doel dat een
   conversie meet in plaats van een klik, en daarmee precies het cijfer dat
   moest beantwoorden of "0 rijen in `marketing.leads`" geen-verkeer of
   geen-conversie betekent. Vier doelen aanmaken laat dat cijfer weggooien.

   Waarom het gat kon ontstaan: de vier klikdoelen hangen aan een CSS-klasse
   (`plausible-event-name=…`), de vijfde aan een `window.plausible(...)`. Wie
   op de klassenaam grept vindt er vier en denkt klaar te zijn — functioneel
   identiek, syntactisch onvindbaar voor de scanner die je erop loslaat.
   Zelfde vorm als het `process.env[SECRET_ENV]`-gat dat de boekingswebhook
   maandenlang op 503 hield; zie `lib/env-voorbeeld.test.ts`.

   Deze poort leest daarom BEIDE aanroepvormen, en eist dat de lijst in
   `MANUAL_TASKS.md` er in twee richtingen mee overeenkomt.
   ───────────────────────────────────────────────────────────── */

const WORTEL = join(__dirname, '..')

/** Mappen met geleverde code. Testbestanden tellen NIET mee: een doelnaam die
    alleen in een test voorkomt wordt nergens afgevuurd, en zou hier anders als
    "in gebruik" gelden. Zelfde regel als bij de wees-sleutelpoort. */
const MAPPEN = ['app', 'components', 'lib']

/** Het aantal is met opzet vastgelegd. Een zesde doel toevoegen dwingt een
    zichtbare bewerking van dit getal af — anders kan een doel stil verdwijnen
    zolang de rest nog klopt, en dat is precies de staat waarin
    `Contact Submitted` maandenlang verkeerde. */
const VERWACHT_AANTAL = 6

function bronBestanden(map: string, uit: string[] = []): string[] {
  if (!existsSync(map)) return uit
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam)
    if (statSync(pad).isDirectory()) {
      if (naam !== 'node_modules') bronBestanden(pad, uit)
    } else if (/\.(ts|tsx)$/.test(naam) && !naam.includes('.test.')) {
      uit.push(pad)
    }
  }
  return uit
}

/** Doel via CSS-klasse: `plausible-event-name=Boeking+15min`. De `+` is een
    spatie — zo verwacht Plausible de naam in het dashboard. */
const VIA_KLASSE = /plausible-event-name=([A-Za-z0-9+_-]+)/g

/** Doel via script: `window.plausible("X")` of `.plausible?.("X")`. De
    optionele `?.` is meegenomen; een type-declaratie (`plausible?: (event…`)
    matcht niet, want daar volgt `?:` en geen `?.` of `(`. */
const VIA_SCRIPT = /plausible(?:\?\.)?\(\s*["']([^"']+)["']/g

function doelenUitCode(): { klasse: Set<string>; script: Set<string> } {
  const klasse = new Set<string>()
  const script = new Set<string>()
  for (const map of MAPPEN) {
    for (const pad of bronBestanden(join(WORTEL, map))) {
      const bron = zonderCommentaar(readFileSync(pad, 'utf8'))
      for (const m of bron.matchAll(VIA_KLASSE)) klasse.add(m[1].replace(/\+/g, ' '))
      for (const m of bron.matchAll(VIA_SCRIPT)) script.add(m[1])
    }
  }
  return { klasse, script }
}

/** De checklist uit `MANUAL_TASKS.md`, gesneden tussen twee vaste markeringen.
    Ontbreekt een markering, dan gooit dit — een parser die stil de eerste of
    geen treffer pakt, publiceert een verouderde lijst zonder het te melden. */
function doelenUitDocumentatie(): string[] {
  const tekst = readFileSync(join(WORTEL, 'MANUAL_TASKS.md'), 'utf8')
  const START = 'deze namen **exact** overnemen'
  const EIND = '**Vergeet de custom properties niet.**'
  for (const [naam, mark] of [['START', START], ['EIND', EIND]] as const) {
    const n = tekst.split(mark).length - 1
    if (n !== 1) {
      throw new Error(
        `markering ${naam} komt ${n}x voor in MANUAL_TASKS.md (verwacht 1). ` +
          'Is de Plausible-sectie herschreven? Werk deze poort bij.',
      )
    }
  }
  const blok = tekst.slice(tekst.indexOf(START), tekst.indexOf(EIND))
  return [...blok.matchAll(/^- \[[ x]\] `([^`]+)`/gm)].map((m) => m[1])
}

describe('Plausible-doelen: code en documentatie zeggen hetzelfde', () => {
  const { klasse, script } = doelenUitCode()
  const inCode = new Set([...klasse, ...script])
  const inDocs = doelenUitDocumentatie()

  it('vindt beide aanroepvormen — anders meet deze poort niets', () => {
    // Positieve controle. Een lege overtredingslijst uit een kapotte regex
    // leest hetzelfde als een schone meting; deze twee asserties maken dat
    // verschil zichtbaar.
    expect(klasse.size, 'geen enkel doel via CSS-klasse gevonden').toBeGreaterThan(0)
    expect(script.size, 'geen enkel doel via window.plausible() gevonden').toBeGreaterThan(0)
  })

  it(`vuurt precies ${VERWACHT_AANTAL} doelen af`, () => {
    expect([...inCode].sort()).toHaveLength(VERWACHT_AANTAL)
  })

  it('elk doel in de code staat in MANUAL_TASKS.md', () => {
    const ontbreekt = [...inCode].filter((d) => !inDocs.includes(d)).sort()
    expect(ontbreekt, 'niet gedocumenteerd — de operator maakt dit doel dus niet aan').toEqual([])
  })

  it('elk gedocumenteerd doel wordt ook echt afgevuurd', () => {
    const wees = inDocs.filter((d) => !inCode.has(d)).sort()
    expect(wees, 'gedocumenteerd maar nergens afgevuurd').toEqual([])
  })

  it('elk doel staat ook in de operator-lijst in CLAUDE.md', () => {
    // CLAUDE.md is wat een volgende sessie leest. Staat een doel alleen in
    // MANUAL_TASKS.md, dan komt het niet op de lijst die de operator afwerkt.
    const claude = readFileSync(join(WORTEL, 'CLAUDE.md'), 'utf8')
    const ontbreekt = [...inCode].filter((d) => !claude.includes(`\`${d}\``)).sort()
    expect(ontbreekt, 'niet in de canonieke operator-lijst').toEqual([])
  })

  it('CLAUDE.md en AGENTS.md dragen dezelfde lijst', () => {
    // `docs-sync` bewaakt byte-gelijkheid van het hele bestand; deze assertie
    // faalt met een leesbare reden in plaats van een kale diff.
    const a = readFileSync(join(WORTEL, 'CLAUDE.md'), 'utf8')
    const b = readFileSync(join(WORTEL, 'AGENTS.md'), 'utf8')
    for (const doel of inCode) {
      expect(a.split(`\`${doel}\``).length, `${doel} in CLAUDE.md`).toBe(
        b.split(`\`${doel}\``).length,
      )
    }
  })
})

/* ─────────────────────────────────────────────────────────────
   Deel 2 — de EIGENSCHAPPEN, niet alleen de namen.

   Op 2026-09-01 gemeten: `MANUAL_TASKS.md` zei nog "Vier van de vijf" en
   "drie namen", terwijl de code er vijf van de zes en vier namen afvuurt. De
   ontbrekende was `lekken` — de eigenschap waarvóór `Scan Voltooid` bestaat,
   want zonder haar is een scan die nul lekken vindt niet te scheiden van een
   die er vier vindt. Custom properties zijn in Plausible pas zichtbaar nadat
   je ze apart aanmeldt, dus een operator die dat document afwerkt meldt er
   drie aan en mist juist die ene.

   De poort hierboven kon dat niet zien: hij bewaakt doelNAMEN in drie
   richtingen en zegt over eigenschappen niets. De naam van het zesde doel
   kwam er dus onmiddellijk in; zijn eigenschap dreef stil weg.

   WAT DEZE POORT NIET DOET: de WAARDEN van een eigenschap. `tier` krijgt zijn
   waarde uit `${tier.key}`, en die keys staan als lokale union in
   `app/[locale]/pricing/page.tsx` — daarop matchen zou deze poort aan één
   paginabestand vastknopen, en dat is precies het soort koppeling dat breekt
   en daarna wordt uitgezet. De waardelijst in het document is op 2026-09-01
   met de hand gecorrigeerd (hij noemde `email`, verwijderd in #196, en miste
   `migration` en `sales`); dat blijft handwerk.
   ───────────────────────────────────────────────────────────── */

/** Eigenschappen via CSS-klasse staan ACHTER de naam in dezelfde className:
    `plausible-event-name=Pricing+CTA plausible-event-tier=${tier.key}`.
    De `(?!name=)` zorgt dat een tweede doelnaam nooit in de eigenschappen van
    de eerste belandt — anders zouden twee getagde elementen naast elkaar tot
    één doel samensmelten. */
const KLASSE_MET_PROPS =
  /plausible-event-name=([A-Za-z0-9+_-]+)((?:\s+plausible-event-(?!name=)[a-z]+=[^\s"'`]*)*)/g

const KLASSE_PROP = /plausible-event-([a-z]+)=/g

/** Elke eigenschapstag in de bron, ongeacht waar hij staat. Het aantal moet
    gelijk zijn aan wat er achter een naam is opgepikt; zo niet, dan staat er
    een tag VÓÓR zijn doelnaam en zou die stil wegvallen. */
const KLASSE_PROP_LOS = /plausible-event-(?!name=)[a-z]+=/g

/** `plausible?.("Scan Voltooid", { props: { lekken: String(...) } })`.
    Groep 2 is de body van het props-object; één niveau nesting is toegestaan
    zodat een geneste expressie de match niet halverwege afbreekt. */
const SCRIPT_MET_PROPS =
  /plausible(?:\?\.)?\(\s*["']([^"']+)["']\s*(?:,\s*\{\s*props:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\})?/g

const PROP_SLEUTEL = /(?:^|,)\s*([A-Za-z_$][\w$]*)\s*:/g

/** `url` staat wél in de tabel maar wordt door onze code nergens getagd —
    gemeten, en als assertie vastgelegd hieronder. Plausible voegt hem zelf toe
    bij een getagde link. Deze poort kan dus niet bewijzen dát hij meekomt en
    telt hem daarom niet mee. Het document rekent net zo: het spreekt van
    "namen" zonder `url`, en zegt erbij dat `Boeking 15min` niets boven `url`
    draagt. */
const AUTOMATISCH = new Set(['url'])

/** Telwoorden 1 t/m 10, voor de getallen die het document uitschrijft.
    Bewust NIET gedeeld met `TELWOORD_NL` in `lib/lekkage-scan.ts`: die loopt
    van twaalf tot twintig en gaat de andere kant op (getal → woord voor het
    aantal scanvragen). De twee bereiken overlappen nergens, dus er is niets
    dat uit elkaar kan lopen. Delen zou pas winst zijn als iemand ze naar een
    neutrale module verhuist; dat is een refactor, geen poortwerk. */
const WOORD: Readonly<Record<number, string>> = {
  1: 'één',
  2: 'twee',
  3: 'drie',
  4: 'vier',
  5: 'vijf',
  6: 'zes',
  7: 'zeven',
  8: 'acht',
  9: 'negen',
  10: 'tien',
}

function woord(n: number): string {
  const w = WOORD[n]
  if (!w) {
    throw new Error(
      `WOORD kent ${n} niet. Vul de tabel aan in lib/plausible-doelen.test.ts — ` +
        'een stille terugval op een cijfer zou het document en de code uit elkaar laten lopen.',
    )
  }
  return w
}

const metHoofdletter = (w: string) => w[0].toUpperCase() + w.slice(1)

type Vondst = {
  perDoel: Map<string, Set<string>>
  losseTags: number
  achterEenNaam: number
  urlGetagd: number
  viaKlasse: number
  viaScript: number
}

function eigenschappenUitCode(): Vondst {
  const perDoel = new Map<string, Set<string>>()
  let losseTags = 0
  let achterEenNaam = 0
  let urlGetagd = 0
  let viaKlasse = 0
  let viaScript = 0

  const zorgVoor = (doel: string) => {
    if (!perDoel.has(doel)) perDoel.set(doel, new Set<string>())
    return perDoel.get(doel)!
  }

  for (const map of MAPPEN) {
    for (const pad of bronBestanden(join(WORTEL, map))) {
      const bron = zonderCommentaar(readFileSync(pad, 'utf8'))

      for (const m of bron.matchAll(KLASSE_MET_PROPS)) {
        const set = zorgVoor(m[1].replace(/\+/g, ' '))
        for (const p of (m[2] ?? '').matchAll(KLASSE_PROP)) {
          set.add(p[1])
          achterEenNaam++
          viaKlasse++
        }
      }
      losseTags += [...bron.matchAll(KLASSE_PROP_LOS)].length
      urlGetagd += [...bron.matchAll(/plausible-event-url=/g)].length

      for (const m of bron.matchAll(SCRIPT_MET_PROPS)) {
        const set = zorgVoor(m[1])
        for (const p of (m[2] ?? '').matchAll(PROP_SLEUTEL)) {
          set.add(p[1])
          viaScript++
        }
      }
    }
  }
  return { perDoel, losseTags, achterEenNaam, urlGetagd, viaKlasse, viaScript }
}

/** De eigenschappentabel uit `MANUAL_TASKS.md`, plus het proza erboven.
    Conventie in die tabel: eerst de naam tussen backticks, dan een uitleg
    tussen haakjes. De haakjes gaan er hier af vóór het lezen van de namen —
    anders telt een backticked WAARDE (`energy-roi`, `unknown`) als naam mee.
    Een assertie hieronder pint die conventie vast. */
function eigenschappenUitDocumentatie(): { perDoel: Map<string, string[]>; proza: string } {
  const tekst = readFileSync(join(WORTEL, 'MANUAL_TASKS.md'), 'utf8')
  const START = '**Vergeet de custom properties niet.**'
  const EIND = 'Zonder die stap zie je'
  for (const [naam, mark] of [['START', START], ['EIND', EIND]] as const) {
    const n = tekst.split(mark).length - 1
    if (n !== 1) {
      throw new Error(
        `markering ${naam} komt ${n}x voor in MANUAL_TASKS.md (verwacht 1). ` +
          'Is de eigenschappensectie herschreven? Werk deze poort bij.',
      )
    }
  }
  const blok = tekst.slice(tekst.indexOf(START), tekst.indexOf(EIND))
  const perDoel = new Map<string, string[]>()
  for (const rij of blok.matchAll(/^\| `([^`]+)` \| (.+?) \|\s*$/gm)) {
    const zonderUitleg = rij[2].replace(/\([^)]*\)/g, '')
    const props = [...zonderUitleg.matchAll(/`([^`]+)`/g)]
      .map((m) => m[1])
      .filter((p) => !AUTOMATISCH.has(p))
    perDoel.set(rij[1], props)
  }
  return { perDoel, proza: blok }
}

/** De canonieke operator-lijst in `CLAUDE.md` — de lijst die een volgende
    sessie leest. De markering komt precies één keer voor; de historische
    logboekblokken verderop zeggen "drie custom properties" en die mogen niet
    meetellen, want logboekgeschiedenis wordt hier niet herschreven. */
function eigenschappenUitOperatorLijst(bestand: string): string[] {
  const tekst = readFileSync(join(WORTEL, bestand), 'utf8')
  const MARK = 'custom properties ('
  const n = tekst.split(MARK).length - 1
  if (n !== 1) {
    throw new Error(
      `markering "${MARK}" komt ${n}x voor in ${bestand} (verwacht 1). ` +
        'Werk deze poort bij in plaats van de assertie te verzwakken.',
    )
  }
  const na = tekst.slice(tekst.indexOf(MARK) + MARK.length)
  const dicht = na.indexOf(')')
  if (dicht === -1) throw new Error(`geen sluithaakje na de eigenschappenlijst in ${bestand}`)
  return [...na.slice(0, dicht).matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort()
}

describe('Plausible-eigenschappen: code, MANUAL_TASKS.md en CLAUDE.md zeggen hetzelfde', () => {
  const code = eigenschappenUitCode()
  const docs = eigenschappenUitDocumentatie()

  const alleNamen = new Set<string>()
  for (const set of code.perDoel.values()) for (const p of set) alleNamen.add(p)
  const metEigenschappen = [...code.perDoel.values()].filter((s) => s.size > 0).length

  it('vindt eigenschappen in beide aanroepvormen — anders meet deze poort niets', () => {
    // Positieve controle. Een lege uitkomst uit een kapotte regex leest
    // hetzelfde als een schone meting.
    expect(code.viaKlasse, 'geen eigenschap via CSS-klasse gevonden').toBeGreaterThan(0)
    expect(code.viaScript, 'geen eigenschap via window.plausible() gevonden').toBeGreaterThan(0)
  })

  it('geen enkele eigenschapstag staat buiten zijn doelnaam', () => {
    expect(
      code.achterEenNaam,
      'er staat een plausible-event-<prop>= die niet achter een plausible-event-name= volgt; ' +
        'die zou stil wegvallen uit deze meting',
    ).toBe(code.losseTags)
  })

  it('`url` wordt nergens door onze code getagd — dat grondt de uitzondering', () => {
    // Zodra iemand `url` wél expliciet tagt, klopt de aanname onder
    // AUTOMATISCH niet meer en moet die uitzondering opnieuw beoordeeld.
    expect(code.urlGetagd, 'plausible-event-url= gevonden; herzie AUTOMATISCH').toBe(0)
  })

  it('leest namen uit de tabel en geen waarden', () => {
    // `Tool CTA` draagt in het document `tool` (`energy-roi`) — de tweede is
    // een waarde tussen haakjes. Valt het strippen van haakjes weg, dan telt
    // hij als eigenschapsnaam mee en gaat deze assertie af.
    expect(docs.perDoel.get('Tool CTA')).toEqual(['tool'])
  })

  it('elk doel draagt in de code en in MANUAL_TASKS.md dezelfde eigenschappen', () => {
    const afwijking: string[] = []
    for (const [doel, set] of code.perDoel) {
      const inCode = [...set].sort()
      const inDocs = (docs.perDoel.get(doel) ?? []).slice().sort()
      if (JSON.stringify(inCode) !== JSON.stringify(inDocs)) {
        afwijking.push(`${doel}: code [${inCode}] vs docs [${inDocs}]`)
      }
    }
    expect(afwijking, 'eigenschappen lopen uiteen — de operator meldt de verkeerde aan').toEqual([])
  })

  it('de tabel noemt geen doel dat de code niet kent', () => {
    const wees = [...docs.perDoel.keys()].filter((d) => !code.perDoel.has(d)).sort()
    expect(wees, 'gedocumenteerd maar nergens afgevuurd').toEqual([])
  })

  it('de twee getallen in het proza volgen uit de code', () => {
    // Dit is het defect zelf: het document zei "Vier van de vijf" en "drie
    // namen" terwijl het er vijf van de zes en vier waren.
    const totaal = code.perDoel.size
    expect(docs.proza).toContain(
      `${metHoofdletter(woord(metEigenschappen))} van de ${woord(totaal)} sturen`,
    )
    expect(docs.proza).toContain(`Het blijven ${woord(alleNamen.size)} namen`)
  })

  it('CLAUDE.md draagt dezelfde eigenschappen, met hetzelfde telwoord', () => {
    const claude = readFileSync(join(WORTEL, 'CLAUDE.md'), 'utf8')
    expect(eigenschappenUitOperatorLijst('CLAUDE.md')).toEqual([...alleNamen].sort())
    expect(claude, 'telwoord in de meetketen').toContain(
      `de ${woord(alleNamen.size)} custom properties (`,
    )
  })

  it('CLAUDE.md en AGENTS.md dragen dezelfde eigenschappen', () => {
    expect(eigenschappenUitOperatorLijst('AGENTS.md')).toEqual(
      eigenschappenUitOperatorLijst('CLAUDE.md'),
    )
  })
})
