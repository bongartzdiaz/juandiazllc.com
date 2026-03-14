import type { ChatbotData } from '../types'
import { API_BASE } from '../utils'

// ── Client-side fetch (used by hooks) ──

export async function fetchChatbot(): Promise<ChatbotData | null> {
  try {
    const res = await fetch(`${API_BASE}/chatbot`)
    if (res.ok) {
      const json = await res.json()
      if (json.error) return null
      return json
    }
  } catch {
    // API not available
  }
  return null
}
