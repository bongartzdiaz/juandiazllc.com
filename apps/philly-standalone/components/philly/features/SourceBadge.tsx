/* SourceBadge — renders one of the 8 ResolveReason values as an
   accessible, i18n'd, color-coded badge.
   ──────────────────────────────────────────────────────────────────
   The `source` field on ResolveResult IS the UX contract — this badge
   is where users finally SEE why a feature is on or off.

   Mapping:
     enabled                              → green   "Enabled"
     super-admin-forced-on                → accent  "Force-enabled (platform)"
     super-admin-forced-on-out-of-plan    → purple  "Force-enabled (preview)"
     super-admin-forced-off               → red     "Force-disabled (platform)"
     plan-not-included                    → yellow  "Not in plan"
     global-disabled                      → red     "Globally disabled"
     client-admin-disabled                → grey    "Org-disabled"
     default-disabled                     → grey    "Disabled (default)"

   Used by both the super-admin matrix page (PR-3) and the client-admin
   refactor (PR-4). Single source of truth keeps the badge's appearance
   consistent across both surfaces. */

'use client'

import { useTranslations } from 'next-intl'
import type { ResolveReason } from '@/lib/philly/features/resolve'

interface SourceBadgeProps {
  source: ResolveReason
  /** Whether the FEATURE is enabled — drives the leading icon (✓ or ✗). */
  enabled: boolean
}

// Color palette per source. Maps to CSS variables already defined in
// the theme — keeps badges visually coherent with the existing settings
// pages (--g-bg for green, --r-bg for red, etc.).
type Palette = 'green' | 'red' | 'yellow' | 'accent' | 'purple' | 'grey'

const SOURCE_PALETTE: Record<ResolveReason, Palette> = {
  'enabled': 'green',
  'super-admin-forced-on': 'accent',
  'super-admin-forced-on-out-of-plan': 'purple',
  'super-admin-forced-off': 'red',
  'plan-not-included': 'yellow',
  'global-disabled': 'red',
  'client-admin-disabled': 'grey',
  'default-disabled': 'grey',
}

const PALETTE_STYLES: Record<Palette, { bg: string; border: string; color: string }> = {
  green: { bg: 'var(--g-bg)', border: 'var(--g-border)', color: 'var(--g-txt)' },
  red: { bg: 'var(--r-bg)', border: 'var(--r-border)', color: 'var(--r-txt)' },
  yellow: { bg: 'var(--y-bg)', border: 'var(--y-border)', color: 'var(--y-txt)' },
  accent: { bg: 'var(--accent-bg)', border: 'var(--accent-border)', color: 'var(--accent-txt)' },
  // Purple is not in the standard palette — fall back to accent for now;
  // the PR-3 commit can add `--p-bg/--p-border/--p-txt` to the theme if
  // the purple/accent distinction proves important in practice.
  purple: { bg: 'var(--p-bg, var(--accent-bg))', border: 'var(--p-border, var(--accent-border))', color: 'var(--p-txt, var(--accent-txt))' },
  grey: { bg: 'var(--bg2)', border: 'var(--border)', color: 'var(--txt2)' },
}

export function SourceBadge({ source, enabled }: SourceBadgeProps) {
  // useTranslations call is scoped to the page-level namespace.
  // Pages render this badge inside their own NextIntlClientProvider
  // tree — sourceLabel keys live under `adminFeatures.source.*`.
  const t = useTranslations('adminFeatures.source')
  const palette = SOURCE_PALETTE[source]
  const styles = PALETTE_STYLES[palette]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.color,
        fontSize: 10.5,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 6,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
      aria-label={`${enabled ? 'Enabled' : 'Disabled'} — ${t(source)}`}
      title={t(source)}
    >
      <span aria-hidden="true" style={{ fontSize: 10 }}>
        {enabled ? '✓' : '✗'}
      </span>
      {t(source)}
    </span>
  )
}
