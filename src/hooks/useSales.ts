'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SalesData } from '@/lib/types'
import { fetchSalesData } from '@/lib/api/ghl'

const SYNC_INTERVAL_MS = 60_000

export function useSales() {
  const [data, setData] = useState<SalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await fetchSalesData()
      if (result) {
        setData(result)
      } else {
        setError('GoHighLevel API niet bereikbaar')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij laden sales data')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(() => load(true), SYNC_INTERVAL_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [load])

  return { data, loading, error, refetch: load }
}
