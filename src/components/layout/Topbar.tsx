'use client'

import { useTheme } from '@/hooks/useTheme'
import { useMobileMenu } from '@/components/layout/ClientLayout'
import { Moon, Sun, RefreshCw, Plus, Globe, Menu } from 'lucide-react'

export function Topbar({ title, sub, onSync, onAdd, addLabel = 'New', onMenuToggle }: {
  title: string
  sub: string
  onSync?: () => void
  onAdd?: () => void
  addLabel?: string
  onMenuToggle?: () => void
}) {
  const { theme, toggle } = useTheme()
  const mobileMenu = useMobileMenu()
  const handleMenu = onMenuToggle || mobileMenu.toggle

  return (
    <div style={{
      height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      background: 'var(--panel)', borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 10,
      animation: 'fadeDown 0.3s ease 0.08s both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Hamburger for mobile */}
        <button
          className="hamburger-btn"
          onClick={handleMenu}
          style={{
            width: 36, height: 36, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            cursor: 'pointer', color: 'var(--txt2)',
          }}
        >
          <Menu size={16} />
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--txt3)' }}>{sub}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* LIVE badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 8,
          background: 'var(--g-bg)', color: 'var(--g-txt)', border: '1px solid var(--g-border)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--g)',
            animation: 'blink 1.5s ease-in-out infinite',
          }} />
          LIVE
        </span>

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
