'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { useApi } from '@/hooks/philly/useApi'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { Play, Pause, X, Clock, Zap, Trash2 } from 'lucide-react'

interface ScoringRule {
  id: string
  name: string
  event: string
  points: number
  decay: boolean
  decayDays: number
  enabled: boolean
  createdAt: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
  outline: 'none',
}

export default function ScoringRulesPage() {
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)

  const params = new URLSearchParams({ page: String(page), limit: '25' })
  interface RulesResponse { data: ScoringRule[]; pagination: { total: number; totalPages: number } }
  const rulesQuery = useApi<RulesResponse>(`/scoring-rules?${params}`)
  const rules = rulesQuery.data?.data ?? []
  const total = rulesQuery.data?.pagination.total ?? 0
  const totalPages = rulesQuery.data?.pagination.totalPages ?? 0
  const loading = rulesQuery.loading
  const fetchData = rulesQuery.refetch
  const [addName, setAddName] = useState('')
  const [addEvent, setAddEvent] = useState('')
  const [addPoints, setAddPoints] = useState('')
  const [addDecay, setAddDecay] = useState(false)
  const [addDecayDays, setAddDecayDays] = useState('30')
  const [addEnabled, setAddEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const t = useTranslations('scoringRules')
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()

  const closeAddModal = () => {
    setShowAdd(false)
    setAddError(null)
  }

  const handleAddRule = async () => {
    if (saving) return
    if (!addName.trim() || !addEvent.trim()) {
      setAddError(t('errors.nameEventRequired'))
      return
    }
    setSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/api/scoring-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          event: addEvent.trim(),
          points: Number(addPoints) || 0,
          decay: addDecay,
          decayDays: Number(addDecayDays) || 30,
          enabled: addEnabled,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(json?.error ?? json?.message ?? `Failed (${res.status})`)
        return
      }
      setAddName(''); setAddEvent(''); setAddPoints('')
      setAddDecay(false); setAddDecayDays('30'); setAddEnabled(true)
      setAddError(null)
      setShowAdd(false)
      fetchData()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : t('errors.networkError'))
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/scoring-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !enabled }),
      })
      if (res.ok) fetchData()
    } catch { /* swallow — SWR refetch on focus will recover */ }
  }

  const deleteRule = async (id: string) => {
    const ok = await confirm({
      title: tConfirms('deleteGeneric.title', { entityType: tConfirms('entities.scoringRule') }),
      body: tConfirms('deleteGeneric.body'),
      confirmLabel: tCommon('delete'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/scoring-rules?id=${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        fetchData()
      }
    } catch {}
  }

  const activeRules = rules.filter(r => r.enabled)
  const totalPointsPossible = activeRules.reduce((s, r) => s + r.points, 0)

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel={t('addLabel')} />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="zap" label={t('kpis.total')} value={String(total)} />
          <KpiCard icon="trending-up" label={t('kpis.active')} value={String(activeRules.length)} />
          <KpiCard icon="target" label={t('kpis.totalPoints')} value={String(totalPointsPossible)} />
        </div>

        {/* Card List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>{t('list.loading')}</div>
          ) : rules.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <Zap size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              {t('list.empty')}
            </div>
          ) : rules.map(rule => (
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
                    background: 'var(--accent-bg)', color: 'var(--accent-txt)',
                  }}>{rule.event}</span>
                  {rule.decay && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--txt3)' }}>
                      <Clock size={9} /> {t('list.decaysIn', { days: rule.decayDays })}
                    </span>
                  )}
                </div>
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700, color: 'var(--g-txt)',
                fontFamily: "var(--font-red-hat-mono), monospace",
              }}>+{rule.points}</div>
              <button onClick={() => toggleEnabled(rule.id, rule.enabled)} style={{
                padding: '5px 10px', borderRadius: 6,
                border: '1px solid var(--border)',
                background: rule.enabled ? 'var(--g-bg)' : 'var(--bg2)',
                color: rule.enabled ? 'var(--g-txt)' : 'var(--txt3)',
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {rule.enabled ? <><Pause size={10} /> {t('list.active')}</> : <><Play size={10} /> {t('list.paused')}</>}
              </button>
              <button onClick={() => deleteRule(rule.id)} title={t('list.delete')} style={{
                width: 28, height: 28, borderRadius: 6,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--r-txt)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}
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
            aria-labelledby="scoring-rule-add-title"
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px', width: 420, maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div id="scoring-rule-add-title" style={{ fontSize: 16, fontWeight: 700 }}>{t('modal.title')}</div>
              <button onClick={closeAddModal} aria-label={t('modal.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 2, display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>{t('modal.subtitle')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('modal.name')}</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder={t('modal.namePlaceholder')} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('modal.event')}</label>
                <input value={addEvent} onChange={e => setAddEvent(e.target.value)} placeholder={t('modal.eventPlaceholder')} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('modal.points')}</label>
                <input type="number" value={addPoints} onChange={e => setAddPoints(e.target.value)} placeholder="10" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="decay-check" checked={addDecay} onChange={e => setAddDecay(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                <label htmlFor="decay-check" style={{ fontSize: 12, color: 'var(--txt2)', cursor: 'pointer' }}>{t('modal.enableDecay')}</label>
              </div>
              {addDecay && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('modal.decayDays')}</label>
                  <input type="number" value={addDecayDays} onChange={e => setAddDecayDays(e.target.value)} placeholder="30" style={inputStyle} />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="enabled-check" checked={addEnabled} onChange={e => setAddEnabled(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                <label htmlFor="enabled-check" style={{ fontSize: 12, color: 'var(--txt2)', cursor: 'pointer' }}>{t('modal.enabled')}</label>
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
            }}>{saving ? t('modal.saving') : t('modal.submit')}</button>
          </div>
        </div>
      )}
    </>
  )
}
