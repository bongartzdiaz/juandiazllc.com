'use client'

import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

export type BlockType = 'text' | 'heading' | 'table' | 'chart' | 'embed' | 'divider' | 'stats' | 'callout' | 'image'

export interface Block {
  id?: string
  type: string
  content: Record<string, unknown>
  position?: number
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

function safeString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function safeArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? v as T[] : []
}

export function BlockRenderer({ block }: { block: Block }) {
  const c = block.content ?? {}

  switch (block.type) {
    case 'heading': {
      const text = safeString(c.text, 'Untitled')
      const level = (typeof c.level === 'number' ? c.level : 2) as 1 | 2 | 3
      const sizes = { 1: 28, 2: 22, 3: 17 }
      const weights = { 1: 700, 2: 700, 3: 600 }
      return (
        <div style={{
          fontSize: sizes[level], fontWeight: weights[level],
          color: 'var(--txt)', letterSpacing: '-0.02em',
          marginBottom: 6,
        }}>{text}</div>
      )
    }

    case 'text': {
      const html = safeString(c.html)
      const text = safeString(c.text, html)
      // Render as preserve-whitespace plain text (safe — no HTML injection)
      return (
        <div style={{
          fontSize: 14, lineHeight: 1.6, color: 'var(--txt2)',
          whiteSpace: 'pre-wrap',
        }}>
          {text || (typeof c === 'string' ? c : '')}
        </div>
      )
    }

    case 'divider':
      return <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

    case 'callout': {
      const tone = safeString(c.tone, 'info') // info | success | warning | danger
      const bgMap: Record<string, string> = { info: 'var(--b-bg)', success: 'var(--g-bg)', warning: 'var(--y-bg)', danger: 'var(--r-bg)' }
      const txtMap: Record<string, string> = { info: 'var(--b-txt)', success: 'var(--g-txt)', warning: 'var(--y-txt)', danger: 'var(--r-txt)' }
      return (
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: bgMap[tone] ?? 'var(--b-bg)',
          color: txtMap[tone] ?? 'var(--b-txt)',
          fontSize: 13, fontWeight: 500, lineHeight: 1.5,
        }}>
          {safeString(c.text, 'Callout')}
        </div>
      )
    }

    case 'image': {
      const src = safeString(c.src)
      const alt = safeString(c.alt)
      if (!src) return <EmptyBlock label="No image URL" />
      return (
        <img
          src={src} alt={alt}
          style={{
            width: '100%', borderRadius: 10,
            border: '1px solid var(--border)',
            display: 'block',
          }}
        />
      )
    }

    case 'table': {
      const columns = safeArray<{ key: string; label: string }>(c.columns)
      const rows = safeArray<Record<string, unknown>>(c.rows)
      if (columns.length === 0) return <EmptyBlock label="No columns defined" />
      return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--panel)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                {columns.map(col => (
                  <th key={col.key} style={{
                    textAlign: 'left', padding: '10px 12px', fontSize: 11,
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: 'var(--txt3)', borderBottom: '1px solid var(--border)',
                  }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ padding: 14, textAlign: 'center', color: 'var(--txt3)' }}>No rows</td></tr>
              ) : rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border)' }}>
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: '10px 12px', color: 'var(--txt2)' }}>
                      {String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'stats': {
      const items = safeArray<{ label: string; value: string; delta?: string }>(c.items)
      if (items.length === 0) return <EmptyBlock label="No stats" />
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)`,
          gap: 10,
        }}>
          {items.map((it, i) => (
            <div key={i} style={{
              padding: 14, borderRadius: 10,
              background: 'var(--panel)', border: '1px solid var(--border)',
            }}>
              <div style={{
                fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 6,
              }}>{it.label}</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 500, color: 'var(--txt)' }}>
                {it.value}
              </div>
              {it.delta && (
                <div className="mono" style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
                  {it.delta}
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    case 'chart': {
      const kind = safeString(c.kind, 'line') // line | bar | pie
      const data = safeArray<Record<string, unknown>>(c.data)
      const xKey = safeString(c.xKey, 'x')
      const yKey = safeString(c.yKey, 'y')
      const title = safeString(c.title)

      if (data.length === 0) return <EmptyBlock label="No chart data" />
      return (
        <div style={{
          padding: 14, borderRadius: 10,
          background: 'var(--panel)', border: '1px solid var(--border)',
        }}>
          {title && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{title}</div>}
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              {kind === 'bar' ? (
                <BarChart data={data as never}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={xKey} stroke="var(--txt3)" fontSize={11} />
                  <YAxis stroke="var(--txt3)" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey={yKey} fill={CHART_COLORS[0]} />
                </BarChart>
              ) : kind === 'pie' ? (
                <PieChart>
                  <Pie data={data as never} dataKey={yKey} nameKey={xKey} innerRadius={40} outerRadius={90} label>
                    {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <LineChart data={data as never}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={xKey} stroke="var(--txt3)" fontSize={11} />
                  <YAxis stroke="var(--txt3)" fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey={yKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )
    }

    case 'embed': {
      const url = safeString(c.url)
      const height = typeof c.height === 'number' ? c.height : 360
      if (!url) return <EmptyBlock label="No embed URL" />
      return (
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <iframe
            src={url}
            style={{ width: '100%', height, border: 'none', display: 'block' }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      )
    }

    default:
      return <EmptyBlock label={`Unknown block type: ${block.type}`} />
  }
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div style={{
      padding: 14, borderRadius: 10, border: '1px dashed var(--border)',
      color: 'var(--txt3)', fontSize: 12, textAlign: 'center', background: 'var(--bg2)',
    }}>{label}</div>
  )
}

// Parse stored JSON content string into object
export function parseBlock(raw: { id: string; type: string; content: string; position: number }): Block & { id: string; position: number } {
  let parsed: Record<string, unknown> = {}
  try {
    const v = JSON.parse(raw.content)
    if (v && typeof v === 'object' && !Array.isArray(v)) parsed = v as Record<string, unknown>
  } catch { /* ignore */ }
  return { id: raw.id, type: raw.type, content: parsed, position: raw.position }
}

// Starter content for a new block
export function starterContent(type: string): Record<string, unknown> {
  switch (type) {
    case 'heading': return { text: 'New heading', level: 2 }
    case 'text': return { text: 'Write something…' }
    case 'divider': return {}
    case 'callout': return { tone: 'info', text: 'Important note.' }
    case 'image': return { src: '', alt: '' }
    case 'table': return {
      columns: [{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }],
      rows: [{ name: 'Item A', value: '100' }, { name: 'Item B', value: '200' }],
    }
    case 'stats': return {
      items: [
        { label: 'Revenue', value: '€12,400', delta: '+8%' },
        { label: 'Leads', value: '142', delta: '+12' },
        { label: 'Conversion', value: '3.4%', delta: '+0.2pp' },
      ],
    }
    case 'chart': return {
      kind: 'line', title: 'Trend',
      xKey: 'month', yKey: 'value',
      data: [
        { month: 'Jan', value: 30 }, { month: 'Feb', value: 45 },
        { month: 'Mar', value: 38 }, { month: 'Apr', value: 52 },
        { month: 'May', value: 61 }, { month: 'Jun', value: 58 },
      ],
    }
    case 'embed': return { url: '', height: 360 }
    default: return {}
  }
}

// Hook-free [ID] generator for new blocks in the editor
let _seq = 1
export function tempBlockId(): string { return `tmp-${Date.now()}-${_seq++}` }
