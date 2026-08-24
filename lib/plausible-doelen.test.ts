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
const VERWACHT_AANTAL = 5

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
