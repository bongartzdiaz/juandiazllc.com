/* /[locale]/status — public uptime + dependency-health page.
 *
 * Calls /philly/api/health server-side and renders it without auth.
 * The health endpoint is already on PUBLIC_PHILLY_PATHS so this works
 * without a session cookie.
 *
 * Why a status page at all:
 *   - Customers want to know "is it me or is it them" without emailing
 *     support. A 1-click /status answers that.
 *   - During Hetzner cutover (Friday 2026-05-15) we'll point this at
 *     the new infra and customers can verify it's reachable.
 *   - Audit-clean: matches what every B2B SaaS does. No-cost trust
 *     signal.
 *
 * Refresh strategy: page is `force-dynamic` (no caching), and a tiny
 * client-side JS interval re-fetches every 30s so a customer leaving
 * it open during an incident sees updates without a hard reload.
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'
import StatusRefresher from '@/components/status/StatusRefresher'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Utility page — give it a clear title but keep it OUT of the index (it's a
// live health view, not a ranking target; a SERP entry could show stale or
// "degraded" status). Not in the sitemap either (app/sitemap.ts).
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'System status — Juan Diaz, LLC',
    description: 'Live uptime and dependency health for juandiazllc.com services.',
    robots: { index: false, follow: true },
  }
}

interface HealthCheck {
  name: string
  ok: boolean
  critical: boolean
  latencyMs?: number
  detail?: string
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'down'
  checks: HealthCheck[]
  timestamp?: string
}

async function fetchHealth(): Promise<{ data: HealthResponse | null; status: number }> {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'
  try {
    const res = await fetch(`${base}/philly/api/health`, {
      cache: 'no-store',
      next: { revalidate: 0 },
    })
    const data = (await res.json().catch(() => null)) as HealthResponse | null
    return { data, status: res.status }
  } catch {
    return { data: null, status: 0 }
  }
}

export default async function StatusPage() {
  const { data, status } = await fetchHealth()

  const overall = data?.status ?? (status === 0 ? 'down' : 'degraded')
  const banner = overall === 'ok' ? OK_BANNER : overall === 'degraded' ? DEGRADED_BANNER : DOWN_BANNER

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 96px' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 700 }}>DEUS status</h1>
        <p style={{ margin: 0, opacity: 0.7, fontSize: 15 }}>
          Live health of the DEUS platform. Refreshes every 30 seconds while this page is open.
        </p>
      </header>

      <div
        role="status"
        aria-live="polite"
        style={{
          padding: 20,
          borderRadius: 12,
          background: banner.bg,
          border: `1px solid ${banner.border}`,
          color: banner.fg,
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            background: banner.dot,
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>{banner.title}</div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>{banner.subtitle}</div>
        </div>
      </div>

      <section>
        <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Components
        </h2>
        {data?.checks && data.checks.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {data.checks.map((c) => (
              <li
                key={c.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid var(--bd, #e5e7eb)',
                  background: 'var(--bg, white)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      background: c.ok ? '#10b981' : c.critical ? '#dc2626' : '#f59e0b',
                    }}
                  />
                  {/* Screen-reader equivalent of the colour dot — WCAG 1.4.1
                      "use of colour" (don't rely on colour alone). */}
                  <span
                    style={{
                      position: 'absolute',
                      width: 1,
                      height: 1,
                      padding: 0,
                      margin: -1,
                      overflow: 'hidden',
                      clip: 'rect(0,0,0,0)',
                      whiteSpace: 'nowrap',
                      border: 0,
                    }}
                  >
                    {c.ok ? 'Operational' : c.critical ? 'Down' : 'Degraded'}:
                  </span>
                  <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {labelFor(c.name)}
                  </span>
                  {!c.critical && !c.ok && (
                    <span style={{ fontSize: 12, opacity: 0.6 }}>(non-critical)</span>
                  )}
                </div>
                <div style={{ fontSize: 12, opacity: 0.65, fontFamily: 'monospace' }}>
                  {c.ok ? `${c.latencyMs ?? 0}ms` : 'fail'}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ padding: 16, opacity: 0.65, fontSize: 14 }}>
            Couldn’t reach the health endpoint. Either DEUS is down or your connection can’t reach
            our servers — try again in a moment.
          </div>
        )}
      </section>

      <footer style={{ marginTop: 48, fontSize: 13, opacity: 0.6 }}>
        <p style={{ margin: '0 0 6px' }}>
          Hosted on Hetzner Falkenstein (Germany). Backups on Backblaze B2 (Amsterdam). All data in
          the EU.
        </p>
        <p style={{ margin: 0 }}>
          Reporting an incident? Email{' '}
          <a href="mailto:support@lucen.ai">support@lucen.ai</a> with timestamp + what you saw.
        </p>
      </footer>

      <Suspense>
        <StatusRefresher />
      </Suspense>
    </main>
  )
}

const OK_BANNER = {
  title: 'All systems operational',
  subtitle: 'Database and dependencies are responding within budget.',
  bg: 'rgba(16,185,129,0.08)',
  border: 'rgba(16,185,129,0.30)',
  fg: 'inherit',
  dot: '#10b981',
} as const

const DEGRADED_BANNER = {
  title: 'Degraded performance',
  subtitle: 'A non-critical dependency is slow or unreachable. Core CRM remains available.',
  bg: 'rgba(245,158,11,0.08)',
  border: 'rgba(245,158,11,0.30)',
  fg: 'inherit',
  dot: '#f59e0b',
} as const

const DOWN_BANNER = {
  title: 'Service disruption',
  subtitle: 'A critical dependency (database) is unreachable. We have been paged automatically.',
  bg: 'rgba(220,38,38,0.08)',
  border: 'rgba(220,38,38,0.30)',
  fg: 'inherit',
  dot: '#dc2626',
} as const

function labelFor(name: string): string {
  switch (name) {
    case 'database':
      return 'Database'
    case 'supabase_auth':
      return 'Authentication'
    case 'stripe':
      return 'Billing (Stripe)'
    case 'email_provider':
      return 'Email delivery'
    default:
      return name.replace(/_/g, ' ')
  }
}
