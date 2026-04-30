'use client'

import { useEffect } from 'react'
import { initBrowserSentry } from '@/lib/philly/sentry-browser'

/* Initialises the browser Sentry SDK once per page load. Mounted in
   the root layout. Renders nothing. No-ops cleanly when
   NEXT_PUBLIC_SENTRY_DSN is unset, so dev and small installs pay
   nothing. */
export function SentryBootstrap() {
  useEffect(() => {
    void initBrowserSentry()
  }, [])
  return null
}
