/* ─────────────────────────────────────────────────────────────
   Hulpjes voor poorten die broncode als tekst doorzoeken.

   Meerdere poorten in deze repo lezen bestanden en zoeken naar een patroon.
   Dat werkt, maar een tekstscan kan geen code van prose onderscheiden, en op
   2026-08-21 viel dat drie keer op een commentaarregel die het patroon juist
   uitlégde. Deze module staat er zodat die correctie op één plek leeft — twee
   kopieën van dezelfde strip lopen uiteen, en dan bewaakt de zwakste.
   ───────────────────────────────────────────────────────────── */

import { readFileSync } from 'node:fs'

/* ─────────────────────────────────────────────────────────────
   GEMEMOISEERD LEZEN — waarom dit hier staat

   Veertien poorten lopen de bronboom af (app, components, lib, scripts: 244
   bestanden, 2,0 MiB) en lezen elk bestand opnieuw. De wandeling zelf staat in
   de meeste van die poorten al op modulniveau en gebeurt dus één keer; het
   LEZEN staat in een hulpfunctie die per `it()` wordt aangeroepen. Bij twee
   tests betekent dat twee keer 2,0 MiB van schijf, bij vier tests vier keer.

   Gemeten op 2026-09-22, op een stille machine: één wandeling kost 23 ms, het
   lezen van dezelfde 244 bestanden 149 ms. De zwaarste poorten liepen daardoor
   op 1,4 tot 1,7 seconde tegen een vitest-standaard van 5 s — ruim drie keer
   marge, tot de machine bezet is. Met drie gelijktijdige vitest-runs viel er
   prompt een om met `Test timed out in 5000ms`.

   Een bronbestand verandert niet tijdens een testrun: geen enkele test in deze
   repo schrijft naar de schijf of start een subproces (gemeten, niet aangenomen
   — `writeFileSync`, `execSync` en `spawnSync` komen in geen enkel testbestand
   voor). Daarom mag het antwoord bewaard blijven.
   ───────────────────────────────────────────────────────────── */

const gelezen = new Map<string, string>()

/** `readFileSync(pad, 'utf8')`, één keer per pad per proces.

    Identiek aan een rechtstreekse aanroep — zelfde tekst, zelfde fout als het
    bestand niet bestaat. Alleen de tweede en volgende aanroep is gratis. */
export function leesBron(pad: string): string {
  const eerder = gelezen.get(pad)
  if (eerder !== undefined) return eerder
  const tekst = readFileSync(pad, 'utf8')
  gelezen.set(pad, tekst)
  return tekst
}

const gestript = new Map<string, string>()

/** `zonderCommentaar(leesBron(pad))`, ook gememoiseerd — die strip loopt per
    regel over het hele bestand en werd in vier poorten per test herhaald. */
export function leesBronZonderCommentaar(pad: string): string {
  const eerder = gestript.get(pad)
  if (eerder !== undefined) return eerder
  const tekst = zonderCommentaar(leesBron(pad))
  gestript.set(pad, tekst)
  return tekst
}

/** Bron zonder commentaarregels en zonder blokcommentaar.

    Bewust alleen HELE commentaarregels en blokken, geen inline `//`-staarten:
    knip je op de eerste `//` in een regel, dan haalt een `'https://…'` in een
    stringliteral de rest van die regel weg en kan de poort een echte aanroep
    missen. Een poort die soms te veel meldt is te repareren; eentje die stil
    te weinig meldt niet. */
export function zonderCommentaar(bron: string): string {
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
