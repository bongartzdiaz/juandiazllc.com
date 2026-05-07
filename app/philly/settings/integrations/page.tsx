'use client'

// Per-user integrations settings — currently calendar (Google + Microsoft).
//
// Distinct from the workspace-level /philly/integrations page which manages
// per-organization Integration rows (Stripe, Slack, Mailchimp, etc. — one
// connection per org). Calendar connections are per-user by design (every
// teammate connects their own Google/Outlook account), so they need their
// own settings surface.
//
// Surfaces the same /api/calendar/connections endpoints used by the
// onboarding wizard, just framed as a settings page so users can manage
// connections AFTER first-time setup.

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/philly/layout/Topbar'
import {
  Calendar, Check, AlertTriangle, Lock, ExternalLink, Plug, Info,
} from 'lucide-react'

type Provider = 'google' | 'microsoft'

interface Connection {
  id: string
  provider: Provider
  providerEmail: string | null
  status: string
  scopes: string[]
  connectedAt: string
  lastUsedAt: string | null
  lastError: string | null
}

interface ProvMeta {
  key: Provider
  label: string
  description: string
  brandColor: string
}

const PROVIDERS: ProvMeta[] = [
  {
    key: 'google',
    label: 'Google Calendar',
    description: 'Read your primary calendar — Gmail, Workspace, personal Google accounts.',
    brandColor: '#4285f4',
  },
  {
    key: 'microsoft',
    label: 'Outlook / Microsoft 365',
    description: 'Read your primary calendar — Outlook.com, Microsoft 365, Exchange Online.',
    brandColor: '#0078d4',
  },
]

const sectionStyle: React.CSSProperties = {
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--txt)',
}

const sectionSubStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--txt3)', marginBottom: 16,
}

export default function IntegrationsSettings() {
  const params = useSearchParams()
  const [connections, setConnections] = useState<Connection[] | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [pendingDisconnect, setPendingDisconnect] = useState<string | null>(null)

  // Surface ?error= / ?connected= from the OAuth callback redirect — same
  // contract as the onboarding wizard so users see consistent feedback
  // regardless of where they ran the connect flow from.
  useEffect(() => {
    const err = params.get('error')
    if (err) setErrorMsg(humanizeError(err))
    const connected = params.get('connected')
    if (connected === 'google' || connected === 'microsoft') {
      setSuccessMsg(`${providerLabel(connected)} connected.`)
    }
  }, [params])

  // Load connections — refreshes when the success banner triggers (after
  // a connect/disconnect round-trip the list should update without manual
  // reload).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/philly/api/calendar/connections', { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) setConnections([])
          return
        }
        const json = await res.json() as { data: Connection[] }
        if (!cancelled) setConnections(json.data ?? [])
      } catch {
        if (!cancelled) setConnections([])
      }
    })()
    return () => { cancelled = true }
  }, [successMsg, pendingDisconnect])

  const startConnect = (provider: Provider) => {
    setErrorMsg(null)
    // Server-side redirect to provider's authorize URL. State token binds
    // this user/org to the callback — no race possible if the user opens
    // the wizard in another tab mid-flow.
    window.location.href =
      `/philly/api/calendar/oauth/start?provider=${provider}` +
      `&redirect=${encodeURIComponent('/philly/settings/integrations')}`
  }

  const disconnect = async (id: string, providerLabel: string) => {
    if (!confirm(`Disconnect ${providerLabel}?\n\nYou can reconnect any time. Existing meetings already synced into DEUS stay.`)) return
    setPendingDisconnect(id)
    try {
      const res = await fetch(`/philly/api/calendar/connections/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccessMsg(`${providerLabel} disconnected.`)
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setErrorMsg(body.error ?? `Disconnect failed (${res.status})`)
      }
    } catch {
      setErrorMsg('Network error during disconnect.')
    } finally {
      setPendingDisconnect(null)
    }
  }

  const findActive = (provider: Provider): Connection | undefined =>
    connections?.find((c) => c.provider === provider && c.status === 'active')

  return (
    <>
      <Topbar
        title="Personal integrations"
        sub="Calendar connections tied to your account — separate from workspace tools"
      />
      <main style={{ padding: '18px 24px 40px', maxWidth: 880, margin: '0 auto' }}>
        {errorMsg && (
          <div role="alert" style={{ ...flashStyle, color: 'var(--err)' }}>
            <AlertTriangle size={14} aria-hidden /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div role="status" style={{ ...flashStyle, color: 'var(--ok)' }}>
            <Check size={14} aria-hidden /> {successMsg}
          </div>
        )}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>Calendar</div>
          <div style={sectionSubStyle}>
            Read-only sync of your primary calendar. Meetings on a deal show up in DEUS without copy-paste.
          </div>

          {connections === null && (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--txt3)' }}>Loading…</div>
          )}

          {connections !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PROVIDERS.map((p) => {
                const active = findActive(p.key)
                const errorRow = connections.find(
                  (c) => c.provider === p.key && c.status === 'error',
                )
                const isBusy = pendingDisconnect === active?.id

                return (
                  <div key={p.key} style={providerRowStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: p.brandColor, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Calendar size={18} aria-hidden />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                          {p.label}
                        </div>
                        <div style={{
                          fontSize: 11, color: 'var(--txt3)', marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {active
                            ? `Connected as ${active.providerEmail ?? '(unknown email)'}`
                            : errorRow
                              ? 'Reconnect required'
                              : p.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {active ? (
                        <>
                          <span style={statusBadge('active')}>
                            <Check size={10} /> Connected
                          </span>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => disconnect(active.id, p.label)}
                            style={{
                              ...secondaryBtn,
                              opacity: isBusy ? 0.6 : 1,
                              cursor: isBusy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isBusy ? 'Disconnecting…' : 'Disconnect'}
                          </button>
                        </>
                      ) : (
                        <>
                          {errorRow && <span style={statusBadge('error')}>Error</span>}
                          <button
                            type="button"
                            onClick={() => startConnect(p.key)}
                            style={primaryBtn}
                          >
                            <ExternalLink size={11} /> Connect
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Trust panel — same copy as the onboarding wizard so the
              promise stays consistent across the two surfaces. */}
          <details style={{ marginTop: 16, fontSize: 12, color: 'var(--txt2)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--txt)' }}>
              <Lock size={11} style={{ display: 'inline', marginRight: 6 }} aria-hidden />
              What we read, what we don&apos;t
            </summary>
            <ul style={{ margin: '8px 0 0 18px', padding: 0, lineHeight: 1.7 }}>
              <li>Read-only scope: events from your primary calendar in a 14-day window.</li>
              <li>We never read other people&apos;s shared calendars or your free-busy preferences.</li>
              <li>Tokens are encrypted at rest with AES-256-GCM; the plaintext never leaves the server.</li>
              <li>Disconnecting here removes server-side tokens immediately.</li>
            </ul>
          </details>
        </section>

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>Looking for workspace integrations?</div>
          <div style={sectionSubStyle}>
            Stripe billing, Slack, Mailchimp, QuickBooks and other workspace-wide tools
            live on a separate page — those are connected once per organization, not per user.
          </div>
          <a
            href="/philly/integrations"
            style={{
              ...secondaryBtn,
              textDecoration: 'none',
              display: 'inline-flex',
              gap: 6,
            }}
          >
            <Plug size={11} aria-hidden /> Workspace integrations
            <ExternalLink size={11} aria-hidden />
          </a>
        </section>

        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'var(--bg2)', fontSize: 11.5, color: 'var(--txt2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Info size={12} aria-hidden style={{ color: 'var(--txt3)' }} />
          <span>
            Two-way sync (write events from DEUS → your calendar) is a follow-up bundle.
            Today the read-only direction covers the meeting-context-on-deal use case.
          </span>
        </div>
      </main>
    </>
  )
}

function providerLabel(p: Provider): string {
  return p === 'google' ? 'Google Calendar' : 'Outlook / Microsoft 365'
}

function humanizeError(code: string): string {
  if (code === 'access_denied') return 'You declined the calendar permission. No data was changed.'
  if (code.startsWith('state_')) return 'The connection link expired. Click Connect again.'
  if (code.startsWith('token_provider_not_configured')) {
    return 'Calendar provider is not configured yet — your operator needs to add OAuth credentials.'
  }
  if (code.startsWith('token_')) return 'The provider rejected the connection. Please try again.'
  if (code === 'session_lost') return 'Your session ended mid-flow. Sign in again to retry.'
  if (code === 'missing_params') return 'The callback was malformed. Click Connect to retry.'
  return `Connection failed (${code}).`
}

function statusBadge(kind: 'active' | 'error'): React.CSSProperties {
  const ok = kind === 'active'
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 7px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    background: ok ? 'var(--g-bg)' : 'var(--r-bg)',
    color: ok ? 'var(--g-txt)' : 'var(--r-txt)',
  }
}

const flashStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
  padding: '8px 12px', borderRadius: 6, fontSize: 12, lineHeight: 1.4,
  background: 'var(--bg2)', border: '1px solid var(--border)',
}

const providerRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 14px', borderRadius: 10,
  background: 'var(--bg2)', border: '1px solid var(--border)',
}

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '6px 12px', borderRadius: 7,
  background: 'var(--accent)', color: '#fff', border: 'none',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}

const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '6px 10px', borderRadius: 7,
  background: 'transparent', color: 'var(--txt2)',
  border: '1px solid var(--border)',
  fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
}
