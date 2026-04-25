/* ---------------------------------------------------------------
   Markdown frontmatter + chunker for the assistant KB.
   ---------------------------------------------------------------
   Pure functions, no I/O — fed by the offline build script and
   exercisable in unit tests without touching the filesystem.

   Chunking strategy:
   - Split on `## H2` and `### H3` headings
   - Within each section, split into ≤TARGET_CHARS slices on the
     nearest paragraph boundary
   - Each chunk inherits its full heading path

   Designed for retrieval, not display. The chunks are what we
   embed; we don't reconstruct documents from them.
   --------------------------------------------------------------- */

import type { KbFrontmatter, KbChunk } from './kb-types'

const TARGET_CHARS = 1200
const MAX_CHARS = 1800

export class FrontmatterError extends Error {}

/**
 * Parse a markdown file's frontmatter + body. Frontmatter must be
 * a YAML block fenced by `---` at the top of the file.
 *
 * No external YAML parser — we hand-roll a tiny one because the
 * frontmatter shape is fixed and constrained.
 */
export function parseFrontmatter(source: string): { frontmatter: KbFrontmatter; body: string } {
  if (!source.startsWith('---\n')) {
    throw new FrontmatterError('missing opening --- frontmatter fence')
  }
  const end = source.indexOf('\n---\n', 4)
  if (end === -1) {
    throw new FrontmatterError('missing closing --- frontmatter fence')
  }
  const block = source.slice(4, end)
  const body = source.slice(end + 5)

  const fm: Record<string, unknown> = {}
  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (!line.trim()) continue
    const colon = line.indexOf(':')
    if (colon === -1) throw new FrontmatterError(`malformed frontmatter line: ${line}`)
    const key = line.slice(0, colon).trim()
    const rawValue = line.slice(colon + 1).trim()

    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      // Inline list: [a, b, c]
      const inner = rawValue.slice(1, -1).trim()
      fm[key] = inner === '' ? [] : inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))
    } else if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      fm[key] = rawValue.slice(1, -1)
    } else if (rawValue.startsWith("'") && rawValue.endsWith("'")) {
      fm[key] = rawValue.slice(1, -1)
    } else {
      fm[key] = rawValue
    }
  }

  for (const required of ['slug', 'lang', 'title', 'summary', 'updated']) {
    if (typeof fm[required] !== 'string' || (fm[required] as string).length === 0) {
      throw new FrontmatterError(`missing or empty frontmatter field: ${required}`)
    }
  }
  if (!['en', 'nl', 'de', 'es'].includes(fm.lang as string)) {
    throw new FrontmatterError(`invalid lang: ${String(fm.lang)}`)
  }
  if (!Array.isArray(fm.tags)) fm.tags = []
  if (!Array.isArray(fm.related)) fm.related = []

  return {
    frontmatter: {
      slug: fm.slug as string,
      lang: fm.lang as KbFrontmatter['lang'],
      title: fm.title as string,
      summary: fm.summary as string,
      tags: fm.tags as string[],
      related: fm.related as string[],
      updated: fm.updated as string,
    },
    body: body.trim(),
  }
}

interface Section {
  headingPath: string[]
  text: string
}

/**
 * Walk the body and split into sections by heading. The first
 * section's `headingPath` is empty (everything before the first
 * H2/H3). Subsequent sections accumulate the heading path.
 */
function splitSections(body: string): Section[] {
  const lines = body.split('\n')
  const sections: Section[] = []
  let currentPath: string[] = []
  let currentLines: string[] = []

  const flush = () => {
    const text = currentLines.join('\n').trim()
    if (text.length > 0) sections.push({ headingPath: [...currentPath], text })
    currentLines = []
  }

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)/)
    const h3 = line.match(/^###\s+(.*)/)
    if (h2) {
      flush()
      currentPath = [h2[1].trim()]
    } else if (h3) {
      flush()
      // Replace any existing H3 (siblings under the same H2)
      currentPath = currentPath[0] ? [currentPath[0], h3[1].trim()] : [h3[1].trim()]
    } else {
      currentLines.push(line)
    }
  }
  flush()
  return sections
}

/**
 * Slice a long text into <=TARGET_CHARS pieces, breaking on the
 * nearest paragraph boundary so chunks remain readable.
 */
function sliceByParagraph(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text]

  const paragraphs = text.split(/\n{2,}/)
  const slices: string[] = []
  let buf = ''
  for (const p of paragraphs) {
    if (buf.length + p.length + 2 <= TARGET_CHARS) {
      buf = buf ? `${buf}\n\n${p}` : p
    } else {
      if (buf) slices.push(buf)
      // A single paragraph longer than MAX_CHARS gets force-split on
      // sentence boundaries; rare, but possible.
      if (p.length > MAX_CHARS) {
        for (const sentence of p.match(/.{1,1500}(\.|!|\?|\n|$)/g) ?? [p]) {
          slices.push(sentence.trim())
        }
        buf = ''
      } else {
        buf = p
      }
    }
  }
  if (buf) slices.push(buf)
  return slices
}

/**
 * Turn a parsed doc into one or more retrievable chunks. Each chunk
 * carries enough context to be useful in isolation when surfaced as
 * a citation.
 */
export function chunkDocument(frontmatter: KbFrontmatter, body: string): KbChunk[] {
  const sections = splitSections(body)
  const chunks: KbChunk[] = []
  for (const section of sections) {
    const slices = sliceByParagraph(section.text)
    for (let i = 0; i < slices.length; i++) {
      chunks.push({
        id: `${frontmatter.slug}#${section.headingPath.join('>')}#${i}`,
        slug: frontmatter.slug,
        lang: frontmatter.lang,
        title: frontmatter.title,
        summary: frontmatter.summary,
        headingPath: section.headingPath,
        text: slices[i],
        tags: frontmatter.tags,
      })
    }
  }
  return chunks
}
