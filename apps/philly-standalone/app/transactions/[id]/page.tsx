'use client'

import { use, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import {
  ArrowLeft, Check, X, Edit2, Trash2, Calendar, DollarSign,
  PenTool, FileText, Building2, CheckCircle2, Circle, Plus,
} from 'lucide-react'
import { useToast } from '@/hooks/philly/useToast'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useApi } from '@/hooks/philly/useApi'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { ListLoading, ListError } from '@/components/philly/ui/ListStates'
import { useFormat } from '@/hooks/philly/useFormat'

interface ESignature {
  id: string
  documentName: string
  signerName: string
  signerEmail: string
  status: string
  sentAt: string | null
  viewedAt: string | null
  signedAt: string | null
  provider: string
  createdAt: string
}

interface ChecklistItem {
  label: string
  done: boolean
  dueDate?: string
}

interface Transaction {
  id: string
  dealId: string | null
  propertyId: string | null
  type: string
  status: string
  closingDate: string | null
  contractDate: string | null
  escrowNumber: string
  titleCompany: string
  buyerContactId: string | null
  sellerContactId: string | null
  salePrice: number
  earnestMoney: number
  notes: string
  checklistJson: string
  createdAt: string
  updatedAt: string
  signatures?: ESignature[]
  _count?: { signatures: number }
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  pending: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  active: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  in_progress: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  closing: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)' },
  closed: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  completed: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  cancelled: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

const SIGNATURE_STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  pending: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
  sent: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  viewed: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  signed: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  declined: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
  expired: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

function parseChecklist(json: string): ChecklistItem[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function buildDefaultChecklist(tt: (k: string) => string): ChecklistItem[] {
  return [
    { label: tt('checklist.defaultItems.inspection'), done: false },
    { label: tt('checklist.defaultItems.appraisal'), done: false },
    { label: tt('checklist.defaultItems.loanApproval'), done: false },
    { label: tt('checklist.defaultItems.titleSearch'), done: false },
    { label: tt('checklist.defaultItems.insurance'), done: false },
    { label: tt('checklist.defaultItems.walkthrough'), done: false },
    { label: tt('checklist.defaultItems.closingDocs'), done: false },
  ]
}

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('transactions')
  const tt = useTranslations('transactionDetail')
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()
  const router = useRouter()
  const { addToast } = useToast()
  // LOC-03 — locale-bound money/date, replacing $-hardcoded toLocaleString().
  const fmt = useFormat()

  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // New signature form
  const [showAddSig, setShowAddSig] = useState(false)
  const [sigDocName, setSigDocName] = useState('')
  const [sigName, setSigName] = useState('')
  const [sigEmail, setSigEmail] = useState('')
  const [sigSaving, setSigSaving] = useState(false)

  interface TxResponse { data: Transaction | null; error?: string }
  const txQuery = useApi<TxResponse>(`/transactions/${id}`)
  const tx = txQuery.data?.data ?? null
  const loading = txQuery.loading
  const error = txQuery.error ?? ''
  const fetchTx = txQuery.refetch

  useEntitySubscription('transaction', (evt) => {
    if (evt.entityId === id) fetchTx()
  })
  useEntitySubscription('eSignature', fetchTx)

  const DEFAULT_CHECKLIST = buildDefaultChecklist(tt)
  const checklist = tx ? parseChecklist(tx.checklistJson) : []
  const displayChecklist = checklist.length > 0 ? checklist : DEFAULT_CHECKLIST
  const completedCount = displayChecklist.filter(c => c.done).length
  const progressPct = displayChecklist.length > 0 ? Math.round((completedCount / displayChecklist.length) * 100) : 0

  function startEdit(field: string, value: unknown) {
    setEditField(field)
    setEditValue(value == null ? '' : String(value))
  }
  function cancelEdit() { setEditField(null); setEditValue('') }

  async function saveEdit() {
    if (!tx || !editField) return
    const patch: Record<string, unknown> = {}
    switch (editField) {
      case 'escrowNumber':
      case 'titleCompany':
      case 'notes':
      case 'status':
      case 'type':
        patch[editField] = editValue
        break
      case 'salePrice':
      case 'earnestMoney': {
        const n = Math.round(parseFloat(editValue) * 100)
        if (!isFinite(n) || n < 0) { addToast(tt('toasts.invalidAmount'), 'error'); return }
        patch[editField] = n
        break
      }
      case 'closingDate':
      case 'contractDate':
        patch[editField] = editValue || null
        break
    }
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? tt('toasts.saveFailed'), 'error'); return }
      addToast(tt('toasts.saved'), 'success')
      setEditField(null)
      fetchTx()
    } catch { addToast(tt('toasts.networkError'), 'error') }
  }

  async function toggleChecklist(idx: number) {
    if (!tx) return
    const current = checklist.length > 0 ? [...checklist] : [...DEFAULT_CHECKLIST]
    current[idx] = { ...current[idx], done: !current[idx].done }
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistJson: JSON.stringify(current) }),
      })
      if (!res.ok) { addToast(tt('toasts.updateFailed'), 'error'); return }
      fetchTx()
    } catch { addToast(tt('toasts.networkError'), 'error') }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: tConfirms('deleteGeneric.title', { entityType: tConfirms('entities.transaction') }),
      body: tConfirms('deleteGeneric.body'),
      confirmLabel: tCommon('delete'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast(tt('toasts.deleted'), 'success')
        router.push('/transactions')
      } else {
        const j = await res.json().catch(() => ({}))
        addToast(j.error ?? tt('toasts.deleteFailed'), 'error')
      }
    } catch { addToast(tt('toasts.networkError'), 'error') }
  }

  async function submitSignature() {
    if (!sigDocName.trim() || !sigName.trim() || !sigEmail.trim()) {
      addToast(tt('toasts.allFieldsRequired'), 'error')
      return
    }
    setSigSaving(true)
    try {
      const res = await fetch('/api/e-signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: id,
          documentName: sigDocName.trim(),
          signerName: sigName.trim(),
          signerEmail: sigEmail.trim(),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? tt('toasts.signatureFailed'), 'error'); return }
      addToast(tt('toasts.signatureCreated'), 'success')
      setShowAddSig(false)
      setSigDocName(''); setSigName(''); setSigEmail('')
      fetchTx()
    } catch { addToast(tt('toasts.networkError'), 'error') }
    finally { setSigSaving(false) }
  }

  const sc = tx ? (STATUS_COLORS[tx.status] ?? STATUS_COLORS.pending) : STATUS_COLORS.pending

  return (
    <>
      <Topbar
        title={tx?.escrowNumber || tt('titleFallback')}
        sub={tx?.titleCompany || tt('common.loading')}
      />
      <div style={{ padding: '18px 24px 40px' }}>

        <Link href="/transactions" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, color: 'var(--accent)',
          textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={14} /> {tt('backToTransactions')}
        </Link>

        {loading ? (
          <ListLoading />
        ) : error || !tx ? (
          <ListError onRetry={fetchTx} message={error || tt('notFound')} />
        ) : (
          <>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              marginBottom: 20, flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--txt)', letterSpacing: '-0.02em' }}>
                  {tx.escrowNumber || tt('escrowFallback')}
                </h1>
                <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>
                  {tx.titleCompany || tt('noTitleCompany')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {editField === 'status' ? (
                  <select autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                    style={{ ...inputStyle, width: 150 }}>
                    <option value="pending">{tt('statuses.pending')}</option>
                    <option value="in_progress">{tt('statuses.inProgress')}</option>
                    <option value="closing">{tt('statuses.closing')}</option>
                    <option value="completed">{tt('statuses.completed')}</option>
                    <option value="cancelled">{tt('statuses.cancelled')}</option>
                  </select>
                ) : (
                  <span
                    onClick={() => startEdit('status', tx.status)}
                    style={{
                      padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', background: sc.bg, color: sc.txt,
                      cursor: 'pointer',
                    }}
                  >{tx.status}</span>
                )}
                {editField === 'type' ? (
                  <select autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                    style={{ ...inputStyle, width: 130 }}>
                    <option value="purchase">{tt('types.purchase')}</option>
                    <option value="sale">{tt('types.sale')}</option>
                    <option value="lease">{tt('types.lease')}</option>
                    <option value="rental">{tt('types.rental')}</option>
                  </select>
                ) : (
                  <span
                    onClick={() => startEdit('type', tx.type)}
                    style={{
                      padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', background: 'var(--bg2)', color: 'var(--txt2)',
                      cursor: 'pointer',
                    }}
                  >{tx.type}</span>
                )}
              </div>
            </div>

            {/* Action bar */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap',
              padding: '10px 14px', borderRadius: 12,
              background: 'var(--bg2)', border: '1px solid var(--border)',
            }}>
              <button onClick={() => setShowAddSig(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff',
                border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                <PenTool size={13} /> {tt('actions.requestSignature')}
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={handleDelete} style={outlineBtn('var(--r-txt)', 'var(--r-border)')}>
                <Trash2 size={12} /> {tt('actions.delete')}
              </button>
            </div>

            {/* 2-col layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 18, alignItems: 'start' }}>

              {/* LEFT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Financial card */}
                <div style={{
                  padding: 20, borderRadius: 14, border: '1px solid var(--border)',
                  background: 'var(--panel)', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--txt)' }}>{tt('sections.financial')}</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 4 }}>{tt('fields.salePrice')}</div>
                      {editField === 'salePrice' ? (
                        <InlineEdit value={editValue} onChange={setEditValue} onSave={saveEdit} onCancel={cancelEdit} type="number" big />
                      ) : (
                        <div onClick={() => startEdit('salePrice', (tx.salePrice / 100).toString())}
                          className="mono"
                          style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer' }}
                          title={tt('hints.clickToEdit')}
                        >
                          {fmt.currency(tx.salePrice, { cents: true })}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 4 }}>{tt('fields.earnestMoney')}</div>
                      {editField === 'earnestMoney' ? (
                        <InlineEdit value={editValue} onChange={setEditValue} onSave={saveEdit} onCancel={cancelEdit} type="number" big />
                      ) : (
                        <div onClick={() => startEdit('earnestMoney', (tx.earnestMoney / 100).toString())}
                          className="mono"
                          style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', cursor: 'pointer' }}
                          title={tt('hints.clickToEdit')}
                        >
                          {fmt.currency(tx.earnestMoney, { cents: true })}
                        </div>
                      )}
                    </div>

                    <EditableField label={tt('fields.escrowNumber')} field="escrowNumber" value={tx.escrowNumber}
                      editField={editField} editValue={editValue} setEditValue={setEditValue}
                      startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} clickToEditTitle={tt('hints.clickToEdit')} />
                    <EditableField label={tt('fields.titleCompany')} field="titleCompany" value={tx.titleCompany}
                      editField={editField} editValue={editValue} setEditValue={setEditValue}
                      startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} clickToEditTitle={tt('hints.clickToEdit')} />

                    <EditableField label={tt('fields.contractDate')} field="contractDate"
                      value={tx.contractDate ? new Date(tx.contractDate).toISOString().slice(0, 10) : ''}
                      display={tx.contractDate ? fmt.date(tx.contractDate) : '—'}
                      type="date"
                      editField={editField} editValue={editValue} setEditValue={setEditValue}
                      startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} clickToEditTitle={tt('hints.clickToEdit')} />
                    <EditableField label={tt('fields.closingDate')} field="closingDate"
                      value={tx.closingDate ? new Date(tx.closingDate).toISOString().slice(0, 10) : ''}
                      display={tx.closingDate ? fmt.date(tx.closingDate) : '—'}
                      type="date"
                      editField={editField} editValue={editValue} setEditValue={setEditValue}
                      startEdit={startEdit} onSave={saveEdit} onCancel={cancelEdit} />
                  </div>
                </div>

                {/* Checklist */}
                <div style={{
                  padding: 20, borderRadius: 14, border: '1px solid var(--border)',
                  background: 'var(--panel)', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>
                      {tt('sections.closingChecklist')} ({completedCount}/{displayChecklist.length})
                    </span>
                    <span className="mono" style={{
                      fontSize: 11, fontWeight: 700,
                      color: progressPct === 100 ? 'var(--g-txt)' : progressPct >= 50 ? 'var(--y-txt)' : 'var(--txt3)',
                    }}>
                      {progressPct}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, borderRadius: 4, background: 'var(--bg2)', overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{
                      width: `${progressPct}%`, height: '100%', borderRadius: 4,
                      background: progressPct === 100 ? 'var(--g)' : progressPct >= 50 ? 'var(--y)' : 'var(--accent)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {displayChecklist.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => toggleChecklist(i)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 12px', borderRadius: 8,
                          background: item.done ? 'var(--g-bg)' : 'var(--bg2)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                        }}
                      >
                        {item.done
                          ? <CheckCircle2 size={14} style={{ color: 'var(--g-txt)' }} />
                          : <Circle size={14} style={{ color: 'var(--txt3)' }} />}
                        <span style={{
                          fontSize: 12, color: item.done ? 'var(--txt3)' : 'var(--txt)',
                          textDecoration: item.done ? 'line-through' : 'none',
                        }}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div style={{
                  padding: 20, borderRadius: 14, border: '1px solid var(--border)',
                  background: 'var(--panel)', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>
                      <FileText size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> {tt('sections.notes')}
                    </span>
                    {editField !== 'notes' && (
                      <button onClick={() => startEdit('notes', tx.notes)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Edit2 size={11} /> {tt('actions.edit')}
                      </button>
                    )}
                  </div>
                  {editField === 'notes' ? (
                    <>
                      <textarea autoFocus rows={5} value={editValue} onChange={e => setEditValue(e.target.value)}
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                        <button onClick={cancelEdit} style={outlineBtn('var(--txt2)', 'var(--border)')}>{tt('actions.cancel')}</button>
                        <button onClick={saveEdit} style={primaryBtn}>{tt('actions.save')}</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--txt2)', whiteSpace: 'pre-wrap', minHeight: 40 }}>
                      {tx.notes?.trim() || tt('empty.noNotes')}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Summary tiles */}
                <SideCard title={tt('sections.summary')}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <StatRow icon={<DollarSign size={13} />} label={tt('fields.salePrice')} value={fmt.currency(tx.salePrice, { cents: true })} />
                    <StatRow icon={<DollarSign size={13} />} label={tt('fields.earnest')} value={fmt.currency(tx.earnestMoney, { cents: true })} />
                    <StatRow icon={<PenTool size={13} />} label={tt('fields.signatures')} value={String(tx._count?.signatures ?? 0)} />
                    <StatRow icon={<Calendar size={13} />} label={tt('fields.daysOpen')} value={String(Math.max(1, Math.floor((Date.now() - new Date(tx.createdAt).getTime()) / 86400000)))} />
                  </div>
                </SideCard>

                {/* Signatures */}
                <SideCard
                  title={`${tt('sections.signatures')} (${tx.signatures?.length ?? 0})`}
                  action={<button onClick={() => setShowAddSig(true)} style={{
                    background: 'transparent', border: 'none', color: 'var(--accent)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit',
                  }}>
                    <Plus size={11} /> {tt('actions.request')}
                  </button>}
                >
                  {!tx.signatures?.length ? (
                    <div style={{ fontSize: 11, color: 'var(--txt3)', padding: '6px 0' }}>{tt('empty.noSignatures')}</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {tx.signatures.map(sig => {
                        const ssc = SIGNATURE_STATUS_COLORS[sig.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
                        return (
                          <div key={sig.id} style={{
                            padding: '9px 11px', borderRadius: 8,
                            background: 'var(--bg2)', border: '1px solid var(--border)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                                {sig.documentName}
                              </span>
                              <span style={{
                                padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 700,
                                textTransform: 'uppercase', background: ssc.bg, color: ssc.txt, flexShrink: 0,
                              }}>{sig.status}</span>
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
                              {sig.signerName} · {sig.signerEmail}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </SideCard>

                {/* Linked deal/property */}
                {(tx.dealId || tx.propertyId) && (
                  <SideCard title={tt('sections.linked')}>
                    {tx.dealId && (
                      <Link href={`/deals/${tx.dealId}`} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 8,
                        background: 'var(--bg2)', textDecoration: 'none',
                        marginBottom: 6,
                      }}>
                        <Building2 size={13} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                          {tt('actions.viewDeal')}
                        </span>
                      </Link>
                    )}
                    {tx.propertyId && (
                      <Link href={`/properties/${tx.propertyId}`} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 8,
                        background: 'var(--bg2)', textDecoration: 'none',
                      }}>
                        <Building2 size={13} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                          {tt('actions.viewProperty')}
                        </span>
                      </Link>
                    )}
                  </SideCard>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Signature modal */}
      {showAddSig && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => !sigSaving && setShowAddSig(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--panel)', borderRadius: 16,
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
            padding: '24px 28px', width: 420, maxWidth: '90vw',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{tt('modal.title')}</div>
              <button onClick={() => setShowAddSig(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 16 }}>
              {tt('modal.subtitle')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FieldLabel label={tt('fields.documentName')}>
                <input value={sigDocName} onChange={e => setSigDocName(e.target.value)} placeholder={tt('modal.documentPlaceholder')} style={inputStyle} />
              </FieldLabel>
              <FieldLabel label={tt('fields.signerName')}>
                <input value={sigName} onChange={e => setSigName(e.target.value)} placeholder={tt('modal.signerNamePlaceholder')} style={inputStyle} />
              </FieldLabel>
              <FieldLabel label={tt('fields.signerEmail')}>
                <input type="email" value={sigEmail} onChange={e => setSigEmail(e.target.value)} placeholder={tt('modal.signerEmailPlaceholder')} style={inputStyle} />
              </FieldLabel>
            </div>
            <button onClick={submitSignature} disabled={sigSaving} style={{
              width: '100%', marginTop: 18, padding: '10px 0',
              borderRadius: 10, border: 'none',
              background: sigSaving ? 'var(--bg2)' : 'var(--accent)',
              color: sigSaving ? 'var(--txt3)' : '#fff',
              fontSize: 13, fontWeight: 600, cursor: sigSaving ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}>
              {sigSaving ? tt('actions.sending') : tt('actions.sendSignatureRequest')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit', outline: 'none',
}

const primaryBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, background: 'var(--accent)', color: '#fff',
  border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}

function outlineBtn(color: string, border: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 10,
    background: 'transparent', color,
    border: `1px solid ${border}`, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{label}</label>
      {children}
    </div>
  )
}

function InlineEdit({ value, onChange, onSave, onCancel, type, big }: {
  value: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void; type?: string; big?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        autoFocus
        type={type ?? 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
        style={{
          flex: 1, minWidth: 0,
          padding: big ? '6px 10px' : '5px 9px',
          borderRadius: 7,
          border: '1px solid var(--accent)', background: 'var(--panel)',
          color: 'var(--txt)',
          fontSize: big ? 18 : 13, fontWeight: big ? 700 : 500,
          fontFamily: big ? 'var(--font-red-hat-mono), monospace' : 'inherit',
          outline: 'none',
        }}
      />
      <button onClick={onSave} style={iconBtn('var(--accent)', '#fff')}><Check size={12} /></button>
      <button onClick={onCancel} style={iconBtn('var(--panel)', 'var(--txt2)', 'var(--border)')}><X size={12} /></button>
    </div>
  )
}

function iconBtn(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    width: 26, height: 26, borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: bg, color, border: border ? `1px solid ${border}` : 'none',
    cursor: 'pointer', flexShrink: 0,
  }
}

function EditableField({
  label, field, value, display, editField, editValue, setEditValue, startEdit, onSave, onCancel, type, clickToEditTitle,
}: {
  label: string; field: string; value: string; display?: string;
  editField: string | null; editValue: string; setEditValue: (v: string) => void;
  startEdit: (f: string, v: unknown) => void; onSave: () => void; onCancel: () => void;
  type?: string;
  clickToEditTitle?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
        {label}
      </div>
      {editField === field ? (
        <InlineEdit value={editValue} onChange={setEditValue} onSave={onSave} onCancel={onCancel} type={type} />
      ) : (
        <div
          onClick={() => startEdit(field, value)}
          style={{ fontSize: 13, color: 'var(--txt)', fontWeight: 500, cursor: 'pointer', minHeight: 18 }}
          title={clickToEditTitle ?? 'Click to edit'}
        >
          {display ?? value ?? <span style={{ color: 'var(--txt3)', fontStyle: 'italic' }}>—</span>}
        </div>
      )}
    </div>
  )
}

function SideCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12, border: '1px solid var(--border)',
      background: 'var(--panel)', boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--txt3)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 10px', borderRadius: 8,
      background: 'var(--bg2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--txt2)' }}>
        <span style={{ color: 'var(--txt3)' }}>{icon}</span>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>
        {value}
      </div>
    </div>
  )
}
