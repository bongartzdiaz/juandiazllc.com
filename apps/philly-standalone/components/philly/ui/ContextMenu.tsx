'use client'

import { useEffect, useRef } from 'react'

/* Bundle AD — generic right-click context menu primitive.

   Renders a popover at viewport coordinates (x, y), clamped to
   stay on-screen. Closes on outside click, Escape, scroll, and
   resize. Items can be regular actions, separators, or destructive
   variants.

   Each consumer decides how to compute the items + which entity
   the click is targeting; this component just renders the chrome. */

export type ContextMenuItem =
  | {
      kind: 'action'
      label: string
      icon?: React.ComponentType<{ size?: number }>
      onClick: () => void
      shortcut?: string
      destructive?: boolean
      disabled?: boolean
    }
  | { kind: 'separator' }

interface Props {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onScrollOrResize = () => onClose()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [onClose])

  // Clamp to viewport — assume menu width 200, height up to 320.
  const VIEWPORT_PAD = 8
  const MENU_W = 220
  const MENU_H_EST = items.length * 32 + 12
  const clampedX =
    typeof window === 'undefined'
      ? x
      : Math.max(VIEWPORT_PAD, Math.min(window.innerWidth - MENU_W - VIEWPORT_PAD, x))
  const clampedY =
    typeof window === 'undefined'
      ? y
      : Math.max(VIEWPORT_PAD, Math.min(window.innerHeight - MENU_H_EST - VIEWPORT_PAD, y))

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        position: 'fixed', top: clampedY, left: clampedX,
        zIndex: 80,
        minWidth: MENU_W,
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-lg)',
        padding: 4,
      }}
    >
      {items.map((item, i) => {
        if (item.kind === 'separator') {
          return (
            <div
              key={`sep-${i}`}
              style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }}
            />
          )
        }
        const Icon = item.icon
        const color = item.destructive ? 'var(--r-txt)' : 'var(--txt)'
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => { if (!item.disabled) { item.onClick(); onClose() } }}
            disabled={item.disabled}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 10px', borderRadius: 6,
              fontSize: 12.5, fontWeight: 500,
              background: 'transparent', color,
              border: 'none', cursor: item.disabled ? 'default' : 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
              opacity: item.disabled ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.background = item.destructive
                  ? 'var(--r-bg)'
                  : 'var(--bg2)'
              }
            }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {Icon && <Icon size={13} />}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span
                className="mono"
                style={{
                  fontSize: 10, color: 'var(--txt3)',
                  letterSpacing: '.04em',
                }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
