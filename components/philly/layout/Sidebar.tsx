'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, FolderKanban, Users2, BarChart3,
  FileText, Columns3, Settings, CalendarDays, GanttChart,
  Leaf, Building2, Hotel, ChevronDown, LogOut, Shield,
  DollarSign, Bell, Zap, FileArchive, Award, Heart,
  Home, BedDouble, Eye, HandCoins, Trophy, DoorOpen, Mail, TrendingUp,
  Inbox, FileCode, ListChecks, ClipboardList, Target, GitBranch,
  Phone, UserPlus, Network, BarChart, Globe, PenTool,
  MessageSquare, Plug, Layers, Sparkles, Webhook, Linkedin,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useSupabaseUser } from '@/hooks/philly/useSupabaseUser'
import { createClient } from '@/lib/supabase/client'
import { useIndustry, INDUSTRY_CONFIGS } from '@/hooks/philly/useIndustry'
import type { Industry } from '@/hooks/philly/useIndustry'
import { useTranslations } from 'next-intl'

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

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname()
  const path = pathname.replace(/^\/(en|nl)/, '') || '/'
  const { industry, config, setIndustry } = useIndustry()
  const [showSwitcher, setShowSwitcher] = useState(false)
  const session = useSupabaseUser()
  const t = useTranslations('nav')
  const tc = useTranslations('common')

  const LogoIcon = INDUSTRY_ICONS[industry]

  const NAV_PRIMARY: NavItemDef[] = [
    { icon: LayoutDashboard, label: t('dashboard'), href: '/philly' },
    { icon: FolderKanban, label: t('projects'), href: '/philly/projects' },
    { icon: Users2, label: t('contacts'), href: '/philly/contacts' },
    { icon: BarChart3, label: industry === 'realestate' ? t('market') : t('impact'), href: '/philly/impact' },
  ]

  const NAV_TOOLS: NavItemDef[] = [
    { icon: FileText, label: t('reports'), href: '/philly/reports' },
    { icon: Columns3, label: industry === 'realestate' ? t('dealsBoard') : industry === 'hospitality' ? t('reservations') : t('board'), href: '/philly/kanban' },
    { icon: DollarSign, label: t('deals'), href: '/philly/deals' },
    { icon: CalendarDays, label: t('calendar'), href: '/philly/calendar' },
    { icon: GanttChart, label: t('timeline'), href: '/philly/timeline' },
    { icon: FileArchive, label: t('documents'), href: '/philly/documents' },
    { icon: Inbox, label: t('inbox'), href: '/philly/inbox' },
    { icon: Mail, label: t('email'), href: '/philly/email' },
    { icon: MessageSquare, label: t('sms'), href: '/philly/sms' },
    { icon: FileCode, label: t('templates'), href: '/philly/templates' },
    { icon: Layers, label: t('pages'), href: '/philly/pages' },
    { icon: Sparkles, label: t('aiInsights'), href: '/philly/ai', badgeNew: true },
    { icon: Linkedin, label: t('outreach'), href: '/philly/outreach', badgeNew: true },
  ]

  // Industry-specific nav items
  const NAV_INDUSTRY: NavItemDef[] = industry === 'realestate'
    ? [
        { icon: Home, label: t('properties'), href: '/philly/properties' },
        { icon: Eye, label: t('showings'), href: '/philly/showings' },
        { icon: HandCoins, label: t('offers'), href: '/philly/offers' },
        { icon: DoorOpen, label: t('openHouses'), href: '/philly/open-houses' },
        { icon: Trophy, label: t('commissions'), href: '/philly/commissions' },
        { icon: Mail, label: t('dripCampaigns'), href: '/philly/drip-campaigns' },
        { icon: TrendingUp, label: t('marketAnalytics'), href: '/philly/market-analytics' },
        { icon: ClipboardList, label: t('transactions'), href: '/philly/transactions' },
        { icon: ListChecks, label: t('actionPlans'), href: '/philly/action-plans' },
        { icon: Target, label: t('leadScores'), href: '/philly/lead-scores' },
        { icon: GitBranch, label: t('leadRouting'), href: '/philly/lead-routing' },
        { icon: Phone, label: t('dialer'), href: '/philly/dialer' },
        { icon: UserPlus, label: t('referrals'), href: '/philly/referrals' },
        { icon: Network, label: t('soi'), href: '/philly/soi' },
        { icon: BarChart, label: t('cma'), href: '/philly/cma' },
        { icon: Globe, label: t('clientPortal'), href: '/philly/client-portal' },
        { icon: PenTool, label: t('eSignatures'), href: '/philly/e-signatures' },
      ]
    : industry === 'hospitality'
      ? [
          { icon: BedDouble, label: t('rooms'), href: '/philly/rooms' },
        ]
      : [
          { icon: Award, label: t('grants'), href: '/philly/grants' },
          { icon: HandCoins, label: t('donors'), href: '/philly/philanthropy/donors' },
          { icon: Heart, label: t('volunteers'), href: '/philly/volunteers' },
        ]

  const NAV_SYSTEM: NavItemDef[] = [
    { icon: Bell, label: t('notifications'), href: '/philly/notifications' },
    { icon: Zap, label: t('automations'), href: '/philly/automations' },
    { icon: Plug, label: t('integrations'), href: '/philly/integrations' },
    { icon: Webhook, label: t('webhooks'), href: '/philly/settings/webhooks' },
    { icon: Shield, label: t('auditLog'), href: '/philly/audit' },
    { icon: Settings, label: t('settings'), href: '/philly/settings' },
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
            // Industry-tinted brandmark: each industry uses its own accent paired
            // with the universal --accent. Keeps it on-brand without hex literals.
            background: industry === 'realestate'
              ? 'linear-gradient(135deg, var(--b) 0%, var(--accent) 100%)'
              : industry === 'hospitality'
                ? 'linear-gradient(135deg, var(--p) 0%, var(--b) 100%)'
                : 'linear-gradient(135deg, var(--accent) 0%, var(--g) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
            {/* Icon is always white — the gradient is always saturated regardless of theme. */}
            <LogoIcon size={17} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--txt)' }}>
              Philly<span style={{ color: 'var(--accent)' }}>.</span>
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
        <NavLabel>{t('core')}</NavLabel>
        {NAV_PRIMARY.map(item => (
          <NavItem key={item.href} active={path === item.href || (item.href !== '/' && path.startsWith(item.href))} {...item} onClick={onNavigate} />
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />

        <NavLabel>{t('tools')}</NavLabel>
        {NAV_TOOLS.map(item => (
          <NavItem key={item.href} active={path === item.href || path.startsWith(item.href)} {...item} onClick={onNavigate} />
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />

        <NavLabel>{config.shortLabel}</NavLabel>
        {NAV_INDUSTRY.map(item => (
          <NavItem key={item.href} active={path === item.href || path.startsWith(item.href)} {...item} onClick={onNavigate} />
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />

        <NavLabel>{t('system')}</NavLabel>
        {NAV_SYSTEM.map(item => (
          <NavItem key={item.href} active={path === item.href || path.startsWith(item.href)} {...item} onClick={onNavigate} />
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
        }}>{getInitials(session?.user?.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12.5, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {session?.user?.name || session?.user?.email || 'User'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--txt3)', textTransform: 'capitalize' }}>
            {session?.user?.role || 'viewer'}
          </div>
        </div>
        <button
          type="button"
          onClick={async () => { await createClient().auth.signOut(); window.location.assign('/login') }}
          title={tc('signOut')}
          aria-label={tc('signOut')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--txt3)', padding: 6, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}

function getInitials(name?: string | null): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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

function NavItem({ icon: Icon, label, href, active, badge, badgeNew, onClick }: NavItemDef & { active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
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
          fontFamily: "var(--font-red-hat-mono), 'Red Hat Mono', monospace",
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
