'use client'

import { useCallback, useEffect, useState } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import {
  Users, UserPlus, MailCheck, X, Shield, RefreshCw,
  Crown, AlertCircle, CheckCircle2,
} from 'lucide-react'

interface Member {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'viewer'
  avatarUrl: string | null
  lastLoginAt: string | null
  createdAt: string
}

interface PendingInvite {
  id: string
  email: string
  role: 'admin' | 'manager' | 'viewer'
  invitedByUserId: string
  expiresAt: string
  createdAt: string
}

interface SeatStatus {
  usersUsed: number
  invitesPending: number
  used: number
  limit: number
  available: number
}

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

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
  outline: 'none',
}

const accentBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  background: 'var(--accent)', color: '#fff', border: 'none',
  cursor: 'pointer', fontFamily: 'inherit',
}

const ghostBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 10px', borderRadius: 6, fontSize: 12,
  background: 'transparent', color: 'var(--txt3)',
  border: '1px solid var(--border)', cursor: 'pointer',
  fontFamily: 'inherit',
}

const roleBadgeStyle = (role: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
  background: role === 'admin' ? 'var(--r-bg, rgba(220,38,38,0.1))'
    : role === 'manager' ? 'var(--accent-bg, rgba(59,130,246,0.1))'
    : 'var(--bg2)',
  color: role === 'admin' ? 'var(--r, #dc2626)'
    : role === 'manager' ? 'var(--accent, #3b82f6)'
    : 'var(--txt2)',
})

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [seats, setSeats] = useState<SeatStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'viewer'>('viewer')
  const [submitting, setSubmitting] = useState(false)
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, invitesRes] = await Promise.all([
        fetch('/philly/api/users').then(r => r.json()),
        fetch('/philly/api/organizations/invites').then(r => r.json()),
      ])
      setMembers(usersRes.users ?? [])
      setInvites(invitesRes.data?.invites ?? [])
      setSeats(invitesRes.data?.seats ?? null)
    } catch {
      setFlash({ kind: 'err', msg: 'Could not load team. Try refreshing.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setSubmitting(true)
    setFlash(null)
    try {
      const res = await fetch('/philly/api/organizations/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const json = await res.json()
      if (!res.ok) {
        setFlash({ kind: 'err', msg: json.error ?? 'Invite failed.' })
      } else {
        setFlash({
          kind: 'ok',
          msg: json.data?.emailSent
            ? `Invite sent to ${inviteEmail.trim()}.`
            : `Invite created — share the link manually (email service not configured).`,
        })
        setInviteEmail('')
        setInviteRole('viewer')
        load()
      }
    } catch {
      setFlash({ kind: 'err', msg: 'Network error. Try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const revokeInvite = async (id: string, email: string) => {
    if (!confirm(`Revoke the invite for ${email}?`)) return
    try {
      const res = await fetch(`/philly/api/organizations/invites/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setFlash({ kind: 'err', msg: json.error ?? 'Could not revoke invite.' })
      } else {
        setFlash({ kind: 'ok', msg: `Invite for ${email} revoked.` })
        load()
      }
    } catch {
      setFlash({ kind: 'err', msg: 'Network error.' })
    }
  }

  const removeMember = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from the team? This frees up their seat. Their data stays in the org but they can no longer sign in.`)) return
    try {
      const res = await fetch(`/philly/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setFlash({ kind: 'err', msg: json.error ?? 'Could not remove member.' })
      } else {
        setFlash({ kind: 'ok', msg: `${email} removed.` })
        load()
      }
    } catch {
      setFlash({ kind: 'err', msg: 'Network error.' })
    }
  }

  return (
    <>
      <Topbar
        title="Team"
        sub={seats ? `${seats.used} of ${seats.limit} seats used` : 'Loading…'}
      />
      <div style={{ padding: '20px 28px 40px', maxWidth: 880 }}>

        {flash && (
          <div style={{
            ...sectionStyle, padding: '10px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
            borderColor: flash.kind === 'ok' ? 'var(--g, #16a34a)' : 'var(--r, #dc2626)',
            color: flash.kind === 'ok' ? 'var(--g, #16a34a)' : 'var(--r, #dc2626)',
          }}>
            {flash.kind === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {flash.msg}
          </div>
        )}

        {/* Invite form */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Invite a teammate</div>
          <div style={sectionSubStyle}>
            They get an email with a link that expires in 7 days. Each invite uses one seat from your plan.
          </div>
          <form onSubmit={submitInvite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@example.com"
              style={{ ...inputStyle, flex: '1 1 220px' }}
              autoComplete="off"
              required
              disabled={submitting}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'manager' | 'viewer')}
              style={{ ...inputStyle, flex: '0 0 130px' }}
              disabled={submitting}
            >
              <option value="viewer">Viewer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              style={{ ...accentBtnStyle, opacity: submitting || !seats || seats.available <= 0 ? 0.5 : 1 }}
              disabled={submitting || !seats || seats.available <= 0}
            >
              <UserPlus size={14} />
              {submitting ? 'Sending…' : 'Send invite'}
            </button>
          </form>
          {seats && seats.available <= 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--r, #dc2626)' }}>
              Seat limit reached ({seats.used}/{seats.limit}). Upgrade your plan to invite more teammates.
            </div>
          )}
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              Pending invites · {invites.length}
            </div>
            <div style={sectionSubStyle}>
              Not yet accepted. They count toward your seat usage until they accept or expire.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {invites.map((inv) => (
                <div key={inv.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: 'var(--bg2)', borderRadius: 8,
                }}>
                  <MailCheck size={16} style={{ color: 'var(--txt3)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt)' }}>{inv.email}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                      Expires {new Date(inv.expiresAt).toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <span style={roleBadgeStyle(inv.role)}>
                    {inv.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => revokeInvite(inv.id, inv.email)}
                    style={ghostBtnStyle}
                    aria-label={`Revoke invite for ${inv.email}`}
                  >
                    <X size={12} />
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            Team members · {members.length}
          </div>
          <div style={sectionSubStyle}>
            People with access to this organization.
          </div>
          {loading && members.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ marginTop: 8 }}>Loading team</div>
            </div>
          ) : members.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
              <Users size={20} style={{ opacity: 0.4 }} />
              <div style={{ marginTop: 8, fontWeight: 600 }}>No teammates yet</div>
              <div>Send an invite above to get started.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map((m) => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: 'var(--bg2)', borderRadius: 8,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--g, #16a34a) 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 700,
                  }}>
                    {m.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt)' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                      {m.email}
                      {m.lastLoginAt && ` · last login ${new Date(m.lastLoginAt).toISOString().slice(0, 10)}`}
                    </div>
                  </div>
                  <span style={roleBadgeStyle(m.role)}>
                    {m.role === 'admin' && <Crown size={10} />}
                    {m.role === 'manager' && <Shield size={10} />}
                    {m.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMember(m.id, m.email)}
                    style={ghostBtnStyle}
                    aria-label={`Remove ${m.email}`}
                  >
                    <X size={12} />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
