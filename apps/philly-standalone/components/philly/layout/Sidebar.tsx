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
  MessageSquare, Plug, Layers, Sparkles, Webhook,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useSupabaseUser } from '@/hooks/philly/useSupabaseUser'
import { useMySections } from '@/hooks/philly/useMySections'
import { createClient } from '@/lib/supabase/client'
import { useIndustry, INDUSTRY_CONFIGS } from '@/hooks/philly/useIndustry'
import type { Industry } from '@/hooks/philly/useIndustry'
import { useTranslations } from 'next-intl'
import { hasSection, sectionForPath } from '@/lib/philly/sections'

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

/**
 * Strip any supported-locale URL prefix from the pathname.
 *
 * Background: i18n/request.ts uses COOKIE-based locale resolution, so
 * pathnames are typically unprefixed (`/contacts`, `/settings`). But
 * any historical URL-prefixed routes (e.g., `/en/contacts` from
 * shared marketing links) still need locale-stripping so active-state
 * detection works.
 *
 * 2026-05-26 bugfix: prior regex was `/^\/(en|nl)/` — only handled 2
 * of our 5 supported locales. A DE/ES/FR user clicking a /de/contacts
 * link would see NOTHING highlighted in the sidebar.
 *
 * The `/(\/|$)/` boundary prevents accidental matches on routes like
 * `/english-class-thing` where the first segment starts with `en`.
 */
const LOCALE_PREFIX = /^\/(en|nl|de|es|fr)(\/|$)/

/**
 * Is `currentPath` an active match for `itemHref`?
 *
 * Exact match for the dashboard (href='/'); prefix-with-boundary
 * match for everything else (so `/settings` is active on
 * `/settings/features` but NOT on `/settingsX` if that ever exists).
 *
 * 2026-05-26 bugfix: prior logic was
 *   `path === item.href || (item.href !== '/' && path.startsWith(item.href))`
 * which had the same boundary problem — `path.startsWith('/setting')`
 * would match `/settings`. Also it was correct for dashboard non-active
 * but Juan reported dashboard highlighting on non-dashboard pages, which
 * the test suite below now pins.
 */
export function isNavItemActive(currentPath: string, itemHref: string): boolean {
  if (itemHref === '/') {
    // Dashboard is active ONLY on the literal root path. No prefix match.
    return currentPath === '/'
  }
  return currentPath === itemHref || currentPath.startsWith(itemHref + '/')
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname()
  // Strip locale prefix (handles all 5 supported locales) then default to '/'
  // when the strip leaves an empty string (e.g., pathname was '/en' or '/de').
  const stripped = pathname.replace(LOCALE_PREFIX, '/')
  const path = stripped === '' ? '/' : stripped
  const { industry, config, setIndustry, orgLocked } = useIndustry()
  const [showSwitcher, setShowSwitcher] = useState(false)
  const session = useSupabaseUser()
  const { role, dashboardSections, loading: sectionsLoading } = useMySections()
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const tSide = useTranslations('layout.sidebar')

  // Hide any nav item whose section slug is not in the user's allow-list.
  // Items whose URL doesn't map to a known section (e.g. deep utility
  // pages) are left visible — `sectionForPath` returns null for those.
  // Admins and users with `dashboardSections === null` pass everything.
  const visible = (item: NavItemDef) => {
    // Avoid flicker-hiding during the first /me fetch.
    if (sectionsLoading) return true
    const section = sectionForPath(item.href)
    if (!section) return true
    return hasSection({ role, dashboardSections }, section.slug)
  }

  const LogoIcon = INDUSTRY_ICONS[industry]

  const NAV_PRIMARY: NavItemDef[] = [
    { icon: LayoutDashboard, label: t('dashboard'), href: '/' },
    { icon: FolderKanban, label: t('projects'), href: '/projects' },
    { icon: Users2, label: t('contacts'), href: '/contacts' },
    { icon: BarChart3, label: industry === 'realestate' ? t('market') : t('impact'), href: '/impact' },
  ]

  const NAV_TOOLS: NavItemDef[] = [
    { icon: FileText, label: t('reports'), href: '/reports' },
    { icon: Columns3, label: industry === 'realestate' ? t('dealsBoard') : industry === 'hospitality' ? t('reservations') : t('board'), href: '/kanban' },
    { icon: DollarSign, label: t('deals'), href: '/deals' },
    { icon: CalendarDays, label: t('calendar'), href: '/calendar' },
    { icon: GanttChart, label: t('timeline'), href: '/timeline' },
    { icon: FileArchive, label: t('documents'), href: '/documents' },
    { icon: Inbox, label: t('inbox'), href: '/inbox' },
    { icon: Mail, label: t('email'), href: '/email' },
    { icon: MessageSquare, label: t('sms'), href: '/sms' },
    { icon: FileCode, label: t('templates'), href: '/templates' },
    { icon: Layers, label: t('pages'), href: '/pages' },
    { icon: Sparkles, label: t('aiInsights'), href: '/ai', badgeNew: true },
  ]

  // Industry-specific nav items
  const NAV_INDUSTRY: NavItemDef[] = industry === 'realestate'
    ? [
        { icon: Home, label: t('properties'), href: '/properties' },
        { icon: Eye, label: t('showings'), href: '/showings' },
        { icon: HandCoins, label: t('offers'), href: '/offers' },
        { icon: DoorOpen, label: t('openHouses'), href: '/open-houses' },
        { icon: Trophy, label: t('commissions'), href: '/commissions' },
        { icon: Mail, label: t('dripCampaigns'), href: '/drip-campaigns' },
        { icon: TrendingUp, label: t('marketAnalytics'), href: '/market-analytics' },
        { icon: ClipboardList, label: t('transactions'), href: '/transactions' },
        { icon: ListChecks, label: t('actionPlans'), href: '/action-plans' },
        { icon: Target, label: t('leadScores'), href: '/lead-scores' },
        { icon: GitBranch, label: t('leadRouting'), href: '/lead-routing' },
        { icon: Phone, label: t('dialer'), href: '/dialer' },
        { icon: UserPlus, label: t('referrals'), href: '/referrals' },
        { icon: Network, label: t('soi'), href: '/soi' },
        { icon: BarChart, label: t('cma'), href: '/cma' },
        { icon: Globe, label: t('clientPortal'), href: '/client-portal' },
        { icon: PenTool, label: t('eSignatures'), href: '/e-signatures' },
      ]
    : industry === 'hospitality'
      ? [
          { icon: BedDouble, label: t('rooms'), href: '/rooms' },
          { icon: CalendarDays, label: t('reservations'), href: '/reservations' },
          { icon: Sparkles, label: t('housekeeping'), href: '/housekeeping' },
        ]
      : [
          { icon: Award, label: t('grants'), href: '/grants' },
          { icon: HandCoins, label: t('donors'), href: '/philanthropy/donors' },
          { icon: Heart, label: t('volunteers'), href: '/volunteers' },
        ]

  const NAV_SYSTEM: NavItemDef[] = [
    { icon: Bell, label: t('notifications'), href: '/notifications' },
    { icon: Zap, label: t('automations'), href: '/automations' },
    { icon: Plug, label: t('integrations'), href: '/integrations' },
    { icon: Webhook, label: t('webhooks'), href: '/settings/webhooks' },
    { icon: Shield, label: t('auditLog'), href: '/audit' },
    { icon: Settings, label: t('settings'), href: '/settings' },
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
            // DEUS brandmark on industry-tinted gradient chip. The SVG
            // mark (broken-circle "d" monogram) replaces the previous
            // generic Lucide icon. 2026-05-27 brand-pass v2.
            background: industry === 'realestate'
              ? 'linear-gradient(135deg, var(--b) 0%, var(--accent) 100%)'
              : industry === 'hospitality'
                ? 'linear-gradient(135deg, var(--p) 0%, var(--b) 100%)'
                : 'linear-gradient(135deg, var(--accent) 0%, var(--g) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            color: '#fff',
          }}>
            <img
              src="/brand/deus-mark.svg"
              alt="DEUS"
              width={22}
              height={22}
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 15.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--txt)',
              fontFamily: 'var(--font-red-hat-mono), "Red Hat Mono", monospace',
            }}>
              DEUS
            </div>
            <div style={{
              fontSize: 10,
              color: 'var(--txt3)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>{config.label}</div>
          </div>
        </div>

        {/* Industry Switcher — hidden for non-admins when the org's
            industry is bound to a specific vertical (Bundle AT). */}
        {!orgLocked && (
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
                    {active && <span style={{ marginLeft: 'auto', fontSize: 10 }}>{tSide('active')}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 14px' }}>
        <NavGroup label={t('core')} items={NAV_PRIMARY.filter(visible)} path={path} onNavigate={onNavigate} firstGroup />
        <NavGroup label={t('tools')} items={NAV_TOOLS.filter(visible)} path={path} onNavigate={onNavigate} />
        <NavGroup label={config.shortLabel} items={NAV_INDUSTRY.filter(visible)} path={path} onNavigate={onNavigate} />
        <NavGroup label={t('system')} items={NAV_SYSTEM.filter(visible)} path={path} onNavigate={onNavigate} />
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

function NavGroup({
  label, items, path, onNavigate, firstGroup = false,
}: {
  label: string
  items: NavItemDef[]
  path: string
  onNavigate?: () => void
  firstGroup?: boolean
}) {
  // Drop the group entirely when its visible-item list is empty,
  // so we never render a floating "Tools" / "System" header with
  // nothing beneath it.
  if (items.length === 0) return null
  return (
    <>
      {!firstGroup && (
        <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />
      )}
      <NavLabel>{label}</NavLabel>
      {items.map(item => (
        <NavItem
          key={item.href}
          active={isNavItemActive(path, item.href)}
          {...item}
          onClick={onNavigate}
        />
      ))}
    </>
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
