'use client'

import { useState } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useApi } from '@/hooks/philly/useApi'
import { useToast } from '@/hooks/philly/useToast'
import { ListError } from '@/components/philly/ui/ListStates'
import { Shield, Globe2, Clock, Save, AlertTriangle, Info } from 'lucide-react'

/* Bundle S — operator UI for the per-org enterprise access controls
   that Bundle M wired into requireScope(). Two policy fields, one
   page. Admin scope. Updates flow through PATCH /api/admin/security
   so the audit log captures every change. */

interface SecurityPolicy {
  ipAllowlist: string | null
  sessionIdleTimeoutMinutes: number | null
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, marginBottom: 5, display: 'block', color: 'var(--txt2)',
}

export default function SecuritySettingsPage() {
  const { addToast } = useToast()
  const policyQuery = useApi<{ data: SecurityPolicy }>('/admin/security')
  const policy = policyQuery.data?.data

  const [draftAllowlist, setDraftAllowlist] = useState<string | null>(null)
  const [draftIdle, setDraftIdle] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [invalid, setInvalid] = useState<string[] | null>(null)

  // Initialise draft state from server data on first load. We don't
  // sync after that — once the user starts typing, their input wins
  // until they save (or we get back fresh data on save).
  const allowlistValue = draftAllowlist ?? policy?.ipAllowlist ?? ''
  const idleValue =
    draftIdle ?? (policy?.sessionIdleTimeoutMinutes != null ? String(policy.sessionIdleTimeoutMinutes) : '')

  async function save() {
    if (saving) return
    setSaving(true)
    setInvalid(null)
    try {
      const body: Record<string, unknown> = {}
      if (draftAllowlist !== null) {
        body.ipAllowlist = draftAllowlist.trim() === '' ? null : draftAllowlist.trim()
      }
      if (draftIdle !== null) {
        const trimmed = draftIdle.trim()
        if (trimmed === '') {
          body.sessionIdleTimeoutMinutes = null
        } else {
          const n = Number(trimmed)
          if (!Number.isInteger(n) || n < 5 || n > 1440) {
            addToast('Idle timeout must be an integer between 5 and 1440 minutes', 'error')
            setSaving(false)
            return
          }
          body.sessionIdleTimeoutMinutes = n
        }
      }

      const res = await fetch('/api/admin/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (Array.isArray(json.invalid)) {
          setInvalid(json.invalid)
          addToast(`Invalid CIDR entries — see below`, 'error')
        } else {
          addToast(json.error ?? `Save failed (${res.status})`, 'error')
        }
        return
      }
      addToast('Security settings saved', 'success')
      setDraftAllowlist(null)
      setDraftIdle(null)
      policyQuery.refetch()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setSaving(false)
    }
  }

  const dirty = draftAllowlist !== null || draftIdle !== null

  return (
    <>
      <Topbar title="Security" sub="Enterprise access controls for this organisation" />
      <div style={{ padding: '18px 24px 40px', maxWidth: 760 }}>

        {policyQuery.error && (
          <div style={{ marginBottom: 18 }}>
            <ListError onRetry={policyQuery.refetch} message={policyQuery.error} />
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 14px', marginBottom: 18,
          background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 24%, var(--border))',
          borderRadius: 10, fontSize: 12, color: 'var(--txt2)', lineHeight: 1.5,
        }}>
          <Info size={14} style={{ flexShrink: 0, color: 'var(--accent)', marginTop: 2 }} />
          <div>
            These policies are evaluated on every authenticated request by{' '}
            <code style={{ fontSize: 11 }}>requireScope()</code>. Both default to off
            (NULL = no restriction). Updates land in the audit log. See the operations
            runbook at <code style={{ fontSize: 11 }}>docs/operations/SESSION-POLICY.md</code>.
          </div>
        </div>

        {/* IP allowlist */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 16,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Globe2 size={15} color="var(--accent)" />
            <div style={{ fontSize: 14, fontWeight: 600 }}>IP allowlist</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14, lineHeight: 1.5 }}>
            Comma-separated CIDR ranges. IPv4 or IPv6. Single IPs are accepted (treated as /32 or /128).
            Empty = open to any source IP. Loopback and RFC1918 are NOT auto-trusted.
          </div>

          <label style={labelStyle} htmlFor="ipAllowlist">
            Allowed networks
          </label>
          <textarea
            id="ipAllowlist"
            value={allowlistValue}
            onChange={(e) => setDraftAllowlist(e.target.value)}
            placeholder="203.0.113.0/24, 198.51.100.7, 2001:db8::/32"
            rows={3}
            style={{
              ...inputStyle,
              fontFamily: 'var(--font-red-hat-mono), monospace',
              resize: 'vertical',
              minHeight: 60,
            }}
            disabled={policyQuery.loading}
          />
          {invalid && invalid.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              marginTop: 10, padding: '8px 12px', borderRadius: 8,
              background: 'color-mix(in srgb, var(--r) 8%, transparent)',
              border: '1px solid var(--r-border)',
              color: 'var(--r-txt)', fontSize: 12,
            }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                These entries don't parse as valid CIDR ranges:&nbsp;
                <code>{invalid.join(', ')}</code>
              </div>
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            marginTop: 10, fontSize: 11, color: 'var(--y-txt)',
          }}>
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Lock-out warning: an empty list lets everyone in. A list that doesn't include your own IP locks YOU out — recovery requires a database update by the platform operator.
            </span>
          </div>
        </div>

        {/* Idle timeout */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 16,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Clock size={15} color="var(--accent)" />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Session idle timeout</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14, lineHeight: 1.5 }}>
            Sessions older than this many minutes since the user's last
            authenticated request are kicked back to sign-in.
            Allowed range: 5 – 1440 minutes (24 hours). Empty = no idle timeout.
          </div>

          <label style={labelStyle} htmlFor="idle">
            Minutes
          </label>
          <input
            id="idle"
            type="text"
            inputMode="numeric"
            value={idleValue}
            onChange={(e) => setDraftIdle(e.target.value)}
            placeholder="30"
            style={{ ...inputStyle, maxWidth: 160, fontFamily: 'var(--font-red-hat-mono), monospace' }}
            disabled={policyQuery.loading}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              background: dirty ? 'var(--accent)' : 'var(--bg2)',
              color: dirty ? '#fff' : 'var(--txt3)',
              border: 'none', cursor: dirty && !saving ? 'pointer' : 'default',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
            }}
          >
            <Save size={13} />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {dirty && !saving && (
            <button
              type="button"
              onClick={() => { setDraftAllowlist(null); setDraftIdle(null); setInvalid(null) }}
              style={{
                padding: '8px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 500,
                background: 'transparent', color: 'var(--txt2)',
                border: '1px solid var(--border)', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Discard
            </button>
          )}
          <div style={{ flex: 1 }} />
          <Shield size={13} color="var(--txt3)" />
          <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
            Admin only · changes are audit-logged
          </span>
        </div>
      </div>
    </>
  )
}
