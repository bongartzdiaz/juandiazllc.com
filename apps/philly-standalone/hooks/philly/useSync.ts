'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

/* ---------------------------------------------------------------
   useSync — Global sync coordination via a simple pub/sub registry
   --------------------------------------------------------------- */

type RefetchFn = () => void | Promise<void>

/**
 * In-memory registry shared across all hook instances in the same
 * JS context. Keys are arbitrary source names (usually the API path).
 */
const registry = new Map<string, RefetchFn>()

/**
 * Called from useApi to register a refetch function.
 * Automatically unregisters on unmount.
 */
export function useSyncRegistry(key: string, refetch: RefetchFn) {
  useEffect(() => {
    registry.set(key, refetch)
    return () => {
      registry.delete(key)
    }
  }, [key, refetch])
}

/* ---- Main hook ---- */

export function useSync() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /** Trigger refetch on every registered API hook. */
  const syncAll = useCallback(async () => {
    setSyncing(true)
    const fns = Array.from(registry.values())

    try {
      await Promise.allSettled(fns.map((fn) => fn()))
    } finally {
      if (mountedRef.current) {
        setLastSync(new Date())
        setSyncing(false)
      }
    }
  }, [])

  /** Trigger refetch for a single registered source by key. */
  const syncSource = useCallback(async (name: string) => {
    const fn = registry.get(name)
    if (!fn) return

    setSyncing(true)
    try {
      await fn()
    } finally {
      if (mountedRef.current) {
        setLastSync(new Date())
        setSyncing(false)
      }
    }
  }, [])

  return { syncing, lastSync, syncAll, syncSource }
}
