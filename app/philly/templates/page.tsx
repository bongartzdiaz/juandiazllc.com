'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { useToast } from '@/hooks/philly/useToast'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { FileText, Mail, MessageSquare, Phone, Edit3, Trash2, Eye, Filter } from 'lucide-react'

interface Template {
  id: string
  name: string
  type: string
  subject: string
  body: string
  variables: string
  createdAt: string
  updatedAt?: string
}

const TYPE_COLORS: Record<string, { bg: string; txt: string }> = {
  email: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  sms: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  whatsapp: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  letter: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
}

const TYPE_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
  letter: FileText,
}

const SAMPLE_CTX = {
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  phone: '+1 555-0100',
  property_address: '123 Maple St, Philadelphia',
  deal_stage: 'Qualified',
  amount: 250000,
  agent_name: 'Alex Rivera',
  date: new Date().toLocaleDateString(),
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit', outline: 'none',
}

function parseVars(v: string): string[] {
  try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : [] } catch { return [] }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [fName, setFName] = useState('')
  const [fType, setFType] = useState<'email' | 'sms' | 'whatsapp' | 'letter'>('email')
  const [fSubject, setFSubject] = useState('')
  const [fBody, setFBody] = useState('')
  const [saving, setSaving] = useState(false)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewBody, setPreviewBody] = useState('')
  const [previewRawSubject, setPreviewRawSubject] = useState('')
  const [previewRawBody, setPreviewRawBody] = useState('')

  const t = useTranslations('templates')
  const { addToast } = useToast()

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    fetch(`/api/templates?${params}`)
      .then(r => r.json())
      .then(j => setTemplates(Array.isArray(j.data) ? j.data : []))
      .catch(() => { setTemplates([]) })
      .finally(() => setLoading(false))
  }, [typeFilter])

  useEffect(() => { fetchData() }, [fetchData])

  // Live updates when templates are created/updated/deleted
  useEntitySubscription('template', fetchData)

  const openNew = () => {
    setEditing(null)
    setFName('')
    setFType('email')
    setFSubject('')
    setFBody('')
    setEditorOpen(true)
  }

  const openEdit = (tpl: Template) => {
    setEditing(tpl)
    setFName(tpl.name)
    setFType((tpl.type as 'email' | 'sms' | 'whatsapp' | 'letter') || 'email')
    setFSubject(tpl.subject ?? '')
    setFBody(tpl.body ?? '')
    setEditorOpen(true)
  }

  const save = async () => {
    if (!fName.trim()) { addToast('Name is required', 'error'); return }
    if (!fBody.trim()) { addToast('Body is required', 'error'); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: fName.trim(),
        type: fType,
        subject: fType === 'email' ? fSubject : '',
        body: fBody,
      }
      let res: Response
      if (editing) {
        res = await fetch(`/api/templates/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        addToast(j.error ?? 'Save failed', 'error')
        return
      }
      addToast(editing ? 'Template updated' : 'Template created', 'success')
      setEditorOpen(false)
      fetchData()
    } catch {
      addToast('Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const del = async (tpl: Template) => {
    if (!confirm(`Delete template "${tpl.name}"?`)) return
    const res = await fetch(`/api/templates/${tpl.id}`, { method: 'DELETE' })
    if (res.ok) {
      addToast('Template deleted', 'success')
      fetchData()
    } else {
      addToast('Delete failed', 'error')
    }
  }

  const preview = async (tpl: Template) => {
    setPreviewRawSubject(tpl.subject ?? '')
    setPreviewRawBody(tpl.body ?? '')
    setPreviewSubject('Rendering...')
    setPreviewBody('')
    setPreviewOpen(true)
    try {
      const res = await fetch('/api/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: tpl.id, context: SAMPLE_CTX }),
      })
      const j = await res.json()
      if (res.ok) {
        setPreviewSubject(j.data.subject ?? '')
        setPreviewBody(j.data.body ?? '')
      } else {
        setPreviewSubject('')
        setPreviewBody(j.error ?? 'Preview failed')
      }
    } catch {
      setPreviewSubject('')
      setPreviewBody('Preview failed')
    }
  }

  return (
    <>
      <Topbar title={t('title')} sub="Email and SMS templates with merge fields" onAdd={openNew} addLabel="Template" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* Type chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <Filter size={13} style={{ color: 'var(--txt3)' }} />
          {[
            { v: '', label: 'All' },
            { v: 'email', label: 'Email' },
            { v: 'sms', label: 'SMS' },
            { v: 'whatsapp', label: 'WhatsApp' },
            { v: 'letter', label: 'Letter' },
          ].map(c => {
            const active = typeFilter === c.v
            return (
              <button key={c.v} onClick={() => setTypeFilter(c.v)} style={{
                padding: '6px 14px', borderRadius: 7,
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'var(--accent)' : 'var(--panel)',
                color: active ? '#fff' : 'var(--txt2)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{c.label}</button>
            )
          })}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
        ) : templates.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            No templates found.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {templates.map(tpl => {
              const colors = TYPE_COLORS[tpl.type] ?? { bg: 'var(--bg2)', txt: 'var(--txt3)' }
              const Icon = TYPE_ICONS[tpl.type] ?? FileText
              const vars = parseVars(tpl.variables)
              return (
                <div key={tpl.id} style={{
                  padding: 16, borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--panel)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tpl.name}</div>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: colors.bg, color: colors.txt, flexShrink: 0,
                    }}>
                      <Icon size={10} /> {tpl.type}
                    </span>
                  </div>

                  {tpl.subject && (
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.subject}</div>
                  )}

                  <div style={{ fontSize: 11, color: 'var(--txt3)', lineHeight: 1.5, minHeight: 32 }}>
                    {tpl.body.length > 120 ? tpl.body.slice(0, 120) + '...' : tpl.body}
                  </div>

                  {vars.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {vars.slice(0, 6).map(v => (
                        <span key={v} style={{
                          padding: '2px 7px', borderRadius: 5,
                          background: 'var(--bg2)', color: 'var(--txt2)',
                          fontSize: 10, fontWeight: 600,
                          fontFamily: 'var(--font-red-hat-mono), monospace',
                        }}>{`{{${v}}}`}</span>
                      ))}
                      {vars.length > 6 && (
                        <span style={{ fontSize: 10, color: 'var(--txt3)', padding: '2px 4px' }}>+{vars.length - 6}</span>
                      )}
                    </div>
                  )}

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 10, color: 'var(--txt3)' }}>
                      Updated {new Date(tpl.updatedAt ?? tpl.createdAt).toLocaleDateString()}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <IconBtn onClick={() => preview(tpl)} title="Preview"><Eye size={13} /></IconBtn>
                      <IconBtn onClick={() => openEdit(tpl)} title="Edit"><Edit3 size={13} /></IconBtn>
                      <IconBtn onClick={() => del(tpl)} title="Delete" danger><Trash2 size={13} /></IconBtn>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit Template' : 'New Template'}
        subtitle="Use {{field}} for merge fields"
        size="md"
      >
        <FormField label="Name" required>
          <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Welcome email" style={inputStyle} />
        </FormField>
        <FormField label="Type" required>
          <select value={fType} onChange={e => setFType(e.target.value as 'email' | 'sms' | 'whatsapp' | 'letter')} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="letter">Letter</option>
          </select>
        </FormField>
        {fType === 'email' && (
          <FormField label="Subject">
            <input value={fSubject} onChange={e => setFSubject(e.target.value)} placeholder="Welcome, {{first_name}}" style={inputStyle} />
          </FormField>
        )}
        <FormField label="Body" required>
          <textarea
            value={fBody}
            onChange={e => setFBody(e.target.value)}
            rows={10}
            placeholder="Hi {{first_name}},&#10;&#10;..."
            style={{ ...inputStyle, fontFamily: 'var(--font-red-hat-mono), monospace', resize: 'vertical' }}
          />
        </FormField>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={() => setEditorOpen(false)} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg2)', color: 'var(--txt2)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff',
            fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Template')}</button>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Template Preview"
        subtitle="Rendered with sample context"
        size="lg"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Raw</div>
            {previewRawSubject && (
              <div style={{ marginBottom: 8, padding: '6px 10px', background: 'var(--bg2)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--txt2)' }}>
                {previewRawSubject}
              </div>
            )}
            <pre style={{
              margin: 0, padding: 12, borderRadius: 8,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              fontSize: 12, fontFamily: 'var(--font-red-hat-mono), monospace',
              color: 'var(--txt)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              minHeight: 240, maxHeight: 420, overflowY: 'auto',
            }}>{previewRawBody}</pre>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Rendered</div>
            {previewSubject && (
              <div style={{ marginBottom: 8, padding: '6px 10px', background: 'var(--g-bg)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--g-txt)' }}>
                {previewSubject}
              </div>
            )}
            <div style={{
              padding: 12, borderRadius: 8,
              background: 'var(--panel)', border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--txt)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              minHeight: 240, maxHeight: 420, overflowY: 'auto',
            }}>{previewBody}</div>
          </div>
        </div>
        <div style={{ marginTop: 12, padding: 10, background: 'var(--bg2)', borderRadius: 8, fontSize: 11, color: 'var(--txt3)' }}>
          Sample context: {Object.keys(SAMPLE_CTX).map(k => <code key={k} style={{ fontFamily: 'var(--font-red-hat-mono), monospace', marginRight: 6 }}>{k}</code>)}
        </div>
      </Modal>
    </>
  )
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 28, height: 28, borderRadius: 6,
      border: '1px solid var(--border)', background: 'var(--bg2)',
      color: danger ? 'var(--r-txt)' : 'var(--txt2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
    }}>{children}</button>
  )
}
