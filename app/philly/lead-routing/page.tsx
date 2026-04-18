'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Play, Pause, X, Users, Zap, Trash2 } from 'lucide-react'

interface LeadRoutingRule {
  id: string
  name: string
  strategy: string
  criteria: string
  agentPool: string
  enabled: boolean
  createdAt: string
}

const STRATEGY_LABELS: Record<string, string> = {
  round_robin: 'Round Robin',
  weighted: 'Weighted',
  geographic: 'Geographic',
  skill_based: 'Skill Based',
}

const STRATEGY_COLORS: Record<string, { bg: string; txt: string }> = {
  round_robin: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  weighted: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)' },
  geographic: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  skill_based: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
}

const STRATEGY_OPTIONS = Object.entries(STRATEGY_LABELS)

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
  outline: 'none',
}

function parseAgentPool(pool: string): string[] {
  try { return JSON.parse(pool) } catch { return [] }
}

export default function LeadRoutingPage() {
  const [rules, setRules] = useState<LeadRoutingRule[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addStrategy, setAddStrategy] = useState(STRATEGY_OPTIONS[0][0])
  const [addEnabled, setAddEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const t = useTranslations('leadRouting')

  const closeAddModal = () => {
    setShowAdd(false)
    setAddError(null)
  }

  const handleAddRule = async () => {
    if (saving) return
    if (!addName.trim()) {
      setAddError('Name is required')
      return
    }
    setSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/philly/api/lead-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          strategy: addStrategy,
          criteria: '{}',
          agentPool: '[]',
          enabled: addEnabled,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(json?.error ?? json?.message ?? `Failed (${res.status})`)
        return
      }
      setAddName(''); setAddStrategy(STRATEGY_OPTIONS[0][0]); setAddEnabled(true)
      setAddError(null)
      setShowAdd(false)
      fetchData()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      const res = await fetch(`/philly/api/lead-routing?${params}`)
      const json = await res.json()
      setRules(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setRules([]) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleEnabled = async (id: string, enabled: boolean) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !enabled } : r))
    try {
      await fetch('/philly/api/lead-routing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !enabled }),
      })
    } catch {
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r))
    }
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this routing rule?')) return
    try {
      const res = await fetch(`/philly/api/lead-routing?id=${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) fetchData()
    } catch {}
  }

  const activeRules = rules.filter(r => r.enabled)
  const strategiesUsed = new Set(rules.map(r => r.strategy)).size

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel="Rule" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="zap" label="Total Rules" value={String(total)} />
          <KpiCard icon="trending-up" label="Active" value={String(activeRules.length)} />
          <KpiCard icon="target" label="Strategies Used" value={String(strategiesUsed)} />
        </div>

        {/* Card List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : rules.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <Zap size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              No lead routing rules yet.
            </div>
          ) : rules.map(rule => {
            const agents = parseAgentPool(rule.agentPool)
            const stratStyle = STRATEGY_COLORS[rule.strategy] ?? { bg: 'var(--bg2)', txt: 'var(--txt3)' }

            return (
              <div key={rule.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--panel)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: rule.enabled ? 'var(--g-bg)' : 'var(--bg2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Zap size={16} style={{ color: rule.enabled ? 'var(--g-txt)' : 'var(--txt3)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{rule.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', gap: 8, marginTop: 2, alignItems: 'center' }}>
                    <span style={{
                      padding: '1px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                      background: stratStyle.bg, color: stratStyle.txt,
                    }}>{STRATEGY_LABELS[rule.strategy] ?? rule.strategy}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--txt3)' }}>
                      <Users size={9} /> {agents.length} agent{agents.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button onClick={() => toggleEnabled(rule.id, rule.enabled)} style={{
                  padding: '5px 10px', borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: rule.enabled ? 'var(--g-bg)' : 'var(--bg2)',
                  color: rule.enabled ? 'var(--g-txt)' : 'var(--txt3)',
                  fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {rule.enabled ? <><Pause size={10} /> Active</> : <><Play size={10} /> Paused</>}
                </button>
                <button onClick={() => deleteRule(rule.id)} title="Delete" style={{
                  width: 28, height: 28, borderRadius: 6,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--r-txt)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Trash2 size={11} />
                </button>
              </div>
            )
          })}
        </div>

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Add Rule Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }} onClick={closeAddModal}>
          <div
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-routing-add-title"
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px', width: 420, maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div id="lead-routing-add-title" style={{ fontSize: 16, fontWeight: 700 }}>Add Routing Rule</div>
              <button onClick={closeAddModal} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 2, display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>Create a new lead routing rule</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Name</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="e.g. East Side Leads" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Strategy</label>
                <select value={addStrategy} onChange={e => setAddStrategy(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {STRATEGY_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="lr-enabled-check" checked={addEnabled} onChange={e => setAddEnabled(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                <label htmlFor="lr-enabled-check" style={{ fontSize: 12, color: 'var(--txt2)', cursor: 'pointer' }}>Enabled</label>
              </div>
            </div>
            {addError && (
              <div role="alert" style={{
                padding: '8px 12px', borderRadius: 8, marginTop: 8,
                background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
              }}>{addError}</div>
            )}
            <button onClick={handleAddRule} disabled={saving} style={{
              width: '100%', marginTop: 18, padding: '10px 0',
              borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving...' : 'Add Rule'}</button>
          </div>
        </div>
      )}
    </>
  )
}
