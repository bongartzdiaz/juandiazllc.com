'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useApi } from '@/hooks/philly/useApi'
import { useToast } from '@/hooks/philly/useToast'
import { ToggleLeft, ToggleRight, Info, RotateCcw, Power } from 'lucide-react'

/* Bundle BK — operator UI for the per-org feature flags introduced
   in Bundle BD. Lists every catalogued feature with its current
   state for the caller's org, lets admins flip the toggle or
   clear an override (fall back to global / code default). Every
   change goes through PATCH /api/admin/features which audit-logs +
   busts the cache. */

interface FlagState {
  key: string
  description: string
  enabledByDefault: boolean
  enabled: boolean
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 22, fontWeight: 700, marginBottom: 4, color: 'var(--txt)',
}
const sectionSubStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--txt2)', marginBottom: 24, maxWidth: 640, lineHeight: 1.55,
}

export default function FeatureFlagsPage() {
  const t = useTranslations('features')
  const { addToast } = useToast()
  const flagsQuery = useApi<{ data: FlagState[] }>('/admin/features')
  const flags = flagsQuery.data?.data ?? []
  const [busy, setBusy] = useState<string | null>(null)

  async function setFlag(key: string, enabled: boolean | null) {
    if (busy) return
    setBusy(key)
    try {
      const res = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        addToast(json?.error ?? t('toasts.updateFailed', { status: res.status }), 'error')
        return
      }
      addToast(
        enabled === null
          ? t('toasts.resetToDefault')
          : enabled
            ? t('toasts.featureEnabled')
            : t('toasts.featureDisabled'),
        'success',
      )
      flagsQuery.refetch()
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('toasts.networkError'), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />

      <div style={{ padding: '24px 32px', maxWidth: 880 }}>
        <h1 style={sectionTitleStyle}>{t('heading')}</h1>
        <p style={sectionSubStyle}>{t('description')}</p>

        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', borderRadius: 10,
            background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
            marginBottom: 24, fontSize: 12.5, color: 'var(--accent-txt)', lineHeight: 1.55,
          }}
        >
          <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('info')}</span>
        </div>

        {flagsQuery.loading && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
            {t('loading')}
          </div>
        )}

        {flagsQuery.error && (
          <div
            style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'var(--r-bg)', border: '1px solid var(--r-border)',
              color: 'var(--r-txt)', fontSize: 13,
            }}
          >
            {flagsQuery.error}
          </div>
        )}

        {!flagsQuery.loading && !flagsQuery.error && flags.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
            {t('empty')}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {flags.map((f) => {
            const isOverridden = f.enabled !== f.enabledByDefault
            return (
              <div
                key={f.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--panel)',
                  border: `1px solid ${isOverridden ? 'var(--accent-border)' : 'var(--border)'}`,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: f.enabled ? 'var(--g-bg)' : 'var(--r-bg)',
                    border: `1px solid ${f.enabled ? 'var(--g-border)' : 'var(--r-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Power size={14} color={f.enabled ? 'var(--g-txt)' : 'var(--r-txt)'} />
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <code
                      style={{
                        fontFamily: 'var(--font-red-hat-mono), monospace',
                        fontSize: 13, fontWeight: 600, color: 'var(--txt)',
                      }}
                    >
                      {f.key}
                    </code>
                    {isOverridden && (
                      <span
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
                          background: 'var(--accent-bg)', color: 'var(--accent-txt)',
                          border: '1px solid var(--accent-border)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}
                      >
                        {t('orgOverride')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.5 }}>
                    {f.description}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
                    {t('codeDefault', { state: f.enabledByDefault ? t('enabled') : t('disabled') })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {isOverridden && (
                    <button
                      type="button"
                      onClick={() => setFlag(f.key, null)}
                      disabled={busy === f.key}
                      title={t('resetTitle')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                        background: 'var(--bg2)', color: 'var(--txt2)',
                        border: '1px solid var(--border)', cursor: 'pointer',
                        fontFamily: 'inherit',
                        opacity: busy === f.key ? 0.5 : 1,
                      }}
                    >
                      <RotateCcw size={11} />
                      {t('reset')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFlag(f.key, !f.enabled)}
                    disabled={busy === f.key}
                    aria-label={t('toggleAriaLabel', { key: f.key })}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '6px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 700,
                      background: f.enabled ? 'var(--g-bg)' : 'var(--bg2)',
                      color: f.enabled ? 'var(--g-txt)' : 'var(--txt2)',
                      border: `1px solid ${f.enabled ? 'var(--g-border)' : 'var(--border)'}`,
                      cursor: 'pointer', fontFamily: 'inherit',
                      opacity: busy === f.key ? 0.5 : 1,
                      minWidth: 90, justifyContent: 'center',
                    }}
                  >
                    {f.enabled ? (
                      <>
                        <ToggleRight size={14} />
                        {t('enabledLabel')}
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={14} />
                        {t('disabledLabel')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
