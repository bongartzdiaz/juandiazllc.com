'use client'

/* Route-segment error boundary. Fires on render errors inside the
   matched segment but above its leaf — global-error.tsx only fires
   when the root layout itself throws. This handler keeps the layout
   chrome (Topbar, Sidebar, etc.) intact while showing the error UI
   in the content area, which is the better UX for ~95% of failures. */

import { useEffect } from 'react'

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'segment',
          message: error?.message ?? 'Unknown error',
          stack: error?.stack,
          digest: error?.digest,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      /* never let the error reporter itself crash */
    }
  }, [error])

  return (
    <div
      style={{
        padding: '60px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--txt3)',
        }}
      >
        Section error
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--txt)' }}>
        Something broke loading this page
      </h1>
      <p style={{ color: 'var(--txt2)', maxWidth: 420, textAlign: 'center', margin: 0, lineHeight: 1.55 }}>
        The page couldn&apos;t render. The error has been logged. Try again, or use the navigation
        on the left to head somewhere else.
      </p>
      {error?.digest ? (
        <p style={{ fontFamily: 'var(--font-red-hat-mono), monospace', fontSize: 11, color: 'var(--txt3)', margin: 0 }}>
          ref: {error.digest}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          onClick={reset}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
