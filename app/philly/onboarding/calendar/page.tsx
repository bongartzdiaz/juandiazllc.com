'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Calendar, Lock, Check, AlertTriangle } from 'lucide-react'
import {
  OnboardingFrame, obButtonSecondary, obButtonPrimary,
} from '@/components/philly/onboarding/OnboardingFrame'
import type { ConnectionDTO, ConnectionsResponse } from '@/lib/philly/calendar/types'

// Same source of truth as /settings/integrations — see lib/philly/calendar/types.ts.
// Inline interfaces drifted across the two surfaces during Bundle D2 (the
// `channel` field landed only in settings); now both consume the shared DTO.
type Provider = 'google' | 'microsoft'
type Connection = ConnectionDTO

export default function StepCalendar() {
  const router = useRouter()
  const params = useSearchParams()
  const t = useTranslations('wizard.calendar')
  const [connections, setConnections] = useState<Connection[] | null>(null)
  const [busy, setBusy] = useState<Provider | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [justConnected, setJustConnected] = useState<Provider | null>(null)

  const PROVIDERS: Array<{ key: Provider; label: string; detail: string }> = [
    { key: 'google',    label: t('googleBtn'),  detail: t('googleDetail') },
    { key: 'microsoft', label: t('outlookBtn'), detail: t('outlookDetail') },
  ]

  const providerName = (p: Provider): string =>
    p === 'google' ? t('googleProviderName') : t('outlookProviderName')

  const humanizeError = (code: string): string => {
    if (code === 'access_denied') return t('errAccessDenied')
    if (code.startsWith('state_')) return t('errStateExpired')
    if (code.startsWith('token_provider_not_configured')) return t('errProviderNotConfigured')
    if (code.startsWith('token_')) return t('errTokenRejected')
    if (code === 'session_lost') return t('errSessionLost')
    if (code === 'missing_params') return t('errMissingParams')
    return t('errGeneric', { code })
  }

  // Surface query-param feedback from the OAuth callback redirect.
  useEffect(() => {
    const err = params.get('error')
    if (err) setErrorMsg(humanizeError(err))
    const connected = params.get('connected')
    if (connected === 'google' || connected === 'microsoft') {
      setJustConnected(connected)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  // Pull current connections so we can render connected-state badges
  // and offer a Disconnect affordance instead of a re-Connect button.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/philly/api/calendar/connections', { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) setConnections([])
          return
        }
        const json = await res.json() as ConnectionsResponse
        if (!cancelled) setConnections(json.data ?? [])
      } catch {
        if (!cancelled) setConnections([])
      }
    })()
    return () => { cancelled = true }
  }, [justConnected])

  const advance = async () => {
    await fetch('/philly/api/onboarding/step', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'done' }),
    })
    await fetch('/philly/api/onboarding/complete', { method: 'POST' })
    router.push('/philly/onboarding/done')
  }

  const skip = async () => {
    await fetch('/philly/api/onboarding/skip', { method: 'POST' })
    await advance()
  }

  const startConnect = (provider: Provider) => {
    setBusy(provider)
    setErrorMsg(null)
    // Server-side redirect to provider's authorize page. The state token
    // pins this user/org to the callback, so even if a tab is hijacked
    // mid-flow, tokens land on the right account.
    window.location.href =
      `/philly/api/calendar/oauth/start?provider=${provider}` +
      `&redirect=${encodeURIComponent('/philly/onboarding/calendar')}`
  }

  const disconnect = async (id: string) => {
    if (!confirm(t('disconnectConfirm'))) return
    const res = await fetch(`/philly/api/calendar/connections/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setConnections((curr) =>
        (curr ?? []).map((c) => (c.id === id ? { ...c, status: 'revoked' } : c)),
      )
    }
  }

  const findActive = (provider: Provider): Connection | undefined =>
    connections?.find((c) => c.provider === provider && c.status === 'active')

  return (
    <OnboardingFrame
      step="calendar"
      title={t('heading')}
      sub={t('sub')}
      footer={
        <>
          <button type="button" onClick={advance} style={obButtonPrimary}>
            {t('continueCta')}
          </button>
          <button type="button" onClick={skip} style={obButtonSecondary}>
            {t('skip')}
          </button>
        </>
      }
    >
      {errorMsg && (
        <div role="alert" style={errorBoxStyle}>
          <AlertTriangle size={14} aria-hidden />
          <span>{errorMsg}</span>
        </div>
      )}

      {justConnected && (
        <div role="status" style={successBoxStyle}>
          <Check size={14} aria-hidden />
          <span>{t('providerConnected', { provider: providerName(justConnected) })}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PROVIDERS.map((p) => {
          const active = findActive(p.key)
          if (active) {
            return (
              <div key={p.key} style={connectedRowStyle}>
                <Check size={16} style={{ color: 'var(--ok)' }} aria-hidden />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{providerName(p.key)}</span>
                  {active.providerEmail && (
                    <span style={{ fontSize: 11, color: 'var(--txt2)' }}>
                      {active.providerEmail}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => disconnect(active.id)}
                  style={{ ...obButtonSecondary, padding: '4px 10px', fontSize: 11 }}
                >
                  {t('disconnect')}
                </button>
              </div>
            )
          }
          return (
            <button
              key={p.key}
              type="button"
              disabled={busy === p.key}
              onClick={() => startConnect(p.key)}
              style={{
                ...obButtonSecondary,
                justifyContent: 'flex-start',
                padding: '12px 14px',
                opacity: busy === p.key ? 0.6 : 1,
              }}
            >
              <Calendar size={16} style={{ color: 'var(--accent)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span>{p.label}</span>
                <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{p.detail}</span>
              </div>
              <Lock
                size={12}
                style={{ marginLeft: 'auto', color: 'var(--txt3)' }}
                aria-label={t('lockAria')}
              />
            </button>
          )
        })}
      </div>

      <details style={{ marginTop: 16, fontSize: 12, color: 'var(--txt2)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('trustToggle')}</summary>
        <ul style={{ margin: '8px 0 0 18px', padding: 0, lineHeight: 1.7 }}>
          <li>{t('trustBullet1')}</li>
          <li>{t('trustBullet2')}</li>
          <li>{t('trustBullet3')}</li>
        </ul>
      </details>
    </OnboardingFrame>
  )
}

const errorBoxStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
  padding: '8px 12px', borderRadius: 6, fontSize: 12, lineHeight: 1.4,
  background: 'var(--bg2)', color: 'var(--err)',
  border: '1px solid var(--border)',
}
const successBoxStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
  padding: '8px 12px', borderRadius: 6, fontSize: 12, lineHeight: 1.4,
  background: 'var(--bg2)', color: 'var(--ok)',
  border: '1px solid var(--border)',
}
const connectedRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 14px', borderRadius: 8,
  background: 'var(--bg2)', border: '1px solid var(--border)',
}
