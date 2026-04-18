'use client'

import { useEffect, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { DataTable, type DataTableColumn } from '@/components/philly/ui/DataTable'
import { FilterBuilder, QuickSearch, applyFilter, emptyFilter, type FilterField, type FilterGroup } from '@/components/philly/ui/FilterBuilder'
import { FileUpload } from '@/components/philly/ui/FileUpload'
import {
  FileText, FileImage, FileSpreadsheet, FileArchive, File as FileIcon,
  Download, ExternalLink, Upload, Trash2, X,
} from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'

interface Doc {
  id: string
  name: string
  type: string
  mimeType: string
  sizeBytes: number
  url: string
  entityType: string | null
  entityId: string | null
  uploadedBy: string | null
  createdAt: string
}

const ICON_BY_TYPE = (mime: string, type: string): React.ComponentType<{ size?: number; color?: string }> => {
  if (type === 'image' || mime.startsWith('image/')) return FileImage
  if (type === 'pdf' || mime.includes('pdf')) return FileText
  if (type === 'spreadsheet' || /sheet|csv|excel/.test(mime)) return FileSpreadsheet
  if (/zip|rar|gzip|7z/.test(mime)) return FileArchive
  return FileIcon
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let i = 0
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const FILTER_FIELDS: FilterField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'type', label: 'Type', type: 'select', options: [
    { value: 'file', label: 'File' },
    { value: 'image', label: 'Image' },
    { value: 'pdf', label: 'PDF' },
    { value: 'spreadsheet', label: 'Spreadsheet' },
  ]},
  { key: 'mimeType', label: 'MIME type', type: 'text' },
  { key: 'sizeBytes', label: 'Size (bytes)', type: 'number' },
  { key: 'entityType', label: 'Linked to', type: 'select', options: [
    { value: 'project', label: 'Project' },
    { value: 'contact', label: 'Contact' },
    { value: 'deal', label: 'Deal' },
    { value: 'property', label: 'Property' },
    { value: 'room', label: 'Room' },
  ]},
]

export default function DocumentsPage() {
  const t = useTranslations('documents')
  const { addToast } = useToast()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterGroup>(emptyFilter())
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [showFilter, setShowFilter] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const [upName, setUpName] = useState('')
  const [upUrl, setUpUrl] = useState('')
  const [upType, setUpType] = useState('file')
  const [upMime, setUpMime] = useState('')
  const [upSize, setUpSize] = useState(0)
  const [upEntity, setUpEntity] = useState('')
  const [upErr, setUpErr] = useState<string | null>(null)
  const [upBusy, setUpBusy] = useState(false)

  const fetchDocs = () => {
    setLoading(true)
    fetch('/philly/api/documents?limit=200')
      .then(r => r.json())
      .then(j => setDocs(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDocs() }, [])
  useEntitySubscription('document', () => { fetchDocs() })

  const filtered = useMemo(() => {
    let out = applyFilter(docs as unknown as Record<string, unknown>[], filter) as unknown as Doc[]
    const q = search.trim().toLowerCase()
    if (q) out = out.filter(d => d.name.toLowerCase().includes(q) || d.mimeType.toLowerCase().includes(q))
    return out
  }, [docs, filter, search])

  const totalSize = docs.reduce((sum, d) => sum + (d.sizeBytes || 0), 0)
  const imageCount = docs.filter(d => d.type === 'image' || d.mimeType.startsWith('image/')).length
  const linkedCount = docs.filter(d => !!d.entityType).length

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return
    try {
      const res = await fetch(`/philly/api/documents/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast('Document deleted', 'success')
        setSelected(s => s.filter(x => x !== id))
        fetchDocs()
      } else {
        addToast('Delete failed', 'error')
      }
    } catch { addToast('Network error', 'error') }
  }

  async function handleBulkDelete() {
    if (selected.length === 0) return
    if (!confirm(`Delete ${selected.length} document${selected.length > 1 ? 's' : ''}? This cannot be undone.`)) return
    const ids = [...selected]
    let succeeded = 0
    let failed = 0
    await Promise.all(ids.map(async (id) => {
      try {
        const res = await fetch(`/philly/api/documents/${id}`, { method: 'DELETE' })
        if (res.status === 204 || res.ok) succeeded++
        else failed++
      } catch { failed++ }
    }))
    if (succeeded > 0) addToast(`Deleted ${succeeded} document${succeeded > 1 ? 's' : ''}`, 'success')
    if (failed > 0) addToast(`${failed} failed to delete`, 'error')
    setSelected([])
    fetchDocs()
  }

  const handleUpload = async () => {
    if (!upName.trim() || !upUrl.trim()) return
    setUpBusy(true); setUpErr(null)
    try {
      const r = await fetch('/philly/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: upName.trim(),
          url: upUrl.trim(),
          type: upType,
          mimeType: upMime,
          sizeBytes: upSize || 0,
          entityType: upEntity || undefined,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error ?? 'Failed to upload')
      setShowUpload(false)
      setUpName(''); setUpUrl(''); setUpMime(''); setUpSize(0); setUpEntity('')
      fetchDocs()
    } catch (e) {
      setUpErr(e instanceof Error ? e.message : 'Failed')
    } finally { setUpBusy(false) }
  }

  const columns: DataTableColumn<Doc>[] = [
    {
      key: 'name', label: 'Name', sortable: true,
      accessor: (d) => {
        const Icon = ICON_BY_TYPE(d.mimeType, d.type)
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon size={14} color="var(--accent)" />
            <span style={{ fontWeight: 600, color: 'var(--txt)' }}>{d.name}</span>
          </span>
        )
      },
    },
    { key: 'type', label: 'Type', sortable: true, width: 110 },
    { key: 'mimeType', label: 'MIME', mono: true, width: 180 },
    {
      key: 'sizeBytes', label: 'Size', sortable: true, mono: true, align: 'right', width: 100,
      accessor: (d) => formatBytes(d.sizeBytes),
    },
    {
      key: 'entityType', label: 'Linked', width: 120,
      accessor: (d) => d.entityType
        ? <span style={{ padding: '2px 7px', borderRadius: 5, background: 'var(--b-bg)', color: 'var(--b-txt)', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' }}>{d.entityType}</span>
        : <span style={{ color: 'var(--txt3)' }}>—</span>,
    },
    {
      key: 'createdAt', label: 'Uploaded', sortable: true, mono: true, width: 120,
      accessor: (d) => new Date(d.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions', label: '', width: 80, align: 'right',
      accessor: (d) => (
        <span style={{ display: 'inline-flex', gap: 5 }} onClick={e => e.stopPropagation()}>
          <a href={d.url} target="_blank" rel="noopener noreferrer" title="Open" style={iconLinkStyle}>
            <ExternalLink size={12} />
          </a>
          <a href={d.url} download title="Download" style={iconLinkStyle}>
            <Download size={12} />
          </a>
        </span>
      ),
    },
  ]

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowUpload(true)} addLabel="Upload" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="folder" label="Total Documents" value={String(docs.length)} />
          <KpiCard icon="chart" label="Total Size" value={formatBytes(totalSize)} />
          <KpiCard icon="award" label="Linked" value={String(linkedCount)} />
          <KpiCard icon="inbox" label="Images" value={String(imageCount)} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <QuickSearch value={search} onChange={setSearch} placeholder="Search name or MIME…" />
          <button
            onClick={() => setShowFilter(s => !s)}
            style={{
              padding: '7px 12px', borderRadius: 7,
              background: showFilter || filter.rules.length ? 'var(--accent-bg)' : 'var(--bg2)',
              border: '1px solid var(--border)',
              color: showFilter || filter.rules.length ? 'var(--accent-txt)' : 'var(--txt2)',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {filter.rules.length > 0 ? `Filters (${filter.rules.length})` : 'Filters'}
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, padding: 3, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7 }}>
            <button
              onClick={() => setView('grid')}
              style={{
                padding: '4px 10px', borderRadius: 5, border: 'none',
                background: view === 'grid' ? 'var(--panel)' : 'transparent',
                color: view === 'grid' ? 'var(--txt)' : 'var(--txt3)',
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
              }}
            >Grid</button>
            <button
              onClick={() => setView('table')}
              style={{
                padding: '4px 10px', borderRadius: 5, border: 'none',
                background: view === 'table' ? 'var(--panel)' : 'transparent',
                color: view === 'table' ? 'var(--txt)' : 'var(--txt3)',
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
              }}
            >Table</button>
          </div>
        </div>

        {showFilter && (
          <div style={{ marginBottom: 12 }}>
            <FilterBuilder fields={FILTER_FIELDS} value={filter} onChange={setFilter} />
          </div>
        )}

        {selected.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 10, marginBottom: 12,
            background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-txt)' }}>
              {selected.length} selected
            </span>
            <button
              onClick={() => setSelected([])}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 6,
                background: 'transparent', color: 'var(--txt2)',
                border: '1px solid var(--border)', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <X size={10} /> Clear
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={handleBulkDelete}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8,
                background: 'var(--r)', color: '#fff',
                border: 'none', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Trash2 size={11} /> Delete {selected.length}
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center', background: 'var(--panel)',
            border: '1px dashed var(--border)', borderRadius: 12,
          }}>
            <FileText size={32} color="var(--txt3)" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No documents</div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>
              {docs.length === 0 ? 'Upload your first document to get started.' : 'No documents match your filters.'}
            </div>
            {docs.length === 0 && (
              <button
                onClick={() => setShowUpload(true)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: 'var(--accent)', color: '#fff', fontWeight: 600,
                  fontSize: 13, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              ><Upload size={12} /> Upload first document</button>
            )}
          </div>
        ) : view === 'grid' ? (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10,
          }}>
            {filtered.map(d => {
              const Icon = ICON_BY_TYPE(d.mimeType, d.type)
              const isSelected = selected.includes(d.id)
              return (
                <div
                  key={d.id}
                  onClick={() => setSelected(s => s.includes(d.id) ? s.filter(x => x !== d.id) : [...s, d.id])}
                  style={{
                    background: 'var(--panel)',
                    border: `${isSelected ? 2 : 1}px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10, padding: 14, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 8,
                    background: 'var(--bg2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} color="var(--accent)" />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--txt3)' }}>
                    {formatBytes(d.sizeBytes)} · {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                  {d.entityType && (
                    <span style={{
                      padding: '2px 7px', borderRadius: 5,
                      background: 'var(--b-bg)', color: 'var(--b-txt)',
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      alignSelf: 'flex-start',
                    }}>{d.entityType}</span>
                  )}
                  <div style={{ display: 'flex', gap: 5, marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ ...iconLinkStyle, flex: 1, padding: '5px 0', justifyContent: 'center' }}>
                      <ExternalLink size={11} /> Open
                    </a>
                    <a href={d.url} download style={{ ...iconLinkStyle, flex: 1, padding: '5px 0', justifyContent: 'center' }}>
                      <Download size={11} /> Save
                    </a>
                    <button
                      onClick={() => handleDelete(d.id)}
                      title="Delete"
                      style={{
                        ...iconLinkStyle,
                        padding: '5px 9px', justifyContent: 'center',
                        border: '1px solid var(--border)',
                        color: 'var(--r-txt)', cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            selectable
            selected={selected}
            onSelectedChange={setSelected}
          />
        )}
      </div>

      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Document" subtitle="Drag & drop a file or add by URL">
        <div style={{ marginBottom: 14 }}>
          <FileUpload
            onUploaded={() => { fetchDocs() }}
          />
        </div>
        <div style={{
          fontSize: 10.5, fontWeight: 700, color: 'var(--txt3)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          margin: '4px 0 8px', textAlign: 'center',
        }}>
          — or add by URL —
        </div>
        <FormField label="Name" required>
          <input value={upName} onChange={e => setUpName(e.target.value)} style={inputStyle} autoFocus />
        </FormField>
        <FormField label="File URL" required>
          <input value={upUrl} onChange={e => setUpUrl(e.target.value)} className="mono" style={{ ...inputStyle, fontSize: 11.5 }} placeholder="https://…" />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormField label="Type">
            <select value={upType} onChange={e => setUpType(e.target.value)} style={inputStyle}>
              <option value="file">File</option>
              <option value="image">Image</option>
              <option value="pdf">PDF</option>
              <option value="spreadsheet">Spreadsheet</option>
            </select>
          </FormField>
          <FormField label="Link to">
            <select value={upEntity} onChange={e => setUpEntity(e.target.value)} style={inputStyle}>
              <option value="">None</option>
              <option value="project">Project</option>
              <option value="contact">Contact</option>
              <option value="deal">Deal</option>
              <option value="property">Property</option>
              <option value="room">Room</option>
            </select>
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormField label="MIME Type">
            <input value={upMime} onChange={e => setUpMime(e.target.value)} className="mono" style={{ ...inputStyle, fontSize: 11.5 }} placeholder="application/pdf" />
          </FormField>
          <FormField label="Size (bytes)">
            <input type="number" value={upSize} onChange={e => setUpSize(Number(e.target.value))} style={inputStyle} />
          </FormField>
        </div>
        {upErr && <div style={{ color: 'var(--r-txt)', fontSize: 12, marginBottom: 8 }}>{upErr}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <button onClick={() => setShowUpload(false)} style={cancelBtn}>Cancel</button>
          <button onClick={handleUpload} disabled={upBusy || !upName.trim() || !upUrl.trim()} style={{
            ...primaryBtn,
            opacity: !upName.trim() || !upUrl.trim() ? 0.5 : 1,
            cursor: upBusy ? 'wait' : 'pointer',
          }}>{upBusy ? 'Uploading…' : 'Upload'}</button>
        </div>
      </Modal>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  color: 'var(--txt)', fontSize: 13,
}
const iconLinkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 8px', borderRadius: 5,
  background: 'var(--bg2)', color: 'var(--txt2)',
  fontSize: 11, fontWeight: 600, textDecoration: 'none',
}
const cancelBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 7,
  background: 'var(--bg2)', border: '1px solid var(--border)',
  fontSize: 12.5, fontWeight: 600, color: 'var(--txt2)', cursor: 'pointer',
}
const primaryBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 7, border: 'none',
  background: 'var(--accent)', color: '#fff',
  fontSize: 12.5, fontWeight: 600,
}
