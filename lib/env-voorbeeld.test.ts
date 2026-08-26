import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, sep } from 'node:path'
import { zonderCommentaar } from './bronscan'

/* ─────────────────────────────────────────────────────────────
   `.env.example` moet zeggen wat de code werkelijk leest.

   Op 2026-08-21 gemeten en het klopte in geen van beide richtingen:
   zevenentwintig variabelen stonden erin die geen regel code nog las (het
   CRM vertrok met #134/#138 en nam Prisma, NextAuth, Stripe, Twilio en de
   agenda-OAuth mee), en dertien die de site wél leest ontbraken.

   Eén daarvan was `CAL_WEBHOOK_SECRET`. Die stond nergens gedocumenteerd,
   werd dus nooit in Vercel gezet, en de boekingswebhook gaf op productie
   stil 503 — de hoofd-CTA van de site leverde geen enkele lead-rij op. Het
   defect was niet de code maar het document dat je erbij pakt.
   ───────────────────────────────────────────────────────────── */

/** Mappen met geleverde code. Testbestanden tellen NIET mee: een variabele
    die alleen in een test voorkomt wordt nergens gelezen, en zou hier anders
    als "in gebruik" gelden. Zelfde les als bij de wees-sleutelpoort. */
const MAPPEN = ['app', 'lib', 'scripts', 'components', 'hooks']
const LOSSE = ['proxy.ts', 'next.config.ts', 'instrumentation.ts']

/** Variabelen die het platform zelf zet. Ze horen niet in `.env.example`,
    want niemand hoeft ze in te vullen — en een lezer die ze daar ziet gaat
    ze zetten, wat erger is dan ze weglaten. Reden verplicht. */
const DOOR_PLATFORM: Record<string, string> = {
  NODE_ENV: 'Node/Next zetten dit zelf; handmatig zetten breekt de build-modus.',
  NEXT_RUNTIME: 'Next zet dit per runtime (nodejs | edge) tijdens het bouwen.',
  VERCEL_GIT_COMMIT_SHA:
    'Vercel zet dit per deploy; met de hand zetten liegt over welke commit draait.',
}

function bronBestanden(map: string, uit: string[] = []): string[] {
  if (!existsSync(map)) return uit
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam)
    if (statSync(pad).isDirectory()) {
      if (naam !== 'node_modules') bronBestanden(pad, uit)
    } else if (/\.(ts|tsx|mjs|js)$/.test(naam) && !naam.includes('.test.')) {
      uit.push(pad.split(sep).join('/'))
    }
  }
  return uit
}

const bestanden = [...MAPPEN.flatMap((m) => bronBestanden(m)), ...LOSSE.filter(existsSync)]

/** Naam → bestanden die hem lezen. Op de bron ZONDER commentaar, want de kop
    van lib/supabase/keys.ts noemt `process.env.NEXT_PUBLIC_X` als voorbeeld
    en dat is geen variabele. */
const gelezen = new Map<string, string[]>()
for (const pad of bestanden) {
  const bron = zonderCommentaar(readFileSync(pad, 'utf8'))
  for (const m of bron.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) {
    const lijst = gelezen.get(m[1]) ?? []
    if (!lijst.includes(pad)) lijst.push(pad)
    gelezen.set(m[1], lijst)
  }
}

const voorbeeld = new Set(
  [...readFileSync('.env.example', 'utf8').matchAll(/^([A-Z_][A-Z0-9_]*)=/gm)].map((m) => m[1]),
)

describe('.env.example tegenover de code', () => {
  it('vindt bronbestanden en variabelen überhaupt', () => {
    // Zonder deze assertie zou een verkeerd pad lege verzamelingen geven en
    // slaagt alles hieronder triviaal.
    expect(bestanden.length).toBeGreaterThan(50)
    expect(gelezen.size).toBeGreaterThanOrEqual(10)
    expect(voorbeeld.size).toBeGreaterThanOrEqual(10)
  })

  it('elke variabele die de code leest staat in .env.example', () => {
    const ontbreekt = [...gelezen.keys()]
      .filter((n) => !voorbeeld.has(n) && !DOOR_PLATFORM[n])
      .map((n) => `${n} (gelezen in ${gelezen.get(n)!.join(', ')})`)
    expect(ontbreekt, 'gelezen maar niet gedocumenteerd').toEqual([])
  })

  it('elke variabele in .env.example wordt ergens gelezen', () => {
    // De andere richting, en die was het ergste weggedreven. Een dode regel
    // hier is geen ruis: iemand die de lijst afwerkt zet Stripe- en
    // Twilio-sleutels voor een systeem dat hier niet meer woont.
    const ongelezen = [...voorbeeld].filter((n) => !gelezen.has(n))
    expect(ongelezen, 'gedocumenteerd maar nergens gelezen').toEqual([])
  })

  it('geen bestand leest een variabele via process.env[...]', () => {
    // Precies zo werd CAL_WEBHOOK_SECRET onzichtbaar: `process.env[SECRET_ENV]`
    // compileert prima, werkt prima, en draagt geen naam die een scanner kan
    // vinden. Voor NEXT_PUBLIC_* is het bovendien een echt defect, want Next
    // vervangt alleen letterlijke uitdrukkingen bij het bouwen.
    const overtreders = bestanden.filter((pad) =>
      zonderCommentaar(readFileSync(pad, 'utf8')).includes('process.env['),
    )
    expect(overtreders, 'leest env via bracket-toegang').toEqual([])
  })

  it('de platform-uitzonderingen staan NIET in .env.example', () => {
    // De toelichting bij DOOR_PLATFORM zegt dit al, en tot 2026-08-26 dwong
    // niets het af — de klasse 'een toelichting beschrijft een controle die
    // niet bestaat'. De andere twee asserties vangen het niet: een
    // platformvariabele WORDT gelezen, dus 'gedocumenteerd maar nergens
    // gelezen' blijft groen terwijl een lezer hem gaat invullen.
    const teveel = Object.keys(DOOR_PLATFORM).filter((naam) => voorbeeld.has(naam))
    expect(teveel, 'platformvariabele staat in .env.example').toEqual([])
  })

  it('de platform-uitzonderingen dragen allemaal een reden', () => {
    for (const [naam, reden] of Object.entries(DOOR_PLATFORM)) {
      expect(reden.length, naam).toBeGreaterThan(20)
    }
  })

  it('CAL_WEBHOOK_SECRET staat erin', () => {
    // Geen algemene regel maar een naam, met opzet. Deze ene ontbrak, de
    // boekingsketen stond daardoor donker, en dat mag niet stil terugkomen.
    expect(voorbeeld.has('CAL_WEBHOOK_SECRET')).toBe(true)
    expect(gelezen.get('CAL_WEBHOOK_SECRET')).toContain('app/api/cal/route.ts')
  })
})
