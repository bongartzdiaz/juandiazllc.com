'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { FileText, File, Image, FileSpreadsheet, Download, Clock, Filter } from 'lucide-react'

interface Doc {
  id: string
  name: string
  type: string
  mimeType: string
  sizeBytes: number
  url: string
  entityType: string | null
  entityId: string | null
  createdAt: string
}

const TYPE_ICONS: Record<string, any> = { file: File, image: Image, pdf: FileText, spreadsheet: FileSpreadsheet }

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (typeFilter) params.set('entityType', typeFilter)
      const res = await fetch(`/api/documents?${params}`)
      const json = await res.json()
      setDocs(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setDocs([]) }
    finally { setLoading(false) }
  }, [page, typeFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <>
      <Topbar title="Documents" sub="File management and storage" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">All Types</option>
              <option value="project">Projects</option>
              <option value="contact">Contacts</option>
              <option value="deal">Deals</option>
              <option value="property">Properties</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : docs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} /> No documents found.
            </div>
          ) : docs.map(doc => {
            const Icon = TYPE_ICONS[doc.type] ?? File
            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={14} style={{ color: 'var(--accent-txt)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)', display: 'flex', gap: 8 }}>
                    <span>{formatSize(doc.sizeBytes)}</span>
                    {doc.entityType && <span>{doc.entityType}</span>}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} /> {new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--txt2)', display: 'flex', cursor: 'pointer' }}>
                  <Download size={14} />
                </a>
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </>
  )
}
