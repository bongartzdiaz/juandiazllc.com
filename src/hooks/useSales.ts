'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SalesData } from '@/lib/types'
import { fetchSalesData } from '@/lib/api/ghl'

export function useSales() {
  const [data, setData] = useState<SalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchSalesData()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij laden sales data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
