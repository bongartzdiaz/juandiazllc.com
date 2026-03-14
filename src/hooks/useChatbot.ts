'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ChatbotData } from '@/lib/types'
import { fetchChatbot } from '@/lib/api/chatbot'

export function useChatbot() {
  const [data, setData] = useState<ChatbotData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchChatbot()
      if (result) {
        setData(result)
      } else {
        setError('DM Champ API niet bereikbaar')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij laden chatbot data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
