import { describe, it, expect } from 'vitest'
import { parseFrontmatter, chunkDocument, FrontmatterError } from './kb-parse'

const VALID = `---
slug: onboarding/welcome
lang: en
title: Welcome
summary: Quick intro to the CRM.
tags: [onboarding, getting-started]
related: [onboarding/create-org]
updated: 2026-04-25
---

# Welcome

Some intro paragraph.

## First section

A paragraph here.

Another paragraph here.

### Nested

Nested content.

## Second section

Body of the second section.
`

describe('parseFrontmatter', () => {
  it('extracts all required fields', () => {
    const { frontmatter, body } = parseFrontmatter(VALID)
    expect(frontmatter.slug).toBe('onboarding/welcome')
    expect(frontmatter.lang).toBe('en')
    expect(frontmatter.title).toBe('Welcome')
    expect(frontmatter.summary).toBe('Quick intro to the CRM.')
    expect(frontmatter.tags).toEqual(['onboarding', 'getting-started'])
    expect(frontmatter.related).toEqual(['onboarding/create-org'])
    expect(body.startsWith('# Welcome')).toBe(true)
  })

  it('throws on missing opening fence', () => {
    expect(() => parseFrontmatter('# No frontmatter')).toThrow(FrontmatterError)
  })

  it('throws on missing closing fence', () => {
    expect(() => parseFrontmatter('---\nslug: x\n')).toThrow(FrontmatterError)
  })

  it('throws on missing required field', () => {
    const noTitle = `---
slug: x
lang: en
summary: y
updated: 2026-04-25
---

body`
    expect(() => parseFrontmatter(noTitle)).toThrow(/title/)
  })

  it('throws on unsupported language code', () => {
    const bad = `---
slug: x
lang: fr
title: y
summary: z
updated: 2026-04-25
---

body`
    expect(() => parseFrontmatter(bad)).toThrow(/lang/)
  })

  it('treats tags / related as empty list when omitted', () => {
    const minimal = `---
slug: x
lang: en
title: y
summary: z
updated: 2026-04-25
---

body`
    const { frontmatter } = parseFrontmatter(minimal)
    expect(frontmatter.tags).toEqual([])
    expect(frontmatter.related).toEqual([])
  })
})

describe('chunkDocument', () => {
  it('emits one chunk per heading section, with the heading path attached', () => {
    const { frontmatter, body } = parseFrontmatter(VALID)
    const chunks = chunkDocument(frontmatter, body)
    // Pre-heading prelude + 3 headed sections (First, Nested, Second)
    expect(chunks.length).toBeGreaterThanOrEqual(3)
    const firstSection = chunks.find((c) => c.headingPath[0] === 'First section')
    expect(firstSection).toBeDefined()
    const nested = chunks.find((c) => c.headingPath[1] === 'Nested')
    expect(nested?.headingPath).toEqual(['First section', 'Nested'])
  })

  it('inherits doc-level title, summary, tags onto every chunk', () => {
    const { frontmatter, body } = parseFrontmatter(VALID)
    const chunks = chunkDocument(frontmatter, body)
    for (const c of chunks) {
      expect(c.title).toBe('Welcome')
      expect(c.summary).toBe('Quick intro to the CRM.')
      expect(c.tags).toEqual(['onboarding', 'getting-started'])
      expect(c.lang).toBe('en')
    }
  })

  it('produces stable chunk ids that include slug + heading + index', () => {
    const { frontmatter, body } = parseFrontmatter(VALID)
    const chunks = chunkDocument(frontmatter, body)
    for (const c of chunks) {
      expect(c.id.startsWith('onboarding/welcome#')).toBe(true)
    }
  })
})
