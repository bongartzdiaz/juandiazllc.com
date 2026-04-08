'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { useSyncRegistry } from './useSync'

/* ---------------------------------------------------------------
   useApi<T> — Generic data-fetching hook with auto-refresh
   --------------------------------------------------------------- */

export interface UseApiOptions<T> {
  /** Polling interval in ms. Falls back to pai-settings syncInterval, then 60 000 ms. */
  interval?: number
  /** Set false to skip fetching (conditional queries). */
  enabled?: boolean
  /** Data returned before the first successful fetch completes. */
  initialData?: T
}

export interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
  lastSync: Date | null
}

function readSyncInterval(): number {
  if (typeof window === 'undefined') return 60000
  try {
    const raw = localStorage.getItem('pai-settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.syncInterval === 'number' && parsed.syncInterval > 0) {
        return parsed.syncInterval
      }
    }
  } catch { /* ignore */ }
  return 60000
}

export function useApi<T>(
  path: string,
  options: UseApiOptions<T> = {},
): UseApiReturn<T> {
  const {
    interval,
    enabled = true,
    initialData = null,
  } = options

  const [data, setData] = useState<T | null>(initialData as T | null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const hasFetched = useRef(false)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return

    /* Only show loading spinner on the very first fetch */
    if (!hasFetched.current) setLoading(true)

    const res = await api.get<T>(path)

    if (!mountedRef.current) return

    if (res.error) {
      setError(res.error)
    } else {
      setData(res.data)
      setError(null)
      setLastSync(new Date())
    }

    hasFetched.current = true
    setLoading(false)
  }, [path])

  /* Register this hook's refetch for global sync */
  useSyncRegistry(path, fetchData)

  /* Initial fetch + polling */
  useEffect(() => {
    mountedRef.current = true

    if (!enabled) {
      setLoading(false)
      return
    }

    fetchData()

    const ms = interval ?? readSyncInterval()
    const timer = setInterval(fetchData, ms)

    return () => {
      mountedRef.current = false
      clearInterval(timer)
    }
  }, [fetchData, enabled, interval])

  return { data, loading, error, refetch: fetchData, lastSync }
}
