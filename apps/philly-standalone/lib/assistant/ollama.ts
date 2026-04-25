/* ---------------------------------------------------------------
   Typed Ollama client — chat completions + embeddings.
   ---------------------------------------------------------------
   Talks to a self-hosted Ollama instance (configured via
   OLLAMA_BASE_URL, default http://localhost:11434).

   Two operations:
   - chat()      streaming completion via /api/chat (NDJSON parser)
   - embed()     single-shot vector via /api/embeddings

   Both surface errors as typed exceptions so callers can
   distinguish "Ollama down" from "model not pulled" from "request
   malformed". The /api/assistant/health route uses listModels()
   to verify both required models are loaded.
   --------------------------------------------------------------- */

const DEFAULT_BASE_URL = 'http://localhost:11434'

function baseUrl(): string {
  const raw = process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE_URL
  return raw.replace(/\/+$/, '')
}

export class OllamaError extends Error {
  constructor(
    message: string,
    public readonly cause: 'unreachable' | 'model-missing' | 'http' | 'malformed',
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'OllamaError'
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model: string
  messages: ChatMessage[]
  /** Stop generation if the response reaches this many tokens. */
  numPredict?: number
  /** Sampling temperature; 0 = deterministic, 1 = creative. */
  temperature?: number
  /** Optional top-p cap. */
  topP?: number
  /** Optional abort signal — caller can cancel mid-stream. */
  signal?: AbortSignal
}

export interface ChatChunk {
  /** Incremental message content from the model. */
  delta: string
  /** True on the final chunk. Final chunk also exposes token counts. */
  done: boolean
  promptEvalCount?: number
  evalCount?: number
}

/**
 * Stream a chat completion. Yields incremental content chunks.
 * Throws OllamaError if the model isn't pulled or the host
 * is unreachable.
 *
 * Callers should accumulate `delta` strings and inspect the
 * final chunk's token counts for billing / audit purposes.
 */
export async function* chat(opts: ChatOptions): AsyncGenerator<ChatChunk> {
  const url = `${baseUrl()}/api/chat`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: opts.signal,
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: true,
        options: {
          num_predict: opts.numPredict ?? 1024,
          temperature: opts.temperature ?? 0.2,
          top_p: opts.topP ?? 0.9,
        },
      }),
    })
  } catch (err) {
    throw new OllamaError(
      `Could not reach Ollama at ${baseUrl()}: ${err instanceof Error ? err.message : 'fetch failed'}`,
      'unreachable',
    )
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 404 && body.includes('model')) {
      throw new OllamaError(`Model ${opts.model} is not pulled on the Ollama host`, 'model-missing', 404)
    }
    throw new OllamaError(`Ollama returned ${res.status}: ${body.slice(0, 500)}`, 'http', res.status)
  }
  if (!res.body) {
    throw new OllamaError('Ollama returned an empty response body', 'malformed')
  }

  // NDJSON: one JSON object per line.
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl = buffer.indexOf('\n')
    while (nl !== -1) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (line) {
        let parsed: unknown
        try {
          parsed = JSON.parse(line)
        } catch {
          // Skip malformed line rather than abort the stream.
          nl = buffer.indexOf('\n')
          continue
        }
        const obj = parsed as {
          message?: { content?: string }
          done?: boolean
          prompt_eval_count?: number
          eval_count?: number
        }
        yield {
          delta: obj.message?.content ?? '',
          done: obj.done === true,
          promptEvalCount: obj.prompt_eval_count,
          evalCount: obj.eval_count,
        }
      }
      nl = buffer.indexOf('\n')
    }
  }
}

export interface EmbedOptions {
  model: string
  input: string | string[]
}

export interface EmbedResult {
  /** One vector per input. Input order preserved. */
  vectors: number[][]
}

/**
 * Compute one or more embedding vectors. The input array is sent
 * in a single request; Ollama batches internally.
 */
export async function embed(opts: EmbedOptions): Promise<EmbedResult> {
  const url = `${baseUrl()}/api/embed`
  const inputArray = Array.isArray(opts.input) ? opts.input : [opts.input]

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: opts.model, input: inputArray }),
    })
  } catch (err) {
    throw new OllamaError(
      `Could not reach Ollama at ${baseUrl()}: ${err instanceof Error ? err.message : 'fetch failed'}`,
      'unreachable',
    )
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 404 && body.includes('model')) {
      throw new OllamaError(`Embedding model ${opts.model} is not pulled`, 'model-missing', 404)
    }
    throw new OllamaError(`Ollama returned ${res.status}: ${body.slice(0, 500)}`, 'http', res.status)
  }
  const json = (await res.json()) as { embeddings?: number[][] }
  if (!json.embeddings || !Array.isArray(json.embeddings)) {
    throw new OllamaError('Ollama returned malformed embedding response', 'malformed')
  }
  return { vectors: json.embeddings }
}

/**
 * List the models currently pulled on the Ollama host. Used by the
 * /api/assistant/health route to verify the chat + embedding models
 * are both available before answering user questions.
 */
export async function listModels(): Promise<string[]> {
  const url = `${baseUrl()}/api/tags`
  let res: Response
  try {
    res = await fetch(url, { method: 'GET' })
  } catch (err) {
    throw new OllamaError(
      `Could not reach Ollama at ${baseUrl()}: ${err instanceof Error ? err.message : 'fetch failed'}`,
      'unreachable',
    )
  }
  if (!res.ok) {
    throw new OllamaError(`Ollama /api/tags returned ${res.status}`, 'http', res.status)
  }
  const json = (await res.json()) as { models?: Array<{ name: string }> }
  return (json.models ?? []).map((m) => m.name)
}

/** Cosine similarity for two same-length vectors. Used by RAG retrieval. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}
