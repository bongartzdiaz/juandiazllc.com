import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { zonderCommentaar } from '../bronscan'
import { DICT, LOCALES } from './dict'

/* ─────────────────────────────────────────────────────────────
   Een server action mag geen kale gebruikerstekst teruggeven.

   Gemeten op 2026-08-24, tijdens een end-to-end meting van de leadketen: na
   een geslaagde inzending op `/nl` stond er "Got it. I'll come back to you
   within 24 hours." De kop erboven was wél vertaald (`contact.sent` →
   "✓ Verzonden"), de zin eronder niet — Engels op precies het moment dat een
   bezoeker converteert, en hetzelfde op /de en /es.

   Waarom geen bestaande poort dit ving: de i18n-poorten lezen `dict.ts` en de
   componenten. Een server action geeft zijn tekst terug als *returnwaarde*,
   dus die string reist als data en niet als kopij — syntactisch onzichtbaar
   voor elke scanner die naar `t(...)` of naar het woordenboek kijkt.

   De actie kende de taal trouwens al: `readLocale()` stond er, alleen ging
   die waarde uitsluitend naar `metadata.locale` voor de bevestigingsmail.
   ───────────────────────────────────────────────────────────── */

const WORTEL = join(__dirname, '..', '..')
const ACTIES = join(WORTEL, 'app', 'actions')

/** Bestanden die geen enkele afnemer meer hebben. De vrijstelling draagt een
    voorwaarde die hem ongeldig maakt zodra dat verandert: zie de test
    hieronder die eist dat er nul importeurs zijn. Een vrijstelling die zijn
    eigen reden overleeft, is hoe dood gewicht levend gewicht wordt. */
const ZONDER_AFNEMER: Record<string, string> = {
  'newsletter.ts':
    'dode dubbele-opt-in: schrijft naar `newsletter_subs`, een tabel die in ' +
    'geen enkel schema bestaat. Het bestand documenteert in zijn eigen kop ' +
    'hoe je het terugzet, dus het blijft staan in plaats van verwijderd.',
}

/** `message:` gevolgd door een stringliteral — dus niet door `translate(...)`. */
const KALE_TEKST = /message:\s*["'`]/g

/** De sleutels die een actie werkelijk opvraagt. */
const GEBRUIKTE_SLEUTEL = /translate\(\s*locale\s*,\s*["']([^"']+)["']/g

function actieBestanden(): string[] {
  if (!existsSync(ACTIES)) return []
  return readdirSync(ACTIES)
    .filter((n) => n.endsWith('.ts') && !n.includes('.test.'))
    .filter((n) => statSync(join(ACTIES, n)).isFile())
}

function bron(naam: string): string {
  return zonderCommentaar(readFileSync(join(ACTIES, naam), 'utf8'))
}

/** Importeert deze bron `app/actions/<stam>`, statisch of dynamisch?

    Anker op de importsyntaxis en niet op het kale woord. De eerste versie van
    deze poort viel op een comment in NewsletterForm.tsx die
    `app/actions/newsletter.ts` juist noemt om uit te leggen waarom het
    formulier hem NIET gebruikt. Vierde keer deze maand dat een tekstscan op
    proza valt; vandaar twee verdedigingen naast elkaar, want elk dekt een
    geval dat de ander mist -- commentaar strippen vangt een comment die een
    importregel citeert, importsyntaxis vangt een los woord in echte code. */
function importeertActie(bron: string, stam: string): boolean {
  const patroon =
    '(?:from|import\\()\\s*["\'`][^"\'`]*actions/' + stam + '(?:\\.[a-z]+)?["\'`]'
  return new RegExp(patroon).test(bron)
}

/** Elk bestand buiten app/actions dat deze actie importeert, repo-relatief. */
function afnemersVan(stam: string): string[] {
  const wortel = WORTEL.split(sep).join('/')
  return ['app', 'components', 'lib']
    .flatMap((m) => alleBronnen(join(WORTEL, m)))
    .filter((p) => !p.includes('/app/actions/'))
    .filter((p) => importeertActie(zonderCommentaar(readFileSync(p, 'utf8')), stam))
    .map((p) => p.slice(wortel.length + 1))
}

/** Elk bestand onder app, components en lib, om importeurs te tellen. */
function alleBronnen(map: string, uit: string[] = []): string[] {
  if (!existsSync(map)) return uit
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam)
    if (statSync(pad).isDirectory()) {
      if (naam !== 'node_modules') alleBronnen(pad, uit)
    } else if (/\.(ts|tsx)$/.test(naam) && !naam.includes('.test.')) {
      uit.push(pad.split(sep).join('/'))
    }
  }
  return uit
}

describe('server actions antwoorden in de taal van de bezoeker', () => {
  const bestanden = actieBestanden()

  it('vindt de actiebestanden — anders meet deze poort niets', () => {
    expect(bestanden.length, 'geen enkel bestand in app/actions').toBeGreaterThan(0)
  })

  it('de scanner herkent kale tekst werkelijk', () => {
    // Positieve controle. Zonder deze assertie is een lege overtredingslijst
    // uit een kapotte regex niet te onderscheiden van een schone meting.
    const geplant = 'return { status: "ok", message: "Bare English." };'
    const vertaald = 'return { status: "ok", message: translate(locale, "form.ok.lead") };'
    expect([...geplant.matchAll(KALE_TEKST)]).toHaveLength(1)
    expect([...vertaald.matchAll(KALE_TEKST)]).toHaveLength(0)
  })

  it('geen kale gebruikerstekst in een levende actie', () => {
    const overtreders = bestanden
      .filter((naam) => !(naam in ZONDER_AFNEMER))
      .flatMap((naam) =>
        [...bron(naam).matchAll(KALE_TEKST)].map(() => naam),
      )
    expect(overtreders, 'geef de tekst terug via translate(locale, "form.…")').toEqual([])
  })

  it('elke vrijstelling heeft nog steeds nul afnemers', () => {
    // De voorwaarde onder de vrijstelling. Wordt zo'n actie weer ergens
    // geïmporteerd, dan valt deze test om en moet de tekst alsnog vertaald.
    for (const [naam, reden] of Object.entries(ZONDER_AFNEMER)) {
      expect(reden.length, `${naam} zonder reden vrijgesteld`).toBeGreaterThan(20)
      const stam = naam.replace(/\.ts$/, '')
      const importeurs = afnemersVan(stam)
      expect(importeurs, `${naam} wordt weer gebruikt — vrijstelling vervalt`).toEqual([])
    }
  })

  it('de afnemer-scanner vindt een levende import werkelijk', () => {
    // Positieve controle bij de test hierboven. `subscribe.ts` heeft twee
    // afnemers; vindt de scanner die niet, dan is zijn lege uitkomst voor een
    // vrijgesteld bestand geen meting maar een kapot instrument.
    expect(afnemersVan('subscribe').sort()).toEqual([
      'components/NewsletterForm.tsx',
      'components/sections/CtaBig.tsx',
    ])
  })

  it('elk formulier stuurt de taal mee naar een taalbewuste actie', () => {
    // Dit is de assertie die het gemeten defect dekt. De actie kan perfect
    // vertalen; stuurt het formulier geen `locale`, dan leest readLocale een
    // lege waarde, valt terug op "en", en antwoordt Engels op /nl -- zonder
    // een fout, zonder een log. Zo stond CtaBig.tsx erbij terwijl
    // NewsletterForm.tsx dezelfde actie al correct aanriep.
    //
    // Welke acties taalbewust zijn wordt afgeleid uit de code en niet
    // ingetypt: een tweede lijst naast de eerste is precies de bugklasse
    // waarover dit bestand gaat.
    const taalbewust = bestanden
      .filter((naam) => /readLocale\(\s*formData\.get\(\s*["']locale["']/.test(bron(naam)))
      .map((naam) => naam.replace(/\.ts$/, ''))
    expect(taalbewust.length, 'geen enkele actie leest de taal').toBeGreaterThan(0)

    const zonderVeld: string[] = []
    for (const stam of taalbewust) {
      for (const afnemer of afnemersVan(stam)) {
        const markup = readFileSync(join(WORTEL, afnemer), 'utf8')
        if (!/name=["']locale["']/.test(markup)) zonderVeld.push(`${afnemer} -> ${stam}`)
      }
    }
    expect(zonderVeld.sort(), 'voeg <input type="hidden" name="locale" .../> toe').toEqual([])
  })

  it('elke opgevraagde sleutel bestaat in alle vier de woordenboeken', () => {
    const sleutels = new Set(
      bestanden.flatMap((naam) =>
        [...bron(naam).matchAll(GEBRUIKTE_SLEUTEL)].map((m) => m[1]),
      ),
    )
    expect(sleutels.size, 'geen enkele vertaalde tekst gevonden').toBeGreaterThan(0)
    const ontbreekt: string[] = []
    for (const sleutel of sleutels) {
      for (const taal of LOCALES) {
        // Op DICT[taal] asserteren en niet via translate(): die valt terug op
        // Engels, dus een ontbrekende Duitse sleutel zou onzichtbaar blijven.
        if (!DICT[taal][sleutel]) ontbreekt.push(`${taal}:${sleutel}`)
      }
    }
    expect(ontbreekt.sort()).toEqual([])
  })

  it('de vier talen geven elk een eigen tekst', () => {
    // Een sleutel die in vier woordenboeken staat maar viermaal dezelfde
    // Engelse zin draagt, is niet vertaald — alleen gekopieerd.
    const sleutels = new Set(
      bestanden.flatMap((naam) =>
        [...bron(naam).matchAll(GEBRUIKTE_SLEUTEL)].map((m) => m[1]),
      ),
    )
    const gelijk: string[] = []
    for (const sleutel of sleutels) {
      const waarden = LOCALES.map((l) => DICT[l][sleutel])
      if (new Set(waarden).size !== LOCALES.length) gelijk.push(sleutel)
    }
    expect(gelijk.sort(), 'zelfde tekst in meerdere talen').toEqual([])
  })
})
