'use client'

import { useTheme } from '@/hooks/useTheme'
import { Moon, Sun, RefreshCw, Plus } from 'lucide-react'

export function Topbar({ title, sub, onSync }: {
  title: string; sub: string; onSync?: () => void
}) {
  const { theme, toggle } = useTheme()

  return (
    <div style={{
      height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 22px',
      background: 'var(--panel)', borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 10,
      animation: 'fadeDown 0.3s ease 0.08s both',
    }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--txt3)' }}>{sub}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* LIVE chip */}
        <div className="mono" style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'var(--g-bg)', border: '1px solid var(--g-border)',
          borderRadius: 20, padding: '4px 10px',
          fontSize: 10, color: 'var(--g-txt)', fontWeight: 600,
        }}>
          <div style={{
            width: 5, height: 5, background: 'var(--g)', borderRadius: '50%',
            animation: 'blink 1.4s ease-in-out infinite',
          }} />
          LIVE
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg2)', color: 'var(--txt2)',
            border: '1px solid var(--border2)',
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
              padding: '6px 13px', borderRadius: 7,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', color: 'var(--txt2)',
              border: '1px solid var(--border2)',
              fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={12} /> Sync
          </button>
        )}

        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '6px 13px', borderRadius: 7,
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: 'var(--txt)', color: 'var(--panel)',
          border: 'none', boxShadow: 'var(--shadow-sm)',
          fontFamily: 'inherit',
        }}>
          <Plus size={12} /> Lead
        </button>
      </div>
    </div>
  )
}
