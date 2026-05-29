'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/philly/useApi'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { useToast } from '@/hooks/philly/useToast'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import {
  Zap, Play, Pause, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Edit3, Trash2,
} from 'lucide-react'

/* ── Types ────────────────────────────────────────────── */

interface AutomationRule {
  id: string
  name: string
  trigger: string
  triggerConfig: string
  actionType: string
  actionConfig: string
  enabled: boolean
  createdAt: string
  _count?: { automationLogs: number }
}

interface AutomationLog {
  id: string
  status: string
  input: string
  output: string
  error: string | null
  createdAt: string
}

interface TriggerCfg {
  entity?: string
  field?: string
  from?: string
  to?: string
  cron?: string
}

interface ActionCfg {
  accountId?: string
  to?: string
  subject?: string
  body?: string
  toNumber?: string
  channel?: 'sms' | 'whatsapp'
  title?: string
  link?: string
  field?: string
  value?: string
  stageId?: string
  url?: string
  payload?: string
}

/* ── Constants ────────────────────────────────────────── */

const TRIGGERS = [
  { v: 'onEntityCreate', label: 'Entity created' },
  { v: 'onEntityDelete', label: 'Entity deleted' },
  { v: 'onFieldChange', label: 'Field changed' },
  { v: 'onStageChange', label: 'Deal stage changed' },
  { v: 'onSchedule', label: 'On schedule (cron)' },
]

const ACTIONS = [
  { v: 'sendEmail', label: 'Send email' },
  { v: 'sendSMS', label: 'Send SMS / WhatsApp' },
  { v: 'createNotification', label: 'Create notification' },
  { v: 'updateField', label: 'Update field' },
  { v: 'moveStage', label: 'Move deal stage' },
  { v: 'callWebhook', label: 'Call webhook' },
]

const ENTITIES = ['contact', 'deal', 'project', 'property', 'room', 'reservation', 'task', 'document']

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit', outline: 'none',
}

const monoStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'var(--font-red-hat-mono), monospace',
  fontSize: 12,
}

/* ── Helpers ─────────────────────────────────────────── */

function safeParse<T extends object>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback
  try { const v = JSON.parse(raw); return (v && typeof v === 'object') ? v as T : fallback } catch { return fallback }
}

function triggerSummary(rule: AutomationRule): string {
  const cfg = safeParse<TriggerCfg>(rule.triggerConfig, {})
  switch (rule.trigger) {
    case 'onEntityCreate': return `When ${cfg.entity ?? 'any entity'} is created`
    case 'onEntityDelete': return `When ${cfg.entity ?? 'any entity'} is deleted`
    case 'onFieldChange': return `When ${cfg.entity ?? 'entity'}.${cfg.field ?? 'field'} changes`
    case 'onStageChange': return 'When a deal stage changes'
    case 'onSchedule': return `Every ${cfg.cron ?? '* * * * *'}`
    default: return rule.trigger
  }
}

function actionSummary(rule: AutomationRule): string {
  const cfg = safeParse<ActionCfg>(rule.actionConfig, {})
  switch (rule.actionType) {
    case 'sendEmail': return `Send email to ${cfg.to ?? '?'}`
    case 'sendSMS': return `Send ${cfg.channel ?? 'sms'} to ${cfg.toNumber ?? '?'}`
    case 'createNotification': return `Notify: ${cfg.title ?? '?'}`
    case 'updateField': return `Set ${cfg.field ?? '?'} = ${String(cfg.value ?? '')}`
    case 'moveStage': return `Move to stage ${cfg.stageId ?? '?'}`
    case 'callWebhook': return `POST ${cfg.url ?? '?'}`
    default: return rule.actionType
  }
}

/* ── Page ────────────────────────────────────────────── */

export default function AutomationsPage() {
  const [expandedLogs, setExpandedLogs] = useState<Record<string, AutomationLog[] | 'loading'>>({})

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AutomationRule | null>(null)
  const [fName, setFName] = useState('')
  const [fTrigger, setFTrigger] = useState('onEntityCreate')
  const [fAction, setFAction] = useState('sendEmail')
  const [fEnabled, setFEnabled] = useState(true)
  const [fTrigCfg, setFTrigCfg] = useState<TriggerCfg>({})
  const [fActCfg, setFActCfg] = useState<ActionCfg>({})
  const [saving, setSaving] = useState(false)

  const t = useTranslations('automations')
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const { addToast } = useToast()
  const confirm = useConfirm()

  // SWR-backed fetch: shared cache across the dashboard, revalidates on
  // focus, and the SSE subscription below funnels into the same refetch.
  const rulesQuery = useApi<{ data: AutomationRule[] }>('/automations')
  const rules = rulesQuery.data?.data ?? []
  const loading = rulesQuery.loading
  const load = rulesQuery.refetch

  useEntitySubscription('automationRule', load)

  const resetForm = () => {
    setEditing(null)
    setFName('')
    setFTrigger('onEntityCreate')
    setFAction('sendEmail')
    setFEnabled(true)
    setFTrigCfg({})
    setFActCfg({})
  }

  const openNew = () => {
    resetForm()
    setEditorOpen(true)
  }

  const openEdit = (rule: AutomationRule) => {
    setEditing(rule)
    setFName(rule.name)
    setFTrigger(rule.trigger)
    setFAction(rule.actionType)
    setFEnabled(rule.enabled)
    setFTrigCfg(safeParse<TriggerCfg>(rule.triggerConfig, {}))
    setFActCfg(safeParse<ActionCfg>(rule.actionConfig, {}))
    setEditorOpen(true)
  }

  const save = async () => {
    if (!fName.trim()) { addToast(t('toasts.nameRequired'), 'error'); return }
    setSaving(true)

    // For callWebhook, payload is a JSON string — parse to object before send
    const actCfgSend: Record<string, unknown> = { ...fActCfg }
    if (fAction === 'callWebhook' && typeof fActCfg.payload === 'string' && fActCfg.payload.trim()) {
      try { actCfgSend.payload = JSON.parse(fActCfg.payload) }
      catch { addToast(t('toasts.payloadJson'), 'error'); setSaving(false); return }
    }

    const payload = {
      name: fName.trim(),
      trigger: fTrigger,
      triggerConfig: JSON.stringify(fTrigCfg),
      actionType: fAction,
      actionConfig: JSON.stringify(actCfgSend),
      enabled: fEnabled,
    }
    try {
      let res: Response
      if (editing) {
        res = await fetch(`/api/automations/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/automations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        addToast(j.error ?? t('toasts.saveFailed'), 'error')
        return
      }
      addToast(editing ? t('toasts.updated') : t('toasts.created'), 'success')
      setEditorOpen(false)
      resetForm()
      load()
    } catch {
      addToast(t('toasts.saveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const del = async (rule: AutomationRule) => {
    const ok = await confirm({
      title: tConfirms('deleteRule.title', { name: rule.name }),
      confirmLabel: tCommon('delete'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    const res = await fetch(`/api/automations/${rule.id}`, { method: 'DELETE' })
    if (res.ok) {
      addToast(t('toasts.deleted'), 'success')
      load()
    } else {
      addToast(t('toasts.deleteFailed'), 'error')
    }
  }

  const toggle = async (rule: AutomationRule) => {
    const next = !rule.enabled
    try {
      const res = await fetch('/api/automations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, enabled: next }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      load()
    } catch {
      addToast(t('toasts.toggleFailed'), 'error')
    }
  }

  const toggleLogs = async (rule: AutomationRule) => {
    if (expandedLogs[rule.id] && expandedLogs[rule.id] !== 'loading') {
      setExpandedLogs(prev => { const cp = { ...prev }; delete cp[rule.id]; return cp })
      return
    }
    setExpandedLogs(prev => ({ ...prev, [rule.id]: 'loading' }))
    try {
      const res = await fetch(`/api/automations/${rule.id}/logs?limit=5`)
      const j = await res.json()
      setExpandedLogs(prev => ({ ...prev, [rule.id]: j.data ?? [] }))
    } catch {
      setExpandedLogs(prev => ({ ...prev, [rule.id]: [] }))
    }
  }

  return (
    <>
      <Topbar
        title={t('title')}
        sub={t('subtitle')}
        onAdd={openNew}
        addLabel={t('addLabel')}
      />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <StatCard icon={Zap} label={t('kpis.total')} value={rules.length} />
          <StatCard icon={Play} label={t('kpis.active')} value={rules.filter(r => r.enabled).length} />
          <StatCard icon={CheckCircle2} label={t('kpis.totalRuns')} value={rules.reduce((s, r) => s + (r._count?.automationLogs ?? 0), 0)} />
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>{t('list.loading')}</div>
        ) : rules.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <Zap size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            {t('list.empty')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rules.map(rule => {
              const logs = expandedLogs[rule.id]
              const expanded = Boolean(logs)
              return (
                <div key={rule.id} style={{
                  borderRadius: 12, border: '1px solid var(--border)',
                  background: 'var(--panel)', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: rule.enabled ? 'var(--g-bg)' : 'var(--bg2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Zap size={16} style={{ color: rule.enabled ? 'var(--g-txt)' : 'var(--txt3)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--txt)' }}>{rule.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <span><strong style={{ color: 'var(--txt2)' }}>{t('list.when')}</strong> {triggerSummary(rule)}</span>
                        <span>→</span>
                        <span><strong style={{ color: 'var(--txt2)' }}>{t('list.then')}</strong> {actionSummary(rule)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLogs(rule)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '6px 10px', borderRadius: 6,
                        border: '1px solid var(--border)', background: 'var(--bg2)',
                        color: 'var(--txt2)', fontSize: 10, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      <Clock size={10} /> {rule._count?.automationLogs ?? 0} {t('list.runs')}
                    </button>
                    <button onClick={() => toggle(rule)} title={rule.enabled ? t('list.disable') : t('list.enable')} style={{
                      padding: '6px 10px', borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: rule.enabled ? 'var(--g-bg)' : 'var(--bg2)',
                      color: rule.enabled ? 'var(--g-txt)' : 'var(--txt3)',
                      fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {rule.enabled ? <><Pause size={10} /> {t('list.active')}</> : <><Play size={10} /> {t('list.paused')}</>}
                    </button>
                    <IconBtn onClick={() => openEdit(rule)} title={t('list.edit')}><Edit3 size={13} /></IconBtn>
                    <IconBtn onClick={() => del(rule)} title={t('list.delete')} danger><Trash2 size={13} /></IconBtn>
                  </div>

                  {expanded && (
                    <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--border)' }}>
                      {logs === 'loading' ? (
                        <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--txt3)' }}>{t('logs.loading')}</div>
                      ) : (logs as AutomationLog[]).length === 0 ? (
                        <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--txt3)' }}>{t('logs.empty')}</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10 }}>
                          {(logs as AutomationLog[]).map(log => (
                            <div key={log.id} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 10px', borderRadius: 8,
                              background: 'var(--bg2)', fontSize: 11,
                            }}>
                              {log.status === 'success'
                                ? <CheckCircle2 size={12} style={{ color: 'var(--g-txt)', flexShrink: 0 }} />
                                : <XCircle size={12} style={{ color: 'var(--r-txt)', flexShrink: 0 }} />}
                              <span style={{
                                fontWeight: 700, textTransform: 'uppercase',
                                color: log.status === 'success' ? 'var(--g-txt)' : 'var(--r-txt)',
                                minWidth: 60,
                              }}>{log.status}</span>
                              <span style={{ color: 'var(--txt3)', minWidth: 140 }}>
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                              <span style={{
                                flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', color: 'var(--txt2)',
                                fontFamily: 'var(--font-red-hat-mono), monospace',
                              }}>{log.error ?? log.output}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rule Builder Modal */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? t('editor.titleEdit') : t('editor.titleNew')}
        subtitle={t('editor.subtitle')}
        size="lg"
      >
        <FormField label={t('editor.ruleName')} required>
          <input value={fName} onChange={e => setFName(e.target.value)} placeholder={t('editor.ruleNamePlaceholder')} style={inputStyle} />
        </FormField>

        {/* WHEN */}
        <SectionLabel text={t('editor.whenTrigger')} />
        <FormField label={t('editor.triggerType')}>
          <select value={fTrigger} onChange={e => { setFTrigger(e.target.value); setFTrigCfg({}) }} style={{ ...inputStyle, cursor: 'pointer' }}>
            {TRIGGERS.map(tr => <option key={tr.v} value={tr.v}>{(() => { try { return t(`triggers.${tr.v}` as any) } catch { return tr.label } })()}</option>)}
          </select>
        </FormField>
        {(fTrigger === 'onEntityCreate' || fTrigger === 'onEntityDelete') && (
          <FormField label={t('editor.entity')}>
            <select value={fTrigCfg.entity ?? ''} onChange={e => setFTrigCfg({ ...fTrigCfg, entity: e.target.value || undefined })} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">{t('editor.anyEntity')}</option>
              {ENTITIES.map(en => <option key={en} value={en}>{en}</option>)}
            </select>
          </FormField>
        )}
        {fTrigger === 'onFieldChange' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label={t('editor.entity')}>
              <select value={fTrigCfg.entity ?? ''} onChange={e => setFTrigCfg({ ...fTrigCfg, entity: e.target.value || undefined })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">{t('editor.any')}</option>
                {ENTITIES.map(en => <option key={en} value={en}>{en}</option>)}
              </select>
            </FormField>
            <FormField label={t('editor.fieldName')}>
              <input value={fTrigCfg.field ?? ''} onChange={e => setFTrigCfg({ ...fTrigCfg, field: e.target.value || undefined })} placeholder="status" style={monoStyle} />
            </FormField>
            <FormField label={t('editor.fromOptional')}>
              <input value={fTrigCfg.from ?? ''} onChange={e => setFTrigCfg({ ...fTrigCfg, from: e.target.value || undefined })} placeholder="new" style={monoStyle} />
            </FormField>
            <FormField label={t('editor.toOptional')}>
              <input value={fTrigCfg.to ?? ''} onChange={e => setFTrigCfg({ ...fTrigCfg, to: e.target.value || undefined })} placeholder="won" style={monoStyle} />
            </FormField>
          </div>
        )}
        {fTrigger === 'onSchedule' && (
          <FormField label={t('editor.cron')}>
            <input value={fTrigCfg.cron ?? ''} onChange={e => setFTrigCfg({ ...fTrigCfg, cron: e.target.value || undefined })} placeholder="0 9 * * 1" style={monoStyle} />
          </FormField>
        )}

        {/* THEN */}
        <SectionLabel text={t('editor.thenAction')} />
        <FormField label={t('editor.actionType')}>
          <select value={fAction} onChange={e => { setFAction(e.target.value); setFActCfg({}) }} style={{ ...inputStyle, cursor: 'pointer' }}>
            {ACTIONS.map(a => <option key={a.v} value={a.v}>{(() => { try { return t(`actions.${a.v}` as any) } catch { return a.label } })()}</option>)}
          </select>
        </FormField>

        {fAction === 'sendEmail' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label={t('editor.accountId')} required>
                <input value={fActCfg.accountId ?? ''} onChange={e => setFActCfg({ ...fActCfg, accountId: e.target.value })} placeholder="email account id" style={monoStyle} />
              </FormField>
              <FormField label={t('editor.to')} required>
                <input value={fActCfg.to ?? ''} onChange={e => setFActCfg({ ...fActCfg, to: e.target.value })} placeholder="{{email}}" style={monoStyle} />
              </FormField>
            </div>
            <FormField label={t('editor.subject')}>
              <input value={fActCfg.subject ?? ''} onChange={e => setFActCfg({ ...fActCfg, subject: e.target.value })} placeholder="Hi {{first_name}}" style={monoStyle} />
            </FormField>
            <FormField label={t('editor.bodyMerge')}>
              <textarea value={fActCfg.body ?? ''} onChange={e => setFActCfg({ ...fActCfg, body: e.target.value })} rows={6} placeholder="Hi {{first_name}}, ..." style={{ ...monoStyle, resize: 'vertical' }} />
            </FormField>
            <MergeHint />
          </>
        )}

        {fAction === 'sendSMS' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12 }}>
              <FormField label={t('editor.phoneNumber')} required>
                <input value={fActCfg.toNumber ?? ''} onChange={e => setFActCfg({ ...fActCfg, toNumber: e.target.value })} placeholder="{{phone}}" style={monoStyle} />
              </FormField>
              <FormField label={t('editor.channel')}>
                <select value={fActCfg.channel ?? 'sms'} onChange={e => setFActCfg({ ...fActCfg, channel: e.target.value as 'sms' | 'whatsapp' })} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </FormField>
            </div>
            <FormField label={t('editor.body')}>
              <textarea value={fActCfg.body ?? ''} onChange={e => setFActCfg({ ...fActCfg, body: e.target.value })} rows={4} placeholder="Hi {{first_name}}, ..." style={{ ...monoStyle, resize: 'vertical' }} />
            </FormField>
            <MergeHint />
          </>
        )}

        {fAction === 'createNotification' && (
          <>
            <FormField label={t('editor.titleField')} required>
              <input value={fActCfg.title ?? ''} onChange={e => setFActCfg({ ...fActCfg, title: e.target.value })} placeholder={t('editor.titlePlaceholder')} style={inputStyle} />
            </FormField>
            <FormField label={t('editor.body')}>
              <textarea value={fActCfg.body ?? ''} onChange={e => setFActCfg({ ...fActCfg, body: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </FormField>
            <FormField label={t('editor.linkOptional')}>
              <input value={fActCfg.link ?? ''} onChange={e => setFActCfg({ ...fActCfg, link: e.target.value })} placeholder="/contacts/{{__entityId}}" style={monoStyle} />
            </FormField>
          </>
        )}

        {fAction === 'updateField' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label={t('editor.field')} required>
              <input value={fActCfg.field ?? ''} onChange={e => setFActCfg({ ...fActCfg, field: e.target.value })} placeholder="status" style={monoStyle} />
            </FormField>
            <FormField label={t('editor.value')} required>
              <input value={String(fActCfg.value ?? '')} onChange={e => setFActCfg({ ...fActCfg, value: e.target.value })} placeholder="qualified" style={monoStyle} />
            </FormField>
          </div>
        )}

        {fAction === 'moveStage' && (
          <FormField label={t('editor.stageId')} required>
            <input value={fActCfg.stageId ?? ''} onChange={e => setFActCfg({ ...fActCfg, stageId: e.target.value })} placeholder="stage_xyz" style={monoStyle} />
          </FormField>
        )}

        {fAction === 'callWebhook' && (
          <>
            <FormField label={t('editor.url')} required>
              <input value={fActCfg.url ?? ''} onChange={e => setFActCfg({ ...fActCfg, url: e.target.value })} placeholder="https://hooks.example.com/abc" style={monoStyle} />
            </FormField>
            <FormField label={t('editor.payload')}>
              <textarea
                value={typeof fActCfg.payload === 'string' ? fActCfg.payload : JSON.stringify(fActCfg.payload ?? {}, null, 2)}
                onChange={e => setFActCfg({ ...fActCfg, payload: e.target.value })}
                rows={6}
                placeholder='{"event": "contact.created"}'
                style={{ ...monoStyle, resize: 'vertical' }}
              />
            </FormField>
          </>
        )}

        {/* Enabled toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 16, padding: '12px 14px', borderRadius: 8,
          background: 'var(--bg2)',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--txt2)' }}>
            <input type="checkbox" checked={fEnabled} onChange={e => setFEnabled(e.target.checked)} />
            {t('editor.enabled')}
          </label>
          <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
            {fEnabled ? t('editor.enabledOn') : t('editor.enabledOff')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={() => setEditorOpen(false)} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg2)', color: 'var(--txt2)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>{t('editor.cancel')}</button>
          <button onClick={save} disabled={saving} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff',
            fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
          }}>{saving ? t('editor.saving') : (editing ? t('editor.saveChanges') : t('editor.createRule'))}</button>
        </div>
      </Modal>
    </>
  )
}

/* ── Helpers ─────────────────────────────────────────── */

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: 'var(--txt3)',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      margin: '16px 0 10px', paddingBottom: 6,
      borderBottom: '1px solid var(--border)',
    }}>{text}</div>
  )
}

function MergeHint() {
  return (
    <div style={{
      padding: '8px 10px', borderRadius: 6, background: 'var(--bg2)',
      fontSize: 10.5, color: 'var(--txt3)',
      fontFamily: 'var(--font-red-hat-mono), monospace', marginTop: -8, marginBottom: 12,
    }}>
      Merge fields: {'{{first_name}}'}, {'{{email}}'}, {'{{__entityId}}'}, {'{{__entity}}'}
    </div>
  )
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 30, height: 30, borderRadius: 6,
      border: '1px solid var(--border)', background: 'var(--bg2)',
      color: danger ? 'var(--r-txt)' : 'var(--txt2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
    }}>{children}</button>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; label: string; value: number }) {
  return (
    <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} style={{ color: 'var(--accent-txt)' }} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--font-red-hat-mono), monospace' }}>{value}</div>
        <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  )
}
