'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { Filter, Trophy, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { Modal, FormField } from '@/components/ui/Modal'
import { useEntitySubscription } from '@/hooks/useRealtime'
import { useToast } from '@/hooks/useToast'

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
  const [records, setRecords] = useState<CommissionRecord[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const t = useTranslations('commissions')
  const { addToast } = useToast()

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function submitForm() {
    if (!form.agentId) { addToast('Select an agent', 'error'); return }
    const grossCents = Math.round((parseFloat(form.gross) || 0) * 100)
    if (grossCents <= 0) { addToast('Enter a positive gross amount', 'error'); return }
    const splitPct = parseFloat(form.splitPct) || 100
    if (splitPct < 0 || splitPct > 100) { addToast('Split must be 0-100', 'error'); return }

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
      if (!res.ok) { addToast(j.error ?? 'Save failed', 'error'); return }
      addToast('Commission added', 'success')
      setForm(emptyForm)
      setShowAdd(false)
      fetchRecords()
    } catch { addToast('Network error', 'error') }
    finally { setSaving(false) }
  }

  async function changeStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/commissions/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { addToast('Update failed', 'error'); return }
      addToast(`Marked ${status}`, 'success')
      fetchRecords()
    } catch { addToast('Network error', 'error') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this commission record?')) return
    try {
      const res = await fetch(`/api/commissions/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast('Commission deleted', 'success')
        fetchRecords()
      } else { addToast('Delete failed', 'error') }
    } catch { addToast('Network error', 'error') }
  }

  // Fetch leaderboard
  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(j => setLeaderboard(j.data ?? [])).catch(() => {})
  }, [])

  // Fetch commission records
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/commissions?${params}`)
      const json = await res.json()
      setRecords(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setRecords([]) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  useEntitySubscription('commissionRecord', fetchRecords)

  const totalNet = records.reduce((s, r) => s + r.netCents, 0)
  const pendingCount = records.filter(r => r.status === 'pending').length
  const lbTotalCommission = leaderboard.reduce((s, e) => s + e.ytdCommissionCents, 0)

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="dollar-sign" label="YTD Team GCI" value={`$${(lbTotalCommission / 100).toLocaleString()}`} />
          <KpiCard icon="trending-up" label="Total Net" value={`$${(totalNet / 100).toLocaleString()}`} />
          <KpiCard icon="target" label="Pending Payouts" value={String(pendingCount)} />
          <KpiCard icon="users" label="Team Members" value={String(leaderboard.length)} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {(['leaderboard', 'commissions'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 18px', fontSize: 12, fontWeight: tab === t ? 600 : 500,
              color: tab === t ? 'var(--accent)' : 'var(--txt3)',
              background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
            }}>{t === 'leaderboard' ? 'Team Leaderboard' : 'Commission Records'}</button>
          ))}
        </div>

        {tab === 'leaderboard' ? (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 80px 100px 100px 80px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
              <span>#</span><span>Agent</span><span>Deals</span><span>Won</span><span>Month</span><span>Volume</span><span>YTD GCI</span><span>Conv %</span>
            </div>
            {leaderboard.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No team data yet.</div>
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
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 600 }}>${(entry.totalVolumeCents / 100).toLocaleString()}</span>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 700, color: 'var(--accent)' }}>${(entry.ytdCommissionCents / 100).toLocaleString()}</span>
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
                options={[{ value: '', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }, { value: 'voided', label: 'Voided' }]} />
              <div style={{ flex: 1 }} />
              <button onClick={() => setShowAdd(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff',
                border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
              }}>
                <Plus size={13} /> Add Commission
              </button>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 90px 110px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
                <span>Type / Notes</span><span>Gross</span><span>Split %</span><span>Net</span><span>Status</span><span>Actions</span>
              </div>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
              ) : records.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No commission records. Click Add Commission.</div>
              ) : records.map((rec, idx) => (
                <div key={rec.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 90px 110px', gap: 12, padding: '10px 16px', borderBottom: idx < records.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--txt)', textTransform: 'capitalize' }}>{rec.type}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{rec.notes || new Date(rec.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span style={{ fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace" }}>${(rec.grossCents / 100).toLocaleString()}</span>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace" }}>{rec.splitPct}%</span>
                  <span style={{ fontWeight: 700, fontFamily: "var(--font-red-hat-mono), monospace", color: 'var(--g-txt)' }}>${(rec.netCents / 100).toLocaleString()}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: STATUS_COLORS[rec.status]?.bg ?? 'var(--bg2)', color: STATUS_COLORS[rec.status]?.txt ?? 'var(--txt2)', justifySelf: 'start' }}>{rec.status}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {rec.status === 'pending' && (
                      <>
                        <button onClick={() => changeStatus(rec.id, 'paid')} title="Mark paid" style={miniBtn('var(--g-txt)')}>
                          <CheckCircle2 size={11} />
                        </button>
                        <button onClick={() => changeStatus(rec.id, 'voided')} title="Void" style={miniBtn('var(--txt3)')}>
                          <XCircle size={11} />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleDelete(rec.id)} title="Delete" style={miniBtn('var(--r-txt)')}>
                      <Trash2 size={11} />
                    </button>
                  </div>
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
        title="Add Commission"
        subtitle="Record a commission payout"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Agent">
              <select value={form.agentId} onChange={e => setForm({ ...form, agentId: e.target.value })} style={inputStyle}>
                <option value="">Select agent…</option>
                {leaderboard.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormField>
            <FormField label="Type">
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                <option value="closing">Closing</option>
                <option value="referral">Referral</option>
                <option value="rental">Rental</option>
                <option value="bonus">Bonus</option>
                <option value="other">Other</option>
              </select>
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <FormField label="Gross Amount ($)">
              <input type="number" min="0" step="100" value={form.gross} onChange={e => setForm({ ...form, gross: e.target.value })} placeholder="15000" style={inputStyle} />
            </FormField>
            <FormField label="Split %">
              <input type="number" min="0" max="100" value={form.splitPct} onChange={e => setForm({ ...form, splitPct: e.target.value })} style={inputStyle} />
            </FormField>
          </div>
          <FormField label="Deal ID (optional)">
            <input value={form.dealId} onChange={e => setForm({ ...form, dealId: e.target.value })} placeholder="Link to a deal" style={inputStyle} />
          </FormField>
          <FormField label="Notes (optional)">
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>

          {form.gross && form.splitPct && (
            <div style={{
              padding: 10, borderRadius: 8, background: 'var(--bg2)',
              fontSize: 12, color: 'var(--txt2)', textAlign: 'center',
            }}>
              Net payout: <strong className="mono" style={{ color: 'var(--g-txt)' }}>
                ${Math.round((parseFloat(form.gross) || 0) * (parseFloat(form.splitPct) || 100) / 100).toLocaleString()}
              </strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button onClick={() => setShowAdd(false)} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancel</button>
            <button onClick={submitForm} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Saving…' : 'Add Commission'}</button>
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
