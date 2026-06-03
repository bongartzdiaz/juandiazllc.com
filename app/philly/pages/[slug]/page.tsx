'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import { BlockRenderer, parseBlock, type Block } from '@/components/philly/pagebuilder/BlockRenderer'
import { Pencil, ArrowLeft } from 'lucide-react'

interface PageData {
  id: string
  title: string
  slug: string
  updatedAt: string
  blocks: { id: string; type: string; content: string; position: number }[]
}

export default function PageView() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/philly/api/pages/${slug}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(j => { if (j?.data) setPage(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  if (notFound) {
    return (
      <>
        <Topbar title="Page not found" sub="" />
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--txt3)', marginBottom: 14 }}>
            This page does not exist or has been deleted.
          </div>
          <Link href="/philly/pages" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 7,
            background: 'var(--accent)', color: 'var(--accent-fg)',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            <ArrowLeft size={13} /> Back to pages
          </Link>
        </div>
      </>
    )
  }

  if (loading || !page) {
    return (
      <>
        <Topbar title="Loading…" sub="" />
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading page…</div>
      </>
    )
  }

  const blocks: Block[] = page.blocks.map(parseBlock)

  return (
    <>
      <Topbar title={page.title} sub={`/pages/${page.slug}`} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Link href="/philly/pages" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            color: 'var(--txt3)', fontSize: 12, fontWeight: 500,
            textDecoration: 'none',
          }}>
            <ArrowLeft size={12} /> All pages
          </Link>
          <Link href={`/pages/${page.slug}/edit`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 7,
            background: 'var(--accent)', color: 'var(--accent-fg)',
            fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
          }}>
            <Pencil size={12} /> Edit page
          </Link>
        </div>

        <div style={{
          maxWidth: 880, margin: '0 auto',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {blocks.length === 0 ? (
            <div style={{
              padding: 40, textAlign: 'center',
              background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 12,
              color: 'var(--txt3)', fontSize: 13,
            }}>
              This page has no content yet.{' '}
              <Link href={`/pages/${page.slug}/edit`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Add your first block
              </Link>
            </div>
          ) : blocks.map((b, i) => <BlockRenderer key={i} block={b} />)}
        </div>
      </div>
    </>
  )
}
