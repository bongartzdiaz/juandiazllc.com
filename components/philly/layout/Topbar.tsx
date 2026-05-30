'use client'

import { useTheme } from '@/hooks/philly/useTheme'
import { useLocale } from '@/hooks/philly/useLocale'
import { useMobileMenu } from '@/components/philly/layout/ClientLayout'
import { Moon, Sun, RefreshCw, Plus, Globe, Menu, GripVertical, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NotificationBell } from '@/components/philly/dashboard/NotificationBell'
import { PresenceIndicator } from '@/components/philly/ui/PresenceIndicator'
import { useIndustry } from '@/hooks/philly/useIndustry'
import { useSync } from '@/hooks/philly/useSync'
import { useTranslations } from 'next-intl'

export function Topbar({ title, sub, onSync, onAdd, addLabel = 'New', onMenuToggle, editMode, onToggleEdit }: {
  title: string
  sub: string
  onSync?: () => void
  onAdd?: () => void
  addLabel?: string
  onMenuToggle?: () => void
  editMode?: boolean
  onToggleEdit?: () => void
}) {
  const { theme, toggle } = useTheme()
  const { locale, toggle: toggleLocale } = useLocale()
  const { industry } = useIndustry()
  const mobileMenu = useMobileMenu()
  const { syncAll, syncing } = useSync()
  const t = useTranslations('common')
  const handleMenu = onMenuToggle || mobileMenu.toggle
  const handleSync = onSync || (() => { void syncAll() })

  // Detect platform for Cmd vs Ctrl hint
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform))
    }
  }, [])

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('command-palette:open'))
  }

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
          aria-label="Open navigation menu"
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
        {/* Command palette search pill */}
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Open command palette"
          className="cmdk-pill"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 10px 5px 10px', borderRadius: 8,
            background: 'var(--bg2)', color: 'var(--txt3)',
            border: '1px solid var(--border)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'inherit', minWidth: 180,
          }}
        >
          <Search size={13} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
          <kbd style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 4,
            background: 'var(--panel)', border: '1px solid var(--border)',
            color: 'var(--txt2)', fontFamily: 'inherit',
          }}>
            {isMac ? '\u2318' : 'Ctrl'}+K
          </kbd>
        </button>

        {/* Presence indicators */}
        <PresenceIndicator max={4} showCount={false} />

        {/* Notification Bell */}
        <NotificationBell industry={industry} />

        {/* Edit layout toggle */}
        {onToggleEdit && (
          <button
            onClick={onToggleEdit}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: editMode ? 'var(--accent-bg)' : 'var(--bg2)',
              color: editMode ? 'var(--accent-txt)' : 'var(--txt2)',
              border: editMode ? '1px solid var(--accent-border)' : '1px solid var(--border)',
              borderRadius: 8, padding: '5px 10px',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <GripVertical size={12} />
            {editMode ? t('done') : t('edit')}
          </button>
        )}

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
          {t('live')}
        </span>

        {/* Language toggle */}
        <button
          onClick={toggleLocale}
          aria-label={`Switch language, currently ${locale.toUpperCase()}`}
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
          {locale.toUpperCase()}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
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
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 13px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: syncing ? 'default' : 'pointer',
            background: 'transparent', color: 'var(--txt2)',
            border: '1px solid var(--border)',
            fontFamily: 'inherit', opacity: syncing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} /> {syncing ? t('syncing') : t('sync')}
        </button>

        {/* Add action */}
        {onAdd && (
          <button
            onClick={onAdd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'var(--accent)', color: 'var(--accent-fg)',
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
