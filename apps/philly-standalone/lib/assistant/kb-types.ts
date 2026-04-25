/* Shared types for the knowledge-base build pipeline (offline) and
   the runtime retrieval lib (online). Kept in their own file so the
   build script doesn't drag in the runtime's Ollama client. */

export interface KbFrontmatter {
  slug: string
  lang: 'en' | 'nl' | 'de' | 'es'
  title: string
  summary: string
  tags: string[]
  related: string[]
  updated: string
}

/** A single retrievable chunk extracted from a doc. */
export interface KbChunk {
  /** Stable id: `${slug}#${headingPath}#${index}`. */
  id: string
  /** Doc-level slug (same as frontmatter.slug). */
  slug: string
  lang: 'en' | 'nl' | 'de' | 'es'
  /** Doc title for citation display. */
  title: string
  /** Doc summary for citation display. */
  summary: string
  /** Section heading path leading to this chunk, e.g. ['The flow', 'What happens automatically']. */
  headingPath: string[]
  /** Chunk text (already trimmed; ready to embed and to feed to the LLM). */
  text: string
  /** Tags inherited from the doc. */
  tags: string[]
}

/** What gets serialised to data/assistant-kb.json. */
export interface KbIndex {
  /** Schema version — bump when the chunk shape changes. */
  schemaVersion: 1
  /** Embedding model used to generate vectors. Compared at load time. */
  embeddingModel: string
  /** Vector dimensionality (sanity check). */
  dimension: number
  /** ISO timestamp for when the index was built. */
  builtAt: string
  /** All chunks in source order. */
  chunks: Array<KbChunk & { vector: number[] }>
}
