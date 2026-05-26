/* /admin/orgs/[orgId]/features — super-admin feature override matrix.
   ──────────────────────────────────────────────────────────────────
   One row per FEATURES key. Each row shows:
     - Feature key + description (i18n'd)
     - Current effective state via <SourceBadge>
     - Current override state (INHERIT / FORCED_ON / FORCED_OFF)
     - "Set override" button → opens <OverrideConfirmDialog>

   Saving triggers PUT /api/admin/orgs/[orgId]/features/[key], audit-logged
   and Slack-notified server-side (PR-2b). On success we refetch + toast.

   PR-3/4. */

'use client'

import { use, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useApi } from '@/hooks/philly/useApi'
import { useToast } from '@/hooks/philly/useToast'
import { SourceBadge } from '@/components/philly/features/SourceBadge'
import { OverrideConfirmDialog } from '@/components/philly/features/OverrideConfirmDialog'
import type { ResolveReason, SuperAdminOverride } from '@/lib/philly/features/resolve'
import { ArrowLeft, Settings2 } from 'lucide-react'

interface FeatureRow {
  key: string
  description: string
  enabledByDefault: boolean
  enabled: boolean
  source: ResolveReason
  override: {
    state: SuperAdminOverride
    reason: string
    createdById: string
    createdAt: string
    updatedAt: string
  } | null
}

interface MatrixResponse {
  data: {
    organization: { id: string; name: string; slug: string; plan: string | null }
    features: FeatureRow[]
  }
}

interface PageProps {
  params: Promise<{ orgId: string }>
}

export default function AdminOrgFeaturesPage({ params }: PageProps) {
  // Next.js 16 unwraps the params promise via React.use().
  const { orgId } = use(params)

  const t = useTranslations('adminFeatures')
  const tState = useTranslations('adminFeatures.state')
  const { addToast } = useToast()

  const { data, loading, error, refetch } = useApi<MatrixResponse>(
    `/admin/orgs/${orgId}/features`,
  )

  const [activeFeature, setActiveFeature] = useState<FeatureRow | null>(null)

  async function handleConfirm(input: { state: SuperAdminOverride; reason: string }) {
    if (!activeFeature) return
    const res = await fetch(`/api/admin/orgs/${orgId}/features/${activeFeature.key}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || t('toasts.saveFailed'))
    }
    setActiveFeature(null)
    addToast(t('toasts.saved'), 'success')
    refetch()
  }

  return (
    <>
      <Topbar
        title={data?.data.organization.name ?? t('title')}
        sub={data?.data.organization.slug ? `${data.data.organization.slug} · ${t('subtitle')}` : t('subtitle')}
      />
      <div style={{ padding: '24px 32px', maxWidth: 1080 }}>
        <Link
          href="/admin/orgs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--txt2)',
            textDecoration: 'none',
            fontSize: 12,
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {t('backToOrgs')}
        </Link>

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

        {data && (
          <>
            {data.data.organization.plan && (
              <div
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  marginBottom: 16,
                  fontSize: 12,
                  color: 'var(--txt2)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {t('planNote', { plan: data.data.organization.plan })}
              </div>
            )}

            <div
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {data.data.features.map((f, idx) => (
                <div
                  key={f.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: 16,
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <code
                        style={{
                          fontSize: 12,
                          fontFamily: 'var(--font-red-hat-mono), monospace',
                          background: 'var(--bg2)',
                          border: '1px solid var(--border)',
                          borderRadius: 5,
                          padding: '2px 6px',
                          color: 'var(--txt)',
                        }}
                      >
                        {f.key}
                      </code>
                      {f.override && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: 5,
                            background: 'var(--accent-bg)',
                            border: '1px solid var(--accent-border)',
                            color: 'var(--accent-txt)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {tState(`${f.override.state}.label`)}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 12, lineHeight: 1.45 }}>
                      {f.description}
                    </p>
                    {f.override && (
                      <p
                        style={{
                          margin: '4px 0 0 0',
                          color: 'var(--txt3)',
                          fontSize: 11,
                          fontStyle: 'italic',
                        }}
                      >
                        {t('overrideReason', { reason: f.override.reason })}
                      </p>
                    )}
                  </div>

                  <SourceBadge source={f.source} enabled={f.enabled} />

                  <button
                    type="button"
                    onClick={() => setActiveFeature(f)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'var(--bg2)',
                      color: 'var(--txt)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '7px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    aria-label={t('setOverrideAriaLabel', { feature: f.key })}
                  >
                    <Settings2 size={13} aria-hidden="true" />
                    {t('setOverride')}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {activeFeature && (
        <OverrideConfirmDialog
          open={!!activeFeature}
          onClose={() => setActiveFeature(null)}
          featureKey={activeFeature.key}
          currentState={activeFeature.override?.state ?? 'INHERIT'}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}
