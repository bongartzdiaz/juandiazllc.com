'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import {
  Plus, Trash2, Power, Copy, User, Eye, FileText, Clock, MessageSquare,
} from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { useApi } from '@/hooks/philly/useApi'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'
import { keyboardClickable } from '@/lib/philly/a11y'

interface Permissions {
  viewListings?: boolean
  viewDocuments?: boolean
  viewTimeline?: boolean
  submitFeedback?: boolean
}

interface ClientPortalEntry {
  id: string
  contactId: string
  token: string
  permissions: string
  enabled: boolean
  lastLoginAt: string | null
  expiresAt: string | null
  createdAt: string
  contact?: { id: string; name: string; email: string | null } | null
}

interface ContactLite { id: string; name: string }

const PERMISSION_DEFS: { key: keyof Permissions; label: string; icon: typeof Eye }[] = [
  { key: 'viewListings',    label: 'View Listings',   icon: Eye },
  { key: 'viewDocuments',   label: 'View Documents',  icon: FileText },
  { key: 'viewTimeline',    label: 'View Timeline',   icon: Clock },
  { key: 'submitFeedback',  label: 'Submit Feedback', icon: MessageSquare },
]

function parsePermissions(raw: string): Permissions {
  try {
    const p = JSON.parse(raw)
    return (p && typeof p === 'object') ? p : {}
  } catch { return {} }
}

export default function ClientPortalPage() {
  const [contacts, setContacts] = useState<ContactLite[]>([])
  const [page, setPage] = useState(1)

  const params = new URLSearchParams({ page: String(page), limit: '25' })
  interface ClientsResponse { data: ClientPortalEntry[]; pagination: { total: number; totalPages: number } }
  const clientsQuery = useApi<ClientsResponse>(`/client-portal?${params}`)
  const clients = clientsQuery.data?.data ?? []
  const total = clientsQuery.data?.pagination.total ?? 0
  const totalPages = clientsQuery.data?.pagination.totalPages ?? 0
  const loading = clientsQuery.loading
  const fetchData = clientsQuery.refetch

  const [showAdd, setShowAdd] = useState(false)
  const [addContactId, setAddContactId] = useState('')
  const [addPerms, setAddPerms] = useState<Permissions>({
    viewListings: true, viewDocuments: true, viewTimeline: true, submitFeedback: false,
  })
  const [addExpiresAt, setAddExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)

  const [selected, setSelected] = useState<ClientPortalEntry | null>(null)
  const [selectedPerms, setSelectedPerms] = useState<Permissions>({})

  const t = useTranslations('clientPortal')
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()
  const { addToast } = useToast()

  useEffect(() => {
    fetch('/api/contacts?limit=500')
      .then(r => r.json())
      .then(j => setContacts(Array.isArray(j.data) ? j.data.map((c: ContactLite) => ({ id: c.id, name: c.name })) : []))
      .catch(() => {})
  }, [])

  useEntitySubscription('clientPortalAccess', fetchData)

  async function handleAddClient() {
    if (!addContactId) { addToast('Select a contact', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/client-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: addContactId,
          permissions: addPerms,
          enabled: true,
          expiresAt: addExpiresAt || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? 'Failed', 'error'); return }
      addToast('Portal access granted', 'success')
      setAddContactId(''); setAddExpiresAt('')
      setAddPerms({ viewListings: true, viewDocuments: true, viewTimeline: true, submitFeedback: false })
      setShowAdd(false)
      fetchData()
    } catch { addToast('Network error', 'error') }
    finally { setSaving(false) }
  }

  async function toggleEnabled(c: ClientPortalEntry) {
    try {
      const res = await fetch(`/api/client-portal/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !c.enabled }),
      })
      if (!res.ok) { addToast('Update failed', 'error'); return }
      addToast(c.enabled ? 'Access disabled' : 'Access enabled', 'success')
      fetchData()
    } catch { addToast('Network error', 'error') }
  }

  async function savePerms() {
    if (!selected) return
    try {
      const res = await fetch(`/api/client-portal/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: selectedPerms }),
      })
      if (!res.ok) { addToast('Save failed', 'error'); return }
      addToast('Permissions updated', 'success')
      setSelected(null)
      fetchData()
    } catch { addToast('Network error', 'error') }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: tConfirms('revokePortalAccess.title'),
      body: tConfirms('revokePortalAccess.body'),
      confirmLabel: tCommon('revoke'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/client-portal/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast('Access revoked', 'success')
        setSelected(null)
        fetchData()
      } else { addToast('Delete failed', 'error') }
    } catch { addToast('Network error', 'error') }
  }

  function copyPortalLink(token: string) {
    const link = `${window.location.origin}/client-portal/${token}`
    navigator.clipboard.writeText(link).then(
      () => addToast('Portal link copied to clipboard', 'success'),
      () => addToast('Failed to copy', 'error'),
    )
  }

  function openDetail(c: ClientPortalEntry) {
    setSelected(c)
    setSelectedPerms(parsePermissions(c.permissions))
  }

  const activeClients = clients.filter(c => c.enabled)
  const now = new Date()
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const expiringSoon = clients.filter(c => {
    if (!c.expiresAt) return false
    const exp = new Date(c.expiresAt)
    return exp > now && exp <= soon
  })
  const loggedIn = clients.filter(c => c.lastLoginAt).length

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="users" label="Total Clients" value={String(total)} />
          <KpiCard icon="zap" label="Active" value={String(activeClients.length)} />
          <KpiCard icon="calendar" label="Expiring Soon" value={String(expiringSoon.length)} />
          <KpiCard icon="target" label="Logged In" value={String(loggedIn)} />
        </div>

        <div style={{ display: 'flex', marginBottom: 16, justifyContent: 'flex-end' }}>
          <button onClick={() => setShowAdd(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
          }}>
            <Plus size={13} /> Grant Access
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clientsQuery.error ? (
            <ListError onRetry={fetchData} message={clientsQuery.error} />
          ) : loading ? (
            <ListLoading />
          ) : clients.length === 0 ? (
            <ListEmpty />
          ) : clients.map(client => {
            const perms = parsePermissions(client.permissions)
            const activeCount = Object.values(perms).filter(Boolean).length
            const expiresDate = client.expiresAt ? new Date(client.expiresAt) : null
            const isExpiringSoon = expiresDate && expiresDate > now && expiresDate <= soon

            return (
              <div
                key={client.id}
                {...keyboardClickable(() => openDetail(client))}
                className="card-hover"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--panel)',
                  boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: client.enabled ? 'var(--accent-bg)' : 'var(--bg2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <User size={17} style={{ color: client.enabled ? 'var(--accent)' : 'var(--txt3)' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>
                      {client.contact?.name ?? `Contact ${client.contactId.slice(0, 8)}`}
                    </span>
                    <span style={{
                      padding: '1px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                      background: client.enabled ? 'var(--g-bg)' : 'var(--bg2)',
                      color: client.enabled ? 'var(--g-txt)' : 'var(--txt3)',
                    }}>{client.enabled ? 'Active' : 'Disabled'}</span>
                    {isExpiringSoon && (
                      <span style={{
                        padding: '1px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                        background: 'var(--y-bg)', color: 'var(--y-txt)',
                      }}>Expiring soon</span>
                    )}
                    {client.lastLoginAt && (
                      <span style={{
                        padding: '1px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                        background: 'var(--b-bg)', color: 'var(--b-txt)',
                      }}>Active user</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {client.contact?.email && <span>{client.contact.email}</span>}
                    <span>{activeCount} permission{activeCount !== 1 ? 's' : ''} granted</span>
                    <span className="mono">
                      {expiresDate ? `Expires ${expiresDate.toLocaleDateString()}` : 'No expiry'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => copyPortalLink(client.token)}
                    title="Copy portal link"
                    style={miniBtn}
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    onClick={() => toggleEnabled(client)}
                    title={client.enabled ? 'Disable' : 'Enable'}
                    style={{ ...miniBtn, color: client.enabled ? 'var(--g-txt)' : 'var(--txt3)' }}
                  >
                    <Power size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    title="Revoke"
                    style={{ ...miniBtn, color: 'var(--r-txt)' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Detail modal — edit permissions */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.contact?.name ?? 'Client Access'}
        subtitle={selected?.contact?.email ?? 'Manage portal permissions'}
        size="md"
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: 12, background: 'var(--bg2)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Portal Link
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--txt2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  /client-portal/{selected.token}
                </div>
              </div>
              <button
                onClick={() => copyPortalLink(selected.token)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8,
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                }}
              >
                <Copy size={11} /> Copy
              </button>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', marginBottom: 10 }}>
                Permissions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PERMISSION_DEFS.map(p => {
                  const Icon = p.icon
                  const on = !!selectedPerms[p.key]
                  return (
                    <button
                      key={p.key}
                      onClick={() => setSelectedPerms(s => ({ ...s, [p.key]: !on }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 8,
                        background: on ? 'var(--accent-bg)' : 'var(--bg2)',
                        border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border)'}`,
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                        color: 'inherit',
                      }}
                    >
                      <Icon size={14} style={{ color: on ? 'var(--accent)' : 'var(--txt3)' }} />
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: 'var(--txt)' }}>
                        {p.label}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase',
                        background: on ? 'var(--accent)' : 'var(--panel)',
                        color: on ? '#fff' : 'var(--txt3)',
                        border: on ? 'none' : '1px solid var(--border)',
                      }}>
                        {on ? 'On' : 'Off'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
              Created {new Date(selected.createdAt).toLocaleDateString()}
              {selected.lastLoginAt && ` · Last login ${new Date(selected.lastLoginAt).toLocaleDateString()}`}
              {selected.expiresAt && ` · Expires ${new Date(selected.expiresAt).toLocaleDateString()}`}
            </div>

            <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <button onClick={() => handleDelete(selected.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'transparent', color: 'var(--r-txt)',
                border: '1px solid var(--r-border)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <Trash2 size={12} /> Revoke Access
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={() => setSelected(null)} style={{
                padding: '8px 14px', borderRadius: 8,
                background: 'var(--bg2)', color: 'var(--txt2)',
                border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
              <button onClick={savePerms} style={{
                padding: '8px 14px', borderRadius: 8,
                background: 'var(--accent)', color: '#fff', border: 'none',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Save Permissions</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add modal */}
      <Modal
        open={showAdd}
        onClose={() => { if (!saving) setShowAdd(false) }}
        title="Grant Portal Access"
        subtitle="Invite a contact to the client portal"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Contact">
            <select aria-label="Contact" value={addContactId} onChange={e => setAddContactId(e.target.value)} style={inputStyle}>
              <option value="">Select a contact…</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6 }}>Permissions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PERMISSION_DEFS.map(p => {
                const Icon = p.icon
                const on = !!addPerms[p.key]
                return (
                  <button
                    key={p.key}
                    onClick={() => setAddPerms(s => ({ ...s, [p.key]: !on }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 11px', borderRadius: 8,
                      background: on ? 'var(--accent-bg)' : 'var(--bg2)',
                      border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border)'}`,
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', color: 'inherit',
                    }}
                  >
                    <Icon size={12} style={{ color: on ? 'var(--accent)' : 'var(--txt3)', flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--txt)' }}>{p.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <FormField label="Expires (optional)">
            <input aria-label="Expires (optional)" type="date" value={addExpiresAt} onChange={e => setAddExpiresAt(e.target.value)} style={inputStyle} />
          </FormField>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button onClick={() => setShowAdd(false)} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancel</button>
            <button onClick={handleAddClient} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Granting…' : 'Grant Access'}</button>
          </div>
        </div>
      </Modal>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--panel)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit', outline: 'none',
}

const miniBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--txt2)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

