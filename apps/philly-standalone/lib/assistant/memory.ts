/* ---------------------------------------------------------------
   Structured-memory helpers.
   ---------------------------------------------------------------
   The assistant emits memory writes inline at the end of its
   response using a small DSL:

     [[remember key=preferred_language value="nl"]]
     [[remember key=onboarding.stage value="3"]]

   The server parses these markers out before returning the visible
   text to the user, and upserts them to AssistantMemory keyed by
   userId. This keeps the LLM from having to call a separate
   tool-use API and works with any Ollama model.

   Memory keys are namespaced: 'pref.*', 'onboarding.*', 'feature.*',
   etc. The key list is intentionally open — the LLM can invent new
   keys as it learns about the user — but per-key length is capped to
   prevent abuse.
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/philly/auth'

const MEMORY_PATTERN = /\[\[remember\s+key=([\w.\-]{1,80})\s+value=("([^"]*)"|([^\s\]]+))\s*\]\]/g
const MAX_KEY_LEN = 80
const MAX_VALUE_LEN = 1000

export interface ParsedMemory {
  key: string
  value: string
}

export interface MemoryParseResult {
  /** The model's response with [[remember ...]] tags stripped. */
  visibleText: string
  /** Memories the model emitted, ready to upsert. */
  memories: ParsedMemory[]
}

/**
 * Parse a model response, extract any [[remember]] markers, and
 * return the cleaned text alongside the memory writes.
 *
 * Malformed or oversized markers are silently dropped — they
 * don't fail the response. Server-side validation is the canonical
 * check; this function is just structural extraction.
 */
export function parseMemoryMarkers(modelOutput: string): MemoryParseResult {
  const memories: ParsedMemory[] = []
  let visibleText = modelOutput
  for (const match of modelOutput.matchAll(MEMORY_PATTERN)) {
    const key = match[1]
    const value = (match[3] ?? match[4] ?? '').trim()
    if (!key || key.length > MAX_KEY_LEN) continue
    if (!value || value.length > MAX_VALUE_LEN) continue
    memories.push({ key, value })
  }
  visibleText = visibleText.replace(MEMORY_PATTERN, '').trim()
  return { visibleText, memories }
}

/**
 * Upsert memories for a user. Writes are scoped by `(userId, key)`
 * — a second write to the same key updates the value in place.
 * organizationId is captured for tenant-scoped queries (e.g. the
 * admin "show me what the assistant knows about my team" view).
 */
export async function writeMemories(
  scope: { userId: string; organizationId: string },
  sourceTurnId: string | null,
  memories: ParsedMemory[],
): Promise<void> {
  if (memories.length === 0) return
  const prisma = getAuthPrisma()
  for (const m of memories) {
    await prisma.assistantMemory.upsert({
      where: { userId_key: { userId: scope.userId, key: m.key } },
      create: {
        organizationId: scope.organizationId,
        userId: scope.userId,
        key: m.key,
        value: m.value,
        sourceTurnId,
      },
      update: {
        value: m.value,
        sourceTurnId,
      },
    })
  }
}

/**
 * Read all memories for a user — used when assembling the system
 * prompt for the next turn (so the LLM remembers what it learned
 * in earlier conversations).
 */
export async function readMemories(userId: string): Promise<Array<{ key: string; value: string }>> {
  const prisma = getAuthPrisma()
  const rows = await prisma.assistantMemory.findMany({
    where: { userId },
    select: { key: true, value: true },
    orderBy: { updatedAt: 'desc' },
  })
  return rows
}
