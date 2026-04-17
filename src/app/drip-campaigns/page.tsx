'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { Modal, FormField } from '@/components/ui/Modal'
import { useEntitySubscription } from '@/hooks/useRealtime'
import { useToast } from '@/hooks/useToast'
import {
  Filter, Mail, Play, Pause, Plus, Trash2, Edit2, GripVertical, X,
  MessageSquare, Phone,
} from 'lucide-react'

interface DripStep {
  day: number
  channel: 'email' | 'sms' | 'whatsapp'
  subject?: string
  body: string
}

interface DripCampaign {
  id: string
  organizationId: string
  name: string
  type: string
  status: string
  stepsJson: string
  enrolledCount: number
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, { bg: string; txt: string; icon: typeof Play }> = {
  active: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', icon: Play },
  paused: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', icon: Pause },
  archived: { bg: 'var(--bg2)', txt: 'var(--txt3)', icon: Pause },
}

const TYPE_LABELS: Record<string, string> = {
  buyer: 'Buyer Nurture',
  seller: 'Seller Nurture',
  nurture: 'General Nurture',
  post_close: 'Post-Close',
  sphere: 'Sphere of Influence',
  open_house: 'Open House Follow-up',
}

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
}

function parseSteps(stepsJson: string): DripStep[] {
  try {
    const parsed = JSON.parse(stepsJson)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export default function DripCampaignsPage() {
  const [campaigns, setCampaigns] = useState<DripCampaign[]>([])
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const t = useTranslations('dripCampaigns')
  const { addToast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('buyer')
  const [formStatus, setFormStatus] = useState('active')
  const [formSteps, setFormSteps] = useState<DripStep[]>([])
  const [saving, setSaving] = useState(false)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter) params.set('type', typeFilter)
      params.set('limit', '100')
      const res = await fetch(`/api/drip-campaigns?${params}`)
      const j = await res.json().catch(() => ({}))
      setCampaigns(Array.isArray(j.data) ? j.data : [])
    } catch {
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])
  useEntitySubscription('dripCampaign', fetchCampaigns)

  const filtered = statusFilter ? campaigns.filter(c => c.status === statusFilter) : campaigns
  const active = campaigns.filter(c => c.status === 'active').length
  const totalSteps = campaigns.reduce((s, c) => s + parseSteps(c.stepsJson).length, 0)

  function openCreate() {
    setEditingId(null)
    setFormName('')
    setFormType('buyer')
    setFormStatus('active')
    setFormSteps([{ day: 0, channel: 'email', subject: '', body: '' }])
    setShowForm(true)
  }

  function openEdit(c: DripCampaign) {
    setEditingId(c.id)
    setFormName(c.name)
    setFormType(c.type)
    setFormStatus(c.status)
    setFormSteps(parseSteps(c.stepsJson))
    setShowForm(true)
  }

  function addStep() {
    const lastDay = formSteps.length > 0 ? formSteps[formSteps.length - 1].day : 0
    setFormSteps([...formSteps, { day: lastDay + 3, channel: 'email', subject: '', body: '' }])
  }
  function removeStep(idx: number) {
    setFormSteps(formSteps.filter((_, i) => i !== idx))
  }
  function updateStep(idx: number, patch: Partial<DripStep>) {
    setFormSteps(formSteps.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  async function submitForm() {
    if (!formName.trim()) { addToast('Name is required', 'error'); return }
    if (formSteps.length === 0) { addToast('Add at least one step', 'error'); return }
    for (const s of formSteps) {
      if (!s.body.trim()) { addToast('All steps need a body', 'error'); return }
      if (s.day < 0) { addToast('Day must be 0 or more', 'error'); return }
    }

    setSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        type: formType,
        status: formStatus,
        steps: formSteps,
      }
      const res = editingId
        ? await fetch(`/api/drip-campaigns/${editingId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/drip-campaigns', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? 'Save failed', 'error'); return }
      addToast(editingId ? 'Campaign updated' : 'Campaign created', 'success')
      setShowForm(false)
      fetchCampaigns()
    } catch {
      addToast('Network error', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(c: DripCampaign) {
    const nextStatus = c.status === 'active' ? 'paused' : 'active'
    try {
      const res = await fetch(`/api/drip-campaigns/${c.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) { addToast('Update failed', 'error'); return }
      addToast(`Campaign ${nextStatus}`, 'success')
      fetchCampaigns()
    } catch { addToast('Network error', 'error') }
  }

  async function handleDelete(c: DripCampaign) {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/drip-campaigns/${c.id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast('Campaign deleted', 'success')
        fetchCampaigns()
      } else { addToast('Delete failed', 'error') }
    } catch { addToast('Network error', 'error') }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="zap" label="Total Campaigns" value={String(campaigns.length)} />
          <KpiCard icon="trending-up" label="Active" value={String(active)} />
          <KpiCard icon="target" label="Total Steps" value={String(totalSteps)} />
          <KpiCard icon="users" label="Enrolled" value={String(campaigns.reduce((s, c) => s + (c.enrolledCount || 0), 0))} />
        </div>

        {/* Filters + Add */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <FilterSelect value={typeFilter} onChange={setTypeFilter}
            options={[{ value: '', label: 'All Types' }, ...Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter}
            options={[{ value: '', label: 'All Statuses' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'archived', label: 'Archived' }]} />
          <div style={{ flex: 1 }} />
          <button onClick={openCreate} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
          }}>
            <Plus size={13} /> New Campaign
          </button>
        </div>

        {/* Campaign Cards */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>
            No campaigns found. Click New Campaign to create one.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {filtered.map(campaign => {
              const steps = parseSteps(campaign.stepsJson)
              const statusStyle = STATUS_COLORS[campaign.status] ?? STATUS_COLORS.archived
              const StatusIcon = statusStyle.icon

              return (
                <div key={campaign.id} style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)', marginBottom: 2, wordBreak: 'break-word' }}>{campaign.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{TYPE_LABELS[campaign.type] ?? campaign.type}</div>
                    </div>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 3,
                      background: statusStyle.bg, color: statusStyle.txt, flexShrink: 0,
                    }}>
                      <StatusIcon size={9} /> {campaign.status}
                    </span>
                  </div>

                  {/* Steps visual */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {steps.length > 0 ? steps.slice(0, 6).map((step, i) => {
                      const ChIcon = CHANNEL_ICONS[step.channel] ?? Mail
                      return (
                        <div key={i} title={`Day ${step.day} · ${step.channel}`} style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          padding: '3px 7px', borderRadius: 6,
                          background: 'var(--accent-bg)', color: 'var(--accent-txt)',
                          fontSize: 10, fontWeight: 600,
                        }}>
                          <ChIcon size={9} />
                          D{step.day}
                        </div>
                      )
                    }) : (
                      <span style={{ fontSize: 10, color: 'var(--txt3)' }}>No steps configured</span>
                    )}
                    {steps.length > 6 && (
                      <span style={{ fontSize: 10, color: 'var(--txt3)' }}>+{steps.length - 6} more</span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--txt3)', marginLeft: 4 }}>
                      {steps.length} step{steps.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)',
                    gap: 6,
                  }}>
                    <span style={{ fontSize: 10, color: 'var(--txt3)' }}>
                      Created {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => toggleStatus(campaign)} title={campaign.status === 'active' ? 'Pause' : 'Activate'}
                        style={miniBtn}>
                        {campaign.status === 'active' ? <Pause size={11} /> : <Play size={11} />}
                      </button>
                      <button onClick={() => openEdit(campaign)} title="Edit" style={miniBtn}>
                        <Edit2 size={11} />
                      </button>
                      <button onClick={() => handleDelete(campaign)} title="Delete"
                        style={{ ...miniBtn, color: 'var(--r-txt)' }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => { if (!saving) setShowForm(false) }}
        title={editingId ? 'Edit Campaign' : 'New Drip Campaign'}
        subtitle="Sequence of automated touches"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <FormField label="Campaign Name">
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Buyer Welcome Sequence" style={inputStyle} />
            </FormField>
            <FormField label="Type">
              <select value={formType} onChange={e => setFormType(e.target.value)} style={inputStyle}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <select value={formStatus} onChange={e => setFormStatus(e.target.value)} style={inputStyle}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </FormField>
          </div>

          {/* Steps editor */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sequence Steps ({formSteps.length})
              </span>
              <button onClick={addStep} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 7,
                background: 'var(--accent)', color: '#fff',
                border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                <Plus size={11} /> Add Step
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto', padding: '2px 4px' }}>
              {formSteps.map((step, i) => {
                const ChIcon = CHANNEL_ICONS[step.channel] ?? Mail
                return (
                  <div key={i} style={{
                    padding: 12, borderRadius: 10,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <GripVertical size={13} style={{ color: 'var(--txt3)' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', marginRight: 4 }}>
                        Step {i + 1}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 10, color: 'var(--txt3)' }}>Send after</span>
                        <input
                          type="number"
                          min="0"
                          value={step.day}
                          onChange={e => updateStep(i, { day: parseInt(e.target.value) || 0 })}
                          style={{ ...inputStyle, width: 60, padding: '4px 8px', fontSize: 12 }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--txt3)' }}>day{step.day !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ flex: 1 }} />
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['email', 'sms', 'whatsapp'] as const).map(ch => {
                          const Icon = CHANNEL_ICONS[ch]
                          const active = step.channel === ch
                          return (
                            <button
                              key={ch}
                              onClick={() => updateStep(i, { channel: ch })}
                              title={ch}
                              style={{
                                padding: '5px 9px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                                background: active ? 'var(--accent)' : 'var(--panel)',
                                color: active ? '#fff' : 'var(--txt2)',
                                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                                cursor: 'pointer', fontFamily: 'inherit',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                              }}
                            >
                              <Icon size={10} />
                              {ch}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => removeStep(i)}
                        title="Remove step"
                        style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: 'transparent', border: '1px solid var(--border)',
                          color: 'var(--txt3)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                    {step.channel === 'email' && (
                      <input
                        placeholder="Subject line"
                        value={step.subject ?? ''}
                        onChange={e => updateStep(i, { subject: e.target.value })}
                        style={{ ...inputStyle, marginBottom: 6, fontSize: 12 }}
                      />
                    )}
                    <textarea
                      placeholder={step.channel === 'email' ? 'Email body…' : `${step.channel.toUpperCase()} message…`}
                      value={step.body}
                      onChange={e => updateStep(i, { body: e.target.value })}
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical', fontSize: 12, lineHeight: 1.5 }}
                    />
                    <div style={{ fontSize: 9, color: 'var(--txt3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ChIcon size={9} /> {step.body.length} chars
                    </div>
                  </div>
                )
              })}
              {formSteps.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--txt3)', fontSize: 12 }}>
                  No steps yet. Click Add Step to start building the sequence.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} disabled={saving} style={{
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
            }}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create campaign'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--panel)',
  color: 'var(--txt)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
}

const miniBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--txt2)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
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
