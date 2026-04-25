#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   Translation coverage report for the assistant KB.
   ---------------------------------------------------------------
   Walks docs/user/{en,nl,de,es}/, parses every doc's frontmatter,
   and reports:

     - which en docs are missing nl/de/es translations
     - which nl/de/es docs reference an en doc that no longer exists
     - which docs have stale frontmatter (en updated more recently
       than translations)

   By default this is INFORMATIONAL — exits 0 even if coverage is
   incomplete. Set CHECK_KB_STRICT=1 to make it fail the build
   when any en doc lacks a translation. Wire that into CI once the
   translation backlog is at zero.

   Run:
     npm run kb:check
     CHECK_KB_STRICT=1 npm run kb:check    # for CI
   --------------------------------------------------------------- */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseFrontmatter, FrontmatterError } from '../lib/assistant/kb-parse'

const ROOT = path.join(__dirname, '..')
const DOCS_DIR = path.join(ROOT, 'docs', 'user')
const LOCALES = ['en', 'nl', 'de', 'es'] as const

type Locale = (typeof LOCALES)[number]

interface DocMeta {
  slug: string
  lang: Locale
  updated: string
  filePath: string
}

async function* walkMarkdownFiles(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      yield* walkMarkdownFiles(full)
    } else if (e.isFile() && e.name.endsWith('.md') && e.name !== 'README.md') {
      yield full
    }
  }
}

async function loadAllDocs(): Promise<DocMeta[]> {
  const docs: DocMeta[] = []
  for await (const filePath of walkMarkdownFiles(DOCS_DIR)) {
    const source = await fs.readFile(filePath, 'utf8')
    try {
      const { frontmatter } = parseFrontmatter(source)
      docs.push({
        slug: frontmatter.slug,
        lang: frontmatter.lang as Locale,
        updated: frontmatter.updated,
        filePath: path.relative(ROOT, filePath),
      })
    } catch (err) {
      if (err instanceof FrontmatterError) {
        console.error(`✗ ${path.relative(ROOT, filePath)}: ${err.message}`)
        process.exit(2)
      }
      throw err
    }
  }
  return docs
}

async function main(): Promise<void> {
  const exists = await fs.stat(DOCS_DIR).catch(() => null)
  if (!exists) {
    console.error(`docs/user not found at ${DOCS_DIR}`)
    process.exit(1)
  }

  const docs = await loadAllDocs()
  const bySlug: Record<string, Partial<Record<Locale, DocMeta>>> = {}
  for (const d of docs) {
    bySlug[d.slug] ??= {}
    bySlug[d.slug][d.lang] = d
  }

  const enSlugs = Object.keys(bySlug).filter((s) => bySlug[s].en)
  const orphans: DocMeta[] = []
  for (const d of docs) {
    if (d.lang !== 'en' && !bySlug[d.slug].en) orphans.push(d)
  }

  console.log(`Knowledge base: ${enSlugs.length} en source docs\n`)

  let missingTotal = 0
  let staleTotal = 0
  for (const lang of ['nl', 'de', 'es'] as const) {
    const have = enSlugs.filter((s) => bySlug[s][lang]).length
    const missing = enSlugs.filter((s) => !bySlug[s][lang])
    const stale = enSlugs.filter((s) => {
      const en = bySlug[s].en!
      const tr = bySlug[s][lang]
      return tr && tr.updated < en.updated
    })
    missingTotal += missing.length
    staleTotal += stale.length

    const pct = enSlugs.length === 0 ? 0 : Math.round((have / enSlugs.length) * 100)
    console.log(`[${lang}] ${have}/${enSlugs.length} (${pct}%)`)
    if (missing.length > 0) {
      console.log(`     missing: ${missing.length}`)
      for (const slug of missing.slice(0, 5)) console.log(`       - ${slug}`)
      if (missing.length > 5) console.log(`       … and ${missing.length - 5} more`)
    }
    if (stale.length > 0) {
      console.log(`     stale (en updated more recently): ${stale.length}`)
      for (const slug of stale.slice(0, 5)) console.log(`       - ${slug}`)
    }
  }

  if (orphans.length > 0) {
    console.log(`\nOrphan translations (no en source):`)
    for (const o of orphans) console.log(`  - ${o.lang}/${o.slug} (${o.filePath})`)
  }

  console.log('')
  if (process.env.CHECK_KB_STRICT === '1') {
    if (missingTotal > 0 || orphans.length > 0) {
      console.error(`STRICT mode: ${missingTotal} missing translation(s), ${orphans.length} orphan(s) — failing build.`)
      process.exit(3)
    }
    if (staleTotal > 0) {
      console.error(`STRICT mode: ${staleTotal} stale translation(s) — failing build.`)
      process.exit(4)
    }
    console.log('STRICT mode: full coverage. ✓')
  } else {
    console.log('Informational only — set CHECK_KB_STRICT=1 to fail the build on gaps.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
