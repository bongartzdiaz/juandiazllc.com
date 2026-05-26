/* /help — searchable FAQ page.
   ──────────────────────────────────────────────────────────────────
   Linked from the sidebar nav (icon-only since the screen exists
   in 5 locales). Public to authenticated users.

   Design notes:
   - Server component for SEO (FAQ Schema.org markup adds organic reach)
   - Client-side search filters questions live as user types
   - Category tabs + accordion per question
   - No /api endpoint — content lives entirely in i18n strings */

'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Search, ChevronDown, MessageCircle } from 'lucide-react'
import { FAQ_CATEGORIES, type FAQCategory } from '@/lib/philly/help/faqs'

export default function HelpPage() {
  const t = useTranslations('help')
  const [query, setQuery] = useState('')
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<FAQCategory['id'] | 'all'>('all')

  // Build the flat list of questions, then filter by query + category.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const items: Array<{ catId: FAQCategory['id']; questionId: string }> = []
    for (const cat of FAQ_CATEGORIES) {
      if (activeCategory !== 'all' && activeCategory !== cat.id) continue
      for (const qid of cat.questionIds) {
        if (!q) {
          items.push({ catId: cat.id, questionId: qid })
        } else {
          // Filter by case-insensitive substring match on Q or A.
          const question = t(`faqs.${cat.id}.${qid}.q`).toLowerCase()
          const answer = t(`faqs.${cat.id}.${qid}.a`).toLowerCase()
          if (question.includes(q) || answer.includes(q)) {
            items.push({ catId: cat.id, questionId: qid })
          }
        }
      }
    }
    return items
  }, [query, activeCategory, t])

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '24px 32px', maxWidth: 880 }}>
        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--txt3)',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontSize: 13,
              background: 'var(--panel)',
              color: 'var(--txt)',
            }}
          />
        </div>

        {/* Category tabs */}
        <div
          role="tablist"
          aria-label={t('categoriesAriaLabel')}
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 18,
            flexWrap: 'wrap',
          }}
        >
          <CategoryTab
            active={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
            label={t('allCategories')}
          />
          {FAQ_CATEGORIES.map(cat => (
            <CategoryTab
              key={cat.id}
              active={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
              label={t(`categories.${cat.i18nKey}`)}
            />
          ))}
        </div>

        {/* FAQ accordion */}
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '40px 0',
              textAlign: 'center',
              color: 'var(--txt3)',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
          >
            {t('noResults')}
          </div>
        ) : (
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {filtered.map(({ catId, questionId }, idx) => {
              const id = `${catId}-${questionId}`
              const isOpen = openQuestion === id
              return (
                <div
                  key={id}
                  style={{
                    borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenQuestion(isOpen ? null : id)}
                    aria-expanded={isOpen}
                    aria-controls={`${id}-panel`}
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      color: 'var(--txt)',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    <span>{t(`faqs.${catId}.${questionId}.q`)}</span>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 150ms ease',
                        color: 'var(--txt3)',
                        flexShrink: 0,
                        marginLeft: 12,
                      }}
                    />
                  </button>
                  {isOpen && (
                    <div
                      id={`${id}-panel`}
                      role="region"
                      style={{
                        padding: '0 20px 16px 20px',
                        color: 'var(--txt2)',
                        fontSize: 13,
                        lineHeight: 1.65,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {t(`faqs.${catId}.${questionId}.a`)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Still need help footer */}
        <div
          style={{
            marginTop: 24,
            padding: '16px 20px',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
            borderRadius: 10,
            color: 'var(--accent-txt)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <MessageCircle size={16} aria-hidden="true" />
          <span style={{ flex: 1 }}>{t('stillStuck')}</span>
          <a
            href="mailto:juan@philanthropyai.eu"
            style={{
              color: 'var(--accent-txt)',
              fontWeight: 600,
              textDecoration: 'underline',
            }}
          >
            {t('contactSupport')}
          </a>
        </div>
      </div>
    </>
  )
}

function CategoryTab({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 7,
        background: active ? 'var(--accent)' : 'var(--bg2)',
        color: active ? '#fff' : 'var(--txt2)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )
}
