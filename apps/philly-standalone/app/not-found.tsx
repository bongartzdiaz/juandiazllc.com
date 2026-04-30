import Link from 'next/link'

/* App-level 404 — fired when a route segment can't be matched OR
   when a leaf calls notFound(). The CRM doesn't go through the
   marketing-site brand layout, so this lives on the standalone
   tree. */

export default function NotFound() {
  return (
    <div
      style={{
        padding: '80px 24px',
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
        404
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--txt)' }}>
        Page not found
      </h1>
      <p
        style={{
          color: 'var(--txt2)',
          maxWidth: 420,
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        The link you followed may be broken, or the page may have been moved. Use the navigation
        on the left, or jump back to the dashboard.
      </p>
      <Link
        href="/dashboard"
        style={{
          marginTop: 8,
          padding: '8px 18px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg2)',
          color: 'var(--txt)',
          fontWeight: 600,
          fontSize: 13,
          textDecoration: 'none',
        }}
      >
        Go to dashboard
      </Link>
    </div>
  )
}
