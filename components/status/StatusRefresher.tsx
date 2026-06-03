'use client'

/* Tiny client-side refresher for /status — reloads the page every 30s
 * so a customer with the tab open during an incident sees updates
 * without a manual refresh. Stops when the tab is hidden (no point
 * burning the health endpoint for a backgrounded tab). */

import { useEffect } from 'react'

const REFRESH_MS = 30_000

export default function StatusRefresher() {
  useEffect(() => {
    let timer: number | undefined
    const schedule = () => {
      window.clearTimeout(timer)
      if (document.hidden) return
      timer = window.setTimeout(() => {
        // Use full reload so the SSR rendering picks up fresh data;
        // a fetch-and-replace would re-implement the whole page.
        window.location.reload()
      }, REFRESH_MS)
    }
    const onVis = () => schedule()
    schedule()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.clearTimeout(timer)
    }
  }, [])
  return null
}
