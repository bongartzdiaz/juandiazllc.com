'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChatbotData } from '@/lib/types'
import { fetchChatbot } from '@/lib/api/chatbot'

const SYNC_INTERVAL_MS = 60_000 // 60 seconds

export function useChatbot() {
  const [data, setData] = useState<ChatbotData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
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
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    // Auto-sync every 60 seconds
    intervalRef.current = setInterval(() => load(true), SYNC_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [load])

  return { data, loading, error, refetch: load }
}
