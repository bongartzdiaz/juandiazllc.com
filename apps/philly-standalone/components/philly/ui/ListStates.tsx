'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Inbox, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'

/* FE-01 — shared list-state primitives. One consistent, accessible,
 * theme-aware, i18n way for every list page to render its loading /
 * empty / error states. Extracted from the proven contacts/projects
 * pattern so the sweep across ~46 pages stays mechanical.
 *
 * Accessibility (also closes A11Y-05 error-wiring):
 *   - ListLoading: role="status" + aria-live="polite"
 *   - ListError:   role="alert"  (assertive announcement)
 *   - retry is a real <button> with an accessible label
 */

const panelStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '40px 24px',
  textAlign: 'center' as const,
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--txt2)',
}

/** Inline loading banner — shown while a useApi call is in flight and no
 *  cached data is available yet. `label` defaults to common.loading. */
export function ListLoading({ label }: { label?: string }) {
  const t = useTranslations('common')
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ ...panelStyle, padding: '28px 24px' }}
    >
      <Loader2 size={20} color="var(--txt3)" style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 13 }}>{label ?? t('loading')}</span>
    </div>
  )
}

/** Empty state — shown when the list loaded successfully but has 0 rows.
 *  Pass an `action` (e.g. an "Add" button) to give the user a next step. */
export function ListEmpty({
  title,
  hint,
  icon,
  action,
}: {
  title?: string
  hint?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  const t = useTranslations('common')
  return (
    <div style={panelStyle}>
      <div style={{ color: 'var(--txt3)' }}>{icon ?? <Inbox size={28} />}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>{title ?? t('emptyTitle')}</div>
      <div style={{ fontSize: 12.5, maxWidth: 360 }}>{hint ?? t('emptyHint')}</div>
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  )
}

/** Error state — shown when a useApi call failed. Wires a retry button to
 *  the hook's `refetch`. role="alert" so screen readers announce it. */
export function ListError({
  onRetry,
  message,
}: {
  onRetry?: () => void
  message?: string | null
}) {
  const t = useTranslations('common')
  return (
    <div role="alert" style={{ ...panelStyle, borderColor: 'var(--r-border)', background: 'var(--r-bg)' }}>
      <AlertCircle size={26} color="var(--r-txt)" />
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--r-txt)' }}>{t('loadFailed')}</div>
      {message && <div style={{ fontSize: 12, color: 'var(--txt2)', maxWidth: 360 }}>{message}</div>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          aria-label={t('retry')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 6, padding: '7px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--panel)',
            color: 'var(--txt)', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={13} />
          {t('retry')}
        </button>
      )}
    </div>
  )
}
