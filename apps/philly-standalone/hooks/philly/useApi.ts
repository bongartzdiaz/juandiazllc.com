'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR, { type SWRConfiguration } from 'swr'
import { api } from '@/lib/philly/api/client'
import { useSyncRegistry } from './useSync'

/* ---------------------------------------------------------------
   useApi<T> — SWR-backed data hook for the Philly dashboard.

   Migrated from a hand-rolled polling hook to useSWR so that:
     • navigation between pages is instant (cache-first, then
       background-revalidate) instead of re-fetching from zero on
       every mount
     • multiple components asking for the same path share one
       in-flight request (deduping)
     • focus/online events trigger a free refresh for long-idle tabs

   The return shape (data, loading, error, refetch, lastSync) is
   preserved exactly so the ~56 dashboard pages calling this hook
   keep working without edits.
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

// Thrown strings bubble back as `error.message` through SWR, which is
// how our hook surfaces fetch/timeout errors to callers.
const fetcher = async <T>(path: string): Promise<T> => {
  const res = await api.get<T>(path)
  if (res.error) throw new Error(res.error)
  return res.data as T
}

export function useApi<T>(
  path: string,
  options: UseApiOptions<T> = {},
): UseApiReturn<T> {
  const { interval, enabled = true, initialData = null } = options

  // SWR key — `null` disables the fetch (used for conditional queries).
  const key = enabled ? path : null

  // Resolve refresh interval once per render. Reading localStorage on
  // every render is cheap enough that memoizing isn't necessary, but
  // we still gate on typeof window via readSyncInterval.
  const refreshInterval = interval ?? readSyncInterval()

  const config = useMemo<SWRConfiguration<T, Error>>(() => ({
    refreshInterval,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
    errorRetryCount: 2,
    errorRetryInterval: 3000,
    keepPreviousData: true,
    fallbackData: initialData ?? undefined,
  }), [refreshInterval, initialData])

  const { data, error, isLoading, mutate } = useSWR<T, Error>(key, fetcher, config)

  // Surface lastSync as a Date whenever data updates (SWR gives us the
  // `isValidating` pulse but not a timestamp — track it ourselves).
  const [lastSync, setLastSync] = useState<Date | null>(null)
  useEffect(() => {
    if (data !== undefined) setLastSync(new Date())
  }, [data])

  const refetch = useCallback(() => {
    void mutate()
  }, [mutate])

  // Keep the existing global-sync bus working (useSync → refresh all
  // dashboards at once). useSyncRegistry expects a refetch function.
  useSyncRegistry(path, refetch)

  return {
    data: (data ?? null) as T | null,
    loading: isLoading && data === undefined,
    error: error ? error.message : null,
    refetch,
    lastSync,
  }
}
