'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import { BlockRenderer, parseBlock, starterContent, tempBlockId, type Block } from '@/components/philly/pagebuilder/BlockRenderer'
import {
  Type, Heading as HeadingIcon, Minus, AlertCircle, Image as ImageIcon,
  Table, BarChart3, Code, Plus, Trash2, ChevronUp, ChevronDown,
  Save, ArrowLeft, Eye, Settings as SettingsIcon,
} from 'lucide-react'

interface PageData {
  id: string
  title: string
  slug: string
  updatedAt: string
  blocks: { id: string; type: string; content: string; position: number }[]
}

type EditorBlock = Block & { id: string; position: number }

const BLOCK_CATALOG: Array<{ type: string; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { type: 'heading', label: 'Heading', icon: HeadingIcon },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'callout', label: 'Callout', icon: AlertCircle },
  { type: 'stats', label: 'Stats', icon: BarChart3 },
  { type: 'chart', label: 'Chart', icon: BarChart3 },
  { type: 'table', label: 'Table', icon: Table },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'embed', label: 'Embed', icon: Code },
  { type: 'divider', label: 'Divider', icon: Minus },
]

export default function PageEdit() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [page, setPage] = useState<PageData | null>(null)
  const [blocks, setBlocks] = useState<EditorBlock[]>([])
  const [title, setTitle] = useState('')
  const [pageSlug, setPageSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/pages/${slug}`)
      .then(r => r.json())
      .then(j => {
        if (!j?.data) return
        setPage(j.data)
        setTitle(j.data.title)
        setPageSlug(j.data.slug)
        setBlocks(j.data.blocks.map(parseBlock))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const markDirty = () => setDirty(true)

  const addBlock = (type: string) => {
    const b: EditorBlock = {
      id: tempBlockId(),
      type,
      content: starterContent(type),
      position: blocks.length,
    }
    setBlocks(prev => [...prev, b])
    setSelectedId(b.id)
    markDirty()
  }

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (selectedId === id) setSelectedId(null)
    markDirty()
  }

  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx < 0) return prev
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
    markDirty()
  }

  const updateBlock = (id: string, content: Record<string, unknown>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
    markDirty()
  }

  const handleSave = async () => {
    if (!page) return
    setSaving(true); setErr(null)
    try {
      const r = await fetch(`/api/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug: pageSlug,
          blocks: blocks.map((b, i) => ({ type: b.type, content: b.content, position: i })),
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error ?? 'Failed to save')
      setDirty(false)
      if (j.data?.slug && j.data.slug !== slug) {
        router.replace(`/pages/${encodeURIComponent(j.data.slug)}/edit`)
      } else {
        // refresh state with server IDs
        setPage(j.data)
        setBlocks(j.data.blocks.map(parseBlock))
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const selected = useMemo(() => blocks.find(b => b.id === selectedId) ?? null, [blocks, selectedId])

  if (loading || !page) {
    return (
      <>
        <Topbar title="Loading…" sub="" />
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading editor…</div>
      </>
    )
  }

  return (
    <>
      <Topbar title={`Editing: ${title || 'Untitled'}`} sub={`/pages/${pageSlug}`} />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/pages" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: 'var(--txt3)', fontSize: 12, fontWeight: 500, textDecoration: 'none',
            }}>
              <ArrowLeft size={12} /> All pages
            </Link>
            <span style={{ color: 'var(--txt3)', fontSize: 12 }}>/</span>
            <Link href={`/pages/${encodeURIComponent(pageSlug)}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: 'var(--txt3)', fontSize: 12, fontWeight: 500, textDecoration: 'none',
            }}>
              <Eye size={12} /> View
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {dirty && <span style={{ fontSize: 11, color: 'var(--y-txt)', fontWeight: 600 }}>● Unsaved changes</span>}
            <button
              onClick={() => setShowSettings(s => !s)}
              style={{
                padding: '7px 12px', borderRadius: 7,
                background: showSettings ? 'var(--accent-bg)' : 'var(--bg2)',
                border: '1px solid var(--border)',
                color: showSettings ? 'var(--accent-txt)' : 'var(--txt2)',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <SettingsIcon size={12} /> Page settings
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              style={{
                padding: '7px 14px', borderRadius: 7, border: 'none',
                background: dirty ? 'var(--accent)' : 'var(--bg2)',
                color: dirty ? '#fff' : 'var(--txt3)',
                fontSize: 12.5, fontWeight: 600,
                cursor: !dirty || saving ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <Save size={12} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {err && (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: 'var(--r-bg)', color: 'var(--r-txt)',
            fontSize: 12.5, marginBottom: 14, fontWeight: 500,
          }}>{err}</div>
        )}

        {/* Page settings */}
        {showSettings && (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 16, marginBottom: 16,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</label>
              <input
                value={title}
                onChange={e => { setTitle(e.target.value); markDirty() }}
                style={{
                  width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 7,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  color: 'var(--txt)', fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slug</label>
              <input
                value={pageSlug}
                onChange={e => { setPageSlug(e.target.value); markDirty() }}
                className="mono"
                style={{
                  width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 7,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  color: 'var(--txt)', fontSize: 12,
                }}
              />
            </div>
          </div>
        )}

        {/* Main editor grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '180px 1fr 320px',
          gap: 14,
          alignItems: 'start',
        }}>
          {/* Left: block catalog */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 10,
            position: 'sticky', top: 74,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--txt3)',
              padding: '6px 6px 10px',
            }}>Add Block</div>
            {BLOCK_CATALOG.map(b => (
              <button
                key={b.type}
                onClick={() => addBlock(b.type)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 8px', borderRadius: 7, marginBottom: 2,
                  background: 'transparent', border: 'none',
                  color: 'var(--txt2)', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <b.icon size={13} />
                {b.label}
              </button>
            ))}
          </div>

          {/* Center: canvas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {blocks.length === 0 && (
              <div style={{
                padding: 40, textAlign: 'center',
                background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 12,
                color: 'var(--txt3)', fontSize: 13,
              }}>
                Click a block type on the left to start building your page.
              </div>
            )}
            {blocks.map((b, i) => (
              <BlockWrapper
                key={b.id}
                selected={selectedId === b.id}
                onSelect={() => setSelectedId(b.id)}
                onMoveUp={i > 0 ? () => moveBlock(b.id, -1) : undefined}
                onMoveDown={i < blocks.length - 1 ? () => moveBlock(b.id, 1) : undefined}
                onDelete={() => removeBlock(b.id)}
                typeLabel={BLOCK_CATALOG.find(c => c.type === b.type)?.label ?? b.type}
              >
                <BlockRenderer block={b} />
              </BlockWrapper>
            ))}
          </div>

          {/* Right: inspector */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 14,
            position: 'sticky', top: 74,
            maxHeight: 'calc(100vh - 88px)', overflowY: 'auto',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--txt3)', marginBottom: 10,
            }}>Inspector</div>
            {!selected ? (
              <div style={{ fontSize: 12, color: 'var(--txt3)', lineHeight: 1.5 }}>
                Select a block on the canvas to edit its content.
              </div>
            ) : (
              <BlockInspector
                block={selected}
                onChange={(content) => updateBlock(selected.id, content)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function BlockWrapper({
  children, selected, onSelect, onMoveUp, onMoveDown, onDelete, typeLabel,
}: {
  children: React.ReactNode
  selected: boolean
  onSelect: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDelete: () => void
  typeLabel: string
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative',
        padding: 14,
        background: 'var(--panel)',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 12,
        cursor: 'pointer',
      }}
    >
      <div style={{
        position: 'absolute', top: 6, right: 6,
        display: 'flex', gap: 4, alignItems: 'center',
        opacity: selected ? 1 : 0.5,
      }}>
        <span style={{
          fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--txt3)',
          padding: '2px 6px', background: 'var(--bg2)', borderRadius: 5,
          marginRight: 4,
        }}>{typeLabel}</span>
        <IconBtn disabled={!onMoveUp} onClick={e => { e.stopPropagation(); onMoveUp?.() }}><ChevronUp size={11} /></IconBtn>
        <IconBtn disabled={!onMoveDown} onClick={e => { e.stopPropagation(); onMoveDown?.() }}><ChevronDown size={11} /></IconBtn>
        <IconBtn onClick={e => { e.stopPropagation(); onDelete() }} danger><Trash2 size={11} /></IconBtn>
      </div>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  )
}

function IconBtn({
  children, onClick, disabled, danger,
}: {
  children: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 22, height: 22, borderRadius: 5, border: 'none',
        background: danger ? 'var(--r-bg)' : 'var(--bg2)',
        color: danger ? 'var(--r-txt)' : 'var(--txt2)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >{children}</button>
  )
}

// ── Inspector forms per block type ──

function BlockInspector({ block, onChange }: { block: EditorBlock; onChange: (c: Record<string, unknown>) => void }) {
  const c = block.content

  const patch = (k: string, v: unknown) => onChange({ ...c, [k]: v })

  switch (block.type) {
    case 'heading':
      return (
        <>
          <Field label="Text">
            <input value={String(c.text ?? '')} onChange={e => patch('text', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Level">
            <select value={String(c.level ?? 2)} onChange={e => patch('level', Number(e.target.value))} style={inputStyle}>
              <option value="1">H1</option>
              <option value="2">H2</option>
              <option value="3">H3</option>
            </select>
          </Field>
        </>
      )
    case 'text':
      return (
        <Field label="Content">
          <textarea
            value={String(c.text ?? '')}
            onChange={e => patch('text', e.target.value)}
            rows={10}
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </Field>
      )
    case 'callout':
      return (
        <>
          <Field label="Tone">
            <select value={String(c.tone ?? 'info')} onChange={e => patch('tone', e.target.value)} style={inputStyle}>
              <option value="info">Info (blue)</option>
              <option value="success">Success (green)</option>
              <option value="warning">Warning (yellow)</option>
              <option value="danger">Danger (red)</option>
            </select>
          </Field>
          <Field label="Text">
            <textarea value={String(c.text ?? '')} onChange={e => patch('text', e.target.value)} rows={4} style={{ ...inputStyle, fontFamily: 'inherit' }} />
          </Field>
        </>
      )
    case 'image':
      return (
        <>
          <Field label="Image URL">
            <input value={String(c.src ?? '')} onChange={e => patch('src', e.target.value)} className="mono" style={{ ...inputStyle, fontSize: 11 }} placeholder="https://…" />
          </Field>
          <Field label="Alt text">
            <input value={String(c.alt ?? '')} onChange={e => patch('alt', e.target.value)} style={inputStyle} />
          </Field>
        </>
      )
    case 'embed':
      return (
        <>
          <Field label="Embed URL">
            <input value={String(c.url ?? '')} onChange={e => patch('url', e.target.value)} className="mono" style={{ ...inputStyle, fontSize: 11 }} placeholder="https://…" />
          </Field>
          <Field label="Height (px)">
            <input type="number" value={Number(c.height ?? 360)} onChange={e => patch('height', Number(e.target.value))} style={inputStyle} />
          </Field>
        </>
      )
    case 'stats': {
      const items = Array.isArray(c.items) ? c.items as Array<{ label: string; value: string; delta?: string }> : []
      const update = (i: number, key: string, v: string) => {
        const next = [...items]; next[i] = { ...next[i], [key]: v }; patch('items', next)
      }
      return (
        <>
          {items.map((it, i) => (
            <div key={i} style={{ padding: 10, background: 'var(--bg2)', borderRadius: 8, marginBottom: 8 }}>
              <Field label={`Stat ${i + 1} — Label`}><input value={it.label ?? ''} onChange={e => update(i, 'label', e.target.value)} style={inputStyle} /></Field>
              <Field label="Value"><input value={it.value ?? ''} onChange={e => update(i, 'value', e.target.value)} style={inputStyle} /></Field>
              <Field label="Delta (optional)"><input value={it.delta ?? ''} onChange={e => update(i, 'delta', e.target.value)} style={inputStyle} /></Field>
              <button
                onClick={() => patch('items', items.filter((_, j) => j !== i))}
                style={smallBtn('danger')}
              >Remove</button>
            </div>
          ))}
          <button
            onClick={() => patch('items', [...items, { label: 'New stat', value: '0' }])}
            style={smallBtn('primary')}
          ><Plus size={11} /> Add stat</button>
        </>
      )
    }
    case 'table': {
      const columns = Array.isArray(c.columns) ? c.columns as Array<{ key: string; label: string }> : []
      const rows = Array.isArray(c.rows) ? c.rows as Array<Record<string, unknown>> : []
      const updateCol = (i: number, key: string, v: string) => {
        const next = [...columns]; next[i] = { ...next[i], [key]: v }; patch('columns', next)
      }
      return (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', marginBottom: 6 }}>COLUMNS</div>
          {columns.map((col, i) => (
            <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
              <input value={col.key ?? ''} onChange={e => updateCol(i, 'key', e.target.value)} placeholder="key" className="mono" style={{ ...inputStyle, fontSize: 11, flex: 1 }} />
              <input value={col.label ?? ''} onChange={e => updateCol(i, 'label', e.target.value)} placeholder="Label" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => patch('columns', columns.filter((_, j) => j !== i))} style={smallBtn('danger')}><Trash2 size={10} /></button>
            </div>
          ))}
          <button onClick={() => patch('columns', [...columns, { key: `col${columns.length + 1}`, label: 'New column' }])} style={smallBtn('primary')}>
            <Plus size={11} /> Add column
          </button>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', margin: '12px 0 6px' }}>ROWS (JSON)</div>
          <textarea
            value={JSON.stringify(rows, null, 2)}
            onChange={e => {
              try { patch('rows', JSON.parse(e.target.value)) }
              catch { /* keep typing */ }
            }}
            rows={8}
            className="mono"
            style={{ ...inputStyle, fontSize: 11 }}
          />
        </>
      )
    }
    case 'chart': {
      const data = Array.isArray(c.data) ? c.data as Array<Record<string, unknown>> : []
      return (
        <>
          <Field label="Title">
            <input value={String(c.title ?? '')} onChange={e => patch('title', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Kind">
            <select value={String(c.kind ?? 'line')} onChange={e => patch('kind', e.target.value)} style={inputStyle}>
              <option value="line">Line</option>
              <option value="bar">Bar</option>
              <option value="pie">Pie</option>
            </select>
          </Field>
          <Field label="X Key (category)">
            <input value={String(c.xKey ?? '')} onChange={e => patch('xKey', e.target.value)} className="mono" style={{ ...inputStyle, fontSize: 11 }} />
          </Field>
          <Field label="Y Key (value)">
            <input value={String(c.yKey ?? '')} onChange={e => patch('yKey', e.target.value)} className="mono" style={{ ...inputStyle, fontSize: 11 }} />
          </Field>
          <Field label="Data (JSON array)">
            <textarea
              value={JSON.stringify(data, null, 2)}
              onChange={e => {
                try { patch('data', JSON.parse(e.target.value)) }
                catch { /* keep typing */ }
              }}
              rows={10}
              className="mono"
              style={{ ...inputStyle, fontSize: 11 }}
            />
          </Field>
        </>
      )
    }
    case 'divider':
      return <div style={{ fontSize: 12, color: 'var(--txt3)' }}>No options for dividers.</div>
    default:
      return <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Unsupported block type.</div>
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 9px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg2)',
  color: 'var(--txt)',
  fontSize: 12.5,
}

function smallBtn(variant: 'primary' | 'danger'): React.CSSProperties {
  return {
    padding: '5px 10px', borderRadius: 6, border: 'none',
    background: variant === 'danger' ? 'var(--r-bg)' : 'var(--accent)',
    color: variant === 'danger' ? 'var(--r-txt)' : '#fff',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4,
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{
        display: 'block', fontSize: 10.5, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--txt3)', marginBottom: 4,
      }}>{label}</label>
      {children}
    </div>
  )
}
