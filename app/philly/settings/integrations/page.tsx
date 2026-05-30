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
  Calendar, Check, AlertTriangle, Lock, ExternalLink, Plug, Info, Zap,
} from 'lucide-react'
import type { ConnectionDTO, ConnectionsResponse } from '@/lib/philly/calendar/types'

// Local aliases — kept narrow so the rendering code below reads cleanly.
// The narrowing of `provider` from string to the union literal happens
// at the API boundary in the route's TS type.
type Provider = 'google' | 'microsoft'
type Connection = ConnectionDTO

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
        const json = await res.json() as ConnectionsResponse
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
                        {/* Surface the last provider/refresh error if
                            present. Defensive truncation prevents a
                            stray multi-line OAuth body from blowing
                            out the row. */}
                        {errorRow?.lastError && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: 'var(--r-txt)',
                              marginTop: 4,
                              lineHeight: 1.4,
                              wordBreak: 'break-word',
                            }}
                          >
                            <AlertTriangle
                              size={9}
                              aria-hidden
                              style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }}
                            />
                            {humanizeLastError(errorRow.lastError)}
                          </div>
                        )}
                        {/* Push-sync state, if a channel is active for this
                            connection. Renders right under the email so the
                            user can tell at a glance whether real-time sync
                            is working without scrolling or expanding. */}
                        {active?.channel && active.channel.status === 'active' && (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            marginTop: 4, padding: '2px 7px', borderRadius: 5,
                            fontSize: 10, fontWeight: 600,
                            background: 'var(--g-bg)', color: 'var(--g-txt)',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            <Zap size={9} aria-hidden />
                            Real-time sync · renews{' '}
                            {formatRelativeFuture(active.channel.expiresAt)}
                          </div>
                        )}
                        {active && !active.channel && (
                          <div style={{
                            fontSize: 10, color: 'var(--txt3)', marginTop: 4,
                          }}>
                            Read-only — push-sync not active
                          </div>
                        )}
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

/** Human-friendly "expires in X" for a future ISO timestamp.
 *  Falls back to absolute date if it's more than 7 days out. */
function formatRelativeFuture(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'soon'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `in ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `in ${days}d`
  return new Date(iso).toLocaleDateString()
}

/** Translate the persisted `lastError` string (e.g. "refresh_failed:http_400",
 *  "no_refresh_token", "access_token_decrypt_failed") into something a
 *  signed-in admin can act on. Falls back to the raw code so we never hide
 *  diagnostic detail outright. */
function humanizeLastError(raw: string): string {
  const code = raw.toLowerCase()
  if (code.startsWith('refresh_failed:http_4')) {
    return 'The provider rejected our refresh token (likely revoked at provider). Reconnect to re-grant access.'
  }
  if (code.startsWith('refresh_failed:network')) {
    return 'Network failure while refreshing tokens. Reconnect if the issue persists for more than a few minutes.'
  }
  if (code.startsWith('refresh_failed')) {
    return `Token refresh failed (${raw.slice(0, 80)}). Reconnect to retry cleanly.`
  }
  if (code === 'no_refresh_token') {
    return 'No refresh token on file — reconnect once and pick "Allow offline access" so we can keep the link alive.'
  }
  if (code === 'access_token_decrypt_failed') {
    return 'Stored credentials could not be decrypted (likely a key rotation). Reconnect to write fresh tokens.'
  }
  // Truncate at 200 chars so an unfamiliar code can't dominate the row.
  return raw.length > 200 ? `${raw.slice(0, 197)}…` : raw
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
  background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}

const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '6px 10px', borderRadius: 7,
  background: 'transparent', color: 'var(--txt2)',
  border: '1px solid var(--border)',
  fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
}
