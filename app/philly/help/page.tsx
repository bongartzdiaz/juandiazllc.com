'use client'

/* DEUS Help Center — full-page surface.
 *
 * Layout:
 *   - Sidebar with categories (sticky)
 *   - Main column: search box + article list (default) or article view
 *   - Footer with "Still stuck? email support@lucen.ai"
 *
 * Routing convention:
 *   /philly/help                    → category overview
 *   /philly/help?c=calendar         → category filter
 *   /philly/help?q=invite           → search
 *   /philly/help?a=connect-google-calendar → article view
 *
 * No DB calls — the entire corpus is in lib/philly/help/articles.ts
 * imported at module-eval time. Search runs in-browser.
 */

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  searchArticles,
  getArticle,
  getArticlesInCategory,
  type HelpArticle,
  type HelpCategoryKey,
} from '@/lib/philly/help/articles'

export default function HelpPage() {
  const t = useTranslations('help')
  const locale = useLocale()
  const showLanguageNotice = locale !== 'en'
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<HelpCategoryKey | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  // Read query string on mount + when navigation events fire. We use
  // window.location directly so the page works under both server-render
  // and client-only navigation.
  useEffect(() => {
    const apply = () => {
      const params = new URLSearchParams(window.location.search)
      setQuery(params.get('q') ?? '')
      const c = params.get('c')
      setActiveCategory(c && HELP_CATEGORIES.some((cat) => cat.key === c) ? (c as HelpCategoryKey) : null)
      setActiveSlug(params.get('a'))
    }
    apply()
    window.addEventListener('popstate', apply)
    return () => window.removeEventListener('popstate', apply)
  }, [])

  const navigate = (params: { q?: string; c?: HelpCategoryKey | null; a?: string | null }) => {
    const url = new URL(window.location.href)
    if (params.q !== undefined) {
      params.q ? url.searchParams.set('q', params.q) : url.searchParams.delete('q')
      setQuery(params.q ?? '')
    }
    if (params.c !== undefined) {
      params.c ? url.searchParams.set('c', params.c) : url.searchParams.delete('c')
      setActiveCategory(params.c ?? null)
    }
    if (params.a !== undefined) {
      params.a ? url.searchParams.set('a', params.a) : url.searchParams.delete('a')
      setActiveSlug(params.a ?? null)
    }
    window.history.pushState({}, '', url.toString())
  }

  const article = activeSlug ? getArticle(activeSlug) : null
  const visibleArticles = useMemo<HelpArticle[]>(() => {
    if (query) return searchArticles(query)
    if (activeCategory) return getArticlesInCategory(activeCategory)
    return HELP_ARTICLES
  }, [query, activeCategory])

  return (
    <>
      <Topbar title="Help center" sub="Answers, walkthroughs, and a real human if all else fails." />
      <div className="philly-help-grid">
        <aside className="philly-help-sidebar">
          <h2 style={{ fontSize: 13, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 12px' }}>
            Help center
          </h2>
          <nav style={{ display: 'grid', gap: 4 }}>
            <button onClick={() => navigate({ c: null, a: null, q: '' })} style={navItemStyle(activeCategory === null && !activeSlug && !query)}>
              All articles
            </button>
            {HELP_CATEGORIES.map((cat) => (
              <button key={cat.key} onClick={() => navigate({ c: cat.key, a: null, q: '' })} style={navItemStyle(activeCategory === cat.key)}>
                {cat.label}
              </button>
            ))}
          </nav>
        </aside>

        <main>
          {article ? (
            <ArticleView article={article} onBack={() => navigate({ a: null })} />
          ) : (
            <>
              <header style={{ marginBottom: 24 }}>
                <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700 }}>
                  {activeCategory
                    ? HELP_CATEGORIES.find((c) => c.key === activeCategory)?.label
                    : query
                      ? `Search: "${query}"`
                      : 'How can we help?'}
                </h1>
                {activeCategory && (
                  <p style={{ margin: 0, opacity: 0.7, fontSize: 15 }}>
                    {HELP_CATEGORIES.find((c) => c.key === activeCategory)?.description}
                  </p>
                )}
              </header>
              {showLanguageNotice && (
                <div
                  role="note"
                  style={{
                    margin: '0 0 16px',
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {t('languageNotice')}
                </div>
              )}
              <div style={{ marginBottom: 24 }}>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => navigate({ q: e.target.value, c: null })}
                  placeholder={t('searchShort')}
                  aria-label={t('search')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 15,
                    borderRadius: 8,
                    border: '1px solid var(--bd, #e5e7eb)',
                    background: 'var(--bg, white)',
                    color: 'inherit',
                  }}
                />
              </div>
              {visibleArticles.length === 0 ? (
                <EmptyResults query={query} />
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                  {visibleArticles.map((a) => (
                    <li key={a.slug}>
                      <button onClick={() => navigate({ a: a.slug })} style={cardButtonStyle}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{a.title}</div>
                        <div style={{ fontSize: 13, opacity: 0.7 }}>{a.summary}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <StillStuck />
            </>
          )}
        </main>
      </div>
    </>
  )
}

function ArticleView({ article, onBack }: { article: HelpArticle; onBack: () => void }) {
  return (
    <article>
      <button onClick={onBack} style={{ ...cardButtonStyle, padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
        ← Back to articles
      </button>
      <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>{article.title}</h1>
      <p style={{ margin: '0 0 24px', fontSize: 16, opacity: 0.75 }}>{article.summary}</p>
      <div style={{ fontSize: 15, lineHeight: 1.65 }}>
        {article.body.split('\n\n').map((para, i) => (
          <p key={i} style={{ margin: '0 0 16px' }}>
            {para}
          </p>
        ))}
        {article.steps && article.steps.length > 0 && (
          <ol style={{ paddingLeft: 22, margin: '8px 0 24px' }}>
            {article.steps.map((step, i) => (
              <li key={i} style={{ margin: '0 0 8px' }}>
                {step}
              </li>
            ))}
          </ol>
        )}
        {article.related && article.related.length > 0 && (
          <div style={{ marginTop: 32, padding: 16, borderRadius: 8, background: 'var(--surface-2, rgba(0,0,0,0.03))' }}>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.6, marginBottom: 8 }}>RELATED</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
              {article.related.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} style={{ fontSize: 14 }}>
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <StillStuck />
    </article>
  )
}

function EmptyResults({ query }: { query: string }) {
  return (
    <div style={{ padding: 24, borderRadius: 8, border: '1px dashed var(--bd, #e5e7eb)', textAlign: 'center', opacity: 0.7 }}>
      <p style={{ margin: '0 0 4px', fontWeight: 500 }}>
        Nothing matches "{query}".
      </p>
      <p style={{ margin: 0, fontSize: 14 }}>
        Try a different keyword, browse a category in the sidebar, or email{' '}
        <a href="mailto:support@lucen.ai">support@lucen.ai</a>.
      </p>
    </div>
  )
}

function StillStuck() {
  return (
    <div
      style={{
        marginTop: 48,
        padding: 20,
        borderRadius: 12,
        background: 'linear-gradient(180deg, rgba(14,107,68,0.06), rgba(14,107,68,0.02))',
        border: '1px solid rgba(14,107,68,0.15)',
      }}
    >
      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>Still stuck?</h3>
      <p style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.8 }}>
        Email <a href="mailto:support@lucen.ai">support@lucen.ai</a>. Real human, EU business hours, reply within one working day.
      </p>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>
        Include what you tried, what you expected, what happened. Screenshots help.
      </p>
    </div>
  )
}

function navItemStyle(active: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '8px 12px',
    borderRadius: 6,
    border: 'none',
    background: active ? 'var(--g, #0E6B44)' : 'transparent',
    color: active ? 'white' : 'inherit',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
  }
}

const cardButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: 16,
  borderRadius: 8,
  border: '1px solid var(--bd, #e5e7eb)',
  background: 'var(--bg, white)',
  color: 'inherit',
  cursor: 'pointer',
  transition: 'border-color 120ms',
}
