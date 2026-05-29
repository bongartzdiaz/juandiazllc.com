// Root-level loading.tsx — Next 16 streams this as an INSTANT Suspense
// fallback on every navigation while the real route segment fetches.
// Without it, the user stares at the previous route until the new one
// is ready (router blocks paint). With it, they see a topbar shell and
// shimmer grid the moment they click — perceived load time drops from
// ~600-1200ms to ~50ms. The actual page replaces this when it streams in.
//
// Keep the markup minimal and CSS-only (no client hooks, no fetches) so
// this renders before any JS hydrates.

export default function RootLoading() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ padding: '18px 24px 40px' }}>
      {/* Topbar skeleton — mirrors the real topbar's vertical rhythm so the
          page doesn't "jump" when the real one paints */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 22, paddingBottom: 14, borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={skel(220, 24, 6)} />
          <div style={{ ...skel(320, 14, 4), marginTop: 6 }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={skel(110, 32, 8)} />
          <div style={skel(36, 32, 8)} />
        </div>
      </div>

      {/* KPI strip skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 15px', minHeight: 122,
          }}>
            <div style={skel(80, 10, 4)} />
            <div style={{ ...skel(110, 26, 6), marginTop: 14 }} />
            <div style={{ ...skel(140, 12, 4), marginTop: 10 }} />
            <div style={{ ...skel('100%', 4, 2), marginTop: 16 }} />
          </div>
        ))}
      </div>

      {/* Main panel skeleton */}
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 20, minHeight: 320,
      }}>
        <div style={skel(180, 16, 4)} />
        <div style={{ ...skel('100%', 280, 8), marginTop: 18 }} />
      </div>

      <style>{`
        @keyframes shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
      `}</style>
    </div>
  )
}

function skel(width: number | string, height: number, radius: number): React.CSSProperties {
  return {
    width, height, borderRadius: radius,
    background: 'linear-gradient(90deg, var(--bg2) 0%, var(--border) 40%, var(--bg2) 80%)',
    backgroundSize: '400px 100%',
    animation: 'shimmer 1.4s ease-in-out infinite',
  }
}
