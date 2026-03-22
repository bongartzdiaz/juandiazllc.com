'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, FolderKanban, Users2, BarChart3,
  FileText, Columns3, FileStack, Settings, CalendarDays,
  Leaf, Building2, Hotel, ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useIndustry, INDUSTRY_CONFIGS } from '@/hooks/useIndustry'
import type { Industry } from '@/hooks/useIndustry'

interface NavItemDef {
  icon: LucideIcon
  label: string
  href: string
  badge?: string | null
  badgeNew?: boolean
}

const INDUSTRY_ICONS: Record<Industry, LucideIcon> = {
  philanthropy: Leaf,
  realestate: Building2,
  hospitality: Hotel,
}

export function Sidebar() {
  const pathname = usePathname()
  const path = pathname.replace(/^\/(en|nl)/, '') || '/'
  const { industry, config, setIndustry } = useIndustry()
  const [showSwitcher, setShowSwitcher] = useState(false)

  const LogoIcon = INDUSTRY_ICONS[industry]

  const NAV_PRIMARY: NavItemDef[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: FolderKanban, label: config.projectsLabel, href: '/projects' },
    { icon: Users2, label: 'Contacts', href: '/contacts' },
    { icon: BarChart3, label: industry === 'realestate' ? 'Market' : 'Impact', href: '/impact' },
  ]

  const NAV_TOOLS: NavItemDef[] = [
    { icon: FileText, label: 'Reports', href: '/reports' },
    { icon: Columns3, label: industry === 'realestate' ? 'Deals' : industry === 'hospitality' ? 'Reservations' : 'Board', href: '/kanban' },
    { icon: CalendarDays, label: 'Calendar', href: '/calendar' },
  ]

  const NAV_SYSTEM: NavItemDef[] = [
    { icon: Settings, label: 'Settings', href: '/settings' },
  ]

  return (
    <aside
      style={{
        width: 240, flexShrink: 0,
        background: 'var(--panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20,
        boxShadow: 'var(--shadow-sm)',
        animation: 'slideInLeft 0.35s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* Logo + Industry Switcher */}
      <div style={{
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{
          height: 58, display: 'flex', alignItems: 'center', gap: 11,
          padding: '0 20px',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: industry === 'realestate'
              ? 'linear-gradient(135deg, #1a56db 0%, #0D7377 100%)'
              : industry === 'hospitality'
                ? 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)'
                : 'linear-gradient(135deg, var(--accent) 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            <LogoIcon size={17} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--txt)' }}>
              Philanthropy<span style={{ color: 'var(--accent)' }}>AI</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--txt3)', letterSpacing: '0.02em' }}>{config.label}</div>
          </div>
        </div>

        {/* Industry Switcher */}
        <div style={{ padding: '0 12px 10px', position: 'relative' }}>
          <button
            onClick={() => setShowSwitcher(!showSwitcher)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px', borderRadius: 8,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              fontSize: 11.5, fontWeight: 600, color: 'var(--txt2)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LogoIcon size={13} />
              {config.shortLabel} Mode
            </div>
            <ChevronDown size={12} style={{
              transform: showSwitcher ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 150ms ease',
            }} />
          </button>

          {showSwitcher && (
            <div style={{
              position: 'absolute', top: '100%', left: 12, right: 12,
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 8, boxShadow: 'var(--shadow-md)',
              zIndex: 50, marginTop: 4, overflow: 'hidden',
            }}>
              {(Object.keys(INDUSTRY_CONFIGS) as Industry[]).map(ind => {
                const cfg = INDUSTRY_CONFIGS[ind]
                const Icon = INDUSTRY_ICONS[ind]
                const active = industry === ind
                return (
                  <button
                    key={ind}
                    onClick={() => { setIndustry(ind); setShowSwitcher(false) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 12px', border: 'none',
                      background: active ? 'var(--accent-bg)' : 'transparent',
                      color: active ? 'var(--accent-txt)' : 'var(--txt2)',
                      fontSize: 12, fontWeight: active ? 600 : 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <Icon size={14} />
                    {cfg.label}
                    {active && <span style={{ marginLeft: 'auto', fontSize: 10 }}>Active</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 14px' }}>
        <NavLabel>Core</NavLabel>
        {NAV_PRIMARY.map(item => (
          <NavItem key={item.href} active={path === item.href || (item.href !== '/' && path.startsWith(item.href))} {...item} />
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />

        <NavLabel>Tools</NavLabel>
        {NAV_TOOLS.map(item => (
          <NavItem key={item.href} active={path === item.href || path.startsWith(item.href)} {...item} />
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />

        <NavLabel>System</NavLabel>
        {NAV_SYSTEM.map(item => (
          <NavItem key={item.href} active={path === item.href || path.startsWith(item.href)} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '14px 18px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--g) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}>PA</div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>Demo User</div>
          <div style={{ fontSize: 10, color: 'var(--txt3)' }}>Admin</div>
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
        padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
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
          marginLeft: 'auto', background: 'var(--accent)', color: 'white',
          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8,
          fontFamily: 'var(--font-jet-mono), monospace',
        }}>{badge}</span>
      )}
      {badgeNew && (
        <span style={{
          marginLeft: 'auto', background: 'var(--g-bg)', color: 'var(--g-txt)',
          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
          border: '1px solid var(--g-border)',
        }}>New</span>
      )}
    </Link>
  )
}
