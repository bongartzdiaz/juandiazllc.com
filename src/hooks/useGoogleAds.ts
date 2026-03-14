'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GoogleAdsData, Market } from '@/lib/types'
import { fetchGoogleAds } from '@/lib/api/google'

export function useGoogleAds(market: Market = 'NL') {
  const [data, setData] = useState<GoogleAdsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchGoogleAds(market)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij laden Google Ads data')
    } finally {
      setLoading(false)
    }
  }, [market])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
