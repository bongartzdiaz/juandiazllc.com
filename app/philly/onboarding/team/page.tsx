'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  OnboardingFrame, obButtonPrimary, obButtonSecondary,
  obInputStyle, obLabelStyle, obHelperStyle,
} from '@/components/philly/onboarding/OnboardingFrame'

type Role = 'admin' | 'manager' | 'viewer'

interface Row {
  id: number
  email: string
  role: Role
  status: 'idle' | 'sending' | 'ok' | 'err'
  message?: string
}

const ROLE_TIPS: Record<Role, string> = {
  admin: 'Full access, including billing and team management.',
  manager: 'Full access except billing.',
  viewer: 'Read-only access to contacts, deals, and reports.',
}

const MAX_ROWS = 5

export default function StepTeam() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([
    { id: 1, email: '', role: 'viewer', status: 'idle' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [seats, setSeats] = useState<{ used: number; limit: number } | null>(null)

  useEffect(() => {
    fetch('/philly/api/organizations/invites')
      .then(r => r.json())
      .then(j => {
        if (j?.data?.seats) {
          setSeats({ used: j.data.seats.used, limit: j.data.seats.limit })
        }
      })
      .catch(() => { /* non-blocking */ })
  }, [])

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return
    setRows(r => [...r, { id: Date.now(), email: '', role: 'viewer', status: 'idle' }])
  }

  const removeRow = (id: number) => {
    setRows(r => r.filter(x => x.id !== id))
  }

  const update = (id: number, patch: Partial<Row>) => {
    setRows(r => r.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  const validRows = rows.filter(r => r.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim()))

  const advance = useCallback(async () => {
    await fetch('/philly/api/onboarding/step', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'contacts' }),
    })
    router.push('/philly/onboarding/contacts')
  }, [router])

  const sendInvites = async () => {
    if (validRows.length === 0) {
      void advance()
      return
    }
    setSubmitting(true)
    // Send sequentially so each row's per-error message stays accurate
    for (const row of validRows) {
      update(row.id, { status: 'sending' })
      try {
        const res = await fetch('/philly/api/organizations/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: row.email.trim(), role: row.role }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          update(row.id, { status: 'err', message: json.error ?? 'Could not send' })
        } else {
          update(row.id, { status: 'ok', message: `Sent to ${row.email.trim()}` })
        }
      } catch {
        update(row.id, { status: 'err', message: 'Network error' })
      }
    }
    setSubmitting(false)
    // Brief pause so the user can see the success toasts before transition
    setTimeout(() => { void advance() }, 600)
  }

  const skip = async () => {
    await fetch('/philly/api/onboarding/skip', { method: 'POST' })
    void advance()
  }

  const primaryLabel = validRows.length > 0 ? `Send ${validRows.length} invite${validRows.length === 1 ? '' : 's'}` : 'Continue'

  return (
    <OnboardingFrame
      step="team"
      title="Invite your team"
      sub="Your plan starts with 3 seats. Add up to 5 invites here, or skip and do it later."
      footer={
        <>
          <button
            type="button"
            onClick={sendInvites}
            disabled={submitting}
            style={{ ...obButtonPrimary, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={skip}
            disabled={submitting}
            style={obButtonSecondary}
          >
            Skip — I'll invite later
          </button>
        </>
      }
    >
      {seats && (
        <div style={{
          fontSize: 12, color: 'var(--txt2)', marginBottom: 12,
          padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8,
        }}>
          <strong>{seats.used} of {seats.limit} seats used</strong>
          <div style={{ ...obHelperStyle, marginTop: 2 }}>
            Counts you, your teammates, and pending invites.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row) => (
          <div key={row.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 130px 28px',
            gap: 8, alignItems: 'start',
          }}>
            <div>
              <label style={{ ...obLabelStyle, fontSize: 11 }}>Email</label>
              <input
                type="email"
                value={row.email}
                onChange={(e) => update(row.id, { email: e.target.value, status: 'idle' })}
                placeholder="teammate@example.com"
                disabled={submitting || row.status === 'ok'}
                style={obInputStyle}
                autoComplete="off"
              />
              {row.status === 'ok' && (
                <div style={{ ...obHelperStyle, color: 'var(--g, #16a34a)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={11} /> {row.message}
                </div>
              )}
              {row.status === 'err' && (
                <div style={{ ...obHelperStyle, color: 'var(--r, #dc2626)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={11} /> {row.message}
                </div>
              )}
            </div>
            <div>
              <label style={{ ...obLabelStyle, fontSize: 11 }}>Role</label>
              <select
                value={row.role}
                onChange={(e) => update(row.id, { role: e.target.value as Role })}
                disabled={submitting || row.status === 'ok'}
                style={obInputStyle}
                title={ROLE_TIPS[row.role]}
              >
                <option value="viewer">Viewer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={submitting || rows.length === 1}
              aria-label="Remove row"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--txt3)', padding: 6, borderRadius: 6,
                marginTop: 22, opacity: rows.length === 1 ? 0.3 : 1,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {rows.length < MAX_ROWS && (
        <button
          type="button"
          onClick={addRow}
          style={{
            ...obButtonSecondary, fontSize: 12, padding: '6px 12px',
            minHeight: 32, marginTop: 8,
          }}
        >
          <Plus size={12} />
          Add another
        </button>
      )}
    </OnboardingFrame>
  )
}
