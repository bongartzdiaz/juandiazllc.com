import { describe, it, expect } from 'vitest'
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { leesBron, leesBronZonderCommentaar } from './bronscan'

/* ─────────────────────────────────────────────────────────────
   DEKKING, niet overeenstemming.

   `lib/plausible-doelen.test.ts` toetst in vijf richtingen dat de doelen in de
   code, in `MANUAL_TASKS.md` en in `CLAUDE.md` hetzelfde zeggen. Die poort
   stond groen terwijl de nieuwsbrief-opt-in — twee formulieren die een rij naar
   `marketing.subscribers` schrijven — NUL doelen afvuurde. Hij kón het niet
   zien: de nieuwsbrief stond in geen van beide lijsten, dus klopten ze
   onderling perfect.

   Een consistentiepoort bewaakt dat twee bronnen hetzelfde zeggen. Hij kan niet
   zien dat ze allebei iets verzwijgen. Daarvoor is een DERDE bron nodig die van
   allebei onafhankelijk is, en die is er: de databaseschrijving zelf.

   De regel die deze poort bewaakt:

     Schrijft een server-actie een rij naar het `marketing`-schema, dan vuurt
     elke client-component die hem aanroept minstens één Plausible-doel af.

   Hij zegt met opzet NIETS over wélk doel. Dat is het werk van de poort
   hiernaast; twee poorten die hetzelfde toetsen lopen uiteen en dan bewaakt de
   zwakste. Deze telt alleen: is er dekking, ja of nee.

   WAT HIJ NIET DEKT, en dat staat hier zodat niemand denkt van wel. Een
   conversie die via een api-route binnenkomt heeft geen client-component die
   hem aanroept, en valt dus buiten de regel hierboven. Die routes gebruiken de
   service-rol-client; `SERVICE_SCHRIJVERS` hieronder pint ze vast, zodat een
   vijfde een zichtbare bewerking kost in plaats van stil een gat te openen.

   Die lijst telt er vier en niet drie, en dat is de poort zelf die het op zijn
   eerste run aanwees: `app/api/newsletter/confirm/route.ts` schrijft ook naar
   marketing en stond in geen enkele lijst die ik met de hand had opgeschreven.
   Precies waarvoor een derde bron er is.
   ───────────────────────────────────────────────────────────── */

const WORTEL = join(__dirname, '..')

/** De gebruikersclient bindt het marketing-schema (`lib/supabase/server.ts`,
    `db: { schema: MARKETING_SCHEMA }`). Elke `.from()` daarop schrijft of leest
    dus in dat schema — dát is het feit waarop deze poort matcht, en niet een
    naam in een lijst. */
const GEBRUIKT_MARKETING_CLIENT =
  /import\s*\{[^}]*\bcreateClient\b[^}]*\}\s*from\s*["']@\/lib\/supabase\/server["']/

/** De tabel waarin geschreven wordt. Alleen voor de foutmelding: de poort
    beslist niets op de naam, want dan zou een zesde tabel stil wegvallen. */
const TABEL = /\.from\(\s*["']([a-z_]+)["']/g

/** Dezelfde vorm, zonder `g`. Een globale regex houdt `lastIndex` vast, dus
    `TABEL.test(a)` gevolgd door `TABEL.test(b)` geeft afwisselend true en
    false — een scanner die op even bestanden wél en op oneven niet matcht. */
const TABEL_EENMALIG = /\.from\(\s*["'][a-z_]+["']/

/** Een component die in de browser draait. Zonder `"use client"` kan er geen
    effect en dus geen doel zijn — en dan is het ook geen knop. */
const IS_CLIENT = /^\s*["']use client["']/

/** Beide aanroepvormen, exact zoals de doelenpoort ze kent: het script en de
    CSS-klasse. Wie alleen op de klassenaam grept vindt de conversiedoelen niet,
    en dat is precies hoe `Contact Submitted` maandenlang ontbrak. */
const VUURT_DOEL = [/plausible(?:\?\.)?\(\s*["']/, /plausible-event-name=/]

/** Server-acties die naar `marketing` schrijven maar geen knop hebben, met de
    reden. Een lege lijst is het doel; een regel hier is een schuld. */
const ZONDER_SURFACE: Record<string, string> = {
  'app/actions/newsletter.ts':
    'dode code. Schrijft naar `newsletter_subs`, een tabel die in geen enkel ' +
    'schema bestaat; de dubbele opt-in is op 2026-07-21 vervangen door ' +
    '`subscribe.ts`. Nul aanroepers, dus nul knoppen om te meten.',
}

/** Routes die via de SERVICE-rol naar `marketing` schrijven. Geen van drieën
    heeft een knop: een webhook van buiten, een cron, en een uitschrijflink die
    juist géén conversie is. Ze staan hier zodat een vierde opvalt. */
const SERVICE_SCHRIJVERS: Record<string, string> = {
  'app/api/cal/route.ts':
    'cal.com belt ons na een boeking. De conversie gebeurt op cal.com, dus er ' +
    'is hier geen klik om af te vuren — `Boeking 15min` hangt aan de knop die ' +
    'de bezoeker naar cal.com stuurt.',
  'app/api/campagne/scan-reeks/route.ts':
    'cron. Verstuurt de scan-reeks en stempelt de rij; geen bezoeker aanwezig.',
  'app/api/uitschrijven/route.ts':
    'de uitschrijflink. Het tegenovergestelde van een conversie, dus er valt '  +
    'niets te meten wat een doel zou verdienen.',
  'app/api/newsletter/confirm/route.ts':
    'dode code, dezelfde tak als `app/actions/newsletter.ts`. Raakt alleen ' +
    '`newsletter_subs`, een tabel die in geen enkel schema bestaat; de ' +
    'bevestigingslink is sinds 2026-07-21 door niets meer verstuurd.',
}

const SERVICE_CLIENT = /from\s*["']@\/lib\/supabase\/service["']/

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

const relatief = (pad: string) => pad.slice(WORTEL.length + 1).replace(/\\/g, '/')

/** Elke server-actie die op de marketing-client een `.from()` doet. */
function conversieActies(): Map<string, string[]> {
  const uit = new Map<string, string[]>()
  for (const pad of bronBestanden(join(WORTEL, 'app', 'actions'))) {
    const bron = leesBronZonderCommentaar(pad)
    if (!GEBRUIKT_MARKETING_CLIENT.test(bron)) continue
    const tabellen = [...new Set([...bron.matchAll(TABEL)].map((m) => m[1]))].sort()
    if (tabellen.length) uit.set(relatief(pad), tabellen)
  }
  return uit
}

/** Client-componenten die zo'n actie importeren, met of ze een doel afvuren. */
function surfaces(acties: Iterable<string>): Map<string, { pad: string; vuurt: boolean }[]> {
  const perActie = new Map<string, { pad: string; vuurt: boolean }[]>()
  for (const actie of acties) perActie.set(actie, [])

  const modulenaam = (actie: string) => '@/' + actie.replace(/\.ts$/, '')

  for (const map of ['app', 'components']) {
    for (const pad of bronBestanden(join(WORTEL, map))) {
      const ruw = leesBron(pad)
      if (!IS_CLIENT.test(ruw)) continue
      const bron = leesBronZonderCommentaar(pad)
      const vuurt = VUURT_DOEL.some((r) => r.test(bron))
      for (const actie of perActie.keys()) {
        const naam = modulenaam(actie)
        if (bron.includes(`"${naam}"`) || bron.includes(`'${naam}'`)) {
          perActie.get(actie)!.push({ pad: relatief(pad), vuurt })
        }
      }
    }
  }
  return perActie
}

describe('conversiedekking: wie een rij wegschrijft, meet dat ook', () => {
  const acties = conversieActies()
  const perActie = surfaces(acties.keys())

  it('vindt conversie-acties — anders toetst alles hieronder niets', () => {
    // Positieve controle. Een lege verzameling uit een kapotte regex geeft
    // hieronder overal een schone uitkomst, en dat leest identiek aan dekking.
    expect(acties.size, 'geen enkele server-actie die naar marketing schrijft').toBeGreaterThan(0)
  })

  it('vindt client-componenten — idem', () => {
    const totaal = [...perActie.values()].reduce((n, v) => n + v.length, 0)
    expect(totaal, 'geen enkele client-component die zo n actie importeert').toBeGreaterThan(0)
  })

  it('elke conversie-actie heeft een knop, of staat met reden op de lijst', () => {
    const wees = [...acties.keys()]
      .filter((a) => perActie.get(a)!.length === 0 && !(a in ZONDER_SURFACE))
      .sort()
    expect(
      wees,
      'schrijft naar marketing maar wordt door geen enkele client-component ' +
        'aangeroepen. Is dat terecht, zet hem dan in ZONDER_SURFACE met de reden',
    ).toEqual([])
  })

  it('de uitzonderingslijst dekt geen actie die wél een knop heeft', () => {
    // Anders schakelt een verouderde vrijstelling deze poort stil uit voor
    // precies het bestand waar hij over gaat. Zie feedback_een_lijst_twee_zorgen.
    const overbodig = Object.keys(ZONDER_SURFACE)
      .filter((a) => (perActie.get(a)?.length ?? 0) > 0)
      .sort()
    expect(overbodig, 'staat op ZONDER_SURFACE maar heeft aanroepers — haal hem eraf').toEqual([])
  })

  it('ZONDER_SURFACE noemt geen bestand dat niet meer bestaat', () => {
    const verdwenen = Object.keys(ZONDER_SURFACE)
      .filter((a) => !existsSync(join(WORTEL, a)))
      .sort()
    expect(verdwenen, 'vrijstelling voor een bestand dat weg is').toEqual([])
  })

  it('DIT IS DE REGEL: elke knop op een conversie-actie vuurt een doel af', () => {
    const stil: string[] = []
    for (const [actie, lijst] of perActie) {
      for (const { pad, vuurt } of lijst) {
        if (!vuurt) stil.push(`${pad} roept ${actie} aan en vuurt geen doel af`)
      }
    }
    expect(
      stil.sort(),
      'deze component schrijft een rij weg zonder hem te meten — de conversie ' +
        'is dan alleen in de database te zien en nergens in het dashboard',
    ).toEqual([])
  })

  it('de service-rol-schrijvers zijn precies de gedocumenteerde vier', () => {
    // Die routes vallen buiten de regel hierboven omdat ze geen knop hebben.
    // Een vierde is een beslissing, geen detail.
    // Een conversie-actie mag hier NIET meetellen, ook niet als hij beide
    // clients importeert -- `app/actions/newsletter.ts` doet precies dat. Hij
    // valt onder de regel hierboven, en dubbel tellen zou hem in twee lijsten
    // zetten die daarna uit elkaar lopen.
    const gevonden = bronBestanden(join(WORTEL, 'app'))
      .filter((p) => {
        const bron = leesBronZonderCommentaar(p)
        return SERVICE_CLIENT.test(bron) && TABEL_EENMALIG.test(bron)
      })
      .map(relatief)
      .filter((p) => !acties.has(p))
      .sort()
    expect(
      gevonden,
      'nieuwe route die met de service-rol naar marketing schrijft. Heeft hij ' +
        'een knop, dan hoort er een doel bij; zo niet, zet hem in SERVICE_SCHRIJVERS',
    ).toEqual(Object.keys(SERVICE_SCHRIJVERS).sort())
  })

  it('elke vrijstelling draagt een reden van betekenis', () => {
    // Een lege reden is geen reden; dan is de lijst een sluiproute.
    for (const [pad, reden] of [
      ...Object.entries(ZONDER_SURFACE),
      ...Object.entries(SERVICE_SCHRIJVERS),
    ]) {
      expect(reden.trim().length, `${pad} heeft een te korte reden`).toBeGreaterThan(40)
    }
  })
})
