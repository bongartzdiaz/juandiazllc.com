'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Megaphone, Globe, MessageSquare, Users,
  GitBranch, Calendar, Settings, Filter, FileText, Film,
  Bot, Search,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItemDef {
  icon: LucideIcon
  label: string
  href: string
  badge?: string | null
  badgeNew?: boolean
}

const NAV_PRIMARY: NavItemDef[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Megaphone, label: 'Meta Ads', href: '/meta', badge: '3' },
  { icon: Globe, label: 'Google Ads', href: '/google' },
  { icon: MessageSquare, label: 'Chatbot', href: '/chatbot', badge: '7' },
  { icon: Users, label: 'Sales (GHL)', href: '/sales' },
]

const NAV_ANALYSE: NavItemDef[] = [
  { icon: Filter, label: 'Funnel', href: '/conversie' },
  { icon: FileText, label: 'Rapporten', href: '/rapporten' },
  { icon: Film, label: 'Content', href: '/content' },
]

const NAV_SYSTEEM: NavItemDef[] = [
  { icon: Bot, label: 'Agents', href: '/agents' },
  { icon: Search, label: 'SEO', href: '/seo' },
  { icon: Calendar, label: 'Agenda', href: '/agenda', badgeNew: true },
  { icon: Settings, label: 'Instellingen', href: '/settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: 230, flexShrink: 0,
        background: 'var(--panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20,
        boxShadow: 'var(--shadow-sm)',
        animation: 'slideInLeft 0.35s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* Logo */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 18px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'linear-gradient(135deg, var(--txt) 0%, var(--txt2) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <span style={{ color: 'var(--panel)', fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em' }}>H</span>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.025em' }}>
            HMB <em style={{ color: 'var(--g)', fontStyle: 'normal' }}>ops</em>
          </div>
          <div style={{ fontSize: 10, color: 'var(--txt3)', letterSpacing: '0.02em' }}>Energy Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 14px' }}>
        <NavLabel>Primair</NavLabel>
        {NAV_PRIMARY.map(item => (
          <NavItem key={item.href} active={pathname === item.href} {...item} />
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />

        <NavLabel>Analyse</NavLabel>
        {NAV_ANALYSE.map(item => (
          <NavItem key={item.href} active={pathname === item.href} {...item} />
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />

        <NavLabel>Systeem</NavLabel>
        {NAV_SYSTEEM.map(item => (
          <NavItem key={item.href} active={pathname === item.href} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '14px 16px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--b) 0%, var(--g) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}>JV</div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>Juan</div>
          <div style={{ fontSize: 10, color: 'var(--txt3)' }}>Admin · HMB</div>
        </div>
      </div>
    </aside>
  )
}

function NavLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--txt3)',
      padding: '12px 10px 5px',
    }}>
      {children}
    </div>
  )
}

function NavItem({ icon: Icon, label, href, active, badge, badgeNew }: NavItemDef & { active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 11px', borderRadius: 8, cursor: 'pointer',
        color: active ? 'var(--panel)' : 'var(--txt2)',
        background: active ? 'var(--txt)' : 'transparent',
        fontSize: 13, fontWeight: active ? 600 : 500, marginBottom: 2,
        letterSpacing: '-0.01em', textDecoration: 'none',
        transition: 'all 150ms ease',
      }}
    >
      <Icon size={15} style={{ flexShrink: 0, opacity: active ? 1 : 0.65 }} />
      {label}
      {badge && (
        <span style={{
          marginLeft: 'auto', background: 'var(--r)', color: 'white',
          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8,
          fontFamily: 'var(--font-jet-mono), monospace',
        }}>{badge}</span>
      )}
      {badgeNew && (
        <span style={{
          marginLeft: 'auto', background: 'var(--g-bg)', color: 'var(--g-txt)',
          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
          border: '1px solid var(--g-border)',
        }}>Nieuw</span>
      )}
    </Link>
  )
}
