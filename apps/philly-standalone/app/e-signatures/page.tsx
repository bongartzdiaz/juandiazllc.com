'use client'

import { useMemo, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { Filter, Plus, Send, Eye, CheckCircle2, Trash2, RefreshCw, X } from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { useApi } from '@/hooks/philly/useApi'
import { useFormat } from '@/hooks/philly/useFormat'
import { useColumnPrefs } from '@/hooks/philly/useColumnPrefs'
import { ColumnPicker, type ColumnDef } from '@/components/philly/ui/ColumnPicker'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'

const ESIG_COLUMNS: ColumnDef[] = [
  { id: 'document', label: 'Document', required: true },
  { id: 'signer', label: 'Signer' },
  { id: 'transaction', label: 'Transaction' },
  { id: 'provider', label: 'Provider' },
  { id: 'status', label: 'Status' },
  { id: 'signed', label: 'Signed' },
]
const ESIG_DEFAULTS = ['document', 'signer', 'transaction', 'provider', 'status', 'signed']
const ESIG_WIDTHS: Record<string, string> = {
  document: '1fr', signer: '1fr', transaction: '140px',
  provider: '100px', status: '100px', signed: '110px',
}

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
  const fmt = useFormat()

  // Bundle AJ — column visibility prefs.
  const esigColumns = useColumnPrefs('pai-esignatures-columns-v1', ESIG_DEFAULTS)
  const t = useTranslations('eSignatures')
  const localizedColumns = useMemo<ColumnDef[]>(() => [
    { id: 'document', label: t('columns.document'), required: true },
    { id: 'signer', label: t('columns.signer') },
    { id: 'transaction', label: t('columns.transaction') },
    { id: 'provider', label: t('columns.provider') },
    { id: 'status', label: t('columns.status') },
    { id: 'signed', label: t('columns.signed') },
  ], [t])
  const visibleEsigColumns = useMemo(
    () => localizedColumns.filter((c) => c.required || esigColumns.visible.has(c.id)),
    [esigColumns.visible, localizedColumns],
  )
  const esigGridTemplate = useMemo(
    () => visibleEsigColumns.map((c) => ESIG_WIDTHS[c.id]).join(' '),
    [visibleEsigColumns],
  )

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
    if (!addTxId) { addToast(t('toasts.selectTransaction'), 'error'); return }
    if (!addDocName.trim()) { addToast(t('toasts.documentNameRequired'), 'error'); return }
    if (!addSignerEmail.trim()) { addToast(t('toasts.signerEmailRequired'), 'error'); return }

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
      if (!res.ok) { addToast(j.error ?? t('toasts.saveFailed'), 'error'); return }
      addToast(t('toasts.created'), 'success')
      setAddTxId(''); setAddDocName(''); setAddSignerName(''); setAddSignerEmail(''); setAddProvider('manual')
      setShowAdd(false)
      fetchData()
    } catch { addToast(t('toasts.networkError'), 'error') }
    finally { setSaving(false) }
  }

  async function changeStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/e-signatures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { addToast(t('toasts.updateFailed'), 'error'); return }
      addToast(t('toasts.marked', { status }), 'success')
      setSelected(null)
      fetchData()
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirms.delete'))) return
    try {
      const res = await fetch(`/api/e-signatures/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast(t('toasts.deleted'), 'success')
        setSelected(null)
        fetchData()
      } else { addToast(t('toasts.deleteFailed'), 'error') }
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="folder" label={t('kpis.total')} value={String(total)} />
          <KpiCard icon="target" label={t('kpis.pending')} value={String(pending)} />
          <KpiCard icon="trending-up" label={t('kpis.signed')} value={String(signed)} />
          <KpiCard icon="chart" label={t('kpis.completionRate')} value={`${completionRate}%`} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <FilterSelect ariaLabel={t('filters.all')} value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: '', label: t('filters.all') },
              { value: 'pending', label: t('filters.pending') },
              { value: 'sent', label: t('filters.sent') },
              { value: 'viewed', label: t('filters.viewed') },
              { value: 'signed', label: t('filters.signed') },
              { value: 'declined', label: t('filters.declined') },
              { value: 'expired', label: t('filters.expired') },
            ]} />
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowAdd(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
          }}>
            <Plus size={13} /> {t('list.requestSignature')}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <ColumnPicker
            columns={localizedColumns}
            visible={esigColumns.visible}
            onToggle={esigColumns.toggle}
            onReset={esigColumns.reset}
            isOverridden={esigColumns.isOverridden}
          />
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: esigGridTemplate,
            gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)',
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)',
          }}>
            {visibleEsigColumns.map((c) => <span key={c.id}>{c.label}</span>)}
          </div>
          {sigsQuery.error ? (
            <div style={{ padding: 16 }}><ListError onRetry={fetchData} message={sigsQuery.error} /></div>
          ) : loading ? (
            <div style={{ padding: 16 }}><ListLoading /></div>
          ) : sigs.length === 0 ? (
            <div style={{ padding: 16 }}><ListEmpty /></div>
          ) : sigs.map((sig, idx) => {
            const sc = STATUS_COLORS[sig.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt3)', border: 'var(--border)' }
            const pc = PROVIDER_COLORS[sig.provider] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
            return (
              <div
                key={sig.id}
                onClick={() => setSelected(sig)}
                className="card-hover"
                style={{
                  display: 'grid', gridTemplateColumns: esigGridTemplate,
                  gap: 12, padding: '10px 16px',
                  borderBottom: idx < sigs.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12, alignItems: 'center', cursor: 'pointer',
                  background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                }}
              >
                {visibleEsigColumns.map((c) => {
                  if (c.id === 'document') return <div key="document" style={{ fontWeight: 600, color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sig.documentName}</div>
                  if (c.id === 'signer') return (
                    <div key="signer">
                      <div style={{ fontWeight: 500, color: 'var(--txt)', fontSize: 12 }}>{sig.signerName || '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{sig.signerEmail}</div>
                    </div>
                  )
                  if (c.id === 'transaction') return <span key="transaction" style={{ fontSize: 11, color: 'var(--txt2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sig.transaction?.escrowNumber || '—'}</span>
                  if (c.id === 'provider') return <span key="provider" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: pc.bg, color: pc.txt, justifySelf: 'start' }}>{sig.provider}</span>
                  if (c.id === 'status') return <span key="status" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`, justifySelf: 'start' }}>{sig.status}</span>
                  if (c.id === 'signed') return <span key="signed" style={{ fontSize: 11, fontFamily: 'var(--font-red-hat-mono), monospace', color: 'var(--txt2)' }}>{sig.signedAt ? fmt.date(sig.signedAt) : '-'}</span>
                  return <span key={c.id} />
                })}
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
        title={selected?.documentName ?? t('detail.fallbackTitle')}
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
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 10 }}>{t('detail.timeline')}</div>
              <TimelineRow icon={Plus} label={t('detail.created')} date={selected.createdAt} />
              <TimelineRow icon={Send} label={t('detail.sent')} date={selected.sentAt} />
              <TimelineRow icon={Eye} label={t('detail.viewed')} date={selected.viewedAt} />
              <TimelineRow icon={CheckCircle2} label={t('detail.signed')} date={selected.signedAt} />
            </div>

            {/* Transaction link */}
            {selected.transaction && (
              <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 4 }}>{t('detail.transaction')}</div>
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
                    <Send size={12} /> {t('detail.markSent')}
                  </StatusBtn>
                )}
                {(selected.status === 'sent' || selected.status === 'pending') && (
                  <StatusBtn onClick={() => changeStatus(selected.id, 'viewed')} bg="transparent" color="var(--accent-txt)" border="var(--accent-border)">
                    <Eye size={12} /> {t('detail.markViewed')}
                  </StatusBtn>
                )}
                <StatusBtn onClick={() => changeStatus(selected.id, 'signed')} bg="var(--g)" color="#fff">
                  <CheckCircle2 size={12} /> {t('detail.markSigned')}
                </StatusBtn>
                <StatusBtn onClick={() => changeStatus(selected.id, 'declined')} bg="transparent" color="var(--r-txt)" border="var(--r-border)">
                  <X size={12} /> {t('detail.declined')}
                </StatusBtn>
                <StatusBtn onClick={() => changeStatus(selected.id, 'pending')} bg="transparent" color="var(--txt2)" border="var(--border)">
                  <RefreshCw size={12} /> {t('detail.reset')}
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
                <Trash2 size={12} /> {t('detail.delete')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Modal */}
      <Modal
        open={showAdd}
        onClose={() => { if (!saving) setShowAdd(false) }}
        title={t('request.title')}
        subtitle={t('request.subtitle')}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label={t('request.transaction')}>
            <select aria-label={t('request.transaction')} value={addTxId} onChange={e => setAddTxId(e.target.value)} style={inputStyle}>
              <option value="">{t('request.selectTransaction')}</option>
              {transactions.map(tx => (
                <option key={tx.id} value={tx.id}>
                  {tx.escrowNumber || t('request.transactionFallback', { id: tx.id.slice(0, 8) })}{tx.titleCompany ? ` — ${tx.titleCompany}` : ''}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('request.documentName')}>
            <input aria-label={t('request.documentName')} value={addDocName} onChange={e => setAddDocName(e.target.value)} placeholder="Purchase Agreement" style={inputStyle} />
          </FormField>
          <FormField label={t('request.signerName')}>
            <input aria-label={t('request.signerName')} value={addSignerName} onChange={e => setAddSignerName(e.target.value)} placeholder="Jane Doe" style={inputStyle} />
          </FormField>
          <FormField label={t('request.signerEmail')}>
            <input aria-label={t('request.signerEmail')} type="email" value={addSignerEmail} onChange={e => setAddSignerEmail(e.target.value)} placeholder="jane@example.com" style={inputStyle} />
          </FormField>
          <FormField label={t('request.provider')}>
            <select aria-label={t('request.provider')} value={addProvider} onChange={e => setAddProvider(e.target.value)} style={inputStyle}>
              <option value="manual">{t('request.manual')}</option>
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
            }}>{t('request.cancel')}</button>
            <button onClick={handleAddSignature} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}>{saving ? t('request.creating') : t('request.submit')}</button>
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
  const fmt = useFormat()
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
        {date ? fmt.dateTime(date) : '—'}
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

function FilterSelect({ value, onChange, options, ariaLabel }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; ariaLabel?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
      <Filter size={13} style={{ color: 'var(--txt3)' }} />
      <select aria-label={ariaLabel} value={value} onChange={e => onChange(e.target.value)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
