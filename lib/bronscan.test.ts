import { describe, it, expect } from 'vitest'
import { zonderCommentaar } from './bronscan'

describe('zonderCommentaar', () => {
  it('verbergt geen echte aanroep', () => {
    // Zonder deze assertie kan de strip stilletjes alles wegvegen en slagen
    // alle poorten die hem gebruiken altijd — de klassieke lege-lijst-uit-een-
    // kapot-instrument. Beide richtingen: prose eruit, code erin.
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

  it('laat een inline staart met rust', () => {
    // Dit is de bewuste keuze: een trailing comment kan de poort laten
    // afgaan. Dat is de prijs voor nooit stil een echte regel wegknippen.
    expect(zonderCommentaar('const x = 1 // process.env.GEHEIM')).toContain('GEHEIM')
  })

  it('sluit een blok dat op één regel begint en eindigt', () => {
    const bron = zonderCommentaar(['/* weg */', 'const blijft = 1'].join('\n'))
    expect(bron).not.toContain('weg')
    expect(bron).toContain('blijft')
  })

  it('houdt het regelaantal gelijk', () => {
    // Poorten die op regelnummers rapporteren zouden anders naar de verkeerde
    // regel wijzen.
    const in_ = ['a', '// b', 'c', '/* d', 'e */', 'f'].join('\n')
    expect(zonderCommentaar(in_).split('\n')).toHaveLength(6)
  })
})
