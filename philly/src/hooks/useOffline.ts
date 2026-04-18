'use client'

/* Simple online/offline tracking + service-worker registration. */

import { useEffect, useState } from 'react'

export function useOffline() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return { isOnline, isOffline: !isOnline }
}

/** Register the service worker on mount. Safe to call multiple times. */
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV === 'development') return

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => {
      console.warn('[sw] registration failed', err)
    })
  }, [])
}
