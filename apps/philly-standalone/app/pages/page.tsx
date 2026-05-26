'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { Topbar } from '@/components/philly/layout/Topbar'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { useApi } from '@/hooks/philly/useApi'
import { FileText, Layers, Calendar, Trash2, Pencil, ExternalLink } from 'lucide-react'

interface PageRow {
  id: string
  title: string
  slug: string
  createdAt: string
  updatedAt: string
  _count?: { blocks: number }
}

export default function PagesListPage() {
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()

  interface PagesResponse { data: PageRow[] }
  const pagesQuery = useApi<PagesResponse>('/pages')
  const pages = pagesQuery.data?.data ?? []
  const loading = pagesQuery.loading
  const fetchData = pagesQuery.refetch

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          slug: newSlug.trim() || undefined,
          blocks: [{ type: 'text', content: { html: `<h1>${newTitle.trim()}</h1><p>Start editing this page…</p>` } }],
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error ?? 'Failed to create page')
      setShowNew(false); setNewTitle(''); setNewSlug('')
      router.push(`/pages/${j.data.slug}/edit`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: tConfirms('deleteGeneric.title', { entityType: tConfirms('entities.page') }),
      body: tConfirms('deleteGeneric.body'),
      confirmLabel: tCommon('delete'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    const r = await fetch(`/api/pages/${id}`, { method: 'DELETE' })
    if (r.ok) fetchData()
  }

  const totalBlocks = pages.reduce((sum, p) => sum + (p._count?.blocks ?? 0), 0)
  const recentlyUpdated = pages.filter(p => {
    const diff = Date.now() - new Date(p.updatedAt).getTime()
    return diff < 7 * 24 * 3600 * 1000
  }).length

  return (
    <>
      <Topbar title="Pages" sub="Custom pages and dashboards" onAdd={() => setShowNew(true)} addLabel="Page" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="file-text" label="Total Pages" value={String(pages.length)} />
          <KpiCard icon="folder" label="Total Blocks" value={String(totalBlocks)} />
          <KpiCard icon="calendar" label="Updated This Week" value={String(recentlyUpdated)} />
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading…</div>
        ) : pages.length === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center', background: 'var(--panel)',
            border: '1px dashed var(--border)', borderRadius: 12,
          }}>
            <FileText size={32} color="var(--txt3)" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No custom pages yet</div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>
              Build your own dashboards, reports, and knowledge base.
            </div>
            <button
              onClick={() => setShowNew(true)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff', fontWeight: 600,
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Create your first page
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12,
          }}>
            {pages.map(p => (
              <div key={p.id} style={{
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title}
                    </div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--txt3)' }}>
                      /pages/{p.slug}
                    </div>
                  </div>
                  <div style={{
                    padding: '3px 8px', borderRadius: 6,
                    background: 'var(--b-bg)', color: 'var(--b-txt)',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Layers size={10} />
                    {p._count?.blocks ?? 0}
                  </div>
                </div>

                <div className="mono" style={{ fontSize: 10, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={10} />
                  Updated {new Date(p.updatedAt).toLocaleDateString()}
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  <Link
                    href={`/pages/${p.slug}`}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 7,
                      background: 'var(--bg2)', color: 'var(--txt2)',
                      fontSize: 11.5, fontWeight: 600, textAlign: 'center',
                      textDecoration: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <ExternalLink size={11} /> View
                  </Link>
                  <Link
                    href={`/pages/${p.slug}/edit`}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 7,
                      background: 'var(--accent)', color: '#fff',
                      fontSize: 11.5, fontWeight: 600, textAlign: 'center',
                      textDecoration: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <Pencil size={11} /> Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id)}
                    title="Delete page"
                    style={{
                      padding: '6px 10px', borderRadius: 7, border: 'none',
                      background: 'var(--r-bg)', color: 'var(--r-txt)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Page" subtitle="Create a custom page or dashboard">
        <FormField label="Title" required>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Q2 Marketing Plan"
            autoFocus
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--txt)', fontSize: 13,
            }}
          />
        </FormField>
        <FormField label="URL Slug (optional)">
          <input
            value={newSlug}
            onChange={e => setNewSlug(e.target.value)}
            placeholder="auto-generated from title"
            className="mono"
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--txt)', fontSize: 12,
            }}
          />
        </FormField>
        {err && <div style={{ color: 'var(--r-txt)', fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <button
            onClick={() => setShowNew(false)}
            style={{
              padding: '7px 14px', borderRadius: 7,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              fontSize: 12.5, fontWeight: 600, color: 'var(--txt2)', cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleCreate}
            disabled={busy || !newTitle.trim()}
            style={{
              padding: '7px 14px', borderRadius: 7, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 12.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer',
              opacity: !newTitle.trim() ? 0.5 : 1,
            }}
          >{busy ? 'Creating…' : 'Create & Edit'}</button>
        </div>
      </Modal>
    </>
  )
}
