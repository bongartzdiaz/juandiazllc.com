/* ---------------------------------------------------------------
   Bidirectional markdown ↔ Obsidian transformer.
   ---------------------------------------------------------------
   Two-way conversion between the canonical KB markdown (standard
   GFM with `[text](slug)` links) and the Obsidian-flavored variant
   (wikilinks `[[slug|text]]` plus a slightly different frontmatter
   shape).

   Round-trip identity is the contract: for every doc D,
     toObsidian(toMarkdown(toObsidian(D))) === toObsidian(D)
     toMarkdown(toObsidian(toMarkdown(D))) === toMarkdown(D)
   The unit tests pin this so we can rely on it for the two-way
   sync without silent drift.

   What we transform:
     - Inline links to other KB docs:
         [Roles & permissions](concepts/roles)
       ↔
         [[concepts/roles|Roles & permissions]]
     - Inline links where text == slug get the short form:
         [concepts/roles](concepts/roles)
       ↔
         [[concepts/roles]]
   What we leave alone:
     - External links (start with http:// or https://)
     - Anchor-only links (start with #)
     - Code blocks (```...```), inline code (`...`)
     - Frontmatter (separate concern, see frontmatter.ts)
     - Image links ![alt](path)
   --------------------------------------------------------------- */

const LINK_PATTERN = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g
const WIKILINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

// A link target is "internal" (i.e., a KB slug) when it has no
// scheme and doesn't start with /, #, or ?. Slugs match
// `^[a-z][a-z0-9/-]*$` per the KB README.
const INTERNAL_TARGET = /^[a-z][a-z0-9/-]*$/

function isInternalSlug(target: string): boolean {
  return INTERNAL_TARGET.test(target)
}

/**
 * Walk the source string and apply `transform` to every match of
 * `pattern` that's NOT inside a fenced code block or inline code
 * span. Code is preserved verbatim.
 */
function withCodeProtected(
  source: string,
  pattern: RegExp,
  transform: (match: RegExpMatchArray) => string,
): string {
  // Split on fenced code blocks first.
  const fences = source.split(/(```[\s\S]*?```)/g)
  for (let i = 0; i < fences.length; i++) {
    if (i % 2 === 1) continue // odd indices are code blocks; leave alone

    // Within a non-code segment, also protect inline code spans.
    const inline = fences[i].split(/(`[^`\n]+`)/g)
    for (let j = 0; j < inline.length; j++) {
      if (j % 2 === 1) continue // odd indices are inline code
      inline[j] = inline[j].replace(pattern, (...args) => {
        // The .replace callback signature differs from a single
        // RegExp.exec match; rebuild a match-shaped object for the
        // transform fn.
        const groups = args.slice(0, -2) // drop offset + full string
        const match = groups as unknown as RegExpMatchArray
        return transform(match)
      })
    }
    fences[i] = inline.join('')
  }
  return fences.join('')
}

/**
 * Convert standard markdown KB doc body to Obsidian-flavored
 * markdown. External links and code are untouched.
 */
export function toObsidian(markdown: string): string {
  return withCodeProtected(markdown, LINK_PATTERN, (match) => {
    const text = match[1]
    const target = match[2]
    if (!isInternalSlug(target)) {
      // External / anchor / absolute path — preserve verbatim.
      return `[${text}](${target})`
    }
    // Same text and target → short form `[[slug]]`
    if (text === target) return `[[${target}]]`
    // Otherwise piped form `[[slug|text]]`
    return `[[${target}|${text}]]`
  })
}

/**
 * Convert Obsidian-flavored markdown back to canonical KB
 * markdown. Wikilinks become `[text](slug)`; non-wikilink content
 * is untouched.
 */
export function toMarkdown(obsidian: string): string {
  return withCodeProtected(obsidian, WIKILINK_PATTERN, (match) => {
    const target = match[1]
    const display = match[2] ?? target
    return `[${display}](${target})`
  })
}

/**
 * Detect whether a body looks like Obsidian (contains wikilinks)
 * vs canonical markdown (contains parens-style internal links).
 * Used by the sync script to choose which way to transform.
 */
export function detectFlavor(body: string): 'obsidian' | 'markdown' | 'unknown' {
  // Strip code first so a code example doesn't false-positive.
  const stripped = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]+`/g, '')
  if (WIKILINK_PATTERN.test(stripped)) return 'obsidian'
  // Reset because RegExp with /g remembers lastIndex
  WIKILINK_PATTERN.lastIndex = 0
  // If it has any markdown-style link to something that looks like a slug, call it markdown.
  for (const m of stripped.matchAll(LINK_PATTERN)) {
    if (isInternalSlug(m[2])) return 'markdown'
  }
  return 'unknown'
}
