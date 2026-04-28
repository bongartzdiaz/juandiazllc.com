'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { Filter, Plus, Send, Eye, CheckCircle2, Trash2, RefreshCw, X } from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { useApi } from '@/hooks/philly/useApi'

interface ESignature {
  id: string
  transactionId: string
  documentName: string
  signerName: string
  signerEmail: string
  status: string
  provider: string
  externalId: string
  sentAt: string | null
  viewedAt: string | null
  signedAt: string | null
  createdAt: string
  transaction?: { id: string; escrowNumber: string; titleCompany: string } | null
}

interface TransactionLite { id: string; escrowNumber: string; titleCompany: string }

const STATUS_COLORS: Record<string, { bg: string; txt: string; border: string }> = {
  pending:  { bg: 'var(--y-bg)',      txt: 'var(--y-txt)',      border: 'var(--y-border)' },
  sent:     { bg: 'var(--b-bg)',      txt: 'var(--b-txt)',      border: 'var(--b-border)' },
  viewed:   { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  signed:   { bg: 'var(--g-bg)',      txt: 'var(--g-txt)',      border: 'var(--g-border)' },
  declined: { bg: 'var(--r-bg)',      txt: 'var(--r-txt)',      border: 'var(--r-border)' },
  expired:  { bg: 'var(--bg2)',       txt: 'var(--txt3)',       border: 'var(--border)' },
}

const PROVIDER_COLORS: Record<string, { bg: string; txt: string }> = {
  manual:    { bg: 'var(--bg2)',  txt: 'var(--txt2)' },
  docusign:  { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  hellosign: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)' },
  pandadoc:  { bg: 'var(--p-bg)', txt: 'var(--p-txt)' },
}

export default function ESignaturesPage() {
  const [transactions, setTransactions] = useState<TransactionLite[]>([])
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const params = new URLSearchParams({ page: String(page), limit: '25' })
  if (statusFilter) params.set('status', statusFilter)
  interface SigsResponse { data: ESignature[]; pagination: { total: number; totalPages: number } }
  const sigsQuery = useApi<SigsResponse>(`/e-signatures?${params}`)
  const sigs = sigsQuery.data?.data ?? []
  const total = sigsQuery.data?.pagination.total ?? 0
  const totalPages = sigsQuery.data?.pagination.totalPages ?? 0
  const loading = sigsQuery.loading
  const fetchData = sigsQuery.refetch

  const [showAdd, setShowAdd] = useState(false)
  const [addTxId, setAddTxId] = useState('')
  const [addDocName, setAddDocName] = useState('')
  const [addSignerName, setAddSignerName] = useState('')
  const [addSignerEmail, setAddSignerEmail] = useState('')
  const [addProvider, setAddProvider] = useState('manual')
  const [saving, setSaving] = useState(false)

  const [selected, setSelected] = useState<ESignature | null>(null)

  const t = useTranslations('eSignatures')
  const { addToast } = useToast()

  useEffect(() => {
    fetch('/api/transactions?limit=500')
      .then(r => r.json())
      .then(j => setTransactions(Array.isArray(j.data) ? j.data.map((t: TransactionLite) => ({
        id: t.id, escrowNumber: t.escrowNumber, titleCompany: t.titleCompany,
      })) : []))
      .catch(() => {})
  }, [])

  useEntitySubscription('eSignature', fetchData)

  const pending = sigs.filter(s => s.status === 'pending').length
  const signed = sigs.filter(s => s.status === 'signed').length
  const completionRate = total > 0 ? Math.round((signed / total) * 100) : 0

  async function handleAddSignature() {
    if (!addTxId) { addToast('Select a transaction', 'error'); return }
    if (!addDocName.trim()) { addToast('Document name required', 'error'); return }
    if (!addSignerEmail.trim()) { addToast('Signer email required', 'error'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/e-signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: addTxId,
          documentName: addDocName.trim(),
          signerName: addSignerName.trim(),
          signerEmail: addSignerEmail.trim(),
          provider: addProvider,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? 'Failed', 'error'); return }
      addToast('Signature request created', 'success')
      setAddTxId(''); setAddDocName(''); setAddSignerName(''); setAddSignerEmail(''); setAddProvider('manual')
      setShowAdd(false)
      fetchData()
    } catch { addToast('Network error', 'error') }
    finally { setSaving(false) }
  }

  async function changeStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/e-signatures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { addToast('Update failed', 'error'); return }
      addToast(`Marked ${status}`, 'success')
      setSelected(null)
      fetchData()
    } catch { addToast('Network error', 'error') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this signature request?')) return
    try {
      const res = await fetch(`/api/e-signatures/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast('Deleted', 'success')
        setSelected(null)
        fetchData()
      } else { addToast('Delete failed', 'error') }
    } catch { addToast('Network error', 'error') }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="folder" label="Total Signatures" value={String(total)} />
          <KpiCard icon="target" label="Pending" value={String(pending)} />
          <KpiCard icon="trending-up" label="Signed" value={String(signed)} />
          <KpiCard icon="chart" label="Completion Rate" value={`${completionRate}%`} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'sent', label: 'Sent' },
              { value: 'viewed', label: 'Viewed' },
              { value: 'signed', label: 'Signed' },
              { value: 'declined', label: 'Declined' },
              { value: 'expired', label: 'Expired' },
            ]} />
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowAdd(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
          }}>
            <Plus size={13} /> Request Signature
          </button>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 140px 100px 100px 110px',
            gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)',
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)',
          }}>
            <span>Document</span>
            <span>Signer</span>
            <span>Transaction</span>
            <span>Provider</span>
            <span>Status</span>
            <span>Signed</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : sigs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
              No signature requests yet. Click Request Signature to start.
            </div>
          ) : sigs.map((sig, idx) => {
            const sc = STATUS_COLORS[sig.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt3)', border: 'var(--border)' }
            const pc = PROVIDER_COLORS[sig.provider] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
            return (
              <div
                key={sig.id}
                onClick={() => setSelected(sig)}
                className="card-hover"
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 140px 100px 100px 110px',
                  gap: 12, padding: '10px 16px',
                  borderBottom: idx < sigs.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12, alignItems: 'center', cursor: 'pointer',
                  background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sig.documentName}
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--txt)', fontSize: 12 }}>{sig.signerName || '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{sig.signerEmail}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--txt2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sig.transaction?.escrowNumber || '—'}
                </span>
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  textTransform: 'uppercase', background: pc.bg, color: pc.txt,
                  justifySelf: 'start',
                }}>{sig.provider}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  textTransform: 'uppercase', background: sc.bg, color: sc.txt,
                  border: `1px solid ${sc.border}`,
                  justifySelf: 'start',
                }}>{sig.status}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-red-hat-mono), monospace', color: 'var(--txt2)' }}>
                  {sig.signedAt ? new Date(sig.signedAt).toLocaleDateString() : '-'}
                </span>
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.documentName ?? 'Signature'}
        subtitle={selected ? `${selected.signerName} · ${selected.signerEmail}` : ''}
        size="md"
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(() => {
                const sc = STATUS_COLORS[selected.status] ?? STATUS_COLORS.pending
                return (
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
                  }}>{selected.status}</span>
                )
              })()}
              <span style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                background: 'var(--bg2)', color: 'var(--txt2)', textTransform: 'uppercase',
              }}>{selected.provider}</span>
            </div>

            {/* Timeline */}
            <div style={{ padding: 14, background: 'var(--bg2)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 10 }}>Timeline</div>
              <TimelineRow icon={Plus} label="Created" date={selected.createdAt} />
              <TimelineRow icon={Send} label="Sent" date={selected.sentAt} />
              <TimelineRow icon={Eye} label="Viewed" date={selected.viewedAt} />
              <TimelineRow icon={CheckCircle2} label="Signed" date={selected.signedAt} />
            </div>

            {/* Transaction link */}
            {selected.transaction && (
              <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 4 }}>Transaction</div>
                <a href={`/transactions/${selected.transaction.id}`} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                  {selected.transaction.escrowNumber} →
                </a>
              </div>
            )}

            {/* Status actions */}
            {!['signed', 'declined', 'expired'].includes(selected.status) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selected.status === 'pending' && (
                  <StatusBtn onClick={() => changeStatus(selected.id, 'sent')} bg="var(--accent)" color="#fff">
                    <Send size={12} /> Mark Sent
                  </StatusBtn>
                )}
                {(selected.status === 'sent' || selected.status === 'pending') && (
                  <StatusBtn onClick={() => changeStatus(selected.id, 'viewed')} bg="transparent" color="var(--accent-txt)" border="var(--accent-border)">
                    <Eye size={12} /> Mark Viewed
                  </StatusBtn>
                )}
                <StatusBtn onClick={() => changeStatus(selected.id, 'signed')} bg="var(--g)" color="#fff">
                  <CheckCircle2 size={12} /> Mark Signed
                </StatusBtn>
                <StatusBtn onClick={() => changeStatus(selected.id, 'declined')} bg="transparent" color="var(--r-txt)" border="var(--r-border)">
                  <X size={12} /> Declined
                </StatusBtn>
                <StatusBtn onClick={() => changeStatus(selected.id, 'pending')} bg="transparent" color="var(--txt2)" border="var(--border)">
                  <RefreshCw size={12} /> Reset
                </StatusBtn>
              </div>
            )}

            <div style={{ display: 'flex', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <button onClick={() => handleDelete(selected.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'transparent', color: 'var(--r-txt)',
                border: '1px solid var(--r-border)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Modal */}
      <Modal
        open={showAdd}
        onClose={() => { if (!saving) setShowAdd(false) }}
        title="Request Signature"
        subtitle="Send a document for electronic signature"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Transaction">
            <select value={addTxId} onChange={e => setAddTxId(e.target.value)} style={inputStyle}>
              <option value="">Select transaction…</option>
              {transactions.map(t => (
                <option key={t.id} value={t.id}>
                  {t.escrowNumber || `Transaction ${t.id.slice(0, 8)}`}{t.titleCompany ? ` — ${t.titleCompany}` : ''}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Document Name">
            <input value={addDocName} onChange={e => setAddDocName(e.target.value)} placeholder="Purchase Agreement" style={inputStyle} />
          </FormField>
          <FormField label="Signer Name">
            <input value={addSignerName} onChange={e => setAddSignerName(e.target.value)} placeholder="Jane Doe" style={inputStyle} />
          </FormField>
          <FormField label="Signer Email">
            <input type="email" value={addSignerEmail} onChange={e => setAddSignerEmail(e.target.value)} placeholder="jane@example.com" style={inputStyle} />
          </FormField>
          <FormField label="Provider">
            <select value={addProvider} onChange={e => setAddProvider(e.target.value)} style={inputStyle}>
              <option value="manual">Manual</option>
              <option value="docusign">DocuSign</option>
              <option value="hellosign">HelloSign / Dropbox Sign</option>
              <option value="pandadoc">PandaDoc</option>
            </select>
          </FormField>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button onClick={() => setShowAdd(false)} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancel</button>
            <button onClick={handleAddSignature} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Creating…' : 'Send Request'}</button>
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

function TimelineRow({ icon: Icon, label, date }: { icon: React.ComponentType<{ size?: number }>; label: string; date: string | null }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 0',
      opacity: date ? 1 : 0.4,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: date ? 'var(--accent-bg)' : 'var(--panel)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: date ? 'var(--accent)' : 'var(--txt3)',
      }}>
        <Icon size={11} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)', minWidth: 70 }}>{label}</span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--txt3)' }}>
        {date ? new Date(date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
      </span>
    </div>
  )
}

function StatusBtn({ onClick, bg, color, border, children }: { onClick: () => void; bg: string; color: string; border?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '7px 13px', borderRadius: 8,
      background: bg, color,
      border: border ? `1px solid ${border}` : 'none',
      fontSize: 11, fontWeight: 600,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  )
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
      <Filter size={13} style={{ color: 'var(--txt3)' }} />
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
