'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Filter, Trophy, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { useApi } from '@/hooks/philly/useApi'
import { useColumnPrefs } from '@/hooks/philly/useColumnPrefs'
import { ColumnPicker, type ColumnDef } from '@/components/philly/ui/ColumnPicker'
import { fetchJson } from '@/lib/philly/fetch-json'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'
import { useFormat } from '@/hooks/philly/useFormat'

const COMMISSION_COLUMNS: ColumnDef[] = [
  { id: 'type', label: 'Type / Notes', required: true },
  { id: 'gross', label: 'Gross' },
  { id: 'split', label: 'Split %' },
  { id: 'net', label: 'Net' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', required: true },
]
const COMMISSION_DEFAULTS = ['type', 'gross', 'split', 'net', 'status', 'actions']
const COMMISSION_WIDTHS: Record<string, string> = {
  type: '1fr',
  gross: '100px',
  split: '80px',
  net: '100px',
  status: '90px',
  actions: '110px',
}

interface CommissionRecord {
  id: string
  agentId: string
  dealId: string | null
  type: string
  grossCents: number
  splitPct: number
  netCents: number
  status: string
  notes: string
  createdAt: string
}

interface LeaderboardEntry {
  id: string
  name: string
  role: string
  avatarUrl: string | null
  totalDeals: number
  wonDeals: number
  monthDeals: number
  totalVolumeCents: number
  ytdCommissionCents: number
  conversionRate: number
  goal: { dealTarget: number; volumeTarget: number; gciTarget: number } | null
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  pending: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  paid: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  voided: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

const emptyForm = {
  agentId: '', dealId: '', type: 'closing',
  gross: '', splitPct: '100', notes: '',
}

export default function CommissionsPage() {
  const [tab, setTab] = useState<'commissions' | 'leaderboard'>('leaderboard')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const t = useTranslations('commissions')
  const { addToast } = useToast()
  // LOC-03 — locale-bound money/number/date, replacing $-hardcoded toLocaleString().
  const fmt = useFormat()

  const params = new URLSearchParams({ page: String(page), limit: '25' })
  if (statusFilter) params.set('status', statusFilter)
  interface RecordsResponse { data: CommissionRecord[]; pagination: { total: number; totalPages: number } }
  const recordsQuery = useApi<RecordsResponse>(`/commissions?${params}`)
  const records = recordsQuery.data?.data ?? []
  const total = recordsQuery.data?.pagination.total ?? 0
  const totalPages = recordsQuery.data?.pagination.totalPages ?? 0
  const loading = recordsQuery.loading
  const fetchRecords = recordsQuery.refetch

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Bundle BS — column visibility prefs.
  const commissionColumns = useColumnPrefs('pai-commissions-columns-v1', COMMISSION_DEFAULTS)
  const localizedColumns = useMemo<ColumnDef[]>(() => [
    { id: 'type', label: t('columns.typeNotes'), required: true },
    { id: 'gross', label: t('columns.gross') },
    { id: 'split', label: t('columns.splitPct') },
    { id: 'net', label: t('columns.net') },
    { id: 'status', label: t('columns.status') },
    { id: 'actions', label: t('columns.actions'), required: true },
  ], [t])
  const visibleCommissionColumns = useMemo(
    () => localizedColumns.filter((c) => c.required || commissionColumns.visible.has(c.id)),
    [commissionColumns.visible, localizedColumns],
  )
  const commissionGridTemplate = useMemo(
    () => visibleCommissionColumns.map((c) => COMMISSION_WIDTHS[c.id]).join(' '),
    [visibleCommissionColumns],
  )

  async function submitForm() {
    if (!form.agentId) { addToast(t('toasts.selectAgent'), 'error'); return }
    const grossCents = Math.round((parseFloat(form.gross) || 0) * 100)
    if (grossCents <= 0) { addToast(t('toasts.positiveGross'), 'error'); return }
    const splitPct = parseFloat(form.splitPct) || 100
    if (splitPct < 0 || splitPct > 100) { addToast(t('toasts.splitRange'), 'error'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/commissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: form.agentId,
          dealId: form.dealId || null,
          type: form.type,
          grossCents, splitPct,
          notes: form.notes,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? t('toasts.saveFailed'), 'error'); return }
      addToast(t('toasts.added'), 'success')
      setForm(emptyForm)
      setShowAdd(false)
      fetchRecords()
    } catch { addToast(t('toasts.networkError'), 'error') }
    finally { setSaving(false) }
  }

  async function changeStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/commissions/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { addToast(t('toasts.updateFailed'), 'error'); return }
      addToast(t('toasts.marked', { status }), 'success')
      fetchRecords()
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirms.delete'))) return
    try {
      const res = await fetch(`/api/commissions/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast(t('toasts.deleted'), 'success')
        fetchRecords()
      } else { addToast(t('toasts.deleteFailed'), 'error') }
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  // Fetch leaderboard
  useEffect(() => {
    // Bundle CK — fetchJson surfaces non-2xx as a typed error so a
    // 401 / 500 doesn't silently leave the leaderboard empty.
    fetchJson<{ data: LeaderboardEntry[] }>('/api/leaderboard')
      .then(j => setLeaderboard(j.data ?? []))
      .catch((err: unknown) => {
        addToast(err instanceof Error ? err.message : t('toasts.leaderboardLoadFailed'), 'error')
      })
  }, [addToast, t])

  useEntitySubscription('commissionRecord', fetchRecords)

  const totalNet = records.reduce((s, r) => s + r.netCents, 0)
  const pendingCount = records.filter(r => r.status === 'pending').length
  const lbTotalCommission = leaderboard.reduce((s, e) => s + e.ytdCommissionCents, 0)

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="dollar-sign" label={t('kpis.ytdGci')} value={fmt.currency(lbTotalCommission, { cents: true })} />
          <KpiCard icon="trending-up" label={t('kpis.totalNet')} value={fmt.currency(totalNet, { cents: true })} />
          <KpiCard icon="target" label={t('kpis.pendingPayouts')} value={String(pendingCount)} />
          <KpiCard icon="users" label={t('kpis.teamMembers')} value={String(leaderboard.length)} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {(['leaderboard', 'commissions'] as const).map(tabKey => (
            <button key={tabKey} onClick={() => setTab(tabKey)} style={{
              padding: '8px 18px', fontSize: 12, fontWeight: tab === tabKey ? 600 : 500,
              color: tab === tabKey ? 'var(--accent)' : 'var(--txt3)',
              background: 'none', border: 'none', borderBottom: tab === tabKey ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
            }}>{tabKey === 'leaderboard' ? t('tabs.leaderboard') : t('tabs.records')}</button>
          ))}
        </div>

        {tab === 'leaderboard' ? (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 80px 100px 100px 80px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
              <span>{t('leaderboard.hash')}</span><span>{t('leaderboard.agent')}</span><span>{t('leaderboard.deals')}</span><span>{t('leaderboard.won')}</span><span>{t('leaderboard.month')}</span><span>{t('leaderboard.volume')}</span><span>{t('leaderboard.ytdGci')}</span><span>{t('leaderboard.convPct')}</span>
            </div>
            {leaderboard.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>{t('leaderboard.empty')}</div>
            ) : leaderboard.map((entry, idx) => (
              <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 80px 100px 100px 80px', gap: 12, padding: '10px 16px', borderBottom: idx < leaderboard.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {idx < 3 ? (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: idx === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : idx === 1 ? 'linear-gradient(135deg, #9ca3af, #6b7280)' : 'linear-gradient(135deg, #b45309, #92400e)',
                      color: '#fff', fontSize: 10, fontWeight: 700,
                    }}>
                      <Trophy size={11} />
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt3)' }}>{idx + 1}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--g) 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff',
                  }}>{entry.name?.slice(0, 2).toUpperCase() ?? '??'}</div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{entry.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', textTransform: 'capitalize' }}>{entry.role}</div>
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 500 }}>{entry.totalDeals}</span>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 600, color: 'var(--g-txt)' }}>{entry.wonDeals}</span>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 500 }}>{entry.monthDeals}</span>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 600 }}>{fmt.currency(entry.totalVolumeCents, { cents: true })}</span>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 700, color: 'var(--accent)' }}>{fmt.currency(entry.ytdCommissionCents, { cents: true })}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${entry.conversionRate}%`, borderRadius: 2, background: entry.conversionRate >= 50 ? 'var(--g)' : entry.conversionRate >= 25 ? 'var(--y)' : 'var(--r)', transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace", minWidth: 28, textAlign: 'right' }}>{entry.conversionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Commission Records */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
                options={[{ value: '', label: t('filters.all') }, { value: 'pending', label: t('filters.pending') }, { value: 'paid', label: t('filters.paid') }, { value: 'voided', label: t('filters.voided') }]} />
              <div style={{ flex: 1 }} />
              <ColumnPicker
                columns={localizedColumns}
                visible={commissionColumns.visible}
                onToggle={commissionColumns.toggle}
                onReset={commissionColumns.reset}
                isOverridden={commissionColumns.isOverridden}
              />
              <button onClick={() => setShowAdd(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff',
                border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
              }}>
                <Plus size={13} /> {t('addCommission')}
              </button>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: commissionGridTemplate, gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
                {visibleCommissionColumns.map((c) => <span key={c.id}>{c.label}</span>)}
              </div>
              {recordsQuery.error ? (
                <div style={{ padding: 16 }}><ListError onRetry={fetchRecords} message={recordsQuery.error} /></div>
              ) : loading ? (
                <div style={{ padding: 16 }}><ListLoading /></div>
              ) : records.length === 0 ? (
                <div style={{ padding: 16 }}><ListEmpty /></div>
              ) : records.map((rec, idx) => (
                <div key={rec.id} style={{ display: 'grid', gridTemplateColumns: commissionGridTemplate, gap: 12, padding: '10px 16px', borderBottom: idx < records.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
                  {visibleCommissionColumns.map((c) => {
                    if (c.id === 'type') return (
                      <div key="type">
                        <div style={{ fontWeight: 600, color: 'var(--txt)', textTransform: 'capitalize' }}>{rec.type}</div>
                        <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{rec.notes || fmt.date(rec.createdAt)}</div>
                      </div>
                    )
                    if (c.id === 'gross') return (
                      <span key="gross" style={{ fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace" }}>{fmt.currency(rec.grossCents, { cents: true })}</span>
                    )
                    if (c.id === 'split') return (
                      <span key="split" style={{ fontFamily: "var(--font-red-hat-mono), monospace" }}>{rec.splitPct}%</span>
                    )
                    if (c.id === 'net') return (
                      <span key="net" style={{ fontWeight: 700, fontFamily: "var(--font-red-hat-mono), monospace", color: 'var(--g-txt)' }}>{fmt.currency(rec.netCents, { cents: true })}</span>
                    )
                    if (c.id === 'status') return (
                      <span key="status" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: STATUS_COLORS[rec.status]?.bg ?? 'var(--bg2)', color: STATUS_COLORS[rec.status]?.txt ?? 'var(--txt2)', justifySelf: 'start' }}>{rec.status}</span>
                    )
                    if (c.id === 'actions') return (
                      <div key="actions" style={{ display: 'flex', gap: 4 }}>
                        {rec.status === 'pending' && (
                          <>
                            <button onClick={() => changeStatus(rec.id, 'paid')} title={t('actions.markPaid')} style={miniBtn('var(--g-txt)')}>
                              <CheckCircle2 size={11} />
                            </button>
                            <button onClick={() => changeStatus(rec.id, 'voided')} title={t('actions.void')} style={miniBtn('var(--txt3)')}>
                              <XCircle size={11} />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(rec.id)} title={t('actions.delete')} style={miniBtn('var(--r-txt)')}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )
                    return <span key={c.id} />
                  })}
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal
        open={showAdd}
        onClose={() => { if (!saving) setShowAdd(false) }}
        title={t('modal.title')}
        subtitle={t('modal.subtitle')}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label={t('modal.agent')}>
              <select value={form.agentId} onChange={e => setForm({ ...form, agentId: e.target.value })} style={inputStyle}>
                <option value="">{t('modal.selectAgent')}</option>
                {leaderboard.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormField>
            <FormField label={t('modal.type')}>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                <option value="closing">{t('modal.typeClosing')}</option>
                <option value="referral">{t('modal.typeReferral')}</option>
                <option value="rental">{t('modal.typeRental')}</option>
                <option value="bonus">{t('modal.typeBonus')}</option>
                <option value="other">{t('modal.typeOther')}</option>
              </select>
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <FormField label={t('modal.grossAmount')}>
              <input type="number" min="0" step="100" value={form.gross} onChange={e => setForm({ ...form, gross: e.target.value })} placeholder="15000" style={inputStyle} />
            </FormField>
            <FormField label={t('modal.splitPct')}>
              <input type="number" min="0" max="100" value={form.splitPct} onChange={e => setForm({ ...form, splitPct: e.target.value })} style={inputStyle} />
            </FormField>
          </div>
          <FormField label={t('modal.dealId')}>
            <input value={form.dealId} onChange={e => setForm({ ...form, dealId: e.target.value })} placeholder={t('modal.dealIdPlaceholder')} style={inputStyle} />
          </FormField>
          <FormField label={t('modal.notes')}>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>

          {form.gross && form.splitPct && (
            <div style={{
              padding: 10, borderRadius: 8, background: 'var(--bg2)',
              fontSize: 12, color: 'var(--txt2)', textAlign: 'center',
            }}>
              {t('modal.netPayout', { amount: fmt.number(Math.round((parseFloat(form.gross) || 0) * (parseFloat(form.splitPct) || 100) / 100)) })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button onClick={() => setShowAdd(false)} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{t('modal.cancel')}</button>
            <button onClick={submitForm} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}>{saving ? t('modal.saving') : t('modal.submit')}</button>
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

function miniBtn(color: string): React.CSSProperties {
  return {
    width: 24, height: 24, borderRadius: 6,
    background: 'transparent', border: '1px solid var(--border)',
    color, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
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
