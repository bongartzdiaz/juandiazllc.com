/* /admin/orgs — super-admin org list page.
   ──────────────────────────────────────────────────────────────────
   Lists every Organization with a small per-row summary (plan,
   subscription status, count of active OrgFeatureOverride rows) and
   links to /admin/orgs/[id]/features for the matrix.

   Auth gate happens server-side via the GET /api/admin/orgs route's
   requireSuperAdmin() — this client page just renders 401/403 from
   the API response (no protected-route middleware needed; the API IS
   the security boundary).

   PR-3/4. */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useApi } from '@/hooks/philly/useApi'
import { Search, ArrowRight, ShieldCheck } from 'lucide-react'

interface OrgRow {
  id: string
  name: string
  slug: string
  industry: string
  createdAt: string
  plan: string | null
  subscriptionStatus: string | null
  overrideCount: number
}

interface OrgsResponse {
  data: OrgRow[]
  pagination: { total: number; limit: number; offset: number }
}

export default function AdminOrgsPage() {
  const t = useTranslations('adminOrgs')
  const [q, setQ] = useState('')

  // Debounce-free for simplicity — useApi caches by key, and the list
  // is small (super-admin browses, doesn't stress-test).
  const queryString = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  const { data, loading, error } = useApi<OrgsResponse>(`/admin/orgs${queryString}`)

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '24px 32px', maxWidth: 1080 }}>
        <div
          style={{
            position: 'relative',
            marginBottom: 20,
            maxWidth: 460,
          }}
        >
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--txt3)',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontSize: 13,
              background: 'var(--panel)',
              color: 'var(--txt)',
            }}
          />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: 'var(--r-bg)',
              border: '1px solid var(--r-border)',
              color: 'var(--r-txt)',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {t('errorLoading')}
          </div>
        )}

        {loading && (
          <div style={{ color: 'var(--txt2)', padding: '40px 0', textAlign: 'center' }}>
            {t('loading')}
          </div>
        )}

        {data && data.data.length === 0 && !loading && (
          <div
            style={{
              color: 'var(--txt2)',
              padding: '40px 0',
              textAlign: 'center',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
          >
            {t('empty')}
          </div>
        )}

        {data && data.data.length > 0 && (
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)', textAlign: 'left' }}>
                  <th style={thStyle}>{t('columnName')}</th>
                  <th style={thStyle}>{t('columnSlug')}</th>
                  <th style={thStyle}>{t('columnPlan')}</th>
                  <th style={thStyle}>{t('columnOverrides')}</th>
                  <th style={{ ...thStyle, width: 140 }} aria-label={t('columnActions')} />
                </tr>
              </thead>
              <tbody>
                {data.data.map(o => (
                  <tr
                    key={o.id}
                    style={{ borderTop: '1px solid var(--border)', transition: 'background 80ms' }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{o.name}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-red-hat-mono), monospace', color: 'var(--txt2)' }}>
                      {o.slug}
                    </td>
                    <td style={tdStyle}>
                      {o.plan ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'var(--accent-bg)',
                            border: '1px solid var(--accent-border)',
                            color: 'var(--accent-txt)',
                            fontSize: 10.5,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {o.plan}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--txt3)', fontStyle: 'italic' }}>
                          {t('noPlan')}
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {o.overrideCount > 0 ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: 'var(--accent-txt)',
                            fontWeight: 600,
                          }}
                        >
                          <ShieldCheck size={14} aria-hidden="true" />
                          {t('overrideCount', { count: o.overrideCount })}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--txt3)' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <Link
                        href={`/admin/orgs/${o.id}/features`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          color: 'var(--txt)',
                          textDecoration: 'none',
                          fontSize: 12,
                          fontWeight: 500,
                          background: 'var(--bg2)',
                        }}
                      >
                        {t('viewFeatures')}
                        <ArrowRight size={12} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.pagination.total > data.data.length && (
          <div
            style={{
              padding: 12,
              fontSize: 12,
              color: 'var(--txt3)',
              textAlign: 'center',
            }}
          >
            {t('paginationHint', { shown: data.data.length, total: data.pagination.total })}
          </div>
        )}
      </div>
    </>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--txt2)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid var(--border)',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  verticalAlign: 'middle',
}
