'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { MetaAdsData, Market } from '@/lib/types'
import { fetchMetaAds } from '@/lib/api/meta'

const SYNC_INTERVAL_MS = 60_000

export function useMetaAds(market: Market = 'NL') {
  const [data, setData] = useState<MetaAdsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await fetchMetaAds(market)
      if (result) {
        setData(result)
      } else {
        setError('Meta Ads API niet bereikbaar')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij laden Meta Ads data')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [market])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(() => load(true), SYNC_INTERVAL_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [load])

  return { data, loading, error, refetch: load }
}
