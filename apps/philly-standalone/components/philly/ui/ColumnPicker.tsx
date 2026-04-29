'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Columns3, RotateCcw } from 'lucide-react'

/* Bundle AC — column toggle popover for list-view tables. */

export interface ColumnDef {
  id: string
  label: string
  /** If true, the column is always shown and not togglable. */
  required?: boolean
}

interface Props {
  columns: ColumnDef[]
  visible: Set<string>
  onToggle: (id: string) => void
  onReset: () => void
  isOverridden: boolean
}

export function ColumnPicker({ columns, visible, onToggle, onReset, isOverridden }: Props) {
  const t = useTranslations('columns')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const togglableCount = columns.filter((c) => !c.required).length
  const visibleTogglableCount = columns.filter((c) => !c.required && visible.has(c.id)).length

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t('showHide')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '7px 12px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--panel)',
          fontSize: 12, color: 'var(--txt2)', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <Columns3 size={14} />
        {t('title')}
        <span
          className="mono"
          style={{
            fontSize: 10, color: 'var(--txt3)',
            padding: '0 5px', borderRadius: 4,
            background: 'var(--bg2)',
          }}
        >
          {visibleTogglableCount}/{togglableCount}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            zIndex: 30,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-md)',
            minWidth: 200,
            padding: 6,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {columns.map((c) => {
              const isVisible = visible.has(c.id)
              const disabled = c.required === true
              return (
                <label
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 6,
                    fontSize: 12.5, color: disabled ? 'var(--txt3)' : 'var(--txt)',
                    cursor: disabled ? 'default' : 'pointer',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--bg2)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    disabled={disabled}
                    onChange={() => !disabled && onToggle(c.id)}
                    style={{ accentColor: 'var(--accent)', cursor: 'inherit' }}
                  />
                  <span style={{ flex: 1 }}>{c.label}</span>
                  {disabled && (
                    <span
                      style={{
                        fontSize: 9.5, color: 'var(--txt3)',
                        textTransform: 'uppercase', letterSpacing: '.06em',
                      }}
                    >
                      {t('always')}
                    </span>
                  )}
                </label>
              )
            })}
          </div>
          {isOverridden && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
              <button
                type="button"
                onClick={() => { onReset(); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '6px 10px', borderRadius: 6,
                  fontSize: 12, fontWeight: 500,
                  background: 'transparent', color: 'var(--txt2)',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <RotateCcw size={11} />
                {t('resetDefaults')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
