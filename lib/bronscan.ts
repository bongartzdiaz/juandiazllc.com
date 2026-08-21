/* ─────────────────────────────────────────────────────────────
   Hulpjes voor poorten die broncode als tekst doorzoeken.

   Meerdere poorten in deze repo lezen bestanden en zoeken naar een patroon.
   Dat werkt, maar een tekstscan kan geen code van prose onderscheiden, en op
   2026-08-21 viel dat drie keer op een commentaarregel die het patroon juist
   uitlégde. Deze module staat er zodat die correctie op één plek leeft — twee
   kopieën van dezelfde strip lopen uiteen, en dan bewaakt de zwakste.
   ───────────────────────────────────────────────────────────── */

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
