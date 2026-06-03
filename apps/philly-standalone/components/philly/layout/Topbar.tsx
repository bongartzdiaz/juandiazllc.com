'use client'

import { useTheme } from '@/hooks/philly/useTheme'
import { useLocale, SUPPORTED_LOCALES, LOCALE_LABELS } from '@/hooks/philly/useLocale'
import { useMobileMenu } from '@/components/philly/layout/ClientLayout'
import { Moon, Sun, RefreshCw, Plus, Globe, Menu, GripVertical, Search, Check, ChevronDown } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { NotificationBell } from '@/components/philly/dashboard/NotificationBell'
import { OrgSwitcher } from '@/components/philly/layout/OrgSwitcher'
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
  const { locale, switchLocale } = useLocale()
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false)
  const localeMenuRef = useRef<HTMLDivElement>(null)

  // Close locale menu on outside click
  useEffect(() => {
    if (!localeMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (localeMenuRef.current && !localeMenuRef.current.contains(e.target as Node)) {
        setLocaleMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [localeMenuOpen])

  const { industry } = useIndustry()
  const mobileMenu = useMobileMenu()
  const { syncAll, syncing } = useSync()
  const t = useTranslations('common')
  const tAria = useTranslations('layout.topbarAria')
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
          aria-label={tAria('openNav')}
          style={{
            width: 36, height: 36, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            cursor: 'pointer', color: 'var(--txt2)',
          }}
        >
          <Menu size={16} />
        </button>
        <div style={{
          // Constrain the title section so long subs don't wrap into
          // 3 lines + push the right-side controls off-screen.
          // Anything longer truncates with an ellipsis instead.
          minWidth: 0,
          maxWidth: 'calc(100vw - 720px)',  // leave room for the right-side cluster
        }}>
          {/* A11Y-03: the page title is the document's single <h1>. Inline
              styles keep the existing visual size; margin:0 neutralises the
              browser's default h1 spacing. */}
          <h1 style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            margin: 0,
          }}>{title}</h1>
          <div className="mono" style={{
            fontSize: 11.5,
            color: 'var(--txt3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{sub}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Multi-org switcher (Bundle G) — empty render when the
             user has only one membership, so single-org tenants
             never see the dropdown. */}
        <OrgSwitcher />

        {/* Command palette search pill */}
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label={tAria('openPalette')}
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

        {/* Language menu — dropdown showing all 5 locales with flags.
            Click outside to close. Replaces the cycle-button that was
            non-obvious (you'd press it 4× to reach FR from EN). */}
        <div ref={localeMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setLocaleMenuOpen(o => !o)}
            aria-label={`Language menu, currently ${LOCALE_LABELS[locale]}`}
            aria-haspopup="menu"
            aria-expanded={localeMenuOpen}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: localeMenuOpen ? 'var(--accent-bg)' : 'var(--bg2)',
              color: localeMenuOpen ? 'var(--accent-txt)' : 'var(--txt2)',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: '5px 10px',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 120ms',
            }}
          >
            <Globe size={13} />
            <span>{locale.toUpperCase()}</span>
            <ChevronDown size={11} style={{
              transition: 'transform 150ms',
              transform: localeMenuOpen ? 'rotate(180deg)' : 'none',
            }} />
          </button>

          {localeMenuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 4,
                minWidth: 180,
                boxShadow: 'var(--shadow-md)',
                zIndex: 50,
              }}
            >
              {SUPPORTED_LOCALES.map(loc => {
                const isActive = loc === locale
                return (
                  <button
                    key={loc}
                    role="menuitem"
                    onClick={() => {
                      setLocaleMenuOpen(false)
                      if (loc !== locale) switchLocale(loc)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: isActive ? 'var(--accent-bg)' : 'transparent',
                      color: isActive ? 'var(--accent-txt)' : 'var(--txt)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: isActive ? 600 : 500,
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg2)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ flex: 1 }}>{LOCALE_LABELS[loc]}</span>
                    <span style={{
                      fontSize: 10,
                      color: 'var(--txt3)',
                      letterSpacing: '0.1em',
                      fontFamily: 'var(--font-red-hat-mono), "Red Hat Mono", monospace',
                    }}>{loc.toUpperCase()}</span>
                    {isActive && <Check size={13} color="var(--accent)" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

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
