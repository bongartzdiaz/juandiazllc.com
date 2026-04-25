#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   Knowledge-base build pipeline.
   ---------------------------------------------------------------
   Walks docs/user/{en,nl,de,es}/, parses frontmatter + chunks each
   doc, calls Ollama's embeddings endpoint to vectorise every chunk,
   and writes data/assistant-kb.json.

   Run:
     npm run kb:build

   Env:
     OLLAMA_BASE_URL          default http://localhost:11434
     ASSISTANT_EMBED_MODEL    default bge-m3 (multilingual)

   The output file is committed to git so deploys don't need a
   running Ollama at build time. Re-run whenever docs change.
   --------------------------------------------------------------- */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseFrontmatter, chunkDocument, FrontmatterError } from '../lib/assistant/kb-parse'
import { embed } from '../lib/assistant/ollama'
import type { KbChunk, KbIndex } from '../lib/assistant/kb-types'

const ROOT = path.join(__dirname, '..')
const DOCS_DIR = path.join(ROOT, 'docs', 'user')
const OUT_DIR = path.join(ROOT, 'data')
const OUT_FILE = path.join(OUT_DIR, 'assistant-kb.json')
const EMBED_MODEL = process.env.ASSISTANT_EMBED_MODEL?.trim() || 'bge-m3'
const BATCH_SIZE = 16

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

async function build(): Promise<void> {
  const docsExist = await fs.stat(DOCS_DIR).catch(() => null)
  if (!docsExist) {
    console.error(`docs/user not found at ${DOCS_DIR}`)
    process.exit(1)
  }

  const allChunks: KbChunk[] = []
  const slugsByLang: Record<string, Set<string>> = { en: new Set(), nl: new Set(), de: new Set(), es: new Set() }

  for await (const filePath of walkMarkdownFiles(DOCS_DIR)) {
    const rel = path.relative(ROOT, filePath)
    const source = await fs.readFile(filePath, 'utf8')
    let parsed
    try {
      parsed = parseFrontmatter(source)
    } catch (err) {
      if (err instanceof FrontmatterError) {
        console.error(`✗ ${rel}: ${err.message}`)
        process.exit(2)
      }
      throw err
    }
    const chunks = chunkDocument(parsed.frontmatter, parsed.body)
    if (chunks.length === 0) {
      console.warn(`  ${rel}: no chunks extracted`)
      continue
    }
    allChunks.push(...chunks)
    slugsByLang[parsed.frontmatter.lang]?.add(parsed.frontmatter.slug)
    console.log(`  ${rel} → ${chunks.length} chunks`)
  }

  if (allChunks.length === 0) {
    console.error('No chunks built. Aborting.')
    process.exit(3)
  }

  // Coverage report — informational. Per the README, en is the source
  // of truth; the other languages should match the en slug set.
  const enSlugs = slugsByLang.en
  for (const lang of ['nl', 'de', 'es'] as const) {
    const localSlugs = slugsByLang[lang]
    if (localSlugs.size === 0) {
      console.log(`  (${lang}): not yet translated`)
      continue
    }
    const missing = [...enSlugs].filter((s) => !localSlugs.has(s))
    if (missing.length > 0) {
      console.log(`  (${lang}): ${localSlugs.size}/${enSlugs.size} slugs translated; missing ${missing.length}`)
    } else {
      console.log(`  (${lang}): full coverage`)
    }
  }

  console.log(`\nEmbedding ${allChunks.length} chunks with ${EMBED_MODEL}...`)
  const vectorised: Array<KbChunk & { vector: number[] }> = []
  let dimension = 0
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE)
    const { vectors } = await embed({ model: EMBED_MODEL, input: batch.map((c) => c.text) })
    if (vectors.length !== batch.length) {
      throw new Error(`expected ${batch.length} vectors, got ${vectors.length}`)
    }
    if (dimension === 0) dimension = vectors[0].length
    for (let j = 0; j < batch.length; j++) {
      vectorised.push({ ...batch[j], vector: vectors[j] })
    }
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, allChunks.length)}/${allChunks.length}\r`)
  }
  console.log('')

  const index: KbIndex = {
    schemaVersion: 1,
    embeddingModel: EMBED_MODEL,
    dimension,
    builtAt: new Date().toISOString(),
    chunks: vectorised,
  }

  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.writeFile(OUT_FILE, JSON.stringify(index, null, 0), 'utf8')

  const stat = await fs.stat(OUT_FILE)
  console.log(`Wrote ${OUT_FILE} (${(stat.size / 1024).toFixed(1)} KB)`)
  console.log(`Dimension: ${dimension}, model: ${EMBED_MODEL}`)
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
