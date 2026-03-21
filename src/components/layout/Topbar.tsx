'use client'

import { useTheme } from '@/hooks/useTheme'
import { Moon, Sun, RefreshCw, Plus, Globe } from 'lucide-react'

export function Topbar({ title, sub, onSync, onAdd, addLabel = 'New' }: {
  title: string
  sub: string
  onSync?: () => void
  onAdd?: () => void
  addLabel?: string
}) {
  const { theme, toggle } = useTheme()

  return (
    <div style={{
      height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      background: 'var(--panel)', borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 10,
      animation: 'fadeDown 0.3s ease 0.08s both',
    }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--txt3)' }}>{sub}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Language toggle */}
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--bg2)', color: 'var(--txt2)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: '5px 10px',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Globe size={12} />
          EN
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg2)', color: 'var(--txt2)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: '5px 11px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        {/* Sync */}
        {onSync && (
          <button
            onClick={onSync}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 13px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', color: 'var(--txt2)',
              border: '1px solid var(--border)',
              fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={12} /> Sync
          </button>
        )}

        {/* Add action */}
        {onAdd && (
          <button
            onClick={onAdd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'var(--accent)', color: '#fff',
              border: 'none', boxShadow: 'var(--shadow-sm)',
              fontFamily: 'inherit',
            }}
          >
            <Plus size={13} /> {addLabel}
          </button>
        )}
      </div>
    </div>
  )
}
