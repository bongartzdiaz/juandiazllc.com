'use client'

/* ---------------------------------------------------------------
   /philly/settings/users — admin-only team management.

   Capabilities for admins:
     • List every user in the current organization (name, email,
       role, last login)
     • Invite a new user: enter email + name + role + pick which
       dashboard sections they are allowed to see
     • Edit an existing user's role and section allow-list

   Non-admin visitors are shown a read-only list with a "admins only"
   notice; all mutation affordances are hidden. The API layer
   re-enforces admin-only access so hiding is cosmetic.
   --------------------------------------------------------------- */

import { useState, useEffect, useMemo } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useToast } from '@/hooks/philly/useToast'
import { useMySections } from '@/hooks/philly/useMySections'
import { SECTIONS, SECTION_GROUPS, type SectionGroup } from '@/lib/philly/sections'
import { UserPlus, X, Check, ShieldAlert } from 'lucide-react'

type Role = 'admin' | 'manager' | 'viewer'

type TeamUser = {
  id: string
  email: string
  name: string | null
  role: Role
  dashboardSections: string[] | null
  avatarUrl: string | null
  lastLoginAt: string | null
  createdAt: string
}

const ROLES: Role[] = ['admin', 'manager', 'viewer']

const input: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit', outline: 'none',
}
const label: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, marginBottom: 5, display: 'block', color: 'var(--txt2)',
}
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 16px', borderRadius: 8,
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  background: 'var(--accent)', color: '#fff',
  border: 'none', fontFamily: 'inherit',
}
const secondaryBtn: React.CSSProperties = {
  ...primaryBtn, background: 'var(--bg2)', color: 'var(--txt2)',
  border: '1px solid var(--border)',
}

const GROUP_LABEL: Record<SectionGroup, string> = {
  primary: 'Primary',
  tools: 'Tools',
  industry: 'Industry',
  system: 'System',
}

export default function UsersSettingsPage() {
  const { addToast } = useToast()
  const { role: myRole, loading: meLoading } = useMySections()
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<TeamUser | null>(null)
  const [inviting, setInviting] = useState(false)

  const isAdmin = myRole === 'admin'

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/philly/api/users', { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (res.ok) setUsers(j.users ?? [])
      else addToast(j.error ?? 'Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  return (
    <>
      <Topbar title="Team & Permissions" sub="Control who sees what inside the dashboard" />

      <div style={{ padding: '18px 24px 40px' }}>
        {!meLoading && !isAdmin && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 10, marginBottom: 16,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--txt2)',
          }}>
            <ShieldAlert size={14} />
            Only administrators can invite teammates or change permissions.
            You&apos;re viewing this list in read-only mode.
          </div>
        )}

        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Team</div>
              <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                {users.length} member{users.length === 1 ? '' : 's'}
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => setInviting(true)} style={primaryBtn}>
                <UserPlus size={13} /> Invite
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 24, fontSize: 12, color: 'var(--txt3)' }}>Loading…</div>
          ) : users.length === 0 ? (
            <div style={{ padding: 24, fontSize: 12, color: 'var(--txt3)' }}>No users yet.</div>
          ) : (
            <div>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  canEdit={isAdmin}
                  onEdit={() => setEditing(u)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {inviting && (
        <InviteModal
          onClose={() => setInviting(false)}
          onCreated={() => { setInviting(false); refresh() }}
        />
      )}

      {editing && (
        <EditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh() }}
        />
      )}
    </>
  )
}

function sectionsSummary(list: string[] | null): string {
  if (list === null) return 'All sections'
  if (list.length === 0) return 'No sections'
  if (list.length <= 3) return list.join(', ')
  return `${list.slice(0, 3).join(', ')} +${list.length - 3}`
}

function UserRow({
  user, canEdit, onEdit,
}: { user: TeamUser; canEdit: boolean; onEdit: () => void }) {
  const initials = (user.name || user.email || 'U').slice(0, 2).toUpperCase()
  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleDateString()
    : '—'
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '36px 1fr 120px 1fr 90px auto',
      alignItems: 'center', gap: 14, padding: '12px 18px',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--accent-bg)', color: 'var(--accent-txt)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
      }}>{initials}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name || user.email.split('@')[0]}
        </div>
        <div style={{ fontSize: 11, color: 'var(--txt3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </div>
      </div>
      <span style={{
        fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--txt2)',
        textAlign: 'center',
      }}>{user.role}</span>
      <div style={{ fontSize: 11, color: 'var(--txt3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {sectionsSummary(user.dashboardSections)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{lastLogin}</div>
      {canEdit ? (
        <button onClick={onEdit} style={{ ...secondaryBtn, padding: '5px 12px', fontSize: 11 }}>
          Edit
        </button>
      ) : <span />}
    </div>
  )
}

/* ── Section picker — shared by invite + edit modals ─────── */

function SectionPicker({
  value, onChange, disabled,
}: {
  value: string[] | null
  onChange: (v: string[] | null) => void
  disabled?: boolean
}) {
  const allAccess = value === null
  const selected = useMemo(() => new Set(value ?? []), [value])
  const grouped = useMemo(() => {
    const out: Record<SectionGroup, typeof SECTIONS> = {
      primary: [], tools: [], industry: [], system: [],
    }
    for (const s of SECTIONS) out[s.group].push(s)
    return out
  }, [])

  const toggle = (slug: string) => {
    if (disabled) return
    if (allAccess) {
      // Starting from "all access" — switch to explicit list with
      // just the clicked slug so the admin sees immediate feedback.
      onChange([slug])
      return
    }
    const next = new Set(selected)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)
    onChange(Array.from(next))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={allAccess}
            onChange={(e) => onChange(e.target.checked ? null : [])}
          />
          Full access to every section
        </label>
        {!allAccess && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            style={{ ...secondaryBtn, fontSize: 11, padding: '4px 10px' }}
          >
            Reset to full access
          </button>
        )}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        opacity: allAccess ? 0.45 : 1, pointerEvents: allAccess ? 'none' : 'auto',
      }}>
        {SECTION_GROUPS.map((g) => (
          <div key={g} style={{
            padding: '10px 12px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--bg2)',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--txt3)', marginBottom: 6,
            }}>{GROUP_LABEL[g]}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {grouped[g].map((s) => (
                <label key={s.slug} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, cursor: 'pointer', color: 'var(--txt2)',
                }}>
                  <input
                    type="checkbox"
                    checked={selected.has(s.slug)}
                    onChange={() => toggle(s.slug)}
                    disabled={disabled}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{s.slug.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Invite modal ────────────────────────────────────────── */

function InviteModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: () => void }) {
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [sections, setSections] = useState<string[] | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (submitting) return
    if (!email.trim()) { addToast('Email is required', 'error'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/philly/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          role,
          dashboardSections: sections,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        addToast(j.error ?? 'Failed to invite user', 'error')
        return
      }
      if (j.inviteSent) addToast(`Invited ${email}`, 'success')
      else addToast(`Created ${email} (invite email skipped — check Supabase config)`, 'info')
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Invite teammate" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="new.user@company.com"
            style={input}
          />
        </div>
        <div>
          <label style={label}>Name (optional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            style={input}
          />
        </div>
        <div>
          <label style={label}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ ...input, cursor: 'pointer' }}>
            {ROLES.map((r) => (
              <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>
            ))}
          </select>
          {role === 'admin' && (
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
              Admins bypass the section allow-list and can manage other users.
            </div>
          )}
        </div>
        <div>
          <label style={label}>Dashboard sections</label>
          <SectionPicker value={sections} onChange={setSections} disabled={role === 'admin'} />
          {role === 'admin' && (
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
              Admins always see every section — the allow-list is ignored.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={onClose} style={secondaryBtn}>Cancel</button>
        <button onClick={submit} disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'Sending…' : 'Send invite'}
        </button>
      </div>
    </Modal>
  )
}

/* ── Edit modal ──────────────────────────────────────────── */

function EditModal({
  user, onClose, onSaved,
}: { user: TeamUser; onClose: () => void; onSaved: () => void }) {
  const { addToast } = useToast()
  const [role, setRole] = useState<Role>(user.role)
  const [sections, setSections] = useState<string[] | null>(user.dashboardSections)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/philly/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          role,
          dashboardSections: sections,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        addToast(j.error ?? 'Failed to save', 'error')
        return
      }
      addToast(`Updated ${user.email}`, 'success')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Edit ${user.name || user.email}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={label}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ ...input, cursor: 'pointer' }}>
            {ROLES.map((r) => (
              <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={label}>Dashboard sections</label>
          <SectionPicker value={sections} onChange={setSections} disabled={role === 'admin'} />
          {role === 'admin' && (
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
              Admins always see every section — the allow-list is ignored.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={onClose} style={secondaryBtn}>Cancel</button>
        <button onClick={submit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
          <Check size={13} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Modal>
  )
}

function Modal({
  title, children, onClose,
}: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto',
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: 'var(--shadow-lg)',
          padding: '18px 22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--txt3)', padding: 4, display: 'flex',
          }} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
