'use client'

import { useTranslations } from 'next-intl'
import { FlaskConical } from 'lucide-react'

/**
 * Small, theme-aware "Sample data" badge. Rendered on any dashboard widget
 * that is falling back to demo data because the org has no real rows yet.
 * Honest-by-design: the dashboard looks full in a demo, but the badge makes
 * clear the numbers are illustrative, not the tenant's live data.
 *
 * i18n: dashboard.widgets.sampleData / .sampleDataTooltip (5 locales).
 */
export function SampleBadge() {
  const t = useTranslations('dashboard.widgets')
  return (
    <span
      title={t('sampleDataTooltip')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 9.5,
        fontWeight: 600,
        lineHeight: 1,
        padding: '3px 7px',
        borderRadius: 6,
        background: 'var(--y-bg)',
        color: 'var(--y-txt)',
        border: '1px solid var(--y-border)',
        whiteSpace: 'nowrap',
        cursor: 'help',
      }}
    >
      <FlaskConical size={10} />
      {t('sampleData')}
    </span>
  )
}
