'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MetaAdsData, Market } from '@/lib/types'
import { fetchMetaAds } from '@/lib/api/meta'

export function useMetaAds(market: Market = 'NL') {
  const [data, setData] = useState<MetaAdsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }, [market])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
