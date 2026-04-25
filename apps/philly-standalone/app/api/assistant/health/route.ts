/* GET /api/assistant/health — verify Ollama is reachable, both
   required models are pulled, and the KB index is loadable.
   Admin-only — exposes infra details. */

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/philly/auth-helpers'
import { listModels, OllamaError } from '@/lib/assistant/ollama'
import { indexStats } from '@/lib/assistant/rag'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const chatModel = process.env.ASSISTANT_CHAT_MODEL?.trim() || 'qwen2.5:14b-instruct-q4_K_M'
  const embedModel = process.env.ASSISTANT_EMBED_MODEL?.trim() || 'bge-m3'

  const checks: Array<{ name: string; ok: boolean; detail?: string }> = []
  let ollamaModels: string[] = []

  try {
    ollamaModels = await listModels()
    checks.push({ name: 'ollama-reachable', ok: true })
  } catch (err) {
    checks.push({
      name: 'ollama-reachable',
      ok: false,
      detail: err instanceof OllamaError ? err.message : 'unknown',
    })
  }

  // Ollama appends ":latest" when no tag is specified — match by prefix
  // so "qwen2.5:14b-instruct-q4_K_M" matches "qwen2.5:14b-instruct-q4_K_M"
  // exactly while "qwen2.5" by itself also resolves correctly.
  const hasModel = (target: string) =>
    ollamaModels.some((m) => m === target || m.split(':')[0] === target.split(':')[0])

  if (ollamaModels.length > 0) {
    checks.push({
      name: 'chat-model-loaded',
      ok: hasModel(chatModel),
      detail: hasModel(chatModel) ? chatModel : `${chatModel} not found in [${ollamaModels.join(', ')}]`,
    })
    checks.push({
      name: 'embed-model-loaded',
      ok: hasModel(embedModel),
      detail: hasModel(embedModel) ? embedModel : `${embedModel} not found in [${ollamaModels.join(', ')}]`,
    })
  }

  const idx = await indexStats()
  checks.push({
    name: 'kb-index',
    ok: idx.loaded,
    detail: idx.loaded ? `${idx.chunks} chunks, dim ${idx.dimension}, ${idx.embeddingModel}` : 'not built',
  })

  const ok = checks.every((c) => c.ok)
  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      chatModel,
      embedModel,
      checks,
      kb: idx,
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
