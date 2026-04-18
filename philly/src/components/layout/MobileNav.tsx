'use client'

/* Bottom-tab mobile nav — visible only on small screens. */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { LayoutDashboard, Users2, Columns3, CalendarDays, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Tab {
  icon: LucideIcon
  label: string
  href: string
}

export function MobileNav() {
  const pathname = usePathname()
  const { isMobile } = useBreakpoint()
  const t = useTranslations('nav')

  if (!isMobile) return null

  const path = pathname.replace(/^\/(en|nl)/, '') || '/'

  const TABS: Tab[] = [
    { icon: LayoutDashboard, label: t('dashboard'), href: '/' },
    { icon: Users2, label: t('contacts'), href: '/contacts' },
    { icon: Columns3, label: t('board'), href: '/kanban' },
    { icon: CalendarDays, label: t('calendar'), href: '/calendar' },
    { icon: Sparkles, label: t('aiInsights'), href: '/ai' },
  ]

  return (
    <nav
      role="navigation"
      aria-label="Primary"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 30,
        display: 'grid', gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        background: 'var(--panel)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(tab => {
        const active = path === tab.href || (tab.href !== '/' && path.startsWith(tab.href))
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '8px 4px',
              textDecoration: 'none',
              color: active ? 'var(--accent)' : 'var(--txt3)',
              gap: 3,
            }}
          >
            <Icon size={19} strokeWidth={active ? 2.4 : 2} />
            <span style={{
              fontSize: 9.5, fontWeight: active ? 700 : 500,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
