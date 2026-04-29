'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/philly/ui/Modal'
import { useGlobalShortcuts, focusFirstSearchInput } from '@/hooks/philly/useGlobalShortcuts'

/* Bundle AB — global keyboard shortcuts + cheat-sheet modal.
   Mounted once in ClientLayout's ProtectedShell so the bindings
   are active on every authenticated page. The CommandPalette
   handles its own cmd+K — we avoid stepping on it.

   Bundle AP — operator-facing copy now flows through next-intl. */

interface ShortcutEntry {
  keys: string
  description: string
}

export function KeyboardShortcuts() {
  const router = useRouter()
  const t = useTranslations('keyboard')
  const [cheatOpen, setCheatOpen] = useState(false)

  const go = useCallback((path: string) => () => router.push(path), [router])

  useGlobalShortcuts({
    '?': () => setCheatOpen(true),
    '/': () => focusFirstSearchInput(),
    'g h': go('/'),
    'g c': go('/contacts'),
    'g d': go('/deals'),
    'g p': go('/properties'),
    'g k': go('/projects'),
    'g i': go('/insights'),
    'g n': go('/notifications'),
    'g s': go('/settings'),
    'g a': go('/audit'),
  })

  const NAV: ShortcutEntry[] = [
    { keys: 'g h', description: t('nav.home') },
    { keys: 'g c', description: t('nav.contacts') },
    { keys: 'g d', description: t('nav.deals') },
    { keys: 'g p', description: t('nav.properties') },
    { keys: 'g k', description: t('nav.projects') },
    { keys: 'g i', description: t('nav.insights') },
    { keys: 'g n', description: t('nav.notifications') },
    { keys: 'g s', description: t('nav.settings') },
    { keys: 'g a', description: t('nav.audit') },
  ]
  const ACTIONS: ShortcutEntry[] = [
    { keys: '/', description: t('actions.focusSearch') },
    { keys: '?', description: t('actions.showCheatSheet') },
    { keys: 'Esc', description: t('actions.closeModal') },
    { keys: '⌘K', description: t('actions.openPalette') },
    { keys: '⌘⇧K', description: t('actions.openPaletteAi') },
    { keys: 'j', description: t('actions.nextRow') },
    { keys: 'k', description: t('actions.prevRow') },
    { keys: 'Enter', description: t('actions.openRow') },
  ]

  return (
    <Modal
      open={cheatOpen}
      onClose={() => setCheatOpen(false)}
      title={t('title')}
      subtitle={t('subtitle')}
      size="md"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Section title={t('navigationHeading')} rows={NAV} />
        <Section title={t('actionsHeading')} rows={ACTIONS} />
      </div>
      <div
        style={{
          marginTop: 16, paddingTop: 12,
          borderTop: '1px solid var(--border)',
          fontSize: 11.5, color: 'var(--txt3)', lineHeight: 1.6,
        }}
      >
        {t('footnote')}
      </div>
    </Modal>
  )
}

function Section({ title, rows }: { title: string; rows: ShortcutEntry[] }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.08em',
          color: 'var(--txt3)', marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r) => (
          <div
            key={r.keys + r.description}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12.5, color: 'var(--txt2)',
            }}
          >
            <span style={{ display: 'inline-flex', gap: 4, flexShrink: 0, minWidth: 60 }}>
              {r.keys.split(' ').map((k, i) => (
                <Kbd key={i}>{k}</Kbd>
              ))}
            </span>
            <span>{r.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        display: 'inline-block',
        padding: '1px 7px',
        borderRadius: 5,
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        boxShadow: 'inset 0 -1px 0 var(--border)',
        fontSize: 11,
        fontFamily: 'var(--font-red-hat-mono), monospace',
        color: 'var(--txt)',
        lineHeight: 1.4,
        textTransform: 'lowercase',
      }}
    >
      {children}
    </kbd>
  )
}
