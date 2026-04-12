'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { Filter, Trophy, TrendingUp } from 'lucide-react'

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

export default function CommissionsPage() {
  const [tab, setTab] = useState<'commissions' | 'leaderboard'>('leaderboard')
  const [records, setRecords] = useState<CommissionRecord[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

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

  const totalGross = records.reduce((s, r) => s + r.grossCents, 0)
  const totalNet = records.reduce((s, r) => s + r.netCents, 0)
  const pendingCount = records.filter(r => r.status === 'pending').length
  const lbTotalCommission = leaderboard.reduce((s, e) => s + e.ytdCommissionCents, 0)

  return (
    <>
      <Topbar title="Commissions" sub="Commission tracking and team leaderboard" />
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
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
                options={[{ value: '', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }, { value: 'voided', label: 'Voided' }]} />
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 100px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
                <span>Type / Notes</span><span>Gross</span><span>Split %</span><span>Net</span><span>Status</span>
              </div>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
              ) : records.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No commission records.</div>
              ) : records.map((rec, idx) => (
                <div key={rec.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 100px', gap: 12, padding: '10px 16px', borderBottom: idx < records.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--txt)', textTransform: 'capitalize' }}>{rec.type}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{rec.notes || new Date(rec.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span style={{ fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace" }}>${(rec.grossCents / 100).toLocaleString()}</span>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace" }}>{rec.splitPct}%</span>
                  <span style={{ fontWeight: 700, fontFamily: "var(--font-red-hat-mono), monospace", color: 'var(--g-txt)' }}>${(rec.netCents / 100).toLocaleString()}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: STATUS_COLORS[rec.status]?.bg ?? 'var(--bg2)', color: STATUS_COLORS[rec.status]?.txt ?? 'var(--txt2)', display: 'inline-block', maxWidth: 'fit-content' }}>{rec.status}</span>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
    </>
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
