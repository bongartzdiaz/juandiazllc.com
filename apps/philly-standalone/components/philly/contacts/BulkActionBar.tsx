'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Download, Trash2, Edit3, X, Check } from 'lucide-react'

/* Bundle X — sticky bulk-action bar shown at the bottom of the
   contacts list when one or more rows are selected. Reusable
   shape so deals/properties/projects can lift the same bar later;
   for now the contact-specific actions are bound here directly. */

const TYPE_OPTIONS_PHIL = ['partner', 'donor', 'stakeholder', 'beneficiary'] as const
const TYPE_OPTIONS_RE = ['buyer', 'seller', 'tenant', 'investor', 'landlord'] as const
const TYPE_OPTIONS_HOS = ['guest', 'vendor', 'partner', 'staff'] as const

export type ContactTypeOption =
  | (typeof TYPE_OPTIONS_PHIL)[number]
  | (typeof TYPE_OPTIONS_RE)[number]
  | (typeof TYPE_OPTIONS_HOS)[number]

interface Props {
  count: number
  industry: 'philanthropy' | 'realestate' | 'hospitality'
  busy?: boolean
  onClear: () => void
  onExport: () => void
  onDelete: () => void
  onChangeType: (type: ContactTypeOption) => void
}

export function BulkActionBar({ count, industry, busy, onClear, onExport, onDelete, onChangeType }: Props) {
  const t = useTranslations('bulk')
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const types: readonly string[] =
    industry === 'realestate' ? TYPE_OPTIONS_RE
    : industry === 'hospitality' ? TYPE_OPTIONS_HOS
    : TYPE_OPTIONS_PHIL

  if (count === 0) return null

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      style={{
        position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-lg)',
        fontSize: 12,
      }}
    >
      <span style={{
        fontSize: 12, fontWeight: 700,
        padding: '4px 10px', borderRadius: 6,
        background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        color: 'var(--accent)',
      }}>
        {t('selected', { count })}
      </span>

      <button
        type="button"
        onClick={onExport}
        disabled={busy}
        style={btnStyle('default', busy)}
      >
        <Download size={13} /> {t('exportCsv')}
      </button>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setTypeMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={typeMenuOpen}
          disabled={busy}
          style={btnStyle('default', busy)}
        >
          <Edit3 size={13} /> {t('changeType')}
        </button>
        {typeMenuOpen && (
          <div
            role="menu"
            style={{
              position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-md)',
              minWidth: 160,
              padding: 4,
            }}
          >
            {types.map((tp) => (
              <button
                key={tp}
                type="button"
                role="menuitem"
                onClick={() => { setTypeMenuOpen(false); onChangeType(tp as ContactTypeOption) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '7px 10px', borderRadius: 7,
                  border: 'none', background: 'transparent',
                  textAlign: 'left', fontSize: 12, fontWeight: 500,
                  color: 'var(--txt)', cursor: 'pointer',
                  textTransform: 'capitalize', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <Check size={11} color="var(--txt3)" /> {tp}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        style={btnStyle('danger', busy)}
      >
        <Trash2 size={13} /> {t('delete')}
      </button>

      <span style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} />

      <button
        type="button"
        onClick={onClear}
        disabled={busy}
        aria-label={t('clearSelection')}
        style={btnStyle('ghost', busy)}
      >
        <X size={13} />
      </button>
    </div>
  )
}

function btnStyle(variant: 'default' | 'ghost' | 'danger', busy?: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 7,
    fontSize: 12, fontWeight: 600,
    cursor: busy ? 'default' : 'pointer',
    fontFamily: 'inherit',
    opacity: busy ? 0.55 : 1,
  }
  if (variant === 'danger') {
    return {
      ...base,
      background: 'var(--r-bg)', color: 'var(--r-txt)',
      border: '1px solid var(--r-border)',
    }
  }
  if (variant === 'ghost') {
    return {
      ...base,
      background: 'transparent', color: 'var(--txt2)',
      border: '1px solid transparent',
      padding: '6px 8px',
    }
  }
  return {
    ...base,
    background: 'var(--bg2)', color: 'var(--txt)',
    border: '1px solid var(--border)',
  }
}
