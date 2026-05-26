'use client'

/* ---------------------------------------------------------------
   Global error boundary — catches rendering errors in the root
   layout and reports them to Sentry (if configured).
   --------------------------------------------------------------- */

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Fire-and-forget Sentry report from the client.
    // The server-side sentry.ts wrapper is node-only; on the client
    // we post to a lightweight /api/log-error endpoint instead.
    if (typeof window !== 'undefined') {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message ?? 'Unknown error',
          stack: error?.stack,
          digest: error?.digest,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
        keepalive: true,
      }).catch(() => {
        /* swallow */
      })
    }
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
          background: '#0f172a',
          color: '#f8fafc',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#94a3b8',
              marginBottom: 12,
            }}
          >
            Something broke
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>
            Unexpected error
          </h1>
          <p style={{ color: '#f1f5f9', lineHeight: 1.5, margin: '0 0 24px' }}>
            The page couldn&apos;t render. The error has been logged — you can try again
            or head back to the dashboard.
          </p>
          {error?.digest ? (
            <p
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: 12,
                color: '#64748b',
                marginBottom: 24,
              }}
            >
              Ref: {error.digest}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#3b82f6',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid #334155',
                color: '#e2e8f0',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
