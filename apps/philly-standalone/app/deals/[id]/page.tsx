'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/philly/layout/Topbar'
import Link from 'next/link'
import {
  ArrowLeft, Calendar, DollarSign, Percent, User, Layers, Briefcase,
  Clock, Edit2, Check, X, Trash2, Trophy, XCircle, RotateCcw, FileText,
} from 'lucide-react'
import { useToast } from '@/hooks/philly/useToast'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { useFormat } from '@/hooks/philly/useFormat'

interface Deal {
  id: string
  title: string
  valueCents: number
  probability: number
  status: string
  dealType: string
  expectedClose: string | null
  actualClose: string | null
  createdAt: string
  updatedAt: string
  notes: string
  commissionPct: number
  commissionCents: number
  brokerSplitPct: number
  stage: { id: string; name: string; color: string }
  contact: { id: string; name: string } | null
  owner: { id: string; name: string } | null
  pipeline: { id: string; name: string } | null
  project: { id: string; title: string } | null
}

interface Stage { id: string; name: string; color: string; position: number }
interface Pipeline { id: string; name: string; stages: Stage[] }

const STATUS_COLORS: Record<string, { bg: string; txt: string; border: string }> = {
  open: { bg: 'var(--b-bg)', txt: 'var(--b-txt)', border: 'var(--b-border)' },
  won: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  lost: { bg: 'var(--r-bg)', txt: 'var(--r-txt)', border: 'var(--r-border)' },
}

function toInputDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('deals')
  const td = useTranslations('dealDetail')
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()
  const router = useRouter()
  const { addToast } = useToast()
  // LOC-03 — locale-bound money/date, replacing the old $-hardcoded / en-US helpers.
  const fmt = useFormat()
  const fmtDate = (date: string | null) => (date ? fmt.date(date) : '--')

  const [deal, setDeal] = useState<Deal | null>(null)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Inline edit field state
  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const fetchDeal = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${id}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? td('toasts.notFound')); return }
      setDeal(json.data ?? null)
    } catch { setError(td('toasts.loadFailed')) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => {
    fetchDeal()
  }, [fetchDeal])

  // Pipelines list is org-scoped and changes rarely — fetch once on
  // mount, not on every fetchDeal change. Previously this lived inside
  // the [fetchDeal] effect and re-ran whenever `id` changed, churning
  // the pipelines call needlessly.
  useEffect(() => {
    fetch('/api/pipelines')
      .then((r) => r.json())
      .then((j) => setPipelines(j.data ?? []))
      .catch(() => {})
  }, [])

  useEntitySubscription('deal', (evt) => {
    if (evt.entityId === id) fetchDeal()
  })

  // ---- Save helper ----
  async function patchDeal(patch: Record<string, unknown>, successMsg?: string) {
    if (!deal) return
    setSaving(true)
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) {
        addToast(json.error ?? td('toasts.updateFailed'), "error")
        return
      }
      setDeal(json.data)
      if (successMsg) addToast(successMsg, "success")
      setEditField(null)
    } catch {
      addToast(td('toasts.networkError'), "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: tConfirms('deleteGeneric.title', { entityType: tConfirms('entities.deal') }),
      body: tConfirms('deleteGeneric.body'),
      confirmLabel: tCommon('delete'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    const res = await fetch(`/api/deals/${id}`, { method: 'DELETE' })
    if (res.status === 204 || res.ok) {
      addToast(td('toasts.deleted'), "success")
      router.push('/deals')
    } else {
      const j = await res.json().catch(() => ({}))
      addToast(j.error ?? td('toasts.deleteFailed'), "error")
    }
  }

  async function markWon() {
    await patchDeal({ status: 'won', probability: 100, actualClose: new Date().toISOString() }, td('toasts.markedWon'))
  }
  async function markLost() {
    await patchDeal({ status: 'lost', actualClose: new Date().toISOString() }, td('toasts.markedLost'))
  }
  async function reopenDeal() {
    await patchDeal({ status: 'open', actualClose: null }, td('toasts.reopened'))
  }
  async function changeStage(stageId: string) {
    await patchDeal({ stageId }, td('toasts.stageUpdated'))
  }

  const sc = STATUS_COLORS[deal?.status ?? ''] ?? STATUS_COLORS.open
  const pipelineStages = pipelines.find(p => p.id === deal?.pipeline?.id)?.stages ?? []

  function startEdit(field: string, currentValue: string | number | null | undefined) {
    setEditField(field)
    setEditValue(currentValue == null ? '' : String(currentValue))
  }
  function cancelEdit() { setEditField(null); setEditValue('') }

  async function saveEdit() {
    if (!deal || !editField) return
    const patch: Record<string, unknown> = {}
    switch (editField) {
      case 'title':
        if (!editValue.trim()) { addToast(td('toasts.titleRequired'), "error"); return }
        patch.title = editValue.trim()
        break
      case 'valueCents': {
        const n = Math.round(parseFloat(editValue) * 100)
        if (!isFinite(n) || n < 0) { addToast(td('toasts.invalidValue'), "error"); return }
        patch.valueCents = n
        break
      }
      case 'probability': {
        const n = parseInt(editValue, 10)
        if (isNaN(n) || n < 0 || n > 100) { addToast(td('toasts.rangeZeroToHundred'), "error"); return }
        patch.probability = n
        break
      }
      case 'expectedClose':
        patch.expectedClose = editValue || null
        break
      case 'dealType':
        patch.dealType = editValue
        break
      case 'commissionPct': {
        const n = parseFloat(editValue)
        if (isNaN(n) || n < 0 || n > 100) { addToast(td('toasts.rangeZeroToHundred'), "error"); return }
        patch.commissionPct = n
        break
      }
      case 'brokerSplitPct': {
        const n = parseFloat(editValue)
        if (isNaN(n) || n < 0 || n > 100) { addToast(td('toasts.rangeZeroToHundred'), "error"); return }
        patch.brokerSplitPct = n
        break
      }
      case 'notes':
        patch.notes = editValue
        break
    }
    await patchDeal(patch, td('toasts.saved'))
  }

  return (
    <>
      <Topbar
        title={deal?.title ?? td('titleFallback')}
        sub={deal?.pipeline?.name ?? ''}
      />
      <div style={{ padding: '18px 24px 40px' }}>

        {/* Back link */}
        <Link href="/deals" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, color: 'var(--accent)',
          textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={14} />
          {td('backToDeals')}
        </Link>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>{td('common.loading')}</div>
        ) : error ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--r-txt)', fontSize: 13 }}>{error}</div>
        ) : deal ? (
          <>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              marginBottom: 20, flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editField === 'title' ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                      aria-label="Title"
                      style={{
                        flex: 1, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em',
                        padding: '4px 10px', borderRadius: 8,
                        border: '1px solid var(--accent)', background: 'var(--panel)',
                        color: 'var(--txt)', fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    <IconBtn onClick={saveEdit} variant="accent"><Check size={14} /></IconBtn>
                    <IconBtn onClick={cancelEdit}><X size={14} /></IconBtn>
                  </div>
                ) : (
                  <h1
                    onClick={() => startEdit('title', deal.title)}
                    style={{
                      fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em',
                      color: 'var(--txt)', cursor: 'pointer', display: 'inline-block',
                    }}
                    title={td('hints.clickToEdit')}
                  >
                    {deal.title}
                  </h1>
                )}
                <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>
                  {deal.pipeline?.name ?? td('noPipeline')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Status badge */}
                <span style={{
                  padding: '4px 12px', borderRadius: 8,
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  background: sc.bg, color: sc.txt,
                  border: `1px solid ${sc.border}`,
                }}>
                  {deal.status}
                </span>
                {/* Stage picker */}
                {pipelineStages.length > 0 ? (
                  <select
                    value={deal.stage.id}
                    onChange={e => changeStage(e.target.value)}
                    disabled={saving}
                    aria-label="Stage"
                    style={{
                      padding: '4px 12px', borderRadius: 8,
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      background: deal.stage.color + '18',
                      color: deal.stage.color,
                      border: `1px solid ${deal.stage.color}44`,
                      fontFamily: 'inherit', outline: 'none',
                    }}
                  >
                    {pipelineStages.map(s => (
                      <option key={s.id} value={s.id} style={{ background: 'var(--panel)', color: 'var(--txt)' }}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{
                    padding: '4px 12px', borderRadius: 8,
                    fontSize: 11, fontWeight: 700,
                    background: deal.stage.color + '18',
                    color: deal.stage.color,
                    border: `1px solid ${deal.stage.color}44`,
                  }}>
                    {deal.stage.name}
                  </span>
                )}
              </div>
            </div>

            {/* Quick action bar */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap',
              padding: '10px 14px', borderRadius: 12,
              background: 'var(--bg2)', border: '1px solid var(--border)',
            }}>
              {deal.status !== 'won' && (
                <ActionBtn onClick={markWon} color="var(--g)" icon={Trophy}>{td('actions.markWon')}</ActionBtn>
              )}
              {deal.status !== 'lost' && (
                <ActionBtn onClick={markLost} color="var(--r)" icon={XCircle}>{td('actions.markLost')}</ActionBtn>
              )}
              {deal.status !== 'open' && (
                <ActionBtn onClick={reopenDeal} color="var(--accent)" icon={RotateCcw}>{td('actions.reopen')}</ActionBtn>
              )}
              <div style={{ flex: 1 }} />
              <ActionBtn onClick={handleDelete} color="var(--r)" icon={Trash2} variant="ghost">{td('actions.delete')}</ActionBtn>
            </div>

            {/* 2-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18, alignItems: 'start' }}>

              {/* Left column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Deal Info card */}
                <div style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--txt)' }}>{td('sections.dealInfo')}</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
                    {/* Value — editable */}
                    <InfoRow icon={DollarSign} label={t('value')}>
                      {editField === 'valueCents' ? (
                        <EditField
                          value={editValue}
                          type="number"
                          step="0.01"
                          ariaLabel={t('value')}
                          onChange={setEditValue}
                          onSave={saveEdit}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit('valueCents', (deal.valueCents / 100).toString())}
                          style={{
                            fontSize: 20, fontWeight: 700,
                            fontFamily: 'var(--font-red-hat-mono), monospace',
                            color: 'var(--txt)', cursor: 'pointer',
                          }}
                          title={td('hints.clickToEdit')}
                        >
                          {fmt.currency(deal.valueCents, { cents: true })}
                        </span>
                      )}
                    </InfoRow>

                    {/* Probability — editable */}
                    <InfoRow icon={Percent} label={t('probability')}>
                      {editField === 'probability' ? (
                        <EditField
                          value={editValue}
                          type="number"
                          min="0" max="100"
                          ariaLabel={t('probability')}
                          onChange={setEditValue}
                          onSave={saveEdit}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit('probability', deal.probability)}
                          style={{
                            fontSize: 20, fontWeight: 700,
                            fontFamily: 'var(--font-red-hat-mono), monospace',
                            color: 'var(--txt)', cursor: 'pointer',
                          }}
                          title={td('hints.clickToEdit')}
                        >
                          {deal.probability}%
                        </span>
                      )}
                    </InfoRow>

                    {/* Expected Close — editable */}
                    <InfoRow icon={Calendar} label={td('fields.expectedClose')}>
                      {editField === 'expectedClose' ? (
                        <EditField
                          value={editValue}
                          type="date"
                          ariaLabel={td('fields.expectedClose')}
                          onChange={setEditValue}
                          onSave={saveEdit}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit('expectedClose', toInputDate(deal.expectedClose))}
                          style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', cursor: 'pointer' }}
                          title={td('hints.clickToEdit')}
                        >
                          {fmtDate(deal.expectedClose)}
                        </span>
                      )}
                    </InfoRow>

                    {/* Deal Type — editable */}
                    <InfoRow icon={Briefcase} label={td('fields.dealType')}>
                      {editField === 'dealType' ? (
                        <select
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                          aria-label={td('fields.dealType')}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px',
                            borderRadius: 6, border: '1px solid var(--accent)',
                            background: 'var(--panel)', color: 'var(--txt)',
                            fontFamily: 'inherit', outline: 'none',
                          }}
                        >
                          <option value="standard">{td('dealTypes.standard')}</option>
                          <option value="sale">{td('dealTypes.sale')}</option>
                          <option value="rental">{td('dealTypes.rental')}</option>
                          <option value="grant">{td('dealTypes.grant')}</option>
                          <option value="reservation">{td('dealTypes.reservation')}</option>
                          <option value="other">{td('dealTypes.other')}</option>
                        </select>
                      ) : (
                        <span
                          onClick={() => startEdit('dealType', deal.dealType)}
                          style={{
                            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                            padding: '2px 8px', borderRadius: 6,
                            background: 'var(--bg2)', color: 'var(--txt2)',
                            cursor: 'pointer',
                          }}
                          title={td('hints.clickToEdit')}
                        >
                          {deal.dealType}
                        </span>
                      )}
                    </InfoRow>

                    {/* Stage (read-only here, edit via header selector) */}
                    <InfoRow icon={Layers} label={t('stage')}>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 6,
                        background: deal.stage.color + '18',
                        color: deal.stage.color,
                      }}>
                        {deal.stage.name}
                      </span>
                    </InfoRow>

                    {/* Pipeline */}
                    <InfoRow icon={Layers} label={td('fields.pipeline')}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                        {deal.pipeline?.name ?? '--'}
                      </span>
                    </InfoRow>

                    {/* Created */}
                    <InfoRow icon={Clock} label={td('fields.created')}>
                      <span style={{ fontSize: 13, color: 'var(--txt2)' }}>
                        {fmtDate(deal.createdAt)}
                      </span>
                    </InfoRow>

                    {/* Actual Close */}
                    <InfoRow icon={Calendar} label={td('fields.actualClose')}>
                      <span style={{ fontSize: 13, color: 'var(--txt2)' }}>
                        {fmtDate(deal.actualClose)}
                      </span>
                    </InfoRow>
                  </div>
                </div>

                {/* Probability progress bar */}
                <div style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{td('sections.probability')}</span>
                    <span style={{
                      fontSize: 16, fontWeight: 700,
                      fontFamily: 'var(--font-red-hat-mono), monospace',
                      color: deal.probability >= 70 ? 'var(--g-txt)' : deal.probability >= 40 ? 'var(--y-txt)' : 'var(--r-txt)',
                    }}>
                      {deal.probability}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%', height: 10, borderRadius: 6,
                    background: 'var(--bg2)', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${deal.probability}%`, height: '100%', borderRadius: 6,
                      background: deal.probability >= 70
                        ? 'var(--g)'
                        : deal.probability >= 40
                          ? 'var(--y)'
                          : 'var(--r)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                {/* Commission info */}
                <div style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--txt)' }}>{td('sections.commission')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 4 }}>{td('fields.rate')}</div>
                      {editField === 'commissionPct' ? (
                        <EditField value={editValue} type="number" step="0.1" min="0" max="100" ariaLabel={td('fields.rate')} onChange={setEditValue} onSave={saveEdit} onCancel={cancelEdit} />
                      ) : (
                        <div
                          onClick={() => startEdit('commissionPct', deal.commissionPct)}
                          style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-red-hat-mono), monospace', color: 'var(--txt)', cursor: 'pointer' }}
                          title={td('hints.clickToEdit')}
                        >
                          {deal.commissionPct}%
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 4 }}>{td('fields.amount')}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-red-hat-mono), monospace', color: 'var(--txt)' }}>
                        {fmt.currency(deal.commissionCents, { cents: true })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 4 }}>{td('fields.brokerSplit')}</div>
                      {editField === 'brokerSplitPct' ? (
                        <EditField value={editValue} type="number" step="0.1" min="0" max="100" ariaLabel={td('fields.brokerSplit')} onChange={setEditValue} onSave={saveEdit} onCancel={cancelEdit} />
                      ) : (
                        <div
                          onClick={() => startEdit('brokerSplitPct', deal.brokerSplitPct)}
                          style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-red-hat-mono), monospace', color: 'var(--txt)', cursor: 'pointer' }}
                          title={td('hints.clickToEdit')}
                        >
                          {deal.brokerSplitPct}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>
                      <FileText size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                      {td('sections.notes')}
                    </span>
                    {editField !== 'notes' && (
                      <button
                        onClick={() => startEdit('notes', deal.notes)}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'var(--accent)', fontSize: 11, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <Edit2 size={11} /> {td('actions.edit')}
                      </button>
                    )}
                  </div>
                  {editField === 'notes' ? (
                    <div>
                      <textarea
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
                        rows={6}
                        aria-label={td('sections.notes')}
                        style={{
                          width: '100%', resize: 'vertical',
                          padding: '10px 12px', borderRadius: 10,
                          border: '1px solid var(--accent)', background: 'var(--panel)',
                          color: 'var(--txt)', fontSize: 13, lineHeight: 1.6,
                          fontFamily: 'inherit', outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                        <button onClick={cancelEdit} style={ghostBtnStyle}>{td('actions.cancel')}</button>
                        <button onClick={saveEdit} disabled={saving} style={primaryBtnStyle}>
                          {saving ? td('actions.saving') : td('actions.saveNotes')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: 13, lineHeight: 1.65, color: 'var(--txt2)',
                      whiteSpace: 'pre-wrap', minHeight: 60,
                    }}>
                      {deal.notes?.trim() || td('empty.noNotes')}
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Contact card */}
                <SideCard title={td('sideCards.contact')}>
                  {deal.contact ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: 'var(--accent-bg)', color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700,
                      }}>
                        {deal.contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/contacts/${deal.contact.id}`} style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--accent)',
                          textDecoration: 'none',
                        }}>
                          {deal.contact.name}
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--txt3)' }}>{td('empty.noContact')}</div>
                  )}
                </SideCard>

                {/* Owner card */}
                <SideCard title={td('sideCards.owner')}>
                  {deal.owner ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: 'var(--bg2)', color: 'var(--txt2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700,
                        border: '1px solid var(--border)',
                      }}>
                        <User size={15} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                        {deal.owner.name}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--txt3)' }}>{td('empty.unassigned')}</div>
                  )}
                </SideCard>

                {/* Project card */}
                {deal.project && (
                  <SideCard title={td('sideCards.project')}>
                    <Link href={`/projects/${deal.project.id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      textDecoration: 'none',
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: 'var(--accent-bg)', color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Briefcase size={15} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--accent)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {deal.project.title}
                        </div>
                      </div>
                    </Link>
                  </SideCard>
                )}

                {/* Stage info */}
                <SideCard title={td('sideCards.stage')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: 4,
                      background: deal.stage.color,
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                      {deal.stage.name}
                    </span>
                  </div>
                </SideCard>

                {/* Weighted value */}
                <SideCard title={td('sideCards.weightedValue')}>
                  <div style={{
                    fontSize: 18, fontWeight: 700,
                    fontFamily: 'var(--font-red-hat-mono), monospace',
                    color: 'var(--accent)',
                  }}>
                    {fmt.currency((deal.valueCents * deal.probability) / 10000)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 4 }}>
                    {t('value')} x {t('probability')}
                  </div>
                </SideCard>

                {/* Days in pipeline */}
                <SideCard title={td('sideCards.pipelineAge')}>
                  <div style={{
                    fontSize: 18, fontWeight: 700,
                    fontFamily: 'var(--font-red-hat-mono), monospace',
                    color: 'var(--txt)',
                  }}>
                    {Math.max(1, Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / 86400000))}
                    <span style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 500, marginLeft: 4 }}>{td('units.days')}</span>
                  </div>
                </SideCard>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------
   Shared layout helpers
   ------------------------------------------------------------------ */

function InfoRow({ icon: Icon, label, children }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <Icon size={12} style={{ color: 'var(--txt3)' }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--txt3)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function IconBtn({ children, onClick, variant }: { children: React.ReactNode; onClick: () => void; variant?: 'accent' }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: variant === 'accent' ? 'none' : '1px solid var(--border)',
        background: variant === 'accent' ? 'var(--accent)' : 'var(--panel)',
        color: variant === 'accent' ? '#fff' : 'var(--txt2)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function ActionBtn({
  children, onClick, color, icon: Icon, variant,
}: {
  children: React.ReactNode
  onClick: () => void
  color: string
  icon: React.ComponentType<{ size?: number }>
  variant?: 'ghost'
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 12px', borderRadius: 10,
        border: variant === 'ghost' ? '1px solid var(--border)' : 'none',
        background: variant === 'ghost' ? 'transparent' : color,
        color: variant === 'ghost' ? color : '#fff',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <Icon size={13} />
      {children}
    </button>
  )
}

function EditField({
  value, onChange, onSave, onCancel, type, step, min, max, ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  type?: string
  step?: string
  min?: string
  max?: string
  ariaLabel?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        autoFocus
        type={type ?? 'text'}
        step={step}
        min={min}
        max={max}
        aria-label={ariaLabel}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
        style={{
          flex: 1, minWidth: 0,
          padding: '5px 9px', borderRadius: 7,
          border: '1px solid var(--accent)', background: 'var(--panel)',
          color: 'var(--txt)', fontSize: 14, fontWeight: 600,
          fontFamily: 'var(--font-red-hat-mono), monospace', outline: 'none',
        }}
      />
      <IconBtn onClick={onSave} variant="accent"><Check size={12} /></IconBtn>
      <IconBtn onClick={onCancel}><X size={12} /></IconBtn>
    </div>
  )
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 10, border: 'none',
  background: 'var(--accent)', color: '#fff',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const ghostBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--txt2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
