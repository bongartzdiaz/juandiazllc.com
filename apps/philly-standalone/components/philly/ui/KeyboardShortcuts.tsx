'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/philly/ui/Modal'
import { useGlobalShortcuts, focusFirstSearchInput } from '@/hooks/philly/useGlobalShortcuts'

/* Bundle AB — global keyboard shortcuts + cheat-sheet modal.
   Mounted once in ClientLayout's ProtectedShell so the bindings
   are active on every authenticated page. The CommandPalette
   handles its own cmd+K — we avoid stepping on it. */

interface ShortcutEntry {
  keys: string
  description: string
}

const NAV: ShortcutEntry[] = [
  { keys: 'g h', description: 'Home' },
  { keys: 'g c', description: 'Contacts' },
  { keys: 'g d', description: 'Deals' },
  { keys: 'g p', description: 'Properties' },
  { keys: 'g k', description: 'Projects' },
  { keys: 'g i', description: 'Insights' },
  { keys: 'g n', description: 'Notifications' },
  { keys: 'g s', description: 'Settings' },
  { keys: 'g a', description: 'Audit log' },
]

const ACTIONS: ShortcutEntry[] = [
  { keys: '/', description: 'Focus search on current page' },
  { keys: '?', description: 'Show this cheat sheet' },
  { keys: 'Esc', description: 'Close any open modal' },
  { keys: '⌘K', description: 'Open command palette (search + AI)' },
  { keys: '⌘⇧K', description: 'Open command palette in AI mode' },
  { keys: 'j', description: 'Next row (deals list, properties, transactions)' },
  { keys: 'k', description: 'Previous row' },
  { keys: 'Enter', description: 'Open focused row' },
]

export function KeyboardShortcuts() {
  const router = useRouter()
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

  return (
    <Modal
      open={cheatOpen}
      onClose={() => setCheatOpen(false)}
      title="Keyboard shortcuts"
      subtitle="Press ? on any page"
      size="md"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Section title="Navigation" rows={NAV} />
        <Section title="Actions" rows={ACTIONS} />
      </div>
      <div
        style={{
          marginTop: 16, paddingTop: 12,
          borderTop: '1px solid var(--border)',
          fontSize: 11.5, color: 'var(--txt3)', lineHeight: 1.6,
        }}
      >
        Two-key shortcuts (e.g. <Kbd>g</Kbd> <Kbd>c</Kbd>) — press them in
        sequence within ~1 second. Shortcuts are suppressed while you're
        typing in an input, so you don't have to worry about clobbering
        a search field.
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
