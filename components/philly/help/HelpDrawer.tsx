'use client'

/* Floating Help drawer.
 *
 * Renders a small "?" button bottom-right on every authenticated philly
 * page (mounted in app/philly/layout.tsx). Click opens a side drawer
 * with the same article corpus as /philly/help — search, browse, read.
 *
 * Why a drawer instead of a chatbot:
 *   - On-brand: "real human on support, EU hours" was the positioning
 *     advantage. A bot saying "let me check our knowledge base"
 *     undercuts that.
 *   - Predictable: no hallucinations on billing or compliance answers.
 *   - Cheap: zero infra, zero per-session cost, instant response.
 *   - Honest fallback: every dead end ends in "email support@lucen.ai
 *     — real human, working day reply".
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HELP_ARTICLES,
  searchArticles,
  getArticle,
  type HelpArticle,
} from '@/lib/philly/help/articles'

export default function HelpDrawer() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Hide the floating button on the full help center — duplicate UI
  // and the user is clearly already deep in help mode. Must compute
  // AFTER all hooks (useEffect / useMemo below) to keep hook order
  // stable across renders.
  const isOnHelpPage = pathname?.startsWith('/philly/help') ?? false

  // Close on Escape, focus the search input when opened.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    // Defer focus so the drawer is mounted before we steal focus.
    const tid = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(tid)
    }
  }, [open])

  const article = activeSlug ? getArticle(activeSlug) : null
  const visible = useMemo<HelpArticle[]>(
    () => (query ? searchArticles(query) : HELP_ARTICLES.slice(0, 8)),
    [query],
  )

  // Bail AFTER all hooks have run — see comment above.
  if (isOnHelpPage) return null

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close help' : 'Open help'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: 24,
          border: 'none',
          background: 'var(--g, #0E6B44)',
          color: 'white',
          fontSize: 22,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          zIndex: 50,
        }}
      >
        {open ? '×' : '?'}
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.30)',
              zIndex: 49,
            }}
          />
          <aside
            role="dialog"
            aria-label="Help"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(420px, 100vw)',
              background: 'var(--bg, white)',
              borderLeft: '1px solid var(--bd, #e5e7eb)',
              boxShadow: '-8px 0 28px rgba(0,0,0,0.12)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <header
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--bd, #e5e7eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15 }}>Help</div>
              <Link
                href="/philly/help"
                style={{ fontSize: 12, opacity: 0.7 }}
                onClick={() => setOpen(false)}
              >
                Open full help center →
              </Link>
            </header>
            <div style={{ padding: 12, borderBottom: '1px solid var(--bd, #e5e7eb)' }}>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveSlug(null)
                }}
                placeholder="Search…"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  borderRadius: 6,
                  border: '1px solid var(--bd, #e5e7eb)',
                  background: 'var(--bg, white)',
                  color: 'inherit',
                }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {article ? (
                <DrawerArticleView article={article} onBack={() => setActiveSlug(null)} />
              ) : visible.length === 0 ? (
                <DrawerEmpty query={query} />
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                  {visible.map((a) => (
                    <li key={a.slug}>
                      <button
                        onClick={() => setActiveSlug(a.slug)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: 10,
                          borderRadius: 6,
                          border: '1px solid var(--bd, #e5e7eb)',
                          background: 'transparent',
                          color: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>
                          {a.title}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.65 }}>{a.summary}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <footer
              style={{
                padding: 12,
                borderTop: '1px solid var(--bd, #e5e7eb)',
                fontSize: 12,
                opacity: 0.7,
                textAlign: 'center',
              }}
            >
              Still stuck? <a href="mailto:support@lucen.ai">support@lucen.ai</a> — real human, EU hours.
            </footer>
          </aside>
        </>
      )}
    </>
  )
}

function DrawerArticleView({ article, onBack }: { article: HelpArticle; onBack: () => void }) {
  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          padding: '4px 0',
          fontSize: 12,
          opacity: 0.7,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        ← Back
      </button>
      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{article.title}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.75 }}>{article.summary}</p>
      <div style={{ fontSize: 13, lineHeight: 1.55 }}>
        {article.body.split('\n\n').map((para, i) => (
          <p key={i} style={{ margin: '0 0 10px' }}>
            {para}
          </p>
        ))}
        {article.steps && (
          <ol style={{ paddingLeft: 18, margin: '8px 0' }}>
            {article.steps.map((step, i) => (
              <li key={i} style={{ margin: '0 0 6px' }}>
                {step}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function DrawerEmpty({ query }: { query: string }) {
  return (
    <div style={{ padding: 16, fontSize: 13, opacity: 0.7, textAlign: 'center' }}>
      Nothing matches "{query}". Try a different keyword, or email{' '}
      <a href="mailto:support@lucen.ai">support@lucen.ai</a>.
    </div>
  )
}
