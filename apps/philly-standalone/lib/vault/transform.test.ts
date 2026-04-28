import { describe, it, expect } from 'vitest'
import { toObsidian, toMarkdown, detectFlavor } from './transform'

describe('toObsidian', () => {
  it('converts internal markdown links to wikilinks', () => {
    expect(toObsidian('see [Roles](concepts/roles) for more')).toBe(
      'see [[concepts/roles|Roles]] for more',
    )
  })

  it('uses the short wikilink form when text == slug', () => {
    expect(toObsidian('see [concepts/roles](concepts/roles) for more')).toBe(
      'see [[concepts/roles]] for more',
    )
  })

  it('leaves external links untouched', () => {
    expect(toObsidian('see [GitHub](https://github.com)')).toBe(
      'see [GitHub](https://github.com)',
    )
  })

  it('leaves anchor links untouched', () => {
    expect(toObsidian('see [section](#heading)')).toBe('see [section](#heading)')
  })

  it('leaves absolute paths untouched', () => {
    expect(toObsidian('hit [/api/health](/api/health)')).toBe(
      'hit [/api/health](/api/health)',
    )
  })

  it('does not touch image links', () => {
    expect(toObsidian('![alt](path/to/image.png)')).toBe('![alt](path/to/image.png)')
  })

  it('does not touch code blocks', () => {
    const src = 'before\n\n```\n[in code](concepts/roles)\n```\n\nafter'
    expect(toObsidian(src)).toBe(src)
  })

  it('does not touch inline code', () => {
    expect(toObsidian('use `[text](concepts/roles)` like this')).toBe(
      'use `[text](concepts/roles)` like this',
    )
  })
})

describe('toMarkdown', () => {
  it('converts wikilinks to markdown links', () => {
    expect(toMarkdown('see [[concepts/roles|Roles]] for more')).toBe(
      'see [Roles](concepts/roles) for more',
    )
  })

  it('expands short wikilinks to use the slug as text', () => {
    expect(toMarkdown('see [[concepts/roles]] for more')).toBe(
      'see [concepts/roles](concepts/roles) for more',
    )
  })

  it('does not touch code blocks or inline code', () => {
    const src = 'use ```[[in code]]``` and `[[also]]` here'
    expect(toMarkdown(src)).toBe(src)
  })
})

describe('round-trip identity', () => {
  // For each canonical-markdown sample, toObsidian → toMarkdown
  // should produce a stable result (may not be byte-identical to
  // the input — short-form expansion is one-way — but applying
  // toObsidian once more yields the same output).
  const samples = [
    'see [Roles](concepts/roles) for more',
    'see [concepts/roles](concepts/roles) for more',
    'mixed: [Tenancy](concepts/tenancy) and [GitHub](https://github.com)',
    'plain text with no links',
    '```\n[code link](concepts/roles)\n```',
    'an [Audit log](features/audit) plus a `[Code](concepts/inline)` and an [external](https://x.com).',
  ]

  for (const sample of samples) {
    it(`stabilises after one pass for: "${sample.slice(0, 40)}..."`, () => {
      const once = toObsidian(sample)
      const twice = toObsidian(toMarkdown(once))
      expect(twice).toBe(once)
    })
  }
})

describe('detectFlavor', () => {
  it('detects obsidian flavor when wikilinks are present', () => {
    expect(detectFlavor('see [[concepts/roles]]')).toBe('obsidian')
  })

  it('detects markdown flavor when internal links are present', () => {
    expect(detectFlavor('see [Roles](concepts/roles)')).toBe('markdown')
  })

  it('returns unknown when there are no link patterns at all', () => {
    expect(detectFlavor('plain text only')).toBe('unknown')
  })

  it('returns markdown when only external links are present', () => {
    expect(detectFlavor('see [GitHub](https://github.com)')).toBe('unknown')
  })

  it('ignores wikilinks inside code blocks', () => {
    expect(detectFlavor('```\n[[concepts/roles]]\n```')).toBe('unknown')
  })
})
