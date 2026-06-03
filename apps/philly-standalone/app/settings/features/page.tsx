'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useApi } from '@/hooks/philly/useApi'
import { useToast } from '@/hooks/philly/useToast'
import { ToggleLeft, ToggleRight, Info, Lock, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { SourceBadge } from '@/components/philly/features/SourceBadge'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import type { ResolveReason, SuperAdminOverride } from '@/lib/philly/features/resolve'

/* PR-4 — Layer 2 (client-admin) refactor of the feature-flag UI.
   ────────────────────────────────────────────────────────────────
   Previous version (Bundle BK) was a flat toggle list: admin could
   flip any feature on/off via PATCH /api/admin/features. That predates
   the two-level UX — it ignored plan tiers and super-admin overrides.

   This version respects the FULL resolver precedence:

     Source                                | UI shown
     ──────────────────────────────────────|─────────────────────────
     enabled                               | Toggle (can DISABLE)
     client-admin-disabled                 | Toggle (can RE-ENABLE)
     default-disabled                      | Toggle (can ENABLE — if in-plan)
     plan-not-included                     | Upgrade CTA (no toggle)
     global-disabled                       | Lock badge — "platform paused"
     super-admin-forced-on                 | Lock badge — "set by support"
     super-admin-forced-on-out-of-plan     | Lock badge — "preview by support"
     super-admin-forced-off                | Lock badge — "set by support"

   The toggle ONLY appears when the user can actually act. Lock/CTA
   states are read-only and link to the operator (lucenai.eu support
   for super-admin overrides; /billing for plan upgrades).

   Impact warnings (PR-4): before disabling a feature with measurable
   user-facing impact (drip-campaigns, webhooks, scim), fetches
   GET /api/admin/features/impact/[key] and surfaces the count in a
   confirm dialog. Non-impactful disables skip straight to the action. */

interface FlagState {
  key: string
  description: string
  enabledByDefault: boolean
  enabled: boolean
  source: ResolveReason
  override: { state: SuperAdminOverride; reason: string } | null
}

interface ImpactResponse {
  data: { count: number; messageKey: string } | null
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 22, fontWeight: 700, marginBottom: 4, color: 'var(--txt)',
}
const sectionSubStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--txt2)', marginBottom: 24, maxWidth: 640, lineHeight: 1.55,
}

/**
 * What can this user DO with this feature row?
 * Drives whether we show a toggle vs a lock vs an upgrade CTA.
 */
function rowMode(source: ResolveReason): 'toggle' | 'lock-platform' | 'lock-support' | 'upgrade' {
  switch (source) {
    case 'enabled':
    case 'client-admin-disabled':
    case 'default-disabled':
      return 'toggle'
    case 'plan-not-included':
      return 'upgrade'
    case 'global-disabled':
      return 'lock-platform'
    case 'super-admin-forced-on':
    case 'super-admin-forced-on-out-of-plan':
    case 'super-admin-forced-off':
      return 'lock-support'
  }
}

export default function FeatureFlagsPage() {
  const t = useTranslations('features')
  const { addToast } = useToast()
  const flagsQuery = useApi<{ data: FlagState[] }>('/admin/features')
  const flags = flagsQuery.data?.data ?? []

  const [busy, setBusy] = useState<string | null>(null)
  // When non-null, the confirm dialog is open and showing impact for this flag.
  const [confirmTarget, setConfirmTarget] = useState<FlagState | null>(null)
  const [impact, setImpact] = useState<ImpactResponse['data']>(null)
  const [impactLoading, setImpactLoading] = useState(false)

  async function openConfirm(flag: FlagState) {
    setConfirmTarget(flag)
    setImpact(null)
    setImpactLoading(true)
    try {
      const res = await fetch(`/api/admin/features/impact/${flag.key}`)
      const json = (await res.json().catch(() => ({ data: null }))) as ImpactResponse
      setImpact(json.data)
    } catch {
      // Impact fetch failure is non-fatal — show the dialog without a count.
      setImpact(null)
    } finally {
      setImpactLoading(false)
    }
  }

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
      setConfirmTarget(null)
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

        {flagsQuery.error ? (
          <ListError onRetry={flagsQuery.refetch} message={flagsQuery.error} />
        ) : flagsQuery.loading ? (
          <ListLoading />
        ) : flags.length === 0 ? (
          <ListEmpty />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {flags.map(f => {
            const mode = rowMode(f.source)
            return (
              <div
                key={f.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--panel)',
                  border: `1px solid ${mode === 'lock-support' ? 'var(--accent-border)' : 'var(--border)'}`,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <code
                      style={{
                        fontFamily: 'var(--font-red-hat-mono), monospace',
                        fontSize: 13, fontWeight: 600, color: 'var(--txt)',
                      }}
                    >
                      {f.key}
                    </code>
                    <SourceBadge source={f.source} enabled={f.enabled} />
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--txt2)', lineHeight: 1.5 }}>
                    {f.description}
                  </p>
                  {mode === 'lock-support' && f.override && (
                    <p
                      style={{
                        margin: '6px 0 0 0', fontSize: 11.5, color: 'var(--accent-txt)',
                        fontStyle: 'italic',
                      }}
                    >
                      {t('supportReason', { reason: f.override.reason })}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {mode === 'toggle' && (
                    <ToggleButton
                      enabled={f.enabled}
                      busy={busy === f.key}
                      onClick={() => {
                        if (f.enabled) {
                          // Disabling — gather impact first.
                          void openConfirm(f)
                        } else {
                          // Enabling is safe — no impact warning needed.
                          void setFlag(f.key, true)
                        }
                      }}
                      labelEnabled={t('enabledLabel')}
                      labelDisabled={t('disabledLabel')}
                      ariaLabel={t('toggleAriaLabel', { key: f.key })}
                    />
                  )}
                  {mode === 'lock-support' && (
                    <LockPill icon={<Lock size={12} aria-hidden="true" />} label={t('lockSupport')} />
                  )}
                  {mode === 'lock-platform' && (
                    <LockPill icon={<AlertTriangle size={12} aria-hidden="true" />} label={t('lockPlatform')} />
                  )}
                  {mode === 'upgrade' && (
                    <a
                      href="/settings/billing"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 7,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: 'var(--accent)',
                        color: '#fff',
                        textDecoration: 'none',
                      }}
                    >
                      {t('upgradeCTA')}
                      <ArrowUpRight size={12} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {confirmTarget && (
        <DisableConfirmDialog
          open={!!confirmTarget}
          flag={confirmTarget}
          impact={impact}
          impactLoading={impactLoading}
          saving={busy === confirmTarget.key}
          onClose={() => setConfirmTarget(null)}
          onConfirm={() => setFlag(confirmTarget.key, false)}
        />
      )}
    </>
  )
}

// ── Small helpers (kept in-file — tiny + only used here) ────────────────

function ToggleButton({
  enabled,
  busy,
  onClick,
  labelEnabled,
  labelDisabled,
  ariaLabel,
}: {
  enabled: boolean
  busy: boolean
  onClick: () => void
  labelEnabled: string
  labelDisabled: string
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 10px',
        borderRadius: 7,
        fontSize: 11.5,
        fontWeight: 700,
        background: enabled ? 'var(--g-bg)' : 'var(--bg2)',
        color: enabled ? 'var(--g-txt)' : 'var(--txt2)',
        border: `1px solid ${enabled ? 'var(--g-border)' : 'var(--border)'}`,
        cursor: busy ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        opacity: busy ? 0.5 : 1,
        minWidth: 100,
        justifyContent: 'center',
      }}
    >
      {enabled ? (
        <>
          <ToggleRight size={14} />
          {labelEnabled}
        </>
      ) : (
        <>
          <ToggleLeft size={14} />
          {labelDisabled}
        </>
      )}
    </button>
  )
}

function LockPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 12px',
        borderRadius: 7,
        fontSize: 11.5,
        fontWeight: 600,
        background: 'var(--bg2)',
        color: 'var(--txt2)',
        border: '1px solid var(--border)',
      }}
    >
      {icon}
      {label}
    </span>
  )
}

function DisableConfirmDialog({
  open,
  flag,
  impact,
  impactLoading,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean
  flag: FlagState
  impact: { count: number; messageKey: string } | null
  impactLoading: boolean
  saving: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const t = useTranslations('features.confirmDisable')
  const tImpact = useTranslations('features.impact')

  return (
    <Modal open={open} onClose={onClose} title={t('title', { key: flag.key })} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--txt)', lineHeight: 1.55 }}>
          {t('body')}
        </p>

        {impactLoading && (
          <div style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic' }}>
            {t('impactLoading')}
          </div>
        )}

        {impact && impact.count > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--y-bg)',
              border: '1px solid var(--y-border)',
              color: 'var(--y-txt)',
              fontSize: 12.5,
              lineHeight: 1.55,
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <span>{tImpact(impact.messageKey as 'drip-campaigns' | 'webhooks' | 'scim', { count: impact.count })}</span>
          </div>
        )}

        {impact && impact.count === 0 && (
          <div style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic' }}>
            {t('noImpact')}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 8,
            paddingTop: 14,
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--bg2)',
              color: 'var(--txt2)',
              border: '1px solid var(--border)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--r-txt)',
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? t('saving') : t('confirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
