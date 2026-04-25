/* ---------------------------------------------------------------
   Runtime RAG retrieval — loads the precomputed KB index from
   data/assistant-kb.json and serves top-k similarity matches.
   ---------------------------------------------------------------
   Loads once at first call (module-level memo). The index is small
   enough at this stage (a few hundred chunks) that an in-memory
   linear scan is faster than spinning up a vector DB. Migrate to
   sqlite-vec or MariaDB vector type once the corpus crosses ~10k
   chunks.
   --------------------------------------------------------------- */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { KbIndex } from './kb-types'
import { embed, cosineSimilarity, OllamaError } from './ollama'

let _cachedIndex: KbIndex | null = null
let _cachedAtMtime: number | null = null

const INDEX_PATH = path.join(process.cwd(), 'data', 'assistant-kb.json')

async function loadIndex(): Promise<KbIndex> {
  const stat = await fs.stat(INDEX_PATH).catch(() => null)
  if (!stat) {
    throw new Error(
      `Knowledge base index not found at ${INDEX_PATH}. Run npm run kb:build first.`,
    )
  }
  if (_cachedIndex && _cachedAtMtime === stat.mtimeMs) {
    return _cachedIndex
  }
  const raw = await fs.readFile(INDEX_PATH, 'utf8')
  const parsed = JSON.parse(raw) as KbIndex
  if (parsed.schemaVersion !== 1) {
    throw new Error(`KB index schema version ${parsed.schemaVersion} is not supported`)
  }
  _cachedIndex = parsed
  _cachedAtMtime = stat.mtimeMs
  return parsed
}

export interface RetrievalResult {
  slug: string
  title: string
  summary: string
  headingPath: string[]
  text: string
  score: number
}

export interface RetrievalOptions {
  /** Top-k chunks to return after filtering. */
  k?: number
  /** If set, only chunks in this language are returned. */
  preferLang?: 'en' | 'nl' | 'de' | 'es'
  /** Minimum cosine similarity to include in results. */
  minScore?: number
}

/**
 * Retrieve the top-k most relevant chunks for a natural-language
 * query. Embeds the query via Ollama (same model that produced the
 * index — we verify at load time), scans every chunk, and returns
 * the top matches sorted by score desc.
 *
 * Language preference: if the user is Dutch and we have a Dutch
 * version of the matching doc, prefer it. Falls back to English
 * (or whatever's available) when no preferred-lang chunk hits the
 * minScore threshold.
 */
export async function retrieve(query: string, opts: RetrievalOptions = {}): Promise<RetrievalResult[]> {
  const k = opts.k ?? 6
  const minScore = opts.minScore ?? 0.3

  const index = await loadIndex()
  if (index.chunks.length === 0) return []

  // Embed the query with the same model the index was built with.
  const { vectors } = await embed({ model: index.embeddingModel, input: query })
  const queryVector = vectors[0]
  if (!queryVector || queryVector.length !== index.dimension) {
    throw new OllamaError(
      `Embedding dimension mismatch: index=${index.dimension}, query=${queryVector?.length ?? 0}`,
      'malformed',
    )
  }

  // Score every chunk. Linear scan is fine at this scale.
  const scored = index.chunks.map((c) => ({
    chunk: c,
    score: cosineSimilarity(queryVector, c.vector),
  }))

  // Apply language preference: chunks in the preferred lang get a
  // small boost so ties resolve in their favour, but a much-better
  // English chunk can still beat a marginally-relevant Dutch one.
  if (opts.preferLang) {
    for (const s of scored) {
      if (s.chunk.lang === opts.preferLang) s.score += 0.05
    }
  }

  scored.sort((a, b) => b.score - a.score)

  const results: RetrievalResult[] = []
  const seenSlugs = new Set<string>()
  for (const s of scored) {
    if (s.score < minScore) break
    // De-dup by slug — return at most one chunk per source doc so
    // the LLM sees breadth rather than 5 chunks of the same page.
    if (seenSlugs.has(s.chunk.slug)) continue
    seenSlugs.add(s.chunk.slug)
    results.push({
      slug: s.chunk.slug,
      title: s.chunk.title,
      summary: s.chunk.summary,
      headingPath: s.chunk.headingPath,
      text: s.chunk.text,
      score: s.score,
    })
    if (results.length >= k) break
  }

  return results
}

/** Stats for the /api/assistant/health route. */
export async function indexStats(): Promise<{
  loaded: boolean
  chunks: number
  dimension: number
  embeddingModel: string
  builtAt: string
}> {
  try {
    const idx = await loadIndex()
    return {
      loaded: true,
      chunks: idx.chunks.length,
      dimension: idx.dimension,
      embeddingModel: idx.embeddingModel,
      builtAt: idx.builtAt,
    }
  } catch {
    return {
      loaded: false,
      chunks: 0,
      dimension: 0,
      embeddingModel: '',
      builtAt: '',
    }
  }
}
